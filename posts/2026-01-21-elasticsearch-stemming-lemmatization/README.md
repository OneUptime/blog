# How to Implement Stemming and Lemmatization in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Stemming, Lemmatization, Text Analysis, NLP, Search

Description: A comprehensive guide to implementing stemming and lemmatization in Elasticsearch for matching root words, covering stemmer algorithms, language support, and best practices.

---

Stemming and lemmatization help search match different forms of the same word. When a user searches for "running", they should also find documents containing "run", "runs", and "ran". Elasticsearch provides multiple stemming algorithms and options for root word matching. This guide covers implementing effective stemming strategies.

## Stemming vs Lemmatization

**Stemming** reduces words to their stem by removing suffixes:
- "running" -> "run"
- "cats" -> "cat"
- "better" -> "better" (may not handle irregular forms)

**Lemmatization** uses vocabulary and morphology to find the base form:
- "running" -> "run"
- "better" -> "good"
- "are" -> "be"

Elasticsearch primarily uses stemming, which is faster and sufficient for most search applications.

## Built-in Language Analyzers with Stemming

Language analyzers include stemming by default:

```bash
curl -X POST "https://localhost:9200/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "english",
    "text": "The runners were running quickly"
  }'
```

Output tokens: `[runner, run, quick]`

## Stemmer Token Filters

### Algorithmic Stemmers

Elasticsearch supports multiple stemming algorithms:

```bash
# Porter Stemmer (English)
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "porter_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "porter_stem"]
          }
        }
      }
    }
  }'
```

Test the stemmer:

```bash
curl -X POST "https://localhost:9200/articles/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "porter_analyzer",
    "text": "running runners run"
  }'
```

### Snowball Stemmer

More configurable, supports multiple languages:

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "english_snowball": {
            "type": "snowball",
            "language": "English"
          }
        },
        "analyzer": {
          "snowball_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "english_snowball"]
          }
        }
      }
    }
  }'
```

Supported Snowball languages:
- Arabic, Armenian, Basque, Catalan, Danish
- Dutch, English, Finnish, French, German
- German2, Hungarian, Italian, Kp, Lithuanian
- Lovins, Norwegian, Porter, Portuguese, Romanian
- Russian, Spanish, Swedish, Turkish

### Stemmer Filter

Generic stemmer with language parameter:

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "my_stemmer": {
            "type": "stemmer",
            "language": "english"
          }
        },
        "analyzer": {
          "stem_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "my_stemmer"]
          }
        }
      }
    }
  }'
```

Available stemmer languages:
- arabic, armenian, basque, bengali, brazilian
- bulgarian, catalan, czech, danish, dutch
- dutch_kp, english, light_english, minimal_english
- porter2, possessive_english, finnish, light_finnish
- french, light_french, minimal_french, galician
- minimal_galician, german, german2, light_german
- minimal_german, greek, hindi, hungarian
- light_hungarian, indonesian, irish, italian
- light_italian, sorani, latvian, lithuanian
- norwegian, light_norwegian, minimal_norwegian
- portuguese, light_portuguese, minimal_portuguese
- romanian, russian, light_russian, spanish
- light_spanish, swedish, light_swedish, turkish

### Comparing Stemmers

```bash
# Test different stemmers on the same text
curl -X PUT "https://localhost:9200/stemmer_test" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "porter": {
            "type": "stemmer",
            "language": "porter2"
          },
          "light": {
            "type": "stemmer",
            "language": "light_english"
          },
          "minimal": {
            "type": "stemmer",
            "language": "minimal_english"
          }
        },
        "analyzer": {
          "porter_analyzer": {
            "tokenizer": "standard",
            "filter": ["lowercase", "porter"]
          },
          "light_analyzer": {
            "tokenizer": "standard",
            "filter": ["lowercase", "light"]
          },
          "minimal_analyzer": {
            "tokenizer": "standard",
            "filter": ["lowercase", "minimal"]
          }
        }
      }
    }
  }'

# Compare results
curl -X POST "https://localhost:9200/stemmer_test/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "porter_analyzer",
    "text": "generalization generalizations generalize generalizing"
  }'
```

## Controlling Stemming Aggressiveness

### Light Stemming

Less aggressive, preserves more word forms:

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "light_english_stemmer": {
            "type": "stemmer",
            "language": "light_english"
          }
        },
        "analyzer": {
          "light_stem": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "light_english_stemmer"]
          }
        }
      }
    }
  }'
```

### Minimal Stemming

Most conservative, only removes obvious suffixes:

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "minimal_english_stemmer": {
            "type": "stemmer",
            "language": "minimal_english"
          }
        },
        "analyzer": {
          "minimal_stem": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "minimal_english_stemmer"]
          }
        }
      }
    }
  }'
```

## Stemmer Override Filter

Define exact stem mappings:

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "my_overrides": {
            "type": "stemmer_override",
            "rules": [
              "running, ran, runs => run",
              "better, best => good",
              "mice => mouse"
            ]
          },
          "english_stemmer": {
            "type": "stemmer",
            "language": "english"
          }
        },
        "analyzer": {
          "override_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "my_overrides", "english_stemmer"]
          }
        }
      }
    }
  }'
```

### Using Override Files

For many overrides, use a file:

Create `/etc/elasticsearch/analysis/stem_overrides.txt`:

```
running, ran, runs => run
better, best => good
mice => mouse
feet => foot
children => child
```

Configure:

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "stem_overrides": {
            "type": "stemmer_override",
            "rules_path": "analysis/stem_overrides.txt"
          }
        }
      }
    }
  }'
```

## Keyword Marker Filter

Protect specific words from stemming:

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "keyword_marker": {
            "type": "keyword_marker",
            "keywords": ["running", "skiing", "programming"]
          },
          "english_stemmer": {
            "type": "stemmer",
            "language": "english"
          }
        },
        "analyzer": {
          "protected_stem": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "keyword_marker", "english_stemmer"]
          }
        }
      }
    }
  }'
```

Now "running" remains "running" while other words are stemmed.

### Pattern-Based Protection

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "keyword_pattern": {
            "type": "keyword_marker",
            "keywords_pattern": ".*ing$"
          }
        },
        "analyzer": {
          "pattern_protected": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "keyword_pattern", "english_stemmer"]
          }
        }
      }
    }
  }'
```

## Possessive Stemmer

Handle English possessives:

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "possessive": {
            "type": "stemmer",
            "language": "possessive_english"
          },
          "english_stemmer": {
            "type": "stemmer",
            "language": "english"
          }
        },
        "analyzer": {
          "english_with_possessive": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "possessive", "english_stemmer"]
          }
        }
      }
    }
  }'
```

Test:

```bash
curl -X POST "https://localhost:9200/articles/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "english_with_possessive",
    "text": "John'\''s running shoes"
  }'
```

Result: `[john, run, shoe]`

## Hunspell Stemmer

Dictionary-based stemming:

```bash
# First, add dictionary files to config/hunspell/en_US/
# - en_US.dic
# - en_US.aff

curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "hunspell_stem": {
            "type": "hunspell",
            "locale": "en_US",
            "dedup": true
          }
        },
        "analyzer": {
          "hunspell_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "hunspell_stem"]
          }
        }
      }
    }
  }'
```

## Multi-Field with Different Stemming

Index content with multiple stemming strategies:

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "porter_stem": {
            "type": "stemmer",
            "language": "porter2"
          },
          "light_stem": {
            "type": "stemmer",
            "language": "light_english"
          }
        },
        "analyzer": {
          "no_stem": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase"]
          },
          "porter_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "porter_stem"]
          },
          "light_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "light_stem"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "content": {
          "type": "text",
          "analyzer": "no_stem",
          "fields": {
            "porter": {
              "type": "text",
              "analyzer": "porter_analyzer"
            },
            "light": {
              "type": "text",
              "analyzer": "light_analyzer"
            }
          }
        }
      }
    }
  }'
```

Query with boosting:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "running",
        "fields": ["content^3", "content.light^2", "content.porter"],
        "type": "most_fields"
      }
    }
  }'
```

## Language-Specific Stemming

### German Stemming

```bash
curl -X PUT "https://localhost:9200/articles_de" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "german_stemmer": {
            "type": "stemmer",
            "language": "light_german"
          },
          "german_stop": {
            "type": "stop",
            "stopwords": "_german_"
          }
        },
        "analyzer": {
          "german_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "german_stop", "german_stemmer"]
          }
        }
      }
    }
  }'
```

### French Stemming

```bash
curl -X PUT "https://localhost:9200/articles_fr" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "french_stemmer": {
            "type": "stemmer",
            "language": "light_french"
          },
          "french_stop": {
            "type": "stop",
            "stopwords": "_french_"
          },
          "french_elision": {
            "type": "elision",
            "articles": ["l", "m", "t", "qu", "n", "s", "j", "d", "c"]
          }
        },
        "analyzer": {
          "french_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["french_elision", "lowercase", "french_stop", "french_stemmer"]
          }
        }
      }
    }
  }'
```

## Complete Stemming Setup

```bash
curl -X PUT "https://localhost:9200/search_index" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "possessive_stemmer": {
            "type": "stemmer",
            "language": "possessive_english"
          },
          "english_stemmer": {
            "type": "stemmer",
            "language": "light_english"
          },
          "english_stop": {
            "type": "stop",
            "stopwords": "_english_"
          },
          "protected_words": {
            "type": "keyword_marker",
            "keywords": ["elasticsearch", "kibana", "logstash"]
          },
          "stem_overrides": {
            "type": "stemmer_override",
            "rules": [
              "running, ran, runs => run",
              "indices, indexes => index"
            ]
          }
        },
        "analyzer": {
          "english_search": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": [
              "possessive_stemmer",
              "lowercase",
              "english_stop",
              "protected_words",
              "stem_overrides",
              "english_stemmer"
            ]
          },
          "english_exact": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "title": {
          "type": "text",
          "analyzer": "english_search",
          "fields": {
            "exact": {
              "type": "text",
              "analyzer": "english_exact"
            }
          }
        },
        "content": {
          "type": "text",
          "analyzer": "english_search",
          "fields": {
            "exact": {
              "type": "text",
              "analyzer": "english_exact"
            }
          }
        }
      }
    }
  }'

# Index documents
curl -X POST "https://localhost:9200/search_index/_bulk" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '
{"index":{}}
{"title":"Running with Elasticsearch","content":"Learn how running queries works in Elasticsearch indices"}
{"index":{}}
{"title":"The Runner'\''s Guide","content":"A guide for runners who run daily"}
'

# Search
curl -X GET "https://localhost:9200/search_index/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "should": [
          {
            "multi_match": {
              "query": "running",
              "fields": ["title.exact^2", "content.exact^2"],
              "boost": 2
            }
          },
          {
            "multi_match": {
              "query": "running",
              "fields": ["title", "content"]
            }
          }
        ]
      }
    }
  }'
```

## Testing Stemming Quality

### Analyze API

```bash
# Test stemmer output
curl -X POST "https://localhost:9200/search_index/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "english_search",
    "text": "The runners were running quickly through the running track"
  }'
```

### Explain API

```bash
curl -X GET "https://localhost:9200/search_index/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "explain": true,
    "query": {
      "match": {
        "content": "running"
      }
    }
  }'
```

## Best Practices

### 1. Choose Appropriate Aggressiveness

- **Aggressive (Porter)**: More recall, risk of false matches
- **Light**: Good balance for most use cases
- **Minimal**: Higher precision, less recall

### 2. Protect Important Terms

Use keyword_marker for technical terms, brand names, etc.

### 3. Use Stemmer Override for Exceptions

Handle irregular forms and domain-specific terms.

### 4. Combine with Multi-Fields

Index both stemmed and unstemmed for flexible querying.

### 5. Test with Real Queries

Use actual user queries to validate stemming quality.

### 6. Consider Language

Use appropriate language-specific stemmers.

### 7. Order Filters Correctly

```
lowercase -> stop words -> protected words -> stemmer override -> stemmer
```

## Conclusion

Stemming is essential for effective search:

1. **Language analyzers** include appropriate stemming
2. **Stemmer filters** provide fine-grained control
3. **Light stemming** balances recall and precision
4. **Keyword marker** protects specific terms
5. **Multi-field** enables flexible search strategies

Proper stemming configuration ensures users find relevant results regardless of word forms they use in their queries.
