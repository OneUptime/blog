# How to Implement Elasticsearch Rollup Jobs for Long-Term Log Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, ROLLUP, Data Aggregation, Storage Optimization, Analytics

Description: Configure Elasticsearch rollup jobs to create downsampled summaries of historical log data.

---

Elasticsearch rollups are deprecated as of Elasticsearch 8.11 and will be removed in a future version. In Elasticsearch 8.15 and later, creating a new rollup job fails on clusters that do not already contain a rollup job or rollup index. Use downsampling for new time series deployments; the examples below apply to existing rollup deployments and older clusters where rollup job creation is still allowed.

Elasticsearch rollup jobs aggregate historical data into statistical summaries, dramatically reducing storage requirements while preserving the ability to analyze long-term trends. Instead of keeping every individual log event from months ago, rollups store only aggregated metrics like averages, sums, and counts. This approach makes it economical to retain years of data for compliance and trend analysis without the cost of full-resolution storage.

## Understanding Rollup Concepts

Raw logs contain every detail of every event. For recent data, this granularity is essential for debugging and investigation. However, after weeks or months, you rarely need individual events. You want to know trends like "What was the average response time in March?" or "How many errors occurred per day last quarter?"

Rollups answer these questions by pre-calculating aggregations over time intervals. A rollup job might process daily logs and create hourly summaries showing error counts, response time averages, min/max values, and request volumes. These summaries occupy a fraction of the space while still supporting historical analysis.

The trade-off is losing ability to query individual events. You cannot retrieve the exact log entry from three months ago. You can query aggregated statistics about that time period. For most analytical use cases, this trade-off is acceptable and enables cost-effective long-term retention.

## Creating a Basic Rollup Job

Define a rollup job that summarizes application logs:

```bash
# Create rollup job for daily aggregation

curl -X PUT "http://elasticsearch:9200/_rollup/job/app-logs-daily-rollup" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_pattern": "application-logs-*",
    "rollup_index": "rollup-application-logs",
    "cron": "0 0 * * * ?",
    "page_size": 1000,
    "groups": {
      "date_histogram": {
        "field": "@timestamp",
        "calendar_interval": "1d",
        "time_zone": "UTC",
        "delay": "7d"
      },
      "terms": {
        "fields": ["service.name", "log.level", "host.name"]
      }
    },
    "metrics": [
      {
        "field": "http.response.time",
        "metrics": ["min", "max", "avg", "sum"]
      },
      {
        "field": "http.response.size",
        "metrics": ["min", "max", "avg", "sum"]
      }
    ]
  }'
```

This job runs daily at midnight, processing complete log buckets older than the 7-day delay into daily summaries grouped by service, log level, and hostname, while calculating response time and size statistics.

## Configuring Rollup Groups

Groups define how data gets aggregated. The date_histogram group is required and determines the time granularity:

```json
{
  "groups": {
    "date_histogram": {
      "field": "@timestamp",
      "fixed_interval": "1h",
      "time_zone": "America/New_York"
    }
  }
}
```

Use fixed_interval for precise intervals (1h, 6h, 1d) or calendar_interval for calendar-aware intervals (day, week, month, quarter, year).

Add term groups for categorical breakdowns:

```json
{
  "groups": {
    "date_histogram": {
      "field": "@timestamp",
      "calendar_interval": "1d"
    },
    "terms": {
      "fields": [
        "service.name",
        "environment",
        "region",
        "http.response.status_code"
      ]
    }
  }
}
```

This creates rollups for each unique combination of service, environment, region, and status code, allowing queries like "Show me errors per service per region for last month."

Histogram groups for numeric ranges:

```json
{
  "groups": {
    "date_histogram": {
      "field": "@timestamp",
      "calendar_interval": "1h"
    },
    "histogram": {
      "fields": ["http.response.time"],
      "interval": 100
    }
  }
}
```

This groups response times into 100ms buckets, enabling distribution analysis.

## Defining Metrics

Metrics specify which numeric fields to aggregate and which calculations to perform:

```json
{
  "metrics": [
    {
      "field": "http.response.time",
      "metrics": ["min", "max", "avg", "sum", "value_count"]
    },
    {
      "field": "request.bytes",
      "metrics": ["sum", "value_count"]
    },
    {
      "field": "cpu.usage.percent",
      "metrics": ["avg", "max"]
    }
  ]
}
```

Available metric types:
- min: Minimum value
- max: Maximum value
- sum: Total sum
- avg: Average value
- value_count: Count of values

Choose metrics based on your analysis needs. Rollup jobs support only min, max, sum, avg, and value_count metrics for numeric fields, so percentile aggregations are not available from rollup data unless you model an approximate distribution with supported bucket groups such as histograms.

## Scheduling Rollup Jobs

The cron expression controls when rollups run:

```json
{
  "cron": "0 0 1 * * ?"
}
```

This runs at 1 AM every day. Cron format is:

```text
second minute hour day_of_month month day_of_week
```

Common schedules:

```bash
# Every hour at minute 0
"0 0 * * * ?"

# Every day at 2 AM
"0 0 2 * * ?"

# Every Sunday at midnight
"0 0 0 ? * SUN"

# Every 6 hours
"0 0 */6 * * ?"
```

Schedule rollups to run after ILM moves data to warm tier, ensuring you roll up data that won't change.

## Starting and Managing Rollup Jobs

Start the rollup job:

```bash
# Start the job
curl -X POST "http://elasticsearch:9200/_rollup/job/app-logs-daily-rollup/_start" \
  -H "Content-Type: application/json" \
  -u elastic:password
```

Check job status:

```bash
# Get job details
curl -X GET "http://elasticsearch:9200/_rollup/job/app-logs-daily-rollup" \
  -u elastic:password | jq

# Check if job is running
curl -X GET "http://elasticsearch:9200/_rollup/job/app-logs-daily-rollup" \
  -u elastic:password | jq '.jobs[0].status.job_state'
```

Monitor rollup progress:

```bash
# Get job stats
curl -X GET "http://elasticsearch:9200/_rollup/job/app-logs-daily-rollup/_stats" \
  -u elastic:password | jq

# Shows documents processed, pages processed, and any failures
```

Stop a running job:

```bash
# Stop the job gracefully
curl -X POST "http://elasticsearch:9200/_rollup/job/app-logs-daily-rollup/_stop" \
  -H "Content-Type: application/json" \
  -u elastic:password
```

## Querying Rollup Data

Query rollup indices using the rollup search API:

```bash
# Query rolled up data
curl -X GET "http://elasticsearch:9200/rollup-application-logs/_rollup_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "query": {
      "bool": {
        "filter": [
          {
            "range": {
              "@timestamp": {
                "gte": "now-30d",
                "lte": "now"
              }
            }
          },
          {
            "term": {
              "service.name": "api"
            }
          }
        ]
      }
    },
    "aggs": {
      "response_time_over_time": {
        "date_histogram": {
          "field": "@timestamp",
          "calendar_interval": "1d"
        },
        "aggs": {
          "avg_response_time": {
            "avg": {
              "field": "http.response.time"
            }
          }
        }
      }
    }
  }'
```

This queries the rollup index for average response times per day over the last 30 days for the api service.

## Combining Raw and Rollup Data

Search across both raw and rolled up data for seamless transitions:

```bash
# Query both indices
curl -X GET "http://elasticsearch:9200/application-logs-*,rollup-application-logs/_rollup_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "query": {
      "bool": {
        "filter": [
          {
            "range": {
              "@timestamp": {
                "gte": "now-90d"
              }
            }
          },
          {
            "term": {
              "log.level": "ERROR"
            }
          }
        ]
      }
    },
    "aggs": {
      "errors_per_day": {
        "date_histogram": {
          "field": "@timestamp",
          "calendar_interval": "1d"
        },
        "aggs": {
          "error_count": {
            "value_count": {
              "field": "log.level"
            }
          }
        }
      }
    }
  }'
```

Elasticsearch automatically merges results from raw indices (recent data) and rollup indices (historical data).

## Integrating with ILM

Coordinate rollups with Index Lifecycle Management:

```bash
# Create ILM policy for the raw log indices
curl -X PUT "http://elasticsearch:9200/_ilm/policy/logs-with-rollup" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "min_age": "0ms",
          "actions": {
            "rollover": {
              "max_size": "50gb",
              "max_age": "1d"
            }
          }
        },
        "warm": {
          "min_age": "7d",
          "actions": {
            "readonly": {},
            "forcemerge": {
              "max_num_segments": 1
            }
          }
        },
        "cold": {
          "min_age": "30d",
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

Schedule rollup jobs separately from ILM so they process data after it has reached the warm phase and before the raw data is archived or deleted. ILM does not create rollup summaries for you; the rollup job writes the summary index, and ILM manages the raw index lifecycle.

## Visualizing Rollup Data in Kibana

Create a rollup data view that includes the rollup index and the raw index:

```bash
# In Kibana, create a Rollup data view:
# Data view: rollup-application-logs,application-logs-*
# This includes both raw and rollup data
```

Build visualizations using the combined data view. If rollup data views are disabled, enable the `rollups:enableIndexPatterns` advanced setting first.

Create a dashboard showing long-term trends:

```bash
# Time series visualization
# Data view: rollup-application-logs,application-logs-*
# Time range: Last 6 months
# Metric: Average of http.response.time
# Split series: service.name
```

The visualization seamlessly combines recent raw data with historical rollup summaries.

## Optimizing Rollup Configuration

Balance granularity with storage savings:

```bash
# Fine-grained: Hourly rollups with many groups
# Storage savings: ~70%
# Query capabilities: Detailed hourly analysis

{
  "groups": {
    "date_histogram": {
      "field": "@timestamp",
      "fixed_interval": "1h"
    },
    "terms": {
      "fields": ["service", "environment", "region", "status_code"]
    }
  }
}

# Coarse-grained: Daily rollups with fewer groups
# Storage savings: ~95%
# Query capabilities: Daily trends only

{
  "groups": {
    "date_histogram": {
      "field": "@timestamp",
      "calendar_interval": "1d"
    },
    "terms": {
      "fields": ["service"]
    }
  }
}
```

Test rollup configurations on sample data to verify they support your analysis requirements.

## Handling Rollup Failures

Monitor for rollup job failures:

```bash
# Check for errors
curl -X GET "http://elasticsearch:9200/_rollup/job/app-logs-daily-rollup" \
  -u elastic:password | jq '.jobs[0].status.indexer_state'

# Review task failures
curl -X GET "http://elasticsearch:9200/_tasks?detailed=true&actions=*rollup*" \
  -u elastic:password | jq
```

Common failures include:
- Index pattern doesn't match any indices
- Field type mismatches
- Insufficient permissions
- Memory pressure

Restart failed jobs after fixing issues:

```bash
# Stop the job
curl -X POST "http://elasticsearch:9200/_rollup/job/app-logs-daily-rollup/_stop" \
  -u elastic:password

# Fix configuration or underlying issues

# Start the job again
curl -X POST "http://elasticsearch:9200/_rollup/job/app-logs-daily-rollup/_start" \
  -u elastic:password
```

## Deleting Rollup Jobs

Remove rollup jobs that are no longer needed:

```bash
# Stop the job first and wait for it to stop
curl -X POST "http://elasticsearch:9200/_rollup/job/app-logs-daily-rollup/_stop?wait_for_completion=true&timeout=30s" \
  -u elastic:password

# Delete the job
curl -X DELETE "http://elasticsearch:9200/_rollup/job/app-logs-daily-rollup" \
  -u elastic:password
```

The rollup index remains after deleting the job, preserving historical summaries.

## Conclusion

Elasticsearch rollup jobs enable cost-effective long-term log retention by trading detailed event data for statistical summaries in legacy rollup deployments. By configuring appropriate time intervals, groupings, and metrics, you create rollups that support analytical queries while reducing storage by 80-95%. Coordinate rollup jobs with ILM policies so raw logs are summarized before they are archived or deleted. This layered approach to data lifecycle management ensures you retain the detail you need when you need it while keeping storage costs under control. Start with simple rollups on non-critical indices to understand the trade-offs, then expand to production data as you validate that rollup summaries meet your analysis requirements.
