# How to Implement Log Retention Policies in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, ILM, Index Lifecycle Management, Log Retention, Data Management, Storage

Description: A comprehensive guide to implementing log retention policies in Elasticsearch using Index Lifecycle Management (ILM), covering policy configuration, data tiers, rollover, and cost optimization.

---

Index Lifecycle Management (ILM) in Elasticsearch automates the management of indices through their lifecycle - from creation to deletion. This guide covers implementing effective log retention policies using ILM.

## Understanding Index Lifecycle

ILM manages indices through phases:

```
Hot Phase -> Warm Phase -> Cold Phase -> Frozen Phase -> Delete Phase
(Active)    (Less active)  (Rare access) (Archive)      (Cleanup)
```

Each phase can have different:
- Hardware (SSD vs HDD)
- Replicas
- Search performance
- Storage cost

## Data Tiers Architecture

### Node Configuration

Configure nodes for different tiers:

```yaml
# Hot node - elasticsearch.yml
node.roles: [data_hot, data_content, ingest]
node.attr.data: hot

# Warm node - elasticsearch.yml
node.roles: [data_warm]
node.attr.data: warm

# Cold node - elasticsearch.yml
node.roles: [data_cold]
node.attr.data: cold

# Frozen node - elasticsearch.yml
node.roles: [data_frozen]
node.attr.data: frozen
```

### Verify Node Tiers

```bash
curl -u elastic:password -X GET "localhost:9200/_cat/nodeattrs?v&h=node,attr,value"
```

## Creating ILM Policies

### Basic Log Retention Policy

```bash
curl -u elastic:password -X PUT "localhost:9200/_ilm/policy/logs-retention-policy" -H 'Content-Type: application/json' -d'
{
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

### Comprehensive Production Policy

```bash
curl -u elastic:password -X PUT "localhost:9200/_ilm/policy/logs-production-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50gb",
            "max_age": "1d",
            "max_docs": 100000000
          },
          "set_priority": {
            "priority": 100
          }
        }
      },
      "warm": {
        "min_age": "3d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          },
          "allocate": {
            "require": {
              "data": "warm"
            }
          },
          "set_priority": {
            "priority": 50
          }
        }
      },
      "cold": {
        "min_age": "14d",
        "actions": {
          "allocate": {
            "require": {
              "data": "cold"
            },
            "number_of_replicas": 0
          },
          "set_priority": {
            "priority": 0
          }
        }
      },
      "frozen": {
        "min_age": "30d",
        "actions": {
          "searchable_snapshot": {
            "snapshot_repository": "logs-snapshots"
          }
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}'
```

### Policy with Read-Only

```bash
curl -u elastic:password -X PUT "localhost:9200/_ilm/policy/logs-readonly-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50gb",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "readonly": {},
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}'
```

## Index Templates with ILM

### Create Index Template

```bash
curl -u elastic:password -X PUT "localhost:9200/_index_template/logs-template" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "index.lifecycle.name": "logs-retention-policy",
      "index.lifecycle.rollover_alias": "logs"
    },
    "mappings": {
      "properties": {
        "@timestamp": {"type": "date"},
        "message": {"type": "text"},
        "level": {"type": "keyword"},
        "service": {
          "properties": {
            "name": {"type": "keyword"}
          }
        }
      }
    }
  },
  "priority": 100
}'
```

### Bootstrap Index with Alias

```bash
curl -u elastic:password -X PUT "localhost:9200/logs-000001" -H 'Content-Type: application/json' -d'
{
  "aliases": {
    "logs": {
      "is_write_index": true
    }
  }
}'
```

## Different Retention by Log Type

### Application Logs (30 days)

```bash
curl -u elastic:password -X PUT "localhost:9200/_ilm/policy/app-logs-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50gb",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": {"number_of_shards": 1},
          "forcemerge": {"max_num_segments": 1}
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {"delete": {}}
      }
    }
  }
}'
```

### Security Logs (1 year)

```bash
curl -u elastic:password -X PUT "localhost:9200/_ilm/policy/security-logs-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50gb",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "shrink": {"number_of_shards": 1},
          "forcemerge": {"max_num_segments": 1},
          "allocate": {"require": {"data": "warm"}}
        }
      },
      "cold": {
        "min_age": "90d",
        "actions": {
          "allocate": {
            "require": {"data": "cold"},
            "number_of_replicas": 0
          }
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": {"delete": {}}
      }
    }
  }
}'
```

### Audit Logs (7 years - Compliance)

```bash
curl -u elastic:password -X PUT "localhost:9200/_ilm/policy/audit-logs-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50gb",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "shrink": {"number_of_shards": 1},
          "forcemerge": {"max_num_segments": 1}
        }
      },
      "cold": {
        "min_age": "90d",
        "actions": {
          "allocate": {"number_of_replicas": 0}
        }
      },
      "frozen": {
        "min_age": "180d",
        "actions": {
          "searchable_snapshot": {
            "snapshot_repository": "audit-archive"
          }
        }
      },
      "delete": {
        "min_age": "2555d",
        "actions": {"delete": {}}
      }
    }
  }
}'
```

## Searchable Snapshots

### Create Snapshot Repository

```bash
curl -u elastic:password -X PUT "localhost:9200/_snapshot/logs-archive" -H 'Content-Type: application/json' -d'
{
  "type": "s3",
  "settings": {
    "bucket": "elasticsearch-snapshots",
    "region": "us-east-1",
    "base_path": "logs-archive"
  }
}'
```

### ILM with Searchable Snapshots

```bash
curl -u elastic:password -X PUT "localhost:9200/_ilm/policy/logs-archive-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50gb",
            "max_age": "1d"
          }
        }
      },
      "frozen": {
        "min_age": "30d",
        "actions": {
          "searchable_snapshot": {
            "snapshot_repository": "logs-archive",
            "force_merge_index": true
          }
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}'
```

## Monitoring ILM

### Check Policy Status

```bash
# Get all policies
curl -u elastic:password -X GET "localhost:9200/_ilm/policy?pretty"

# Get specific policy
curl -u elastic:password -X GET "localhost:9200/_ilm/policy/logs-retention-policy?pretty"
```

### Check Index ILM Status

```bash
# ILM explain for specific index
curl -u elastic:password -X GET "localhost:9200/logs-000001/_ilm/explain?pretty"

# ILM explain for pattern
curl -u elastic:password -X GET "localhost:9200/logs-*/_ilm/explain?pretty"
```

Response example:

```json
{
  "indices": {
    "logs-000001": {
      "index": "logs-000001",
      "managed": true,
      "policy": "logs-retention-policy",
      "lifecycle_date_millis": 1705833600000,
      "age": "5d",
      "phase": "warm",
      "phase_time_millis": 1705660800000,
      "action": "complete",
      "action_time_millis": 1705660900000,
      "step": "complete",
      "step_time_millis": 1705661000000
    }
  }
}
```

### ILM Status

```bash
# Overall ILM status
curl -u elastic:password -X GET "localhost:9200/_ilm/status?pretty"

# Stop ILM (for maintenance)
curl -u elastic:password -X POST "localhost:9200/_ilm/stop"

# Start ILM
curl -u elastic:password -X POST "localhost:9200/_ilm/start"
```

## Manual ILM Operations

### Move to Next Phase

```bash
curl -u elastic:password -X POST "localhost:9200/_ilm/move/logs-000001" -H 'Content-Type: application/json' -d'
{
  "current_step": {
    "phase": "hot",
    "action": "complete",
    "name": "complete"
  },
  "next_step": {
    "phase": "warm",
    "action": "shrink",
    "name": "shrink"
  }
}'
```

### Retry Failed Step

```bash
curl -u elastic:password -X POST "localhost:9200/logs-000001/_ilm/retry"
```

### Remove Index from ILM

```bash
curl -u elastic:password -X POST "localhost:9200/logs-000001/_ilm/remove"
```

## Troubleshooting ILM

### Common Issues

#### Index Stuck in Phase

```bash
# Check explain
curl -u elastic:password -X GET "localhost:9200/logs-000001/_ilm/explain?pretty"

# Look for step_info for error details
```

#### Rollover Not Happening

```bash
# Check rollover conditions
curl -u elastic:password -X GET "localhost:9200/logs-000001/_stats?pretty"

# Manual rollover
curl -u elastic:password -X POST "localhost:9200/logs/_rollover"
```

#### Allocation Issues

```bash
# Check allocation explain
curl -u elastic:password -X GET "localhost:9200/_cluster/allocation/explain?pretty" -H 'Content-Type: application/json' -d'
{
  "index": "logs-000001",
  "shard": 0,
  "primary": true
}'
```

### ILM Errors

```bash
# Find indices with ILM errors
curl -u elastic:password -X GET "localhost:9200/*/_ilm/explain?only_errors=true&pretty"
```

## Cost Optimization

### Storage Tier Recommendations

| Data Age | Tier | Replicas | Notes |
|----------|------|----------|-------|
| 0-7 days | Hot | 1 | SSD, fast search |
| 7-30 days | Warm | 1 | HDD acceptable |
| 30-90 days | Cold | 0 | Reduced resources |
| 90+ days | Frozen | 0 | Searchable snapshots |

### Size-Based Policies

```bash
curl -u elastic:password -X PUT "localhost:9200/_ilm/policy/size-based-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_primary_shard_size": "30gb"
          }
        }
      },
      "warm": {
        "min_age": "0ms",
        "actions": {
          "shrink": {"number_of_shards": 1},
          "forcemerge": {"max_num_segments": 1}
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {"delete": {}}
      }
    }
  }
}'
```

### Downsampling for Metrics

```bash
curl -u elastic:password -X PUT "localhost:9200/_ilm/policy/metrics-downsample-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50gb",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "downsample": {
            "fixed_interval": "1h"
          },
          "forcemerge": {"max_num_segments": 1}
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "downsample": {
            "fixed_interval": "1d"
          }
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": {"delete": {}}
      }
    }
  }
}'
```

## Best Practices

### 1. Plan Retention by Data Type

Different log types have different requirements:
- Debug logs: 7 days
- Application logs: 30 days
- Security logs: 1 year
- Audit logs: 7 years

### 2. Use Appropriate Shard Sizes

- Target 20-50GB per shard
- Configure rollover based on size, age, and doc count
- Shrink to single shard in warm phase

### 3. Monitor Storage Usage

```bash
# Storage by tier
curl -u elastic:password -X GET "localhost:9200/_cat/allocation?v"

# Index sizes
curl -u elastic:password -X GET "localhost:9200/_cat/indices?v&s=store.size:desc"
```

### 4. Test Policies

Test in development before production:
- Use shorter time periods
- Verify transitions work correctly
- Check searchable snapshot restoration

## Summary

Implementing log retention with ILM provides:

1. **Automated lifecycle management** - No manual intervention needed
2. **Cost optimization** - Data moves to cheaper tiers
3. **Compliance support** - Meet retention requirements
4. **Storage efficiency** - Shrink, merge, and compress older data
5. **Searchable archives** - Access historical data when needed

With properly configured ILM policies, you can efficiently manage petabytes of log data while maintaining searchability and meeting compliance requirements.
