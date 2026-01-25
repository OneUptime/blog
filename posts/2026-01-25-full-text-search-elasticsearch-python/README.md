# How to Build Full-Text Search with Elasticsearch in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Elasticsearch, Full-Text Search, Search Engine, FastAPI, Data Indexing

Description: Learn how to implement full-text search in Python applications using Elasticsearch. This guide covers index setup, document mapping, search queries, and building a search API with FastAPI.

---

> Full-text search goes beyond simple string matching. Elasticsearch analyzes text, handles typos, ranks results by relevance, and scales to billions of documents. This guide shows you how to integrate Elasticsearch into Python applications for powerful search capabilities.

Whether you're building a product catalog, documentation search, or log analysis tool, Elasticsearch provides the foundation. Python's `elasticsearch` library makes integration straightforward, and this guide will take you from basic indexing to production-ready search features.

---

## Setting Up Elasticsearch

First, install the Elasticsearch Python client:

```bash
pip install elasticsearch==8.11.0
```

### Connecting to Elasticsearch

```python
# elasticsearch_client.py
# Elasticsearch connection setup
from elasticsearch import Elasticsearch
from typing import Optional
import os

def get_elasticsearch_client() -> Elasticsearch:
    """
    Create and return an Elasticsearch client.
    Supports both local development and cloud deployments.
    """
    # For local development
    es_host = os.getenv("ELASTICSEARCH_HOST", "http://localhost:9200")

    # For Elastic Cloud (production)
    cloud_id = os.getenv("ELASTIC_CLOUD_ID")
    api_key = os.getenv("ELASTIC_API_KEY")

    if cloud_id and api_key:
        # Connect to Elastic Cloud with API key authentication
        return Elasticsearch(
            cloud_id=cloud_id,
            api_key=api_key,
            request_timeout=30
        )
    else:
        # Connect to local Elasticsearch instance
        return Elasticsearch(
            hosts=[es_host],
            request_timeout=30
        )

# Create a singleton client for the application
es_client = get_elasticsearch_client()
```

---

## Creating an Index with Mappings

Mappings define how Elasticsearch analyzes and stores your data. Getting mappings right is critical for search quality.

```python
# index_setup.py
# Index creation with proper mappings for full-text search

INDEX_NAME = "products"

# Define the index mapping
PRODUCT_MAPPING = {
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 1,
        "analysis": {
            "analyzer": {
                # Custom analyzer for product names
                "product_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": [
                        "lowercase",
                        "asciifolding",  # Handle accents
                        "product_synonyms"
                    ]
                },
                # Analyzer that preserves original text for autocomplete
                "autocomplete_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": [
                        "lowercase",
                        "edge_ngram_filter"
                    ]
                }
            },
            "filter": {
                # Edge n-grams for autocomplete suggestions
                "edge_ngram_filter": {
                    "type": "edge_ngram",
                    "min_gram": 2,
                    "max_gram": 15
                },
                # Synonyms for common product terms
                "product_synonyms": {
                    "type": "synonym",
                    "synonyms": [
                        "laptop, notebook",
                        "phone, mobile, cell",
                        "tv, television"
                    ]
                }
            }
        }
    },
    "mappings": {
        "properties": {
            "name": {
                "type": "text",
                "analyzer": "product_analyzer",
                "fields": {
                    # Sub-field for exact matching
                    "keyword": {"type": "keyword"},
                    # Sub-field for autocomplete
                    "autocomplete": {
                        "type": "text",
                        "analyzer": "autocomplete_analyzer",
                        "search_analyzer": "standard"
                    }
                }
            },
            "description": {
                "type": "text",
                "analyzer": "product_analyzer"
            },
            "category": {
                "type": "keyword"  # Exact match for filtering
            },
            "price": {
                "type": "float"
            },
            "in_stock": {
                "type": "boolean"
            },
            "tags": {
                "type": "keyword"  # Array of exact-match tags
            },
            "created_at": {
                "type": "date"
            }
        }
    }
}

def create_index(es: Elasticsearch) -> None:
    """
    Create the products index with mappings.
    Deletes existing index if present (use with caution in production).
    """
    # Delete existing index if it exists
    if es.indices.exists(index=INDEX_NAME):
        es.indices.delete(index=INDEX_NAME)
        print(f"Deleted existing index: {INDEX_NAME}")

    # Create the index with our mapping
    es.indices.create(index=INDEX_NAME, body=PRODUCT_MAPPING)
    print(f"Created index: {INDEX_NAME}")
```

---

## Indexing Documents

Once you have an index, you need to add documents. Elasticsearch supports both single document indexing and bulk operations.

```python
# indexing.py
# Document indexing operations
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
from typing import List, Dict, Any
from datetime import datetime

INDEX_NAME = "products"

def index_single_product(es: Elasticsearch, product: Dict[str, Any]) -> str:
    """
    Index a single product document.
    Returns the document ID assigned by Elasticsearch.
    """
    response = es.index(
        index=INDEX_NAME,
        document=product,
        refresh=True  # Make document searchable immediately
    )
    return response["_id"]

def index_products_bulk(es: Elasticsearch, products: List[Dict[str, Any]]) -> Dict:
    """
    Index multiple products efficiently using bulk API.
    Much faster than indexing one at a time.
    """
    # Prepare documents for bulk indexing
    actions = [
        {
            "_index": INDEX_NAME,
            "_source": product
        }
        for product in products
    ]

    # Execute bulk operation
    success, failed = bulk(
        es,
        actions,
        stats_only=True,
        raise_on_error=False
    )

    return {
        "indexed": success,
        "failed": failed
    }

# Example usage
sample_products = [
    {
        "name": "MacBook Pro 16-inch",
        "description": "Powerful laptop with M3 chip for professional work",
        "category": "electronics",
        "price": 2499.00,
        "in_stock": True,
        "tags": ["laptop", "apple", "professional"],
        "created_at": datetime.utcnow().isoformat()
    },
    {
        "name": "Sony WH-1000XM5 Headphones",
        "description": "Wireless noise-canceling headphones with premium sound",
        "category": "electronics",
        "price": 349.00,
        "in_stock": True,
        "tags": ["headphones", "wireless", "noise-canceling"],
        "created_at": datetime.utcnow().isoformat()
    },
    {
        "name": "Ergonomic Office Chair",
        "description": "Adjustable mesh chair with lumbar support",
        "category": "furniture",
        "price": 299.00,
        "in_stock": False,
        "tags": ["chair", "office", "ergonomic"],
        "created_at": datetime.utcnow().isoformat()
    }
]
```

---

## Building Search Queries

Elasticsearch's Query DSL provides powerful search capabilities. Here are common patterns for full-text search.

```python
# search.py
# Search query implementations
from elasticsearch import Elasticsearch
from typing import List, Dict, Any, Optional

INDEX_NAME = "products"

def basic_search(
    es: Elasticsearch,
    query: str,
    size: int = 10
) -> List[Dict[str, Any]]:
    """
    Simple full-text search across name and description.
    Returns matching products sorted by relevance.
    """
    search_body = {
        "query": {
            "multi_match": {
                "query": query,
                "fields": ["name^2", "description"],  # Name has 2x weight
                "type": "best_fields",
                "fuzziness": "AUTO"  # Handle typos automatically
            }
        },
        "size": size
    }

    response = es.search(index=INDEX_NAME, body=search_body)

    # Extract and return hits with scores
    return [
        {
            "id": hit["_id"],
            "score": hit["_score"],
            **hit["_source"]
        }
        for hit in response["hits"]["hits"]
    ]

def advanced_search(
    es: Elasticsearch,
    query: str,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock_only: bool = False,
    size: int = 10,
    offset: int = 0
) -> Dict[str, Any]:
    """
    Advanced search with filters and pagination.
    Combines full-text search with exact-match filters.
    """
    # Build the bool query
    must_clauses = []
    filter_clauses = []

    # Full-text search on name and description
    if query:
        must_clauses.append({
            "multi_match": {
                "query": query,
                "fields": ["name^3", "description", "tags"],
                "type": "best_fields",
                "fuzziness": "AUTO"
            }
        })

    # Category filter (exact match)
    if category:
        filter_clauses.append({
            "term": {"category": category}
        })

    # Price range filter
    if min_price is not None or max_price is not None:
        price_range = {}
        if min_price is not None:
            price_range["gte"] = min_price
        if max_price is not None:
            price_range["lte"] = max_price
        filter_clauses.append({
            "range": {"price": price_range}
        })

    # In-stock filter
    if in_stock_only:
        filter_clauses.append({
            "term": {"in_stock": True}
        })

    search_body = {
        "query": {
            "bool": {
                "must": must_clauses if must_clauses else [{"match_all": {}}],
                "filter": filter_clauses
            }
        },
        "from": offset,
        "size": size,
        "sort": [
            {"_score": {"order": "desc"}},
            {"created_at": {"order": "desc"}}
        ],
        # Include aggregations for faceted search
        "aggs": {
            "categories": {
                "terms": {"field": "category", "size": 20}
            },
            "price_ranges": {
                "range": {
                    "field": "price",
                    "ranges": [
                        {"to": 100},
                        {"from": 100, "to": 500},
                        {"from": 500, "to": 1000},
                        {"from": 1000}
                    ]
                }
            }
        }
    }

    response = es.search(index=INDEX_NAME, body=search_body)

    return {
        "total": response["hits"]["total"]["value"],
        "results": [
            {
                "id": hit["_id"],
                "score": hit["_score"],
                **hit["_source"]
            }
            for hit in response["hits"]["hits"]
        ],
        "facets": {
            "categories": [
                {"name": bucket["key"], "count": bucket["doc_count"]}
                for bucket in response["aggregations"]["categories"]["buckets"]
            ],
            "price_ranges": response["aggregations"]["price_ranges"]["buckets"]
        }
    }
```

---

## Autocomplete and Suggestions

Autocomplete improves user experience by suggesting results as users type.

```python
# autocomplete.py
# Autocomplete and suggestion functionality
from elasticsearch import Elasticsearch
from typing import List, Dict

INDEX_NAME = "products"

def autocomplete(
    es: Elasticsearch,
    prefix: str,
    size: int = 5
) -> List[Dict]:
    """
    Return autocomplete suggestions based on partial input.
    Uses the autocomplete analyzer we defined in the mapping.
    """
    search_body = {
        "query": {
            "match": {
                "name.autocomplete": {
                    "query": prefix,
                    "operator": "and"
                }
            }
        },
        "size": size,
        # Only return the fields needed for suggestions
        "_source": ["name", "category"]
    }

    response = es.search(index=INDEX_NAME, body=search_body)

    return [
        {
            "name": hit["_source"]["name"],
            "category": hit["_source"]["category"]
        }
        for hit in response["hits"]["hits"]
    ]

def search_suggestions(
    es: Elasticsearch,
    text: str,
    size: int = 3
) -> List[str]:
    """
    Return spelling suggestions for misspelled queries.
    Useful for 'Did you mean?' functionality.
    """
    suggest_body = {
        "suggest": {
            "text": text,
            "name_suggestion": {
                "term": {
                    "field": "name",
                    "suggest_mode": "popular",
                    "sort": "frequency"
                }
            }
        }
    }

    response = es.search(index=INDEX_NAME, body=suggest_body, size=0)

    suggestions = []
    for suggestion in response["suggest"]["name_suggestion"]:
        for option in suggestion["options"][:size]:
            suggestions.append(option["text"])

    return suggestions
```

---

## Building a Search API with FastAPI

Here's how to expose Elasticsearch search through a REST API.

```python
# search_api.py
# FastAPI search endpoints
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from elasticsearch import Elasticsearch
from elasticsearch_client import es_client
from search import basic_search, advanced_search
from autocomplete import autocomplete, search_suggestions

app = FastAPI(title="Product Search API")

class SearchResult(BaseModel):
    id: str
    name: str
    description: str
    category: str
    price: float
    score: float

class SearchResponse(BaseModel):
    total: int
    results: List[SearchResult]
    facets: Optional[dict] = None

@app.get("/search", response_model=SearchResponse)
async def search_products(
    q: str = Query(..., min_length=1, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    in_stock: bool = Query(False, description="Show only in-stock items"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Results per page")
):
    """
    Search products with optional filters.
    Returns paginated results with facets for filtering.
    """
    offset = (page - 1) * size

    try:
        results = advanced_search(
            es=es_client,
            query=q,
            category=category,
            min_price=min_price,
            max_price=max_price,
            in_stock_only=in_stock,
            size=size,
            offset=offset
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/autocomplete")
async def get_autocomplete(
    q: str = Query(..., min_length=2, description="Partial query")
):
    """
    Get autocomplete suggestions for search input.
    Returns matching product names.
    """
    suggestions = autocomplete(es_client, q)
    return {"suggestions": suggestions}

@app.get("/suggest")
async def get_suggestions(
    q: str = Query(..., min_length=3, description="Possibly misspelled query")
):
    """
    Get spelling suggestions for a query.
    Useful for 'Did you mean?' feature.
    """
    suggestions = search_suggestions(es_client, q)
    return {"suggestions": suggestions}
```

---

## Handling Updates and Deletes

Search indices need to stay in sync with your source data.

```python
# sync.py
# Document update and delete operations
from elasticsearch import Elasticsearch
from typing import Dict, Any

INDEX_NAME = "products"

def update_product(
    es: Elasticsearch,
    doc_id: str,
    updates: Dict[str, Any]
) -> None:
    """
    Update specific fields of a product document.
    Only updates the fields provided, leaves others unchanged.
    """
    es.update(
        index=INDEX_NAME,
        id=doc_id,
        body={"doc": updates},
        refresh=True
    )

def delete_product(es: Elasticsearch, doc_id: str) -> None:
    """Delete a product from the search index."""
    es.delete(index=INDEX_NAME, id=doc_id, refresh=True)

def reindex_all(
    es: Elasticsearch,
    products: List[Dict[str, Any]]
) -> None:
    """
    Reindex all products using zero-downtime pattern.
    Creates a new index, populates it, then swaps aliases.
    """
    from datetime import datetime

    # Create timestamped index name
    new_index = f"{INDEX_NAME}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    # Create new index with current mappings
    es.indices.create(index=new_index, body=PRODUCT_MAPPING)

    # Bulk index all products
    index_products_bulk(es, products)

    # Point alias to new index
    alias_actions = [
        {"remove": {"index": "*", "alias": INDEX_NAME}},
        {"add": {"index": new_index, "alias": INDEX_NAME}}
    ]
    es.indices.update_aliases(body={"actions": alias_actions})
```

---

## Conclusion

Elasticsearch brings powerful search capabilities to Python applications. The key takeaways:

- **Mappings matter**: Define analyzers and field types carefully for optimal search quality
- **Use bulk operations**: For large datasets, bulk indexing is dramatically faster
- **Combine search and filters**: Use `bool` queries with `must` for relevance and `filter` for exact matches
- **Add autocomplete**: Edge n-grams provide fast prefix matching for suggestions
- **Plan for updates**: Use aliases for zero-downtime reindexing

Start with basic multi-match queries and add features like facets and autocomplete as your search requirements grow.

---

*Running Elasticsearch in production? [OneUptime](https://oneuptime.com) monitors your clusters, tracks query performance, and alerts you before issues impact users.*

**Related Reading:**
- [How to Build Full-Text Search with Meilisearch in Node.js](https://oneuptime.com/blog/post/2026-01-06-nodejs-full-text-search-meilisearch/view)
- [How to Implement Structured Logging with OpenTelemetry in Python](https://oneuptime.com/blog/post/2025-01-06-python-structured-logging-opentelemetry/view)
