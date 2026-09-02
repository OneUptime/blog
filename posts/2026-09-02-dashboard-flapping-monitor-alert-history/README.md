# Build a Flapping Monitor Dashboard from OpenSearch Alert History

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Alerting, Monitoring, Observability

Description: Use OpenSearch alert APIs and read-only alert history to measure repeated open-complete cycles and visualize the monitors that flap most often.

---

A flapping monitor repeatedly creates an active alert and then completes it. Counting notification messages is unreliable because throttling, channel failure, and action policies can suppress deliveries. Count alert state transitions from OpenSearch instead.

The Alerting plugin stores ongoing alerts in `.opendistro-alerting-alerts` and completed history in date-suffixed `.opendistro-alerting-alert-history-*` indexes behind a write alias. These are hidden, plugin-owned indexes: query them read-only only when your security policy permits, and never modify or delete their documents directly.

## Start with supported Alerting views and APIs

The built-in Alerts interface and Alerts API are the safest ways to inspect alert state:

```http
GET _plugins/_alerting/monitors/alerts?size=100&startIndex=0&alertState=ALL
```

Filter by `monitorId`, `severityLevel`, or `alertState` as needed. Use pagination; the default response is not a complete history export.

For a dashboard associated with a monitor visualization, OpenSearch 2.9+ can show alert events and monitor details directly on the visualization. Use that built-in integration before granting broad access to hidden indexes.

## Inspect history read-only

An administrator can first list the hidden indexes and inspect their actual mapping:

```http
GET _cat/indices/.opendistro-alerting-alert*?v&expand_wildcards=open,hidden
GET .opendistro-alerting-alert-history-*/_mapping
```

Field names and mappings can change across Alerting plugin versions. Base custom queries on the mapping returned by your cluster. A typical read-only analysis uses fields such as monitor ID/name, state, start time, and end time:

```http
GET .opendistro-alerting-alert-history-*/_search
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        {"range": {"start_time": {"gte": "now-7d"}}},
        {"term": {"state": "COMPLETED"}},
        {"exists": {"field": "end_time"}}
      ]
    }
  },
  "aggs": {
    "by_monitor": {
      "terms": {
        "field": "monitor_name.keyword",
        "size": 50
      },
      "aggs": {
        "opens_over_time": {
          "date_histogram": {
            "field": "start_time",
            "fixed_interval": "1h"
          }
        },
        "average_active_ms": {
          "avg": {
            "script": "doc['end_time'].value.toInstant().toEpochMilli() - doc['start_time'].value.toInstant().toEpochMilli()"
          }
        }
      }
    }
  }
}
```

Treat this as a pattern, not a copy-paste guarantee. Confirm `.keyword` subfields and date field types first. Scripted aggregations add cost; precompute duration in a reporting pipeline when this becomes a regular dashboard.

## Build a flapping dashboard

If your deployment permits read-only access to Alerting history, create a narrowly scoped role for the required hidden history pattern and a read-only Dashboards tenant. System-index protection may require explicit system-index permission in addition to ordinary `read`; follow the Security plugin documentation and test with a dedicated user.

Create an index pattern for the history indexes, enable inclusion of hidden indexes, and select `start_time` as the time field only if the mapping confirms it is a date. Useful panels are:

- completed alert count by monitor;
- open transitions per hour/day;
- average active duration by monitor;
- shortest active durations (rapid open/complete cycles);
- monitors with the greatest day-over-day transition increase;
- errors separated from completed alerts.

A practical flapping heuristic is “more than N completed alert instances in a rolling hour with median active duration under M minutes.” Tune N and M to the monitor schedule; a monitor that runs every minute and one that runs hourly have different minimum observable durations.

## Prefer a normalized reporting index for long-term use

Direct system-index dashboards couple users to internal schemas and protection rules. For a durable program, periodically read alerts through supported APIs (or a tightly controlled read-only integration), transform only the required fields, and write them to an ordinary index such as `alert-transitions-*`:

```json
{
  "@timestamp": "2026-09-02T12:00:00Z",
  "monitor_id": "abc123",
  "monitor_name": "checkout error rate",
  "transition": "COMPLETED",
  "active_duration_ms": 180000,
  "severity": "1"
}
```

Give dashboard users read access to that reporting index, not Alerting internals. Make ingestion idempotent using the alert ID as the destination document ID, and retain a checkpoint so pagination does not duplicate or skip transitions.

## Account for retention

Alert history is rolled over and retained according to Alerting settings such as maximum age, maximum documents, and retention period. A seven-day dashboard cannot show data already deleted by a three-day policy. Inspect the current cluster settings before interpreting a quiet period as “no flapping.”

```http
GET _cluster/settings?include_defaults=true&flat_settings=true
```

Do not extend retention blindly. Estimate shard count and storage, and consider the normalized reporting index if long-term trend analysis has a different retention requirement from operational alert history.

## Official References

- [OpenSearch Alerting API](https://docs.opensearch.org/latest/observing-your-data/alerting/api/)
- [OpenSearch alerting indexes and history settings](https://docs.opensearch.org/latest/observing-your-data/alerting/settings/)
- [OpenSearch alerting dashboards and visualizations](https://docs.opensearch.org/latest/observing-your-data/alerting/dashboards-alerting/)
- [OpenSearch system-index permissions](https://docs.opensearch.org/latest/security/access-control/permissions/)
