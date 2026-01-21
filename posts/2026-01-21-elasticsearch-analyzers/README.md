# How to Configure Elasticsearch Analyzers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Analyzers, Text Analysis, Tokenization, Search, NLP

Description: A comprehensive guide to configuring Elasticsearch analyzers including standard, custom, and language-specific analyzers for optimal text processing and search relevance.

---

Analyzers are the heart of text processing in Elasticsearch. They transform raw text into tokens that can be searched efficiently. Understanding and configuring analyzers correctly is crucial for building effective search applications. This guide covers everything from built-in analyzers to custom configurations.

## How Analyzers Work

An analyzer consists of three components:

1. **Character filters**: Preprocess text (remove HTML, map characters)
2. **Tokenizer**: Split text into tokens
3. **Token filters**: Transform tokens (lowercase, stemming, synonyms)

```
Input Text -> Character Filters -> Tokenizer -> Token Filters -> Tokens
```

## Testing Analyzers

### Analyze API

```bash
curl -X POST "https://localhost:9200/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "standard",
    "text": "The Quick Brown Fox Jumps!"
  }'
```

Response:

```json
{
  "tokens": [
    { "token": "the", "start_offset": 0, "end_offset": 3, "position": 0 },
    { "token": "quick", "start_offset": 4, "end_offset": 9, "position": 1 },
    { "token": "brown", "start_offset": 10, "end_offset": 15, "position": 2 },
    { "token": "fox", "start_offset": 16, "end_offset": 19, "position": 3 },
    { "token": "jumps", "start_offset": 20, "end_offset": 25, "position": 4 }
  ]
}
```

### Test with Custom Components

```bash
curl -X POST "https://localhost:9200/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "tokenizer": "standard",
    "filter": ["lowercase", "porter_stem"],
    "text": "Running Runners Run"
  }'
```

## Built-in Analyzers

### Standard Analyzer

The default analyzer - good for most Western languages:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "description": {
          "type": "text",
          "analyzer": "standard"
        }
      }
    }
  }'
```

Configure standard analyzer:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "my_standard": {
            "type": "standard",
            "max_token_length": 255,
            "stopwords": "_english_"
          }
        }
      }
    }
  }'
```

### Simple Analyzer

Splits on non-letter characters, lowercases:

```bash
curl -X POST "https://localhost:9200/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "simple",
    "text": "The fox-2 jumped!"
  }'
```

Result: `[the, fox, jumped]`

### Whitespace Analyzer

Only splits on whitespace:

```bash
curl -X POST "https://localhost:9200/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "whitespace",
    "text": "The Quick-Brown Fox"
  }'
```

Result: `[The, Quick-Brown, Fox]` (case preserved)

### Keyword Analyzer

No tokenization - entire input as single token:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "sku": {
          "type": "text",
          "analyzer": "keyword"
        }
      }
    }
  }'
```

### Pattern Analyzer

Split by regex pattern:

```bash
curl -X PUT "https://localhost:9200/logs" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "comma_analyzer": {
            "type": "pattern",
            "pattern": ",\\s*",
            "lowercase": true
          }
        }
      }
    }
  }'
```

## Language Analyzers

### English Analyzer

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "content": {
          "type": "text",
          "analyzer": "english"
        }
      }
    }
  }'
```

Test:

```bash
curl -X POST "https://localhost:9200/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "english",
    "text": "The foxes were running quickly"
  }'
```

Result: `[fox, run, quick]` (stemmed, stopwords removed)

### Available Language Analyzers

- arabic, armenian, basque, bengali, brazilian
- bulgarian, catalan, cjk, czech, danish
- dutch, english, estonian, finnish, french
- galician, german, greek, hindi, hungarian
- indonesian, irish, italian, latvian, lithuanian
- norwegian, persian, portuguese, romanian, russian
- sorani, spanish, swedish, turkish, thai

### Configure Language Analyzer

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "my_english": {
            "type": "english",
            "stem_exclusion": ["organization", "organizations"],
            "stopwords": ["a", "the", "is"]
          }
        }
      }
    }
  }'
```

## Custom Analyzers

### Basic Custom Analyzer

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "my_custom_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "char_filter": ["html_strip"],
            "filter": ["lowercase", "asciifolding", "porter_stem"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "description": {
          "type": "text",
          "analyzer": "my_custom_analyzer"
        }
      }
    }
  }'
```

### E-commerce Product Analyzer

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "char_filter": {
          "ampersand_mapping": {
            "type": "mapping",
            "mappings": ["& => and"]
          }
        },
        "filter": {
          "product_synonyms": {
            "type": "synonym",
            "synonyms": [
              "laptop, notebook",
              "phone, mobile, cellphone",
              "tv, television"
            ]
          },
          "product_stopwords": {
            "type": "stop",
            "stopwords": ["the", "a", "an", "for", "with"]
          }
        },
        "analyzer": {
          "product_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "char_filter": ["html_strip", "ampersand_mapping"],
            "filter": [
              "lowercase",
              "product_stopwords",
              "product_synonyms",
              "porter_stem"
            ]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "analyzer": "product_analyzer"
        }
      }
    }
  }'
```

## Character Filters

### HTML Strip

```bash
curl -X PUT "https://localhost:9200/articles" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "html_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "char_filter": ["html_strip"],
            "filter": ["lowercase"]
          }
        }
      }
    }
  }'
```

### Mapping Character Filter

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "char_filter": {
          "special_mappings": {
            "type": "mapping",
            "mappings": [
              "& => and",
              "+ => plus",
              "@ => at",
              "# => hashtag"
            ]
          }
        },
        "analyzer": {
          "mapped_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "char_filter": ["special_mappings"],
            "filter": ["lowercase"]
          }
        }
      }
    }
  }'
```

### Pattern Replace

```bash
curl -X PUT "https://localhost:9200/logs" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "char_filter": {
          "remove_digits": {
            "type": "pattern_replace",
            "pattern": "[0-9]",
            "replacement": ""
          }
        },
        "analyzer": {
          "no_digits": {
            "type": "custom",
            "tokenizer": "standard",
            "char_filter": ["remove_digits"],
            "filter": ["lowercase"]
          }
        }
      }
    }
  }'
```

## Tokenizers

### Standard Tokenizer

Grammar-based tokenization (Unicode):

```bash
curl -X POST "https://localhost:9200/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "tokenizer": "standard",
    "text": "john.doe@email.com visits http://example.com"
  }'
```

### UAX URL Email Tokenizer

Preserves URLs and emails:

```bash
curl -X PUT "https://localhost:9200/contacts" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "url_email_analyzer": {
            "type": "custom",
            "tokenizer": "uax_url_email",
            "filter": ["lowercase"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "contact_info": {
          "type": "text",
          "analyzer": "url_email_analyzer"
        }
      }
    }
  }'
```

### N-gram Tokenizer

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "tokenizer": {
          "ngram_tokenizer": {
            "type": "ngram",
            "min_gram": 3,
            "max_gram": 4,
            "token_chars": ["letter", "digit"]
          }
        },
        "analyzer": {
          "ngram_analyzer": {
            "type": "custom",
            "tokenizer": "ngram_tokenizer",
            "filter": ["lowercase"]
          }
        }
      }
    }
  }'
```

### Edge N-gram Tokenizer

For autocomplete:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "tokenizer": {
          "edge_ngram_tokenizer": {
            "type": "edge_ngram",
            "min_gram": 2,
            "max_gram": 10,
            "token_chars": ["letter", "digit"]
          }
        },
        "analyzer": {
          "autocomplete_analyzer": {
            "type": "custom",
            "tokenizer": "edge_ngram_tokenizer",
            "filter": ["lowercase"]
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
          "analyzer": "autocomplete_analyzer",
          "search_analyzer": "autocomplete_search"
        }
      }
    }
  }'
```

### Path Hierarchy Tokenizer

For file paths:

```bash
curl -X PUT "https://localhost:9200/files" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "tokenizer": {
          "path_tokenizer": {
            "type": "path_hierarchy",
            "delimiter": "/",
            "reverse": false
          }
        },
        "analyzer": {
          "path_analyzer": {
            "type": "custom",
            "tokenizer": "path_tokenizer"
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "file_path": {
          "type": "text",
          "analyzer": "path_analyzer"
        }
      }
    }
  }'
```

Test:

```bash
curl -X POST "https://localhost:9200/files/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "path_analyzer",
    "text": "/var/log/nginx/access.log"
  }'
```

Result: `[/var, /var/log, /var/log/nginx, /var/log/nginx/access.log]`

## Token Filters

### Lowercase and Uppercase

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "lowercase_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase"]
          }
        }
      }
    }
  }'
```

### ASCII Folding

Converts accented characters:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "folding_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "asciifolding"]
          }
        }
      }
    }
  }'
```

Test: `cafe` matches `cafe`

### Length Filter

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "length_filter": {
            "type": "length",
            "min": 3,
            "max": 50
          }
        },
        "analyzer": {
          "length_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "length_filter"]
          }
        }
      }
    }
  }'
```

### Unique Filter

Remove duplicate tokens:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "unique_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "unique"]
          }
        }
      }
    }
  }'
```

### Trim Filter

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "trimmed": {
            "type": "custom",
            "tokenizer": "keyword",
            "filter": ["trim", "lowercase"]
          }
        }
      }
    }
  }'
```

### Word Delimiter Graph

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "word_delimiter": {
            "type": "word_delimiter_graph",
            "split_on_case_change": true,
            "split_on_numerics": true,
            "generate_word_parts": true,
            "generate_number_parts": true,
            "preserve_original": true
          }
        },
        "analyzer": {
          "delimiter_analyzer": {
            "type": "custom",
            "tokenizer": "whitespace",
            "filter": ["word_delimiter", "lowercase"]
          }
        }
      }
    }
  }'
```

Test: `PowerShot2000` produces `[PowerShot2000, Power, Shot, 2000]`

## Multi-Field Analysis

Use different analyzers for the same field:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "autocomplete": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "edge_ngram_filter"]
          }
        },
        "filter": {
          "edge_ngram_filter": {
            "type": "edge_ngram",
            "min_gram": 2,
            "max_gram": 10
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "analyzer": "standard",
          "fields": {
            "autocomplete": {
              "type": "text",
              "analyzer": "autocomplete",
              "search_analyzer": "standard"
            },
            "keyword": {
              "type": "keyword"
            },
            "english": {
              "type": "text",
              "analyzer": "english"
            }
          }
        }
      }
    }
  }'
```

Query different fields:

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "lap",
        "fields": ["name.autocomplete^2", "name"]
      }
    }
  }'
```

## Index vs Search Analyzer

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "edge_ngram_filter": {
            "type": "edge_ngram",
            "min_gram": 1,
            "max_gram": 20
          }
        },
        "analyzer": {
          "index_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "edge_ngram_filter"]
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
        "name": {
          "type": "text",
          "analyzer": "index_analyzer",
          "search_analyzer": "search_analyzer"
        }
      }
    }
  }'
```

## Best Practices

### 1. Choose the Right Analyzer

- **Standard**: General purpose, most Western languages
- **Language-specific**: When you know the language
- **Keyword**: For exact matching (IDs, codes)
- **Custom**: When you need specific behavior

### 2. Test Before Deployment

```bash
curl -X POST "https://localhost:9200/my_index/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "my_custom_analyzer",
    "text": "Sample text to analyze"
  }'
```

### 3. Use Multi-Fields

```json
{
  "properties": {
    "title": {
      "type": "text",
      "fields": {
        "raw": { "type": "keyword" },
        "english": { "type": "text", "analyzer": "english" }
      }
    }
  }
}
```

### 4. Separate Index and Search Analyzers

For autocomplete and edge n-grams, always use different analyzers.

### 5. Consider Performance

- N-grams increase index size significantly
- Complex analyzers slow down indexing
- Test with realistic data volumes

## Conclusion

Elasticsearch analyzers provide powerful text processing capabilities:

1. **Built-in analyzers** cover most use cases
2. **Language analyzers** handle stemming and stopwords
3. **Custom analyzers** give complete control
4. **Multi-fields** enable different analysis strategies
5. **Separate index/search analyzers** optimize for different needs

Understanding how text is analyzed is essential for building effective search. Test your analyzers with representative data and iterate based on search quality feedback.
