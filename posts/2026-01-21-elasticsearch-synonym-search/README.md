# How to Implement Synonym Search in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Synonyms, Search, Text Analysis, Relevance, NLP

Description: A comprehensive guide to implementing synonym search in Elasticsearch, covering synonym filters, synonym files, expand vs contract modes, and best practices for improving search recall.

---

Synonyms help users find what they are looking for even when they use different words. A search for "laptop" should also find "notebook", and "car" should match "automobile". Elasticsearch provides powerful synonym capabilities through token filters. This guide covers everything you need to implement effective synonym search.

## Why Use Synonyms

Synonyms improve search by:

- Matching different terms for the same concept
- Handling industry jargon and abbreviations
- Supporting regional language variations
- Improving search recall without hurting precision

## Basic Synonym Filter

### Inline Synonyms

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "my_synonyms": {
            "type": "synonym",
            "synonyms": [
              "laptop, notebook, portable computer",
              "phone, mobile, cellphone, smartphone",
              "tv, television, telly"
            ]
          }
        },
        "analyzer": {
          "synonym_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "my_synonyms"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "analyzer": "synonym_analyzer"
        }
      }
    }
  }'
```

### Test the Synonym Filter

```bash
curl -X POST "https://localhost:9200/products/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "synonym_analyzer",
    "text": "laptop computer"
  }'
```

Response shows synonyms expanded:

```json
{
  "tokens": [
    { "token": "laptop", "position": 0 },
    { "token": "notebook", "position": 0 },
    { "token": "portable", "position": 0 },
    { "token": "computer", "position": 1 }
  ]
}
```

## Synonym File

For large synonym lists, use a file:

### Create Synonym File

Create `/etc/elasticsearch/synonyms/products.txt`:

```
# Product synonyms
laptop, notebook, portable computer
phone, mobile, cellphone, smartphone
tv, television, telly
fridge, refrigerator
couch, sofa, settee

# Size synonyms
small, sm, s
medium, md, m
large, lg, l
extra large, xl

# Color synonyms
grey, gray
colour, color
```

### Configure with File

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "product_synonyms": {
            "type": "synonym",
            "synonyms_path": "synonyms/products.txt"
          }
        },
        "analyzer": {
          "product_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "product_synonyms"]
          }
        }
      }
    }
  }'
```

### Update Synonym File

After updating the file, reload the analyzer:

```bash
curl -X POST "https://localhost:9200/products/_close" \
  -u elastic:password

curl -X POST "https://localhost:9200/products/_open" \
  -u elastic:password
```

Or use updateable synonyms (see below).

## Synonym Formats

### Explicit Mapping (Contract)

Map specific terms to a canonical form:

```
notebook => laptop
cellphone => phone
automobile => car
```

"notebook" becomes "laptop", but "laptop" stays "laptop"

### Equivalent Synonyms (Expand)

All terms expand to each other:

```
laptop, notebook, portable computer
```

All three terms become synonyms of each other.

### Mixed Format

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "my_synonyms": {
            "type": "synonym",
            "synonyms": [
              "laptop, notebook",
              "cellphone => phone",
              "automobile, car, auto => vehicle"
            ]
          }
        },
        "analyzer": {
          "synonym_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "my_synonyms"]
          }
        }
      }
    }
  }'
```

## Expand vs Lenient Mode

### Expand Mode (Default)

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "my_synonyms": {
            "type": "synonym",
            "expand": true,
            "synonyms": ["laptop, notebook"]
          }
        }
      }
    }
  }'
```

With `expand: true`, "laptop" produces both "laptop" and "notebook".

### Lenient Mode

Skip invalid synonyms instead of failing:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "my_synonyms": {
            "type": "synonym",
            "lenient": true,
            "synonyms": ["laptop, notebook", "invalid syntax here"]
          }
        }
      }
    }
  }'
```

## Synonym Graph Filter

For multi-word synonyms (recommended over basic synonym filter):

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "graph_synonyms": {
            "type": "synonym_graph",
            "synonyms": [
              "personal computer, pc",
              "hard drive, hdd, hard disk",
              "solid state drive, ssd",
              "new york, ny, nyc"
            ]
          }
        },
        "analyzer": {
          "search_synonyms": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "graph_synonyms"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "description": {
          "type": "text",
          "analyzer": "standard",
          "search_analyzer": "search_synonyms"
        }
      }
    }
  }'
```

## Index-Time vs Search-Time Synonyms

### Index-Time Synonyms

Apply synonyms when indexing:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "index_synonyms": {
            "type": "synonym",
            "synonyms": ["laptop, notebook"]
          }
        },
        "analyzer": {
          "index_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "index_synonyms"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "analyzer": "index_analyzer"
        }
      }
    }
  }'
```

**Pros**: Fast search, synonyms stored in index
**Cons**: Must reindex to update synonyms

### Search-Time Synonyms (Recommended)

Apply synonyms at query time:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "search_synonyms": {
            "type": "synonym_graph",
            "synonyms": ["laptop, notebook, portable computer"]
          }
        },
        "analyzer": {
          "standard_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase"]
          },
          "search_with_synonyms": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "search_synonyms"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "analyzer": "standard_analyzer",
          "search_analyzer": "search_with_synonyms"
        }
      }
    }
  }'
```

**Pros**: Update synonyms without reindexing
**Cons**: Slightly slower search

## Updateable Synonyms

Use synonym files that can be updated without closing the index:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "updateable_synonyms": {
            "type": "synonym_graph",
            "synonyms_path": "synonyms/products.txt",
            "updateable": true
          }
        },
        "analyzer": {
          "search_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "updateable_synonyms"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "search_analyzer": "search_analyzer"
        }
      }
    }
  }'
```

Reload synonyms after updating file:

```bash
curl -X POST "https://localhost:9200/products/_reload_search_analyzers" \
  -u elastic:password
```

## Multi-Word Synonyms

Handle phrases correctly:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "multiword_synonyms": {
            "type": "synonym_graph",
            "synonyms": [
              "personal computer, pc, desktop computer",
              "hard disk drive, hdd, hard drive",
              "united states, usa, us, america"
            ]
          }
        },
        "analyzer": {
          "search_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "multiword_synonyms"]
          }
        }
      }
    }
  }'
```

## Case Sensitivity

Apply lowercase before synonyms:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "my_synonyms": {
            "type": "synonym",
            "synonyms": ["laptop, notebook"]
          }
        },
        "analyzer": {
          "synonym_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "my_synonyms"]
          }
        }
      }
    }
  }'
```

Now "Laptop", "LAPTOP", and "laptop" all match "notebook".

## Combining with Stemming

Order matters - apply synonyms before stemming:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "my_synonyms": {
            "type": "synonym_graph",
            "synonyms": ["run, jog, sprint"]
          }
        },
        "analyzer": {
          "english_with_synonyms": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": [
              "lowercase",
              "my_synonyms",
              "porter_stem"
            ]
          }
        }
      }
    }
  }'
```

## Domain-Specific Synonyms

### E-commerce

```
# Size
xs, extra small
s, sm, small
m, md, medium
l, lg, large
xl, extra large
xxl, 2xl, double extra large

# Colors
grey, gray
colour, color

# Products
sneakers, trainers, tennis shoes
pants, trousers
sweater, jumper, pullover
```

### Technology

```
# Abbreviations
cpu, processor, central processing unit
ram, memory, random access memory
ssd, solid state drive
hdd, hard disk drive, hard drive
gpu, graphics card, video card
os, operating system

# Products
laptop, notebook
desktop, pc, personal computer
monitor, display, screen
```

### Medical

```
# Conditions
heart attack, myocardial infarction, mi
high blood pressure, hypertension
diabetes, dm, diabetes mellitus

# Anatomy
stomach, abdomen, belly
chest, thorax
```

## Complete Example

```bash
# Create index with comprehensive synonyms
curl -X PUT "https://localhost:9200/ecommerce" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "filter": {
          "product_synonyms": {
            "type": "synonym_graph",
            "synonyms": [
              "laptop, notebook, portable computer",
              "phone, mobile, cellphone, smartphone",
              "tv, television, telly, flat screen",
              "fridge, refrigerator, icebox",
              "couch, sofa, settee, loveseat"
            ]
          },
          "size_synonyms": {
            "type": "synonym",
            "synonyms": [
              "xs => extra small",
              "s, sm => small",
              "m, md => medium",
              "l, lg => large",
              "xl => extra large"
            ]
          }
        },
        "analyzer": {
          "index_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "porter_stem"]
          },
          "search_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "product_synonyms", "size_synonyms", "porter_stem"]
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
        },
        "description": {
          "type": "text",
          "analyzer": "index_analyzer",
          "search_analyzer": "search_analyzer"
        },
        "size": {
          "type": "text",
          "analyzer": "index_analyzer",
          "search_analyzer": "search_analyzer"
        }
      }
    }
  }'

# Index some products
curl -X POST "https://localhost:9200/ecommerce/_bulk" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '
{"index":{}}
{"name":"MacBook Pro Laptop","description":"Powerful notebook computer","size":"standard"}
{"index":{}}
{"name":"Samsung TV 55 inch","description":"Large flat screen television","size":"lg"}
{"index":{}}
{"name":"iPhone Smartphone","description":"Latest mobile phone","size":"standard"}
'

# Search with synonyms
curl -X GET "https://localhost:9200/ecommerce/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "multi_match": {
        "query": "notebook",
        "fields": ["name^2", "description"]
      }
    }
  }'
```

## Testing and Debugging

### Analyze Endpoint

```bash
# Test synonym expansion
curl -X POST "https://localhost:9200/ecommerce/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "analyzer": "search_analyzer",
    "text": "looking for a notebook"
  }'
```

### Explain Query

```bash
curl -X GET "https://localhost:9200/ecommerce/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "explain": true,
    "query": {
      "match": {
        "name": "notebook"
      }
    }
  }'
```

## Best Practices

### 1. Use Search-Time Synonyms

Easier to maintain and update without reindexing.

### 2. Use synonym_graph for Multi-Word

The `synonym_graph` filter handles phrases correctly.

### 3. Apply Lowercase First

Ensure case-insensitive synonym matching.

### 4. Test Thoroughly

Use the `_analyze` endpoint to verify synonym expansion.

### 5. Keep Synonyms Focused

Too many synonyms can hurt precision. Monitor search quality.

### 6. Use Explicit Mappings for Normalization

Map variations to a canonical form:

```
colour => color
grey => gray
```

### 7. Document Your Synonyms

Keep a changelog and document why synonyms were added.

## Conclusion

Synonyms are essential for improving search recall:

1. **Use synonym_graph** for multi-word synonym support
2. **Search-time synonyms** allow updates without reindexing
3. **Order matters** - lowercase before synonyms, synonyms before stemming
4. **Test thoroughly** with the analyze endpoint
5. **Keep focused** - too many synonyms hurt precision

Well-configured synonyms help users find what they need, even when they use different terminology than your content.
