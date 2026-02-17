# How to Build a SharePoint Search Solution Powered by Azure Cognitive Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SharePoint, Azure Cognitive Search, Search, SPFx, Microsoft Graph, Indexing, AI

Description: Build a custom SharePoint search experience powered by Azure Cognitive Search with AI enrichment for better relevance and faceted navigation.

---

SharePoint's built-in search works reasonably well for basic document discovery, but it falls short when you need advanced features like custom relevance tuning, faceted navigation, AI-powered enrichment, or the ability to search across SharePoint and non-SharePoint content in a unified experience. Azure Cognitive Search fills these gaps.

In this guide, I will build a custom search solution that indexes SharePoint content into Azure Cognitive Search, enriches it with AI skills, and surfaces it through a SharePoint Framework (SPFx) web part with faceted filtering and highlighted search results.

## Architecture

```mermaid
graph TD
    A[SharePoint Document Libraries] --> B[Azure Function - Indexer]
    B --> C[Microsoft Graph API]
    C --> B
    B --> D[Azure Cognitive Search]
    D --> E[AI Enrichment Pipeline]
    E --> F[Search Index]
    G[SPFx Search Web Part] --> F
    F --> G
```

An Azure Function periodically crawls SharePoint using Microsoft Graph, extracts documents and metadata, and pushes them into Azure Cognitive Search. The search index includes an AI enrichment pipeline that extracts key phrases, entities, and content from documents. The SPFx web part queries the search index and displays results.

## Setting Up Azure Cognitive Search

Create the search service and define the index:

```bash
# Create the search service
az search service create \
  --name search-sharepoint \
  --resource-group rg-sp-search \
  --sku standard \
  --location eastus
```

Define the search index schema:

```json
{
    "name": "sharepoint-content",
    "fields": [
        { "name": "id", "type": "Edm.String", "key": true, "filterable": true },
        { "name": "title", "type": "Edm.String", "searchable": true, "filterable": true, "sortable": true },
        { "name": "content", "type": "Edm.String", "searchable": true },
        { "name": "description", "type": "Edm.String", "searchable": true },
        { "name": "author", "type": "Edm.String", "searchable": true, "filterable": true, "facetable": true },
        { "name": "created", "type": "Edm.DateTimeOffset", "filterable": true, "sortable": true },
        { "name": "modified", "type": "Edm.DateTimeOffset", "filterable": true, "sortable": true },
        { "name": "fileType", "type": "Edm.String", "filterable": true, "facetable": true },
        { "name": "siteName", "type": "Edm.String", "filterable": true, "facetable": true },
        { "name": "libraryName", "type": "Edm.String", "filterable": true, "facetable": true },
        { "name": "url", "type": "Edm.String" },
        { "name": "fileSize", "type": "Edm.Int64", "filterable": true, "sortable": true },
        { "name": "keyPhrases", "type": "Collection(Edm.String)", "searchable": true, "filterable": true, "facetable": true },
        { "name": "entities", "type": "Collection(Edm.String)", "searchable": true, "filterable": true },
        { "name": "language", "type": "Edm.String", "filterable": true, "facetable": true },
        { "name": "sentiment", "type": "Edm.Double", "filterable": true }
    ],
    "suggesters": [
        {
            "name": "sg",
            "searchMode": "analyzingInfixMatching",
            "sourceFields": ["title", "author"]
        }
    ],
    "scoringProfiles": [
        {
            "name": "recency-boost",
            "functions": [
                {
                    "type": "freshness",
                    "fieldName": "modified",
                    "boost": 5,
                    "parameters": {
                        "boostingDuration": "P30D"
                    }
                }
            ]
        }
    ]
}
```

The scoring profile boosts recently modified documents, which is usually what users want - fresh content surfaced first.

## Building the SharePoint Indexer

The indexer uses Microsoft Graph to crawl SharePoint sites and push documents into the search index:

```csharp
// Azure Function that indexes SharePoint content into Azure Cognitive Search
public class SharePointIndexer
{
    private readonly GraphServiceClient _graphClient;
    private readonly SearchIndexClient _searchClient;
    private readonly SearchClient _indexClient;
    private readonly ILogger<SharePointIndexer> _logger;

    public SharePointIndexer(
        GraphServiceClient graphClient,
        SearchIndexClient searchClient,
        ILogger<SharePointIndexer> logger)
    {
        _graphClient = graphClient;
        _searchClient = searchClient;
        _indexClient = searchClient.GetSearchClient("sharepoint-content");
        _logger = logger;
    }

    [Function("IndexSharePointContent")]
    public async Task Run(
        [TimerTrigger("0 0 */4 * * *")] TimerInfo timer, // Every 4 hours
        ILogger log)
    {
        log.LogInformation("Starting SharePoint content indexing");

        // Get all sites to index
        var sites = await GetSitesToIndexAsync();
        var totalIndexed = 0;

        foreach (var site in sites)
        {
            try
            {
                var documents = await CrawlSiteAsync(site);
                if (documents.Count > 0)
                {
                    await IndexDocumentsAsync(documents);
                    totalIndexed += documents.Count;
                }
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Failed to index site: {SiteName}", site.DisplayName);
            }
        }

        log.LogInformation("Indexing complete: {Count} documents indexed", totalIndexed);
    }

    private async Task<List<Site>> GetSitesToIndexAsync()
    {
        var sites = new List<Site>();
        var result = await _graphClient.Sites.GetAsync(config =>
        {
            config.QueryParameters.Search = "*";
        });

        sites.AddRange(result.Value);
        return sites;
    }

    private async Task<List<SearchDocument>> CrawlSiteAsync(Site site)
    {
        var documents = new List<SearchDocument>();

        // Get all document libraries in the site
        var lists = await _graphClient.Sites[site.Id].Lists.GetAsync(config =>
        {
            config.QueryParameters.Filter = "list/template eq 'documentLibrary'";
        });

        foreach (var list in lists.Value)
        {
            // Get items modified in the last indexing window (4 hours + buffer)
            var cutoff = DateTime.UtcNow.AddHours(-5).ToString("o");
            var items = await _graphClient.Sites[site.Id].Lists[list.Id]
                .Items.GetAsync(config =>
                {
                    config.QueryParameters.Filter = $"lastModifiedDateTime gt {cutoff}";
                    config.QueryParameters.Expand = new[] { "driveItem", "fields" };
                });

            if (items?.Value == null) continue;

            foreach (var item in items.Value)
            {
                if (item.DriveItem == null) continue;

                var doc = new SearchDocument
                {
                    ["id"] = $"{site.Id}_{list.Id}_{item.Id}",
                    ["title"] = item.DriveItem.Name,
                    ["author"] = item.CreatedBy?.User?.DisplayName ?? "Unknown",
                    ["created"] = item.CreatedDateTime,
                    ["modified"] = item.LastModifiedDateTime,
                    ["fileType"] = GetFileExtension(item.DriveItem.Name),
                    ["siteName"] = site.DisplayName,
                    ["libraryName"] = list.DisplayName,
                    ["url"] = item.DriveItem.WebUrl,
                    ["fileSize"] = item.DriveItem.Size ?? 0
                };

                // Try to get the file content for text extraction
                var content = await ExtractContentAsync(site.Id, item.DriveItem.Id);
                if (content != null)
                {
                    doc["content"] = content;
                }

                documents.Add(doc);
            }
        }

        return documents;
    }

    private async Task<string> ExtractContentAsync(string siteId, string driveItemId)
    {
        try
        {
            // Use Graph to get the content stream
            var stream = await _graphClient.Sites[siteId]
                .Drive.Items[driveItemId].Content.GetAsync();

            if (stream == null) return null;

            // Read up to 1MB of content for indexing
            using var reader = new StreamReader(stream);
            var buffer = new char[1024 * 1024];
            var charsRead = await reader.ReadAsync(buffer, 0, buffer.Length);
            return new string(buffer, 0, charsRead);
        }
        catch
        {
            // Content extraction failed - skip this document's content
            return null;
        }
    }

    private async Task IndexDocumentsAsync(List<SearchDocument> documents)
    {
        // Batch upload to Azure Cognitive Search
        var batch = IndexDocumentsBatch.Upload(documents);

        try
        {
            var result = await _indexClient.IndexDocumentsAsync(batch);
            _logger.LogInformation("Indexed {Count} documents", documents.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to index document batch");
            throw;
        }
    }

    private string GetFileExtension(string fileName)
    {
        var ext = Path.GetExtension(fileName)?.TrimStart('.').ToLower();
        return ext ?? "unknown";
    }
}
```

## AI Enrichment with Skillsets

Set up a cognitive skillset that enriches the indexed content:

```json
{
    "name": "sharepoint-enrichment",
    "description": "AI enrichment for SharePoint documents",
    "skills": [
        {
            "@odata.type": "#Microsoft.Skills.Text.KeyPhraseExtractionSkill",
            "name": "extract-key-phrases",
            "context": "/document",
            "inputs": [
                { "name": "text", "source": "/document/content" }
            ],
            "outputs": [
                { "name": "keyPhrases", "targetName": "keyPhrases" }
            ]
        },
        {
            "@odata.type": "#Microsoft.Skills.Text.EntityRecognitionSkill",
            "name": "extract-entities",
            "context": "/document",
            "categories": ["Organization", "Person", "Location", "Product"],
            "inputs": [
                { "name": "text", "source": "/document/content" }
            ],
            "outputs": [
                { "name": "entities", "targetName": "entities" }
            ]
        },
        {
            "@odata.type": "#Microsoft.Skills.Text.LanguageDetectionSkill",
            "name": "detect-language",
            "context": "/document",
            "inputs": [
                { "name": "text", "source": "/document/content" }
            ],
            "outputs": [
                { "name": "languageCode", "targetName": "language" }
            ]
        }
    ]
}
```

## Building the SPFx Search Web Part

Create an SPFx web part that provides a rich search experience with facets and highlights:

```typescript
// src/components/SearchWebPart.tsx - SPFx search component
import * as React from 'react';
import { useState, useCallback } from 'react';
import { SearchBox, DetailsList, IColumn, Checkbox, Spinner } from '@fluentui/react';
import { AadHttpClient } from '@microsoft/sp-http';

interface SearchResult {
    id: string;
    title: string;
    author: string;
    modified: string;
    fileType: string;
    siteName: string;
    url: string;
    highlights: { content?: string[]; title?: string[] };
    keyPhrases: string[];
}

interface FacetValue {
    value: string;
    count: number;
}

interface SearchState {
    results: SearchResult[];
    facets: {
        fileType: FacetValue[];
        siteName: FacetValue[];
        author: FacetValue[];
    };
    totalCount: number;
    loading: boolean;
}

const SearchWebPart: React.FC<{ searchEndpoint: string; apiKey: string }> = ({
    searchEndpoint, apiKey
}) => {
    const [query, setQuery] = useState('');
    const [state, setState] = useState<SearchState>({
        results: [],
        facets: { fileType: [], siteName: [], author: [] },
        totalCount: 0,
        loading: false
    });
    const [filters, setFilters] = useState<Record<string, string[]>>({});

    const executeSearch = useCallback(async (searchText: string, activeFilters: Record<string, string[]>) => {
        if (!searchText.trim()) return;

        setState(prev => ({ ...prev, loading: true }));

        // Build the filter expression from active facet selections
        const filterParts: string[] = [];
        for (const [field, values] of Object.entries(activeFilters)) {
            if (values.length > 0) {
                const conditions = values.map(v => `${field} eq '${v}'`).join(' or ');
                filterParts.push(`(${conditions})`);
            }
        }

        const searchBody = {
            search: searchText,
            filter: filterParts.length > 0 ? filterParts.join(' and ') : undefined,
            facets: ['fileType,count:10', 'siteName,count:10', 'author,count:10'],
            highlight: 'content,title',
            highlightPreTag: '<mark>',
            highlightPostTag: '</mark>',
            top: 25,
            count: true,
            scoringProfile: 'recency-boost',
            select: 'id,title,author,modified,fileType,siteName,url,keyPhrases'
        };

        try {
            const response = await fetch(
                `${searchEndpoint}/indexes/sharepoint-content/docs/search?api-version=2023-11-01`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': apiKey
                    },
                    body: JSON.stringify(searchBody)
                }
            );

            const data = await response.json();

            setState({
                results: data.value.map((r: any) => ({
                    ...r,
                    highlights: r['@search.highlights'] || {}
                })),
                facets: {
                    fileType: data['@search.facets']?.fileType || [],
                    siteName: data['@search.facets']?.siteName || [],
                    author: data['@search.facets']?.author || []
                },
                totalCount: data['@odata.count'] || 0,
                loading: false
            });
        } catch (error) {
            console.error('Search failed:', error);
            setState(prev => ({ ...prev, loading: false }));
        }
    }, [searchEndpoint, apiKey]);

    const handleSearch = (searchText: string) => {
        setQuery(searchText);
        executeSearch(searchText, filters);
    };

    const toggleFilter = (field: string, value: string) => {
        const newFilters = { ...filters };
        if (!newFilters[field]) newFilters[field] = [];

        const index = newFilters[field].indexOf(value);
        if (index === -1) {
            newFilters[field].push(value);
        } else {
            newFilters[field].splice(index, 1);
        }

        setFilters(newFilters);
        executeSearch(query, newFilters);
    };

    return (
        <div style={{ display: 'flex', gap: '24px', padding: '20px' }}>
            <div style={{ flex: 1 }}>
                <SearchBox
                    placeholder="Search SharePoint content..."
                    onSearch={handleSearch}
                    styles={{ root: { marginBottom: '16px' } }}
                />

                {state.loading && <Spinner label="Searching..." />}

                {!state.loading && state.results.length > 0 && (
                    <div>
                        <p>{state.totalCount} results found</p>
                        {state.results.map(result => (
                            <div key={result.id} style={{
                                padding: '12px', marginBottom: '8px',
                                border: '1px solid #eee', borderRadius: '4px'
                            }}>
                                <a href={result.url} target="_blank" rel="noopener noreferrer">
                                    <strong dangerouslySetInnerHTML={{
                                        __html: result.highlights?.title?.[0] || result.title
                                    }} />
                                </a>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                    {result.siteName} | {result.author} | {result.fileType} |
                                    {new Date(result.modified).toLocaleDateString()}
                                </div>
                                {result.highlights?.content && (
                                    <div style={{ marginTop: '4px', fontSize: '14px' }}
                                         dangerouslySetInnerHTML={{ __html: result.highlights.content[0] }} />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ width: '250px' }}>
                <h3>Filters</h3>
                <FacetPanel title="File Type" facets={state.facets.fileType}
                    field="fileType" selected={filters.fileType || []}
                    onToggle={toggleFilter} />
                <FacetPanel title="Site" facets={state.facets.siteName}
                    field="siteName" selected={filters.siteName || []}
                    onToggle={toggleFilter} />
                <FacetPanel title="Author" facets={state.facets.author}
                    field="author" selected={filters.author || []}
                    onToggle={toggleFilter} />
            </div>
        </div>
    );
};

// Reusable facet panel component
const FacetPanel: React.FC<{
    title: string; facets: FacetValue[];
    field: string; selected: string[];
    onToggle: (field: string, value: string) => void;
}> = ({ title, facets, field, selected, onToggle }) => (
    <div style={{ marginBottom: '16px' }}>
        <h4>{title}</h4>
        {facets.map(f => (
            <div key={f.value} style={{ marginBottom: '4px' }}>
                <Checkbox
                    label={`${f.value} (${f.count})`}
                    checked={selected.includes(f.value)}
                    onChange={() => onToggle(field, f.value)}
                />
            </div>
        ))}
    </div>
);

export default SearchWebPart;
```

## Wrapping Up

Building a custom SharePoint search solution with Azure Cognitive Search gives you capabilities that go far beyond what SharePoint's built-in search offers. AI enrichment automatically extracts key phrases and entities from your documents. Faceted navigation lets users drill down by file type, author, or site. Custom scoring profiles boost recent content to the top. And because the search index is in Azure Cognitive Search, you can include non-SharePoint content in the same search experience, giving users a single place to find everything they need.
