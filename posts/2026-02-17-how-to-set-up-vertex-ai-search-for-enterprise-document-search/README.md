# How to Set Up Vertex AI Search for Enterprise Document Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI Search, Enterprise Search, Document Search, AI

Description: A complete walkthrough for setting up Vertex AI Search to build enterprise-grade document search across PDFs, web pages, and structured data on Google Cloud.

---

Enterprise document search has always been a hard problem. Employees need to find information scattered across PDFs, wikis, support tickets, and internal tools. Traditional keyword search misses context and requires users to guess the right terms. Vertex AI Search changes this by combining Google-quality search with the ability to understand natural language queries and generate AI-powered answers from your own data.

This guide walks through the full setup process for Vertex AI Search, from creating a data store to running your first queries with answer generation.

## What Vertex AI Search Provides

Vertex AI Search (formerly Enterprise Search) gives you:

- **Semantic understanding** - Queries are understood by meaning, not just keywords
- **Multiple data source types** - Index documents from Cloud Storage, BigQuery, websites, or custom APIs
- **Extractive answers** - Pulls exact answer passages from your documents
- **Generative answers** - Synthesizes answers from multiple documents with citations
- **Out-of-the-box search UI** - A pre-built search widget you can embed
- **Search API** - Full programmatic access for custom applications

## Prerequisites

- Google Cloud project with billing enabled
- Vertex AI Search API enabled (previously Discovery Engine API)
- Documents to index (PDFs, HTML, or structured data)

```bash
# Enable the required APIs
gcloud services enable discoveryengine.googleapis.com --project=your-project-id
gcloud services enable aiplatform.googleapis.com --project=your-project-id
```

## Step 1: Create a Data Store

A data store is where your indexed content lives. You choose the type based on your data source.

### Unstructured Documents Data Store

For PDFs, Word docs, and HTML files stored in Cloud Storage:

```python
from google.cloud import discoveryengine_v1 as discoveryengine

def create_unstructured_data_store(project_id: str, location: str, data_store_id: str):
    """Create a data store for unstructured documents like PDFs and HTML files."""
    client = discoveryengine.DataStoreServiceClient()

    data_store = discoveryengine.DataStore(
        display_name="Enterprise Documents",
        industry_vertical=discoveryengine.IndustryVertical.GENERIC,
        content_config=discoveryengine.DataStore.ContentConfig.CONTENT_REQUIRED,
        solution_types=[discoveryengine.SolutionType.SOLUTION_TYPE_SEARCH],
    )

    parent = f"projects/{project_id}/locations/{location}/collections/default_collection"

    operation = client.create_data_store(
        parent=parent,
        data_store=data_store,
        data_store_id=data_store_id,
    )

    result = operation.result(timeout=300)
    print(f"Data store created: {result.name}")
    return result

# Create the data store
create_unstructured_data_store(
    project_id="your-project-id",
    location="global",
    data_store_id="enterprise-docs",
)
```

## Step 2: Import Documents

### Importing from Cloud Storage

Upload your documents to a GCS bucket, then trigger an import.

```python
def import_documents_from_gcs(
    project_id: str,
    location: str,
    data_store_id: str,
    gcs_uri: str,
):
    """Import documents from a Cloud Storage bucket into the data store."""
    client = discoveryengine.DocumentServiceClient()

    parent = (
        f"projects/{project_id}/locations/{location}"
        f"/collections/default_collection/dataStores/{data_store_id}"
        f"/branches/default_branch"
    )

    # Configure the GCS source
    gcs_source = discoveryengine.GcsSource(
        input_uris=[gcs_uri],  # e.g., "gs://your-bucket/documents/*.pdf"
        data_schema="content",  # Use "content" for unstructured documents
    )

    import_config = discoveryengine.ImportDocumentsRequest(
        parent=parent,
        gcs_source=gcs_source,
        reconciliation_mode=discoveryengine.ImportDocumentsRequest.ReconciliationMode.INCREMENTAL,
    )

    operation = client.import_documents(request=import_config)
    print("Import started. This may take several minutes...")

    result = operation.result(timeout=600)
    print(f"Import completed. Errors: {result.error_samples}")
    return result

# Import PDF documents from GCS
import_documents_from_gcs(
    project_id="your-project-id",
    location="global",
    data_store_id="enterprise-docs",
    gcs_uri="gs://your-document-bucket/knowledge-base/*.pdf",
)
```

## Step 3: Create a Search Engine

The search engine sits on top of the data store and provides the search interface.

```python
def create_search_engine(
    project_id: str,
    location: str,
    engine_id: str,
    data_store_id: str,
):
    """Create a search engine linked to a data store."""
    client = discoveryengine.EngineServiceClient()

    engine = discoveryengine.Engine(
        display_name="Enterprise Search Engine",
        solution_type=discoveryengine.SolutionType.SOLUTION_TYPE_SEARCH,
        search_engine_config=discoveryengine.Engine.SearchEngineConfig(
            search_tier=discoveryengine.SearchTier.SEARCH_TIER_ENTERPRISE,
            search_add_ons=[discoveryengine.SearchAddOn.SEARCH_ADD_ON_LLM],
        ),
        data_store_ids=[data_store_id],
    )

    parent = f"projects/{project_id}/locations/{location}/collections/default_collection"

    operation = client.create_engine(
        parent=parent,
        engine=engine,
        engine_id=engine_id,
    )

    result = operation.result(timeout=300)
    print(f"Search engine created: {result.name}")
    return result

create_search_engine(
    project_id="your-project-id",
    location="global",
    engine_id="enterprise-search",
    data_store_id="enterprise-docs",
)
```

## Step 4: Run Search Queries

### Basic Search

```python
def search_documents(
    project_id: str,
    location: str,
    engine_id: str,
    query: str,
    page_size: int = 10,
):
    """Run a search query against the enterprise search engine."""
    client = discoveryengine.SearchServiceClient()

    serving_config = (
        f"projects/{project_id}/locations/{location}"
        f"/collections/default_collection/engines/{engine_id}"
        f"/servingConfigs/default_search"
    )

    request = discoveryengine.SearchRequest(
        serving_config=serving_config,
        query=query,
        page_size=page_size,
    )

    response = client.search(request)

    print(f"Total results: {response.total_size}")
    for result in response.results:
        doc = result.document
        doc_data = doc.derived_struct_data
        title = doc_data.get("title", "Untitled")
        link = doc_data.get("link", "No link")
        print(f"\n  Title: {title}")
        print(f"  Link: {link}")

    return response

# Search for documents
results = search_documents(
    project_id="your-project-id",
    location="global",
    engine_id="enterprise-search",
    query="How to configure VPN access for remote employees",
)
```

### Search with Snippets and Summaries

```python
def search_with_answers(
    project_id: str,
    location: str,
    engine_id: str,
    query: str,
):
    """Search with extractive answers and AI-generated summary."""
    client = discoveryengine.SearchServiceClient()

    serving_config = (
        f"projects/{project_id}/locations/{location}"
        f"/collections/default_collection/engines/{engine_id}"
        f"/servingConfigs/default_search"
    )

    request = discoveryengine.SearchRequest(
        serving_config=serving_config,
        query=query,
        page_size=5,
        content_search_spec=discoveryengine.SearchRequest.ContentSearchSpec(
            # Extract relevant snippets from documents
            snippet_spec=discoveryengine.SearchRequest.ContentSearchSpec.SnippetSpec(
                return_snippet=True,
                max_snippet_count=3,
            ),
            # Extract exact answer passages
            extractive_content_spec=discoveryengine.SearchRequest.ContentSearchSpec.ExtractiveContentSpec(
                max_extractive_answer_count=3,
                max_extractive_segment_count=3,
            ),
            # Generate an AI summary from the results
            summary_spec=discoveryengine.SearchRequest.ContentSearchSpec.SummarySpec(
                summary_result_count=5,
                include_citations=True,
                model_spec=discoveryengine.SearchRequest.ContentSearchSpec.SummarySpec.ModelSpec(
                    version="gemini-1.5-flash-001/answer_gen/v1",
                ),
            ),
        ),
    )

    response = client.search(request)

    # Print the AI-generated summary
    if response.summary and response.summary.summary_text:
        print("AI Summary:")
        print(response.summary.summary_text)
        print()

    # Print extractive answers
    for result in response.results:
        doc_data = result.document.derived_struct_data
        title = doc_data.get("title", "Untitled")
        answers = doc_data.get("extractive_answers", [])

        if answers:
            print(f"From: {title}")
            for answer in answers:
                print(f"  Answer: {answer.get('content', 'N/A')}")

    return response

# Search with AI answers
search_with_answers(
    project_id="your-project-id",
    location="global",
    engine_id="enterprise-search",
    query="What is the process for requesting time off?",
)
```

## Step 5: Set Up the Search Widget

Vertex AI Search provides a pre-built search widget you can embed in any web page.

```html
<!-- Embed this in your intranet or internal portal -->
<script src="https://cloud.google.com/ai/gen-app-builder/client?hl=en_US"></script>

<gen-search-widget
  configId="your-config-id"
  triggerId="searchWidgetTrigger">
</gen-search-widget>

<input placeholder="Search our knowledge base..." id="searchWidgetTrigger" />
```

## Ongoing Maintenance

### Scheduling Regular Imports

Set up a Cloud Scheduler job to re-import documents periodically.

```bash
# Create a scheduled import using Cloud Scheduler + Cloud Functions
gcloud scheduler jobs create http document-reimport \
    --schedule="0 2 * * *" \
    --uri="https://your-region-your-project.cloudfunctions.net/reimport-docs" \
    --http-method=POST \
    --time-zone="America/New_York" \
    --project=your-project-id
```

### Monitoring Search Quality

Track search metrics to understand how well your search engine performs.

```python
def get_search_metrics(project_id: str, engine_id: str):
    """Retrieve search quality metrics from the API."""
    # Use the Cloud Console for built-in analytics, or track custom metrics
    # by logging search queries and user interactions
    print("Check the Vertex AI Search console for:")
    print("  - Search query volume")
    print("  - Click-through rates")
    print("  - No-result queries")
    print("  - Most common queries")
```

## Summary

Vertex AI Search gives you a production-ready enterprise search engine without building the ranking, indexing, and NLP infrastructure yourself. The setup process involves creating a data store, importing your documents, creating a search engine, and then querying it through the API or the embedded widget. The AI-generated summaries and extractive answers make it particularly effective for knowledge base and documentation search. Start with a focused document set, test the search quality with real queries from your team, and expand the content as confidence grows.
