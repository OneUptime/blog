# How to Build Product Search with Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Product Search, E-commerce, Search Implementation, Relevance, Faceted Search

Description: A comprehensive guide to building product search with Elasticsearch for e-commerce applications, covering index design, relevance tuning, faceted search, autocomplete, and performance optimization.

---

Product search is a critical component of e-commerce platforms, directly impacting conversion rates and user experience. This guide covers building a production-ready product search system with Elasticsearch.

## Index Design for Products

### Product Mapping

```bash
curl -u elastic:password -X PUT "localhost:9200/products" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "product_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "product_synonyms", "english_stemmer"]
        },
        "autocomplete_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "autocomplete_filter"]
        },
        "autocomplete_search_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding"]
        }
      },
      "filter": {
        "product_synonyms": {
          "type": "synonym",
          "synonyms": [
            "laptop, notebook, computer",
            "phone, mobile, smartphone, cellphone",
            "tv, television, telly"
          ]
        },
        "english_stemmer": {
          "type": "stemmer",
          "language": "english"
        },
        "autocomplete_filter": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 20
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "product_id": {"type": "keyword"},
      "name": {
        "type": "text",
        "analyzer": "product_analyzer",
        "fields": {
          "keyword": {"type": "keyword"},
          "autocomplete": {
            "type": "text",
            "analyzer": "autocomplete_analyzer",
            "search_analyzer": "autocomplete_search_analyzer"
          }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "product_analyzer"
      },
      "brand": {
        "type": "text",
        "fields": {
          "keyword": {"type": "keyword"}
        }
      },
      "category": {
        "type": "keyword"
      },
      "category_path": {
        "type": "text",
        "fields": {
          "keyword": {"type": "keyword"}
        }
      },
      "price": {"type": "float"},
      "sale_price": {"type": "float"},
      "currency": {"type": "keyword"},
      "in_stock": {"type": "boolean"},
      "stock_quantity": {"type": "integer"},
      "sku": {"type": "keyword"},
      "attributes": {
        "type": "nested",
        "properties": {
          "name": {"type": "keyword"},
          "value": {"type": "keyword"}
        }
      },
      "tags": {"type": "keyword"},
      "images": {"type": "keyword"},
      "rating": {"type": "float"},
      "review_count": {"type": "integer"},
      "sales_count": {"type": "integer"},
      "created_at": {"type": "date"},
      "updated_at": {"type": "date"},
      "popularity_score": {"type": "float"},
      "search_keywords": {
        "type": "text",
        "analyzer": "product_analyzer"
      }
    }
  }
}'
```

### Sample Product Document

```bash
curl -u elastic:password -X POST "localhost:9200/products/_doc" -H 'Content-Type: application/json' -d'
{
  "product_id": "PROD-001",
  "name": "Apple iPhone 15 Pro Max 256GB",
  "description": "The most powerful iPhone ever with A17 Pro chip, titanium design, and advanced camera system.",
  "brand": "Apple",
  "category": "electronics/phones/smartphones",
  "category_path": "Electronics > Phones > Smartphones",
  "price": 1199.00,
  "sale_price": 1099.00,
  "currency": "USD",
  "in_stock": true,
  "stock_quantity": 150,
  "sku": "APL-IP15PM-256",
  "attributes": [
    {"name": "Color", "value": "Natural Titanium"},
    {"name": "Storage", "value": "256GB"},
    {"name": "Screen Size", "value": "6.7 inches"},
    {"name": "RAM", "value": "8GB"}
  ],
  "tags": ["premium", "5g", "fast-shipping", "bestseller"],
  "images": ["https://cdn.example.com/iphone15pm-1.jpg"],
  "rating": 4.8,
  "review_count": 2543,
  "sales_count": 15420,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-20T14:30:00Z",
  "popularity_score": 95.5,
  "search_keywords": "iphone 15 pro max apple smartphone mobile phone 5g titanium"
}'
```

## Basic Product Search

### Simple Search Query

```bash
curl -u elastic:password -X GET "localhost:9200/products/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "multi_match": {
      "query": "iphone pro",
      "fields": ["name^3", "brand^2", "description", "search_keywords"],
      "type": "best_fields",
      "fuzziness": "AUTO"
    }
  }
}'
```

### Search with Filters

```bash
curl -u elastic:password -X GET "localhost:9200/products/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "smartphone",
            "fields": ["name^3", "brand^2", "description"],
            "type": "best_fields"
          }
        }
      ],
      "filter": [
        {"term": {"in_stock": true}},
        {"range": {"price": {"gte": 500, "lte": 1500}}},
        {"term": {"category": "electronics/phones/smartphones"}}
      ]
    }
  }
}'
```

## Relevance Tuning

### Function Score for Boosting

```bash
curl -u elastic:password -X GET "localhost:9200/products/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "must": [
            {
              "multi_match": {
                "query": "laptop",
                "fields": ["name^3", "brand^2", "description", "search_keywords"]
              }
            }
          ],
          "filter": [
            {"term": {"in_stock": true}}
          ]
        }
      },
      "functions": [
        {
          "filter": {"term": {"tags": "bestseller"}},
          "weight": 1.5
        },
        {
          "filter": {"exists": {"field": "sale_price"}},
          "weight": 1.2
        },
        {
          "gauss": {
            "rating": {
              "origin": 5,
              "scale": 1,
              "decay": 0.5
            }
          },
          "weight": 2
        },
        {
          "field_value_factor": {
            "field": "popularity_score",
            "factor": 0.01,
            "modifier": "log1p",
            "missing": 1
          }
        },
        {
          "script_score": {
            "script": {
              "source": "doc[\"sales_count\"].value > 1000 ? 1.3 : 1.0"
            }
          }
        }
      ],
      "score_mode": "multiply",
      "boost_mode": "multiply"
    }
  }
}'
```

### Personalized Search Boost

```bash
curl -u elastic:password -X GET "localhost:9200/products/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "function_score": {
      "query": {
        "multi_match": {
          "query": "headphones",
          "fields": ["name^3", "brand^2", "description"]
        }
      },
      "functions": [
        {
          "filter": {"terms": {"brand.keyword": ["Sony", "Bose"]}},
          "weight": 1.5
        },
        {
          "filter": {"range": {"price": {"gte": 100, "lte": 300}}},
          "weight": 1.3
        }
      ],
      "score_mode": "sum",
      "boost_mode": "multiply"
    }
  }
}'
```

## Faceted Search

### Aggregations for Facets

```bash
curl -u elastic:password -X GET "localhost:9200/products/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 20,
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "laptop",
            "fields": ["name^3", "brand^2", "description"]
          }
        }
      ],
      "filter": [
        {"term": {"in_stock": true}}
      ]
    }
  },
  "aggs": {
    "brands": {
      "terms": {
        "field": "brand.keyword",
        "size": 20
      }
    },
    "categories": {
      "terms": {
        "field": "category",
        "size": 10
      }
    },
    "price_ranges": {
      "range": {
        "field": "price",
        "ranges": [
          {"key": "Under $500", "to": 500},
          {"key": "$500 - $1000", "from": 500, "to": 1000},
          {"key": "$1000 - $1500", "from": 1000, "to": 1500},
          {"key": "Over $1500", "from": 1500}
        ]
      }
    },
    "rating_ranges": {
      "range": {
        "field": "rating",
        "ranges": [
          {"key": "4 stars & up", "from": 4},
          {"key": "3 stars & up", "from": 3},
          {"key": "2 stars & up", "from": 2}
        ]
      }
    },
    "price_stats": {
      "stats": {
        "field": "price"
      }
    }
  }
}'
```

### Nested Attribute Facets

```bash
curl -u elastic:password -X GET "localhost:9200/products/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "bool": {
      "must": [{"match": {"category": "electronics/phones/smartphones"}}]
    }
  },
  "aggs": {
    "attributes": {
      "nested": {
        "path": "attributes"
      },
      "aggs": {
        "attribute_names": {
          "terms": {
            "field": "attributes.name",
            "size": 10
          },
          "aggs": {
            "attribute_values": {
              "terms": {
                "field": "attributes.value",
                "size": 20
              }
            }
          }
        }
      }
    }
  }
}'
```

### Filtered Facets

```bash
curl -u elastic:password -X GET "localhost:9200/products/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 20,
  "query": {
    "bool": {
      "must": [
        {"match": {"name": "laptop"}}
      ],
      "filter": [
        {"term": {"brand.keyword": "Apple"}}
      ]
    }
  },
  "post_filter": {
    "term": {"brand.keyword": "Apple"}
  },
  "aggs": {
    "all_brands": {
      "global": {},
      "aggs": {
        "brands_filtered": {
          "filter": {
            "bool": {
              "must": [{"match": {"name": "laptop"}}]
            }
          },
          "aggs": {
            "brands": {
              "terms": {"field": "brand.keyword", "size": 20}
            }
          }
        }
      }
    },
    "current_brand_categories": {
      "terms": {"field": "category", "size": 10}
    }
  }
}'
```

## Autocomplete Implementation

### Search-as-You-Type Query

```bash
curl -u elastic:password -X GET "localhost:9200/products/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 10,
  "_source": ["name", "brand", "category", "price", "images"],
  "query": {
    "bool": {
      "should": [
        {
          "match": {
            "name.autocomplete": {
              "query": "iph",
              "operator": "and"
            }
          }
        },
        {
          "match_phrase_prefix": {
            "name": {
              "query": "iph",
              "max_expansions": 50
            }
          }
        }
      ],
      "filter": [
        {"term": {"in_stock": true}}
      ]
    }
  },
  "highlight": {
    "fields": {
      "name": {
        "pre_tags": ["<strong>"],
        "post_tags": ["</strong>"]
      }
    }
  }
}'
```

### Completion Suggester

Add completion field to mapping:

```bash
curl -u elastic:password -X PUT "localhost:9200/products/_mapping" -H 'Content-Type: application/json' -d'
{
  "properties": {
    "suggest": {
      "type": "completion",
      "contexts": [
        {
          "name": "category",
          "type": "category"
        }
      ]
    }
  }
}'
```

Query with completion suggester:

```bash
curl -u elastic:password -X GET "localhost:9200/products/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "suggest": {
    "product_suggestions": {
      "prefix": "iph",
      "completion": {
        "field": "suggest",
        "size": 10,
        "skip_duplicates": true,
        "contexts": {
          "category": ["electronics/phones/smartphones"]
        }
      }
    }
  }
}'
```

## Search Results Sorting

### Multi-Field Sorting

```bash
curl -u elastic:password -X GET "localhost:9200/products/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [{"match": {"category": "electronics"}}],
      "filter": [{"term": {"in_stock": true}}]
    }
  },
  "sort": [
    {"_score": {"order": "desc"}},
    {"popularity_score": {"order": "desc"}},
    {"price": {"order": "asc"}}
  ]
}'
```

### Sort by Price with Missing Values

```bash
curl -u elastic:password -X GET "localhost:9200/products/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {"match_all": {}},
  "sort": [
    {
      "sale_price": {
        "order": "asc",
        "missing": "_last"
      }
    }
  ]
}'
```

## Handling Out-of-Stock Products

### Show Out-of-Stock Last

```bash
curl -u elastic:password -X GET "localhost:9200/products/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "function_score": {
      "query": {
        "multi_match": {
          "query": "laptop",
          "fields": ["name^3", "description"]
        }
      },
      "functions": [
        {
          "filter": {"term": {"in_stock": true}},
          "weight": 100
        }
      ],
      "score_mode": "sum",
      "boost_mode": "sum"
    }
  }
}'
```

## Performance Optimization

### Index Settings for Search

```bash
curl -u elastic:password -X PUT "localhost:9200/products/_settings" -H 'Content-Type: application/json' -d'
{
  "index": {
    "refresh_interval": "5s",
    "number_of_replicas": 2,
    "search.slowlog.threshold.query.warn": "2s",
    "search.slowlog.threshold.query.info": "1s"
  }
}'
```

### Query Optimization

Use filter context for non-scoring queries:

```bash
curl -u elastic:password -X GET "localhost:9200/products/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "wireless headphones",
            "fields": ["name^3", "brand^2", "description"]
          }
        }
      ],
      "filter": [
        {"term": {"in_stock": true}},
        {"range": {"price": {"gte": 50, "lte": 300}}},
        {"terms": {"brand.keyword": ["Sony", "Bose", "JBL"]}}
      ]
    }
  },
  "_source": ["name", "brand", "price", "rating", "images"],
  "size": 20
}'
```

### Caching Strategies

Enable request cache:

```bash
curl -u elastic:password -X GET "localhost:9200/products/_search?request_cache=true&pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [{"term": {"category": "electronics"}}]
    }
  },
  "aggs": {
    "brands": {"terms": {"field": "brand.keyword"}}
  }
}'
```

## Python Implementation

```python
from elasticsearch import Elasticsearch
from typing import Dict, List, Optional

class ProductSearch:
    def __init__(self, hosts: List[str], auth: tuple):
        self.es = Elasticsearch(hosts, basic_auth=auth)
        self.index = "products"

    def search(
        self,
        query: str,
        filters: Optional[Dict] = None,
        page: int = 1,
        size: int = 20,
        sort: Optional[str] = None
    ) -> Dict:
        must = []
        filter_clauses = []

        if query:
            must.append({
                "multi_match": {
                    "query": query,
                    "fields": ["name^3", "brand^2", "description", "search_keywords"],
                    "type": "best_fields",
                    "fuzziness": "AUTO"
                }
            })

        filter_clauses.append({"term": {"in_stock": True}})

        if filters:
            if "brand" in filters:
                filter_clauses.append({"terms": {"brand.keyword": filters["brand"]}})
            if "category" in filters:
                filter_clauses.append({"term": {"category": filters["category"]}})
            if "price_min" in filters or "price_max" in filters:
                price_range = {}
                if "price_min" in filters:
                    price_range["gte"] = filters["price_min"]
                if "price_max" in filters:
                    price_range["lte"] = filters["price_max"]
                filter_clauses.append({"range": {"price": price_range}})
            if "rating_min" in filters:
                filter_clauses.append({"range": {"rating": {"gte": filters["rating_min"]}}})

        search_body = {
            "query": {
                "function_score": {
                    "query": {
                        "bool": {
                            "must": must if must else [{"match_all": {}}],
                            "filter": filter_clauses
                        }
                    },
                    "functions": [
                        {"filter": {"term": {"tags": "bestseller"}}, "weight": 1.3},
                        {
                            "gauss": {
                                "rating": {"origin": 5, "scale": 1, "decay": 0.5}
                            },
                            "weight": 1.5
                        },
                        {
                            "field_value_factor": {
                                "field": "popularity_score",
                                "factor": 0.01,
                                "modifier": "log1p",
                                "missing": 1
                            }
                        }
                    ],
                    "score_mode": "multiply",
                    "boost_mode": "multiply"
                }
            },
            "aggs": {
                "brands": {"terms": {"field": "brand.keyword", "size": 20}},
                "categories": {"terms": {"field": "category", "size": 10}},
                "price_ranges": {
                    "range": {
                        "field": "price",
                        "ranges": [
                            {"key": "Under $100", "to": 100},
                            {"key": "$100 - $500", "from": 100, "to": 500},
                            {"key": "$500 - $1000", "from": 500, "to": 1000},
                            {"key": "Over $1000", "from": 1000}
                        ]
                    }
                },
                "rating_avg": {"avg": {"field": "rating"}}
            },
            "from": (page - 1) * size,
            "size": size,
            "_source": ["product_id", "name", "brand", "price", "sale_price",
                       "rating", "review_count", "images", "in_stock"]
        }

        if sort:
            sort_mapping = {
                "price_asc": [{"price": "asc"}],
                "price_desc": [{"price": "desc"}],
                "rating": [{"rating": "desc"}],
                "newest": [{"created_at": "desc"}],
                "popular": [{"sales_count": "desc"}]
            }
            search_body["sort"] = sort_mapping.get(sort, [{"_score": "desc"}])

        return self.es.search(index=self.index, body=search_body)

    def autocomplete(self, prefix: str, size: int = 10) -> List[Dict]:
        search_body = {
            "size": size,
            "_source": ["name", "brand", "category", "price", "images"],
            "query": {
                "bool": {
                    "should": [
                        {"match": {"name.autocomplete": {"query": prefix, "operator": "and"}}},
                        {"match_phrase_prefix": {"name": {"query": prefix}}}
                    ],
                    "filter": [{"term": {"in_stock": True}}]
                }
            }
        }

        result = self.es.search(index=self.index, body=search_body)
        return [hit["_source"] for hit in result["hits"]["hits"]]

# Usage
search = ProductSearch(["http://localhost:9200"], ("elastic", "password"))
results = search.search(
    query="wireless headphones",
    filters={"brand": ["Sony", "Bose"], "price_max": 300},
    page=1,
    sort="rating"
)
```

## Best Practices

### 1. Index Design
- Use appropriate field types (keyword for filters, text for search)
- Add autocomplete fields with edge n-grams
- Include denormalized fields for common queries

### 2. Relevance Tuning
- Boost important fields (name > brand > description)
- Use function_score for business logic (bestsellers, ratings)
- Implement personalization based on user behavior

### 3. Performance
- Use filter context for non-scoring conditions
- Enable request caching for aggregations
- Limit source fields returned

### 4. User Experience
- Implement faceted search with accurate counts
- Add typo tolerance with fuzziness
- Show out-of-stock products last

## Summary

Building product search with Elasticsearch involves:

1. **Index design** - Proper mapping with analyzers and field types
2. **Search queries** - Multi-match with boosting and filters
3. **Relevance tuning** - Function scores for business rules
4. **Faceted search** - Aggregations for filters and navigation
5. **Autocomplete** - Edge n-grams and completion suggesters
6. **Performance** - Caching, filtering, and query optimization

With these techniques, you can build a fast, relevant product search that drives e-commerce conversions.
