# How to Set Up Vertex AI Search for Commerce to Power Product Search on Your E-Commerce Site

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Search for Commerce, E-Commerce, Product Search, Retail AI, Google Cloud

Description: Set up Vertex AI Search for Commerce on Google Cloud to power intelligent product search with relevance tuning and personalization for your e-commerce site.

---

Product search is one of those features that seems simple on the surface but can make or break an e-commerce business. When a customer types "red running shoes size 10" and gets irrelevant results, they leave. Building a search engine that handles misspellings, understands synonyms, ranks by relevance, and personalizes results based on user behavior is a massive engineering effort. That is where Vertex AI Search for Commerce comes in. It is Google's retail-specific search service that brings Google-quality search to your product catalog without you having to build ranking algorithms from scratch.

In this guide, I will walk through setting up Vertex AI Search for Commerce, importing your product catalog, configuring search, and integrating it into your application.

## Prerequisites

Before starting, you need:

- A Google Cloud project with billing enabled
- Retail API enabled (this is the underlying API for Search for Commerce)
- A product catalog in JSON, CSV, or Google Merchant Center format
- A service account with the `retail.editor` role

## Step 1: Enable the Retail API

The Retail API powers Vertex AI Search for Commerce. Enable it and set up the initial configuration.

```bash
# Enable the Retail API
gcloud services enable retail.googleapis.com

# Also enable Vertex AI for the full search capabilities
gcloud services enable aiplatform.googleapis.com
```

## Step 2: Prepare Your Product Catalog

Your product catalog needs to follow the Retail API's product schema. Each product needs at minimum an ID, title, and categories.

This JSON shows the required structure for product data:

```json
{
  "id": "sku-12345",
  "primaryProductId": "sku-12345",
  "type": "PRIMARY",
  "categories": ["Shoes > Running Shoes > Men's"],
  "title": "CloudRunner Pro Running Shoes",
  "description": "Lightweight running shoes with responsive foam cushioning and breathable mesh upper.",
  "uri": "https://mystore.com/products/cloudrunner-pro",
  "images": [
    {
      "uri": "https://mystore.com/images/cloudrunner-pro.jpg",
      "height": 800,
      "width": 800
    }
  ],
  "priceInfo": {
    "currencyCode": "USD",
    "price": 129.99,
    "originalPrice": 149.99
  },
  "availability": "IN_STOCK",
  "availableQuantity": 156,
  "brands": ["CloudRunner"],
  "colorInfo": {
    "colorFamilies": ["Red"],
    "colors": ["Crimson Red"]
  },
  "sizes": ["8", "9", "10", "11", "12"],
  "attributes": {
    "material": {
      "text": ["mesh", "foam"]
    },
    "weight_oz": {
      "numbers": [9.5]
    }
  }
}
```

## Step 3: Import the Product Catalog

You can import products from Cloud Storage, BigQuery, or directly through the API. For bulk imports, Cloud Storage is the most efficient.

First, upload your product catalog to Cloud Storage and then trigger the import:

```python
from google.cloud import retail_v2

def import_products(project_id, catalog_id, branch_id, gcs_bucket, gcs_file):
    """Imports products from a Cloud Storage JSON file."""
    client = retail_v2.ProductServiceClient()

    # Build the parent path for the product branch
    parent = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/{catalog_id}/branches/{branch_id}"
    )

    # Configure the GCS import source
    gcs_source = retail_v2.GcsSource(
        input_uris=[f"gs://{gcs_bucket}/{gcs_file}"],
        data_schema="product",
    )

    input_config = retail_v2.ProductInlineSource()

    import_request = retail_v2.ImportProductsRequest(
        parent=parent,
        input_config=retail_v2.ProductInputConfig(
            gcs_source=gcs_source,
        ),
        reconciliation_mode=retail_v2.ImportProductsRequest.ReconciliationMode.INCREMENTAL,
    )

    # Execute the import operation
    operation = client.import_products(request=import_request)
    print("Import in progress...")
    result = operation.result(timeout=600)

    print(f"Import complete. Success: {result.success_count}, Failure: {result.failure_count}")
    return result

# Import products from GCS
import_products(
    "my-project",
    "default_catalog",
    "default_branch",
    "my-product-bucket",
    "products.json"
)
```

## Step 4: Configure Search Serving

After importing products, configure the search serving settings. This includes setting up search controls like redirects, synonyms, and boosting rules.

This Python script sets up search serving configuration with synonym and boost controls:

```python
from google.cloud import retail_v2

def create_search_controls(project_id, catalog_id):
    """Creates search controls for synonyms and boosting."""
    client = retail_v2.ControlServiceClient()

    parent = f"projects/{project_id}/locations/global/catalogs/{catalog_id}"

    # Create a synonym control so "sneakers" matches "running shoes"
    synonym_control = retail_v2.Control(
        display_name="Sneakers Synonym",
        solution_types=[retail_v2.SolutionType.SOLUTION_TYPE_SEARCH],
        rule=retail_v2.Rule(
            condition=retail_v2.Condition(
                query_terms=[
                    retail_v2.Condition.QueryTerm(value="sneakers")
                ]
            ),
            replacement_action=retail_v2.Rule.ReplacementAction(
                query_terms=["running shoes"]
            ),
        ),
    )

    result = client.create_control(
        parent=parent,
        control=synonym_control,
        control_id="sneakers-synonym",
    )
    print(f"Synonym control created: {result.name}")

    # Create a boost control for high-rated products
    boost_control = retail_v2.Control(
        display_name="Boost High Rated",
        solution_types=[retail_v2.SolutionType.SOLUTION_TYPE_SEARCH],
        rule=retail_v2.Rule(
            boost_action=retail_v2.Rule.BoostAction(
                boost=0.5,
                products_filter='attributes.rating: IN("4", "5")',
            ),
        ),
    )

    result = client.create_control(
        parent=parent,
        control=boost_control,
        control_id="boost-high-rated",
    )
    print(f"Boost control created: {result.name}")

create_search_controls("my-project", "default_catalog")
```

## Step 5: Implement Search in Your Application

Now integrate the search into your application. The Search API returns ranked results with snippets, facets, and attribution.

This function handles search requests with faceting and pagination:

```python
from google.cloud import retail_v2

def search_products(project_id, query, page_size=20, page_token=None, filters=None):
    """Searches the product catalog with faceting and filters."""
    client = retail_v2.SearchServiceClient()

    # Build the placement path - this identifies which serving config to use
    placement = (
        f"projects/{project_id}/locations/global"
        f"/catalogs/default_catalog/placements/default_search"
    )

    # Configure facet specifications for filtering in the UI
    facet_specs = [
        retail_v2.SearchRequest.FacetSpec(
            facet_key=retail_v2.SearchRequest.FacetSpec.FacetKey(
                key="brands"
            ),
            limit=10,
        ),
        retail_v2.SearchRequest.FacetSpec(
            facet_key=retail_v2.SearchRequest.FacetSpec.FacetKey(
                key="colorFamilies"
            ),
            limit=10,
        ),
        retail_v2.SearchRequest.FacetSpec(
            facet_key=retail_v2.SearchRequest.FacetSpec.FacetKey(
                key="price",
                intervals=[
                    retail_v2.Interval(minimum=0, maximum=50),
                    retail_v2.Interval(minimum=50, maximum=100),
                    retail_v2.Interval(minimum=100, maximum=200),
                    retail_v2.Interval(minimum=200, maximum=500),
                ],
            ),
        ),
    ]

    # Build the search request
    search_request = retail_v2.SearchRequest(
        placement=placement,
        query=query,
        page_size=page_size,
        page_token=page_token or "",
        filter=filters or "",
        facet_specs=facet_specs,
        boost_spec=retail_v2.SearchRequest.BoostSpec(
            condition_boost_specs=[
                retail_v2.SearchRequest.BoostSpec.ConditionBoostSpec(
                    condition='availability: ANY("IN_STOCK")',
                    boost=0.3,
                )
            ]
        ),
    )

    # Execute the search
    response = client.search(request=search_request)

    # Process results
    results = []
    for result in response.results:
        product = result.product
        results.append({
            "id": product.id,
            "title": product.title,
            "price": product.price_info.price if product.price_info else None,
            "image": product.images[0].uri if product.images else None,
            "brand": product.brands[0] if product.brands else None,
        })

    return {
        "results": results,
        "total_size": response.total_size,
        "facets": [{
            "key": f.key,
            "values": [{"value": v.value, "count": v.count} for v in f.values]
        } for f in response.facets],
        "next_page_token": response.next_page_token,
    }

# Example search
results = search_products("my-project", "red running shoes", page_size=10)
print(f"Found {results['total_size']} results")
for r in results["results"]:
    print(f"  {r['title']} - ${r['price']}")
```

## Step 6: Record User Events for Personalization

Search gets better with user interaction data. Recording events like searches, product views, and purchases helps the model personalize results.

This function records user events for improving search quality:

```python
from google.cloud import retail_v2
import time

def record_user_event(project_id, event_type, visitor_id, product_ids=None, search_query=None):
    """Records a user event for search personalization."""
    client = retail_v2.UserEventServiceClient()

    parent = f"projects/{project_id}/locations/global/catalogs/default_catalog"

    # Build the user event
    user_event = retail_v2.UserEvent(
        event_type=event_type,
        visitor_id=visitor_id,
        event_time={"seconds": int(time.time())},
    )

    # Add product details if this is a product interaction event
    if product_ids:
        user_event.product_details = [
            retail_v2.ProductDetail(
                product=retail_v2.Product(id=pid),
                quantity=1,
            )
            for pid in product_ids
        ]

    # Add search query if this is a search event
    if search_query:
        user_event.search_query = search_query

    response = client.write_user_event(
        parent=parent,
        user_event=user_event,
    )
    return response

# Record a search event
record_user_event("my-project", "search", "visitor-123", search_query="running shoes")

# Record a product view
record_user_event("my-project", "detail-page-view", "visitor-123", product_ids=["sku-12345"])

# Record a purchase
record_user_event("my-project", "purchase-complete", "visitor-123", product_ids=["sku-12345"])
```

## Summary

Vertex AI Search for Commerce takes the pain out of building product search. The catalog import handles structured product data, search controls let you fine-tune relevance with synonyms and boosting rules, and user event recording enables personalization over time. The key to getting good results is feeding it complete product data (titles, descriptions, categories, attributes) and recording user interactions. Start with the basic search integration, then iteratively improve by adding controls and tuning based on what your users are actually searching for.
