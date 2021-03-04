import { isNullOrUndefined } from 'util';
import * as vscode from 'vscode';
import { createSuggestionMaps, RefreshXlfHint, addMapToSuggestionMap, matchTranslationsFromTranslationMaps, getXlfMatchMap } from './LanguageFunctions';
import { CustomNoteType, Target, TargetState, TranslationToken, TransUnit, Xliff } from './XLIFFDocument';

class XliffMerger {
    public mergeResult: MergeResult;
    private settings: MergeSettings;
    private suggestionsMaps: Map<string, Map<string, string[]>[]>;
    public langIsSameAsGXlf: boolean;

    constructor(public gXlf: Xliff, public targetXlf: Xliff, settings?: MergeSettings) {
        this.mergeResult = this.clearMergeResult();
        this.settings = isNullOrUndefined(settings) ? this.defaultSettings() : settings;
        this.suggestionsMaps = new Map();
        this.langIsSameAsGXlf = gXlf.targetLanguage === targetXlf.targetLanguage;
    }

    public static fromFile(gXlf: vscode.Uri, targetXlf: vscode.Uri): XliffMerger {
        return new XliffMerger(Xliff.fromFileSync(gXlf.fsPath), Xliff.fromFileSync(targetXlf.fsPath));
    }

    public clearMergeResult(): MergeResult {
        return {
            numberOfAddedTransUnitElements: 0,
            numberOfCheckedFiles: 0,
            numberOfUpdatedNotes: 0,
            numberOfRemovedNotes: 0,
            numberOfUpdatedMaxWidths: 0,
            numberOfUpdatedSources: 0,
            numberOfRemovedTransUnits: 0,
            numberOfSuggestionsAdded: 0,
        }
    }

    public defaultSettings(): MergeSettings {
        return {
            sortOnly: false,
            matchWithSelf: false,
            matchBaseAppTranslation: false,
            replaceSelfClosingXlfTags: false,
            useExternalTranslationTool: false
        }
    }

    public async merge(matchXlfFileUri?: vscode.Uri): Promise<MergeResult> {
        this.suggestionsMaps = await createSuggestionMaps(matchXlfFileUri, this.settings.matchBaseAppTranslation);
        // 1. Sync with gXliff
        // 2. Match with
        //    - Itself
        //    - Selected matching file
        //    - Files from configured suggestions paths
        //    - Base Application

        let transUnitsToTranslate = this.gXlf.transunit.filter(x => x.translate);
        let langMatchMap = getXlfMatchMap(this.targetXlf);
        let newLangXliff = new Xliff(this.targetXlf.datatype, this.targetXlf.sourceLanguage, this.targetXlf.targetLanguage, this.targetXlf.original);
        newLangXliff.lineEnding = this.targetXlf.lineEnding;

        for (let index = 0; index < transUnitsToTranslate.length; index++) {
            const gTransUnit = transUnitsToTranslate[index];
            let langTransUnit = this.targetXlf.transunit.filter(x => x.id === gTransUnit.id)[0];
            if (!isNullOrUndefined(langTransUnit)) {
                this.addTarget(langTransUnit, gTransUnit);
                this.updateSource(langTransUnit, gTransUnit);
                this.updateMaxWidth(langTransUnit, gTransUnit);
                this.updateDeveloperNote(langTransUnit, gTransUnit);
                newLangXliff.transunit.push(langTransUnit);
                this.targetXlf.transunit.splice(this.targetXlf.transunit.indexOf(langTransUnit), 1);
            } else {
                // Does not exist in target
                if (!this.settings.sortOnly) {
                    let newTransUnit = TransUnit.fromString(gTransUnit.toString());
                    newTransUnit.targets = [];
                    newTransUnit.targets.push(this.getNewTarget(gTransUnit));
                    this.langIsSameAsGXlf ? newTransUnit.insertCustomNote(CustomNoteType.RefreshXlfHint, RefreshXlfHint.NewCopiedSource) : newTransUnit.insertCustomNote(CustomNoteType.RefreshXlfHint, RefreshXlfHint.New);
                    newLangXliff.transunit.push(newTransUnit);
                    this.mergeResult.numberOfAddedTransUnitElements++;
                }
            }
        }
        this.mergeResult.numberOfRemovedTransUnits += this.targetXlf.transunit.length;
        if (this.settings.matchWithSelf) {
            // Match it's own translations
            addMapToSuggestionMap(this.suggestionsMaps, this.targetXlf.targetLanguage, langMatchMap);
        }
        this.mergeResult.numberOfSuggestionsAdded += matchTranslationsFromTranslationMaps(newLangXliff, this.suggestionsMaps);
        newLangXliff.transunit.filter(tu => tu.hasCustomNote(CustomNoteType.RefreshXlfHint) && ((isNullOrUndefined(tu.targets[0].translationToken) && isNullOrUndefined(tu.targets[0].state)) || tu.targets[0].state === 'translated')).forEach(tu => {
            tu.removeCustomNote(CustomNoteType.RefreshXlfHint);
            this.mergeResult.numberOfRemovedNotes++;
        });
        return this.mergeResult;
    }

    private addTarget(langTransUnit: TransUnit, gTransUnit: TransUnit) {
        if (langTransUnit.hasTargets()) { return; }
        langTransUnit.targets.push(this.getNewTarget(gTransUnit));
        this.langIsSameAsGXlf ? langTransUnit.insertCustomNote(CustomNoteType.RefreshXlfHint, RefreshXlfHint.NewCopiedSource) : langTransUnit.insertCustomNote(CustomNoteType.RefreshXlfHint, RefreshXlfHint.New);
        this.mergeResult.numberOfAddedTransUnitElements++;
    }

    private updateSource(langTransUnit: TransUnit, gTransUnit: TransUnit) {
        if (langTransUnit.source === gTransUnit.source) { return };
        if (this.langIsSameAsGXlf && langTransUnit.targets.length === 1 && langTransUnit.targets[0].textContent === langTransUnit.source) {
            langTransUnit.targets[0].textContent = gTransUnit.source;
        }
        // Source has changed
        if (gTransUnit.source !== '') {
            if (this.settings.useExternalTranslationTool) {
                langTransUnit.targets[0].state = TargetState.NeedsAdaptation;
            } else {
                langTransUnit.targets[0].translationToken = TranslationToken.Review;
            }
            langTransUnit.insertCustomNote(CustomNoteType.RefreshXlfHint, RefreshXlfHint.ModifiedSource);
        }
        langTransUnit.source = gTransUnit.source;
        this.mergeResult.numberOfUpdatedSources++;

    }
    private updateMaxWidth(langTransUnit: TransUnit, gTransUnit: TransUnit) {
        if (langTransUnit.maxwidth === gTransUnit.maxwidth) { return; }
        langTransUnit.maxwidth = gTransUnit.maxwidth;
        this.mergeResult.numberOfUpdatedMaxWidths++;
    }

    private updateDeveloperNote(langTransUnit: TransUnit, gTransUnit: TransUnit) {
        if (langTransUnit.developerNote().textContent === gTransUnit.developerNote().textContent) { return; }
        langTransUnit.developerNote().textContent = gTransUnit.developerNote().textContent;
        this.mergeResult.numberOfUpdatedNotes++;
    }

    private getNewTarget(gTransUnit: TransUnit) {
        if (gTransUnit.source === '') { return new Target(''); }
        let newTargetText = this.langIsSameAsGXlf ? gTransUnit.source : '';
        let newTarget = this.settings.useExternalTranslationTool ? new Target(newTargetText, this.langIsSameAsGXlf ? TargetState.NeedsAdaptation : TargetState.NeedsTranslation) : new Target((this.langIsSameAsGXlf ? TranslationToken.Review : TranslationToken.NotTranslated) + newTargetText);
        return newTarget;
    }
}

interface MergeResult {
    numberOfAddedTransUnitElements: number,
    numberOfCheckedFiles: number,
    numberOfUpdatedNotes: number,
    numberOfRemovedNotes: number,
    numberOfUpdatedMaxWidths: number,
    numberOfUpdatedSources: number,
    numberOfRemovedTransUnits: number,
    numberOfSuggestionsAdded: number,

}

interface MergeSettings {
    sortOnly: boolean,
    matchWithSelf: boolean,
    matchBaseAppTranslation: boolean,
    replaceSelfClosingXlfTags: boolean,
    useExternalTranslationTool: boolean
}
