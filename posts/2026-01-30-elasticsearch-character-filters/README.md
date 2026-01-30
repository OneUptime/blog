# How to Create Elasticsearch Character Filters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Elasticsearch, Search, Text Analysis, Indexing

Description: Build custom character filters in Elasticsearch for text preprocessing with HTML stripping, pattern replacement, and character mapping before tokenization.

---

Character filters are the first step in the Elasticsearch text analysis pipeline. They process raw text before it reaches the tokenizer, allowing you to strip HTML tags, replace characters, or normalize input. Understanding character filters helps you build cleaner, more accurate search indexes.

## The Analysis Pipeline

When Elasticsearch indexes text, it passes through three stages:

1. **Character Filters** - Transform the raw character stream
2. **Tokenizer** - Split text into tokens
3. **Token Filters** - Modify, add, or remove tokens

Character filters operate on the entire text string before any tokenization occurs. This makes them ideal for preprocessing tasks like removing markup or normalizing special characters.

## Built-in Character Filters

Elasticsearch provides three built-in character filter types:

| Filter Type | Purpose | Common Use Cases |
|-------------|---------|------------------|
| `html_strip` | Removes HTML elements | Indexing web content, CMS data |
| `mapping` | Replaces characters based on a map | Symbol normalization, ligature expansion |
| `pattern_replace` | Uses regex for replacements | Complex transformations, data cleaning |

Let's explore each one with practical examples.

## The html_strip Character Filter

The `html_strip` filter removes HTML tags and decodes HTML entities. This is essential when indexing content from web pages or rich text editors.

### Basic html_strip Usage

Create an index with a custom analyzer that strips HTML:

```json
PUT /web_content
{
  "settings": {
    "analysis": {
      "analyzer": {
        "html_analyzer": {
          "type": "custom",
          "char_filter": ["html_strip"],
          "tokenizer": "standard",
          "filter": ["lowercase"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "body": {
        "type": "text",
        "analyzer": "html_analyzer"
      }
    }
  }
}
```

Test the analyzer with the `_analyze` API:

```json
POST /web_content/_analyze
{
  "analyzer": "html_analyzer",
  "text": "<p>Welcome to <strong>Elasticsearch</strong>!</p>"
}
```

The response shows clean tokens without HTML artifacts:

```json
{
  "tokens": [
    { "token": "welcome", "start_offset": 3, "end_offset": 10 },
    { "token": "to", "start_offset": 11, "end_offset": 13 },
    { "token": "elasticsearch", "start_offset": 22, "end_offset": 35 },
    { "token": "end_offset": 49, "end_offset": 50 }
  ]
}
```

### Preserving Specific HTML Elements

Sometimes you want to keep certain tags. The `escaped_tags` parameter lets you preserve specific elements:

```json
PUT /articles
{
  "settings": {
    "analysis": {
      "char_filter": {
        "html_strip_keep_links": {
          "type": "html_strip",
          "escaped_tags": ["a", "code"]
        }
      },
      "analyzer": {
        "article_analyzer": {
          "type": "custom",
          "char_filter": ["html_strip_keep_links"],
          "tokenizer": "standard",
          "filter": ["lowercase"]
        }
      }
    }
  }
}
```

Test to verify link tags remain:

```json
POST /articles/_analyze
{
  "analyzer": "article_analyzer",
  "text": "<p>Check the <a href='/docs'>documentation</a> for <code>examples</code></p>"
}
```

The `<a>` and `<code>` tags pass through while `<p>` is stripped.

### HTML Entity Decoding

The `html_strip` filter also handles HTML entities:

```json
POST /web_content/_analyze
{
  "analyzer": "html_analyzer",
  "text": "Price: &euro;50 &amp; &pound;40"
}
```

Entities like `&euro;`, `&amp;`, and `&pound;` are decoded to their actual characters before tokenization.

## The mapping Character Filter

The `mapping` filter replaces characters or character sequences based on a predefined map. This is useful for normalizing symbols, expanding abbreviations, or handling special characters.

### Basic Character Mapping

Create a filter that converts common symbols to words:

```json
PUT /product_search
{
  "settings": {
    "analysis": {
      "char_filter": {
        "symbol_to_word": {
          "type": "mapping",
          "mappings": [
            "& => and",
            "+ => plus",
            "@ => at",
            "# => hashtag",
            "$ => dollar",
            "% => percent"
          ]
        }
      },
      "analyzer": {
        "product_analyzer": {
          "type": "custom",
          "char_filter": ["symbol_to_word"],
          "tokenizer": "standard",
          "filter": ["lowercase"]
        }
      }
    }
  }
}
```

Test the mapping:

```json
POST /product_search/_analyze
{
  "analyzer": "product_analyzer",
  "text": "C++ & C# programming @ 50% off"
}
```

Result:

```json
{
  "tokens": [
    { "token": "c", "start_offset": 0, "end_offset": 1 },
    { "token": "plus", "start_offset": 1, "end_offset": 2 },
    { "token": "plus", "start_offset": 2, "end_offset": 3 },
    { "token": "and", "start_offset": 4, "end_offset": 5 },
    { "token": "c", "start_offset": 6, "end_offset": 7 },
    { "token": "hashtag", "start_offset": 7, "end_offset": 8 },
    { "token": "programming", "start_offset": 9, "end_offset": 20 },
    { "token": "at", "start_offset": 21, "end_offset": 22 },
    { "token": "50", "start_offset": 23, "end_offset": 25 },
    { "token": "percent", "start_offset": 25, "end_offset": 26 },
    { "token": "off", "start_offset": 27, "end_offset": 30 }
  ]
}
```

### Loading Mappings from a File

For large mapping sets, store them in a file. Create a file at `config/analysis/char_mappings.txt`:

```
# Ligature expansion
\uFB00 => ff
\uFB01 => fi
\uFB02 => fl
\uFB03 => ffi
\uFB04 => ffl

# Typographic quotes to standard quotes
\u2018 => '
\u2019 => '
\u201C => "
\u201D => "

# Common fractions
\u00BD => 1/2
\u00BC => 1/4
\u00BE => 3/4
```

Reference the file in your index settings:

```json
PUT /documents
{
  "settings": {
    "analysis": {
      "char_filter": {
        "normalize_chars": {
          "type": "mapping",
          "mappings_path": "analysis/char_mappings.txt"
        }
      },
      "analyzer": {
        "normalized_analyzer": {
          "type": "custom",
          "char_filter": ["normalize_chars"],
          "tokenizer": "standard",
          "filter": ["lowercase"]
        }
      }
    }
  }
}
```

### Multi-Character Replacements

Mappings can replace multiple characters at once:

```json
PUT /chat_messages
{
  "settings": {
    "analysis": {
      "char_filter": {
        "emoticon_to_word": {
          "type": "mapping",
          "mappings": [
            ":) => happy",
            ":( => sad",
            ":D => laughing",
            ";) => wink",
            "<3 => love",
            ":P => tongue",
            "XD => laughing"
          ]
        }
      },
      "analyzer": {
        "chat_analyzer": {
          "type": "custom",
          "char_filter": ["emoticon_to_word"],
          "tokenizer": "standard",
          "filter": ["lowercase"]
        }
      }
    }
  }
}
```

Test emoticon replacement:

```json
POST /chat_messages/_analyze
{
  "analyzer": "chat_analyzer",
  "text": "Great news :) I <3 this feature :D"
}
```

## The pattern_replace Character Filter

The `pattern_replace` filter uses Java regular expressions for complex text transformations. This gives you maximum flexibility for preprocessing text.

### Basic Pattern Replacement

Remove all digits from text:

```json
PUT /text_only
{
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
        "text_only_analyzer": {
          "type": "custom",
          "char_filter": ["remove_digits"],
          "tokenizer": "standard",
          "filter": ["lowercase"]
        }
      }
    }
  }
}
```

### Normalizing Phone Numbers

Strip formatting from phone numbers to enable consistent searching:

```json
PUT /contacts
{
  "settings": {
    "analysis": {
      "char_filter": {
        "normalize_phone": {
          "type": "pattern_replace",
          "pattern": "[^0-9]",
          "replacement": ""
        }
      },
      "analyzer": {
        "phone_analyzer": {
          "type": "custom",
          "char_filter": ["normalize_phone"],
          "tokenizer": "keyword"
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "phone": {
        "type": "text",
        "analyzer": "phone_analyzer"
      }
    }
  }
}
```

Test with various phone formats:

```json
POST /contacts/_analyze
{
  "analyzer": "phone_analyzer",
  "text": "(555) 123-4567"
}

POST /contacts/_analyze
{
  "analyzer": "phone_analyzer",
  "text": "555.123.4567"
}

POST /contacts/_analyze
{
  "analyzer": "phone_analyzer",
  "text": "+1 555 123 4567"
}
```

All three produce the same token: `5551234567`

### Using Capture Groups

Pattern replacements support capture groups for advanced transformations:

```json
PUT /formatted_data
{
  "settings": {
    "analysis": {
      "char_filter": {
        "camel_to_underscore": {
          "type": "pattern_replace",
          "pattern": "([a-z])([A-Z])",
          "replacement": "$1_$2"
        }
      },
      "analyzer": {
        "code_analyzer": {
          "type": "custom",
          "char_filter": ["camel_to_underscore"],
          "tokenizer": "standard",
          "filter": ["lowercase"]
        }
      }
    }
  }
}
```

Test camelCase conversion:

```json
POST /formatted_data/_analyze
{
  "analyzer": "code_analyzer",
  "text": "getUserName calculateTotalPrice"
}
```

Result shows underscore-separated tokens:

```json
{
  "tokens": [
    { "token": "get_user_name", "start_offset": 0, "end_offset": 11 },
    { "token": "calculate_total_price", "start_offset": 12, "end_offset": 31 }
  ]
}
```

### Extracting Data with Patterns

Use capture groups to extract specific parts of structured text:

```json
PUT /log_analysis
{
  "settings": {
    "analysis": {
      "char_filter": {
        "extract_ip": {
          "type": "pattern_replace",
          "pattern": ".*?(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}).*",
          "replacement": "$1"
        }
      },
      "analyzer": {
        "ip_extractor": {
          "type": "custom",
          "char_filter": ["extract_ip"],
          "tokenizer": "keyword"
        }
      }
    }
  }
}
```

Test IP extraction:

```json
POST /log_analysis/_analyze
{
  "analyzer": "ip_extractor",
  "text": "Connection from 192.168.1.100 at port 8080"
}
```

## Chaining Multiple Character Filters

You can apply multiple character filters in sequence. Filters execute in the order specified.

### Building a Complex Analysis Chain

This example chains all three filter types:

```json
PUT /complex_content
{
  "settings": {
    "analysis": {
      "char_filter": {
        "strip_html": {
          "type": "html_strip"
        },
        "normalize_symbols": {
          "type": "mapping",
          "mappings": [
            "& => and",
            "@ => at",
            "# => number"
          ]
        },
        "collapse_whitespace": {
          "type": "pattern_replace",
          "pattern": "\\s+",
          "replacement": " "
        }
      },
      "analyzer": {
        "full_preprocessing": {
          "type": "custom",
          "char_filter": [
            "strip_html",
            "normalize_symbols",
            "collapse_whitespace"
          ],
          "tokenizer": "standard",
          "filter": ["lowercase", "trim"]
        }
      }
    }
  }
}
```

Test the chain:

```json
POST /complex_content/_analyze
{
  "analyzer": "full_preprocessing",
  "text": "<div>Contact us   @   support &   sales</div>"
}
```

The filters execute in order:
1. `strip_html` removes `<div>` tags
2. `normalize_symbols` converts `@` to "at" and `&` to "and"
3. `collapse_whitespace` reduces multiple spaces to single spaces

### Order Matters

The sequence of character filters affects the final result. Consider this example:

```json
PUT /order_test
{
  "settings": {
    "analysis": {
      "char_filter": {
        "replace_abc": {
          "type": "mapping",
          "mappings": ["abc => xyz"]
        },
        "replace_xyz": {
          "type": "mapping",
          "mappings": ["xyz => 123"]
        }
      },
      "analyzer": {
        "order_a": {
          "type": "custom",
          "char_filter": ["replace_abc", "replace_xyz"],
          "tokenizer": "keyword"
        },
        "order_b": {
          "type": "custom",
          "char_filter": ["replace_xyz", "replace_abc"],
          "tokenizer": "keyword"
        }
      }
    }
  }
}
```

Test both orders:

```json
POST /order_test/_analyze
{
  "analyzer": "order_a",
  "text": "abc"
}
// Result: "123" (abc -> xyz -> 123)

POST /order_test/_analyze
{
  "analyzer": "order_b",
  "text": "abc"
}
// Result: "xyz" (abc -> xyz, no further replacement)
```

## Testing with the _analyze API

The `_analyze` API is your primary tool for debugging character filters. Use it extensively during development.

### Testing Character Filters in Isolation

Test a character filter without the full analyzer:

```json
POST /_analyze
{
  "char_filter": [
    {
      "type": "mapping",
      "mappings": ["$ => USD", "€ => EUR", "£ => GBP"]
    }
  ],
  "tokenizer": "keyword",
  "text": "Price: $100 or €85 or £70"
}
```

### Comparing Analyzers

Test the same text with different analyzers:

```json
POST /complex_content/_analyze
{
  "analyzer": "standard",
  "text": "<p>C++ & Java</p>"
}

POST /complex_content/_analyze
{
  "analyzer": "full_preprocessing",
  "text": "<p>C++ & Java</p>"
}
```

Compare the token output to understand how your preprocessing affects search behavior.

### Debugging Token Positions

When chaining filters, character offsets can shift. The `_analyze` API shows exact positions:

```json
POST /complex_content/_analyze
{
  "analyzer": "full_preprocessing",
  "text": "&nbsp;Hello&nbsp;World",
  "explain": true
}
```

The `explain` parameter provides detailed information about each analysis step.

## Practical Use Cases

### Use Case 1: E-commerce Product Search

Handle product codes, model numbers, and special characters:

```json
PUT /products
{
  "settings": {
    "analysis": {
      "char_filter": {
        "product_code_normalizer": {
          "type": "pattern_replace",
          "pattern": "[-_\\s]",
          "replacement": ""
        },
        "brand_synonyms": {
          "type": "mapping",
          "mappings": [
            "HP => Hewlett Packard",
            "IBM => International Business Machines",
            "MS => Microsoft"
          ]
        }
      },
      "analyzer": {
        "product_search": {
          "type": "custom",
          "char_filter": ["product_code_normalizer", "brand_synonyms"],
          "tokenizer": "standard",
          "filter": ["lowercase"]
        }
      }
    }
  }
}
```

### Use Case 2: Legal Document Processing

Clean up legal documents with specific formatting:

```json
PUT /legal_docs
{
  "settings": {
    "analysis": {
      "char_filter": {
        "legal_cleanup": {
          "type": "pattern_replace",
          "pattern": "\\[\\d+\\]",
          "replacement": ""
        },
        "section_normalize": {
          "type": "mapping",
          "mappings": [
            "§ => Section",
            "¶ => Paragraph",
            "© => Copyright"
          ]
        }
      },
      "analyzer": {
        "legal_analyzer": {
          "type": "custom",
          "char_filter": ["legal_cleanup", "section_normalize"],
          "tokenizer": "standard",
          "filter": ["lowercase", "stop"]
        }
      }
    }
  }
}
```

### Use Case 3: Social Media Content

Process user-generated content with hashtags and mentions:

```json
PUT /social_content
{
  "settings": {
    "analysis": {
      "char_filter": {
        "preserve_hashtags": {
          "type": "pattern_replace",
          "pattern": "#(\\w+)",
          "replacement": "hashtag_$1"
        },
        "preserve_mentions": {
          "type": "pattern_replace",
          "pattern": "@(\\w+)",
          "replacement": "mention_$1"
        },
        "remove_urls": {
          "type": "pattern_replace",
          "pattern": "https?://\\S+",
          "replacement": ""
        }
      },
      "analyzer": {
        "social_analyzer": {
          "type": "custom",
          "char_filter": ["remove_urls", "preserve_hashtags", "preserve_mentions"],
          "tokenizer": "standard",
          "filter": ["lowercase"]
        }
      }
    }
  }
}
```

Test social content:

```json
POST /social_content/_analyze
{
  "analyzer": "social_analyzer",
  "text": "Check out #Elasticsearch @elastic https://elastic.co"
}
```

### Use Case 4: Multi-Language Support

Handle language-specific character normalization:

```json
PUT /multilingual
{
  "settings": {
    "analysis": {
      "char_filter": {
        "german_normalize": {
          "type": "mapping",
          "mappings": [
            "ä => ae",
            "ö => oe",
            "ü => ue",
            "ß => ss",
            "Ä => Ae",
            "Ö => Oe",
            "Ü => Ue"
          ]
        },
        "french_normalize": {
          "type": "mapping",
          "mappings": [
            "œ => oe",
            "æ => ae",
            "ç => c"
          ]
        }
      },
      "analyzer": {
        "german_search": {
          "type": "custom",
          "char_filter": ["german_normalize"],
          "tokenizer": "standard",
          "filter": ["lowercase"]
        },
        "french_search": {
          "type": "custom",
          "char_filter": ["french_normalize"],
          "tokenizer": "standard",
          "filter": ["lowercase"]
        }
      }
    }
  }
}
```

## Performance Considerations

Character filters run on every document during indexing and on every query during search. Keep these points in mind:

| Factor | Impact | Recommendation |
|--------|--------|----------------|
| Number of filters | Linear increase in processing time | Use only necessary filters |
| Pattern complexity | Regex backtracking can be slow | Keep patterns simple, avoid `.*` when possible |
| Mapping size | Larger maps use more memory | Load from files for large mapping sets |
| Chain length | Each filter adds overhead | Combine filters when logic allows |

### Optimization Tips

1. **Order filters by elimination**: Put filters that remove the most content first
2. **Use specific patterns**: `[0-9]` is faster than `\d` in some regex engines
3. **Avoid overlapping replacements**: Ensure mappings do not conflict
4. **Test with realistic data**: Performance varies based on actual content

## Common Pitfalls

### Pitfall 1: Conflicting Mappings

When two mappings overlap, only one will apply:

```json
// Problematic configuration
"mappings": [
  "C++ => cplusplus",
  "+ => plus"
]
```

With input "C++", you might expect "cplusplusplus", but only one mapping matches. Use a single comprehensive mapping instead:

```json
"mappings": [
  "C++ => cplusplus",
  "C# => csharp",
  "+ => plus"
]
```

### Pitfall 2: Greedy Regex Patterns

Greedy patterns can match more than intended:

```json
// This removes everything between first < and last >
"pattern": "<.*>",
"replacement": ""
```

Use non-greedy matching:

```json
// This removes each tag individually
"pattern": "<.*?>",
"replacement": ""
```

### Pitfall 3: Breaking Token Boundaries

Character filters can inadvertently join or split words:

```json
// Removing hyphens joins hyphenated words
"pattern": "-",
"replacement": ""

// Input: "well-known"
// Output: "wellknown" (single token)
```

Consider replacing with a space instead:

```json
"pattern": "-",
"replacement": " "

// Input: "well-known"
// Output: "well known" (two tokens)
```

## Summary

Character filters provide powerful text preprocessing capabilities in Elasticsearch. The three built-in types cover most use cases:

- **html_strip**: Clean HTML content and decode entities
- **mapping**: Replace characters based on defined mappings
- **pattern_replace**: Use regex for complex transformations

Key takeaways:

1. Character filters run before tokenization, affecting the entire text stream
2. Filter order matters when chaining multiple filters
3. Use the `_analyze` API extensively for testing and debugging
4. Keep performance in mind with complex patterns or large mapping sets
5. Test with real-world data to ensure your filters behave as expected

Start simple with built-in options and add complexity only when needed. A well-designed character filter chain makes your search index more accurate and your queries more forgiving of input variations.
