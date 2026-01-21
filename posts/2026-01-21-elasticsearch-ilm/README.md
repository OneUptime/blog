# How to Manage Elasticsearch Index Lifecycle

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, ILM, Index Lifecycle, Retention, Rollover, Data Management

Description: A comprehensive guide to managing Elasticsearch index lifecycle with ILM policies, covering rollover, shrink, force merge, and retention strategies for efficient data management.

---

Index Lifecycle Management (ILM) automates the management of indices as they age. From creation through deletion, ILM handles rollover, shrinking, moving between tiers, and cleanup. This guide covers implementing effective lifecycle policies.

## Understanding ILM Phases

ILM defines five phases:

1. **Hot**: Active write and search
2. **Warm**: No writes, still searchable
3. **Cold**: Infrequent access, reduced resources
4. **Frozen**: Rare access, minimal resources
5. **Delete**: Remove data

## Creating ILM Policies

### Basic Policy

```bash
curl -X PUT "https://localhost:9200/_ilm/policy/logs_policy" \
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

### Complete Policy with All Phases

```bash
curl -X PUT "https://localhost:9200/_ilm/policy/comprehensive_policy" \
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
              "max_age": "1d",
              "max_docs": 100000000
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
            "allocate": {
              "number_of_replicas": 1,
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
          "min_age": "30d",
          "actions": {
            "allocate": {
              "number_of_replicas": 0,
              "require": {
                "data": "cold"
              }
            },
            "set_priority": {
              "priority": 0
            }
          }
        },
        "frozen": {
          "min_age": "60d",
          "actions": {
            "searchable_snapshot": {
              "snapshot_repository": "found-snapshots"
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

## Rollover

### Rollover Conditions

```bash
curl -X PUT "https://localhost:9200/_ilm/policy/rollover_policy" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_primary_shard_size": "50gb",
              "max_age": "1d",
              "max_docs": 100000000,
              "max_primary_shard_docs": 50000000
            }
          }
        }
      }
    }
  }'
```

### Manual Rollover

```bash
curl -X POST "https://localhost:9200/logs-000001/_rollover" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "conditions": {
      "max_age": "1d",
      "max_docs": 1000000,
      "max_size": "5gb"
    }
  }'
```

## Data Streams

### Create Index Template with ILM

```bash
curl -X PUT "https://localhost:9200/_index_template/logs_template" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["logs-*"],
    "data_stream": {},
    "template": {
      "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 1,
        "index.lifecycle.name": "logs_policy"
      },
      "mappings": {
        "properties": {
          "@timestamp": { "type": "date" },
          "message": { "type": "text" },
          "level": { "type": "keyword" }
        }
      }
    }
  }'
```

### Create Data Stream

```bash
curl -X PUT "https://localhost:9200/_data_stream/logs-app" \
  -u elastic:password
```

### Index to Data Stream

```bash
curl -X POST "https://localhost:9200/logs-app/_doc" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "@timestamp": "2024-01-15T10:00:00Z",
    "message": "Application started",
    "level": "info"
  }'
```

## Phase Actions

### Hot Phase Actions

```bash
curl -X PUT "https://localhost:9200/_ilm/policy/hot_actions" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_primary_shard_size": "50gb"
            },
            "set_priority": {
              "priority": 100
            },
            "forcemerge": {
              "max_num_segments": 1
            },
            "readonly": {}
          }
        }
      }
    }
  }'
```

### Warm Phase Actions

```bash
curl -X PUT "https://localhost:9200/_ilm/policy/warm_actions" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "warm": {
          "min_age": "7d",
          "actions": {
            "shrink": {
              "number_of_shards": 1
            },
            "forcemerge": {
              "max_num_segments": 1
            },
            "allocate": {
              "number_of_replicas": 1,
              "include": {},
              "exclude": {},
              "require": {
                "data": "warm"
              }
            },
            "set_priority": {
              "priority": 50
            }
          }
        }
      }
    }
  }'
```

### Cold Phase Actions

```bash
curl -X PUT "https://localhost:9200/_ilm/policy/cold_actions" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "cold": {
          "min_age": "30d",
          "actions": {
            "allocate": {
              "number_of_replicas": 0,
              "require": {
                "data": "cold"
              }
            },
            "freeze": {},
            "set_priority": {
              "priority": 0
            }
          }
        }
      }
    }
  }'
```

### Frozen Phase with Searchable Snapshots

```bash
curl -X PUT "https://localhost:9200/_ilm/policy/frozen_actions" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "frozen": {
          "min_age": "60d",
          "actions": {
            "searchable_snapshot": {
              "snapshot_repository": "snapshots"
            }
          }
        }
      }
    }
  }'
```

## Applying ILM to Indices

### Apply to Existing Index

```bash
curl -X PUT "https://localhost:9200/logs-2024.01/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.lifecycle.name": "logs_policy"
  }'
```

### Apply via Index Template

```bash
curl -X PUT "https://localhost:9200/_index_template/logs" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["logs-*"],
    "template": {
      "settings": {
        "index.lifecycle.name": "logs_policy",
        "index.lifecycle.rollover_alias": "logs"
      }
    }
  }'
```

## Monitoring ILM

### ILM Status

```bash
curl -X GET "https://localhost:9200/_ilm/status" \
  -u elastic:password
```

### Index ILM Status

```bash
# All indices
curl -X GET "https://localhost:9200/*/_ilm/explain" \
  -u elastic:password

# Specific index
curl -X GET "https://localhost:9200/logs-2024.01/_ilm/explain" \
  -u elastic:password
```

### ILM Errors

```bash
curl -X GET "https://localhost:9200/*/_ilm/explain?only_errors=true" \
  -u elastic:password
```

## Retry Failed ILM Step

```bash
curl -X POST "https://localhost:9200/logs-2024.01/_ilm/retry" \
  -u elastic:password
```

## ILM for Different Use Cases

### Logs Policy

```bash
curl -X PUT "https://localhost:9200/_ilm/policy/logs" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
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
            "shrink": { "number_of_shards": 1 },
            "forcemerge": { "max_num_segments": 1 }
          }
        },
        "delete": {
          "min_age": "30d",
          "actions": { "delete": {} }
        }
      }
    }
  }'
```

### Metrics Policy

```bash
curl -X PUT "https://localhost:9200/_ilm/policy/metrics" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_primary_shard_size": "30gb",
              "max_age": "1d"
            }
          }
        },
        "warm": {
          "min_age": "3d",
          "actions": {
            "shrink": { "number_of_shards": 1 },
            "forcemerge": { "max_num_segments": 1 },
            "allocate": { "number_of_replicas": 0 }
          }
        },
        "delete": {
          "min_age": "14d",
          "actions": { "delete": {} }
        }
      }
    }
  }'
```

### Compliance/Archival Policy

```bash
curl -X PUT "https://localhost:9200/_ilm/policy/compliance" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_primary_shard_size": "50gb",
              "max_age": "30d"
            }
          }
        },
        "warm": {
          "min_age": "90d",
          "actions": {
            "shrink": { "number_of_shards": 1 },
            "forcemerge": { "max_num_segments": 1 }
          }
        },
        "cold": {
          "min_age": "365d",
          "actions": {
            "allocate": { "number_of_replicas": 0 }
          }
        },
        "frozen": {
          "min_age": "730d",
          "actions": {
            "searchable_snapshot": {
              "snapshot_repository": "archive"
            }
          }
        },
        "delete": {
          "min_age": "2555d",
          "actions": { "delete": {} }
        }
      }
    }
  }'
```

## ILM Best Practices

### 1. Use Data Streams

```bash
# Data streams automatically manage rollover
curl -X PUT "https://localhost:9200/_data_stream/logs-production" \
  -u elastic:password
```

### 2. Set Appropriate Phase Timing

Consider:
- Query patterns (when is data accessed?)
- Storage costs
- Compliance requirements

### 3. Monitor ILM Progress

```bash
# Check indices in each phase
curl -X GET "https://localhost:9200/*/_ilm/explain?filter_path=indices.*.phase" \
  -u elastic:password
```

### 4. Test Policies First

```bash
# Create test policy with shorter timings
curl -X PUT "https://localhost:9200/_ilm/policy/test_policy" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": { "max_docs": 100 }
          }
        },
        "delete": {
          "min_age": "1m",
          "actions": { "delete": {} }
        }
      }
    }
  }'
```

### 5. Use Shard Sizing Guidelines

- Hot: 10-50GB per shard
- Warm/Cold: Can be larger after shrink/forcemerge

## Conclusion

Index Lifecycle Management provides:

1. **Automated rollover** for active indices
2. **Optimization** with shrink and force merge
3. **Tiered storage** for cost efficiency
4. **Automatic deletion** for retention compliance
5. **Searchable snapshots** for frozen tier

Properly configured ILM policies ensure data is stored efficiently while meeting access and retention requirements.
