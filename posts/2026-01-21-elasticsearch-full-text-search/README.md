# How to Build Full-Text Search with Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Full-Text Search, Queries, Search, Relevance

Description: A comprehensive guide to building full-text search with Elasticsearch, covering match queries, multi_match, bool queries, and advanced search patterns for building powerful search applications.

---

Full-text search is Elasticsearch's core strength, enabling applications to find relevant documents based on natural language queries. This guide covers everything you need to know about building effective full-text search functionality.

## Understanding Full-Text Search

Full-text search differs from exact matching:

- **Exact matching**: Find documents where field equals "Elasticsearch Guide"
- **Full-text search**: Find documents relevant to "elasticsearch guide" (case-insensitive, analyzed)

Elasticsearch analyzes text during indexing and searching, breaking it into tokens and applying transformations.

## Basic Match Query

The `match` query is the standard full-text query:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": {
        "title": "elasticsearch tutorial"
      }
    }
  }'
```

By default, this finds documents where title contains "elasticsearch" OR "tutorial".

### Match with AND Operator

Require all terms:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": {
        "title": {
          "query": "elasticsearch tutorial",
          "operator": "and"
        }
      }
    }
  }'
```

### Minimum Should Match

Require a minimum number of terms:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": {
        "title": {
          "query": "elasticsearch beginner tutorial guide",
          "minimum_should_match": "75%"
        }
      }
    }
  }'
```

## Match Phrase Query

Find exact phrase matches:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match_phrase": {
        "content": "full text search"
      }
    }
  }'
```

### Phrase with Slop

Allow words between phrase terms:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match_phrase": {
        "content": {
          "query": "quick fox",
          "slop": 2
        }
      }
    }
  }'
```

This matches "quick brown fox" (1 word between) or "quick lazy brown fox" (2 words between).

## Multi-Match Query

Search across multiple fields:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "elasticsearch performance",
        "fields": ["title", "content", "tags"]
      }
    }
  }'
```

### Field Boosting

Give more weight to certain fields:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "elasticsearch performance",
        "fields": ["title^3", "content", "tags^2"]
      }
    }
  }'
```

Title matches score 3x higher, tag matches 2x higher.

### Multi-Match Types

Different scoring strategies:

```bash
# best_fields (default) - Score from best matching field
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "elasticsearch guide",
        "type": "best_fields",
        "fields": ["title", "content"],
        "tie_breaker": 0.3
      }
    }
  }'

# most_fields - Combine scores from all fields
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "elasticsearch guide",
        "type": "most_fields",
        "fields": ["title", "title.stemmed", "content"]
      }
    }
  }'

# cross_fields - Treat fields as one big field
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "John Smith",
        "type": "cross_fields",
        "fields": ["first_name", "last_name"],
        "operator": "and"
      }
    }
  }'

# phrase_prefix - For autocomplete
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "elastic sea",
        "type": "phrase_prefix",
        "fields": ["title", "content"]
      }
    }
  }'
```

## Bool Query

Combine multiple queries with boolean logic:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "match": { "title": "elasticsearch" } }
        ],
        "should": [
          { "match": { "content": "performance" } },
          { "match": { "content": "optimization" } }
        ],
        "must_not": [
          { "match": { "status": "draft" } }
        ],
        "filter": [
          { "term": { "category": "tutorials" } },
          { "range": { "date": { "gte": "2024-01-01" } } }
        ]
      }
    }
  }'
```

### Bool Clauses Explained

- **must**: Required. Contributes to score.
- **should**: Optional. Contributes to score if matched.
- **must_not**: Excludes matching documents. No scoring.
- **filter**: Required. No scoring (faster).

### Nested Bool Queries

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "match": { "title": "elasticsearch" } }
        ],
        "should": [
          {
            "bool": {
              "must": [
                { "match": { "content": "beginner" } },
                { "match": { "content": "tutorial" } }
              ]
            }
          },
          {
            "bool": {
              "must": [
                { "match": { "content": "advanced" } },
                { "match": { "content": "guide" } }
              ]
            }
          }
        ],
        "minimum_should_match": 1
      }
    }
  }'
```

## Query String Query

Parse complex query syntax:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "query_string": {
        "query": "(elasticsearch AND tutorial) OR (search AND engine)",
        "default_field": "content",
        "default_operator": "AND"
      }
    }
  }'
```

### Query String Syntax

- `+` required, `-` excluded
- `AND`, `OR`, `NOT`
- `field:value`
- `"exact phrase"`
- `*` and `?` wildcards
- `~` fuzzy matching

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "query_string": {
        "query": "title:elasticsearch AND content:\"full text search\" -status:draft",
        "fields": ["title", "content"]
      }
    }
  }'
```

## Simple Query String

Safer version that never throws errors:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "simple_query_string": {
        "query": "elasticsearch + tutorial -draft",
        "fields": ["title^2", "content"],
        "default_operator": "and"
      }
    }
  }'
```

Syntax: `+` (AND), `|` (OR), `-` (NOT), `"` (phrase), `*` (prefix), `~N` (fuzzy)

## Combined Search

Create a complete search query:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "must": [
          {
            "multi_match": {
              "query": "elasticsearch performance tuning",
              "fields": ["title^3", "content", "tags^2"],
              "type": "best_fields",
              "tie_breaker": 0.3
            }
          }
        ],
        "filter": [
          { "term": { "status": "published" } },
          { "range": { "date": { "gte": "2023-01-01" } } }
        ],
        "should": [
          { "term": { "featured": true } }
        ]
      }
    },
    "highlight": {
      "fields": {
        "title": {},
        "content": {
          "fragment_size": 150,
          "number_of_fragments": 3
        }
      }
    },
    "sort": [
      { "_score": { "order": "desc" } },
      { "date": { "order": "desc" } }
    ],
    "from": 0,
    "size": 10
  }'
```

## Highlighting

Show where matches occurred:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "content": "elasticsearch" }
    },
    "highlight": {
      "pre_tags": ["<strong>"],
      "post_tags": ["</strong>"],
      "fields": {
        "content": {
          "fragment_size": 100,
          "number_of_fragments": 3
        }
      }
    }
  }'
```

Response includes highlighted fragments:

```json
{
  "hits": {
    "hits": [
      {
        "_source": { ... },
        "highlight": {
          "content": [
            "Learn about <strong>Elasticsearch</strong> for full-text search...",
            "Configure <strong>Elasticsearch</strong> clusters for production..."
          ]
        }
      }
    ]
  }
}
```

## Pagination

### Basic Pagination

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": { "match_all": {} },
    "from": 20,
    "size": 10
  }'
```

### Search After (Deep Pagination)

For large result sets:

```bash
# First request
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": { "match_all": {} },
    "sort": [
      { "date": "desc" },
      { "_id": "asc" }
    ],
    "size": 10
  }'

# Subsequent requests using sort values from last result
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": { "match_all": {} },
    "sort": [
      { "date": "desc" },
      { "_id": "asc" }
    ],
    "size": 10,
    "search_after": ["2024-01-15", "abc123"]
  }'
```

## Source Filtering

Return only specific fields:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": { "match": { "title": "elasticsearch" } },
    "_source": ["title", "date", "author"],
    "size": 10
  }'

# Or with includes/excludes
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": { "match_all": {} },
    "_source": {
      "includes": ["title", "author.*"],
      "excludes": ["content"]
    }
  }'
```

## Complete Search Application Example

```bash
# Create index with proper mapping
curl -X PUT "https://localhost:9200/blog" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "blog_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "snowball"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "title": {
          "type": "text",
          "analyzer": "blog_analyzer",
          "fields": {
            "keyword": { "type": "keyword" }
          }
        },
        "content": {
          "type": "text",
          "analyzer": "blog_analyzer"
        },
        "tags": { "type": "keyword" },
        "author": { "type": "keyword" },
        "date": { "type": "date" },
        "status": { "type": "keyword" }
      }
    }
  }'

# Search endpoint for application
curl -X GET "https://localhost:9200/blog/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "must": [
          {
            "multi_match": {
              "query": "elasticsearch performance",
              "fields": ["title^3", "content", "tags^2"],
              "type": "best_fields",
              "fuzziness": "AUTO"
            }
          }
        ],
        "filter": [
          { "term": { "status": "published" } }
        ]
      }
    },
    "highlight": {
      "fields": {
        "title": {},
        "content": { "fragment_size": 150, "number_of_fragments": 2 }
      }
    },
    "_source": ["title", "author", "date", "tags"],
    "sort": [
      { "_score": "desc" },
      { "date": "desc" }
    ],
    "from": 0,
    "size": 10
  }'
```

## Best Practices

1. **Use filters for non-scored criteria** - Faster and cacheable
2. **Boost important fields** - Title typically 2-3x content
3. **Set appropriate fuzziness** - AUTO handles most cases
4. **Limit highlight fragments** - For performance
5. **Use search_after for deep pagination** - Avoid from/size beyond 10k
6. **Return only needed fields** - Reduce network overhead

## Conclusion

Full-text search in Elasticsearch is powerful and flexible. Key takeaways:

1. **Use match queries** for standard full-text search
2. **Use multi_match** for searching multiple fields
3. **Use bool queries** for complex logic
4. **Apply boosting** to prioritize important fields
5. **Add highlighting** for better user experience
6. **Use filters** for non-scored criteria

With these techniques, you can build sophisticated search applications that deliver relevant results to your users.
