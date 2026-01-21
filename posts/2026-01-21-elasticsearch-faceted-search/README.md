# How to Implement Faceted Search with Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Faceted Search, Filters, E-commerce, Search, UX

Description: A comprehensive guide to implementing faceted search with Elasticsearch, covering filter aggregations, post_filter, and building interactive search interfaces with dynamic facet counts.

---

Faceted search (also called faceted navigation) allows users to filter search results by categories, price ranges, ratings, and other attributes while seeing real-time counts for each filter option. This guide shows how to implement faceted search effectively with Elasticsearch.

## Understanding Faceted Search

Faceted search combines:
1. **Search query** - Find relevant documents
2. **Filters** - Narrow down results
3. **Aggregations** - Show available filter options with counts

The key challenge: showing correct counts for each facet while applying other facet filters.

## Basic Faceted Search

### Index Setup

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "name": { "type": "text" },
        "category": { "type": "keyword" },
        "brand": { "type": "keyword" },
        "price": { "type": "float" },
        "rating": { "type": "float" },
        "color": { "type": "keyword" },
        "size": { "type": "keyword" },
        "in_stock": { "type": "boolean" }
      }
    }
  }'
```

### Simple Faceted Query

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "name": "laptop" }
    },
    "aggs": {
      "categories": {
        "terms": { "field": "category", "size": 20 }
      },
      "brands": {
        "terms": { "field": "brand", "size": 20 }
      },
      "price_ranges": {
        "range": {
          "field": "price",
          "ranges": [
            { "key": "Under $100", "to": 100 },
            { "key": "$100-$500", "from": 100, "to": 500 },
            { "key": "$500-$1000", "from": 500, "to": 1000 },
            { "key": "Over $1000", "from": 1000 }
          ]
        }
      },
      "avg_rating": {
        "range": {
          "field": "rating",
          "ranges": [
            { "key": "4+ stars", "from": 4 },
            { "key": "3+ stars", "from": 3 },
            { "key": "2+ stars", "from": 2 }
          ]
        }
      }
    }
  }'
```

## Using post_filter for Facets

The `post_filter` applies filters AFTER aggregations are calculated, allowing facets to show counts independent of other filters.

### Problem: Filtering Affects All Facet Counts

```bash
# This query shows incorrect facet counts
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "match": { "name": "laptop" } }
        ],
        "filter": [
          { "term": { "brand": "Apple" } }
        ]
      }
    },
    "aggs": {
      "brands": {
        "terms": { "field": "brand" }
      }
    }
  }'
```

The brands aggregation only shows Apple because the filter is in the query.

### Solution: post_filter

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "name": "laptop" }
    },
    "post_filter": {
      "term": { "brand": "Apple" }
    },
    "aggs": {
      "brands": {
        "terms": { "field": "brand" }
      }
    }
  }'
```

Now the aggregation shows all brands (calculated before post_filter), but results are filtered to Apple.

## Multi-Facet Filtering Strategy

For multiple facets, each facet should:
- Apply filters from OTHER facets
- NOT apply its own filter (to show available options)

### Filter Aggregations Pattern

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "name": "laptop" }
    },
    "post_filter": {
      "bool": {
        "filter": [
          { "term": { "brand": "Apple" } },
          { "range": { "price": { "gte": 500, "lt": 1000 } } }
        ]
      }
    },
    "aggs": {
      "all_products": {
        "global": {},
        "aggs": {
          "filtered_by_search": {
            "filter": {
              "match": { "name": "laptop" }
            },
            "aggs": {
              "brands": {
                "filter": {
                  "range": { "price": { "gte": 500, "lt": 1000 } }
                },
                "aggs": {
                  "brand_values": {
                    "terms": { "field": "brand" }
                  }
                }
              },
              "price_ranges": {
                "filter": {
                  "term": { "brand": "Apple" }
                },
                "aggs": {
                  "price_values": {
                    "range": {
                      "field": "price",
                      "ranges": [
                        { "key": "Under $500", "to": 500 },
                        { "key": "$500-$1000", "from": 500, "to": 1000 },
                        { "key": "Over $1000", "from": 1000 }
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }'
```

## Practical Implementation

### Complete Faceted Search Query

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 20,
    "query": {
      "bool": {
        "must": [
          {
            "multi_match": {
              "query": "wireless headphones",
              "fields": ["name^2", "description"]
            }
          }
        ]
      }
    },
    "post_filter": {
      "bool": {
        "filter": [
          { "terms": { "brand": ["Sony", "Bose"] } },
          { "range": { "price": { "gte": 100, "lte": 300 } } },
          { "term": { "in_stock": true } }
        ]
      }
    },
    "aggs": {
      "all_brands": {
        "filter": {
          "bool": {
            "filter": [
              { "range": { "price": { "gte": 100, "lte": 300 } } },
              { "term": { "in_stock": true } }
            ]
          }
        },
        "aggs": {
          "brands": {
            "terms": { "field": "brand", "size": 50 }
          }
        }
      },
      "all_price_ranges": {
        "filter": {
          "bool": {
            "filter": [
              { "terms": { "brand": ["Sony", "Bose"] } },
              { "term": { "in_stock": true } }
            ]
          }
        },
        "aggs": {
          "prices": {
            "range": {
              "field": "price",
              "ranges": [
                { "key": "Under $50", "to": 50 },
                { "key": "$50-$100", "from": 50, "to": 100 },
                { "key": "$100-$200", "from": 100, "to": 200 },
                { "key": "$200-$300", "from": 200, "to": 300 },
                { "key": "Over $300", "from": 300 }
              ]
            }
          }
        }
      },
      "in_stock_filter": {
        "filter": {
          "bool": {
            "filter": [
              { "terms": { "brand": ["Sony", "Bose"] } },
              { "range": { "price": { "gte": 100, "lte": 300 } } }
            ]
          }
        },
        "aggs": {
          "stock_status": {
            "terms": { "field": "in_stock" }
          }
        }
      },
      "rating_distribution": {
        "filter": {
          "bool": {
            "filter": [
              { "terms": { "brand": ["Sony", "Bose"] } },
              { "range": { "price": { "gte": 100, "lte": 300 } } },
              { "term": { "in_stock": true } }
            ]
          }
        },
        "aggs": {
          "ratings": {
            "histogram": {
              "field": "rating",
              "interval": 1,
              "min_doc_count": 0
            }
          }
        }
      }
    },
    "sort": [
      { "_score": "desc" },
      { "rating": "desc" }
    ],
    "highlight": {
      "fields": {
        "name": {},
        "description": { "fragment_size": 100 }
      }
    }
  }'
```

### Response Structure

```json
{
  "hits": {
    "total": { "value": 15 },
    "hits": [
      {
        "_source": {
          "name": "Sony WH-1000XM5 Wireless Headphones",
          "brand": "Sony",
          "price": 279.99
        }
      }
    ]
  },
  "aggregations": {
    "all_brands": {
      "doc_count": 45,
      "brands": {
        "buckets": [
          { "key": "Sony", "doc_count": 12 },
          { "key": "Bose", "doc_count": 10 },
          { "key": "JBL", "doc_count": 8 },
          { "key": "Sennheiser", "doc_count": 6 }
        ]
      }
    },
    "all_price_ranges": {
      "doc_count": 22,
      "prices": {
        "buckets": [
          { "key": "Under $50", "doc_count": 0 },
          { "key": "$50-$100", "doc_count": 3 },
          { "key": "$100-$200", "doc_count": 8 },
          { "key": "$200-$300", "doc_count": 11 },
          { "key": "Over $300", "doc_count": 5 }
        ]
      }
    }
  }
}
```

## Dynamic Facets

Generate facets based on product attributes:

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "query": {
      "term": { "category": "clothing" }
    },
    "aggs": {
      "available_sizes": {
        "terms": { "field": "size", "size": 20 }
      },
      "available_colors": {
        "terms": { "field": "color", "size": 30 }
      },
      "price_stats": {
        "stats": { "field": "price" }
      },
      "price_percentiles": {
        "percentiles": {
          "field": "price",
          "percents": [25, 50, 75]
        }
      }
    }
  }'
```

Use price_stats and percentiles to dynamically generate price range facets.

## Hierarchical Facets

For category trees:

```bash
curl -X PUT "https://localhost:9200/products-hierarchical" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "category_path": {
          "type": "keyword"
        }
      }
    }
  }'

# Index with category paths like:
# "Electronics"
# "Electronics > Computers"
# "Electronics > Computers > Laptops"

curl -X GET "https://localhost:9200/products-hierarchical/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "query": {
      "prefix": { "category_path": "Electronics" }
    },
    "aggs": {
      "categories": {
        "terms": {
          "field": "category_path",
          "size": 100,
          "include": "Electronics > [^>]+"
        }
      }
    }
  }'
```

## Performance Optimization

### 1. Limit Aggregation Size

```json
{
  "aggs": {
    "brands": {
      "terms": {
        "field": "brand",
        "size": 20
      }
    }
  }
}
```

### 2. Use Execution Hints

```json
{
  "aggs": {
    "brands": {
      "terms": {
        "field": "brand",
        "execution_hint": "map"
      }
    }
  }
}
```

### 3. Shard Size for Accuracy

```json
{
  "aggs": {
    "brands": {
      "terms": {
        "field": "brand",
        "size": 10,
        "shard_size": 50
      }
    }
  }
}
```

### 4. Filter Caching

Use bool filter for cacheable filters:

```json
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "category": "electronics" } }
      ]
    }
  }
}
```

## Best Practices

1. **Use post_filter** for main result filtering
2. **Filter aggregations** to show independent facet counts
3. **Limit aggregation sizes** for performance
4. **Cache common filter combinations**
5. **Consider cardinality** - high-cardinality fields may need special handling
6. **Show selected filters** prominently in UI

## Conclusion

Faceted search is essential for e-commerce and content-heavy applications. Key takeaways:

1. **Combine queries, filters, and aggregations** for full faceted search
2. **Use post_filter** to separate result filtering from aggregation scope
3. **Filter aggregations** for independent facet counts
4. **Optimize for performance** with appropriate sizes and caching
5. **Design intuitive UI** that helps users narrow results efficiently

With proper implementation, faceted search dramatically improves the user experience by helping users find exactly what they are looking for.
