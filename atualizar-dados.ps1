param([int]$BatchSize = 50, [switch]$NoPause)
$ErrorActionPreference = 'Stop'
$api = 'https://pixarcars.fandom.com/api.php'
$sourceCategories = @(
  'Cars characters','Cars 2 characters','Cars 3 characters','Cars on the Road characters',
  'Cars Toons characters','Planes characters','Planes: Fire & Rescue characters',
  'Game-only characters','Book-only characters','Comic characters','Playable characters',
  'Racers','Tuners','Heroes','Villains','Race Fans','Forklifts and pitties',
  'Tow trucks','Haulers','Planes','Trucks','Next-Gen'
)

function Invoke-Wiki([hashtable]$Params) {
  $Params.format = 'json'; $Params.origin = '*'; $Params.formatversion = 2
  $query = ($Params.GetEnumerator() | ForEach-Object { '{0}={1}' -f [uri]::EscapeDataString($_.Key), [uri]::EscapeDataString([string]$_.Value) }) -join '&'
  Invoke-RestMethod -Uri "$api`?$query" -Headers @{ 'User-Agent'='CarsCharacterVault/1.0 (local personal catalog)' } -TimeoutSec 60
}

$membership = @{}
foreach($category in $sourceCategories) {
  Write-Host "Lendo categoria: $category"
  $continue = $null
  do {
    $p = @{ action='query'; list='categorymembers'; cmtitle="Category:$category"; cmtype='page'; cmlimit='max' }
    if($continue){$p.cmcontinue=$continue}
    $r = Invoke-Wiki $p
    foreach($m in $r.query.categorymembers) {
      if(-not $membership.ContainsKey([string]$m.pageid)){$membership[[string]$m.pageid]=[ordered]@{pageid=$m.pageid;title=$m.title;source=@()}}
      $membership[[string]$m.pageid].source += $category
    }
    $continue = $r.continue.cmcontinue
  } while($continue)
}

$ids = @($membership.Keys)
$characters = [System.Collections.Generic.List[object]]::new()
for($i=0;$i -lt $ids.Count;$i+=$BatchSize){
  $end=[Math]::Min($i+$BatchSize-1,$ids.Count-1);$chunk=$ids[$i..$end]
  Write-Host "Detalhes $($i+1)-$($end+1) de $($ids.Count)"
  $r=Invoke-Wiki @{action='query';pageids=($chunk -join '|');prop='extracts|pageimages|categories|info';exintro=1;explaintext=1;exsentences=4;piprop='thumbnail|original';pithumbsize=600;cllimit='max';inprop='url'}
  foreach($p in $r.query.pages){
    $cats=@($p.categories | ForEach-Object {$_.title -replace '^Category:',''})
    $source=@($membership[[string]$p.pageid].source)
    $useful=@($source + ($cats | Where-Object {$_ -match 'characters|Racers|Tuners|Heroes|Villains|Fans|Forklifts|Tow trucks|Haulers|Planes|Trucks|Next-Gen'})) | Select-Object -Unique
    $characters.Add([ordered]@{
      pageid=$p.pageid;title=$p.title;extract=$p.extract;thumbnail=$p.thumbnail.source;image=$p.original.source
      url=if($p.fullurl){$p.fullurl}else{"https://pixarcars.fandom.com/wiki/$([uri]::EscapeDataString($p.title.Replace(' ','_')))"}
      categories=@($useful);featured=($p.title -in @('Lightning McQueen','Mater','Sally Carrera','Doc Hudson','Cruz Ramirez','Jackson Storm','Chick Hicks','Mack','Luigi','Ramone'))
    })
  }
  Start-Sleep -Milliseconds 120
}

$out=[ordered]@{source='https://pixarcars.fandom.com/';license='CC BY-SA (text; images may differ)';updatedAt=(Get-Date).ToUniversalTime().ToString('o');categories=$sourceCategories;characters=@($characters | Sort-Object title)}
$out | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'characters.json') -Encoding UTF8
$json = $out | ConvertTo-Json -Depth 8 -Compress
"window.CARS_DATA=$json;" | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'data.js') -Encoding UTF8
$settings = [System.Xml.XmlWriterSettings]::new(); $settings.Indent = $true; $settings.Encoding = [System.Text.UTF8Encoding]::new($false)
$writer = [System.Xml.XmlWriter]::Create((Join-Path $PSScriptRoot 'sitemap.xml'), $settings)
$writer.WriteStartDocument(); $writer.WriteStartElement('urlset','http://www.sitemaps.org/schemas/sitemap/0.9')
foreach($c in ($characters | Sort-Object title)) {
  $writer.WriteStartElement('url'); $writer.WriteElementString('loc', $c.url); $writer.WriteElementString('lastmod', (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')); $writer.WriteEndElement()
}
$writer.WriteEndElement(); $writer.WriteEndDocument(); $writer.Close()
Write-Host "Concluído: $($characters.Count) personagens em characters.json, data.js e sitemap.xml" -ForegroundColor Green
if(-not $NoPause){Read-Host 'Pressione Enter para fechar'}
