# How to Design Elasticsearch Index Mappings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Mappings, Schema Design, Indexing, Search, Data Modeling

Description: A comprehensive guide to designing Elasticsearch index mappings, covering field types, analyzers, mapping optimization, and best practices for efficient search and storage.

---

Index mappings define how documents and their fields are stored and indexed in Elasticsearch. A well-designed mapping is crucial for search performance, relevance, and storage efficiency. This guide covers everything you need to know about designing effective Elasticsearch mappings.

## Understanding Mappings

A mapping defines:

- Which fields exist in documents
- The data type of each field
- How fields should be analyzed for full-text search
- Whether fields should be stored or indexed

## Creating an Index with Explicit Mapping

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "analyzer": "standard",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "description": {
          "type": "text",
          "analyzer": "english"
        },
        "price": {
          "type": "float"
        },
        "quantity": {
          "type": "integer"
        },
        "category": {
          "type": "keyword"
        },
        "tags": {
          "type": "keyword"
        },
        "created_at": {
          "type": "date"
        },
        "in_stock": {
          "type": "boolean"
        }
      }
    }
  }'
```

## Core Field Types

### Text Fields

Used for full-text search. Text is analyzed (tokenized, lowercased, etc.):

```json
{
  "properties": {
    "title": {
      "type": "text",
      "analyzer": "standard"
    },
    "body": {
      "type": "text",
      "analyzer": "english",
      "search_analyzer": "english",
      "index_options": "offsets"
    }
  }
}
```

Text field options:
- `analyzer`: Analyzer for indexing
- `search_analyzer`: Analyzer for search queries
- `index_options`: What to store in the index (docs, freqs, positions, offsets)
- `norms`: Store length normalization info (default: true)
- `term_vector`: Store term vectors for highlighting

### Keyword Fields

Used for exact matching, filtering, sorting, and aggregations:

```json
{
  "properties": {
    "status": {
      "type": "keyword"
    },
    "email": {
      "type": "keyword",
      "normalizer": "lowercase_normalizer"
    },
    "tags": {
      "type": "keyword",
      "ignore_above": 256
    }
  }
}
```

Keyword field options:
- `ignore_above`: Ignore strings longer than this limit
- `normalizer`: Apply normalization (lowercase, etc.)
- `doc_values`: Enable for sorting/aggregations (default: true)

### Multi-fields

Allow indexing the same field in different ways:

```json
{
  "properties": {
    "title": {
      "type": "text",
      "analyzer": "standard",
      "fields": {
        "keyword": {
          "type": "keyword",
          "ignore_above": 256
        },
        "autocomplete": {
          "type": "text",
          "analyzer": "autocomplete_analyzer"
        }
      }
    }
  }
}
```

Access multi-fields:
- `title` - Full-text search
- `title.keyword` - Exact match, sorting
- `title.autocomplete` - Autocomplete suggestions

### Numeric Fields

```json
{
  "properties": {
    "count": { "type": "integer" },
    "price": { "type": "float" },
    "revenue": { "type": "double" },
    "quantity": { "type": "long" },
    "rating": { "type": "half_float" },
    "scaled_price": {
      "type": "scaled_float",
      "scaling_factor": 100
    }
  }
}
```

Choose numeric types based on range:
- `byte`: -128 to 127
- `short`: -32,768 to 32,767
- `integer`: -2^31 to 2^31-1
- `long`: -2^63 to 2^63-1
- `float`: 32-bit IEEE 754
- `double`: 64-bit IEEE 754
- `half_float`: 16-bit IEEE 754
- `scaled_float`: Fixed-point with scaling factor

### Date Fields

```json
{
  "properties": {
    "created_at": {
      "type": "date",
      "format": "strict_date_optional_time||epoch_millis"
    },
    "publish_date": {
      "type": "date",
      "format": "yyyy-MM-dd"
    },
    "timestamp": {
      "type": "date",
      "format": "epoch_second"
    }
  }
}
```

Common date formats:
- `strict_date_optional_time`: ISO 8601
- `epoch_millis`: Milliseconds since epoch
- `epoch_second`: Seconds since epoch
- Custom: `yyyy-MM-dd HH:mm:ss`

### Boolean Fields

```json
{
  "properties": {
    "is_active": {
      "type": "boolean"
    },
    "published": {
      "type": "boolean"
    }
  }
}
```

Accepted values: `true`, `false`, `"true"`, `"false"`

### Object Fields

Objects are flattened for storage:

```json
{
  "properties": {
    "author": {
      "type": "object",
      "properties": {
        "first_name": { "type": "text" },
        "last_name": { "type": "text" },
        "email": { "type": "keyword" }
      }
    }
  }
}
```

Document example:
```json
{
  "author": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com"
  }
}
```

Query nested fields:
```json
{
  "query": {
    "match": {
      "author.first_name": "John"
    }
  }
}
```

### Nested Fields

Preserve array object relationships:

```json
{
  "properties": {
    "comments": {
      "type": "nested",
      "properties": {
        "author": { "type": "keyword" },
        "text": { "type": "text" },
        "created_at": { "type": "date" }
      }
    }
  }
}
```

Query nested fields:
```json
{
  "query": {
    "nested": {
      "path": "comments",
      "query": {
        "bool": {
          "must": [
            { "match": { "comments.author": "john" } },
            { "match": { "comments.text": "great" } }
          ]
        }
      }
    }
  }
}
```

### Geo Fields

```json
{
  "properties": {
    "location": {
      "type": "geo_point"
    },
    "area": {
      "type": "geo_shape"
    }
  }
}
```

Geo-point formats:
```json
{ "location": { "lat": 41.12, "lon": -71.34 } }
{ "location": "41.12,-71.34" }
{ "location": [41.12, -71.34] }
{ "location": "drm3btev3e86" }
```

### IP Address Fields

```json
{
  "properties": {
    "ip_address": {
      "type": "ip"
    }
  }
}
```

Supports IPv4 and IPv6:
```json
{ "ip_address": "192.168.1.1" }
{ "ip_address": "2001:db8::1" }
```

## Mapping Parameters

### index

Control whether a field is indexed:

```json
{
  "properties": {
    "content": {
      "type": "text",
      "index": true
    },
    "internal_id": {
      "type": "keyword",
      "index": false
    }
  }
}
```

### doc_values

Control column-oriented storage for sorting/aggregations:

```json
{
  "properties": {
    "description": {
      "type": "text",
      "doc_values": false
    },
    "status": {
      "type": "keyword",
      "doc_values": true
    }
  }
}
```

### store

Store field value separately (default: false):

```json
{
  "properties": {
    "content": {
      "type": "text",
      "store": true
    }
  }
}
```

### null_value

Index a default value for null fields:

```json
{
  "properties": {
    "status": {
      "type": "keyword",
      "null_value": "unknown"
    }
  }
}
```

### copy_to

Copy field values to another field:

```json
{
  "properties": {
    "first_name": {
      "type": "text",
      "copy_to": "full_name"
    },
    "last_name": {
      "type": "text",
      "copy_to": "full_name"
    },
    "full_name": {
      "type": "text"
    }
  }
}
```

### enabled

Disable indexing for an object:

```json
{
  "properties": {
    "metadata": {
      "type": "object",
      "enabled": false
    }
  }
}
```

## Custom Analyzers

Define custom analyzers in index settings:

```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        "custom_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "snowball"]
        },
        "autocomplete_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "autocomplete_filter"]
        }
      },
      "filter": {
        "autocomplete_filter": {
          "type": "edge_ngram",
          "min_gram": 1,
          "max_gram": 20
        }
      },
      "normalizer": {
        "lowercase_normalizer": {
          "type": "custom",
          "filter": ["lowercase"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "custom_analyzer"
      }
    }
  }
}
```

## Complete Example: E-commerce Product Index

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "analysis": {
        "analyzer": {
          "product_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "snowball", "synonym_filter"]
          },
          "autocomplete_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "edge_ngram_filter"]
          }
        },
        "filter": {
          "synonym_filter": {
            "type": "synonym",
            "synonyms": [
              "laptop, notebook",
              "phone, mobile, smartphone"
            ]
          },
          "edge_ngram_filter": {
            "type": "edge_ngram",
            "min_gram": 2,
            "max_gram": 15
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "sku": {
          "type": "keyword"
        },
        "name": {
          "type": "text",
          "analyzer": "product_analyzer",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            },
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
          "type": "keyword"
        },
        "subcategory": {
          "type": "keyword"
        },
        "brand": {
          "type": "keyword"
        },
        "price": {
          "type": "scaled_float",
          "scaling_factor": 100
        },
        "sale_price": {
          "type": "scaled_float",
          "scaling_factor": 100
        },
        "currency": {
          "type": "keyword"
        },
        "in_stock": {
          "type": "boolean"
        },
        "stock_quantity": {
          "type": "integer"
        },
        "rating": {
          "type": "half_float"
        },
        "review_count": {
          "type": "integer"
        },
        "tags": {
          "type": "keyword"
        },
        "attributes": {
          "type": "nested",
          "properties": {
            "name": { "type": "keyword" },
            "value": { "type": "keyword" }
          }
        },
        "images": {
          "type": "keyword",
          "index": false
        },
        "created_at": {
          "type": "date"
        },
        "updated_at": {
          "type": "date"
        }
      }
    }
  }'
```

## Viewing and Updating Mappings

### View Current Mapping

```bash
curl -X GET "https://localhost:9200/products/_mapping?pretty" \
  -u elastic:password
```

### Add New Field to Existing Mapping

```bash
curl -X PUT "https://localhost:9200/products/_mapping" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "properties": {
      "warehouse_location": {
        "type": "keyword"
      }
    }
  }'
```

Note: You cannot change existing field mappings. To change a field type, you must reindex.

## Mapping Best Practices

### 1. Use Explicit Mappings

Avoid relying on dynamic mapping in production:

```json
{
  "mappings": {
    "dynamic": "strict",
    "properties": { }
  }
}
```

### 2. Choose Appropriate Field Types

- Use `keyword` for filtering, sorting, aggregations
- Use `text` for full-text search
- Use the smallest numeric type that fits your data
- Use `scaled_float` for prices to avoid floating-point issues

### 3. Disable Features You Don't Need

```json
{
  "properties": {
    "log_message": {
      "type": "text",
      "norms": false,
      "index_options": "freqs"
    },
    "internal_data": {
      "type": "object",
      "enabled": false
    }
  }
}
```

### 4. Use Multi-fields Strategically

```json
{
  "properties": {
    "title": {
      "type": "text",
      "fields": {
        "keyword": { "type": "keyword" },
        "english": { "type": "text", "analyzer": "english" }
      }
    }
  }
}
```

### 5. Plan for Future Changes

Design mappings with extensibility in mind. Use nested objects for structured data that may grow.

## Conclusion

Well-designed index mappings are essential for Elasticsearch performance and functionality. Key takeaways:

1. **Define explicit mappings** - Avoid relying on dynamic mapping
2. **Choose appropriate field types** - Balance search needs with storage efficiency
3. **Use multi-fields** - Index the same data in different ways
4. **Configure analyzers** - Match analysis to your search use case
5. **Disable unused features** - Reduce storage and improve performance
6. **Plan for changes** - Some mapping changes require reindexing

With properly designed mappings, you can build powerful search applications that deliver relevant results efficiently.
