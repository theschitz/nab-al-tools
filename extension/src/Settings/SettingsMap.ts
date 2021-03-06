import { Settings } from "./Settings";

// Maps a setting to the property on the Settings class
export const settingsMap = new Map<string, keyof Settings>([
  ["NAB.SignToolPath", "signToolPath"],
  ["NAB.SigningCertificateName", "signingCertificateName"],
  ["NAB.SigningTimeStampServer", "signingTimeStampServer"],
  ["NAB.ShowXlfHighlights", "showXlfHighlights"],
  ["NAB.XlfHighlightsDecoration", "xlfHighlightsDecoration"],
  ["NAB.UseExternalTranslationTool", "useExternalTranslationTool"],
  ["NAB.DetectInvalidTargets", "detectInvalidTargets"],
  ["NAB.UseDTS", "useDTS"],
  ["NAB.DTS ProjectId", "dtsProjectId"],
  ["NAB.Exact Match To State", "setDtsExactMatchToState"],
  ["NAB.ReplaceSelfClosingXlfTags", "replaceSelfClosingXlfTags"],
  ["NAB.SearchOnlyXlfFiles", "searchOnlyXlfFiles"],
  ["NAB.MatchTranslation", "matchTranslation"],
  ["NAB.MatchBaseAppTranslation", "matchBaseAppTranslation"],
  ["NAB.TranslationSuggestionPaths", "translationSuggestionPaths"],
  ["NAB.ConsoleLogOutput", "consoleLogOutput"],
  ["NAB.LoadSymbols", "loadSymbols"],
  [
    "NAB.TooltipDocsIgnorePageExtensionIds",
    "tooltipDocsIgnorePageExtensionIds",
  ],
  ["NAB.TooltipDocsIgnorePageIds", "tooltipDocsIgnorePageIds"],
  ["NAB.TooltipDocsFilePath", "tooltipDocsFilePath"],
  [
    "NAB.GenerateTooltipDocsWithExternalDocs",
    "generateTooltipDocsWithExternalDocs",
  ],
  [
    "NAB.GenerateDeprecatedFeaturesPageWithExternalDocs",
    "generateDeprecatedFeaturesPageWithExternalDocs",
  ],
  [
    "NAB.IgnoreTransUnitInGeneratedDocumentation",
    "ignoreTransUnitInGeneratedDocumentation",
  ],
  ["NAB.DocsRootPath", "docsRootPath"],
  ["NAB.RemoveObjectNamePrefixFromDocs", "removeObjectNamePrefixFromDocs"],
  ["NAB.DocsIgnorePaths", "docsIgnorePaths"],
  ["NAB.CreateTocFilesForDocs", "createTocFilesForDocs"],
  ["NAB.IncludeTablesAndFieldsInDocs", "includeTablesAndFieldsInDocs"],
  ["NAB.CreateInfoFileForDocs", "createInfoFileForDocs"],
  ["NAB.CreateUidForDocs", "createUidForDocs"],
  ["NAB.Xliff CSV Export Path", "xliffCSVExportPath"],
  ["NAB.CSV Import Target State", "xliffCSVImportTargetState"],
  [
    "NAB.RefreshXlfAfterFindNextUntranslated",
    "refreshXlfAfterFindNextUntranslated",
  ],
]);
