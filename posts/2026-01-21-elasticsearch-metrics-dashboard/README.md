# How to Build a Metrics Dashboard with Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Metrics, Dashboard, Time-Series, Analytics, Visualization, Kibana

Description: A comprehensive guide to building metrics dashboards with Elasticsearch, covering time-series data ingestion, aggregations, Kibana visualizations, and real-time monitoring.

---

Elasticsearch can serve as a powerful metrics store for building real-time dashboards. This guide covers ingesting time-series metrics, creating aggregations, and building visualizations with Kibana.

## Index Design for Metrics

### Metrics Index Mapping

```bash
curl -u elastic:password -X PUT "localhost:9200/metrics" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "index.codec": "best_compression",
    "index.mapping.total_fields.limit": 2000
  },
  "mappings": {
    "properties": {
      "@timestamp": {"type": "date"},
      "host": {
        "properties": {
          "name": {"type": "keyword"},
          "ip": {"type": "ip"},
          "datacenter": {"type": "keyword"},
          "environment": {"type": "keyword"}
        }
      },
      "service": {
        "properties": {
          "name": {"type": "keyword"},
          "version": {"type": "keyword"},
          "type": {"type": "keyword"}
        }
      },
      "metric": {
        "properties": {
          "name": {"type": "keyword"},
          "type": {"type": "keyword"},
          "unit": {"type": "keyword"}
        }
      },
      "value": {"type": "float"},
      "tags": {"type": "keyword"}
    }
  }
}'
```

### Data Stream for Metrics

```bash
# Create index template for data stream
curl -u elastic:password -X PUT "localhost:9200/_index_template/metrics-template" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["metrics-*"],
  "data_stream": {},
  "template": {
    "settings": {
      "number_of_shards": 2,
      "number_of_replicas": 1
    },
    "mappings": {
      "properties": {
        "@timestamp": {"type": "date"},
        "host": {
          "properties": {
            "name": {"type": "keyword"},
            "ip": {"type": "ip"}
          }
        },
        "cpu": {
          "properties": {
            "user": {"type": "float"},
            "system": {"type": "float"},
            "idle": {"type": "float"},
            "iowait": {"type": "float"}
          }
        },
        "memory": {
          "properties": {
            "used": {"type": "long"},
            "free": {"type": "long"},
            "total": {"type": "long"},
            "percent": {"type": "float"}
          }
        },
        "disk": {
          "properties": {
            "read_bytes": {"type": "long"},
            "write_bytes": {"type": "long"},
            "used": {"type": "long"},
            "total": {"type": "long"},
            "percent": {"type": "float"}
          }
        },
        "network": {
          "properties": {
            "in_bytes": {"type": "long"},
            "out_bytes": {"type": "long"},
            "in_packets": {"type": "long"},
            "out_packets": {"type": "long"}
          }
        }
      }
    }
  }
}'

# Create data stream
curl -u elastic:password -X PUT "localhost:9200/_data_stream/metrics-system"
```

### Sample Metrics Documents

```bash
# System metrics
curl -u elastic:password -X POST "localhost:9200/metrics-system/_doc" -H 'Content-Type: application/json' -d'
{
  "@timestamp": "2024-01-21T10:00:00Z",
  "host": {
    "name": "web-server-01",
    "ip": "192.168.1.10"
  },
  "cpu": {
    "user": 45.2,
    "system": 12.5,
    "idle": 38.3,
    "iowait": 4.0
  },
  "memory": {
    "used": 6442450944,
    "free": 2147483648,
    "total": 8589934592,
    "percent": 75.0
  },
  "disk": {
    "read_bytes": 1048576,
    "write_bytes": 2097152,
    "used": 107374182400,
    "total": 214748364800,
    "percent": 50.0
  },
  "network": {
    "in_bytes": 5242880,
    "out_bytes": 10485760,
    "in_packets": 1000,
    "out_packets": 2000
  }
}'
```

## Time-Series Aggregations

### Basic Time-Series Query

```bash
curl -u elastic:password -X GET "localhost:9200/metrics-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        {"range": {"@timestamp": {"gte": "now-1h", "lte": "now"}}},
        {"term": {"host.name": "web-server-01"}}
      ]
    }
  },
  "aggs": {
    "cpu_over_time": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "1m"
      },
      "aggs": {
        "avg_cpu_user": {"avg": {"field": "cpu.user"}},
        "avg_cpu_system": {"avg": {"field": "cpu.system"}},
        "max_cpu_user": {"max": {"field": "cpu.user"}}
      }
    }
  }
}'
```

### Multiple Metrics Aggregation

```bash
curl -u elastic:password -X GET "localhost:9200/metrics-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "range": {
      "@timestamp": {
        "gte": "now-24h",
        "lte": "now"
      }
    }
  },
  "aggs": {
    "by_host": {
      "terms": {
        "field": "host.name",
        "size": 50
      },
      "aggs": {
        "metrics_over_time": {
          "date_histogram": {
            "field": "@timestamp",
            "fixed_interval": "5m"
          },
          "aggs": {
            "cpu_stats": {
              "stats": {"field": "cpu.user"}
            },
            "memory_percent": {
              "avg": {"field": "memory.percent"}
            },
            "disk_io": {
              "sum": {"field": "disk.read_bytes"}
            }
          }
        }
      }
    }
  }
}'
```

### Derivative for Rate Calculations

```bash
curl -u elastic:password -X GET "localhost:9200/metrics-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "range": {
      "@timestamp": {"gte": "now-1h"}
    }
  },
  "aggs": {
    "network_over_time": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "1m"
      },
      "aggs": {
        "total_bytes_in": {
          "sum": {"field": "network.in_bytes"}
        },
        "bytes_in_rate": {
          "derivative": {
            "buckets_path": "total_bytes_in",
            "unit": "second"
          }
        },
        "total_bytes_out": {
          "sum": {"field": "network.out_bytes"}
        },
        "bytes_out_rate": {
          "derivative": {
            "buckets_path": "total_bytes_out",
            "unit": "second"
          }
        }
      }
    }
  }
}'
```

### Percentiles for Latency Metrics

```bash
curl -u elastic:password -X GET "localhost:9200/metrics-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "aggs": {
    "latency_over_time": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "5m"
      },
      "aggs": {
        "latency_percentiles": {
          "percentiles": {
            "field": "response_time",
            "percents": [50, 75, 90, 95, 99]
          }
        },
        "latency_histogram": {
          "histogram": {
            "field": "response_time",
            "interval": 100
          }
        }
      }
    }
  }
}'
```

## Dashboard Queries

### System Overview Dashboard

```bash
curl -u elastic:password -X GET "localhost:9200/metrics-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "range": {
      "@timestamp": {"gte": "now-15m"}
    }
  },
  "aggs": {
    "hosts": {
      "terms": {
        "field": "host.name",
        "size": 100
      },
      "aggs": {
        "current_cpu": {
          "top_hits": {
            "size": 1,
            "sort": [{"@timestamp": "desc"}],
            "_source": ["cpu.user", "cpu.system", "memory.percent", "disk.percent"]
          }
        },
        "avg_cpu_15m": {
          "avg": {"field": "cpu.user"}
        },
        "max_memory_15m": {
          "max": {"field": "memory.percent"}
        }
      }
    },
    "total_hosts": {
      "cardinality": {"field": "host.name"}
    },
    "high_cpu_hosts": {
      "filter": {
        "range": {"cpu.user": {"gte": 80}}
      },
      "aggs": {
        "hosts": {
          "terms": {"field": "host.name"}
        }
      }
    }
  }
}'
```

### Service Health Dashboard

```bash
curl -u elastic:password -X GET "localhost:9200/metrics-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        {"range": {"@timestamp": {"gte": "now-1h"}}},
        {"term": {"metric.type": "http"}}
      ]
    }
  },
  "aggs": {
    "by_service": {
      "terms": {
        "field": "service.name",
        "size": 20
      },
      "aggs": {
        "request_rate": {
          "date_histogram": {
            "field": "@timestamp",
            "fixed_interval": "1m"
          },
          "aggs": {
            "requests": {"sum": {"field": "http.requests"}},
            "errors": {"sum": {"field": "http.errors"}},
            "error_rate": {
              "bucket_script": {
                "buckets_path": {
                  "errors": "errors",
                  "requests": "requests"
                },
                "script": "params.requests > 0 ? params.errors / params.requests * 100 : 0"
              }
            }
          }
        },
        "avg_latency": {
          "avg": {"field": "http.latency"}
        },
        "p99_latency": {
          "percentiles": {
            "field": "http.latency",
            "percents": [99]
          }
        }
      }
    }
  }
}'
```

### Moving Average for Trend Analysis

```bash
curl -u elastic:password -X GET "localhost:9200/metrics-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "range": {"@timestamp": {"gte": "now-24h"}}
  },
  "aggs": {
    "cpu_trend": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "15m"
      },
      "aggs": {
        "avg_cpu": {
          "avg": {"field": "cpu.user"}
        },
        "cpu_moving_avg": {
          "moving_avg": {
            "buckets_path": "avg_cpu",
            "window": 4,
            "model": "simple"
          }
        },
        "cpu_moving_avg_exp": {
          "moving_avg": {
            "buckets_path": "avg_cpu",
            "model": "ewma",
            "settings": {
              "alpha": 0.3
            }
          }
        }
      }
    }
  }
}'
```

## Kibana Dashboard Configuration

### Lens Visualization for CPU Usage

```json
{
  "title": "CPU Usage Over Time",
  "visualizationType": "lnsXY",
  "state": {
    "datasourceStates": {
      "indexpattern": {
        "layers": {
          "layer1": {
            "columns": {
              "date": {
                "dataType": "date",
                "operationType": "date_histogram",
                "sourceField": "@timestamp",
                "params": {
                  "interval": "auto"
                }
              },
              "cpu_user": {
                "dataType": "number",
                "operationType": "average",
                "sourceField": "cpu.user"
              },
              "cpu_system": {
                "dataType": "number",
                "operationType": "average",
                "sourceField": "cpu.system"
              }
            }
          }
        }
      }
    },
    "visualization": {
      "preferredSeriesType": "area_stacked",
      "layers": [{
        "layerId": "layer1",
        "xAccessor": "date",
        "accessors": ["cpu_user", "cpu_system"]
      }]
    }
  }
}
```

### Metric Panel for Current Values

```json
{
  "title": "Current CPU Usage",
  "visualizationType": "lnsMetric",
  "state": {
    "datasourceStates": {
      "indexpattern": {
        "layers": {
          "layer1": {
            "columns": {
              "cpu_current": {
                "dataType": "number",
                "operationType": "last_value",
                "sourceField": "cpu.user",
                "params": {
                  "sortField": "@timestamp"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## Real-Time Dashboard Updates

### Polling Strategy

```python
from elasticsearch import Elasticsearch
import time
from datetime import datetime, timedelta

class MetricsDashboard:
    def __init__(self, hosts, auth):
        self.es = Elasticsearch(hosts, basic_auth=auth)
        self.index = "metrics-*"

    def get_current_metrics(self, hosts=None):
        query = {
            "size": 0,
            "query": {
                "bool": {
                    "filter": [
                        {"range": {"@timestamp": {"gte": "now-5m"}}}
                    ]
                }
            },
            "aggs": {
                "by_host": {
                    "terms": {"field": "host.name", "size": 100},
                    "aggs": {
                        "latest": {
                            "top_hits": {
                                "size": 1,
                                "sort": [{"@timestamp": "desc"}],
                                "_source": ["cpu", "memory", "disk", "network", "@timestamp"]
                            }
                        }
                    }
                }
            }
        }

        if hosts:
            query["query"]["bool"]["filter"].append(
                {"terms": {"host.name": hosts}}
            )

        return self.es.search(index=self.index, body=query)

    def get_time_series(self, metric_path, interval="1m", duration="1h"):
        query = {
            "size": 0,
            "query": {
                "range": {"@timestamp": {"gte": f"now-{duration}"}}
            },
            "aggs": {
                "over_time": {
                    "date_histogram": {
                        "field": "@timestamp",
                        "fixed_interval": interval
                    },
                    "aggs": {
                        "value": {"avg": {"field": metric_path}}
                    }
                }
            }
        }

        result = self.es.search(index=self.index, body=query)
        return [
            {
                "timestamp": bucket["key_as_string"],
                "value": bucket["value"]["value"]
            }
            for bucket in result["aggregations"]["over_time"]["buckets"]
        ]

    def get_alerts(self, thresholds):
        query = {
            "size": 0,
            "query": {
                "bool": {
                    "filter": [
                        {"range": {"@timestamp": {"gte": "now-5m"}}}
                    ],
                    "should": [
                        {"range": {"cpu.user": {"gte": thresholds.get("cpu", 90)}}},
                        {"range": {"memory.percent": {"gte": thresholds.get("memory", 90)}}},
                        {"range": {"disk.percent": {"gte": thresholds.get("disk", 85)}}}
                    ],
                    "minimum_should_match": 1
                }
            },
            "aggs": {
                "alerts_by_host": {
                    "terms": {"field": "host.name"},
                    "aggs": {
                        "cpu_alerts": {
                            "filter": {"range": {"cpu.user": {"gte": thresholds.get("cpu", 90)}}}
                        },
                        "memory_alerts": {
                            "filter": {"range": {"memory.percent": {"gte": thresholds.get("memory", 90)}}}
                        },
                        "disk_alerts": {
                            "filter": {"range": {"disk.percent": {"gte": thresholds.get("disk", 85)}}}
                        }
                    }
                }
            }
        }

        return self.es.search(index=self.index, body=query)

# Usage
dashboard = MetricsDashboard(
    ["http://localhost:9200"],
    ("elastic", "password")
)

# Poll for updates
while True:
    metrics = dashboard.get_current_metrics()
    alerts = dashboard.get_alerts({"cpu": 80, "memory": 85, "disk": 90})
    # Update UI
    time.sleep(30)
```

## Alerting Configuration

### Elasticsearch Watcher Alert

```bash
curl -u elastic:password -X PUT "localhost:9200/_watcher/watch/high-cpu-alert" -H 'Content-Type: application/json' -d'
{
  "trigger": {
    "schedule": {"interval": "1m"}
  },
  "input": {
    "search": {
      "request": {
        "indices": ["metrics-*"],
        "body": {
          "size": 0,
          "query": {
            "bool": {
              "filter": [
                {"range": {"@timestamp": {"gte": "now-5m"}}},
                {"range": {"cpu.user": {"gte": 90}}}
              ]
            }
          },
          "aggs": {
            "high_cpu_hosts": {
              "terms": {"field": "host.name"}
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total.value": {"gt": 0}
    }
  },
  "actions": {
    "notify_slack": {
      "webhook": {
        "method": "POST",
        "url": "https://hooks.slack.com/services/xxx",
        "body": "{\"text\": \"High CPU alert: {{ctx.payload.aggregations.high_cpu_hosts.buckets}}\"}"
      }
    }
  }
}'
```

## Performance Optimization

### Index Lifecycle Management

```bash
curl -u elastic:password -X PUT "localhost:9200/_ilm/policy/metrics-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "1d",
            "max_primary_shard_size": "50gb"
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
      "cold": {
        "min_age": "30d",
        "actions": {
          "freeze": {}
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

### Downsampling for Historical Data

```bash
# Create downsampled index
curl -u elastic:password -X PUT "localhost:9200/metrics-hourly" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "@timestamp": {"type": "date"},
      "host.name": {"type": "keyword"},
      "cpu_avg": {"type": "float"},
      "cpu_max": {"type": "float"},
      "memory_avg": {"type": "float"},
      "memory_max": {"type": "float"}
    }
  }
}'

# Downsample with transform
curl -u elastic:password -X PUT "localhost:9200/_transform/metrics-hourly-transform" -H 'Content-Type: application/json' -d'
{
  "source": {
    "index": "metrics-*"
  },
  "dest": {
    "index": "metrics-hourly"
  },
  "pivot": {
    "group_by": {
      "@timestamp": {
        "date_histogram": {
          "field": "@timestamp",
          "fixed_interval": "1h"
        }
      },
      "host.name": {
        "terms": {"field": "host.name"}
      }
    },
    "aggregations": {
      "cpu_avg": {"avg": {"field": "cpu.user"}},
      "cpu_max": {"max": {"field": "cpu.user"}},
      "memory_avg": {"avg": {"field": "memory.percent"}},
      "memory_max": {"max": {"field": "memory.percent"}}
    }
  },
  "frequency": "1h",
  "sync": {
    "time": {
      "field": "@timestamp",
      "delay": "60s"
    }
  }
}'

# Start transform
curl -u elastic:password -X POST "localhost:9200/_transform/metrics-hourly-transform/_start"
```

## Summary

Building metrics dashboards with Elasticsearch involves:

1. **Index design** - Time-series mappings with appropriate field types
2. **Data streams** - Efficient time-series data management
3. **Aggregations** - Date histograms, stats, percentiles, derivatives
4. **Dashboard queries** - Current values, trends, and comparisons
5. **Real-time updates** - Polling strategies and streaming
6. **Alerting** - Watcher for threshold-based notifications
7. **Performance** - ILM policies and downsampling

With proper configuration, Elasticsearch can power comprehensive metrics dashboards for infrastructure and application monitoring.
