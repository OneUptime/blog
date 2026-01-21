# How to Migrate from ELK Stack to Grafana Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, ELK Stack, Elasticsearch, Migration, Log Management, Kibana, Logstash, Cost Optimization

Description: A step-by-step guide to migrating from ELK Stack (Elasticsearch, Logstash, Kibana) to Grafana Loki, covering planning, parallel deployment, query translation, dashboard migration, and validation strategies.

---

Migrating from the ELK Stack to Grafana Loki can significantly reduce costs while maintaining powerful log querying capabilities. This guide provides a comprehensive migration strategy, covering architecture differences, query translation, and step-by-step migration procedures.

## Why Migrate to Loki?

### Cost Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│                    ELK vs Loki Cost Analysis                     │
│                                                                  │
│  ELK Stack (100 GB/day, 30-day retention):                      │
│  - Elasticsearch cluster: $2,000-5,000/month                    │
│  - Storage (hot/warm): $500-1,000/month                         │
│  - Management overhead: High                                     │
│  - Total: $2,500-6,000/month                                    │
│                                                                  │
│  Grafana Loki (100 GB/day, 30-day retention):                   │
│  - Loki cluster: $200-500/month                                 │
│  - S3 storage: $10-50/month                                     │
│  - Management overhead: Lower                                    │
│  - Total: $250-600/month                                        │
│                                                                  │
│  Potential Savings: 75-90%                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Differences

```yaml
# ELK Stack Architecture
elk_components:
  beats:
    - Filebeat (log collection)
    - Metricbeat (metrics)
  logstash:
    - Log processing
    - Transformation
    - Enrichment
  elasticsearch:
    - Full-text indexing
    - Document storage
    - Search engine
  kibana:
    - Visualization
    - Dashboards
    - Discover

# Loki Architecture
loki_components:
  collection:
    - Promtail (equivalent to Filebeat)
    - Or Fluent Bit
    - Or OpenTelemetry
  processing:
    - Promtail pipelines (simpler than Logstash)
    - Or Vector
  storage:
    - Loki (label indexing only)
    - S3/GCS for chunks
  visualization:
    - Grafana (equivalent to Kibana)

# Key Difference:
# ELK indexes everything - expensive but fast arbitrary search
# Loki indexes labels only - cheap, fast label queries
```

## Migration Planning

### Assessment Phase

```yaml
# Step 1: Inventory current ELK usage
assessment_checklist:
  infrastructure:
    - Number of Elasticsearch nodes
    - Current storage usage
    - Daily ingestion volume
    - Number of indices
    - Retention periods

  usage_patterns:
    - Top 50 most-used queries
    - Dashboard inventory
    - Alert rules
    - User personas and needs

  dependencies:
    - Applications sending to Logstash
    - Beats configurations
    - API integrations
    - Third-party tools

# Step 2: Categorize queries by type
query_categories:
  label_based:
    - service="api-server"
    - env="production"
    description: "Easy migration - direct Loki support"

  text_search:
    - message contains "error"
    - free text search
    description: "Supported but different syntax"

  field_analytics:
    - aggregations on fields
    - percentiles
    description: "LogQL unwrap/json functions"

  full_text_heavy:
    - arbitrary text search
    - unknown patterns
    description: "May be slower in Loki"
```

### Migration Strategy Options

```yaml
# Option 1: Big Bang (Not Recommended)
big_bang:
  approach: Switch everything at once
  risk: High
  downtime: Potential
  rollback: Difficult
  recommended: No

# Option 2: Parallel Running (Recommended)
parallel:
  approach: Run both systems simultaneously
  risk: Low
  cost: Temporarily higher
  duration: 2-4 weeks
  recommended: Yes

# Option 3: Gradual Migration
gradual:
  approach: Migrate application by application
  risk: Low
  duration: 1-3 months
  complexity: Higher (multiple systems)
  recommended: For large environments
```

## Step-by-Step Migration

### Phase 1: Deploy Loki Infrastructure

```yaml
# Deploy Loki alongside existing ELK
# loki-values.yaml for Helm
loki:
  auth_enabled: false

  storage:
    type: s3
    bucketNames:
      chunks: loki-chunks
      ruler: loki-ruler
      admin: loki-admin
    s3:
      region: us-east-1

  schema_config:
    configs:
      - from: 2024-01-01
        store: tsdb
        object_store: s3
        schema: v13
        index:
          prefix: loki_index_
          period: 24h

  limits_config:
    retention_period: 720h
    ingestion_rate_mb: 20
    ingestion_burst_size_mb: 30
```

```bash
# Deploy with Helm
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack -f loki-values.yaml -n loki --create-namespace
```

### Phase 2: Configure Dual Shipping

```yaml
# Filebeat to both ELK and Loki
# filebeat.yml - Send to both destinations
filebeat.inputs:
  - type: log
    paths:
      - /var/log/app/*.log
    json.keys_under_root: true
    json.add_error_key: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "app-logs-%{+yyyy.MM.dd}"

# Add Logstash output for forwarding to Loki
output.logstash:
  hosts: ["logstash:5044"]
```

```yaml
# Logstash pipeline to forward to Loki
# logstash-loki.conf
input {
  beats {
    port => 5044
  }
}

filter {
  # Your existing filters
  mutate {
    add_field => {
      "job" => "application"
      "env" => "%{[fields][env]}"
    }
  }
}

output {
  # Continue sending to Elasticsearch
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "app-logs-%{+yyyy.MM.dd}"
  }

  # Also send to Loki
  loki {
    url => "http://loki:3100/loki/api/v1/push"
    labels => {
      job => "application"
      env => "%{env}"
      service => "%{[fields][service]}"
    }
  }
}
```

### Alternative: Promtail Parallel Collection

```yaml
# promtail-config.yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: application
    static_configs:
      - targets:
          - localhost
        labels:
          job: application
          __path__: /var/log/app/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            service: service
            message: message
      - labels:
          level:
          service:
      - output:
          source: message
```

### Phase 3: Translate Queries

#### Basic Search Queries

```yaml
# ELK Query DSL to LogQL

# Simple text search
elk: |
  {
    "query": {
      "match": {
        "message": "error"
      }
    }
  }
logql: '{job="application"} |= "error"'

# Field match
elk: |
  {
    "query": {
      "term": {
        "level": "error"
      }
    }
  }
logql: '{job="application"} | json | level="error"'

# Boolean query
elk: |
  {
    "query": {
      "bool": {
        "must": [
          { "term": { "level": "error" } },
          { "match": { "message": "timeout" } }
        ],
        "must_not": [
          { "term": { "service": "health-check" } }
        ]
      }
    }
  }
logql: |
  {job="application", service!="health-check"}
  | json
  | level="error"
  |= "timeout"
```

#### Aggregation Queries

```yaml
# Count by field
elk: |
  {
    "aggs": {
      "by_service": {
        "terms": { "field": "service.keyword" }
      }
    }
  }
logql: |
  sum by (service) (
    count_over_time({job="application"} | json [1h])
  )

# Date histogram (time series)
elk: |
  {
    "aggs": {
      "over_time": {
        "date_histogram": {
          "field": "@timestamp",
          "interval": "5m"
        }
      }
    }
  }
logql: |
  sum(count_over_time({job="application"} [5m]))

# Percentiles
elk: |
  {
    "aggs": {
      "latency_percentiles": {
        "percentiles": {
          "field": "duration",
          "percents": [50, 95, 99]
        }
      }
    }
  }
logql: |
  # P50
  quantile_over_time(0.50, {job="application"} | json | unwrap duration [5m]) by (service)
  # P95
  quantile_over_time(0.95, {job="application"} | json | unwrap duration [5m]) by (service)
  # P99
  quantile_over_time(0.99, {job="application"} | json | unwrap duration [5m]) by (service)

# Top N
elk: |
  {
    "aggs": {
      "top_errors": {
        "terms": {
          "field": "error_type.keyword",
          "size": 10
        }
      }
    }
  }
logql: |
  topk(10,
    sum by (error_type) (
      count_over_time({job="application"} | json | level="error" [1h])
    )
  )
```

#### KQL (Kibana Query Language) to LogQL

```yaml
# KQL to LogQL translation

# Simple search
kql: 'message: error'
logql: '{job="app"} |= "error"'

# Field equals
kql: 'level: error'
logql: '{job="app"} | json | level="error"'

# Wildcard
kql: 'service: api-*'
logql: '{job="app"} | json | service=~"api-.*"'

# AND
kql: 'level: error AND service: api'
logql: '{job="app", service="api"} | json | level="error"'

# OR
kql: 'level: error OR level: warning'
logql: '{job="app"} | json | level=~"error|warning"'

# NOT
kql: 'NOT service: health-check'
logql: '{job="app", service!="health-check"}'

# Range
kql: 'status >= 500'
logql: '{job="app"} | json | status >= 500'

# Exists
kql: 'error_message: *'
logql: '{job="app"} | json | error_message!=""'
```

### Phase 4: Migrate Dashboards

#### Convert Kibana Visualizations to Grafana

```yaml
# Mapping visualization types
kibana_to_grafana:
  # Time series
  kibana_line_chart:
    grafana: Time series panel
    data_source: Loki
    query_type: Range query

  # Bar chart
  kibana_bar_chart:
    grafana: Bar chart panel
    data_source: Loki
    query_type: Instant query with aggregation

  # Pie chart
  kibana_pie_chart:
    grafana: Pie chart panel
    data_source: Loki
    query_type: Instant query

  # Data table
  kibana_data_table:
    grafana: Table panel
    data_source: Loki
    query_type: Range or instant

  # Metric
  kibana_metric:
    grafana: Stat panel
    data_source: Loki
    query_type: Instant query
```

#### Example Dashboard Conversion

```json
{
  "dashboard": {
    "title": "Application Logs (Migrated from Kibana)",
    "panels": [
      {
        "title": "Error Rate",
        "type": "timeseries",
        "datasource": "Loki",
        "targets": [
          {
            "expr": "sum(rate({job=\"application\"} | json | level=\"error\" [5m]))",
            "legendFormat": "Errors/sec"
          }
        ]
      },
      {
        "title": "Logs by Level",
        "type": "piechart",
        "datasource": "Loki",
        "targets": [
          {
            "expr": "sum by (level) (count_over_time({job=\"application\"} | json [1h]))",
            "legendFormat": "{{level}}"
          }
        ]
      },
      {
        "title": "Top Error Messages",
        "type": "table",
        "datasource": "Loki",
        "targets": [
          {
            "expr": "topk(10, sum by (message) (count_over_time({job=\"application\"} | json | level=\"error\" [1h])))",
            "legendFormat": "{{message}}"
          }
        ]
      },
      {
        "title": "Log Stream",
        "type": "logs",
        "datasource": "Loki",
        "targets": [
          {
            "expr": "{job=\"application\"}",
            "maxLines": 100
          }
        ]
      }
    ]
  }
}
```

### Phase 5: Migrate Alerts

#### Elasticsearch Watcher to Loki/Grafana Alerts

```yaml
# Elasticsearch Watcher
elasticsearch_watcher:
  trigger:
    schedule:
      interval: "5m"
  input:
    search:
      request:
        indices: ["app-logs-*"]
        body:
          query:
            bool:
              must:
                - range:
                    "@timestamp":
                      gte: "now-5m"
                - term:
                    level: "error"
          aggs:
            error_count:
              value_count:
                field: "_id"
  condition:
    compare:
      ctx.payload.aggregations.error_count.value:
        gt: 100
  actions:
    notify_slack:
      slack:
        message:
          text: "High error rate detected"
```

```yaml
# Equivalent Loki Alert Rule
# loki-rules.yaml
groups:
  - name: application_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate({job="application"} | json | level="error" [5m])) > 100
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

# Grafana Alert (if using Grafana Alerting)
grafana_alert:
  name: High Error Rate
  condition:
    evaluator:
      type: gt
      params: [100]
  query:
    datasource: Loki
    expr: 'sum(rate({job="application"} | json | level="error" [5m]))'
  notifications:
    - slack-channel
```

### Phase 6: Validation

```yaml
# Validation checklist
validation_steps:
  data_completeness:
    - Compare log counts between ELK and Loki
    - Verify all log sources are present
    - Check for missing fields/labels
    script: |
      # ELK count
      curl -s elasticsearch:9200/app-logs-*/_count
      # Loki count
      curl -s "loki:3100/loki/api/v1/query" \
        --data-urlencode 'query=count_over_time({job="application"}[24h])'

  query_equivalence:
    - Run same queries on both systems
    - Compare result counts and values
    - Document any differences

  dashboard_validation:
    - Visual comparison of charts
    - Verify data matches
    - Check all panels load

  alert_validation:
    - Trigger test alerts
    - Verify notification delivery
    - Check alert timing

  performance:
    - Compare query response times
    - Test under load
    - Verify acceptable latency
```

### Phase 7: Cutover

```yaml
# Cutover procedure
cutover_steps:
  pre_cutover:
    - Announce maintenance window
    - Final validation of parallel data
    - Backup critical dashboards
    - Document rollback procedure

  cutover:
    - Stop sending new data to ELK
    - Verify Loki is receiving all logs
    - Switch user access to Grafana
    - Update documentation

  post_cutover:
    - Monitor Loki health
    - Track user feedback
    - Keep ELK for historical queries
    - Plan ELK decommission date

  rollback_triggers:
    - Data loss detected
    - Query performance unacceptable
    - Critical dashboards broken
    - Team unable to use system
```

## Common Migration Challenges

### Challenge: Full-Text Search Performance

```yaml
# Problem: Arbitrary text search slower in Loki

# ELK - Fast (indexed)
elk_query: 'message: "specific error message"'

# Loki - Scans chunks (slower for unknown patterns)
logql_query: '{job="app"} |= "specific error message"'

# Solutions:
solutions:
  1_use_labels:
    - Add important fields as labels
    - Filter by labels first, then text
    example: '{job="app", level="error"} |= "specific"'

  2_structured_metadata:
    - Use structured metadata for searchable fields
    - Indexed but doesn't create streams

  3_recording_rules:
    - Pre-compute frequent queries
    - Store as metrics

  4_accept_tradeoff:
    - Document slower searches
    - Train users on label-first queries
```

### Challenge: High Cardinality Fields

```yaml
# Problem: Some ELK fields have high cardinality

# ELK - Indexes user_id, request_id (works but expensive)
# Loki - These would explode stream count

# Solution: Don't use as labels
migration_strategy:
  high_cardinality_fields:
    - user_id
    - request_id
    - trace_id
    - session_id

  loki_approach:
    - Keep in log content
    - Query with json filter
    - Use structured metadata (Loki 2.7+)

# Example
elk_query: 'user_id: "12345"'
logql_query: '{job="app"} | json | user_id="12345"'
```

### Challenge: Complex Aggregations

```yaml
# Problem: ELK has richer aggregation DSL

# ELK - Nested aggregations
elk_query: |
  {
    "aggs": {
      "by_service": {
        "terms": { "field": "service" },
        "aggs": {
          "by_level": {
            "terms": { "field": "level" }
          }
        }
      }
    }
  }

# Loki - Simpler aggregations
# Solution: Multiple queries or different approach
logql_queries:
  - sum by (service, level) (count_over_time({job="app"} | json [1h]))

# For complex analytics, consider:
# - Recording rules to pre-compute
# - Export to Prometheus for metrics
# - Use Grafana transformations
```

## Post-Migration Optimization

```yaml
# After migration, optimize Loki
optimization_tasks:
  labels:
    - Review label cardinality
    - Remove unnecessary labels
    - Add useful labels

  retention:
    - Configure per-stream retention
    - Shorter retention for debug logs
    - Longer for audit/compliance

  recording_rules:
    - Create rules for frequent queries
    - Pre-compute error rates
    - Build metrics from logs

  caching:
    - Enable query result caching
    - Configure cache size
    - Monitor cache hit rate
```

## Conclusion

Migrating from ELK to Loki requires careful planning but can result in significant cost savings (75-90%) while maintaining effective log querying. The key is understanding the architectural differences - Loki's label-based indexing versus ELK's full-text indexing - and adjusting your querying patterns accordingly.

Key takeaways:
- Run systems in parallel during migration
- Translate queries systematically (KQL/DSL to LogQL)
- Migrate dashboards to Grafana
- Convert Elasticsearch Watchers to Loki alerts
- Validate data completeness before cutover
- Keep ELK for historical data during transition
- Optimize Loki configuration post-migration
- Train teams on LogQL and Grafana

With proper planning and execution, the migration can be completed with minimal disruption while delivering substantial infrastructure cost savings.
