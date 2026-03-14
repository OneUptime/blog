# How to Operationalize Calico Component Metrics Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Metrics, Prometheus, Operations

Description: Build sustainable operational processes for Calico component metrics, including alert triage procedures, metrics retention policies, and dashboard maintenance.

---

## Introduction

Operationalizing Calico metrics monitoring means building processes around the metrics: who responds to which alerts, how alerts are triaged, what metrics are retained for how long, and how dashboards evolve as the cluster changes. Without these processes, metrics become noise rather than signal.

## Alert Triage Matrix

| Alert | Severity | First Responder | Action |
|-------|----------|-----------------|--------|
| FelixMetricsScrapeFailing | Warning | Platform Eng | Check network policy, restart Felix |
| FelixHighPolicyLatency | Warning | Platform Eng | Check node resources, policy count |
| CalicoIPAMExhaustion | Critical | Platform Eng | Expand IP pool immediately |
| TigeraStatusDegraded | Critical | Platform Eng | Check operator logs |
| CalicoFelixMetricsCoverage | Warning | Platform Eng | Check ServiceMonitor selector |

## Metrics Retention Policy

```yaml
# Prometheus retention for Calico metrics
# In kube-prometheus-stack values.yaml
prometheus:
  prometheusSpec:
    retention: 30d        # Keep 30 days of metrics
    retentionSize: 50GB   # Or 50GB, whichever is smaller

    # For longer retention, use Thanos or VictoriaMetrics
    remoteWrite:
      - url: https://thanos-receive.monitoring.svc.cluster.local:19291/api/v1/receive
        writeRelabelConfigs:
          # Keep all calico metrics
          - sourceLabels: [__name__]
            regex: "calico.*|felix.*|typha.*"
            action: keep
```

## Dashboard Maintenance Process

```markdown
## Calico Metrics Dashboard Review (Monthly)

Reviewer: Platform Engineering
Duration: 30 minutes

Checklist:
1. [ ] Verify all panels are loading data
2. [ ] Check for stale/missing panels after Calico version upgrades
3. [ ] Review alert thresholds against actual baselines
4. [ ] Add panels for any new metrics from latest Calico version
5. [ ] Remove panels for deprecated metrics
6. [ ] Update dashboard version tag

New metrics to check in each release:
- Review Calico release notes for new metrics
- Add panels for metrics marked as "new in vX.Y"
```

## Runbook: Felix High Policy Programming Latency

```bash
# When FelixHighPolicyProgrammingLatency fires:

# 1. Check current latency values
kubectl port-forward -n monitoring svc/prometheus-operated 9090 &
curl -s 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.99,rate(felix_int_dataplane_apply_time_seconds_bucket[5m]))' | \
  jq '.data.result[] | {node: .metric.node, latency: .value[1]}'

# 2. Check policy count (high policy count = higher latency)
curl -s 'http://localhost:9090/api/v1/query?query=felix_active_local_policies' | \
  jq '.data.result[] | {node: .metric.node, policies: .value[1]}'

# 3. Check node CPU (latency may be resource-constrained)
kubectl top nodes

# 4. Check for recent policy changes
kubectl get events -A | grep -i "networkpolicy\|globalnetworkpolicy" | tail -10

# Resolution:
# - High policy count: consider policy consolidation
# - High CPU: check for policy storms (rapid policy changes)
# - Node specific: check for node resource issues
```

## Operational Metrics SLO

```yaml
# SLOs for Calico metrics observability
# - 99% scrape success rate over 7 days
# - <5% metric staleness rate over 7 days
# - 100% node coverage at any given time

# Alert if SLO is at risk
- alert: CalicoMetricsSLOAtRisk
  expr: |
    (sum_over_time(up{job="calico-felix-metrics"}[7d]) /
     count_over_time(up{job="calico-felix-metrics"}[7d])) < 0.99
  labels:
    severity: warning
```

## Conclusion

Operationalizing Calico metrics monitoring transforms raw metrics into actionable intelligence. By defining clear alert ownership, establishing metrics retention policies, maintaining dashboard review processes, and creating runbooks for common alert scenarios, you ensure the monitoring investment provides ongoing value. Define SLOs for the monitoring pipeline itself - if your observability has 95% availability, you're operating blind 5% of the time, which may not be acceptable for a production cluster.
