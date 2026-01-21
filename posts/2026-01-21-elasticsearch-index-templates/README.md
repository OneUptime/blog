# How to Implement Index Templates in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Index Templates, Schema Management, Indexing, DevOps

Description: A comprehensive guide to implementing Elasticsearch index templates for consistent mapping across indices, covering composable templates, component templates, and lifecycle integration.

---

Index templates in Elasticsearch automatically apply settings, mappings, and aliases to new indices that match a pattern. This is essential for managing time-based indices, log data, and any scenario where indices are created dynamically. This guide covers creating and managing index templates effectively.

## Understanding Index Templates

Index templates define:

- **Settings**: Shard count, replicas, analysis configuration
- **Mappings**: Field types and analyzers
- **Aliases**: Automatic alias assignment
- **Priority**: Order of template application

## Types of Templates

Elasticsearch supports two types of templates:

1. **Composable templates** (recommended): Modern, modular templates
2. **Legacy templates** (deprecated): Older template format

## Creating Composable Index Templates

### Basic Template

```bash
curl -X PUT "https://localhost:9200/_index_template/logs-template" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["logs-*"],
    "priority": 100,
    "template": {
      "settings": {
        "number_of_shards": 3,
        "number_of_replicas": 1
      },
      "mappings": {
        "properties": {
          "@timestamp": { "type": "date" },
          "message": { "type": "text" },
          "level": { "type": "keyword" },
          "service": { "type": "keyword" },
          "host": { "type": "keyword" }
        }
      },
      "aliases": {
        "logs-all": {}
      }
    }
  }'
```

### Template with Data Stream

For time-series data, use data streams:

```bash
curl -X PUT "https://localhost:9200/_index_template/metrics-template" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["metrics-*"],
    "data_stream": {},
    "priority": 200,
    "template": {
      "settings": {
        "number_of_shards": 2,
        "number_of_replicas": 1
      },
      "mappings": {
        "properties": {
          "@timestamp": { "type": "date" },
          "metric_name": { "type": "keyword" },
          "value": { "type": "double" },
          "tags": { "type": "keyword" }
        }
      }
    }
  }'
```

## Component Templates

Component templates are reusable building blocks for composable templates.

### Create Component Templates

Settings component:

```bash
curl -X PUT "https://localhost:9200/_component_template/logs-settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "template": {
      "settings": {
        "number_of_shards": 3,
        "number_of_replicas": 1,
        "refresh_interval": "5s",
        "index.lifecycle.name": "logs-policy",
        "index.lifecycle.rollover_alias": "logs-current"
      }
    }
  }'
```

Mappings component:

```bash
curl -X PUT "https://localhost:9200/_component_template/logs-mappings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "template": {
      "mappings": {
        "dynamic": "strict",
        "properties": {
          "@timestamp": {
            "type": "date",
            "format": "strict_date_optional_time||epoch_millis"
          },
          "message": {
            "type": "text",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 1024
              }
            }
          },
          "level": {
            "type": "keyword"
          },
          "logger": {
            "type": "keyword"
          },
          "thread": {
            "type": "keyword"
          },
          "exception": {
            "type": "object",
            "properties": {
              "class": { "type": "keyword" },
              "message": { "type": "text" },
              "stacktrace": { "type": "text" }
            }
          }
        }
      }
    }
  }'
```

Common fields component:

```bash
curl -X PUT "https://localhost:9200/_component_template/common-fields" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "template": {
      "mappings": {
        "properties": {
          "host": {
            "type": "object",
            "properties": {
              "name": { "type": "keyword" },
              "ip": { "type": "ip" },
              "os": { "type": "keyword" }
            }
          },
          "service": {
            "type": "object",
            "properties": {
              "name": { "type": "keyword" },
              "version": { "type": "keyword" },
              "environment": { "type": "keyword" }
            }
          },
          "labels": {
            "type": "object",
            "dynamic": true
          }
        }
      }
    }
  }'
```

### Compose Templates from Components

```bash
curl -X PUT "https://localhost:9200/_index_template/logs-template" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["logs-*"],
    "composed_of": ["logs-settings", "logs-mappings", "common-fields"],
    "priority": 100,
    "template": {
      "aliases": {
        "logs-all": {}
      }
    },
    "_meta": {
      "description": "Template for application logs",
      "version": "1.0.0"
    }
  }'
```

## Template Priority

When multiple templates match an index pattern, priority determines which applies:

```bash
# General template (lower priority)
curl -X PUT "https://localhost:9200/_index_template/general-logs" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["logs-*"],
    "priority": 100,
    "template": {
      "settings": {
        "number_of_shards": 1
      }
    }
  }'

# Specific template (higher priority)
curl -X PUT "https://localhost:9200/_index_template/production-logs" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["logs-production-*"],
    "priority": 200,
    "template": {
      "settings": {
        "number_of_shards": 3,
        "number_of_replicas": 2
      }
    }
  }'
```

## Dynamic Templates

Control how dynamically added fields are mapped:

```bash
curl -X PUT "https://localhost:9200/_index_template/flexible-logs" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["flex-logs-*"],
    "template": {
      "mappings": {
        "dynamic_templates": [
          {
            "strings_as_keywords": {
              "match_mapping_type": "string",
              "mapping": {
                "type": "keyword"
              }
            }
          },
          {
            "long_strings_as_text": {
              "match_mapping_type": "string",
              "match": "*_text",
              "mapping": {
                "type": "text"
              }
            }
          },
          {
            "integers_as_long": {
              "match_mapping_type": "long",
              "mapping": {
                "type": "long"
              }
            }
          },
          {
            "ip_fields": {
              "match": "*_ip",
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
          }
        ],
        "properties": {
          "@timestamp": { "type": "date" }
        }
      }
    }
  }'
```

## Integration with Index Lifecycle Management

### Create ILM Policy

```bash
curl -X PUT "https://localhost:9200/_ilm/policy/logs-policy" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "min_age": "0ms",
          "actions": {
            "rollover": {
              "max_primary_shard_size": "50gb",
              "max_age": "1d"
            },
            "set_priority": {
              "priority": 100
            }
          }
        },
        "warm": {
          "min_age": "7d",
          "actions": {
            "shrink": {
              "number_of_shards": 1
            },
            "forcemerge": {
              "max_num_segments": 1
            },
            "set_priority": {
              "priority": 50
            }
          }
        },
        "cold": {
          "min_age": "30d",
          "actions": {
            "set_priority": {
              "priority": 0
            }
          }
        },
        "delete": {
          "min_age": "90d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'
```

### Template with ILM

```bash
curl -X PUT "https://localhost:9200/_index_template/logs-with-ilm" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["logs-*"],
    "template": {
      "settings": {
        "number_of_shards": 3,
        "number_of_replicas": 1,
        "index.lifecycle.name": "logs-policy",
        "index.lifecycle.rollover_alias": "logs"
      },
      "mappings": {
        "properties": {
          "@timestamp": { "type": "date" },
          "message": { "type": "text" }
        }
      },
      "aliases": {
        "logs": {
          "is_write_index": true
        }
      }
    }
  }'
```

### Bootstrap the Index

```bash
curl -X PUT "https://localhost:9200/logs-000001" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "aliases": {
      "logs": {
        "is_write_index": true
      }
    }
  }'
```

## Managing Templates

### List All Templates

```bash
curl -X GET "https://localhost:9200/_index_template?pretty" \
  -u elastic:password
```

### Get Specific Template

```bash
curl -X GET "https://localhost:9200/_index_template/logs-template?pretty" \
  -u elastic:password
```

### Simulate Template Application

```bash
curl -X POST "https://localhost:9200/_index_template/_simulate_index/logs-2024.01.15" \
  -u elastic:password
```

### Delete Template

```bash
curl -X DELETE "https://localhost:9200/_index_template/logs-template" \
  -u elastic:password
```

### List Component Templates

```bash
curl -X GET "https://localhost:9200/_component_template?pretty" \
  -u elastic:password
```

## Complete Example: Multi-tier Logging System

```bash
# Component: Base settings
curl -X PUT "https://localhost:9200/_component_template/base-settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "template": {
      "settings": {
        "refresh_interval": "5s",
        "number_of_replicas": 1
      }
    }
  }'

# Component: Log mappings
curl -X PUT "https://localhost:9200/_component_template/log-mappings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "template": {
      "mappings": {
        "dynamic": "strict",
        "properties": {
          "@timestamp": { "type": "date" },
          "message": { "type": "text" },
          "level": { "type": "keyword" },
          "logger": { "type": "keyword" },
          "service": { "type": "keyword" },
          "environment": { "type": "keyword" },
          "trace_id": { "type": "keyword" },
          "span_id": { "type": "keyword" }
        }
      }
    }
  }'

# Component: Development settings
curl -X PUT "https://localhost:9200/_component_template/dev-settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "template": {
      "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0
      }
    }
  }'

# Component: Production settings
curl -X PUT "https://localhost:9200/_component_template/prod-settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "template": {
      "settings": {
        "number_of_shards": 3,
        "number_of_replicas": 2,
        "index.lifecycle.name": "logs-policy"
      }
    }
  }'

# Development template
curl -X PUT "https://localhost:9200/_index_template/logs-dev" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["logs-dev-*"],
    "composed_of": ["base-settings", "log-mappings", "dev-settings"],
    "priority": 100,
    "template": {
      "aliases": {
        "logs-dev": {}
      }
    }
  }'

# Production template
curl -X PUT "https://localhost:9200/_index_template/logs-prod" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["logs-prod-*"],
    "composed_of": ["base-settings", "log-mappings", "prod-settings"],
    "priority": 200,
    "template": {
      "aliases": {
        "logs-prod": {}
      }
    }
  }'
```

## Best Practices

### 1. Use Component Templates

Break down templates into reusable components for easier maintenance.

### 2. Set Appropriate Priorities

Higher priority templates should be more specific:
- General templates: 100-199
- Environment-specific: 200-299
- Application-specific: 300+

### 3. Include Metadata

Document your templates:

```json
{
  "_meta": {
    "description": "Template for application logs",
    "version": "2.0.0",
    "author": "platform-team",
    "last_updated": "2024-01-15"
  }
}
```

### 4. Test Before Deploying

Use the simulate API to verify template behavior:

```bash
curl -X POST "https://localhost:9200/_index_template/_simulate_index/test-index" \
  -u elastic:password
```

### 5. Version Your Templates

Track template versions in metadata and use versioned names when making breaking changes.

## Conclusion

Index templates are essential for managing Elasticsearch indices at scale. Key takeaways:

1. **Use composable templates** - Modern and flexible
2. **Create reusable components** - Reduce duplication
3. **Set priorities correctly** - More specific templates get higher priority
4. **Integrate with ILM** - Automate index lifecycle
5. **Test before deployment** - Use simulate API
6. **Document templates** - Include metadata

With well-designed templates, you can ensure consistent index configuration across your entire Elasticsearch deployment.
