# How to Implement Elasticsearch Data Streams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Elasticsearch, Data Streams, Time Series, Indexing

Description: Use Elasticsearch data streams for time-series data with automatic rollover, simplified indexing, and lifecycle management.

---

## Introduction

Data streams are a powerful Elasticsearch feature designed specifically for time-series data like logs, metrics, and events. Instead of managing individual indices manually, data streams provide an abstraction layer that handles index creation, rollover, and lifecycle management automatically.

This guide walks through implementing data streams from scratch, including index templates, ILM policies, and practical querying patterns.

## What Are Data Streams?

A data stream is a named resource that represents multiple backing indices. When you write data to a data stream, Elasticsearch routes documents to the appropriate backing index automatically.

### Key Characteristics

| Feature | Description |
|---------|-------------|
| Append-only | Documents can only be added, not updated in place |
| Write index | Only the most recent backing index accepts writes |
| Timestamp required | Every document must have a `@timestamp` field |
| Automatic rollover | New backing indices created based on ILM policies |
| Unified search | Query all backing indices through single data stream name |

### Data Stream vs Regular Index

| Aspect | Data Stream | Regular Index |
|--------|-------------|---------------|
| Write target | Abstracted, automatic | Direct index name |
| Rollover | Automatic via ILM | Manual or scripted |
| Updates/Deletes | Not directly supported | Fully supported |
| Use case | Time-series, append-only | General purpose |
| Timestamp field | Required | Optional |

## Prerequisites

Before implementing data streams, ensure you have:

- Elasticsearch 7.9 or later (data streams became GA in 7.9)
- Proper cluster permissions for index template and ILM management
- Understanding of your data retention requirements

Check your Elasticsearch version:

```bash
curl -X GET "localhost:9200"
```

Expected response showing version info:

```json
{
  "version": {
    "number": "8.12.0",
    "build_flavor": "default",
    "build_type": "docker"
  },
  "tagline": "You Know, for Search"
}
```

## Step 1: Create an ILM Policy

Index Lifecycle Management (ILM) policies define how backing indices transition through phases and when rollover occurs. Start by creating a policy that handles hot, warm, and delete phases.

The following policy keeps data in the hot phase for 7 days or until it reaches 50GB, then moves it to warm storage, and finally deletes it after 30 days:

```json
PUT _ilm/policy/logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_age": "7d",
            "max_primary_shard_size": "50gb"
          },
          "set_priority": {
            "priority": 100
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "set_priority": {
            "priority": 50
          },
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
}
```

### ILM Policy Breakdown

| Phase | Trigger | Actions |
|-------|---------|---------|
| Hot | Immediate | Rollover at 7 days or 50GB, high priority |
| Warm | 7 days after rollover | Shrink to 1 shard, force merge segments |
| Delete | 30 days after rollover | Remove index completely |

Verify the policy was created:

```bash
curl -X GET "localhost:9200/_ilm/policy/logs-policy?pretty"
```

## Step 2: Create a Component Template

Component templates are reusable building blocks for index templates. Create separate components for mappings and settings to keep things modular.

### Mappings Component

This component defines the field mappings for your log data. The `@timestamp` field is mandatory for data streams:

```json
PUT _component_template/logs-mappings
{
  "template": {
    "mappings": {
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
              "ignore_above": 256
            }
          }
        },
        "log_level": {
          "type": "keyword"
        },
        "service": {
          "type": "keyword"
        },
        "host": {
          "properties": {
            "name": {
              "type": "keyword"
            },
            "ip": {
              "type": "ip"
            }
          }
        },
        "trace_id": {
          "type": "keyword"
        },
        "span_id": {
          "type": "keyword"
        },
        "error": {
          "properties": {
            "message": {
              "type": "text"
            },
            "stack_trace": {
              "type": "text",
              "index": false
            },
            "type": {
              "type": "keyword"
            }
          }
        },
        "http": {
          "properties": {
            "method": {
              "type": "keyword"
            },
            "status_code": {
              "type": "integer"
            },
            "url": {
              "type": "keyword"
            },
            "response_time_ms": {
              "type": "float"
            }
          }
        },
        "labels": {
          "type": "flattened"
        }
      }
    }
  },
  "_meta": {
    "description": "Mappings for application logs data stream"
  }
}
```

### Settings Component

This component configures index settings including shard count, replicas, and ILM policy attachment:

```json
PUT _component_template/logs-settings
{
  "template": {
    "settings": {
      "number_of_shards": 2,
      "number_of_replicas": 1,
      "index.lifecycle.name": "logs-policy",
      "index.codec": "best_compression",
      "index.refresh_interval": "5s",
      "index.translog.durability": "async",
      "index.translog.sync_interval": "30s"
    }
  },
  "_meta": {
    "description": "Settings for application logs data stream"
  }
}
```

### Settings Explained

| Setting | Value | Purpose |
|---------|-------|---------|
| `number_of_shards` | 2 | Parallelism for writes and searches |
| `number_of_replicas` | 1 | Fault tolerance, one copy per shard |
| `lifecycle.name` | logs-policy | Links to ILM policy for automatic management |
| `codec` | best_compression | Reduces storage at cost of CPU |
| `refresh_interval` | 5s | Balance between near-real-time and performance |
| `translog.durability` | async | Faster writes, slight durability tradeoff |

## Step 3: Create the Index Template

The index template ties everything together. It references the component templates and specifies that this template should create data streams:

```json
PUT _index_template/logs-template
{
  "index_patterns": ["logs-*"],
  "data_stream": {},
  "composed_of": ["logs-mappings", "logs-settings"],
  "priority": 500,
  "_meta": {
    "description": "Template for application logs data streams",
    "version": "1.0.0"
  }
}
```

Key points about this template:

- `index_patterns`: Matches any data stream starting with `logs-`
- `data_stream: {}`: This empty object tells Elasticsearch to create a data stream, not a regular index
- `composed_of`: References the component templates in order
- `priority`: Higher values take precedence when multiple templates match

Verify the template:

```bash
curl -X GET "localhost:9200/_index_template/logs-template?pretty"
```

## Step 4: Create the Data Stream

With the template in place, creating a data stream is straightforward. You can either create it explicitly or let it be created on first write.

### Explicit Creation

Create the data stream directly:

```json
PUT _data_stream/logs-application
```

Response:

```json
{
  "acknowledged": true
}
```

### Implicit Creation

Alternatively, the data stream is created automatically when you first write to it:

```json
POST logs-application/_doc
{
  "@timestamp": "2026-01-30T10:00:00.000Z",
  "message": "Application started successfully",
  "log_level": "INFO",
  "service": "api-gateway"
}
```

### View Data Stream Details

Check the data stream and its backing indices:

```bash
curl -X GET "localhost:9200/_data_stream/logs-application?pretty"
```

Response showing the data stream structure:

```json
{
  "data_streams": [
    {
      "name": "logs-application",
      "timestamp_field": {
        "name": "@timestamp"
      },
      "indices": [
        {
          "index_name": ".ds-logs-application-2026.01.30-000001",
          "index_uuid": "abc123...",
          "prefer_ilm": true,
          "managed_by": "Index Lifecycle Management"
        }
      ],
      "generation": 1,
      "status": "GREEN",
      "template": "logs-template",
      "ilm_policy": "logs-policy",
      "hidden": false,
      "system": false,
      "allow_custom_routing": false,
      "replicated": false
    }
  ]
}
```

## Step 5: Writing Data to the Data Stream

Data streams support only append operations. Use the `_doc` endpoint without specifying an ID since documents are created, not updated.

### Single Document Write

Write individual documents to the data stream:

```json
POST logs-application/_doc
{
  "@timestamp": "2026-01-30T10:15:30.123Z",
  "message": "User authentication successful",
  "log_level": "INFO",
  "service": "auth-service",
  "host": {
    "name": "auth-prod-01",
    "ip": "10.0.1.50"
  },
  "trace_id": "abc123def456",
  "labels": {
    "environment": "production",
    "region": "us-east-1"
  }
}
```

### Bulk Write Operations

For high-throughput scenarios, use the bulk API. This is the recommended approach for production workloads:

```json
POST logs-application/_bulk
{"create":{}}
{"@timestamp":"2026-01-30T10:20:00.000Z","message":"Request received","log_level":"DEBUG","service":"api-gateway","http":{"method":"GET","url":"/api/users","status_code":200,"response_time_ms":45.2}}
{"create":{}}
{"@timestamp":"2026-01-30T10:20:00.050Z","message":"Database query executed","log_level":"DEBUG","service":"user-service","trace_id":"trace-001"}
{"create":{}}
{"@timestamp":"2026-01-30T10:20:00.100Z","message":"Response sent","log_level":"INFO","service":"api-gateway","http":{"method":"GET","url":"/api/users","status_code":200,"response_time_ms":52.8}}
{"create":{}}
{"@timestamp":"2026-01-30T10:20:01.000Z","message":"Connection pool exhausted","log_level":"WARN","service":"database-proxy","error":{"message":"No available connections","type":"ConnectionPoolException"}}
{"create":{}}
{"@timestamp":"2026-01-30T10:20:02.500Z","message":"Failed to process request","log_level":"ERROR","service":"payment-service","error":{"message":"Invalid card number","type":"ValidationError","stack_trace":"at PaymentProcessor.validate()\nat PaymentController.process()"}}
```

### Bulk Write Best Practices

| Practice | Recommendation |
|----------|----------------|
| Batch size | 5-15 MB per request, or 1000-5000 documents |
| Parallelism | 2-4 concurrent bulk requests per node |
| Retries | Implement exponential backoff for 429 errors |
| Document order | Not guaranteed, use `@timestamp` for ordering |

### Python Bulk Write Example

Here is a Python script for bulk writing logs using the official Elasticsearch client:

```python
from elasticsearch import Elasticsearch, helpers
from datetime import datetime, timezone
import random

# Initialize the client
es = Elasticsearch(
    ["http://localhost:9200"],
    basic_auth=("elastic", "your-password")
)

def generate_log_documents(count):
    """Generate sample log documents for testing."""
    services = ["api-gateway", "auth-service", "user-service", "payment-service"]
    log_levels = ["DEBUG", "INFO", "WARN", "ERROR"]

    for i in range(count):
        doc = {
            "@timestamp": datetime.now(timezone.utc).isoformat(),
            "message": f"Log message number {i}",
            "log_level": random.choice(log_levels),
            "service": random.choice(services),
            "host": {
                "name": f"prod-node-{random.randint(1, 10):02d}",
                "ip": f"10.0.1.{random.randint(1, 254)}"
            },
            "trace_id": f"trace-{random.randint(10000, 99999)}",
            "labels": {
                "environment": "production"
            }
        }

        # Add HTTP fields for some documents
        if random.random() > 0.5:
            doc["http"] = {
                "method": random.choice(["GET", "POST", "PUT", "DELETE"]),
                "status_code": random.choice([200, 201, 400, 404, 500]),
                "response_time_ms": random.uniform(10, 500)
            }

        yield {
            "_index": "logs-application",
            "_source": doc
        }

# Perform bulk indexing
success, failed = helpers.bulk(
    es,
    generate_log_documents(10000),
    chunk_size=1000,
    request_timeout=60
)

print(f"Successfully indexed: {success}")
print(f"Failed: {failed}")
```

## Step 6: Querying Data Streams

Query data streams the same way you query regular indices. Elasticsearch automatically searches all backing indices.

### Basic Search

Search across all documents in the data stream:

```json
GET logs-application/_search
{
  "query": {
    "match_all": {}
  },
  "size": 10,
  "sort": [
    {"@timestamp": "desc"}
  ]
}
```

### Time Range Query

Filter logs within a specific time window. This is the most common query pattern for time-series data:

```json
GET logs-application/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "@timestamp": {
              "gte": "2026-01-30T00:00:00.000Z",
              "lte": "2026-01-30T23:59:59.999Z"
            }
          }
        }
      ]
    }
  },
  "sort": [
    {"@timestamp": "desc"}
  ]
}
```

### Filtering by Log Level and Service

Combine multiple filters to narrow down results:

```json
GET logs-application/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "@timestamp": {
              "gte": "now-1h"
            }
          }
        }
      ],
      "filter": [
        {
          "term": {
            "log_level": "ERROR"
          }
        },
        {
          "term": {
            "service": "payment-service"
          }
        }
      ]
    }
  },
  "size": 100,
  "sort": [
    {"@timestamp": "desc"}
  ],
  "_source": ["@timestamp", "message", "error", "trace_id"]
}
```

### Aggregations for Log Analysis

Aggregate log data to identify patterns and issues:

```json
GET logs-application/_search
{
  "size": 0,
  "query": {
    "range": {
      "@timestamp": {
        "gte": "now-24h"
      }
    }
  },
  "aggs": {
    "logs_over_time": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "1h"
      },
      "aggs": {
        "by_level": {
          "terms": {
            "field": "log_level"
          }
        }
      }
    },
    "error_by_service": {
      "filter": {
        "term": {
          "log_level": "ERROR"
        }
      },
      "aggs": {
        "services": {
          "terms": {
            "field": "service",
            "size": 10
          }
        }
      }
    },
    "avg_response_time": {
      "filter": {
        "exists": {
          "field": "http.response_time_ms"
        }
      },
      "aggs": {
        "avg_time": {
          "avg": {
            "field": "http.response_time_ms"
          }
        },
        "percentiles": {
          "percentiles": {
            "field": "http.response_time_ms",
            "percents": [50, 90, 95, 99]
          }
        }
      }
    }
  }
}
```

### Search Across Multiple Data Streams

Use wildcards to search across related data streams:

```json
GET logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "message": "connection failed"
          }
        }
      ],
      "filter": [
        {
          "range": {
            "@timestamp": {
              "gte": "now-6h"
            }
          }
        }
      ]
    }
  }
}
```

## Step 7: Managing Rollover

Rollover creates a new backing index when conditions are met. ILM handles this automatically, but you can also trigger it manually.

### Manual Rollover

Force a rollover to create a new backing index immediately:

```json
POST logs-application/_rollover
```

Response showing the new index:

```json
{
  "acknowledged": true,
  "shards_acknowledged": true,
  "old_index": ".ds-logs-application-2026.01.30-000001",
  "new_index": ".ds-logs-application-2026.01.30-000002",
  "rolled_over": true,
  "dry_run": false,
  "conditions": {}
}
```

### Conditional Rollover

Rollover only if specific conditions are met:

```json
POST logs-application/_rollover
{
  "conditions": {
    "max_age": "1d",
    "max_docs": 1000000,
    "max_primary_shard_size": "25gb"
  }
}
```

### Check Rollover Status

View ILM status for backing indices:

```bash
curl -X GET "localhost:9200/.ds-logs-application-*/_ilm/explain?pretty"
```

Response showing lifecycle state:

```json
{
  "indices": {
    ".ds-logs-application-2026.01.30-000001": {
      "index": ".ds-logs-application-2026.01.30-000001",
      "managed": true,
      "policy": "logs-policy",
      "index_creation_date_millis": 1738231200000,
      "time_since_index_creation": "2.5h",
      "lifecycle_date_millis": 1738231200000,
      "age": "2.5h",
      "phase": "hot",
      "phase_time_millis": 1738231200000,
      "action": "rollover",
      "action_time_millis": 1738231200000,
      "step": "check-rollover-ready",
      "step_time_millis": 1738231200000,
      "phase_execution": {
        "policy": "logs-policy",
        "phase_definition": {
          "min_age": "0ms",
          "actions": {
            "rollover": {
              "max_age": "7d",
              "max_primary_shard_size": "50gb"
            }
          }
        }
      }
    }
  }
}
```

## Step 8: Handling Updates and Deletes

Data streams are append-only by design, but you can still handle updates and deletes when necessary.

### Update by Query

Update documents matching specific criteria across all backing indices:

```json
POST logs-application/_update_by_query
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "trace_id": "abc123def456"
          }
        }
      ]
    }
  },
  "script": {
    "source": "ctx._source.labels.reviewed = true",
    "lang": "painless"
  }
}
```

### Delete by Query

Remove documents matching specific criteria:

```json
POST logs-application/_delete_by_query
{
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "@timestamp": {
              "lt": "2026-01-01T00:00:00.000Z"
            }
          }
        }
      ]
    }
  }
}
```

### Update Single Document

To update a specific document, you need to know which backing index contains it. First, find the document:

```json
GET logs-application/_search
{
  "query": {
    "term": {
      "trace_id": "specific-trace-id"
    }
  }
}
```

Then update using the backing index name and document ID from the search result:

```json
POST .ds-logs-application-2026.01.30-000001/_update/document_id
{
  "doc": {
    "labels": {
      "processed": true
    }
  }
}
```

## Step 9: Monitoring Data Streams

Monitor your data streams to ensure healthy operation and catch issues early.

### Data Stream Statistics

Get statistics for all data streams:

```json
GET _data_stream/logs-*/_stats
```

Response with detailed statistics:

```json
{
  "_shards": {
    "total": 4,
    "successful": 4,
    "failed": 0
  },
  "data_stream_count": 1,
  "backing_indices": 2,
  "total_store_size_bytes": 1073741824,
  "data_streams": [
    {
      "data_stream": "logs-application",
      "backing_indices": 2,
      "store_size_bytes": 1073741824,
      "maximum_timestamp": 1738324800000
    }
  ]
}
```

### Index-Level Metrics

Check individual backing index statistics:

```json
GET .ds-logs-application-*/_stats/docs,store,indexing
```

### ILM Status Overview

Check ILM status for all managed indices:

```json
GET _ilm/status
```

### Monitoring Queries

Useful queries for operational monitoring:

```json
# Count documents by backing index
GET .ds-logs-application-*/_count

# Check index health
GET _cluster/health/.ds-logs-application-*?level=indices

# View shard allocation
GET _cat/shards/.ds-logs-application-*?v&h=index,shard,prirep,state,docs,store,node
```

## Step 10: Advanced Configurations

### Custom Timestamp Field

Use a different field as the timestamp by specifying it in the index template:

```json
PUT _index_template/logs-custom-timestamp
{
  "index_patterns": ["custom-logs-*"],
  "data_stream": {
    "timestamp_field": {
      "name": "event_time"
    }
  },
  "template": {
    "mappings": {
      "properties": {
        "event_time": {
          "type": "date"
        }
      }
    }
  }
}
```

### Multiple Data Streams with Shared Template

Create templates that handle multiple related data streams:

```json
PUT _index_template/logs-multi-service
{
  "index_patterns": ["logs-app-*", "logs-infra-*", "logs-security-*"],
  "data_stream": {},
  "composed_of": ["logs-mappings", "logs-settings"],
  "priority": 400
}
```

This template creates separate data streams for each pattern:

- `logs-app-frontend`
- `logs-app-backend`
- `logs-infra-kubernetes`
- `logs-security-audit`

### Tiered Storage Configuration

Configure data movement across storage tiers:

```json
PUT _ilm/policy/logs-tiered-policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_age": "1d",
            "max_primary_shard_size": "50gb"
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
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "allocate": {
            "require": {
              "data": "cold"
            }
          },
          "freeze": {}
        }
      },
      "frozen": {
        "min_age": "90d",
        "actions": {
          "searchable_snapshot": {
            "snapshot_repository": "my-repository"
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
}
```

### Storage Tier Comparison

| Tier | Storage Type | Query Performance | Cost |
|------|--------------|-------------------|------|
| Hot | SSD/NVMe | Fastest | Highest |
| Warm | HDD | Good | Medium |
| Cold | HDD | Slower | Lower |
| Frozen | Object storage | Slowest | Lowest |

## Troubleshooting Common Issues

### Data Stream Creation Fails

If data stream creation fails, check these common causes:

```bash
# Verify template exists and matches pattern
curl -X GET "localhost:9200/_index_template/logs-*?pretty"

# Check for conflicting templates
curl -X GET "localhost:9200/_index_template?pretty" | grep -A5 "index_patterns"

# Validate component templates exist
curl -X GET "localhost:9200/_component_template/logs-*?pretty"
```

### ILM Not Triggering Rollover

If rollover is not happening as expected:

```bash
# Check ILM polling interval (default 10 minutes)
curl -X GET "localhost:9200/_cluster/settings?include_defaults=true&filter_path=**.poll_interval"

# Force ILM to retry
curl -X POST "localhost:9200/_ilm/retry/.ds-logs-application-2026.01.30-000001"

# Check for ILM errors
curl -X GET "localhost:9200/.ds-logs-application-*/_ilm/explain?only_errors=true"
```

### Missing Timestamp Field Error

If documents are rejected due to missing timestamp:

```json
{
  "error": {
    "type": "illegal_argument_exception",
    "reason": "data stream timestamp field [@timestamp] is missing"
  }
}
```

Ensure every document includes the `@timestamp` field with a valid date format.

### Write Blocked on Data Stream

If writes are blocked:

```bash
# Check for read-only blocks
curl -X GET "localhost:9200/.ds-logs-application-*/_settings/index.blocks.*?pretty"

# Remove read-only block if set due to disk space
curl -X PUT "localhost:9200/.ds-logs-application-*/_settings" -H "Content-Type: application/json" -d '
{
  "index.blocks.read_only_allow_delete": null
}'
```

## Migration from Regular Indices

If you have existing indices you want to migrate to a data stream, follow this process.

### Step 1: Create Data Stream Template

Create the index template with data stream configuration (as shown earlier).

### Step 2: Create the Data Stream

```json
PUT _data_stream/logs-application
```

### Step 3: Reindex Existing Data

Reindex from existing indices to the new data stream:

```json
POST _reindex
{
  "source": {
    "index": "old-logs-*"
  },
  "dest": {
    "index": "logs-application",
    "op_type": "create"
  }
}
```

### Step 4: Verify and Cleanup

After verification, remove old indices:

```bash
# Verify document counts match
curl -X GET "localhost:9200/old-logs-*/_count"
curl -X GET "localhost:9200/logs-application/_count"

# Delete old indices (be careful)
curl -X DELETE "localhost:9200/old-logs-*"
```

## Performance Optimization Tips

### Indexing Performance

| Optimization | Setting | Impact |
|--------------|---------|--------|
| Bulk size | 5-15 MB per request | Reduces overhead |
| Refresh interval | 30s for high-volume | Reduces I/O |
| Translog durability | async | Faster writes |
| Replica count | 0 during bulk load | Faster initial indexing |

### Query Performance

| Optimization | Technique | Benefit |
|--------------|-----------|---------|
| Time filtering | Always include `@timestamp` range | Skips irrelevant backing indices |
| Field selection | Use `_source` filtering | Reduces network transfer |
| Pagination | Use `search_after` for deep pagination | Avoids expensive skips |
| Caching | Use filter context for repeated queries | Leverages query cache |

### Example Optimized Query

```json
GET logs-application/_search
{
  "query": {
    "bool": {
      "filter": [
        {
          "range": {
            "@timestamp": {
              "gte": "now-1h",
              "lte": "now"
            }
          }
        },
        {
          "term": {
            "service": "api-gateway"
          }
        }
      ]
    }
  },
  "size": 100,
  "sort": [
    {"@timestamp": "desc"},
    {"_id": "asc"}
  ],
  "_source": ["@timestamp", "message", "log_level"],
  "track_total_hits": false
}
```

## Conclusion

Elasticsearch data streams provide a robust solution for managing time-series data. By combining data streams with ILM policies, you get automatic index lifecycle management without manual intervention.

Key takeaways:

1. Data streams abstract away backing index management
2. ILM policies automate rollover, shrinking, and deletion
3. Component templates keep configurations modular and reusable
4. Always include `@timestamp` in documents and queries
5. Use bulk operations for production workloads
6. Monitor ILM status to catch issues early

Start with a simple configuration and expand based on your specific requirements. The flexibility of data streams allows you to adjust retention policies, storage tiers, and rollover conditions as your needs evolve.
