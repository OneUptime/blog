# How to Build Elasticsearch Function Score Queries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Elasticsearch, Search, Relevance, Scoring

Description: Customize Elasticsearch search relevance with function_score queries using decay functions, script scoring, and field value factors.

---

Elasticsearch's default BM25 scoring works well for basic text matching, but real-world search often needs more than keyword relevance. Maybe you want to boost recent documents, prioritize popular content, or factor in geographic proximity. That's where `function_score` queries come in.

This guide walks through the `function_score` query structure, available scoring functions, and practical patterns for building production-ready relevance tuning.

---

## Table of Contents

1. Why Function Score Queries
2. Basic Structure
3. The Weight Function
4. Field Value Factor
5. Decay Functions (Gauss, Exp, Linear)
6. Script Score
7. Combining Multiple Functions
8. Boost Mode and Score Mode
9. Real-World Examples
10. Performance Considerations
11. Debugging and Testing

---

## 1. Why Function Score Queries

Standard Elasticsearch queries score documents based on text relevance - how well the document matches your query terms. But relevance is often multidimensional:

| Business Goal | Scoring Signal |
|---------------|----------------|
| Show fresh content first | Recency (publication date) |
| Prioritize popular items | View count, likes, sales |
| Location-based results | Geographic distance |
| Personalization | User preferences, past behavior |
| Quality ranking | Rating, review count |

The `function_score` query wraps any query and modifies the relevance score using custom functions. You keep the text matching logic intact while layering in business signals.

---

## 2. Basic Structure

A `function_score` query has three main parts: the inner query, the scoring functions, and the combination settings.

Here is the skeleton structure that all function_score queries follow:

```json
{
  "query": {
    "function_score": {
      "query": {
        "match": { "title": "elasticsearch tutorial" }
      },
      "functions": [
        {
          "filter": { "term": { "status": "published" } },
          "weight": 2
        }
      ],
      "boost_mode": "multiply",
      "score_mode": "sum",
      "max_boost": 10
    }
  }
}
```

Key parameters explained:

| Parameter | Purpose | Default |
|-----------|---------|---------|
| `query` | The base query that filters and scores documents | `match_all` |
| `functions` | Array of scoring functions to apply | Required |
| `boost_mode` | How to combine function score with query score | `multiply` |
| `score_mode` | How to combine multiple function scores | `multiply` |
| `max_boost` | Cap on the total boost from functions | No limit |

Each function in the `functions` array can have an optional `filter` that restricts which documents it affects.

---

## 3. The Weight Function

The simplest scoring function is `weight`. It multiplies the score by a constant factor.

This query boosts featured products by a factor of 5:

```json
{
  "query": {
    "function_score": {
      "query": {
        "match": { "name": "running shoes" }
      },
      "functions": [
        {
          "filter": { "term": { "featured": true } },
          "weight": 5
        }
      ],
      "boost_mode": "multiply"
    }
  }
}
```

Without a filter, weight applies to all documents:

```json
{
  "query": {
    "function_score": {
      "query": {
        "match": { "content": "kubernetes deployment" }
      },
      "weight": 2,
      "boost_mode": "multiply"
    }
  }
}
```

Weight is useful for:
- Boosting documents matching specific criteria
- A/B testing different boost values
- Simple category prioritization

Limitation: weight is binary - a document either gets the boost or it doesn't. For gradual scoring based on field values, use `field_value_factor` or decay functions.

---

## 4. Field Value Factor

The `field_value_factor` function uses a numeric field's value to influence the score. This is perfect for popularity signals like view counts, ratings, or sales numbers.

This query boosts documents proportionally to their popularity score:

```json
{
  "query": {
    "function_score": {
      "query": {
        "match": { "title": "python tutorial" }
      },
      "functions": [
        {
          "field_value_factor": {
            "field": "popularity",
            "factor": 1.2,
            "modifier": "log1p",
            "missing": 1
          }
        }
      ],
      "boost_mode": "multiply"
    }
  }
}
```

The scoring formula is:

```
score = modifier(factor * field_value)
```

Available modifiers control how the field value translates to a score:

| Modifier | Formula | Use Case |
|----------|---------|----------|
| `none` | `factor * value` | Linear relationship |
| `log` | `log(factor * value)` | Diminishing returns (value must be > 0) |
| `log1p` | `log(1 + factor * value)` | Diminishing returns, handles zero |
| `log2p` | `log(2 + factor * value)` | Even gentler curve |
| `ln` | `ln(factor * value)` | Natural log (value must be > 0) |
| `ln1p` | `ln(1 + factor * value)` | Natural log, handles zero |
| `ln2p` | `ln(2 + factor * value)` | Natural log, gentler curve |
| `square` | `(factor * value)^2` | Amplify differences |
| `sqrt` | `sqrt(factor * value)` | Compress differences |
| `reciprocal` | `1 / (factor * value)` | Inverse relationship |

Practical example - boosting articles by view count with diminishing returns:

```json
{
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "must": { "match": { "content": "observability" } },
          "filter": { "term": { "status": "published" } }
        }
      },
      "functions": [
        {
          "field_value_factor": {
            "field": "view_count",
            "factor": 0.1,
            "modifier": "log1p",
            "missing": 0
          }
        }
      ],
      "boost_mode": "sum"
    }
  }
}
```

The `missing` parameter handles documents where the field doesn't exist. Set it to a sensible default (often 0 or 1) to avoid scoring errors.

---

## 5. Decay Functions (Gauss, Exp, Linear)

Decay functions score documents based on how far a field value is from an ideal point. They're essential for:

- Date-based recency (prefer recent documents)
- Geographic proximity (prefer nearby locations)
- Price range matching (prefer prices near target)

Three decay functions are available, each with a different falloff curve:

| Function | Curve Shape | Best For |
|----------|-------------|----------|
| `gauss` | Bell curve, smooth falloff | Natural preferences, most common |
| `exp` | Exponential decay, steep then flat | Strong preference for ideal, quick penalty |
| `linear` | Straight line to zero | Predictable, hard cutoff at boundary |

All decay functions use the same parameters:

| Parameter | Meaning |
|-----------|---------|
| `origin` | The ideal point (best score) |
| `scale` | Distance from origin where score equals `decay` |
| `offset` | Documents within this range get full score |
| `decay` | Score at `origin + offset + scale` (default: 0.5) |

### Date Decay - Boosting Recent Content

This query boosts articles published recently, with a half-life of 7 days:

```json
{
  "query": {
    "function_score": {
      "query": {
        "match": { "content": "kubernetes" }
      },
      "functions": [
        {
          "gauss": {
            "publish_date": {
              "origin": "now",
              "scale": "7d",
              "offset": "1d",
              "decay": 0.5
            }
          }
        }
      ],
      "boost_mode": "multiply"
    }
  }
}
```

How this works:
- Documents published today (within `offset` of 1 day) get full score
- Documents 8 days old (1d offset + 7d scale) get 50% score
- Older documents continue to decay following the Gaussian curve

### Geographic Decay - Location-Based Search

Boost restaurants near a user's location:

```json
{
  "query": {
    "function_score": {
      "query": {
        "match": { "cuisine": "italian" }
      },
      "functions": [
        {
          "gauss": {
            "location": {
              "origin": { "lat": 40.7128, "lon": -74.0060 },
              "scale": "2km",
              "offset": "500m",
              "decay": 0.5
            }
          }
        }
      ],
      "boost_mode": "multiply"
    }
  }
}
```

Restaurants within 500 meters get full score. At 2.5km (offset + scale), the score drops to 50%.

### Numeric Decay - Price Targeting

Boost products near a target price:

```json
{
  "query": {
    "function_score": {
      "query": {
        "match": { "category": "laptops" }
      },
      "functions": [
        {
          "exp": {
            "price": {
              "origin": 1000,
              "scale": 200,
              "decay": 0.5
            }
          }
        }
      ],
      "boost_mode": "multiply"
    }
  }
}
```

Products priced at $1000 get full score. At $800 or $1200, they get 50%.

### Comparing Decay Functions

For a document 10 units from origin with scale=10 and decay=0.5:

| Function | Score at origin | Score at scale | Score at 2x scale |
|----------|-----------------|----------------|-------------------|
| `gauss` | 1.0 | 0.5 | 0.0625 |
| `exp` | 1.0 | 0.5 | 0.25 |
| `linear` | 1.0 | 0.5 | 0.0 |

Choose `gauss` for most cases. Use `exp` when you want a gentler long-tail. Use `linear` when you need a hard boundary.

---

## 6. Script Score

When built-in functions aren't enough, `script_score` lets you write custom scoring logic using Painless scripting.

This script boosts documents based on a custom formula combining multiple fields:

```json
{
  "query": {
    "function_score": {
      "query": {
        "match": { "title": "elasticsearch" }
      },
      "functions": [
        {
          "script_score": {
            "script": {
              "source": "Math.log(2 + doc['likes'].value) * params.like_weight + Math.log(2 + doc['shares'].value) * params.share_weight",
              "params": {
                "like_weight": 1,
                "share_weight": 2
              }
            }
          }
        }
      ],
      "boost_mode": "sum"
    }
  }
}
```

### Accessing Document Fields

In Painless scripts, access field values using `doc['field_name'].value`:

```json
{
  "script_score": {
    "script": {
      "source": """
        double popularity = doc['view_count'].value;
        double recency = (params.now - doc['publish_date'].value.toInstant().toEpochMilli()) / 86400000.0;
        return popularity / (1 + recency);
      """,
      "params": {
        "now": 1706572800000
      }
    }
  }
}
```

### Handling Missing Values

Always guard against missing fields to avoid errors:

```json
{
  "script_score": {
    "script": {
      "source": """
        if (doc['rating'].size() == 0) {
          return 1;
        }
        return doc['rating'].value * params.multiplier;
      """,
      "params": {
        "multiplier": 2
      }
    }
  }
}
```

### Saturation Function for Popularity

Prevent runaway scores from extremely popular documents:

```json
{
  "script_score": {
    "script": {
      "source": """
        double views = doc['view_count'].value;
        return views / (views + params.pivot);
      """,
      "params": {
        "pivot": 10000
      }
    }
  }
}
```

This saturation formula returns values between 0 and 1. A document with 10,000 views scores 0.5. A document with 100,000 views scores 0.91. This prevents a viral article from completely dominating results.

### Using Stored Scripts

For reusable scoring logic, store the script in Elasticsearch:

First, create the stored script:

```json
PUT _scripts/popularity_score
{
  "script": {
    "lang": "painless",
    "source": "Math.log(1 + doc[params.field].value) * params.weight"
  }
}
```

Then reference it in queries:

```json
{
  "query": {
    "function_score": {
      "query": { "match_all": {} },
      "functions": [
        {
          "script_score": {
            "script": {
              "id": "popularity_score",
              "params": {
                "field": "downloads",
                "weight": 1.5
              }
            }
          }
        }
      ]
    }
  }
}
```

---

## 7. Combining Multiple Functions

Real search relevance usually needs multiple signals. The `functions` array lets you stack scoring functions:

```json
{
  "query": {
    "function_score": {
      "query": {
        "match": { "content": "monitoring tools" }
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
            "field": "rating",
            "factor": 0.5,
            "modifier": "sqrt",
            "missing": 3
          }
        }
      ],
      "score_mode": "sum",
      "boost_mode": "multiply"
    }
  }
}
```

This query combines:
1. A weight boost for featured content
2. Recency decay based on publish date
3. Rating-based boost using field value factor

The `score_mode` determines how function scores combine with each other. The `boost_mode` determines how the combined function score interacts with the query score.

---

## 8. Boost Mode and Score Mode

### Score Mode

`score_mode` controls how multiple function scores are combined into a single function score:

| Mode | Formula | Use Case |
|------|---------|----------|
| `multiply` | f1 * f2 * f3 | All factors must be good (default) |
| `sum` | f1 + f2 + f3 | Additive signals |
| `avg` | (f1 + f2 + f3) / 3 | Balanced average |
| `first` | f1 | Only first matching function |
| `max` | max(f1, f2, f3) | Best signal wins |
| `min` | min(f1, f2, f3) | Worst signal dominates |

Example using `avg` to balance recency and popularity equally:

```json
{
  "query": {
    "function_score": {
      "query": { "match": { "title": "devops" } },
      "functions": [
        {
          "gauss": {
            "date": { "origin": "now", "scale": "14d" }
          }
        },
        {
          "field_value_factor": {
            "field": "popularity",
            "modifier": "log1p"
          }
        }
      ],
      "score_mode": "avg"
    }
  }
}
```

### Boost Mode

`boost_mode` controls how the combined function score interacts with the original query score:

| Mode | Formula | Use Case |
|------|---------|----------|
| `multiply` | query_score * function_score | Scale relevance (default) |
| `replace` | function_score | Ignore text relevance entirely |
| `sum` | query_score + function_score | Additive boost |
| `avg` | (query_score + function_score) / 2 | Balanced combination |
| `max` | max(query_score, function_score) | Take better score |
| `min` | min(query_score, function_score) | Conservative scoring |

Example using `replace` for pure popularity ranking:

```json
{
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "filter": { "term": { "category": "trending" } }
        }
      },
      "functions": [
        {
          "field_value_factor": {
            "field": "engagement_score",
            "modifier": "none"
          }
        }
      ],
      "boost_mode": "replace"
    }
  }
}
```

### Max Boost

Set `max_boost` to cap the total boost from functions:

```json
{
  "query": {
    "function_score": {
      "query": { "match": { "content": "search" } },
      "functions": [
        {
          "field_value_factor": {
            "field": "boost_factor",
            "modifier": "none"
          }
        }
      ],
      "max_boost": 10,
      "boost_mode": "multiply"
    }
  }
}
```

Even if a document has `boost_factor: 100`, the function score is capped at 10.

---

## 9. Real-World Examples

### E-commerce Product Search

Combine text relevance with popularity, recency, and availability:

```json
{
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "must": {
            "multi_match": {
              "query": "wireless headphones",
              "fields": ["name^3", "description", "brand^2"]
            }
          },
          "filter": [
            { "term": { "in_stock": true } },
            { "range": { "price": { "gte": 50, "lte": 300 } } }
          ]
        }
      },
      "functions": [
        {
          "filter": { "term": { "featured": true } },
          "weight": 2
        },
        {
          "filter": { "term": { "prime_eligible": true } },
          "weight": 1.5
        },
        {
          "field_value_factor": {
            "field": "sales_rank",
            "factor": 0.0001,
            "modifier": "reciprocal",
            "missing": 100000
          }
        },
        {
          "field_value_factor": {
            "field": "review_count",
            "factor": 0.1,
            "modifier": "log1p",
            "missing": 0
          }
        },
        {
          "gauss": {
            "average_rating": {
              "origin": 5,
              "scale": 0.5,
              "decay": 0.5
            }
          }
        }
      ],
      "score_mode": "sum",
      "boost_mode": "multiply",
      "max_boost": 20
    }
  }
}
```

### Blog/News Article Search

Prioritize recent, popular content from authoritative sources:

```json
{
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "must": {
            "match": {
              "content": "kubernetes security best practices"
            }
          },
          "should": [
            { "match": { "tags": "security" } },
            { "match": { "tags": "kubernetes" } }
          ]
        }
      },
      "functions": [
        {
          "gauss": {
            "publish_date": {
              "origin": "now",
              "scale": "30d",
              "offset": "7d",
              "decay": 0.5
            }
          },
          "weight": 2
        },
        {
          "filter": { "term": { "author_verified": true } },
          "weight": 1.5
        },
        {
          "field_value_factor": {
            "field": "shares",
            "factor": 0.05,
            "modifier": "log1p",
            "missing": 0
          }
        },
        {
          "script_score": {
            "script": {
              "source": """
                double views = doc['view_count'].value;
                double readTime = doc['avg_read_time_seconds'].size() > 0 ? doc['avg_read_time_seconds'].value : 0;
                double engagement = readTime > 0 ? views * (readTime / 60.0) : views;
                return Math.log(1 + engagement) * 0.1;
              """
            }
          }
        }
      ],
      "score_mode": "sum",
      "boost_mode": "sum"
    }
  }
}
```

### Local Business Search

Combine text matching with geographic proximity and ratings:

```json
{
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "must": {
            "match": { "name": "coffee shop" }
          },
          "filter": {
            "geo_distance": {
              "distance": "10km",
              "location": { "lat": 37.7749, "lon": -122.4194 }
            }
          }
        }
      },
      "functions": [
        {
          "gauss": {
            "location": {
              "origin": { "lat": 37.7749, "lon": -122.4194 },
              "scale": "1km",
              "offset": "200m",
              "decay": 0.5
            }
          },
          "weight": 3
        },
        {
          "filter": { "term": { "open_now": true } },
          "weight": 2
        },
        {
          "field_value_factor": {
            "field": "rating",
            "factor": 0.5,
            "modifier": "square",
            "missing": 3
          }
        },
        {
          "field_value_factor": {
            "field": "review_count",
            "factor": 0.01,
            "modifier": "log1p",
            "missing": 0
          }
        }
      ],
      "score_mode": "multiply",
      "boost_mode": "multiply"
    }
  }
}
```

---

## 10. Performance Considerations

Function score queries add computational overhead. Here are tips for keeping them fast:

### Use Filters Aggressively

Filters narrow down documents before scoring. Always filter first, score second:

```json
{
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "must": { "match": { "title": "elasticsearch" } },
          "filter": [
            { "term": { "status": "published" } },
            { "range": { "date": { "gte": "now-1y" } } }
          ]
        }
      },
      "functions": [...]
    }
  }
}
```

### Avoid Expensive Scripts on Large Result Sets

Script scoring runs on every matching document. For expensive calculations:

1. Pre-compute scores at index time when possible
2. Use `min_score` to filter low-scoring documents early
3. Consider using `rescore` for expensive scoring on top N results

Using rescore for expensive re-ranking:

```json
{
  "query": {
    "match": { "content": "machine learning" }
  },
  "rescore": {
    "window_size": 100,
    "query": {
      "rescore_query": {
        "function_score": {
          "script_score": {
            "script": {
              "source": "expensive_calculation_here"
            }
          }
        }
      },
      "query_weight": 0.7,
      "rescore_query_weight": 1.2
    }
  }
}
```

### Cache Field Values

Use doc values (enabled by default) for fields used in scoring. Avoid stored fields or _source access in scripts.

### Benchmark Different Approaches

Test query performance with realistic data volumes:

```bash
# Profile query execution
GET /my_index/_search
{
  "profile": true,
  "query": {
    "function_score": { ... }
  }
}
```

---

## 11. Debugging and Testing

### Explain API

Use `explain: true` to see how scores are calculated:

```json
GET /articles/_search
{
  "explain": true,
  "query": {
    "function_score": {
      "query": { "match": { "title": "elasticsearch" } },
      "functions": [
        {
          "gauss": {
            "date": { "origin": "now", "scale": "7d" }
          }
        }
      ]
    }
  }
}
```

The response includes detailed scoring breakdown for each document.

### Named Queries

Tag query parts to see which ones matched:

```json
{
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "should": [
            { "match": { "title": { "query": "search", "_name": "title_match" } } },
            { "match": { "content": { "query": "search", "_name": "content_match" } } }
          ]
        }
      },
      "functions": [...]
    }
  }
}
```

### Testing Score Changes

Compare scores before and after function_score changes:

```json
GET /products/_search
{
  "query": { "match": { "name": "laptop" } },
  "_source": ["name", "popularity"],
  "size": 5
}
```

Then with function_score:

```json
GET /products/_search
{
  "query": {
    "function_score": {
      "query": { "match": { "name": "laptop" } },
      "functions": [
        {
          "field_value_factor": {
            "field": "popularity",
            "modifier": "log1p"
          }
        }
      ]
    }
  },
  "_source": ["name", "popularity"],
  "size": 5
}
```

Compare the ordering and scores to verify your functions work as expected.

---

## Summary

Function score queries give you precise control over search relevance beyond text matching:

| Function | Best For |
|----------|----------|
| `weight` | Simple categorical boosts |
| `field_value_factor` | Numeric popularity signals |
| `gauss` / `exp` / `linear` | Distance-based decay (time, geo, price) |
| `script_score` | Custom multi-field calculations |

Key configuration options:

| Setting | Controls |
|---------|----------|
| `score_mode` | How multiple functions combine |
| `boost_mode` | How functions interact with query score |
| `max_boost` | Upper bound on function boost |
| `filter` | Which documents a function affects |

Start simple. Add one function at a time. Measure the impact on result quality and query performance. Use the explain API to verify your scoring logic.

---

**Further Reading:**
- [Elasticsearch Function Score Query Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-function-score-query.html)
- [Painless Scripting Language](https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-scripting-painless.html)
