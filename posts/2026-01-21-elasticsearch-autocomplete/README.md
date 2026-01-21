# How to Implement Autocomplete with Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Autocomplete, Completion Suggester, Edge N-grams, Search, UX

Description: A comprehensive guide to implementing autocomplete functionality with Elasticsearch, covering completion suggesters, edge n-grams, and practical patterns for building responsive search-as-you-type experiences.

---

Autocomplete (search-as-you-type) improves user experience by suggesting relevant results as users type their queries. Elasticsearch offers multiple approaches to implement autocomplete, each with different trade-offs. This guide covers the most effective techniques.

## Autocomplete Approaches

Three main approaches:

1. **Completion Suggester** - Fastest, prefix-based
2. **Edge N-grams** - Flexible, supports infix matching
3. **Search-as-you-type field** - Built-in, balanced approach

## Completion Suggester

The completion suggester is optimized for speed using an in-memory data structure.

### Create Index with Completion Field

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "name": {
          "type": "text"
        },
        "name_suggest": {
          "type": "completion",
          "analyzer": "simple",
          "preserve_separators": true,
          "preserve_position_increments": true,
          "max_input_length": 50
        }
      }
    }
  }'
```

### Index Documents with Suggestions

```bash
# Simple suggestion
curl -X PUT "https://localhost:9200/products/_doc/1" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "name": "Apple MacBook Pro",
    "name_suggest": "Apple MacBook Pro"
  }'

# With weight for popularity ranking
curl -X PUT "https://localhost:9200/products/_doc/2" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "name": "Apple iPhone 15",
    "name_suggest": {
      "input": ["Apple iPhone 15", "iPhone 15", "iPhone"],
      "weight": 100
    }
  }'

# With multiple inputs
curl -X PUT "https://localhost:9200/products/_doc/3" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "name": "Samsung Galaxy S24",
    "name_suggest": {
      "input": ["Samsung Galaxy S24", "Galaxy S24", "S24"],
      "weight": 90
    }
  }'
```

### Query Suggestions

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "suggest": {
      "product-suggest": {
        "prefix": "app",
        "completion": {
          "field": "name_suggest",
          "size": 5,
          "skip_duplicates": true
        }
      }
    }
  }'
```

Response:

```json
{
  "suggest": {
    "product-suggest": [
      {
        "text": "app",
        "offset": 0,
        "length": 3,
        "options": [
          {
            "text": "Apple iPhone 15",
            "_score": 100,
            "_source": { "name": "Apple iPhone 15" }
          },
          {
            "text": "Apple MacBook Pro",
            "_score": 1,
            "_source": { "name": "Apple MacBook Pro" }
          }
        ]
      }
    ]
  }
}
```

### Fuzzy Suggestions

Handle typos:

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "suggest": {
      "product-suggest": {
        "prefix": "aple",
        "completion": {
          "field": "name_suggest",
          "size": 5,
          "fuzzy": {
            "fuzziness": 1
          }
        }
      }
    }
  }'
```

### Context Suggestions

Filter by category:

```bash
# Create index with context
curl -X PUT "https://localhost:9200/products-context" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "name": { "type": "text" },
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
    }
  }'

# Index with context
curl -X PUT "https://localhost:9200/products-context/_doc/1" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "name": "Apple MacBook Pro",
    "suggest": {
      "input": "Apple MacBook Pro",
      "contexts": {
        "category": ["electronics", "computers"]
      }
    }
  }'

# Query with context filter
curl -X GET "https://localhost:9200/products-context/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "suggest": {
      "product-suggest": {
        "prefix": "app",
        "completion": {
          "field": "suggest",
          "contexts": {
            "category": ["electronics"]
          }
        }
      }
    }
  }'
```

## Edge N-grams Approach

Edge n-grams allow matching from the beginning of each word.

### Create Index with Edge N-gram Analyzer

```bash
curl -X PUT "https://localhost:9200/products-ngram" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "autocomplete_filter": {
            "type": "edge_ngram",
            "min_gram": 1,
            "max_gram": 20
          }
        },
        "analyzer": {
          "autocomplete": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "autocomplete_filter"]
          },
          "autocomplete_search": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "analyzer": "autocomplete",
          "search_analyzer": "autocomplete_search"
        },
        "category": { "type": "keyword" }
      }
    }
  }'
```

### Test the Analyzer

```bash
curl -X GET "https://localhost:9200/products-ngram/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "autocomplete",
    "text": "Apple MacBook"
  }'
```

Result:

```json
{
  "tokens": [
    {"token": "a", "position": 0},
    {"token": "ap", "position": 0},
    {"token": "app", "position": 0},
    {"token": "appl", "position": 0},
    {"token": "apple", "position": 0},
    {"token": "m", "position": 1},
    {"token": "ma", "position": 1},
    {"token": "mac", "position": 1},
    ...
  ]
}
```

### Query Edge N-gram Index

```bash
curl -X GET "https://localhost:9200/products-ngram/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": {
        "name": {
          "query": "app mac",
          "operator": "and"
        }
      }
    }
  }'
```

## Search-As-You-Type Field

Built-in field type optimized for autocomplete:

```bash
curl -X PUT "https://localhost:9200/products-sayt" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "name": {
          "type": "search_as_you_type",
          "max_shingle_size": 3
        }
      }
    }
  }'
```

This creates sub-fields:
- `name` - root field
- `name._2gram` - 2-word shingles
- `name._3gram` - 3-word shingles
- `name._index_prefix` - edge n-grams

### Query Search-As-You-Type

```bash
curl -X GET "https://localhost:9200/products-sayt/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "macbook pr",
        "type": "bool_prefix",
        "fields": [
          "name",
          "name._2gram",
          "name._3gram"
        ]
      }
    }
  }'
```

## Complete Autocomplete Solution

Combine approaches for best results:

```bash
# Create comprehensive index
curl -X PUT "https://localhost:9200/search-index" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "edge_ngram_filter": {
            "type": "edge_ngram",
            "min_gram": 2,
            "max_gram": 15
          }
        },
        "analyzer": {
          "autocomplete_index": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "edge_ngram_filter"]
          },
          "autocomplete_search": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "analyzer": "autocomplete_index",
          "search_analyzer": "autocomplete_search",
          "fields": {
            "keyword": { "type": "keyword" },
            "completion": { "type": "completion" }
          }
        },
        "description": { "type": "text" },
        "category": { "type": "keyword" },
        "popularity": { "type": "integer" }
      }
    }
  }'

# Index products
curl -X POST "https://localhost:9200/search-index/_bulk" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '
{"index": {"_id": "1"}}
{"name": "Apple MacBook Pro 16-inch", "description": "Powerful laptop for professionals", "category": "laptops", "popularity": 95}
{"index": {"_id": "2"}}
{"name": "Apple MacBook Air M3", "description": "Thin and light laptop", "category": "laptops", "popularity": 90}
{"index": {"_id": "3"}}
{"name": "Apple iPhone 15 Pro Max", "description": "Latest flagship phone", "category": "phones", "popularity": 98}
{"index": {"_id": "4"}}
{"name": "Samsung Galaxy S24 Ultra", "description": "Premium Android phone", "category": "phones", "popularity": 92}
'
```

### Autocomplete API Endpoint

```bash
curl -X GET "https://localhost:9200/search-index/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 5,
    "query": {
      "bool": {
        "must": [
          {
            "match": {
              "name": {
                "query": "mac",
                "operator": "and"
              }
            }
          }
        ],
        "should": [
          {
            "match_phrase_prefix": {
              "name": {
                "query": "mac",
                "boost": 2
              }
            }
          }
        ]
      }
    },
    "sort": [
      { "_score": "desc" },
      { "popularity": "desc" }
    ],
    "_source": ["name", "category"],
    "highlight": {
      "fields": {
        "name": {
          "pre_tags": ["<b>"],
          "post_tags": ["</b>"]
        }
      }
    }
  }'
```

## Performance Optimization

### Completion Suggester (Fastest)

Best for:
- Pure prefix matching
- High-traffic autocomplete
- Simple suggestions

Limitations:
- Only prefix matching
- Requires separate field
- Limited scoring options

### Edge N-grams

Best for:
- Infix matching needs
- Complex scoring requirements
- Integration with full search

Considerations:
- Larger index size
- More flexible queries
- Can slow indexing

### Caching

Add caching layer:

```bash
# Request cache is automatic for common queries
curl -X PUT "https://localhost:9200/search-index/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.requests.cache.enable": true
  }'
```

## Frontend Integration Example

JavaScript implementation:

```javascript
let debounceTimer;

async function autocomplete(query) {
  // Debounce requests
  clearTimeout(debounceTimer);

  return new Promise((resolve) => {
    debounceTimer = setTimeout(async () => {
      if (query.length < 2) {
        resolve([]);
        return;
      }

      const response = await fetch('/api/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await response.json();
      resolve(data.suggestions);
    }, 150); // 150ms debounce
  });
}

// Usage
document.getElementById('search-input').addEventListener('input', async (e) => {
  const suggestions = await autocomplete(e.target.value);
  renderSuggestions(suggestions);
});
```

## Best Practices

1. **Debounce client requests** - 100-200ms delay
2. **Set minimum query length** - Usually 2-3 characters
3. **Limit results** - 5-10 suggestions maximum
4. **Show categories** - Help users understand results
5. **Handle empty states** - Show popular searches
6. **Cache aggressively** - Common queries repeat
7. **Monitor latency** - Autocomplete should be < 100ms

## Conclusion

Implementing autocomplete in Elasticsearch requires choosing the right approach for your use case:

1. **Completion suggester** - For fastest prefix-based autocomplete
2. **Edge n-grams** - For flexible matching with full query support
3. **Search-as-you-type** - For balanced, easy-to-implement solution

Key takeaways:
- Use completion suggester for high-performance prefix matching
- Use edge n-grams when you need infix matching or complex scoring
- Always debounce client-side requests
- Cache common queries
- Monitor and optimize for sub-100ms response times

With proper implementation, autocomplete significantly improves user experience and helps users find what they are looking for faster.
