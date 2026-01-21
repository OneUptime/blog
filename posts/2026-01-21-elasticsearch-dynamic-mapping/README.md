# How to Use Dynamic Mapping in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Dynamic Mapping, Schema, Indexing, Data Modeling

Description: A comprehensive guide to using Elasticsearch dynamic mapping, covering automatic field detection, dynamic templates, runtime fields, and controlling mapping behavior.

---

Elasticsearch's dynamic mapping feature automatically detects and maps new fields as documents are indexed. While convenient for development, understanding how to control dynamic mapping is essential for production systems. This guide covers everything you need to know about dynamic mapping.

## How Dynamic Mapping Works

When you index a document with a field not in the mapping, Elasticsearch:

1. Detects the field's data type
2. Creates a mapping for the field
3. Indexes the document

Example - indexing without explicit mapping:

```bash
curl -X PUT "https://localhost:9200/my-index/_doc/1" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "title": "Introduction to Elasticsearch",
    "views": 100,
    "published": true,
    "created_at": "2024-01-15T10:30:00Z"
  }'
```

Check the resulting mapping:

```bash
curl -X GET "https://localhost:9200/my-index/_mapping?pretty" \
  -u elastic:password
```

Result:

```json
{
  "my-index": {
    "mappings": {
      "properties": {
        "title": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "views": {
          "type": "long"
        },
        "published": {
          "type": "boolean"
        },
        "created_at": {
          "type": "date"
        }
      }
    }
  }
}
```

## Default Type Detection

Elasticsearch detects types based on JSON values:

| JSON Type | Elasticsearch Type |
|-----------|-------------------|
| `null` | No field added |
| `true` or `false` | boolean |
| Floating point number | float |
| Integer | long |
| Object | object |
| Array | Depends on first element |
| Date string | date (if matches date format) |
| String | text with keyword subfield |

## Controlling Dynamic Mapping

### Dynamic Setting Options

Control dynamic mapping behavior:

```bash
# Enable dynamic mapping (default)
curl -X PUT "https://localhost:9200/dynamic-true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "dynamic": true
    }
  }'

# Disable dynamic mapping (reject new fields)
curl -X PUT "https://localhost:9200/dynamic-false" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "dynamic": false
    }
  }'

# Strict mode (throw error on new fields)
curl -X PUT "https://localhost:9200/dynamic-strict" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "dynamic": "strict"
    }
  }'

# Runtime mode (new fields as runtime fields)
curl -X PUT "https://localhost:9200/dynamic-runtime" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "dynamic": "runtime"
    }
  }'
```

### Object-Level Dynamic Settings

Apply different settings to different objects:

```bash
curl -X PUT "https://localhost:9200/mixed-dynamic" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "dynamic": "strict",
      "properties": {
        "user": {
          "type": "object",
          "dynamic": true,
          "properties": {
            "name": { "type": "text" }
          }
        },
        "metadata": {
          "type": "object",
          "dynamic": false
        }
      }
    }
  }'
```

## Dynamic Templates

Dynamic templates let you control how dynamically added fields are mapped.

### Basic Dynamic Template

```bash
curl -X PUT "https://localhost:9200/my-index" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "dynamic_templates": [
        {
          "strings_as_keywords": {
            "match_mapping_type": "string",
            "mapping": {
              "type": "keyword"
            }
          }
        }
      ]
    }
  }'
```

### Match Conditions

#### By Data Type

```json
{
  "dynamic_templates": [
    {
      "longs_as_integers": {
        "match_mapping_type": "long",
        "mapping": {
          "type": "integer"
        }
      }
    }
  ]
}
```

#### By Field Name Pattern

```json
{
  "dynamic_templates": [
    {
      "ip_fields": {
        "match": "*_ip",
        "mapping": {
          "type": "ip"
        }
      }
    },
    {
      "geo_fields": {
        "match": "*_location",
        "mapping": {
          "type": "geo_point"
        }
      }
    }
  ]
}
```

#### By Field Path

```json
{
  "dynamic_templates": [
    {
      "nested_strings": {
        "path_match": "user.*",
        "mapping": {
          "type": "keyword"
        }
      }
    }
  ]
}
```

#### Unmatch Conditions

```json
{
  "dynamic_templates": [
    {
      "strings_except_message": {
        "match_mapping_type": "string",
        "unmatch": "*_message",
        "mapping": {
          "type": "keyword"
        }
      }
    }
  ]
}
```

### Complete Dynamic Templates Example

```bash
curl -X PUT "https://localhost:9200/logs" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "dynamic_templates": [
        {
          "message_fields": {
            "match": "*_message",
            "mapping": {
              "type": "text",
              "analyzer": "standard"
            }
          }
        },
        {
          "ip_addresses": {
            "match": "*_ip",
            "match_mapping_type": "string",
            "mapping": {
              "type": "ip"
            }
          }
        },
        {
          "geo_points": {
            "match": "*_location",
            "mapping": {
              "type": "geo_point"
            }
          }
        },
        {
          "dates": {
            "match": "*_at",
            "mapping": {
              "type": "date",
              "format": "strict_date_optional_time||epoch_millis"
            }
          }
        },
        {
          "counts": {
            "match": "*_count",
            "match_mapping_type": "long",
            "mapping": {
              "type": "integer"
            }
          }
        },
        {
          "labels": {
            "path_match": "labels.*",
            "mapping": {
              "type": "keyword"
            }
          }
        },
        {
          "default_strings": {
            "match_mapping_type": "string",
            "mapping": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        }
      ],
      "properties": {
        "@timestamp": { "type": "date" },
        "message": { "type": "text" }
      }
    }
  }'
```

## Runtime Fields

Runtime fields are calculated at query time, not indexed.

### Define Runtime Fields in Mapping

```bash
curl -X PUT "https://localhost:9200/sales" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "runtime": {
        "profit": {
          "type": "double",
          "script": {
            "source": "emit(doc['"'"'revenue'"'"'].value - doc['"'"'cost'"'"'].value)"
          }
        },
        "day_of_week": {
          "type": "keyword",
          "script": {
            "source": "emit(doc['"'"'@timestamp'"'"'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT))"
          }
        }
      },
      "properties": {
        "@timestamp": { "type": "date" },
        "revenue": { "type": "double" },
        "cost": { "type": "double" }
      }
    }
  }'
```

### Runtime Fields in Queries

```bash
curl -X GET "https://localhost:9200/sales/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "runtime_mappings": {
      "profit_margin": {
        "type": "double",
        "script": {
          "source": "if (doc['"'"'revenue'"'"'].value > 0) { emit((doc['"'"'revenue'"'"'].value - doc['"'"'cost'"'"'].value) / doc['"'"'revenue'"'"'].value * 100); } else { emit(0); }"
        }
      }
    },
    "query": {
      "range": {
        "profit_margin": {
          "gte": 20
        }
      }
    },
    "fields": ["profit_margin", "revenue", "cost"]
  }'
```

### Dynamic Runtime Mode

New fields become runtime fields:

```bash
curl -X PUT "https://localhost:9200/runtime-index" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "dynamic": "runtime",
      "properties": {
        "@timestamp": { "type": "date" },
        "message": { "type": "text" }
      }
    }
  }'
```

## Date Detection

Control automatic date detection:

### Disable Date Detection

```bash
curl -X PUT "https://localhost:9200/no-dates" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "date_detection": false
    }
  }'
```

### Custom Date Formats

```bash
curl -X PUT "https://localhost:9200/custom-dates" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "date_detection": true,
      "dynamic_date_formats": [
        "strict_date_optional_time",
        "yyyy/MM/dd HH:mm:ss",
        "MM/dd/yyyy"
      ]
    }
  }'
```

## Numeric Detection

Enable automatic numeric string detection:

```bash
curl -X PUT "https://localhost:9200/numeric-strings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "numeric_detection": true
    }
  }'
```

With numeric detection enabled:
- `"123"` maps as `long`
- `"1.23"` maps as `float`

## Best Practices

### 1. Use Strict Mode in Production

```json
{
  "mappings": {
    "dynamic": "strict",
    "properties": { }
  }
}
```

### 2. Define Templates for Known Patterns

```json
{
  "dynamic_templates": [
    {
      "known_pattern": {
        "match": "expected_*",
        "mapping": {
          "type": "keyword"
        }
      }
    }
  ]
}
```

### 3. Use Runtime Fields for Flexibility

Test new fields with runtime mode before committing to indexed fields:

```json
{
  "mappings": {
    "dynamic": "runtime"
  }
}
```

### 4. Monitor Mapping Growth

Check for mapping explosion:

```bash
curl -X GET "https://localhost:9200/_cluster/stats?filter_path=indices.mappings" \
  -u elastic:password
```

### 5. Set Field Limits

Prevent mapping explosion:

```json
{
  "settings": {
    "index.mapping.total_fields.limit": 1000,
    "index.mapping.depth.limit": 20,
    "index.mapping.nested_fields.limit": 50,
    "index.mapping.nested_objects.limit": 10000
  }
}
```

## Troubleshooting

### Field Type Conflicts

When fields have different types across indices:

```bash
# Check field mapping conflicts
curl -X GET "https://localhost:9200/index-*/_field_caps?fields=*" \
  -u elastic:password
```

### Mapping Explosion

Too many fields can cause memory issues:

```bash
# Get mapping statistics
curl -X GET "https://localhost:9200/my-index/_stats/fielddata?fields=*" \
  -u elastic:password
```

### Unexpected Field Types

Debug why a field got a specific type:

```bash
# Analyze text to see how it would be mapped
curl -X GET "https://localhost:9200/my-index/_analyze" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "text": "2024-01-15"
  }'
```

## Conclusion

Dynamic mapping is powerful but requires careful management. Key takeaways:

1. **Understand detection rules** - Know how Elasticsearch determines types
2. **Use strict mode in production** - Prevent unexpected field additions
3. **Leverage dynamic templates** - Control mapping for known patterns
4. **Consider runtime fields** - For flexibility without indexing overhead
5. **Monitor mapping growth** - Prevent mapping explosion
6. **Set appropriate limits** - Protect cluster health

By properly configuring dynamic mapping, you can balance flexibility and control in your Elasticsearch deployments.
