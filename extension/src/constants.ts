import * as Common from './Common';
import { TranslationToken } from './XLIFFDocument';

// RegEx strings:
// All translation tokens

export const translationTokenSearchExpression = `${Common.escapeRegex(TranslationToken.NotTranslated)}|${Common.escapeRegex(TranslationToken.Review)}|${Common.escapeRegex(TranslationToken.Suggestion)}|${Common.escapeRegex('[NAB:')}`;

// <target missing end gt</target>
export const matchBrokenTargetStart = `<target[^>]*target>`;
// <target> missing start lt /target>
export const matchBrokenTargetEnd = `<target>[^<]*target>`;
// <target> greater than > in value</target>
export const matchGreaterThanInValue = `>[^<>]*>[^<>]*<`;
// above combined
export const invalidXmlSearchExpression = `(${matchBrokenTargetStart})|(${matchBrokenTargetEnd})|(${matchGreaterThanInValue})`;

// from .vscode\extensions\ms-dynamics-smb.al-6.5.413786\al.configuration.json
export const wordPattern = "(\"(?:(?:\\\"\\\")|[^\\\"])*\")|(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s]+)";

// Below is for ALParser and parsing of all AL Objects
export const anyWhiteSpacePattern = `[\\n\\r\\s\\t]`;
const objectDataTypePattern = `(?<objectType>page|record|codeunit|xmlport|query|report|interface|enum|TestPage)${anyWhiteSpacePattern}+(?<objectName>${wordPattern})(?<temporary>\\s+temporary)?`;
const simpleDataTypePattern = `\\w+(\\[\\d+\\])?`;
const dictionaryDataTypePattern = `Dictionary${anyWhiteSpacePattern}+of${anyWhiteSpacePattern}+\\[${simpleDataTypePattern},\\s*(${simpleDataTypePattern}|Dictionary${anyWhiteSpacePattern}+of${anyWhiteSpacePattern}+\\[${simpleDataTypePattern},\\s*${simpleDataTypePattern}\\])\\]`;
const listDataTypePattern = `List${anyWhiteSpacePattern}+of${anyWhiteSpacePattern}+\\[${simpleDataTypePattern}\\]`;
const arrayDataTypePattern = `Array\\[\\d+\\]${anyWhiteSpacePattern}+of${anyWhiteSpacePattern}+${simpleDataTypePattern}`;

const variableDatatypePattern = `\\s*(?<datatype>(?<objectDataType>${objectDataTypePattern})|(?<dictionary>${dictionaryDataTypePattern})|(?<list>${listDataTypePattern})|(?<array>${arrayDataTypePattern})|(?<simpleDatatype>${simpleDataTypePattern})))${anyWhiteSpacePattern}*`;
export const parameterPattern = `(?<byRef>\\s*\\bvar\\b\\s*)?((?<name>${wordPattern})\\s*:${variableDatatypePattern}`;
export const returnVariablePattern = `((?<name>${wordPattern})?\\s*:${variableDatatypePattern}`;
export const attributePattern = `^\\s*\\[(?<attribute>.+)\\]\\s*$`;
export const procedurePattern = `^${anyWhiteSpacePattern}*(?<attributes>(\\[.*\\]${anyWhiteSpacePattern}*)*)?(?<access>internal |protected |local |)procedure\\s+(?<name>${wordPattern})\\(${anyWhiteSpacePattern}*(?<params>((?<firstParam>${removeGroupNamesFromRegex(parameterPattern)}))?(?<moreParams>${anyWhiteSpacePattern}*;${anyWhiteSpacePattern}*${removeGroupNamesFromRegex(parameterPattern)})*)${anyWhiteSpacePattern}*\\)${anyWhiteSpacePattern}*(?<returns>.*)?$`;


export function removeGroupNamesFromRegex(regex: string): string {
    return regex.replace(/\?<\w+>/g, "");
}