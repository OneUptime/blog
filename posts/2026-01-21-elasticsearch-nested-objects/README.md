# How to Handle Nested Objects in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Nested Objects, Data Modeling, Queries, Performance

Description: A comprehensive guide to handling nested objects in Elasticsearch, covering the difference between object and nested types, query techniques, and performance considerations.

---

Nested objects in Elasticsearch allow you to index arrays of objects while maintaining the relationship between fields within each object. This guide explains when and how to use nested objects effectively.

## Object vs Nested Type

### The Object Type Problem

With the default object type, arrays of objects are flattened:

```bash
# Index a document with object array
curl -X PUT "https://localhost:9200/products/_doc/1" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "name": "Laptop",
    "reviews": [
      { "author": "john", "rating": 5 },
      { "author": "jane", "rating": 3 }
    ]
  }'
```

Elasticsearch internally stores this as:

```json
{
  "name": "Laptop",
  "reviews.author": ["john", "jane"],
  "reviews.rating": [5, 3]
}
```

The relationship between author and rating is lost. This query incorrectly matches:

```bash
# This matches even though john gave 5, not 3
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "match": { "reviews.author": "john" } },
          { "match": { "reviews.rating": 3 } }
        ]
      }
    }
  }'
```

### The Nested Type Solution

Nested type preserves the relationship:

```bash
# Create index with nested type
curl -X PUT "https://localhost:9200/products-nested" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "name": { "type": "text" },
        "reviews": {
          "type": "nested",
          "properties": {
            "author": { "type": "keyword" },
            "rating": { "type": "integer" },
            "comment": { "type": "text" },
            "date": { "type": "date" }
          }
        }
      }
    }
  }'
```

Index the document:

```bash
curl -X PUT "https://localhost:9200/products-nested/_doc/1" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "name": "Laptop",
    "reviews": [
      { "author": "john", "rating": 5, "comment": "Great product!", "date": "2024-01-10" },
      { "author": "jane", "rating": 3, "comment": "Average quality", "date": "2024-01-15" }
    ]
  }'
```

## Querying Nested Objects

### Basic Nested Query

```bash
# Query for john's review with rating 5 (correct match)
curl -X GET "https://localhost:9200/products-nested/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "nested": {
        "path": "reviews",
        "query": {
          "bool": {
            "must": [
              { "match": { "reviews.author": "john" } },
              { "match": { "reviews.rating": 5 } }
            ]
          }
        }
      }
    }
  }'

# Query for john's review with rating 3 (no match - correct!)
curl -X GET "https://localhost:9200/products-nested/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "nested": {
        "path": "reviews",
        "query": {
          "bool": {
            "must": [
              { "match": { "reviews.author": "john" } },
              { "match": { "reviews.rating": 3 } }
            ]
          }
        }
      }
    }
  }'
```

### Nested Query with Score Mode

Control how nested matches contribute to the score:

```bash
curl -X GET "https://localhost:9200/products-nested/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "nested": {
        "path": "reviews",
        "query": {
          "range": {
            "reviews.rating": { "gte": 4 }
          }
        },
        "score_mode": "avg"
      }
    }
  }'
```

Score modes:
- `avg`: Average of all matching nested documents
- `max`: Maximum score of matching nested documents
- `min`: Minimum score
- `sum`: Sum of all scores
- `none`: Do not use scores

### Combining Nested and Regular Queries

```bash
curl -X GET "https://localhost:9200/products-nested/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "match": { "name": "laptop" } },
          {
            "nested": {
              "path": "reviews",
              "query": {
                "range": {
                  "reviews.rating": { "gte": 4 }
                }
              }
            }
          }
        ]
      }
    }
  }'
```

## Nested Aggregations

### Basic Nested Aggregation

```bash
curl -X GET "https://localhost:9200/products-nested/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "reviews": {
        "nested": {
          "path": "reviews"
        },
        "aggs": {
          "avg_rating": {
            "avg": {
              "field": "reviews.rating"
            }
          },
          "authors": {
            "terms": {
              "field": "reviews.author"
            }
          }
        }
      }
    }
  }'
```

### Reverse Nested Aggregation

Access parent document fields from within nested context:

```bash
curl -X GET "https://localhost:9200/products-nested/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "reviews": {
        "nested": {
          "path": "reviews"
        },
        "aggs": {
          "by_rating": {
            "terms": {
              "field": "reviews.rating"
            },
            "aggs": {
              "back_to_product": {
                "reverse_nested": {},
                "aggs": {
                  "product_names": {
                    "terms": {
                      "field": "name.keyword"
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

### Filter Then Aggregate

```bash
curl -X GET "https://localhost:9200/products-nested/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "reviews": {
        "nested": {
          "path": "reviews"
        },
        "aggs": {
          "recent_reviews": {
            "filter": {
              "range": {
                "reviews.date": {
                  "gte": "2024-01-01"
                }
              }
            },
            "aggs": {
              "avg_rating": {
                "avg": {
                  "field": "reviews.rating"
                }
              }
            }
          }
        }
      }
    }
  }'
```

## Inner Hits

Retrieve matching nested documents:

```bash
curl -X GET "https://localhost:9200/products-nested/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "nested": {
        "path": "reviews",
        "query": {
          "range": {
            "reviews.rating": { "gte": 4 }
          }
        },
        "inner_hits": {
          "size": 3,
          "sort": [{ "reviews.rating": "desc" }],
          "highlight": {
            "fields": {
              "reviews.comment": {}
            }
          }
        }
      }
    }
  }'
```

Response includes matching nested documents:

```json
{
  "hits": {
    "hits": [
      {
        "_source": { "name": "Laptop", "reviews": [...] },
        "inner_hits": {
          "reviews": {
            "hits": {
              "hits": [
                {
                  "_nested": { "field": "reviews", "offset": 0 },
                  "_source": { "author": "john", "rating": 5 }
                }
              ]
            }
          }
        }
      }
    ]
  }
}
```

## Updating Nested Documents

### Update Specific Nested Document

Use a script to update nested objects:

```bash
curl -X POST "https://localhost:9200/products-nested/_update/1" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "script": {
      "source": "for (review in ctx._source.reviews) { if (review.author == params.author) { review.rating = params.new_rating } }",
      "params": {
        "author": "john",
        "new_rating": 4
      }
    }
  }'
```

### Add New Nested Document

```bash
curl -X POST "https://localhost:9200/products-nested/_update/1" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "script": {
      "source": "ctx._source.reviews.add(params.review)",
      "params": {
        "review": {
          "author": "bob",
          "rating": 4,
          "comment": "Good value",
          "date": "2024-01-20"
        }
      }
    }
  }'
```

### Remove Nested Document

```bash
curl -X POST "https://localhost:9200/products-nested/_update/1" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "script": {
      "source": "ctx._source.reviews.removeIf(review -> review.author == params.author)",
      "params": {
        "author": "jane"
      }
    }
  }'
```

## Performance Considerations

### Nested Documents Count as Separate Documents

Each nested object is indexed as a hidden separate document:

```bash
# Check document count
curl -X GET "https://localhost:9200/products-nested/_count" \
  -u elastic:password

# Check actual indexed documents (includes nested)
curl -X GET "https://localhost:9200/products-nested/_stats/docs?pretty" \
  -u elastic:password
```

A document with 100 nested objects counts as 101 Lucene documents.

### Set Limits for Nested Objects

Prevent mapping explosion:

```bash
curl -X PUT "https://localhost:9200/products-nested/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.mapping.nested_fields.limit": 50,
    "index.mapping.nested_objects.limit": 10000
  }'
```

### When to Use Nested vs Other Approaches

**Use nested when:**
- You need to query objects independently
- Arrays have reasonable size (< 100 objects)
- Object relationships must be preserved

**Consider alternatives when:**
- Very large arrays (use denormalization)
- Simple filtering (object type may suffice)
- High write frequency (nested updates reindex entire document)

## Alternative: Parent-Child (Join Field)

For very large nested arrays or frequently updated relationships:

```bash
curl -X PUT "https://localhost:9200/products-join" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "product_review": {
          "type": "join",
          "relations": {
            "product": "review"
          }
        },
        "name": { "type": "text" },
        "author": { "type": "keyword" },
        "rating": { "type": "integer" },
        "comment": { "type": "text" }
      }
    }
  }'

# Index parent
curl -X PUT "https://localhost:9200/products-join/_doc/1" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "name": "Laptop",
    "product_review": "product"
  }'

# Index children
curl -X PUT "https://localhost:9200/products-join/_doc/2?routing=1" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "author": "john",
    "rating": 5,
    "comment": "Great!",
    "product_review": {
      "name": "review",
      "parent": "1"
    }
  }'
```

## Complete Example: E-commerce Product with Reviews

```bash
# Create index
curl -X PUT "https://localhost:9200/ecommerce" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "index.mapping.nested_objects.limit": 10000
    },
    "mappings": {
      "properties": {
        "sku": { "type": "keyword" },
        "name": { "type": "text" },
        "price": { "type": "float" },
        "category": { "type": "keyword" },
        "reviews": {
          "type": "nested",
          "properties": {
            "author": { "type": "keyword" },
            "rating": { "type": "integer" },
            "comment": { "type": "text" },
            "verified_purchase": { "type": "boolean" },
            "date": { "type": "date" },
            "helpful_votes": { "type": "integer" }
          }
        },
        "variants": {
          "type": "nested",
          "properties": {
            "color": { "type": "keyword" },
            "size": { "type": "keyword" },
            "price": { "type": "float" },
            "in_stock": { "type": "boolean" }
          }
        }
      }
    }
  }'

# Index product with nested data
curl -X PUT "https://localhost:9200/ecommerce/_doc/1" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "sku": "LAPTOP-001",
    "name": "Professional Laptop",
    "price": 999.99,
    "category": "Electronics",
    "reviews": [
      {
        "author": "john_doe",
        "rating": 5,
        "comment": "Excellent performance and build quality",
        "verified_purchase": true,
        "date": "2024-01-10",
        "helpful_votes": 25
      },
      {
        "author": "jane_smith",
        "rating": 4,
        "comment": "Good laptop but battery could be better",
        "verified_purchase": true,
        "date": "2024-01-15",
        "helpful_votes": 12
      }
    ],
    "variants": [
      { "color": "silver", "size": "13-inch", "price": 999.99, "in_stock": true },
      { "color": "space-gray", "size": "15-inch", "price": 1199.99, "in_stock": false }
    ]
  }'

# Complex query: Find products with in-stock silver variant and verified reviews rating >= 4
curl -X GET "https://localhost:9200/ecommerce/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "must": [
          {
            "nested": {
              "path": "variants",
              "query": {
                "bool": {
                  "must": [
                    { "term": { "variants.color": "silver" } },
                    { "term": { "variants.in_stock": true } }
                  ]
                }
              }
            }
          },
          {
            "nested": {
              "path": "reviews",
              "query": {
                "bool": {
                  "must": [
                    { "range": { "reviews.rating": { "gte": 4 } } },
                    { "term": { "reviews.verified_purchase": true } }
                  ]
                }
              },
              "inner_hits": {
                "size": 5,
                "sort": [{ "reviews.helpful_votes": "desc" }]
              }
            }
          }
        ]
      }
    }
  }'
```

## Best Practices

1. **Use nested sparingly** - Only when object relationships matter
2. **Set reasonable limits** - Prevent excessive nested document counts
3. **Consider inner_hits** - Retrieve matching nested documents efficiently
4. **Monitor document counts** - Nested objects increase total document count
5. **Batch updates** - Nested updates reindex the entire document
6. **Use aggregations wisely** - Nested aggregations can be expensive

## Conclusion

Nested objects in Elasticsearch provide powerful capabilities for maintaining relationships within arrays of objects. Key takeaways:

1. **Use nested type** when object field relationships must be preserved
2. **Query with nested queries** - Regular queries will not work correctly
3. **Leverage inner_hits** - To retrieve specific matching nested documents
4. **Be mindful of performance** - Each nested object is a separate document
5. **Set appropriate limits** - Prevent mapping and document explosion
6. **Consider alternatives** - Parent-child join for very large relationships

With proper use of nested objects, you can build sophisticated search applications that accurately query complex document structures.
