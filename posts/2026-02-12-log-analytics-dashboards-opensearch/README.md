# How to Build Log Analytics Dashboards in OpenSearch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, OpenSearch, Log Analytics, Dashboards, Observability

Description: A hands-on guide to building effective log analytics dashboards in Amazon OpenSearch using visualizations, saved queries, and aggregation techniques.

---

Having your logs in OpenSearch is only half the battle. The real value comes from building dashboards that let your team spot patterns, track errors, and investigate issues without writing queries from scratch every time. OpenSearch Dashboards (the visualization layer built into OpenSearch) gives you everything you need to build these.

This guide walks through creating useful log analytics dashboards from scratch, with practical examples you can adapt for your own data.

## Setting Up Your Index Pattern

Before building any visualizations, you need an index pattern that tells Dashboards which indexes to query:

1. Open OpenSearch Dashboards
2. Go to Stack Management > Index Patterns
3. Create a pattern like `logs-*` to match all your log indexes
4. Select `timestamp` (or whatever your time field is) as the time field

If you're ingesting logs from multiple sources with different index naming conventions, you might want separate index patterns:

- `app-logs-*` for application logs
- `infra-logs-*` for infrastructure logs
- `access-logs-*` for HTTP access logs

## Essential Visualizations

Let's build the visualizations that make up a solid log analytics dashboard.

### Error Rate Over Time

This is probably the most important visualization. It shows you at a glance whether errors are trending up or down.

Create a line chart with this query in the Discover or Visualize section. You can build it through the UI, but here's the underlying aggregation for reference:

```json
{
    "size": 0,
    "query": {
        "bool": {
            "must": [
                {
                    "range": {
                        "timestamp": {
                            "gte": "now-24h",
                            "lte": "now"
                        }
                    }
                }
            ]
        }
    },
    "aggs": {
        "error_rate_over_time": {
            "date_histogram": {
                "field": "timestamp",
                "fixed_interval": "5m"
            },
            "aggs": {
                "total_logs": {
                    "value_count": {
                        "field": "level"
                    }
                },
                "error_count": {
                    "filter": {
                        "term": {
                            "level": "ERROR"
                        }
                    }
                },
                "error_rate": {
                    "bucket_script": {
                        "buckets_path": {
                            "errors": "error_count._count",
                            "total": "total_logs"
                        },
                        "script": "params.errors / params.total * 100"
                    }
                }
            }
        }
    }
}
```

In the Dashboards UI, create a TSVB (Time Series Visual Builder) panel:
- Set the index pattern to `logs-*`
- Add a metric with "Filter Ratio" - numerator is `level:ERROR`, denominator is `*`
- Set the interval to 5 minutes

### Top Error Messages

A data table showing the most frequent error messages helps you prioritize what to fix:

```json
{
    "size": 0,
    "query": {
        "bool": {
            "filter": [
                {"term": {"level": "ERROR"}},
                {"range": {"timestamp": {"gte": "now-24h"}}}
            ]
        }
    },
    "aggs": {
        "top_errors": {
            "terms": {
                "field": "message.keyword",
                "size": 20,
                "order": {"_count": "desc"}
            },
            "aggs": {
                "first_seen": {
                    "min": {"field": "timestamp"}
                },
                "last_seen": {
                    "max": {"field": "timestamp"}
                },
                "affected_services": {
                    "cardinality": {"field": "service"}
                }
            }
        }
    }
}
```

Build this in the UI as a Data Table visualization with these buckets:
- Split rows by Terms on `message.keyword`, top 20
- Add sub-metric: Min of `timestamp` (first seen)
- Add sub-metric: Max of `timestamp` (last seen)
- Add sub-metric: Unique Count of `service`

### Log Volume by Service

A stacked area chart showing log volume per service makes it easy to spot which services are unusually noisy:

```json
{
    "size": 0,
    "query": {
        "range": {
            "timestamp": {"gte": "now-24h"}
        }
    },
    "aggs": {
        "over_time": {
            "date_histogram": {
                "field": "timestamp",
                "fixed_interval": "15m"
            },
            "aggs": {
                "by_service": {
                    "terms": {
                        "field": "service",
                        "size": 10
                    }
                }
            }
        }
    }
}
```

### Response Time Percentiles

For access logs, tracking response time percentiles catches performance issues before they become outages:

```json
{
    "size": 0,
    "query": {
        "range": {
            "timestamp": {"gte": "now-6h"}
        }
    },
    "aggs": {
        "response_time_over_time": {
            "date_histogram": {
                "field": "timestamp",
                "fixed_interval": "5m"
            },
            "aggs": {
                "percentiles": {
                    "percentiles": {
                        "field": "response_time_ms",
                        "percents": [50, 90, 95, 99]
                    }
                }
            }
        }
    }
}
```

Display this as a line chart with four series - p50, p90, p95, and p99. The gap between p50 and p99 tells you a lot about tail latency.

### HTTP Status Code Distribution

A pie chart or donut chart breaking down HTTP status codes gives a quick health overview:

```json
{
    "size": 0,
    "query": {
        "range": {
            "timestamp": {"gte": "now-1h"}
        }
    },
    "aggs": {
        "status_codes": {
            "terms": {
                "field": "http_status",
                "size": 10
            }
        },
        "status_groups": {
            "range": {
                "field": "http_status",
                "ranges": [
                    {"key": "2xx", "from": 200, "to": 300},
                    {"key": "3xx", "from": 300, "to": 400},
                    {"key": "4xx", "from": 400, "to": 500},
                    {"key": "5xx", "from": 500, "to": 600}
                ]
            }
        }
    }
}
```

## Assembling the Dashboard

Now that you have individual visualizations, assemble them into a dashboard:

1. Go to Dashboards > Create new dashboard
2. Add your visualizations in a logical layout:
   - Top row: Error rate line chart (full width)
   - Second row: Log volume by service (half width) + Status code distribution (half width)
   - Third row: Response time percentiles (full width)
   - Fourth row: Top error messages table (full width)
3. Set the default time range to "Last 24 hours"
4. Enable auto-refresh at 30-second intervals

## Using Saved Queries

Create saved queries for common investigations so your team doesn't have to remember the syntax:

```
# High error rate from a specific service
level:ERROR AND service:"payment-api" AND response_time_ms:>5000

# Failed authentication attempts
level:WARN AND message:"authentication failed" AND source_ip:*

# Slow database queries
service:"db-proxy" AND response_time_ms:>1000 AND query_type:"SELECT"

# Out of memory events
message:"OutOfMemoryError" OR message:"OOM" OR message:"Cannot allocate memory"
```

Save these in Discover and they'll be available to anyone with access to the dashboard.

## Adding Annotations

You can mark deployments and incidents on your dashboards using annotations. This makes it much easier to correlate changes with problems:

```json
{
    "size": 0,
    "query": {
        "bool": {
            "filter": [
                {"term": {"event_type": "deployment"}},
                {"range": {"timestamp": {"gte": "now-7d"}}}
            ]
        }
    },
    "aggs": {
        "deployments": {
            "date_histogram": {
                "field": "timestamp",
                "fixed_interval": "1h"
            }
        }
    }
}
```

If you're shipping deployment events to OpenSearch (which you should), add an annotation layer to your TSVB panels that shows vertical lines at deployment times.

## Performance Tips for Dashboards

**Use keyword fields for aggregations.** If you're aggregating on a text field, add `.keyword` suffix. Text fields require expensive analysis while keyword fields don't.

**Limit time ranges.** Don't default to "Last 30 days" if your team usually looks at "Last 24 hours." Longer ranges scan more data and slow everything down.

**Pre-aggregate where possible.** If you always group by service and hour, consider creating a summary index with pre-computed metrics using transforms.

**Use index patterns wisely.** If your dashboard only needs access logs, use `access-logs-*` instead of `logs-*`. Less data to search through means faster dashboards.

For setting up automated alerts based on the patterns you see in these dashboards, check out [OpenSearch alerting](https://oneuptime.com/blog/post/2026-02-12-opensearch-alerting/view). And for managing the lifecycle of the indexes powering these dashboards, see [OpenSearch ISM](https://oneuptime.com/blog/post/2026-02-12-opensearch-index-state-management-ism/view).
