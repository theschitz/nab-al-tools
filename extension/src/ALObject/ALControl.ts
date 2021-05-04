import { isNullOrUndefined } from 'util';
import * as Common from '../Common';
import { TransUnit } from "../Xliff/XLIFFDocument";
import { ALElement } from "./ALElement";
import { ALObject } from "./ALObject";
import { ALProperty } from "./ALProperty";
import { ALXmlComment } from './ALXmlComment';
import { ALControlType, ALObjectType, ALPropertyType, MultiLanguageType, XliffTokenType } from "./Enums";
import { MultiLanguageObject } from "./MultiLanguageObject";
import { XliffIdToken } from "./XliffIdToken";

export class ALControl extends ALElement {
    type: ALControlType = ALControlType.none;
    _name?: string;
    xliffTokenType: XliffTokenType = XliffTokenType.InheritFromControl;
    multiLanguageObjects: MultiLanguageObject[] = new Array();
    controls: ALControl[] = new Array();
    properties: ALProperty[] = new Array();
    xmlComment?: ALXmlComment;
    isALCode: boolean = false;

    constructor(type: ALControlType, name?: string) {
        super();
        this.type = type;
        if (name) {
            this.name = name;
        }
    }

    public get name(): string {
        if (!this._name) {
            return '';
        }
        return this._name;
    }

    public set name(name: string) {
        name = name.trim();
        if (name.toLowerCase().startsWith('rec.')) {
            name = name.substr(4);
        }
        this._name = Common.trimAndRemoveQuotes(name);
    }


    public get caption(): string {
        let prop = this.multiLanguageObjects.filter(x => x.name === MultiLanguageType[MultiLanguageType.Caption])[0];
        return isNullOrUndefined(prop) ? '' : prop.text;
    }

    public get toolTip(): string {
        let prop = this.multiLanguageObjects.filter(x => x.name === MultiLanguageType[MultiLanguageType.ToolTip] && !x.commentedOut)[0];
        if (!prop) {
            return '';
        } else {
            return prop.text.replace("''", "'");
        }
    }
    public set toolTip(value: string) {
        let toolTip = this.multiLanguageObjects.filter(x => x.name === MultiLanguageType[MultiLanguageType.ToolTip] && !x.commentedOut)[0];
        if (toolTip) {
            throw new Error("Changing ToolTip is not implemented.");
        } else {
            let toolTipText = value.replace("'", "''");
            let newToolTip = new MultiLanguageObject(this, MultiLanguageType.ToolTip, 'ToolTip');
            newToolTip.commentedOut = true;
            newToolTip.text = toolTipText;
            let insertBeforeLineNo = this.endLineIndex;
            let indentation = this.alCodeLines[this.startLineIndex].indentation + 1;
            const triggerLine = this.alCodeLines.filter(x => x.lineNo < this.endLineIndex && x.lineNo > this.startLineIndex && x.code.match(/trigger \w*\(/i));
            if (triggerLine.length > 0) {
                insertBeforeLineNo = triggerLine[0].lineNo;
            } else {
                const applicationAreaProp = this.properties.filter(x => x.type === ALPropertyType.ApplicationArea);
                if (applicationAreaProp.length > 0) {
                    insertBeforeLineNo = applicationAreaProp[0].startLineIndex + 1;
                }
            }
            while (this.alCodeLines[insertBeforeLineNo - 1].code.trim() === '') {
                insertBeforeLineNo--;
            }
            const codeLine = `// ToolTip = '${toolTipText}';`;
            const object = this.getObject();
            object.insertAlCodeLine(codeLine, indentation, insertBeforeLineNo);
            this.multiLanguageObjects.push(newToolTip);
        }
    }

    public get toolTipCommentedOut(): string {
        let prop = this.multiLanguageObjects.filter(x => x.name === MultiLanguageType[MultiLanguageType.ToolTip] && x.commentedOut)[0];
        if (!prop) {
            return '';
        } else {
            return prop.text;
        }
    }

    public isIdentical(otherControl: ALControl): boolean {
        return (otherControl.type === this.type && otherControl.name === this.name);
    }

    public getObjectType(): ALObjectType {
        if (!this.parent) {
            if (this instanceof ALObject) {
                let obj: ALObject = <ALObject>this;
                return obj.objectType;
            } else {
                throw new Error('The top level parent must be an object');
            }
        } else {
            return this.parent.getObjectType();
        }
    }

    public getAllObjects(includeSymbolObjects: boolean = false): ALObject[] | undefined {
        if (!this.parent) {
            if (this instanceof ALObject) {
                let obj: ALObject = <ALObject>this;
                return includeSymbolObjects ? obj.alObjects : obj.alObjects.filter(obj => !obj.generatedFromSymbol);
            } else {
                throw new Error('The top level parent must be an object');
            }
        } else {
            return this.parent.getAllObjects(includeSymbolObjects);
        }
    }

    public getObject(): ALObject {
        if (!this.parent) {
            if (this instanceof ALObject) {
                return this;
            } else {
                throw new Error('The top level parent must be an object');
            }
        } else {
            return this.parent.getObject();
        }
    }

    public getGroupType(): ALControlType {
        if (!this.parent) {
            throw new Error('The top level parent must be an object');
        }

        if (this.parent instanceof ALObject) {
            return this.type;
        } else {
            return this.parent.getGroupType();
        }
    }

    public isObsoletePending(inheritFromParent: boolean = true): boolean {
        let obsoleteProperty = this.properties.filter(prop => prop.type === ALPropertyType.ObsoleteState)[0];
        if (obsoleteProperty) {
            if (obsoleteProperty.value.toLowerCase() === 'pending') {
                return true;
            }
        }
        if (!inheritFromParent) {
            return false;
        }
        if (!this.parent) {
            return false; // Object level, no ObsoleteState Pending set
        }
        return this.parent.isObsoletePending(inheritFromParent);
    }

    public isObsolete(): boolean {
        let obsoleteProperty = this.properties.filter(prop => prop.type === ALPropertyType.ObsoleteState)[0];
        if (obsoleteProperty) {
            if (obsoleteProperty.value.toLowerCase() === 'removed') {
                return true;
            }
        }
        if (!this.parent) {
            return false; // Object level, no ObsoleteState Removed set
        }
        return this.parent.isObsolete();
    }

    public getObsoletePendingInfo(): ObsoletePendingInfo | undefined {
        if (!this.isObsoletePending(false)) {
            return;
        }
        let info: ObsoletePendingInfo = new ObsoletePendingInfo();

        let prop = this.properties.filter(prop => prop.type === ALPropertyType.ObsoleteState)[0];
        info.obsoleteState = prop ? prop.value : '';

        prop = this.properties.filter(prop => prop.type === ALPropertyType.ObsoleteReason)[0];
        info.obsoleteReason = prop ? prop.value : '';

        prop = this.properties.filter(prop => prop.type === ALPropertyType.ObsoleteTag)[0];
        info.obsoleteTag = prop ? prop.value : '';

        return info;
    }

    public getPropertyValue(propertyType: ALPropertyType): string | undefined {
        let prop = this.properties.filter(prop => prop.type === propertyType)[0];
        return prop?.value;
    }

    public getControl(type: ALControlType, name: string): ALControl | undefined {
        let controls = this.getAllControls(type);
        return controls.filter(x => x.type === type && x.name === name)[0];
    }

    public getAllControls(type?: ALControlType): ALControl[] {
        let result: ALControl[] = [];
        if (type) {
            if (this.type === type) {
                result.push(this);
            }
        } else {
            result.push(this);
        }

        this.controls.forEach(control => {
            let childControls = control.getAllControls(type);
            childControls.forEach(control => result.push(control));
        });
        result = result.sort((a, b) => a.startLineIndex - b.startLineIndex);
        return result;
    }

    public getAllMultiLanguageObjects(options?: { onlyForTranslation?: boolean, includeCommentedOut?: boolean }): MultiLanguageObject[] {
        if (!options) {
            options = {
                onlyForTranslation: false,
                includeCommentedOut: false
            };
        }
        let result: MultiLanguageObject[] = [];
        let mlObjects = this.multiLanguageObjects;
        if (!(options.includeCommentedOut)) {
            mlObjects = mlObjects.filter(obj => !obj.commentedOut);
        }
        mlObjects.forEach(mlObject => result.push(mlObject));
        this.controls.forEach(control => {
            let mlObjects = control.getAllMultiLanguageObjects(options);
            mlObjects.forEach(mlObject => result.push(mlObject));
        });
        if (options.onlyForTranslation) {
            result = result.filter(obj => obj.shouldBeTranslated() === true);
        }
        result = result.sort((a, b) => a.startLineIndex - b.startLineIndex);
        return result;
    }

    public getTransUnits(): TransUnit[] {
        let mlObjects = this.getAllMultiLanguageObjects({ onlyForTranslation: true });
        let transUnits = new Array();
        mlObjects.forEach(obj => {
            transUnits.push(obj.transUnit());
        });
        return transUnits;
    }

    public xliffIdToken(): XliffIdToken | undefined {
        if (!this.name) {
            return;
        }
        if (this.xliffTokenType === XliffTokenType.Skip) {
            return;
        }
        let tokenType: string;
        switch (this.xliffTokenType) {
            case XliffTokenType.InheritFromControl:
                tokenType = this.type;
                break;
            case XliffTokenType.InheritFromObjectType:
                tokenType = this.getObjectType();
                break;
            default:
                tokenType = XliffTokenType[this.xliffTokenType];
                break;
        }
        let token = new XliffIdToken(tokenType, this.name);
        return token;
    }

    public xliffIdTokenArray(): XliffIdToken[] {
        let xliffIdToken = this.xliffIdToken();
        if (!this.parent) {
            let arr = new Array();
            if (xliffIdToken) {
                arr.push(xliffIdToken);
            }
            return arr;
        } else {
            let arr = this.parent.xliffIdTokenArray();
            if (!arr) {
                throw new Error(`Parent did not have a XliffIdTokenArray`);
            }
            if (xliffIdToken) {
                if ((arr[arr.length - 1].type === xliffIdToken.type)) {
                    arr.pop(); // only keep last occurrence of a type
                } else if ((this.type === ALControlType.Column) && ([XliffTokenType[XliffTokenType.QueryDataItem], XliffTokenType[XliffTokenType.ReportDataItem]].includes(arr[arr.length - 1].type))) {
                    arr.pop();
                }
            }
            if (xliffIdToken) {
                arr.push(xliffIdToken);
            }
            return arr;
        }
    }
}


export class ObsoletePendingInfo {
    obsoleteState?: string;
    obsoleteReason?: string;
    obsoleteTag?: string;
}