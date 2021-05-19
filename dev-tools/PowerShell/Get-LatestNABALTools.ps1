param (
    [Parameter(Mandatory = $true)]
    [string]
    $DestinationPath
)

$listing = Invoke-WebRequest -Method POST -UseBasicParsing `
    -Uri https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=3.0-preview.1 `
    -Body '{"filters":[{"criteria":[{"filterType":8,"value":"Microsoft.VisualStudio.Code"},{"filterType":12,"value":"4096"},{"filterType":7,"value":"nabsolutions.nab-al-tools"}],"pageNumber":1,"pageSize":50,"sortBy":0,"sortOrder":0}],"assetTypes":[],"flags":914}' `
    -ContentType application/json | ConvertFrom-Json 
     
$vsixUrl = $listing.results | Select-Object -First 1 -ExpandProperty extensions `
| Select-Object -First 1 -ExpandProperty versions `
| Select-Object -First 1 -ExpandProperty files `
| Where-Object { $_.assetType -eq "Microsoft.VisualStudio.Services.VSIXPackage" } `
| Select-Object -ExpandProperty source

if (!$vsixUrl) {
    throw "Unable to locate latest NAB AL Tools Extension from the VS Code Marketplace"
}
Write-Host "Downloadning v$($listing.results.extensions.versions.version) from '$vsixUrl'"

$tmpFilePath = [System.IO.Path]::GetTempFileName() + '.zip'
$response = Invoke-WebRequest -Uri $VsixUrl -Method Get -UseBasicParsing
if ($response.StatusCode -ne 200) {
    throw "Failure to download '$Url'"
}
else {
    Set-Content -Path $tmpFilePath -Value $response.Content -Encoding Byte
}

Expand-Archive -Path $tmpFilePath -DestinationPath $DestinationPath
