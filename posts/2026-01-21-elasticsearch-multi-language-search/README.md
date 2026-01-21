# How to Use Elasticsearch for Multi-Language Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Multi-Language, Internationalization, i18n, Search, Text Analysis

Description: A comprehensive guide to implementing multi-language search in Elasticsearch, covering language detection, language-specific analyzers, and strategies for multilingual content.

---

Building search for multilingual content requires careful consideration of how different languages are analyzed and queried. Elasticsearch provides language-specific analyzers and strategies for handling content in multiple languages. This guide covers everything you need for effective multi-language search.

## Challenges of Multi-Language Search

Different languages have different:

- **Tokenization rules**: Chinese has no spaces, German has compound words
- **Stemming algorithms**: Each language stems differently
- **Stop words**: Common words vary by language
- **Character sets**: Accents, special characters, different scripts

## Single Language Index

### Using Language Analyzers

```bash
curl -X PUT "https://localhost:9200/articles_english" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "title": {
          "type": "text",
          "analyzer": "english"
        },
        "content": {
          "type": "text",
          "analyzer": "english"
        }
      }
    }
  }'
```

### Available Language Analyzers

```bash
# Test different language analyzers
curl -X POST "https://localhost:9200/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "german",
    "text": "Die schnellen Autos fahren"
  }'

curl -X POST "https://localhost:9200/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "french",
    "text": "Les voitures rapides roulent"
  }'

curl -X POST "https://localhost:9200/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "spanish",
    "text": "Los coches rapidos conducen"
  }'
```

## Multi-Field Strategy

Index the same content with multiple language analyzers:

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "title": {
          "type": "text",
          "analyzer": "standard",
          "fields": {
            "english": {
              "type": "text",
              "analyzer": "english"
            },
            "german": {
              "type": "text",
              "analyzer": "german"
            },
            "french": {
              "type": "text",
              "analyzer": "french"
            },
            "spanish": {
              "type": "text",
              "analyzer": "spanish"
            }
          }
        },
        "content": {
          "type": "text",
          "analyzer": "standard",
          "fields": {
            "english": {
              "type": "text",
              "analyzer": "english"
            },
            "german": {
              "type": "text",
              "analyzer": "german"
            },
            "french": {
              "type": "text",
              "analyzer": "french"
            },
            "spanish": {
              "type": "text",
              "analyzer": "spanish"
            }
          }
        },
        "language": {
          "type": "keyword"
        }
      }
    }
  }'
```

### Query Specific Language

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "must": [
          {
            "match": {
              "content.german": "schnelle Autos"
            }
          }
        ],
        "filter": [
          {
            "term": {
              "language": "de"
            }
          }
        ]
      }
    }
  }'
```

### Query All Languages

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "fast cars",
        "fields": [
          "title^2",
          "title.english^2",
          "content",
          "content.english"
        ]
      }
    }
  }'
```

## Language Per Index Strategy

Create separate indices for each language:

```bash
# English index
curl -X PUT "https://localhost:9200/articles_en" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "title": { "type": "text", "analyzer": "english" },
        "content": { "type": "text", "analyzer": "english" }
      }
    }
  }'

# German index
curl -X PUT "https://localhost:9200/articles_de" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "title": { "type": "text", "analyzer": "german" },
        "content": { "type": "text", "analyzer": "german" }
      }
    }
  }'

# French index
curl -X PUT "https://localhost:9200/articles_fr" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "title": { "type": "text", "analyzer": "french" },
        "content": { "type": "text", "analyzer": "french" }
      }
    }
  }'
```

### Search Specific Language Index

```bash
curl -X GET "https://localhost:9200/articles_de/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": {
        "content": "schnelle Autos"
      }
    }
  }'
```

### Search All Language Indices

```bash
curl -X GET "https://localhost:9200/articles_*/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "cars",
        "fields": ["title", "content"]
      }
    }
  }'
```

### Use Index Aliases

```bash
# Create alias for all language indices
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      { "add": { "index": "articles_en", "alias": "articles_all" } },
      { "add": { "index": "articles_de", "alias": "articles_all" } },
      { "add": { "index": "articles_fr", "alias": "articles_all" } }
    ]
  }'

# Search through alias
curl -X GET "https://localhost:9200/articles_all/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": {
        "content": "technology"
      }
    }
  }'
```

## Language Detection

### Using the Langdetect Plugin

Install the plugin:

```bash
bin/elasticsearch-plugin install org.elasticsearch:elasticsearch-analysis-langdetect:7.17.0
```

Configure language detection:

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "langdetect": {
            "type": "langdetect"
          }
        },
        "analyzer": {
          "langdetect_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["langdetect"]
          }
        }
      }
    }
  }'
```

### Detect at Ingest Time

Use an ingest pipeline:

```bash
curl -X PUT "https://localhost:9200/_ingest/pipeline/detect_language" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "description": "Detect language of content",
    "processors": [
      {
        "script": {
          "source": "ctx.language = ctx.content.substring(0, Math.min(500, ctx.content.length()))"
        }
      },
      {
        "inference": {
          "model_id": "lang_ident_model_1",
          "target_field": "ml",
          "field_map": {
            "language": "text"
          }
        }
      },
      {
        "set": {
          "field": "detected_language",
          "value": "{{ml.predicted_value}}"
        }
      },
      {
        "remove": {
          "field": ["ml", "language"]
        }
      }
    ]
  }'
```

### Application-Side Detection

Detect language before indexing:

```python
from langdetect import detect

def index_document(es, content, title):
    language = detect(content)

    doc = {
        "title": title,
        "content": content,
        "language": language
    }

    # Index to language-specific index
    index_name = f"articles_{language}"
    es.index(index=index_name, body=doc)
```

## Custom Language Analyzers

### Enhanced English Analyzer

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "english_stop": {
            "type": "stop",
            "stopwords": "_english_"
          },
          "english_stemmer": {
            "type": "stemmer",
            "language": "english"
          },
          "english_possessive_stemmer": {
            "type": "stemmer",
            "language": "possessive_english"
          }
        },
        "analyzer": {
          "custom_english": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": [
              "english_possessive_stemmer",
              "lowercase",
              "english_stop",
              "english_stemmer"
            ]
          }
        }
      }
    }
  }'
```

### German Analyzer with Decomposition

German has compound words that need decomposition:

```bash
curl -X PUT "https://localhost:9200/articles_de" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "german_stop": {
            "type": "stop",
            "stopwords": "_german_"
          },
          "german_stemmer": {
            "type": "stemmer",
            "language": "light_german"
          },
          "german_decompounder": {
            "type": "hyphenation_decompounder",
            "word_list_path": "analysis/de_DR.xml",
            "hyphenation_patterns_path": "analysis/de_DR.xml",
            "only_longest_match": true,
            "min_subword_size": 4
          }
        },
        "analyzer": {
          "german_custom": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": [
              "lowercase",
              "german_decompounder",
              "german_stop",
              "german_stemmer"
            ]
          }
        }
      }
    }
  }'
```

## CJK Languages (Chinese, Japanese, Korean)

### Chinese with ICU

```bash
# Install ICU plugin
bin/elasticsearch-plugin install analysis-icu

curl -X PUT "https://localhost:9200/articles_zh" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "chinese_analyzer": {
            "type": "custom",
            "tokenizer": "icu_tokenizer",
            "filter": ["icu_normalizer", "icu_folding"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "content": {
          "type": "text",
          "analyzer": "chinese_analyzer"
        }
      }
    }
  }'
```

### Japanese with Kuromoji

```bash
# Install Kuromoji plugin
bin/elasticsearch-plugin install analysis-kuromoji

curl -X PUT "https://localhost:9200/articles_ja" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "japanese_analyzer": {
            "type": "custom",
            "tokenizer": "kuromoji_tokenizer",
            "filter": [
              "kuromoji_baseform",
              "kuromoji_part_of_speech",
              "kuromoji_stemmer"
            ]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "content": {
          "type": "text",
          "analyzer": "japanese_analyzer"
        }
      }
    }
  }'
```

### Korean with Nori

```bash
# Install Nori plugin
bin/elasticsearch-plugin install analysis-nori

curl -X PUT "https://localhost:9200/articles_ko" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "korean_analyzer": {
            "type": "custom",
            "tokenizer": "nori_tokenizer",
            "filter": ["nori_part_of_speech"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "content": {
          "type": "text",
          "analyzer": "korean_analyzer"
        }
      }
    }
  }'
```

## Handling Mixed Language Content

For content that mixes languages:

```bash
curl -X PUT "https://localhost:9200/mixed_content" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "content": {
          "type": "text",
          "analyzer": "standard",
          "fields": {
            "english": {
              "type": "text",
              "analyzer": "english"
            },
            "german": {
              "type": "text",
              "analyzer": "german"
            },
            "icu": {
              "type": "text",
              "analyzer": "icu_analyzer"
            }
          }
        }
      }
    }
  }'
```

Query with multiple fields:

```bash
curl -X GET "https://localhost:9200/mixed_content/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "technology",
        "fields": ["content", "content.english", "content.german", "content.icu"],
        "type": "most_fields"
      }
    }
  }'
```

## ICU Analysis Plugin

The ICU plugin provides comprehensive Unicode support:

```bash
# Install
bin/elasticsearch-plugin install analysis-icu

# Configure
curl -X PUT "https://localhost:9200/international" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "icu_analyzer": {
            "type": "custom",
            "tokenizer": "icu_tokenizer",
            "filter": [
              "icu_normalizer",
              "icu_folding",
              "lowercase"
            ]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "content": {
          "type": "text",
          "analyzer": "icu_analyzer"
        }
      }
    }
  }'
```

ICU components:

- **icu_tokenizer**: Smart tokenization for all languages
- **icu_normalizer**: Unicode normalization (NFC, NFKC)
- **icu_folding**: Accent folding
- **icu_collation**: Language-aware sorting

## Complete Multi-Language Setup

```bash
curl -X PUT "https://localhost:9200/global_articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "english_stop": {
            "type": "stop",
            "stopwords": "_english_"
          },
          "english_stemmer": {
            "type": "stemmer",
            "language": "english"
          },
          "german_stop": {
            "type": "stop",
            "stopwords": "_german_"
          },
          "german_stemmer": {
            "type": "stemmer",
            "language": "light_german"
          }
        },
        "analyzer": {
          "default_analyzer": {
            "type": "custom",
            "tokenizer": "icu_tokenizer",
            "filter": ["icu_normalizer", "icu_folding", "lowercase"]
          },
          "english_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "english_stop", "english_stemmer"]
          },
          "german_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "german_stop", "german_stemmer"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "title": {
          "type": "text",
          "analyzer": "default_analyzer",
          "fields": {
            "en": { "type": "text", "analyzer": "english_analyzer" },
            "de": { "type": "text", "analyzer": "german_analyzer" }
          }
        },
        "content": {
          "type": "text",
          "analyzer": "default_analyzer",
          "fields": {
            "en": { "type": "text", "analyzer": "english_analyzer" },
            "de": { "type": "text", "analyzer": "german_analyzer" }
          }
        },
        "language": {
          "type": "keyword"
        }
      }
    }
  }'

# Index documents
curl -X POST "https://localhost:9200/global_articles/_bulk" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '
{"index":{}}
{"title":"Fast Cars in Germany","content":"The automotive industry produces fast cars","language":"en"}
{"index":{}}
{"title":"Schnelle Autos in Deutschland","content":"Die Automobilindustrie produziert schnelle Autos","language":"de"}
'

# Search with language preference
curl -X GET "https://localhost:9200/global_articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "should": [
          {
            "multi_match": {
              "query": "fast cars",
              "fields": ["title.en^2", "content.en"],
              "boost": 2
            }
          },
          {
            "multi_match": {
              "query": "fast cars",
              "fields": ["title^1.5", "content"]
            }
          }
        ],
        "filter": [
          { "term": { "language": "en" } }
        ]
      }
    }
  }'
```

## Best Practices

### 1. Know Your Languages

Different languages need different strategies. Test with native speakers.

### 2. Use Language-Specific Analyzers

The built-in language analyzers are well-tuned.

### 3. Store Language Metadata

Always store the document language for filtering.

### 4. Consider Index-Per-Language

For very different languages, separate indices work best.

### 5. Use ICU for Unknown Languages

The ICU plugin handles many languages gracefully.

### 6. Test with Real Content

Test analyzers with actual content in each language.

### 7. Handle Detection Errors

Language detection is not perfect - have fallback strategies.

## Conclusion

Multi-language search requires thoughtful architecture:

1. **Choose the right strategy** - multi-field, index-per-language, or mixed
2. **Use appropriate analyzers** - language-specific or ICU
3. **Detect language** - at ingest or query time
4. **Test thoroughly** - with native content and speakers
5. **Store language metadata** - for filtering and routing

With proper configuration, Elasticsearch can provide excellent search across multiple languages and scripts.
