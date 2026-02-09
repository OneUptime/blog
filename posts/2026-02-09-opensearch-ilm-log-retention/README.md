# How to Use OpenSearch Index Lifecycle Management for Kubernetes Log Retention

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Kubernetes, Logging

Description: Configure OpenSearch Index Lifecycle Management (ILM) policies to automatically manage Kubernetes log retention, optimize storage costs, and maintain query performance.

---

Kubernetes logs accumulate quickly, and without proper lifecycle management, storage costs skyrocket while query performance degrades. OpenSearch Index Lifecycle Management automates index transitions through hot, warm, cold, and deletion phases based on age, size, or custom criteria. This guide shows you how to implement ILM for Kubernetes logs.

## Understanding OpenSearch ILM

ILM manages indices through distinct phases:

- **Hot**: Recent logs with high query frequency, stored on fast storage
- **Warm**: Older logs with reduced query needs, moved to standard storage
- **Cold**: Historical logs for compliance, stored on slow/cheap storage
- **Delete**: Expired logs automatically removed

Each phase has configurable actions like rollover, shrink, force merge, and allocation.

## Creating Basic ILM Policy

Define a simple policy for Kubernetes logs:

```json
PUT _plugins/_ism/policies/kubernetes-logs-policy
{
  "policy": {
    "description": "Kubernetes logs lifecycle management",
    "default_state": "hot",
    "states": [
      {
        "name": "hot",
        "actions": [
          {
            "rollover": {
              "min_index_age": "1d",
              "min_primary_shard_size": "50gb"
            }
          }
        ],
        "transitions": [
          {
            "state_name": "warm",
            "conditions": {
              "min_index_age": "7d"
            }
          }
        ]
      },
      {
        "name": "warm",
        "actions": [
          {
            "replica_count": {
              "number_of_replicas": 1
            }
          },
          {
            "allocation": {
              "require": {
                "box_type": "warm"
              }
            }
          }
        ],
        "transitions": [
          {
            "state_name": "cold",
            "conditions": {
              "min_index_age": "30d"
            }
          }
        ]
      },
      {
        "name": "cold",
        "actions": [
          {
            "replica_count": {
              "number_of_replicas": 0
            }
          },
          {
            "allocation": {
              "require": {
                "box_type": "cold"
              }
            }
          }
        ],
        "transitions": [
          {
            "state_name": "delete",
            "conditions": {
              "min_index_age": "90d"
            }
          }
        ]
      },
      {
        "name": "delete",
        "actions": [
          {
            "delete": {}
          }
        ]
      }
    ]
  }
}
```

## Applying ILM Policy to Index Templates

Create index template with ILM policy:

```json
PUT _index_template/kubernetes-logs
{
  "index_patterns": ["kubernetes-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "refresh_interval": "30s",
      "plugins.index_state_management.policy_id": "kubernetes-logs-policy",
      "plugins.index_state_management.rollover_alias": "kubernetes-logs"
    },
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "kubernetes": {
          "properties": {
            "namespace": { "type": "keyword" },
            "pod_name": { "type": "keyword" },
            "container_name": { "type": "keyword" },
            "labels": { "type": "object" }
          }
        },
        "message": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "level": { "type": "keyword" },
        "stream": { "type": "keyword" }
      }
    }
  }
}
```

## Creating Initial Write Index

Bootstrap the rollover alias:

```json
PUT kubernetes-logs-000001
{
  "aliases": {
    "kubernetes-logs": {
      "is_write_index": true
    }
  }
}
```

## Advanced ILM with Shrink and Force Merge

Optimize indices during warm phase:

```json
PUT _plugins/_ism/policies/kubernetes-logs-optimized
{
  "policy": {
    "description": "Optimized Kubernetes logs with shrink and merge",
    "default_state": "hot",
    "states": [
      {
        "name": "hot",
        "actions": [
          {
            "rollover": {
              "min_index_age": "1d",
              "min_doc_count": 100000000,
              "min_size": "50gb"
            }
          }
        ],
        "transitions": [
          {
            "state_name": "warm",
            "conditions": {
              "min_index_age": "3d"
            }
          }
        ]
      },
      {
        "name": "warm",
        "actions": [
          {
            "replica_count": {
              "number_of_replicas": 1
            }
          },
          {
            "force_merge": {
              "max_num_segments": 1
            }
          },
          {
            "shrink": {
              "num_new_shards": 1,
              "target_index_name_template": {
                "source": "{{ctx.index}}-shrink"
              }
            }
          },
          {
            "allocation": {
              "require": {
                "box_type": "warm"
              }
            }
          }
        ],
        "transitions": [
          {
            "state_name": "cold",
            "conditions": {
              "min_index_age": "30d"
            }
          }
        ]
      },
      {
        "name": "cold",
        "actions": [
          {
            "replica_count": {
              "number_of_replicas": 0
            }
          },
          {
            "allocation": {
              "require": {
                "box_type": "cold"
              },
              "exclude": {
                "box_type": "hot,warm"
              }
            }
          },
          {
            "read_only": {}
          }
        ],
        "transitions": [
          {
            "state_name": "delete",
            "conditions": {
              "min_index_age": "90d"
            }
          }
        ]
      },
      {
        "name": "delete",
        "actions": [
          {
            "notification": {
              "destination": {
                "slack": {
                  "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
                }
              },
              "message_template": {
                "source": "Index {{ctx.index}} is being deleted after 90 days"
              }
            }
          },
          {
            "delete": {}
          }
        ]
      }
    ]
  }
}
```

## Configuring Fluent Bit to Write to Alias

Configure log shipper to use rollover alias:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-opensearch-config
  namespace: logging
data:
  fluent-bit.conf: |
    [OUTPUT]
        Name                opensearch
        Match               kube.*
        Host                opensearch.logging.svc.cluster.local
        Port                9200
        Index               kubernetes-logs
        Type                _doc
        Logstash_Format     Off
        Write_Operation     create
        Suppress_Type_Name  On
        tls                 On
        tls.verify          Off
```

## Namespace-Specific Retention Policies

Create different policies per namespace:

```json
PUT _plugins/_ism/policies/production-logs-policy
{
  "policy": {
    "description": "Production logs with extended retention",
    "default_state": "hot",
    "states": [
      {
        "name": "hot",
        "actions": [{"rollover": {"min_index_age": "1d"}}],
        "transitions": [{"state_name": "warm", "conditions": {"min_index_age": "7d"}}]
      },
      {
        "name": "warm",
        "actions": [{"force_merge": {"max_num_segments": 1}}],
        "transitions": [{"state_name": "cold", "conditions": {"min_index_age": "60d"}}]
      },
      {
        "name": "cold",
        "actions": [{"replica_count": {"number_of_replicas": 0}}],
        "transitions": [{"state_name": "delete", "conditions": {"min_index_age": "365d"}}]
      },
      {
        "name": "delete",
        "actions": [{"delete": {}}]
      }
    ]
  }
}

PUT _plugins/_ism/policies/development-logs-policy
{
  "policy": {
    "description": "Development logs with short retention",
    "default_state": "hot",
    "states": [
      {
        "name": "hot",
        "actions": [{"rollover": {"min_index_age": "1d"}}],
        "transitions": [{"state_name": "delete", "conditions": {"min_index_age": "7d"}}]
      },
      {
        "name": "delete",
        "actions": [{"delete": {}}]
      }
    ]
  }
}
```

## Monitoring ILM Policy Execution

Query policy states:

```json
GET kubernetes-logs-*/_plugins/_ism/explain

GET _plugins/_ism/explain?show_policy=true

GET _plugins/_ism/policies/kubernetes-logs-policy/_explain
```

Create alerts for ILM failures:

```json
POST _plugins/_alerting/monitors
{
  "type": "monitor",
  "name": "ILM Policy Failures",
  "enabled": true,
  "schedule": {
    "period": {
      "interval": 5,
      "unit": "MINUTES"
    }
  },
  "inputs": [{
    "search": {
      "indices": [".opendistro-ism-config"],
      "query": {
        "bool": {
          "filter": [{
            "term": {
              "policy_id": "kubernetes-logs-policy"
            }
          }, {
            "term": {
              "state": "failed"
            }
          }]
        }
      }
    }
  }],
  "triggers": [{
    "name": "ILM Failure Alert",
    "severity": "1",
    "condition": {
      "script": {
        "source": "ctx.results[0].hits.total.value > 0"
      }
    },
    "actions": [{
      "name": "Notify Slack",
      "destination_id": "slack-destination",
      "message_template": {
        "source": "ILM policy failed for indices"
      }
    }]
  }]
}
```

## Optimizing Storage with Compression

Enable best compression for older indices:

```json
PUT kubernetes-logs-*/_settings
{
  "index": {
    "codec": "best_compression"
  }
}
```

Add to warm phase actions:

```json
{
  "name": "warm",
  "actions": [
    {
      "index_codec": {
        "codec": "best_compression"
      }
    }
  ]
}
```

## Snapshot and Restore Integration

Add snapshot action before deletion:

```json
{
  "name": "delete",
  "actions": [
    {
      "snapshot": {
        "repository": "s3-backup",
        "snapshot": "{{ctx.index}}-final-snapshot"
      }
    },
    {
      "delete": {}
    }
  ]
}
```

Register S3 snapshot repository:

```json
PUT _snapshot/s3-backup
{
  "type": "s3",
  "settings": {
    "bucket": "opensearch-backups",
    "region": "us-east-1",
    "base_path": "kubernetes-logs",
    "compress": true
  }
}
```

## Best Practices

1. **Test policies on non-production data**: Validate before applying to production
2. **Monitor index sizes**: Ensure rollover thresholds are appropriate
3. **Use warm storage**: Significant cost savings for older logs
4. **Enable compression**: Reduces storage by 50-70%
5. **Set force_merge in warm phase**: Improves query performance
6. **Plan retention based on compliance**: Match legal requirements
7. **Regular policy reviews**: Adjust based on actual usage patterns

## Conclusion

OpenSearch ILM provides automated, cost-effective log retention management for Kubernetes environments. By transitioning indices through hot, warm, and cold phases, you optimize both storage costs and query performance. Start with conservative retention periods, monitor storage consumption, and adjust policies based on your compliance requirements and budget constraints. Proper ILM configuration can reduce storage costs by 70% or more while maintaining accessibility for recent logs.
