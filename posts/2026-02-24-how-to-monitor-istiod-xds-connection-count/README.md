# How to Monitor Istiod xDS Connection Count

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istiod, XDS, Monitoring, Connection

Description: How to monitor the number of xDS connections between Envoy proxies and istiod, detect connection issues, and set up alerts for connection anomalies.

---

Every Istio proxy in your mesh needs a persistent xDS stream to receive configuration from istiod. In current Istio sidecars, Envoy connects to the local pilot-agent, and pilot-agent maintains the upstream gRPC connection to istiod. These xDS connections are how configuration updates flow from the control plane to the data plane. If connections drop, proxies stop receiving updates. If too many connections pile up on one istiod replica, it gets overloaded. Monitoring the connection count gives you visibility into the health of the control plane to data plane communication channel.

## Checking Connection Count

The most direct way to see how many proxies are connected:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep '^pilot_xds{'
```

The key metric is:

```text
pilot_xds{version="1.29.2"} 247
```

This tells you that 247 Istio proxies currently have active xDS connections to this istiod replica. If you run multiple istiod replicas, check each one to get the total.

For a cluster-wide view:

```promql
sum(pilot_xds)
```

## Expected Connection Count

The number of xDS connections should roughly match the number of running Istio proxies, including sidecars and gateways. Calculate the expected sidecar count:

```bash
# Count pods with the istio-proxy container

kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{.spec.containers[*].name}{"\n"}{end}' | grep -c istio-proxy
```

Or use Prometheus:

```promql
count(count by (pod)(container_cpu_usage_seconds_total{container="istio-proxy"}))
```

If the actual connection count from `pilot_xds` is significantly lower than the expected count, some proxies are not connected. If it is higher, you might have stale connections that have not been cleaned up.

## Connection Distribution Across Replicas

When running multiple istiod replicas, connections should be roughly evenly distributed. Check each replica:

```promql
pilot_xds
```

This shows the count per istiod pod. If one replica has 500 connections and another has 50, the distribution is uneven. This happens when:

- A replica was recently restarted and proxies have not rebalanced yet
- The Kubernetes service load balancing is not working correctly
- Some proxies are pinned to specific replicas due to long-lived gRPC connections

gRPC connections are persistent and do not automatically rebalance. When you add a new istiod replica, existing proxies stay connected to their current replica. Only new proxies or reconnecting proxies will connect to the new replica.

To force rebalancing, you can restart proxies namespace by namespace:

```bash
kubectl rollout restart deployment -n my-namespace
```

Or configure istiod to periodically terminate long-lived connections:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      keepaliveMaxServerConnectionAge: 3600s
```

Setting `values.pilot.keepaliveMaxServerConnectionAge` configures istiod's maximum gRPC server connection age, causing clients to reconnect after the specified duration and helping distribute connections more evenly over time.

## Monitoring Connection Lifecycle

### New Connections

```promql
deriv(pilot_xds[5m])
```

For new connections, look at the connection count changes:

```promql
deriv(pilot_xds[5m])
```

A positive derivative means connections are increasing (new proxies joining). A negative derivative means connections are dropping (proxies leaving or disconnecting).

### Connection Terminations

Istiod does not expose a `pilot_xds_connection_terminations` metric. If you scrape istio-agent metrics from proxies, use the agent-side istiod connection termination counter:

```promql
sum(rate(istiod_connection_terminations[5m]))
```

Some terminations are normal (pod deletion, rolling updates). But a high termination rate without corresponding pod changes indicates problems:

```promql
# Alert on unexpected disconnections
sum(rate(istiod_connection_terminations[5m])) > 5
```

## Setting Up Alerts

Here are practical alerts for xDS connection monitoring:

### Connection Count Drop

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istiod-xds-alerts
  namespace: istio-system
spec:
  groups:
  - name: istiod-xds
    rules:
    - alert: IstiodXDSConnectionDrop
      expr: |
        (sum(pilot_xds offset 10m) - sum(pilot_xds))
        / sum(pilot_xds offset 10m) > 0.2
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "More than 20% of xDS connections have dropped in the last 10 minutes"
```

### No Connections

```yaml
    - alert: IstiodNoXDSConnections
      expr: sum(pilot_xds) == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "No Envoy proxies are connected to istiod"
```

### Uneven Distribution

```yaml
    - alert: IstiodXDSConnectionImbalance
      expr: |
        max(pilot_xds) / min(pilot_xds) > 3
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "xDS connections are unevenly distributed across istiod replicas"
```

### High Connection Termination Rate

```yaml
    - alert: IstiodHighDisconnectionRate
      expr: sum(rate(istiod_connection_terminations[5m])) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High rate of xDS connection terminations"
```

## Grafana Dashboard Panels

Key panels for monitoring xDS connections:

**Total Connected Proxies (Single Stat)**:
```promql
sum(pilot_xds)
```

**Connections Per Replica (Time Series)**:
```promql
pilot_xds
```

**Connection Rate of Change (Time Series)**:
```promql
deriv(sum(pilot_xds)[5m:])
```

**Disconnection Rate (Time Series)**:
```promql
sum(rate(istiod_connection_terminations[5m]))
```

**Connection Distribution (Pie Chart)**:
```promql
pilot_xds
```

## Debugging Connection Issues

### Proxies Not Connecting

If the connection count is lower than expected:

1. Check the proxy's local xDS cluster:

```bash
kubectl exec my-pod -c istio-proxy -- curl -s localhost:15000/clusters | grep xds-grpc
```

2. Check proxy logs for connection errors:

```bash
kubectl logs my-pod -c istio-proxy | grep -i "xds\|grpc\|connection"
```

3. Verify the istiod service has endpoints:

```bash
kubectl get endpoints istiod -n istio-system
```

### Connections Dropping

If connections keep dropping and reconnecting:

1. Check istiod pod stability:

```bash
kubectl get events -n istio-system --field-selector reason=Killing
```

2. Check network policies:

```bash
kubectl get networkpolicy -n istio-system
```

3. Check if istiod is under resource pressure:

```bash
kubectl top pod -n istio-system -l app=istiod
```

### Stale Connections

If the connection count is higher than the actual number of sidecar pods, some connections are stale. This happens when pods are deleted but istiod does not detect the disconnection immediately.

Force cleanup by restarting istiod:

```bash
kubectl rollout restart deployment istiod -n istio-system
```

## Connection Count as a Capacity Metric

Each xDS connection consumes resources on istiod: memory for the connection state and CPU for generating and sending push updates. Use the connection count for capacity planning:

- Up to 500 connections per replica is comfortable for most resource configurations
- 500-1000 connections per replica requires adequate CPU and memory (2+ cores, 4+ GB RAM)
- 1000+ connections per replica is possible but requires careful tuning

Scale istiod replicas based on connection count:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: istiod
  namespace: istio-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: istiod
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

The connection count metric is one of the simplest and most telling indicators of control plane health. If connections are stable and evenly distributed, istiod is doing its job. If they are dropping, spiking, or imbalanced, something needs attention.
