# How to use Elasticsearch index templates for consistent log mapping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Index Templates, Mappings, EFK Stack, Data Modeling

Description: Configure Elasticsearch index templates to automatically apply consistent mappings, settings, and aliases to new indices, ensuring optimal query performance and data consistency across your logging infrastructure.

---

Elasticsearch index templates define the structure, settings, and aliases for indices before they are created. For logging workloads where new indices are created daily or when thresholds are met, templates ensure every index has the correct field mappings, shard configuration, and lifecycle policies without manual intervention.

This guide covers creating and managing index templates for Kubernetes logs, including dynamic templates, component templates, and best practices for maintainable index structures.

## Understanding index templates

Index templates in Elasticsearch automatically apply configurations to new indices matching specific patterns. They define:
- Field mappings and data types
- Index settings (shards, replicas, refresh intervals)
- Index aliases
- ILM policies
- Priority for template precedence

Templates apply when indices are created, ensuring consistency across your logging infrastructure.

## Creating a basic index template

Define a template for Kubernetes logs:

```bash
curl -X PUT "https://elasticsearch.logging.svc:9200/_index_template/kubernetes-logs?pretty" \
  -u elastic:$ELASTIC_PASSWORD \
  -H 'Content-Type: application/json' \
  -d '{
    "index_patterns": ["kubernetes-*", "k8s-*"],
    "priority": 100,
    "template": {
      "settings": {
        "number_of_shards": 3,
        "number_of_replicas": 1,
        "refresh_interval": "5s",
        "index.lifecycle.name": "kubernetes-logs-policy",
        "index.codec": "best_compression"
      },
      "mappings": {
        "properties": {
          "@timestamp": {
            "type": "date",
            "format": "strict_date_optional_time||epoch_millis"
          },
          "kubernetes": {
            "properties": {
              "namespace_name": { "type": "keyword" },
              "pod_name": { "type": "keyword" },
              "container_name": { "type": "keyword" },
              "host": { "type": "keyword" },
              "labels": {
                "type": "object",
                "dynamic": true
              }
            }
          },
          "log": {
            "type": "text",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256
              }
            }
          },
          "level": { "type": "keyword" },
          "message": { "type": "text" }
        }
      },
      "aliases": {
        "kubernetes-current": {}
      }
    }
  }'
```

This template applies to any index starting with `kubernetes-` or `k8s-`.

## Using dynamic templates

Handle unknown fields automatically:

```json
{
  "index_patterns": ["app-*"],
  "template": {
    "mappings": {
      "dynamic_templates": [
        {
          "strings_as_keywords": {
            "match_mapping_type": "string",
            "match": "*_id",
            "mapping": {
              "type": "keyword"
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
          "strings_as_text": {
            "match_mapping_type": "string",
            "mapping": {
              "type": "text",
              "fields": {
                "keyword": {
                  "type": "keyword",
                  "ignore_above": 256
                }
              }
            }
          }
        }
      ]
    }
  }
}
```

## Implementing component templates

Reuse configuration across templates:

```bash
# Create component for common settings
curl -X PUT "https://elasticsearch.logging.svc:9200/_component_template/logs-settings?pretty" \
  -u elastic:$ELASTIC_PASSWORD \
  -H 'Content-Type: application/json' \
  -d '{
    "template": {
      "settings": {
        "number_of_shards": 3,
        "number_of_replicas": 1,
        "index.lifecycle.name": "logs-policy"
      }
    }
  }'

# Create component for common mappings
curl -X PUT "https://elasticsearch.logging.svc:9200/_component_template/logs-mappings?pretty" \
  -u elastic:$ELASTIC_PASSWORD \
  -H 'Content-Type: application/json' \
  -d '{
    "template": {
      "mappings": {
        "properties": {
          "@timestamp": { "type": "date" },
          "message": { "type": "text" },
          "level": { "type": "keyword" }
        }
      }
    }
  }'

# Use components in index template
curl -X PUT "https://elasticsearch.logging.svc:9200/_index_template/application-logs?pretty" \
  -u elastic:$ELASTIC_PASSWORD \
  -H 'Content-Type: application/json' \
  -d '{
    "index_patterns": ["app-*"],
    "composed_of": ["logs-settings", "logs-mappings"],
    "priority": 200,
    "template": {
      "mappings": {
        "properties": {
          "app_name": { "type": "keyword" },
          "user_id": { "type": "keyword" }
        }
      }
    }
  }'
```

## Optimizing field mappings

Configure fields for search and aggregation:

```json
{
  "mappings": {
    "properties": {
      "user_id": {
        "type": "keyword",
        "doc_values": true
      },
      "session_id": {
        "type": "keyword",
        "index": false,
        "doc_values": true
      },
      "error_message": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": {
            "type": "keyword",
            "ignore_above": 256
          }
        }
      },
      "ip_address": {
        "type": "ip"
      },
      "geo_location": {
        "type": "geo_point"
      },
      "duration_ms": {
        "type": "long"
      },
      "created_at": {
        "type": "date",
        "format": "strict_date_optional_time||epoch_millis"
      }
    }
  }
}
```

## Managing template priority

Control which template applies when patterns overlap:

```bash
# Low priority base template
curl -X PUT "https://elasticsearch.logging.svc:9200/_index_template/base-logs?pretty" \
  -H 'Content-Type: application/json' \
  -d '{
    "index_patterns": ["*-logs-*"],
    "priority": 1,
    "template": {
      "settings": {
        "number_of_shards": 1
      }
    }
  }'

# High priority specific template
curl -X PUT "https://elasticsearch.logging.svc:9200/_index_template/production-logs?pretty" \
  -H 'Content-Type: application/json' \
  -d '{
    "index_patterns": ["production-logs-*"],
    "priority": 100,
    "template": {
      "settings": {
        "number_of_shards": 5
      }
    }
  }'
```

Higher priority wins when patterns match.

## Best practices

1. **Use component templates:** Promote reusability
2. **Set appropriate shard counts:** 50GB per shard is optimal
3. **Enable doc_values:** Required for aggregations and sorting
4. **Use keyword for exact match:** Store IDs, statuses as keywords
5. **Disable indexing when not searching:** Save space with index: false
6. **Plan for growth:** Use dynamic templates for unknown fields
7. **Test templates:** Validate before production
8. **Version templates:** Track changes over time

## Conclusion

Elasticsearch index templates ensure consistent structure across your logging indices. By properly configuring mappings, settings, and using component templates for reusability, you create a maintainable foundation for log data that optimizes both query performance and storage efficiency.
