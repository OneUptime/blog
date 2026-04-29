# How to Monitor Rancher HA Cluster Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, High Availability, Monitoring, Health Check, etcd, Kubernetes

Description: Monitor Rancher HA cluster health including etcd quorum, pod availability, WebSocket connections, and load balancer health with automated alerting.

## Introduction

A Rancher HA deployment has multiple failure points: individual Rancher pods, etcd members, the Kubernetes control plane, and the load balancer. Comprehensive health monitoring ensures you detect degradation before it becomes an outage.

## Health Monitoring Components

```mermaid
graph LR
    A[External Monitor] --> B[Load Balancer VIP]
    C[Prometheus] --> D[Rancher Server Pods]
    C --> E[etcd Cluster]
    C --> F[API Server]
    G[Alertmanager] --> H[PagerDuty/Slack]
```

## Step 1: External Health Endpoint Monitoring

Set up external synthetic monitoring of the Rancher health endpoint:

```bash
# Simple health check script

#!/bin/bash
RANCHER_URL="https://rancher.example.com"

check_health() {
    HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" \
        --max-time 10 \
        "${RANCHER_URL}/healthz")

    if [[ "$HTTP_CODE" != "200" ]]; then
        echo "CRITICAL: Rancher health check failed (HTTP $HTTP_CODE)"
        # Send alert via webhook
        curl -X POST https://hooks.slack.com/... \
          -d "{\"text\": \"Rancher health check failed: HTTP $HTTP_CODE\"}"
    fi
}

check_health
```

## Step 2: Monitor etcd Health

```yaml
# etcd-health-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-health
  namespace: kube-system
spec:
  groups:
    - name: etcd
      rules:
        - alert: EtcdInsufficientMembers
          expr: count(etcd_server_id) < 2    # Less than 2 members = no quorum
          for: 3m
          labels:
            severity: critical

        - alert: EtcdNoLeader
          expr: etcd_server_has_leader == 0
          for: 1m
          labels:
            severity: critical

        - alert: EtcdHighFsyncLatency
          expr: |
            histogram_quantile(0.99,
              rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])
            ) > 0.02
          for: 10m
          labels:
            severity: warning
```

## Step 3: Monitor Rancher Pod Availability

```yaml
# rancher-availability-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rancher-availability
  namespace: cattle-system
spec:
  groups:
    - name: rancher-pods
      rules:
        - alert: RancherPodsNotReady
          expr: |
            kube_deployment_status_replicas_ready{
              namespace="cattle-system",
              deployment="rancher"
            } < 2    # Alert if fewer than 2 of 3 pods are ready
          for: 5m
          labels:
            severity: warning

        - alert: RancherAllPodsDown
          expr: |
            kube_deployment_status_replicas_ready{
              namespace="cattle-system",
              deployment="rancher"
            } == 0
          for: 1m
          labels:
            severity: critical
```

## Step 4: Monitor Load Balancer Health

For HAProxy, export stats to Prometheus:

```bash
# Install haproxy_exporter
docker run -d \
  --net=host \
  prom/haproxy-exporter \
  --haproxy.scrape-uri="http://admin:password@localhost:8080/stats;csv"

# Alert on backend down
# haproxy_backend_up{backend="rancher_https_backend"} == 0
```

## Step 5: Dashboard Setup

Create a Grafana dashboard with:

1. **Rancher Pods Ready** - single stat, green if 3/3
2. **etcd Leader** - binary status per member
3. **etcd DB Size %** - gauge
4. **API Server Request Rate** - time series
5. **Load Balancer Active Connections** - time series

## Step 6: OneUptime External Monitoring

Configure [OneUptime](https://oneuptime.com) to monitor the Rancher URL from multiple geographic locations:
- Monitor URL: `https://rancher.example.com/healthz`
- Check interval: 30 seconds
- Alert on: Response time > 5s or status != 200
- Notify via: PagerDuty escalation policy

## Conclusion

Rancher HA health monitoring requires visibility into every layer: load balancer, Rancher pods, Kubernetes API server, and etcd. External monitoring provides the most reliable signal since it exercises the full stack from outside the cluster-the same perspective your users and cluster agents have.
