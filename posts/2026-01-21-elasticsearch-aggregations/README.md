# How to Use Elasticsearch Aggregations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Aggregations, Analytics, Search, Data Analysis

Description: A comprehensive guide to Elasticsearch aggregations, covering bucket, metric, and pipeline aggregations for building powerful analytics and data exploration features.

---

Elasticsearch aggregations provide powerful analytics capabilities, allowing you to group, summarize, and analyze data in real-time. This guide covers the different types of aggregations and how to use them effectively.

## Types of Aggregations

1. **Bucket aggregations** - Group documents into buckets
2. **Metric aggregations** - Calculate metrics over documents
3. **Pipeline aggregations** - Process output from other aggregations

## Metric Aggregations

### Basic Metrics

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "total_sales": { "sum": { "field": "amount" } },
      "avg_order": { "avg": { "field": "amount" } },
      "min_order": { "min": { "field": "amount" } },
      "max_order": { "max": { "field": "amount" } },
      "order_count": { "value_count": { "field": "amount" } }
    }
  }'
```

Response:

```json
{
  "aggregations": {
    "total_sales": { "value": 150000.0 },
    "avg_order": { "value": 150.0 },
    "min_order": { "value": 10.0 },
    "max_order": { "value": 5000.0 },
    "order_count": { "value": 1000 }
  }
}
```

### Stats Aggregation

Get multiple statistics at once:

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "order_stats": {
        "stats": { "field": "amount" }
      }
    }
  }'
```

Response:

```json
{
  "aggregations": {
    "order_stats": {
      "count": 1000,
      "min": 10.0,
      "max": 5000.0,
      "avg": 150.0,
      "sum": 150000.0
    }
  }
}
```

### Extended Stats

Include standard deviation:

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "order_extended_stats": {
        "extended_stats": { "field": "amount" }
      }
    }
  }'
```

### Cardinality (Count Distinct)

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "unique_customers": {
        "cardinality": {
          "field": "customer_id",
          "precision_threshold": 10000
        }
      }
    }
  }'
```

### Percentiles

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "order_percentiles": {
        "percentiles": {
          "field": "amount",
          "percents": [25, 50, 75, 90, 95, 99]
        }
      }
    }
  }'
```

## Bucket Aggregations

### Terms Aggregation

Group by field values:

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "by_category": {
        "terms": {
          "field": "category",
          "size": 10,
          "order": { "_count": "desc" }
        }
      }
    }
  }'
```

Response:

```json
{
  "aggregations": {
    "by_category": {
      "buckets": [
        { "key": "electronics", "doc_count": 500 },
        { "key": "clothing", "doc_count": 300 },
        { "key": "books", "doc_count": 200 }
      ]
    }
  }
}
```

### Date Histogram

Group by time intervals:

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "orders_over_time": {
        "date_histogram": {
          "field": "order_date",
          "calendar_interval": "month",
          "format": "yyyy-MM",
          "min_doc_count": 0,
          "extended_bounds": {
            "min": "2024-01-01",
            "max": "2024-12-31"
          }
        }
      }
    }
  }'
```

### Fixed Interval Histogram

For non-calendar intervals:

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "hourly_orders": {
        "date_histogram": {
          "field": "order_date",
          "fixed_interval": "1h"
        }
      }
    }
  }'
```

### Range Aggregation

Custom ranges:

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "price_ranges": {
        "range": {
          "field": "amount",
          "ranges": [
            { "key": "cheap", "to": 50 },
            { "key": "moderate", "from": 50, "to": 200 },
            { "key": "expensive", "from": 200 }
          ]
        }
      }
    }
  }'
```

### Histogram Aggregation

Fixed-size buckets:

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "price_histogram": {
        "histogram": {
          "field": "amount",
          "interval": 50,
          "min_doc_count": 1
        }
      }
    }
  }'
```

### Filter Aggregation

Apply filter to aggregation:

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "premium_orders": {
        "filter": {
          "range": { "amount": { "gte": 1000 } }
        },
        "aggs": {
          "total": { "sum": { "field": "amount" } }
        }
      }
    }
  }'
```

### Filters Aggregation

Multiple named filters:

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "order_types": {
        "filters": {
          "filters": {
            "small": { "range": { "amount": { "lt": 100 } } },
            "medium": { "range": { "amount": { "gte": 100, "lt": 500 } } },
            "large": { "range": { "amount": { "gte": 500 } } }
          }
        }
      }
    }
  }'
```

## Nested Aggregations

Combine bucket and metric aggregations:

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "by_category": {
        "terms": { "field": "category" },
        "aggs": {
          "total_sales": { "sum": { "field": "amount" } },
          "avg_order": { "avg": { "field": "amount" } },
          "by_month": {
            "date_histogram": {
              "field": "order_date",
              "calendar_interval": "month"
            },
            "aggs": {
              "monthly_sales": { "sum": { "field": "amount" } }
            }
          }
        }
      }
    }
  }'
```

## Pipeline Aggregations

Process aggregation results:

### Cumulative Sum

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "sales_over_time": {
        "date_histogram": {
          "field": "order_date",
          "calendar_interval": "month"
        },
        "aggs": {
          "sales": { "sum": { "field": "amount" } },
          "cumulative_sales": {
            "cumulative_sum": {
              "buckets_path": "sales"
            }
          }
        }
      }
    }
  }'
```

### Moving Average

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "daily_sales": {
        "date_histogram": {
          "field": "order_date",
          "calendar_interval": "day"
        },
        "aggs": {
          "sales": { "sum": { "field": "amount" } },
          "moving_avg_sales": {
            "moving_avg": {
              "buckets_path": "sales",
              "window": 7,
              "model": "simple"
            }
          }
        }
      }
    }
  }'
```

### Derivative

Calculate rate of change:

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "monthly_sales": {
        "date_histogram": {
          "field": "order_date",
          "calendar_interval": "month"
        },
        "aggs": {
          "sales": { "sum": { "field": "amount" } },
          "sales_change": {
            "derivative": {
              "buckets_path": "sales"
            }
          }
        }
      }
    }
  }'
```

### Bucket Sort

Sort and limit buckets:

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "top_categories": {
        "terms": {
          "field": "category",
          "size": 100
        },
        "aggs": {
          "total_sales": { "sum": { "field": "amount" } },
          "top_by_sales": {
            "bucket_sort": {
              "sort": [{ "total_sales": { "order": "desc" } }],
              "size": 5
            }
          }
        }
      }
    }
  }'
```

## Combining with Queries

Apply aggregations to filtered results:

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "query": {
      "bool": {
        "filter": [
          { "range": { "order_date": { "gte": "2024-01-01" } } },
          { "term": { "status": "completed" } }
        ]
      }
    },
    "aggs": {
      "by_category": {
        "terms": { "field": "category" },
        "aggs": {
          "revenue": { "sum": { "field": "amount" } }
        }
      }
    }
  }'
```

### Global Aggregation

Ignore query filter:

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "query": {
      "term": { "category": "electronics" }
    },
    "aggs": {
      "filtered_stats": {
        "stats": { "field": "amount" }
      },
      "all_orders": {
        "global": {},
        "aggs": {
          "total_stats": {
            "stats": { "field": "amount" }
          }
        }
      }
    }
  }'
```

## Complete Analytics Dashboard Example

```bash
curl -X GET "https://localhost:9200/orders/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "query": {
      "range": {
        "order_date": {
          "gte": "2024-01-01",
          "lt": "2025-01-01"
        }
      }
    },
    "aggs": {
      "overview": {
        "stats": { "field": "amount" }
      },
      "unique_customers": {
        "cardinality": { "field": "customer_id" }
      },
      "monthly_trend": {
        "date_histogram": {
          "field": "order_date",
          "calendar_interval": "month"
        },
        "aggs": {
          "revenue": { "sum": { "field": "amount" } },
          "orders": { "value_count": { "field": "_id" } },
          "avg_order_value": { "avg": { "field": "amount" } }
        }
      },
      "top_categories": {
        "terms": {
          "field": "category",
          "size": 5,
          "order": { "revenue": "desc" }
        },
        "aggs": {
          "revenue": { "sum": { "field": "amount" } },
          "percentage": {
            "bucket_script": {
              "buckets_path": {
                "categoryRevenue": "revenue"
              },
              "script": "params.categoryRevenue"
            }
          }
        }
      },
      "customer_segments": {
        "range": {
          "field": "customer_lifetime_value",
          "ranges": [
            { "key": "new", "to": 100 },
            { "key": "regular", "from": 100, "to": 1000 },
            { "key": "vip", "from": 1000 }
          ]
        },
        "aggs": {
          "revenue": { "sum": { "field": "amount" } }
        }
      }
    }
  }'
```

## Best Practices

1. **Use size: 0** when only aggregations are needed
2. **Set appropriate bucket sizes** to avoid memory issues
3. **Use filters over queries** for aggregation contexts when scores are not needed
4. **Monitor performance** of high-cardinality aggregations
5. **Use approximate counts** (cardinality) for unique values
6. **Cache common aggregations** where possible

## Conclusion

Elasticsearch aggregations provide powerful analytics capabilities:

1. **Metric aggregations** - Calculate statistics
2. **Bucket aggregations** - Group documents
3. **Pipeline aggregations** - Process aggregation results
4. **Combine with queries** - Filter before aggregating

With aggregations, you can build rich analytics dashboards and gain insights from your data in real-time.
