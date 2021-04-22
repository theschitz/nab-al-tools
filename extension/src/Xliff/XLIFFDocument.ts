/**
 *  https://docs.oasis-open.org/xliff/xliff-core/xliff-core.html
 */
import * as fs from 'fs';
import * as xmldom from 'xmldom';

import { XliffDocumentInterface, TransUnitInterface, TargetInterface, NoteInterface, HeaderInterface } from './XLIFFInterface';
import { XmlFormattingOptionsFactory, ClassicXmlFormatter } from '../XmlFormatter';
import { isNullOrUndefined } from 'util';
import * as Common from '../Common';
import { targetStateActionNeededAsList } from './XlfFunctions';
import * as LanguageFunctions from '../LanguageFunctions';

export class Xliff implements XliffDocumentInterface {
    public datatype: string;
    public sourceLanguage: string;
    public targetLanguage: string;
    public original: string;
    public transunit: TransUnit[];
    public lineEnding: string = '\n';
    static xmlns = 'urn:oasis:names:tc:xliff:document:1.2';
    public _path: string = '';
    public toolId?: string;
    public productName?: string;
    public productVersion?: string;
    public buildNum?: string;
    public requestId?: string;
    public header?: HeaderInterface;


    constructor(datatype: string, sourceLanguage: string, targetLanguage: string, original: string) {
        this.datatype = datatype;
        this.sourceLanguage = sourceLanguage;
        this.targetLanguage = targetLanguage;
        this.original = original;
        this.transunit = [];
    }

    static fromString(xml: string): Xliff {
        let dom = xmldom.DOMParser;
        let xlfDom = new dom().parseFromString(xml);
        let xliff = Xliff.fromDocument(xlfDom);
        xliff.lineEnding = Xliff.detectLineEnding(xml);
        return xliff;
    }

    static fromDocument(xmlDoc: Document): Xliff {
        let fileElement = xmlDoc.getElementsByTagName('file')[0];
        let _datatype = fileElement.getAttributeNode('datatype')?.value;// 'xml';
        _datatype = isNullOrUndefined(_datatype) ? '' : _datatype;
        let _sourceLang = fileElement.getAttributeNode('source-language')?.value;
        _sourceLang = isNullOrUndefined(_sourceLang) ? '' : _sourceLang;
        let _targetLang = fileElement.getAttributeNode('target-language')?.value;
        _targetLang = isNullOrUndefined(_targetLang) ? '' : _targetLang;
        let _original = fileElement.getAttributeNode('original')?.value;
        _original = isNullOrUndefined(_original) ? '' : _original;
        let xliff = new Xliff(_datatype, _sourceLang, _targetLang, _original);
        let toolId = fileElement.getAttributeNode('tool-id');
        if (!isNullOrUndefined(toolId)) {
            xliff.toolId = toolId.value;
        }
        let productName = fileElement.getAttributeNode('product-name');
        if (!isNullOrUndefined(productName)) {
            xliff.productName = productName.value;
        }
        let productVersion = fileElement.getAttributeNode('product-version');
        if (!isNullOrUndefined(productVersion)) {
            xliff.productVersion = productVersion.value;
        }
        let buildNum = fileElement.getAttributeNode('build-num');
        if (!isNullOrUndefined(buildNum)) {
            xliff.buildNum = buildNum.value;
        }
        let requestId = fileElement.getAttributeNode('request-id');
        if (!isNullOrUndefined(requestId)) {
            xliff.requestId = requestId.value;
        }
        let headerElement = fileElement.getElementsByTagName('header')[0];
        if (!isNullOrUndefined(headerElement)) {
            let toolElement = headerElement.getElementsByTagName('tool')[0];
            if (!isNullOrUndefined(toolElement)) {

                xliff.header = {
                    tool: {
                        toolId: toolElement.getAttributeNode('tool-id')?.value || '',
                        toolName: toolElement.getAttributeNode('tool-name')?.value || ''
                    }
                }
                let toolCompany = toolElement.getAttributeNode('tool-company');
                if (!isNullOrUndefined(toolCompany)) {
                    xliff.header.tool.toolCompany = toolCompany.value;
                }
                let toolVersion = toolElement.getAttributeNode('tool-version');
                if (!isNullOrUndefined(toolVersion)) {
                    xliff.header.tool.toolVersion = toolVersion.value;
                }
            }
        }
        let tu = xmlDoc.getElementsByTagNameNS(Xliff.xmlns, 'trans-unit');
        for (let i = 0; i < tu.length; i++) {
            xliff.transunit.push(TransUnit.fromElement(tu[i]));
        }
        return xliff;
    }

    public cloneWithoutTransUnits() {
        let newXliff = new Xliff(this.datatype, this.sourceLanguage, this.targetLanguage, this.original);
        newXliff.buildNum = this.buildNum;
        newXliff.productName = this.productName;
        newXliff.productVersion = this.productVersion;
        newXliff.toolId = this.toolId;
        newXliff.requestId = this.requestId;
        if (this.header) {
            newXliff.header = {
                tool: {
                    toolId: this.header?.tool.toolId,
                    toolName: this.header?.tool.toolName,
                    toolCompany: this.header?.tool.toolCompany,
                    toolVersion: this.header?.tool.toolVersion
                }
            };
        };
        return newXliff;
    }

    public toString(replaceSelfClosingTags: boolean = true, formatXml: boolean = true): string {
        let xml = new xmldom.XMLSerializer().serializeToString(this.toDocument());
        xml = Xliff.fixGreaterThanChars(xml);
        if (replaceSelfClosingTags) {
            xml = Xliff.replaceSelfClosingTags(xml);
        }
        if (formatXml) {
            xml = Xliff.formatXml(xml, this.lineEnding);
        }

        return xml;
    }

    static fixGreaterThanChars(xml: string) {
        // Workaround "> bug" in xmldom where a ">" in the Xml TextContent won't be written as "&gt;" as it should be, 
        // ref https://github.com/jwikman/nab-al-tools/issues/43 and https://github.com/xmldom/xmldom/issues/22
        const find = />([^<>]*)>/mi;
        let replaceString = '>$1&gt;';
        let lastXml = xml;
        do {
            // Replacing one > in a TextContent for each loop, loops if multiple > in any TextContent
            lastXml = xml;
            xml = Common.replaceAll(xml, find, replaceString);
        } while (xml !== lastXml);
        return xml;
    }

    static formatXml(xml: string, newLine: string = '\n'): string {
        let xmlFormatter = new ClassicXmlFormatter();
        let formattingOptions = XmlFormattingOptionsFactory.getALXliffXmlFormattingOptions(newLine);
        return xmlFormatter.formatXml(xml, formattingOptions);
    }

    static replaceSelfClosingTags(xml: string): string {
        // ref https://stackoverflow.com/a/16792194/5717285
        var split = xml.split("/>");
        var newXml = "";
        for (var i = 0; i < split.length - 1; i++) {
            var edsplit = split[i].split("<");
            newXml += split[i] + "></" + edsplit[edsplit.length - 1].split(" ")[0] + ">";
        }
        return newXml + split[split.length - 1];
    }

    public toDocument(): Document {
        let xliffDocument: Document = new xmldom.DOMParser().parseFromString('<?xml version="1.0" encoding="utf-8"?>');
        let xliffNode = xliffDocument.createElement('xliff');
        xliffNode.setAttribute('version', '1.2');
        xliffNode.setAttribute('xmlns', Xliff.xmlns);
        xliffNode.setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        xliffNode.setAttribute('xsi:schemaLocation', 'urn:oasis:names:tc:xliff:document:1.2 xliff-core-1.2-transitional.xsd');
        let fileNode = xliffDocument.createElementNS(Xliff.xmlns, 'file');
        fileNode.setAttribute('datatype', this.datatype);
        fileNode.setAttribute('source-language', this.sourceLanguage);
        fileNode.setAttribute('target-language', this.targetLanguage);
        fileNode.setAttribute('original', this.original);
        if (this.toolId) {
            fileNode.setAttribute('tool-id', this.toolId);
        }
        if (this.productName) {
            fileNode.setAttribute('product-name', this.productName);
        }
        if (this.productVersion) {
            fileNode.setAttribute('product-version', this.productVersion);
        }
        if (this.buildNum) {
            fileNode.setAttribute('build-num', this.buildNum);
        }
        if (this.requestId) {
            fileNode.setAttribute('request-id', this.requestId);
        }
        if (this.header) {
            let headerElement = xliffDocument.createElementNS(Xliff.xmlns, 'header');
            fileNode.appendChild(headerElement);
            if (this.header.tool) {
                let toolElement = xliffDocument.createElementNS(Xliff.xmlns, 'tool');
                toolElement.setAttribute('tool-id', this.header.tool.toolId);
                toolElement.setAttribute('tool-name', this.header.tool.toolName);
                if (this.header.tool.toolVersion) {
                    toolElement.setAttribute('tool-version', this.header.tool.toolVersion);
                }
                if (this.header.tool.toolCompany) {
                    toolElement.setAttribute('tool-company', this.header.tool.toolCompany);
                }
                headerElement.appendChild(toolElement);
            }
        }
        let bodyNode = xliffDocument.createElementNS(Xliff.xmlns, 'body');
        let bodyGroupNode = xliffDocument.createElementNS(Xliff.xmlns, 'group');
        bodyGroupNode.setAttribute('id', 'body');
        this.transunit.forEach(tUnit => {
            bodyGroupNode.appendChild(tUnit.toElement());
        });
        bodyNode.appendChild(bodyGroupNode);
        fileNode.appendChild(bodyNode);
        xliffNode.appendChild(fileNode);
        xliffDocument.appendChild(xliffNode);
        return xliffDocument;
    }

    static fromFileSync(path: string, encoding?: string): Xliff {
        encoding = isNullOrUndefined(encoding) ? 'utf8' : encoding;
        if (!path.endsWith('xlf')) {
            throw new Error(`Not a Xlf file path: ${path}`);

        }
        let result = Xliff.fromString(fs.readFileSync(path, encoding));
        result._path = path;
        return result;
    }

    public toFileSync(path: string, replaceSelfClosingTags: boolean = true, formatXml: boolean = true, encoding?: string) {
        let data;
        ({ data, encoding } = this.encodeData(encoding, replaceSelfClosingTags, formatXml));

        fs.writeFileSync(path, data, encoding);
    }

    public toFileAsync(path: string, replaceSelfClosingTags: boolean = true, formatXml: boolean = true, encoding?: string) {
        let data;
        ({ data, encoding } = this.encodeData(encoding, replaceSelfClosingTags, formatXml));

        fs.writeFile(path, data, { encoding: encoding }, function (err) {
            if (err) {
                throw new Error(`Error while saving file: ${err}`);
            }
        });
    }

    private encodeData(encoding: string | undefined, replaceSelfClosingTags: boolean, formatXml: boolean) {
        encoding = isNullOrUndefined(encoding) ? 'utf8' : encoding;
        let bom = '';
        if (encoding.toLowerCase() === 'utf8bom') {
            encoding = 'utf8';
            bom = '\ufeff';
        }
        let data = bom + this.toString(replaceSelfClosingTags, formatXml);
        return { data, encoding };
    }

    /**
     * @description Returns map of source string and translated targets.
     * @summary description
     * @returnType {Map<string, string[]>}
     */
    public translationMap(): Map<string, string[]> {
        let transMap = new Map<string, string[]>();
        this.transunit.filter(tu => tu.targetsHasTextContent()).forEach(unit => {
            if (!transMap.has(unit.source)) {
                transMap.set(unit.source, [unit.target.textContent]);
            } else {
                let mapElements = transMap.get(unit.source);
                if (!mapElements?.includes(unit.target.textContent)) {
                    mapElements?.push(unit.target.textContent);
                }
                if (!isNullOrUndefined(mapElements)) {
                    transMap.set(unit.source, mapElements);
                }
            }
        });
        return transMap;
    }

    public getTransUnitById(id: string): TransUnit {
        return this.transunit.filter(tu => tu.id === id)[0];
    }

    public hasTransUnit(id: string): boolean {
        return !isNullOrUndefined(this.getTransUnitById(id));
    }

    public sortTransUnits() {
        this.transunit.sort(CompareTransUnitId);
    }

    /**
     * Returns an array of trans-units where source matches and the translation differs from the input TransUnit
     * @param transUnit trans-unit to match with.
     * @returns TransUnit[]
     */
    public getSameSourceDifferentTarget(transUnit: TransUnit): TransUnit[] {
        return this.transunit.filter(t => ((t.source === transUnit.source) && (t.target.textContent !== transUnit.target.textContent)));
    }

    /**
     * Checks if source exists more than once.
     * @param source Source string to search for.
     * @returns boolean
     */
    public sourceHasDuplicates(source: string): boolean {
        return this.getTransUnitsBySource(source).length > 1;
    }

    /**
     * Returns an array of trans-units where source matches the input.
     * @param source Source string to search for.
     * @returns TransUnit[]
     */
    public getTransUnitsBySource(source: string): TransUnit[] {
        return this.transunit.filter(t => t.source === source);
    }

    /**
     * Returns an array of trans-units with matching sources and different translations.
     * @returns TransUnit[]
     */
    public differentlyTranslatedTransunits(): TransUnit[] {
        let transUnits: TransUnit[] = [];
        this.transunit.forEach(tu => {
            this.getSameSourceDifferentTarget(tu).forEach(duplicate => {
                if (transUnits.filter(a => a.id === duplicate.id).length === 0) {
                    transUnits.push(duplicate);
                }
            });
        });
        return transUnits;
    }

    static detectLineEnding(xml: string): string {
        const temp = xml.indexOf('\n');
        if (xml[temp - 1] === '\r') {
            return '\r\n';
        }
        return '\n';
    }

    /**
     * @description Determines if custom notes of passed types exists in transunits.
     * @param customNoteType Custom note type to search for.
     * @returns boolean
     */
    public customNotesOfTypeExists(customNoteType: CustomNoteType): boolean {
        return this.transunit.filter(tu => tu.hasCustomNote(customNoteType)).length > 0;
    }

    /**
     * @description Removes all notes were 'From' attribute equals the customNoteType.
     * @param customNoteType Custom note type to remove.
     * @returns number of notes removed.
     * @returnType number
     */
    public removeAllCustomNotesOfType(customNoteType: CustomNoteType): number {
        let removedNotes: number = 0;
        this.transunit
            .filter(tu => tu.hasCustomNote(customNoteType))
            .forEach(tu => {
                tu.removeCustomNote(customNoteType);
                removedNotes++;
            });
        return removedNotes;
    }

    public translationTokensExists(): boolean {
        return this.transunit.filter(tu => tu.hasTranslationToken()).length > 0;
    }
}

export class TransUnit implements TransUnitInterface {
    id: string;
    translate: boolean;
    source: string;
    targets: Target[] = [];
    notes: Note[] = [];
    sizeUnit?: SizeUnit;
    xmlSpace: string;
    maxwidth: number | undefined;
    alObjectTarget: string | undefined;

    constructor(id: string, translate: boolean, source: string, target: Target | undefined, sizeUnit: SizeUnit, xmlSpace: string, notes?: Note[], maxwidth?: number | undefined, alObjectTarget?: string | undefined) {
        this.id = id;
        this.translate = translate;
        this.source = source;
        if (!isNullOrUndefined(target)) {
            this.targets.push(target);
        }
        if (notes) {
            this.notes = notes;
        }
        this.sizeUnit = sizeUnit;
        this.xmlSpace = xmlSpace;
        this.maxwidth = maxwidth;
        this.alObjectTarget = alObjectTarget;
    }

    get targetState(): string { return isNullOrUndefined(this.target.state) ? "" : this.target.state; }
    get targetStateQualifier(): string { return isNullOrUndefined(this.target.stateQualifier) ? "" : this.target.stateQualifier; }
    get targetTranslationToken(): string { return isNullOrUndefined(this.target.translationToken) ? "" : this.target.translationToken; }

    public get target(): Target {
        if (this.targets.length === 0) {
            return new Target('');
        }
        return this.targets[0];
    }
    public set target(newTarget: Target) {
        if (this.targets.length === 0) {
            this.targets.push(newTarget)
        } else {
            this.targets[0] = newTarget;
        }
    }

    static fromString(xml: string): TransUnit {
        let dom = xmldom.DOMParser;
        let transUnit = new dom().parseFromString(xml).getElementsByTagName('trans-unit')[0];
        return TransUnit.fromElement(transUnit);
    }

    static fromElement(transUnit: Element): TransUnit {
        let _maxwidth = undefined;
        let _maxwidthText = transUnit.getAttributeNode('maxwidth')?.value;
        if (_maxwidthText) {
            _maxwidth = Number.parseInt(_maxwidthText);
        }
        let _notes: Array<Note> = [];
        let _id = transUnit.getAttributeNode('id')?.value;
        _id = isNullOrUndefined(_id) ? '' : _id;
        let _alObjectTarget = transUnit.getAttributeNode('al-object-target')?.value;
        _alObjectTarget = isNullOrUndefined(_alObjectTarget) ? undefined : _alObjectTarget;
        let _sizeUnit = transUnit.getAttributeNode('size-unit')?.value;
        let _xmlSpace = transUnit.getAttributeNode('xml:space')?.value;
        _xmlSpace = isNullOrUndefined(_xmlSpace) ? 'preserve' : _xmlSpace;
        let t = transUnit.getAttributeNode('translate')?.value;
        let _translate = (t === null || t === undefined || t.toLowerCase() === 'no') ? false : true;
        let _source = transUnit.getElementsByTagName('source')[0]?.childNodes[0]?.nodeValue;
        _source = isNullOrUndefined(_source) ? '' : _source;
        let notesElmnts = transUnit.getElementsByTagName('note');
        for (let i = 0; i < notesElmnts.length; i++) {
            _notes.push(Note.fromElement(notesElmnts[i]));
        }
        let _transUnit = new TransUnit(_id, _translate, _source, undefined, <SizeUnit>_sizeUnit, _xmlSpace, _notes, _maxwidth, _alObjectTarget);
        let _targets: Target[] = [];
        let targetElmnt = transUnit.getElementsByTagName('target');
        for (let i = 0; i < targetElmnt.length; i++) {
            if (targetElmnt) {
                _targets?.push(Target.fromElement(targetElmnt[i]));
            }
        }
        _transUnit.targets = _targets;
        return _transUnit;
    }

    public toString(): string {
        return new xmldom.XMLSerializer().serializeToString(this.toElement());
    }

    public toElement(): Element {
        let transUnit = new xmldom.DOMImplementation().createDocument(null, null, null).createElement('trans-unit');
        transUnit.setAttribute('id', this.id);
        if (this.maxwidth) {
            transUnit.setAttribute('maxwidth', this.maxwidth.toString());
        }
        if (this.sizeUnit) {
            transUnit.setAttribute('size-unit', this.sizeUnit);
        }
        transUnit.setAttribute('translate', this.translateAttributeYesNo());
        transUnit.setAttribute('xml:space', this.xmlSpace);
        if (!isNullOrUndefined(this.alObjectTarget)) {
            transUnit.setAttribute('al-object-target', this.alObjectTarget);
        }
        let source = new xmldom.DOMImplementation().createDocument(null, null, null).createElement('source');
        source.textContent = this.source;
        transUnit.appendChild(source);
        if (this.targets !== undefined) {
            this.targets.forEach(t => {
                transUnit.appendChild(t.toElement());
            });
        }
        this.notes.sort((a, b) => a.priority - b.priority).forEach(n => {
            transUnit.appendChild(n.toElement());
        });
        return transUnit;
    }

    public addTarget(target: Target) {
        this.targets.push(target);
    }

    public hasTargets() {
        return this.targets.length > 0;
    }

    public identicalTargetExists(target: Target): boolean {
        return this.targets.filter(t => t.textContent === target.textContent).length > 0;
    }

    public targetsHasTextContent(): boolean {
        return this.targets.filter(t => t.textContent !== "").length > 0;
    }

    public addNote(from: string, annotates: string, priority: number, textContent: string) {
        this.notes.push(new Note(from, annotates, priority, textContent));
    }

    public getNoteFrom(from: string): Note[] | null {
        let note = this.notes.filter((n) => n.from === from);
        return isNullOrUndefined(note) ? null : note;
    }

    private translateAttributeYesNo(): string {
        return this.translate ? 'yes' : 'no';
    }

    public insertCustomNote(customNoteType: CustomNoteType, text: string) {
        this.removeCustomNote(customNoteType);
        let note = new Note(customNoteType, 'general', 3, text);
        this.notes.unshift(note);
    }
    public removeCustomNote(customNoteType: CustomNoteType) {
        this.notes = this.notes.filter(x => x.from !== customNoteType);
    }
    public hasCustomNote(customNoteType: CustomNoteType) {
        return !isNullOrUndefined(this.customNote(customNoteType));
    }
    public customNote(customNoteType: CustomNoteType) {
        return this.notes.filter(x => x.from === customNoteType)[0];
    }
    public customNoteContent(customNoteType: CustomNoteType) {
        const note = this.customNote(customNoteType);
        return note ? note.textContent : '';
    }

    public removeDeveloperNoteIfEmpty() {
        let note = this.developerNote();
        if (!isNullOrUndefined(note)) {
            if (note.textContent === '') {
                this.notes = this.notes.filter(x => x.from !== note.from);
            }
        }
    }

    public developerNote() {
        return this.notes.filter(x => x.from === 'Developer')[0];
    }
    public developerNoteContent() {
        const note = this.developerNote();
        return note ? note.textContent : '';
    }
    public xliffGeneratorNote() {
        return this.notes.filter(x => x.from === 'Xliff Generator')[0];
    }
    public xliffGeneratorNoteContent() {
        const note = this.xliffGeneratorNote();
        return note ? note.textContent : '';
    }

    public hasTranslationToken(): boolean {
        return this.targets.filter(t => !isNullOrUndefined(t.translationToken)).length > 0;
    }

    public needsReview(): boolean {
        const translationMode = LanguageFunctions.getTranslationMode();
        const checkTargetState = [LanguageFunctions.TranslationMode.External, LanguageFunctions.TranslationMode.LCS].includes(translationMode);
        return (this.target.translationToken !== undefined) ||
            (this.hasCustomNote(CustomNoteType.RefreshXlfHint)) ||
            (checkTargetState && !isNullOrUndefined(this.targetState) && targetStateActionNeededAsList().includes(this.targetState));
    }
}

export class Target implements TargetInterface {
    textContent: string;
    state?: TargetState | null;
    translationToken?: TranslationToken;
    stateQualifier?: string;

    constructor(textContent: string, state?: TargetState | null) {
        this.setTranslationToken(textContent);
        if (this.translationToken) {
            textContent = textContent.substring(this.translationToken.length);
        }
        this.textContent = textContent;
        this.state = state;
        this.stateQualifier = undefined;
    }
    static fromString(xml: string): Target {
        let dom = xmldom.DOMParser;
        let targetElement = new dom().parseFromString(xml).getElementsByTagName('target')[0];
        return Target.fromElement(targetElement);
    }

    static fromElement(target: Element): Target {
        let _textContent = '';
        let _stateValue = null;
        let _stateQualifierValue = undefined;
        if (!isNullOrUndefined(target) && target.hasChildNodes()) {
            _textContent = isNullOrUndefined(target.childNodes[0]?.nodeValue) ? '' : target.childNodes[0]?.nodeValue;
            _stateQualifierValue = target.getAttributeNode('state-qualifier')?.value;
            _stateQualifierValue = isNullOrUndefined(_stateQualifierValue) ? undefined : _stateQualifierValue.toLowerCase();
            if (!isNullOrUndefined(target.getAttributeNode('state')?.value)) {
                _stateValue = isNullOrUndefined(target.getAttributeNode('state')?.value) ? TargetState.New : target.getAttributeNode('state')?.value.toLowerCase();
            }
        }
        let newTarget = new Target(_textContent, isNullOrUndefined(_stateValue) ? null : _stateValue as TargetState);
        newTarget.stateQualifier = isNullOrUndefined(_stateQualifierValue) ? undefined : _stateQualifierValue as StateQualifier;
        return newTarget;
    }

    public toString(): string {
        return new xmldom.XMLSerializer().serializeToString(this.toElement());
    }

    public toElement(): Element {
        let target = new xmldom.DOMImplementation().createDocument(null, null, null).createElement('target');
        if (!isNullOrUndefined(this.state)) {
            target.setAttribute('state', this.state);
        }
        if (!isNullOrUndefined(this.stateQualifier)) {
            target.setAttribute('state-qualifier', this.stateQualifier);
        }
        target.textContent = this.translationToken ? this.translationToken + this.textContent : this.textContent;
        return target;
    }

    public hasContent(): boolean {
        return this.textContent !== "";
    }

    public includes(...values: string[]): boolean {
        for (const v of values) {
            if (this.textContent.includes(v)) {
                return true;
            }
        }
        return false;
    }
    private setTranslationToken(textContent: string) {
        for (const translationToken of Object.values(TranslationToken)) {
            if (textContent.startsWith(translationToken)) {
                this.translationToken = translationToken;
                return;
            }
        }
    }
}

export class Note implements NoteInterface {
    from: string;
    annotates: string;
    priority: number;
    textContent: string;
    constructor(from: string, annotates: string, priority: number, textContent: string) {
        this.from = from;
        this.annotates = annotates;
        this.priority = priority;
        this.textContent = textContent;
    }

    static fromString(xml: string): Note {
        let dom = xmldom.DOMParser;
        let note: Element = new dom().parseFromString(xml).getElementsByTagName('note')[0];
        return Note.fromElement(note);
    }

    static fromElement(note: Element): Note {
        let _from = note.getAttributeNode('from')?.value;
        _from = (_from === null || _from === undefined) ? '' : _from;
        let _annotates = note.getAttributeNode('annotates')?.value;
        _annotates = (_annotates === null || _annotates === undefined) ? '' : _annotates;
        let _prio = note.getAttributeNode('priority')?.value;
        let _priority = (_prio === null || _prio === undefined) ? 0 : parseInt(_prio);
        let _textContent = note.childNodes[0]?.nodeValue;
        _textContent = (_textContent === null || _textContent === undefined) ? '' : _textContent;
        return new Note(_from, _annotates, _priority, _textContent);
    }

    public toString(): string {
        return new xmldom.XMLSerializer().serializeToString(this.toElement());
    }

    public toElement(): Element {
        let note = new xmldom.DOMImplementation().createDocument(null, null, null).createElement('note');
        note.setAttribute('from', this.from);
        note.setAttribute('annotates', this.annotates);
        note.setAttribute('priority', this.priority.toString());
        note.textContent = this.textContent;
        return note;
    }
}

export enum TargetState {
    Final = 'final', 	                                    // Indicates the terminating state.
    NeedsAdaptation = 'needs-adaptation', 	                // Indicates only non-textual information needs adaptation.
    NeedsL10n = 'needs-l10n',                               // Indicates both text and non-textual information needs adaptation.
    NeedsReviewAdaptation = 'needs-review-adaptation',      // Indicates only non-textual information needs review.
    NeedsReviewL10n = 'needs-review-l10n', 	                // Indicates both text and non-textual information needs review.
    NeedsReviewTranslation = 'needs-review-translation', 	// Indicates that only the text of the item needs to be reviewed.
    NeedsTranslation = 'needs-translation', 	            // Indicates that the item needs to be translated.
    New = 'new', 	                                        // Indicates that the item is new. For example, translation units that were not in a previous version of the document.
    SignedOff = 'signed-off',                               // Indicates that changes are reviewed and approved.
    Translated = 'translated'                               // Indicates that the item has been translated. 
}

export enum TranslationToken {
    NotTranslated = '[NAB: NOT TRANSLATED]',
    Suggestion = '[NAB: SUGGESTION]',
    Review = '[NAB: REVIEW]'
}

export enum CustomNoteType {
    RefreshXlfHint = 'NAB AL Tool Refresh Xlf'
}

export enum StateQualifier {
    ExactMatch = 'exact-match',                     // Indicates an exact match. An exact match occurs when a source text of a segment is exactly the same as the source text of a segment that was translated previously.
    FuzzyMatch = 'fuzzy-match',                     // Indicates a fuzzy match. A fuzzy match occurs when a source text of a segment is very similar to the source text of a segment that was translated previously (e.g. when the difference is casing, a few changed words, white-space discripancy, etc.).
    IdMatch = 'id-match',                           // Indicates a match based on matching IDs (in addition to matching text).
    LeveragedGlossary = 'leveraged-glossary',       // Indicates a translation derived from a glossary.
    LeveragedInherited = 'leveraged-inherited',     // Indicates a translation derived from existing translation.
    LeveragedMT = 'leveraged-mt',                   // Indicates a translation derived from machine translation.
    LeveragedRepository = 'leveraged-repository',   // Indicates a translation derived from a translation repository.
    LeveragedTM = 'leveraged-tm',                   // Indicates a translation derived from a translation memory.
    MTSuggestion = 'mt-suggestion',                 // Indicates the translation is suggested by machine translation.
    RejectedGrammar = 'rejected-grammar',           // Indicates that the item has been rejected because of incorrect grammar.
    RejectedInaccurate = 'rejected-inaccurate',     // Indicates that the item has been rejected because it is incorrect.
    RejectedLength = 'rejected-length',             // Indicates that the item has been rejected because it is too long or too short.
    RejectedSpelling = 'rejected-spelling',         // Indicates that the item has been rejected because of incorrect spelling.
    TMSuggestion = 'tm-suggestion'                  // Indicates the translation is suggested by translation memory.
}

export enum SizeUnit {
    byte = 'byte',          // Indicates a size in 8-bit bytes.
    char = 'char',          // Indicates a size in Unicode characters.
    col = 'col',            // Indicates a size in columns. Used for HTML text area.
    cm = 'cm',              // Indicates a size in centimeters.
    dlgunit = 'dlgunit',    // Indicates a size in dialog units, as defined in Windows resources.
    em = 'em',              // Indicates a size in 'font-size' units (as defined in CSS).
    ex = 'ex',              // Indicates a size in 'x-height' units (as defined in CSS).
    glyph = 'glyph',        // Indicates a size in glyphs. A glyph is considered to be one or more combined Unicode characters that represent a single displayable text character. Sometimes referred to as a 'grapheme cluster'
    in = 'in',              // Indicates a size in inches.
    mm = 'mm',              // Indicates a size in millimeters.
    percent = 'percent',    // Indicates a size in percentage.
    pixel = 'pixel',        // Indicates a size in pixels.
    point = 'point',        // Indicates a size in point.
    row = 'row'             // Indicates a size in rows. Used for HTML text area.
}

function CompareTransUnitId(aUnit: TransUnit, bUnit: TransUnit): number {
    const a = transUnitIdAsObject(aUnit);
    const b = transUnitIdAsObject(bUnit);
    if (a.objectTypeId < b.objectTypeId) {
        return -1;
    }
    if (a.objectTypeId > b.objectTypeId) {
        return 1;
    }
    if (a.controlId < b.controlId) {
        return -1;
    }
    if (a.controlId > b.controlId) {
        return 1;
    }
    if (a.propertyId < b.propertyId) {
        return -1;
    }
    if (a.propertyId > b.propertyId) {
        return 1;
    }
    return 0;
}
function transUnitIdAsObject(transUnit: TransUnit): { objectTypeId: number, controlId: number, propertyId: number } {
    const idStr = transUnit.id.split('-');
    let typeId = idStr[0].trim().split(' ')[1].trim();
    let fieldId = idStr[1].trim().split(' ')[1].trim();
    let propertyId = '0';
    if (idStr.length === 3) {
        propertyId = idStr[2].trim().split(' ')[1].trim();
    }
    return {
        objectTypeId: parseInt(typeId),
        controlId: parseInt(fieldId),
        propertyId: parseInt(propertyId)
    };
}
