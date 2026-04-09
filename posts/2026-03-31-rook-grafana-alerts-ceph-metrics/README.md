# How to Set Up Grafana Alerts for Ceph Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Grafana, Alert, Monitoring, Prometheus, Dashboard

Description: Configure Grafana alerting rules for critical Ceph metrics including cluster health, OSD status, and pool capacity to detect issues before they impact workloads.

---

## Overview

Grafana Alerting (Unified Alerting) allows you to define alert rules directly on dashboard panels or as standalone rules. For Ceph clusters managed by Rook, you want alerts covering health status, OSD availability, pool utilization, and monitor quorum.

## Prerequisites

- Grafana 9+ with Unified Alerting enabled
- Prometheus scraping Ceph metrics via Rook's ServiceMonitor
- A notification channel (Slack, PagerDuty, email) configured in Grafana

## Creating an Alert Rule for Cluster Health

Navigate to **Alerting > Alert Rules > New alert rule** in Grafana.

```yaml
# Rule: Ceph Cluster Unhealthy
Rule name: ceph-cluster-unhealthy
Folder: Ceph
Evaluation group: ceph-health (every 1m)

# Query A
Data source: Prometheus
Query: ceph_health_status{namespace="rook-ceph"}
# 0 = HEALTH_OK, 1 = HEALTH_WARN, 2 = HEALTH_ERR

# Condition
WHEN: last() OF A IS ABOVE 0
FOR: 5m
```

## OSD Down Alert

```yaml
# Rule: Ceph OSD Down
Rule name: ceph-osd-down
Query: count(ceph_osd_up{namespace="rook-ceph"} == 0)
Condition: WHEN last() OF A IS ABOVE 0
FOR: 2m
Severity label: severity=critical
```

## Pool Capacity Alert

Alert when any pool exceeds 75% full:

```promql
(ceph_pool_bytes_used / (ceph_pool_bytes_used + ceph_pool_max_avail)) * 100 > 75
```

```yaml
Rule name: ceph-pool-capacity-high
Condition: WHEN last() OF A IS ABOVE 0
FOR: 10m
Annotations:
  summary: "Ceph pool {{ $labels.name }} is {{ $values.A.Value }}% full"
  runbook: "https://docs.ceph.com/en/latest/rados/operations/health-checks/"
```

## Monitor Quorum Alert

```yaml
Rule name: ceph-mon-quorum-lost
Query: ceph_mon_quorum_status{namespace="rook-ceph"} == 0
Condition: WHEN last() OF A IS ABOVE 0
FOR: 1m
Severity: critical
```

## Configuring Notification Policies

Route alerts by severity using Grafana's notification policy tree:

```yaml
# Default policy
Receiver: ops-team-email

# Nested policy for critical alerts
Match: severity=critical
Receiver: pagerduty-oncall
Group wait: 30s
Group interval: 5m
Repeat interval: 1h
```

## Adding Silences for Maintenance

When performing planned maintenance, silence alerts temporarily:

```bash
# Using Grafana API to create a silence
curl -X POST http://grafana:3000/api/alertmanager/grafana/api/v2/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name": "namespace", "value": "rook-ceph", "isRegex": false}],
    "startsAt": "2026-03-31T02:00:00Z",
    "endsAt": "2026-03-31T04:00:00Z",
    "comment": "Scheduled OSD maintenance",
    "createdBy": "ops-team"
  }'
```

## Testing Alert Rules

Verify your alert rule fires correctly by temporarily lowering the threshold:

```promql
# Test: alert if health is OK (will fire immediately for testing)
ceph_health_status{namespace="rook-ceph"} >= 0
```

Reset after confirming the notification pipeline works end-to-end.

## Summary

Grafana Unified Alerting on Ceph metrics gives you proactive visibility into cluster health, OSD failures, pool capacity, and quorum status. Define rules with appropriate FOR durations to avoid alert storms, and use notification policies to route critical alerts to on-call engineers. Silences keep alert fatigue low during planned maintenance windows.
