# How to Implement Fuzzy Search in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Fuzzy Search, Typo Tolerance, Edit Distance, Search, UX

Description: A comprehensive guide to implementing fuzzy search in Elasticsearch for typo tolerance and approximate matching, covering fuzziness parameters, phonetic analysis, and best practices.

---

Fuzzy search allows finding matches even when users make typos or spelling mistakes. Elasticsearch supports fuzzy matching based on edit distance (Levenshtein distance), enabling more forgiving search experiences. This guide covers implementing effective fuzzy search.

## Understanding Fuzziness

Fuzziness measures how many character changes (edits) are needed to transform one string into another:

- `elasticsearch` to `elasticsearh` = 1 edit (missing 'c')
- `search` to `serch` = 1 edit (missing 'a')
- `query` to `qurey` = 1 edit (transposition)

Edit operations include:
- Inserting a character
- Deleting a character
- Substituting a character
- Transposing adjacent characters

## Basic Fuzzy Query

### Fuzzy Match Query

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": {
        "name": {
          "query": "elasticsearh",
          "fuzziness": "AUTO"
        }
      }
    }
  }'
```

### Fuzziness Values

- `0`, `1`, `2`: Exact number of edits allowed
- `AUTO`: Automatically sets based on term length
  - 0-2 characters: exact match
  - 3-5 characters: 1 edit allowed
  - > 5 characters: 2 edits allowed
- `AUTO:low,high`: Custom AUTO thresholds

```bash
# Custom AUTO thresholds
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": {
        "name": {
          "query": "laptp",
          "fuzziness": "AUTO:3,6"
        }
      }
    }
  }'
```

## Fuzzy Query Type

Direct fuzzy term query:

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "fuzzy": {
        "name": {
          "value": "elasticsearh",
          "fuzziness": 2,
          "prefix_length": 2,
          "max_expansions": 50,
          "transpositions": true
        }
      }
    }
  }'
```

### Parameters

- `fuzziness`: Maximum edit distance
- `prefix_length`: Characters at start that must match exactly
- `max_expansions`: Maximum terms to match
- `transpositions`: Allow character transpositions (default: true)

## Multi-Match with Fuzziness

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "wireles headpohnes",
        "fields": ["name^2", "description", "brand"],
        "fuzziness": "AUTO",
        "prefix_length": 1
      }
    }
  }'
```

## Combining Exact and Fuzzy Matching

Prefer exact matches but include fuzzy:

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "should": [
          {
            "match": {
              "name": {
                "query": "headphones",
                "boost": 2
              }
            }
          },
          {
            "match": {
              "name": {
                "query": "headphones",
                "fuzziness": "AUTO",
                "boost": 1
              }
            }
          }
        ]
      }
    }
  }'
```

## Fuzzy Completion Suggester

For autocomplete with typo tolerance:

```bash
curl -X PUT "https://localhost:9200/products-suggest" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "suggest": {
          "type": "completion"
        }
      }
    }
  }'

# Query with fuzziness
curl -X GET "https://localhost:9200/products-suggest/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "suggest": {
      "product-suggest": {
        "prefix": "headpohne",
        "completion": {
          "field": "suggest",
          "fuzzy": {
            "fuzziness": 2
          }
        }
      }
    }
  }'
```

## Phonetic Analysis

Match words that sound alike (soundex, metaphone):

### Install Phonetic Plugin

```bash
bin/elasticsearch-plugin install analysis-phonetic
```

### Configure Phonetic Analyzer

```bash
curl -X PUT "https://localhost:9200/products-phonetic" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "phonetic_filter": {
            "type": "phonetic",
            "encoder": "metaphone",
            "replace": false
          }
        },
        "analyzer": {
          "phonetic_analyzer": {
            "tokenizer": "standard",
            "filter": ["lowercase", "phonetic_filter"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "fields": {
            "phonetic": {
              "type": "text",
              "analyzer": "phonetic_analyzer"
            }
          }
        }
      }
    }
  }'
```

### Search with Phonetic

```bash
# "headfones" sounds like "headphones"
curl -X GET "https://localhost:9200/products-phonetic/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "headfones",
        "fields": ["name", "name.phonetic"]
      }
    }
  }'
```

### Phonetic Encoders

- `metaphone`: Default, good for English
- `double_metaphone`: More accurate, returns two codes
- `soundex`: Traditional algorithm
- `refined_soundex`: Improved soundex
- `caverphone1`, `caverphone2`: For NZ/UK names
- `cologne`: German phonetic
- `nysiis`: NY State ID system
- `koelnerphonetik`: German
- `haasephonetik`: German
- `beider_morse`: Multi-language

## N-gram Similarity

For partial matching with typos:

```bash
curl -X PUT "https://localhost:9200/products-ngram" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "ngram_filter": {
            "type": "ngram",
            "min_gram": 3,
            "max_gram": 4
          }
        },
        "analyzer": {
          "ngram_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "ngram_filter"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "analyzer": "ngram_analyzer",
          "search_analyzer": "standard"
        }
      }
    }
  }'
```

## "Did You Mean" Suggestions

Suggest corrections for misspellings:

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "suggest": {
      "text": "elasticsearh",
      "simple-phrase": {
        "phrase": {
          "field": "name",
          "size": 3,
          "gram_size": 2,
          "direct_generator": [{
            "field": "name",
            "suggest_mode": "popular"
          }],
          "highlight": {
            "pre_tag": "<em>",
            "post_tag": "</em>"
          }
        }
      }
    }
  }'
```

### Term Suggester

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "suggest": {
      "spell-check": {
        "text": "headpohnes",
        "term": {
          "field": "name",
          "suggest_mode": "popular",
          "sort": "frequency",
          "string_distance": "internal"
        }
      }
    }
  }'
```

## Complete Fuzzy Search Implementation

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "should": [
          {
            "multi_match": {
              "query": "wireles headpohnes",
              "fields": ["name^3", "brand^2", "description"],
              "type": "best_fields",
              "boost": 3
            }
          },
          {
            "multi_match": {
              "query": "wireles headpohnes",
              "fields": ["name^3", "brand^2", "description"],
              "type": "best_fields",
              "fuzziness": "AUTO",
              "prefix_length": 2,
              "boost": 1
            }
          },
          {
            "match": {
              "name.phonetic": {
                "query": "wireles headpohnes",
                "boost": 0.5
              }
            }
          }
        ],
        "minimum_should_match": 1
      }
    },
    "suggest": {
      "spelling": {
        "text": "wireles headpohnes",
        "phrase": {
          "field": "name",
          "size": 3,
          "gram_size": 2,
          "direct_generator": [{
            "field": "name",
            "suggest_mode": "popular"
          }]
        }
      }
    },
    "highlight": {
      "fields": {
        "name": {},
        "description": { "fragment_size": 100 }
      }
    }
  }'
```

## Performance Considerations

### 1. Use Prefix Length

Require first N characters to match exactly:

```json
{
  "fuzzy": {
    "name": {
      "value": "elasticsearch",
      "prefix_length": 3
    }
  }
}
```

### 2. Limit Max Expansions

```json
{
  "fuzzy": {
    "name": {
      "value": "search",
      "max_expansions": 50
    }
  }
}
```

### 3. Use AUTO Fuzziness

Let Elasticsearch optimize based on term length:

```json
{
  "match": {
    "name": {
      "query": "search",
      "fuzziness": "AUTO"
    }
  }
}
```

### 4. Avoid Fuzzy on High-Cardinality Fields

Fuzzy queries on fields with many unique values can be slow.

## Best Practices

1. **Use AUTO fuzziness** - Adapts to query length
2. **Set prefix_length** - Improves performance, reduces false positives
3. **Boost exact matches** - Users likely mean what they typed
4. **Combine with suggestions** - Show "Did you mean?"
5. **Consider phonetic matching** - For names and spoken queries
6. **Test with real typos** - Use actual user query logs

## Conclusion

Fuzzy search improves user experience by handling typos gracefully. Key takeaways:

1. **Use fuzziness in match queries** for simple typo tolerance
2. **Combine exact and fuzzy** for best results
3. **Add phonetic analysis** for sound-alike matching
4. **Provide suggestions** for misspellings
5. **Optimize performance** with prefix_length and max_expansions

With proper fuzzy search implementation, users can find what they need even when they cannot spell it perfectly.
