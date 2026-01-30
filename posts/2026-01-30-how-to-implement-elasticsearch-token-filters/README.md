# How to Implement Elasticsearch Token Filters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Elasticsearch, Search, Text Analysis, Performance

Description: Learn how to implement custom token filters in Elasticsearch for advanced text processing and search optimization.

---

Token filters are essential components of Elasticsearch text analysis that transform token streams produced by tokenizers. They enable powerful text processing capabilities including stemming, synonym expansion, and phonetic matching. This guide covers implementing various token filters to optimize your search functionality.

## Understanding Token Filters

Token filters operate on the output of tokenizers, modifying, adding, or removing tokens. They are applied in sequence within an analyzer, where the output of one filter becomes the input for the next. This pipeline approach allows you to build sophisticated text processing chains.

## Built-in Token Filters

Elasticsearch provides numerous built-in token filters. Here are some commonly used ones:

```json
PUT /my_index
{
  "settings": {
    "analysis": {
      "analyzer": {
        "my_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "stop", "porter_stem"]
        }
      }
    }
  }
}
```

This analyzer applies three filters: `lowercase` converts all tokens to lowercase, `stop` removes common stop words, and `porter_stem` applies Porter stemming algorithm.

## Custom Filter Configuration

You can customize built-in filters with specific parameters. Here is an example configuring a stop filter with custom words:

```json
PUT /my_index
{
  "settings": {
    "analysis": {
      "filter": {
        "my_stop_filter": {
          "type": "stop",
          "stopwords": ["the", "a", "an", "is", "are", "was"],
          "ignore_case": true
        }
      },
      "analyzer": {
        "my_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "my_stop_filter"]
        }
      }
    }
  }
}
```

## Implementing Synonym Filters

Synonym filters expand or replace tokens with equivalent terms, improving recall. There are two approaches: inline synonyms and synonym files.

```json
PUT /my_index
{
  "settings": {
    "analysis": {
      "filter": {
        "my_synonym_filter": {
          "type": "synonym",
          "synonyms": [
            "quick,fast,speedy",
            "big,large,huge => enormous",
            "laptop,notebook,portable computer"
          ]
        }
      },
      "analyzer": {
        "synonym_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "my_synonym_filter"]
        }
      }
    }
  }
}
```

For larger synonym sets, use an external file:

```json
"my_synonym_filter": {
  "type": "synonym",
  "synonyms_path": "analysis/synonyms.txt"
}
```

## Stemming Filters

Stemming reduces words to their root form, improving search matching. Elasticsearch offers multiple stemmer options:

```json
PUT /my_index
{
  "settings": {
    "analysis": {
      "filter": {
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
        "english_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": [
            "lowercase",
            "english_possessive_stemmer",
            "english_stemmer"
          ]
        }
      }
    }
  }
}
```

## Edge N-gram Filters

Edge n-gram filters are useful for autocomplete functionality, generating prefixes of tokens:

```json
PUT /my_index
{
  "settings": {
    "analysis": {
      "filter": {
        "autocomplete_filter": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 15
        }
      },
      "analyzer": {
        "autocomplete_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "autocomplete_filter"]
        }
      }
    }
  }
}
```

This configuration generates tokens like "el", "ela", "elas", "elast" for "elasticsearch", enabling prefix matching.

## Phonetic Filters

Phonetic filters match words that sound similar, useful for handling misspellings and name variations. You need the analysis-phonetic plugin:

```json
PUT /my_index
{
  "settings": {
    "analysis": {
      "filter": {
        "my_phonetic_filter": {
          "type": "phonetic",
          "encoder": "metaphone",
          "replace": false
        }
      },
      "analyzer": {
        "phonetic_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "my_phonetic_filter"]
        }
      }
    }
  }
}
```

Available encoders include `metaphone`, `double_metaphone`, `soundex`, and `beider_morse`.

## Combining Filters in Analyzers

The power of token filters comes from combining them strategically. Here is a comprehensive analyzer for English text:

```json
PUT /my_index
{
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
        "my_synonyms": {
          "type": "synonym",
          "synonyms": ["error,exception,failure"]
        }
      },
      "analyzer": {
        "enhanced_english": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": [
            "lowercase",
            "english_stop",
            "my_synonyms",
            "english_stemmer"
          ]
        }
      }
    }
  }
}
```

## Testing Your Filters

Always test your analyzers using the Analyze API:

```bash
POST /my_index/_analyze
{
  "analyzer": "enhanced_english",
  "text": "The quick brown foxes are jumping"
}
```

This returns the tokens produced by your analyzer, helping you verify the filter chain works as expected.

## Conclusion

Token filters are powerful tools for optimizing Elasticsearch search quality. By combining built-in filters like stemming, synonyms, and edge n-grams, you can create analyzers tailored to your specific use case. Remember to test your configurations thoroughly and consider the trade-offs between precision and recall when designing your text analysis pipeline.
