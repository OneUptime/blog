# How to configure Kibana dashboards for Kubernetes cluster monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kibana, Dashboards, Kubernetes Monitoring, Visualization, EFK Stack

Description: Build comprehensive Kibana dashboards to monitor Kubernetes cluster health, application logs, error rates, and performance metrics with visualizations, saved searches, and alerting.

---

Kibana dashboards transform raw Elasticsearch log data into actionable insights through visualizations, metrics, and time-series charts. For Kubernetes clusters, well-designed dashboards provide visibility into application health, error patterns, performance trends, and cluster operations, enabling rapid troubleshooting and proactive monitoring.

This guide covers building production-ready Kibana dashboards for Kubernetes log analysis and cluster monitoring.

## Creating index patterns

Start by defining index patterns for your logs:

```
Settings → Stack Management → Index Patterns → Create index pattern

Name: kubernetes-*
Time field: @timestamp
```

This pattern matches all Kubernetes log indices.

## Building an overview dashboard

Create a high-level cluster overview:

**Dashboard components:**
1. Log volume over time (Line chart)
2. Error rate by namespace (Bar chart)
3. Top 10 pods by log volume (Table)
4. Log level distribution (Pie chart)
5. Recent errors (Saved search)

**Log volume visualization:**
- Aggregation: Date Histogram on @timestamp (Auto interval)
- Metrics: Count
- Split series: By kubernetes.namespace_name

**Error rate by namespace:**
- Aggregation: Terms on kubernetes.namespace_name (Top 10)
- Metrics: Count where level=ERROR

## Creating application-specific dashboards

Build dashboards for specific applications:

**API Server Dashboard:**
- Request rate over time
- Response time percentiles (p50, p95, p99)
- Error codes distribution (4xx, 5xx)
- Top error messages
- Request duration histogram
- Requests by endpoint

**Query for response time percentiles:**
```
Aggregation: Percentiles on response_time_ms
Percentiles: 50, 95, 99
```

## Implementing log search panels

Create saved searches for common queries:

**Recent Errors:**
```
level:ERROR OR level:FATAL
Sort by: @timestamp descending
Columns: @timestamp, kubernetes.pod_name, kubernetes.namespace_name, message
```

**Failed Pod Starts:**
```
kubernetes.container_name:* AND log:(*CrashLoopBackOff* OR *ImagePullBackOff* OR *Failed*)
```

**Authentication Failures:**
```
log:(*authentication* OR *unauthorized*) AND level:ERROR
```

## Best practices

1. **Use time-based indices:** Optimize query performance
2. **Set appropriate refresh intervals:** Balance real-time vs performance
3. **Limit table rows:** Show top N results to avoid slow queries
4. **Use filters effectively:** Pre-filter dashboards by namespace or app
5. **Create drill-down links:** Enable investigation workflows
6. **Version dashboards:** Export and version control dashboard JSON
7. **Test with production data:** Validate performance with realistic data
8. **Document dashboards:** Add markdown descriptions to panels

## Conclusion

Well-designed Kibana dashboards transform Elasticsearch log data into actionable insights for Kubernetes cluster monitoring. By combining visualizations, saved searches, and filters, you create powerful tools for monitoring application health, troubleshooting issues, and understanding cluster behavior in production environments.
