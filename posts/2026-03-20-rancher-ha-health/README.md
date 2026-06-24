# How to Monitor Rancher HA Cluster Health - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, High Availability, Health Monitoring, Prometheus, Alerting

Description: Monitor the health of your Rancher HA deployment with comprehensive checks for etcd, API server, Rancher pods, and managed cluster connectivity.

## Introduction

Proactive health monitoring of your Rancher HA deployment allows you to detect and address issues before they impact operations. This guide covers health checks at every layer: etcd health, Rancher server pods, load balancer, and managed cluster connectivity.

## Prerequisites

- Running Rancher HA deployment
- Prometheus and Grafana (via rancher-monitoring)
- AlertManager configured with notification channels
- PagerDuty, Slack, or email for alerts

## Step 1: etcd Health Monitoring

```bash
# etcd health check commands

#!/bin/bash
ETCDCTL_OPTS="--endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/rke2/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/rke2/server/tls/etcd/client.key"

# Health check
etcdctl $ETCDCTL_OPTS endpoint health

# Status (includes DB size, raft index)
etcdctl $ETCDCTL_OPTS endpoint status -w table

# Performance check
etcdctl $ETCDCTL_OPTS check perf

# Member list
etcdctl $ETCDCTL_OPTS member list -w table
```

## Step 2: Configure etcd Health Alerts

```yaml
# etcd-alerts.yaml - Critical etcd alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-health-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: etcd.health
      rules:
        - alert: EtcdMembersDown
          expr: |
            max without (endpoint) (
              sum without (instance, pod) (
                up{job=~".*etcd.*"} == bool 0
              )
            ) > 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "One or more etcd members are down"
            description: "etcd has one or more unavailable members"

        - alert: EtcdNoLeader
          expr: etcd_server_has_leader{job=~".*etcd.*"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "etcd member has no leader"

        - alert: EtcdHighNumberOfLeaderChanges
          expr: |
            increase((
              max without (instance, pod) (
                etcd_server_leader_changes_seen_total{job=~".*etcd.*"}
              ) or 0 * absent(
                etcd_server_leader_changes_seen_total{job=~".*etcd.*"}
              )
            )[15m:1m]) >= 4
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "etcd leader changes too frequently"

        - alert: EtcdDatabaseSizeLimitApproaching
          expr: |
            last_over_time(etcd_mvcc_db_total_size_in_bytes{
              job=~".*etcd.*"
            }[5m]) /
            last_over_time(etcd_server_quota_backend_bytes{
              job=~".*etcd.*"
            }[5m]) > 0.8
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "etcd database >80% of quota"

        - alert: EtcdGRPCRequestsSlow
          expr: |
            histogram_quantile(0.99,
              sum without (grpc_type) (rate(grpc_server_handling_seconds_bucket{
                job=~".*etcd.*",
                grpc_method!="Defragment",
                grpc_type="unary"
              }[5m]))
            ) > 0.15
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "etcd gRPC requests slow (p99 > 150ms)"
```

## Step 3: Monitor Rancher Server Health

```yaml
# rancher-ha-health-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rancher-ha-health
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: rancher.ha
      rules:
        # Rancher pod availability
        - alert: RancherPodsUnavailable
          expr: |
            kube_deployment_status_replicas_unavailable{
              namespace="cattle-system",
              deployment="rancher"
            } > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Rancher pods unavailable"
            description: "{{ $value }} Rancher pods are unavailable"

        # Rancher pod count below expected
        - alert: RancherPodsInsufficient
          expr: |
            kube_deployment_status_replicas_ready{
              namespace="cattle-system",
              deployment="rancher"
            } < 2
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Fewer than 2 Rancher pods ready"

        # Rancher OOMKilled
        - alert: RancherOOMKilled
          expr: |
            increase(kube_pod_container_status_restarts_total{
              namespace="cattle-system",
              container="rancher"
            }[10m]) > 0
            and on (namespace, pod, container)
            kube_pod_container_status_last_terminated_reason{
              namespace="cattle-system",
              container="rancher",
              reason="OOMKilled"
            } == 1
          labels:
            severity: critical
          annotations:
            summary: "Rancher pod OOMKilled - increase memory limits"
```

## Step 4: Monitor Managed Cluster Connectivity

```bash
# Check managed cluster connectivity from the Rancher management cluster

DISCONNECTED_CLUSTERS=$(kubectl get clusters.management.cattle.io \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .status.conditions[?(@.type=="Connected")]}{.status}{end}{"\n"}{end}' \
  | awk '$1 != "local" && $2 != "True" {print $1}')

DISCONNECTED_COUNT=$(printf "%s\n" "$DISCONNECTED_CLUSTERS" | sed '/^$/d' | wc -l)

if [ "$DISCONNECTED_COUNT" -gt 0 ]; then
    echo "CRITICAL: Managed clusters disconnected:"
    printf "%s\n" "$DISCONNECTED_CLUSTERS"
fi

if [ "$DISCONNECTED_COUNT" -gt "5" ]; then
    echo "CRITICAL: $DISCONNECTED_COUNT managed clusters disconnected (possible Rancher issue)"
fi
```

## Step 5: Health Check Dashboard (Grafana)

```bash
# Import Rancher HA health dashboard
# Browse dashboard templates at: https://grafana.com/grafana/dashboards/

# Key panels to include:
# 1. etcd cluster health status
# 2. etcd database size % used
# 3. etcd leader changes rate
# 4. Rancher pod availability
# 5. Rancher API latency (p50, p99)
# 6. Active cluster connections (WebSockets)
# 7. Managed cluster health status
# 8. Load balancer connection counts
```

## Step 6: External Health Check

```bash
# Run external health check from outside the cluster
# This validates the external path to Rancher through the load balancer

#!/bin/bash
RANCHER_URL="https://rancher.example.com"
ALERT_EMAIL="ops@company.com"

check_rancher_health() {
    HTTP_STATUS=$(curl -sk -o /dev/null -w "%{http_code}" "$RANCHER_URL/ping")
    RESPONSE_TIME=$(curl -sk -o /dev/null -w "%{time_total}" "$RANCHER_URL/ping")

    if [ "$HTTP_STATUS" != "200" ]; then
        echo "CRITICAL: Rancher returned $HTTP_STATUS"
        return 1
    fi

    if (( $(echo "$RESPONSE_TIME > 5.0" | bc -l) )); then
        echo "WARNING: Rancher response time ${RESPONSE_TIME}s > 5s threshold"
        return 2
    fi

    echo "OK: Rancher healthy (${RESPONSE_TIME}s)"
    return 0
}

# Run check
check_rancher_health
```

## Step 7: Recovery Runbook

```bash
# Automated recovery checks and actions

#!/bin/bash
# Rancher HA health check and recovery

# Check 1: etcd quorum
ETCD_POD=$(kubectl get pod -n kube-system -l component=etcd -o name | head -1)
ETCDCTL_OPTS="--endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/rke2/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/rke2/server/tls/etcd/client.key"

ETCD_HEALTHY=$(kubectl exec -n kube-system "$ETCD_POD" -- \
  etcdctl $ETCDCTL_OPTS --cluster endpoint health 2>&1 | grep -c "is healthy")

ETCD_TOTAL=$(kubectl exec -n kube-system "$ETCD_POD" -- \
  etcdctl $ETCDCTL_OPTS member list 2>/dev/null | wc -l)

ETCD_QUORUM=$((ETCD_TOTAL / 2 + 1))

if [ "$ETCD_HEALTHY" -lt "$ETCD_QUORUM" ]; then
    echo "CRITICAL: etcd healthy members ($ETCD_HEALTHY/$ETCD_TOTAL) below quorum ($ETCD_QUORUM)"
    # Page on-call
fi

# Check 2: Rancher pods
RANCHER_READY=$(kubectl get deployment rancher -n cattle-system \
  -o jsonpath='{.status.readyReplicas}')
RANCHER_READY=${RANCHER_READY:-0}

if [ "$RANCHER_READY" -lt "2" ]; then
    echo "WARNING: Only $RANCHER_READY Rancher replicas ready"
fi
```

## Conclusion

Comprehensive Rancher HA health monitoring requires visibility into multiple layers: etcd cluster health, Rancher pod status, and managed cluster connectivity. Alert on conditions that precede failures (etcd database size approaching quota, leader election frequency) rather than just reacting to outages. The combination of internal Prometheus alerts and external synthetic health checks provides defense-in-depth monitoring that catches issues regardless of whether the monitoring system itself is affected.
