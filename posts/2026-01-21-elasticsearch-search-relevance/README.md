# How to Boost Search Relevance in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Search Relevance, Boosting, Scoring, TF-IDF, BM25

Description: A comprehensive guide to boosting search relevance in Elasticsearch, covering field boosting, function scores, decay functions, and strategies for improving search result quality.

---

Search relevance determines how well search results match user intent. Elasticsearch provides powerful tools to tune relevance, from simple field boosting to complex scoring functions. This guide covers techniques to improve search result quality.

## Understanding Elasticsearch Scoring

Elasticsearch uses BM25 (Best Matching 25) as the default scoring algorithm, considering:

- **Term frequency (TF)**: How often the term appears in the document
- **Inverse document frequency (IDF)**: How rare the term is across all documents
- **Field length normalization**: Shorter fields boost scores

### View Score Explanation

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "explain": true,
    "query": {
      "match": { "title": "elasticsearch tutorial" }
    }
  }'
```

## Field Boosting

Give more importance to matches in specific fields.

### At Query Time

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "elasticsearch performance",
        "fields": ["title^3", "summary^2", "content"]
      }
    }
  }'
```

Title matches score 3x, summary 2x, content 1x.

### At Index Time

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "title": {
          "type": "text",
          "boost": 3
        },
        "content": {
          "type": "text"
        }
      }
    }
  }'
```

Note: Query-time boosting is preferred for flexibility.

## Function Score Query

The most powerful tool for custom relevance scoring.

### Basic Structure

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "function_score": {
        "query": {
          "match": { "title": "elasticsearch" }
        },
        "functions": [
          {
            "filter": { "term": { "featured": true } },
            "weight": 2
          }
        ],
        "score_mode": "multiply",
        "boost_mode": "multiply"
      }
    }
  }'
```

### Score Modes

- `multiply`: Multiply function scores together
- `sum`: Add function scores
- `avg`: Average of function scores
- `first`: Use first matching function
- `max`: Use maximum function score
- `min`: Use minimum function score

### Boost Modes

- `multiply`: Multiply with query score
- `replace`: Replace query score
- `sum`: Add to query score
- `avg`: Average with query score
- `max`: Max of query and function score
- `min`: Min of query and function score

## Boosting by Popularity

Boost by views, likes, or other engagement metrics:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "function_score": {
        "query": {
          "match": { "content": "elasticsearch" }
        },
        "functions": [
          {
            "field_value_factor": {
              "field": "views",
              "factor": 1.2,
              "modifier": "log1p",
              "missing": 1
            }
          }
        ],
        "boost_mode": "multiply"
      }
    }
  }'
```

### Modifiers

- `none`: No modification (default)
- `log`: log(value)
- `log1p`: log(1 + value)
- `log2p`: log(2 + value)
- `ln`: Natural log
- `ln1p`: ln(1 + value)
- `ln2p`: ln(2 + value)
- `square`: value^2
- `sqrt`: sqrt(value)
- `reciprocal`: 1/value

## Decay Functions

Reduce scores based on distance from a preferred value.

### Date Decay (Freshness)

Boost recent content:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "function_score": {
        "query": {
          "match": { "content": "elasticsearch" }
        },
        "functions": [
          {
            "gauss": {
              "publish_date": {
                "origin": "now",
                "scale": "10d",
                "offset": "2d",
                "decay": 0.5
              }
            }
          }
        ],
        "boost_mode": "multiply"
      }
    }
  }'
```

- `origin`: Center point (best score)
- `scale`: Distance where score = decay
- `offset`: No decay within this distance
- `decay`: Score at scale distance (default 0.5)

### Decay Function Types

- `linear`: Linear decay
- `exp`: Exponential decay
- `gauss`: Gaussian decay (smooth curve)

### Geo Distance Decay

Boost nearby results:

```bash
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "function_score": {
        "query": { "match_all": {} },
        "functions": [
          {
            "gauss": {
              "location": {
                "origin": { "lat": 40.7128, "lon": -74.0060 },
                "scale": "5km",
                "offset": "1km",
                "decay": 0.5
              }
            }
          }
        ]
      }
    }
  }'
```

### Price Decay

Prefer mid-range prices:

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "function_score": {
        "query": {
          "match": { "name": "laptop" }
        },
        "functions": [
          {
            "gauss": {
              "price": {
                "origin": 1000,
                "scale": 500,
                "decay": 0.5
              }
            }
          }
        ]
      }
    }
  }'
```

## Script Score

Custom scoring logic:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "function_score": {
        "query": {
          "match": { "content": "elasticsearch" }
        },
        "script_score": {
          "script": {
            "source": "_score * Math.log(2 + doc[\"views\"].value) * (doc[\"premium\"].value ? 2 : 1)"
          }
        }
      }
    }
  }'
```

### Painless Script Functions

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "function_score": {
        "query": { "match_all": {} },
        "script_score": {
          "script": {
            "source": "double boost = 1; if (doc[\"category\"].value == params.preferred) { boost = 2; } return _score * boost * Math.log(2 + doc[\"popularity\"].value);",
            "params": {
              "preferred": "technology"
            }
          }
        }
      }
    }
  }'
```

## Combining Multiple Functions

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "function_score": {
        "query": {
          "multi_match": {
            "query": "elasticsearch performance",
            "fields": ["title^2", "content"]
          }
        },
        "functions": [
          {
            "filter": { "term": { "featured": true } },
            "weight": 3
          },
          {
            "gauss": {
              "publish_date": {
                "origin": "now",
                "scale": "30d",
                "decay": 0.5
              }
            }
          },
          {
            "field_value_factor": {
              "field": "views",
              "modifier": "log1p",
              "factor": 0.1
            }
          }
        ],
        "score_mode": "sum",
        "boost_mode": "multiply",
        "max_boost": 10
      }
    }
  }'
```

## Boosting and Negating

Demote certain results without excluding them:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "boosting": {
        "positive": {
          "match": { "content": "elasticsearch" }
        },
        "negative": {
          "term": { "category": "advertisement" }
        },
        "negative_boost": 0.2
      }
    }
  }'
```

## Constant Score

Assign fixed scores (useful for filters):

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "should": [
          {
            "constant_score": {
              "filter": { "term": { "category": "featured" } },
              "boost": 10
            }
          },
          {
            "match": { "content": "elasticsearch" }
          }
        ]
      }
    }
  }'
```

## Complete Relevance Example

E-commerce product search with multiple relevance factors:

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "function_score": {
        "query": {
          "bool": {
            "must": [
              {
                "multi_match": {
                  "query": "wireless headphones",
                  "fields": ["name^3", "brand^2", "description", "tags"],
                  "type": "best_fields",
                  "tie_breaker": 0.3
                }
              }
            ],
            "filter": [
              { "term": { "in_stock": true } }
            ]
          }
        },
        "functions": [
          {
            "filter": { "term": { "sponsored": true } },
            "weight": 1.5
          },
          {
            "filter": { "range": { "rating": { "gte": 4.5 } } },
            "weight": 1.3
          },
          {
            "field_value_factor": {
              "field": "sales_count",
              "modifier": "log1p",
              "factor": 0.1,
              "missing": 0
            }
          },
          {
            "gauss": {
              "price": {
                "origin": 150,
                "scale": 100,
                "decay": 0.8
              }
            },
            "weight": 0.5
          },
          {
            "gauss": {
              "release_date": {
                "origin": "now",
                "scale": "90d",
                "decay": 0.7
              }
            },
            "weight": 0.3
          }
        ],
        "score_mode": "sum",
        "boost_mode": "multiply",
        "max_boost": 5
      }
    },
    "sort": [
      { "_score": "desc" }
    ]
  }'
```

## Testing and Tuning Relevance

### Use Explain API

```bash
curl -X GET "https://localhost:9200/products/_explain/123" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "name": "headphones" }
    }
  }'
```

### Rank Evaluation API

```bash
curl -X GET "https://localhost:9200/products/_rank_eval" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "requests": [
      {
        "id": "headphones_query",
        "request": {
          "query": { "match": { "name": "wireless headphones" } }
        },
        "ratings": [
          { "_index": "products", "_id": "1", "rating": 3 },
          { "_index": "products", "_id": "2", "rating": 2 },
          { "_index": "products", "_id": "3", "rating": 1 }
        ]
      }
    ],
    "metric": {
      "dcg": {
        "k": 10,
        "normalize": true
      }
    }
  }'
```

## Best Practices

1. **Start simple** - Add complexity only when needed
2. **Test with real queries** - Use actual user searches
3. **Use explain** - Understand why results rank as they do
4. **A/B test changes** - Measure impact on user behavior
5. **Balance factors** - Avoid any single factor dominating
6. **Consider edge cases** - New content, zero values, etc.

## Conclusion

Search relevance tuning is an iterative process. Key takeaways:

1. **Field boosting** - Prioritize important fields
2. **Function score** - Combine multiple relevance signals
3. **Decay functions** - Factor in freshness, proximity, price
4. **Script scores** - Implement custom logic
5. **Test and measure** - Use explain and rank evaluation APIs

With thoughtful relevance tuning, you can ensure users find the most relevant results, improving satisfaction and engagement.
