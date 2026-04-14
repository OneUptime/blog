# How to Monitor Dapr Placement Service Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Placement Service, Monitoring, Actor, Observability

Description: Monitor the health of the Dapr placement service using health endpoints, Prometheus metrics, and log-based alerting to detect actor distribution failures early.

---

The Dapr placement service is a critical dependency for all actor-based services. If the placement service is unhealthy, actor invocations fail and actor state may become inaccessible. Proactive monitoring detects issues before they cascade to application failures.

## Health Check Endpoint

The placement service exposes a health endpoint:

```bash
kubectl port-forward svc/dapr-placement-server -n dapr-system 8080:8080
curl http://localhost:8080/healthz
# Returns HTTP 200 if healthy
```

Use this endpoint in monitoring systems to alert on placement service unavailability.

## Kubernetes Pod Health

Check that all placement replicas are running:

```bash
kubectl get pods -n dapr-system -l app=dapr-placement-server
```

Expected output for a 3-replica HA setup:

```text
NAME                        READY   STATUS    RESTARTS   AGE
dapr-placement-server-0     1/1     Running   0          1d
dapr-placement-server-1     1/1     Running   0          1d
dapr-placement-server-2     1/1     Running   0          1d
```

## Prometheus Metrics

The placement service exposes Prometheus metrics on port 9090. Enable metrics scraping:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "9090"
  prometheus.io/path: "/metrics"
```

Key placement service metrics:

```text
# Number of connected sidecars
dapr_placement_runtimes_total

# Leadership status (1 = leader, 0 = not leader)
dapr_placement_leader_status

# Actor heartbeat timestamp (seconds since last report)
dapr_placement_actor_heartbeat_timestamp
```

## AlertManager Rules

Create alerts for placement service health:

```yaml
groups:
  - name: dapr-placement
    rules:
      - alert: DaprPlacementDown
        expr: up{job="dapr-placement-server"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Dapr placement service is down"

      - alert: DaprPlacementNoLeader
        expr: max(dapr_placement_leader_status{job="dapr-placement-server"}) == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "No Dapr placement service instance is reporting as leader"

      - alert: DaprPlacementLowReplicas
        expr: count(up{job="dapr-placement-server"} == 1) < 2
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Less than 2 placement service replicas are healthy"
```

## Log-Based Monitoring

Monitor placement service logs for critical events:

```bash
kubectl logs -l app=dapr-placement-server -n dapr-system | grep -E "error|warning|leader|election"
```

Key log patterns to watch:

```text
"leader elected"          - Normal, happens at startup
"leadership transferred"  - A failover occurred
"raft: failed to"         - Raft consensus error
"dissemination failed"    - Actor table update failed
```

## Checking Sidecar Connectivity

Verify that sidecars are connected to the placement service by checking sidecar logs:

```bash
kubectl logs my-actor-pod -c daprd | grep -i "placement\|connected\|disconnected"
```

When a sidecar loses its placement service connection, it logs:

```text
placement service connection error: connection reset
attempting to reconnect to placement service
```

## End-to-End Actor Health Check

Create a health check that invokes a known actor to verify the full path:

```bash
curl -X PUT http://localhost:3500/v1.0/actors/HealthCheckActor/probe/method/Ping
# Should return 200 if placement and actor runtime are healthy
```

## Summary

Monitoring Dapr placement service health requires combining Kubernetes pod checks, Prometheus metrics for leader elections and sidecar connectivity, and log-based alerts for Raft consensus errors. For actor-heavy applications, add an end-to-end actor invocation health check to detect functional failures that infrastructure metrics might miss.
