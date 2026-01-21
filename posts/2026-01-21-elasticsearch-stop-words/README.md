# How to Handle Stop Words in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Stop Words, Text Analysis, Search, Indexing, Performance

Description: A comprehensive guide to handling stop words in Elasticsearch, covering built-in stop word lists, custom stop words, language-specific configuration, and best practices for search relevance.

---

Stop words are common words like "the", "is", and "at" that typically do not add meaning to search queries. Elasticsearch can filter these words during indexing and searching to improve performance and relevance. This guide covers everything you need to know about configuring stop words effectively.

## What Are Stop Words

Stop words are frequently occurring words that provide little semantic value:

- English: the, is, at, which, on, a, an, and, or, but
- German: der, die, das, und, ist, ein, eine
- French: le, la, les, de, du, et, est, un, une

Removing stop words:
- Reduces index size
- Improves query performance
- Can improve search relevance

## Built-in Stop Word Lists

Elasticsearch includes predefined stop word lists for many languages:

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
          }
        },
        "analyzer": {
          "english_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "english_stop"]
          }
        }
      }
    }
  }'
```

### Available Language Stop Lists

```bash
# Test different language stop words
curl -X POST "https://localhost:9200/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "tokenizer": "standard",
    "filter": [
      "lowercase",
      { "type": "stop", "stopwords": "_german_" }
    ],
    "text": "Der schnelle braune Fuchs springt"
  }'
```

Supported languages:
- `_arabic_`, `_armenian_`, `_basque_`, `_bengali_`
- `_brazilian_`, `_bulgarian_`, `_catalan_`, `_cjk_`
- `_czech_`, `_danish_`, `_dutch_`, `_english_`
- `_estonian_`, `_finnish_`, `_french_`, `_galician_`
- `_german_`, `_greek_`, `_hindi_`, `_hungarian_`
- `_indonesian_`, `_irish_`, `_italian_`, `_latvian_`
- `_lithuanian_`, `_norwegian_`, `_persian_`, `_portuguese_`
- `_romanian_`, `_russian_`, `_sorani_`, `_spanish_`
- `_swedish_`, `_thai_`, `_turkish_`

Special values:
- `_none_`: No stop words (empty list)

## Custom Stop Word Lists

### Inline List

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "custom_stop": {
            "type": "stop",
            "stopwords": ["the", "a", "an", "and", "or", "but", "is", "are", "was", "were"]
          }
        },
        "analyzer": {
          "custom_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "custom_stop"]
          }
        }
      }
    }
  }'
```

### Stop Words File

Create `/etc/elasticsearch/analysis/stopwords.txt`:

```
# English stop words
the
a
an
and
or
but
is
are
was
were
be
been
being
have
has
had
do
does
did
will
would
could
should
may
might
must
shall
can
need
dare
ought
used
to
of
in
for
on
with
at
by
from
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
          "file_stop": {
            "type": "stop",
            "stopwords_path": "analysis/stopwords.txt"
          }
        },
        "analyzer": {
          "file_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "file_stop"]
          }
        }
      }
    }
  }'
```

## Combining Built-in and Custom Stop Words

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "combined_stop": {
            "type": "stop",
            "stopwords": ["_english_", "custom1", "custom2", "custom3"]
          }
        },
        "analyzer": {
          "combined_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "combined_stop"]
          }
        }
      }
    }
  }'
```

## Language Analyzers Include Stop Words

Built-in language analyzers have stop words configured:

```bash
curl -X POST "https://localhost:9200/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "english",
    "text": "The quick brown fox is running"
  }'
```

Output: `[quick, brown, fox, run]` (stop words removed, stemmed)

### Customize Language Analyzer Stop Words

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "custom_english": {
            "type": "english",
            "stopwords": ["the", "a", "is"]
          }
        }
      }
    }
  }'
```

## No Stop Words

Disable stop words entirely:

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "no_stop_english": {
            "type": "english",
            "stopwords": "_none_"
          }
        }
      }
    }
  }'
```

Or use standard analyzer without stop filter:

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "no_stop": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase"]
          }
        }
      }
    }
  }'
```

## Case Sensitivity

Stop words are case sensitive - apply lowercase first:

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
          }
        },
        "analyzer": {
          "proper_order": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "english_stop"]
          }
        }
      }
    }
  }'
```

Without lowercase, "The" would not match "the" in the stop list.

## Ignore Case Option

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "case_insensitive_stop": {
            "type": "stop",
            "stopwords": ["The", "A", "An"],
            "ignore_case": true
          }
        },
        "analyzer": {
          "ignore_case_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["case_insensitive_stop"]
          }
        }
      }
    }
  }'
```

## Remove Trailing Stop Words

Remove stop words only at the end of phrases:

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "trailing_stop": {
            "type": "stop",
            "stopwords": "_english_",
            "remove_trailing": true
          }
        },
        "analyzer": {
          "trailing_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "trailing_stop"]
          }
        }
      }
    }
  }'
```

## Index-Time vs Search-Time

### Index-Time Only

Stop words removed during indexing:

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
          }
        },
        "analyzer": {
          "index_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "english_stop"]
          },
          "search_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "content": {
          "type": "text",
          "analyzer": "index_analyzer",
          "search_analyzer": "search_analyzer"
        }
      }
    }
  }'
```

### Search-Time Only

Keep stop words in index but remove from queries:

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
          }
        },
        "analyzer": {
          "index_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase"]
          },
          "search_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "english_stop"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "content": {
          "type": "text",
          "analyzer": "index_analyzer",
          "search_analyzer": "search_analyzer"
        }
      }
    }
  }'
```

## Domain-Specific Stop Words

Different domains need different stop words:

### E-commerce

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "ecommerce_stop": {
            "type": "stop",
            "stopwords": [
              "the", "a", "an", "and", "or", "but",
              "buy", "shop", "product", "item", "sale",
              "new", "best", "top", "great", "good"
            ]
          }
        },
        "analyzer": {
          "product_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "ecommerce_stop"]
          }
        }
      }
    }
  }'
```

### Legal Documents

```bash
curl -X PUT "https://localhost:9200/legal" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "legal_stop": {
            "type": "stop",
            "stopwords": [
              "the", "a", "an", "and", "or",
              "herein", "hereinafter", "hereby", "hereto",
              "whereas", "therefore", "thereto", "thereof"
            ]
          }
        },
        "analyzer": {
          "legal_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "legal_stop"]
          }
        }
      }
    }
  }'
```

## Multi-Field Strategy

Keep both versions for different use cases:

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
          }
        },
        "analyzer": {
          "with_stops": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase"]
          },
          "without_stops": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "english_stop"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "content": {
          "type": "text",
          "analyzer": "with_stops",
          "fields": {
            "no_stops": {
              "type": "text",
              "analyzer": "without_stops"
            }
          }
        }
      }
    }
  }'
```

Query with both:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "should": [
          {
            "match": {
              "content": {
                "query": "to be or not to be",
                "boost": 2
              }
            }
          },
          {
            "match": {
              "content.no_stops": "to be or not to be"
            }
          }
        ]
      }
    }
  }'
```

## Complete Configuration Example

```bash
curl -X PUT "https://localhost:9200/search_index" \
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
          "custom_stop": {
            "type": "stop",
            "stopwords": ["www", "http", "https", "com", "org", "net"]
          },
          "english_stemmer": {
            "type": "stemmer",
            "language": "english"
          }
        },
        "analyzer": {
          "full_text_index": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": [
              "lowercase",
              "english_stop",
              "custom_stop",
              "english_stemmer"
            ]
          },
          "full_text_search": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": [
              "lowercase",
              "english_stop",
              "english_stemmer"
            ]
          },
          "exact_match": {
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
          "analyzer": "full_text_index",
          "search_analyzer": "full_text_search",
          "fields": {
            "exact": {
              "type": "text",
              "analyzer": "exact_match"
            },
            "keyword": {
              "type": "keyword"
            }
          }
        },
        "content": {
          "type": "text",
          "analyzer": "full_text_index",
          "search_analyzer": "full_text_search",
          "fields": {
            "exact": {
              "type": "text",
              "analyzer": "exact_match"
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
{"title":"The Quick Brown Fox","content":"The quick brown fox jumps over the lazy dog"}
{"index":{}}
{"title":"To Be Or Not To Be","content":"That is the question that has been asked for centuries"}
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
            "match_phrase": {
              "title.exact": {
                "query": "to be or not to be",
                "boost": 3
              }
            }
          },
          {
            "match": {
              "title": {
                "query": "to be or not to be",
                "boost": 1
              }
            }
          }
        ]
      }
    }
  }'
```

## Testing Stop Words

### Analyze API

```bash
# With stop words
curl -X POST "https://localhost:9200/search_index/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "full_text_index",
    "text": "The quick brown fox is running"
  }'

# Without stop words
curl -X POST "https://localhost:9200/search_index/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "exact_match",
    "text": "The quick brown fox is running"
  }'
```

## When NOT to Remove Stop Words

Some cases where stop words matter:

### Phrase Queries

"To be or not to be" needs stop words:

```bash
curl -X GET "https://localhost:9200/articles/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match_phrase": {
        "content.exact": "to be or not to be"
      }
    }
  }'
```

### Song/Book Titles

"The Who", "A-ha", "The The":

```bash
curl -X PUT "https://localhost:9200/music" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "artist": {
          "type": "text",
          "analyzer": "standard",
          "fields": {
            "keyword": { "type": "keyword" }
          }
        }
      }
    }
  }'
```

### Technical Terms

"The Hague", "The Bronx", "vitamin A":

```bash
curl -X PUT "https://localhost:9200/places" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "location_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase"]
          }
        }
      }
    }
  }'
```

## Best Practices

### 1. Start with Language Defaults

Built-in language analyzers have good stop word lists.

### 2. Always Lowercase First

Apply lowercase filter before stop words.

### 3. Keep Stop Words for Phrases

Use multi-field to support phrase matching.

### 4. Domain-Specific Lists

Customize stop words for your content domain.

### 5. Test with Real Queries

Validate that removing stop words improves results.

### 6. Monitor Search Quality

Track whether stop word changes affect relevance.

### 7. Document Changes

Keep track of custom stop word additions.

## Conclusion

Stop words are a fundamental part of text analysis:

1. **Built-in lists** cover most languages
2. **Custom lists** handle domain-specific needs
3. **Multi-field** supports both approaches
4. **Phrase queries** may need stop words preserved
5. **Testing** is essential before deployment

Proper stop word configuration improves search performance and relevance while ensuring important phrases are still searchable.
