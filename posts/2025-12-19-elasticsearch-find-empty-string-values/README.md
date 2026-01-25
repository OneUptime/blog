# How to Find Documents with Empty String Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Query DSL, Data Quality, Empty Values, Search, Data Validation

Description: Learn how to find documents with empty string values in Elasticsearch using term queries, scripts, and aggregations to identify and clean up data quality issues.

---

Finding documents with empty string values in Elasticsearch is surprisingly tricky. An empty string ("") is different from a null value or a missing field, and each requires different query approaches. This guide covers all scenarios for identifying documents with empty or missing data.

## Understanding Empty Values in Elasticsearch

```mermaid
flowchart TB
    subgraph "Value States"
        A[Field Present with Value] --> B["name": "John"]
        C[Field Present Empty String] --> D["name": ""]
        E[Field Present Null] --> F["name": null]
        G[Field Missing] --> H[No name field]
    end

    subgraph "Elasticsearch Behavior"
        D --> I[Indexed as empty string]
        F --> J[Not indexed - treated as missing]
        H --> J
    end
```

| Value State | exists Query | term Query "" | Script Check |
|-------------|-------------|---------------|--------------|
| "John" | true | false | false |
| "" | true | true | true |
| null | false | false | N/A |
| missing | false | false | N/A |

## Finding Empty String Values

### Method 1: Term Query for Empty String

```bash
curl -X GET "localhost:9200/users/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "term": {
      "name.keyword": {
        "value": ""
      }
    }
  }
}'
```

This finds documents where the `name` field equals exactly an empty string.

### Method 2: Script Query for Empty Strings

For text fields or more complex conditions:

```bash
curl -X GET "localhost:9200/users/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "filter": {
        "script": {
          "script": {
            "source": "doc[\"name.keyword\"].size() > 0 && doc[\"name.keyword\"].value.length() == 0"
          }
        }
      }
    }
  }
}'
```

The script checks:
1. Field exists and has a value
2. Value length is zero

### Method 3: Using Painless for Multiple Fields

```bash
curl -X GET "localhost:9200/users/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "filter": {
        "script": {
          "script": {
            "source": """
              def fields = ["name", "email", "phone"];
              for (field in fields) {
                def keywordField = field + ".keyword";
                if (doc.containsKey(keywordField) &&
                    doc[keywordField].size() > 0 &&
                    doc[keywordField].value.length() == 0) {
                  return true;
                }
              }
              return false;
            """
          }
        }
      }
    }
  }
}'
```

## Finding Missing or Null Values

### Exists Query (Inverse)

Find documents where a field is missing or null:

```bash
curl -X GET "localhost:9200/users/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must_not": {
        "exists": {
          "field": "email"
        }
      }
    }
  }
}'
```

## Finding All Empty/Null/Missing Values

Combine queries to find all documents with problematic values:

```bash
curl -X GET "localhost:9200/users/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "should": [
        {
          "bool": {
            "must_not": {
              "exists": { "field": "email" }
            }
          }
        },
        {
          "term": { "email.keyword": "" }
        }
      ],
      "minimum_should_match": 1
    }
  }
}'
```

## Data Quality Audit Query

Create a comprehensive audit query:

```bash
curl -X GET "localhost:9200/users/_search" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "aggs": {
    "name_issues": {
      "filters": {
        "filters": {
          "missing": {
            "bool": { "must_not": { "exists": { "field": "name" }}}
          },
          "empty": {
            "term": { "name.keyword": "" }
          }
        }
      }
    },
    "email_issues": {
      "filters": {
        "filters": {
          "missing": {
            "bool": { "must_not": { "exists": { "field": "email" }}}
          },
          "empty": {
            "term": { "email.keyword": "" }
          }
        }
      }
    },
    "phone_issues": {
      "filters": {
        "filters": {
          "missing": {
            "bool": { "must_not": { "exists": { "field": "phone" }}}
          },
          "empty": {
            "term": { "phone.keyword": "" }
          }
        }
      }
    }
  }
}'
```

Response shows counts for each issue type:

```json
{
  "aggregations": {
    "name_issues": {
      "buckets": {
        "missing": { "doc_count": 45 },
        "empty": { "doc_count": 12 }
      }
    },
    "email_issues": {
      "buckets": {
        "missing": { "doc_count": 120 },
        "empty": { "doc_count": 8 }
      }
    }
  }
}
```

## Python Data Quality Tool

```python
from elasticsearch import Elasticsearch

es = Elasticsearch(['http://localhost:9200'])

def audit_empty_values(index, fields):
    """Audit an index for empty and missing values."""

    aggs = {}
    for field in fields:
        keyword_field = f"{field}.keyword" if not field.endswith('.keyword') else field

        aggs[f"{field}_audit"] = {
            "filters": {
                "filters": {
                    "missing": {
                        "bool": {
                            "must_not": {"exists": {"field": field}}
                        }
                    },
                    "empty_string": {
                        "term": {keyword_field: ""}
                    },
                    "has_value": {
                        "bool": {
                            "must": [
                                {"exists": {"field": field}},
                                {"bool": {"must_not": {"term": {keyword_field: ""}}}}
                            ]
                        }
                    }
                }
            }
        }

    response = es.search(
        index=index,
        body={
            "size": 0,
            "aggs": aggs
        }
    )

    # Format results
    results = {}
    total = response['hits']['total']['value']

    for field in fields:
        buckets = response['aggregations'][f"{field}_audit"]['buckets']
        results[field] = {
            'missing': buckets['missing']['doc_count'],
            'empty_string': buckets['empty_string']['doc_count'],
            'has_value': buckets['has_value']['doc_count'],
            'total': total,
            'completeness': round(buckets['has_value']['doc_count'] / total * 100, 2) if total > 0 else 0
        }

    return results

# Usage
audit = audit_empty_values('users', ['name', 'email', 'phone', 'address'])
for field, stats in audit.items():
    print(f"\n{field}:")
    print(f"  Missing: {stats['missing']}")
    print(f"  Empty: {stats['empty_string']}")
    print(f"  Has Value: {stats['has_value']}")
    print(f"  Completeness: {stats['completeness']}%")
```

## Fixing Empty Values

### Update Empty to Null

Convert empty strings to null (which makes exists queries work correctly):

```bash
curl -X POST "localhost:9200/users/_update_by_query" -H 'Content-Type: application/json' -d'
{
  "script": {
    "source": "ctx._source.email = null",
    "lang": "painless"
  },
  "query": {
    "term": { "email.keyword": "" }
  }
}'
```

### Set Default Values

```bash
curl -X POST "localhost:9200/users/_update_by_query" -H 'Content-Type: application/json' -d'
{
  "script": {
    "source": "ctx._source.status = \"unknown\"",
    "lang": "painless"
  },
  "query": {
    "bool": {
      "should": [
        { "bool": { "must_not": { "exists": { "field": "status" }}}},
        { "term": { "status.keyword": "" }}
      ],
      "minimum_should_match": 1
    }
  }
}'
```

### Delete Documents with Empty Required Fields

```bash
curl -X POST "localhost:9200/users/_delete_by_query" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "should": [
        { "bool": { "must_not": { "exists": { "field": "email" }}}},
        { "term": { "email.keyword": "" }}
      ],
      "minimum_should_match": 1
    }
  }
}'
```

## Prevention: Ingest Pipeline

Prevent empty strings during indexing:

```bash
curl -X PUT "localhost:9200/_ingest/pipeline/clean-empty-strings" -H 'Content-Type: application/json' -d'
{
  "description": "Replace empty strings with null",
  "processors": [
    {
      "script": {
        "source": """
          def cleanField(ctx, field) {
            if (ctx.containsKey(field) && ctx[field] instanceof String && ctx[field].trim().isEmpty()) {
              ctx.remove(field);
            }
          }
          cleanField(ctx, "name");
          cleanField(ctx, "email");
          cleanField(ctx, "phone");
        """
      }
    }
  ]
}'

# Apply pipeline to index
curl -X PUT "localhost:9200/users/_settings" -H 'Content-Type: application/json' -d'
{
  "index.default_pipeline": "clean-empty-strings"
}'
```

## Whitespace-Only Values

Empty strings might also include whitespace-only values:

```bash
curl -X GET "localhost:9200/users/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "filter": {
        "script": {
          "script": {
            "source": """
              if (!doc.containsKey(\"name.keyword\") || doc[\"name.keyword\"].size() == 0) {
                return false;
              }
              return doc[\"name.keyword\"].value.trim().length() == 0;
            """
          }
        }
      }
    }
  }
}'
```

## Runtime Field for Empty Detection

Create a runtime field to flag empty values:

```bash
curl -X GET "localhost:9200/users/_search" -H 'Content-Type: application/json' -d'
{
  "runtime_mappings": {
    "email_status": {
      "type": "keyword",
      "script": {
        "source": """
          if (!doc.containsKey(\"email.keyword\") || doc[\"email.keyword\"].size() == 0) {
            emit(\"missing\");
          } else if (doc[\"email.keyword\"].value.length() == 0) {
            emit(\"empty\");
          } else {
            emit(\"valid\");
          }
        """
      }
    }
  },
  "aggs": {
    "email_quality": {
      "terms": { "field": "email_status" }
    }
  }
}'
```

## Summary

Finding empty string values in Elasticsearch requires understanding the difference between empty strings, null values, and missing fields:

1. **Empty strings** - Use `term` query with empty value: `{"term": {"field.keyword": ""}}`
2. **Missing/null fields** - Use `must_not` with `exists` query
3. **Both** - Combine with `bool` and `should`
4. **Scripts** - For complex conditions like whitespace-only detection
5. **Aggregations** - For auditing data quality across fields
6. **Ingest pipelines** - To prevent empty strings during indexing

Regular data quality audits using these techniques help maintain clean, searchable data in your Elasticsearch indices.
