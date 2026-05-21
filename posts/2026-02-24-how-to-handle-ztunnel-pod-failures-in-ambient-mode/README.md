# How to Handle ztunnel Pod Failures in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Ztunnel, Fault Tolerance, DaemonSet

Description: How to detect, troubleshoot, and recover from ztunnel pod failures in Istio ambient mode to maintain mesh availability.

---

In Istio ambient mode, the ztunnel DaemonSet runs one pod per eligible node and handles L4 mesh traffic for ambient-enrolled pods on that node. If a ztunnel pod fails, mesh-enrolled pods on that node lose the ztunnel-provided mTLS, L4 authorization, and potentially network connectivity depending on the failure mode. Understanding how to handle these failures quickly is critical.

## What Happens When ztunnel Fails

When a ztunnel pod crashes or becomes unresponsive, the impact depends on how traffic redirection is configured:

**If using iptables redirection**: Traffic from pods on the node will try to go through ztunnel's iptables rules. Since ztunnel is not running to handle the traffic, connections will fail. This effectively breaks networking for all mesh-enrolled pods on the node.

**If ztunnel restarts quickly**: The DaemonSet controller will restart the pod. During the restart window (usually 5-15 seconds), connections will fail. Existing TCP connections that were being proxied will be terminated.

## Detecting ztunnel Failures

Set up monitoring to catch ztunnel issues before they cause cascading failures:

```bash
# Check ztunnel pod status across all nodes

kubectl get pods -n istio-system -l app=ztunnel -o wide

# Look for restarts
kubectl get pods -n istio-system -l app=ztunnel -o custom-columns=\
NAME:.metadata.name,NODE:.spec.nodeName,STATUS:.status.phase,RESTARTS:.status.containerStatuses[0].restartCount
```

Set up a Prometheus alert for ztunnel restarts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ztunnel-alerts
  namespace: istio-system
spec:
  groups:
    - name: ztunnel
      rules:
        - alert: ZtunnelHighRestarts
          expr: |
            increase(kube_pod_container_status_restarts_total{
              namespace="istio-system",
              container="istio-proxy",
              pod=~"ztunnel.*"
            }[15m]) > 3
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "ztunnel pod {{ $labels.pod }} has restarted {{ $value }} times in 15 minutes"

        - alert: ZtunnelNotReady
          expr: |
            kube_pod_status_ready{
              namespace="istio-system",
              pod=~"ztunnel.*",
              condition="true"
            } == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "ztunnel pod {{ $labels.pod }} is not ready"
```

## Diagnosing ztunnel Crashes

When ztunnel crashes, start with the previous logs:

```bash
# Get logs from the crashed container
kubectl logs -n istio-system ztunnel-xxxxx --previous

# Get pod events
kubectl describe pod -n istio-system ztunnel-xxxxx
```

### OOMKilled

The most common failure mode. ztunnel uses memory proportional to the number of pods and connections it handles:

```bash
kubectl describe pod -n istio-system ztunnel-xxxxx | grep -A 3 "Last State"
```

If you see `Reason: OOMKilled`, increase the memory limit:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    ztunnel:
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
        limits:
          cpu: "1"
          memory: 512Mi
```

### Certificate Errors

If ztunnel cannot obtain workload certificates from istiod, it will log errors and may fail readiness or traffic that depends on those certificates:

```text
ERROR ztunnel::tls: failed to fetch certificate from CA: connection refused
```

Check that istiod is running and reachable:

```bash
kubectl get pods -n istio-system -l app=istiod

ZTUNNEL_POD=ztunnel-xxxxx
ISTIOD_POD=$(kubectl get pods -n istio-system -l app=istiod \
  -o jsonpath='{.items[0].metadata.name}')

istioctl ztunnel-config certificates "$ZTUNNEL_POD".istio-system
kubectl debug -n istio-system "$ISTIOD_POD" --image=curlimages/curl -- \
  curl -s "localhost:15014/debug/config_dump?proxyID=$ZTUNNEL_POD.istio-system" > /dev/null && echo "OK" || echo "FAIL"
```

### Resource Pressure

On busy nodes, ztunnel might get CPU throttled or evicted due to resource pressure:

```bash
# Check if the node is under pressure
kubectl describe node <node-name> | grep -A 5 Conditions

# Check ztunnel CPU throttling
kubectl top pod -n istio-system ztunnel-xxxxx
```

If CPU throttling is the issue, increase the CPU request or limit. If ztunnel needs stronger scheduling priority in your cluster, set a higher priority class on the DaemonSet pod template:

```bash
kubectl patch daemonset ztunnel -n istio-system --type='strategic' -p='
spec:
  template:
    spec:
      priorityClassName: system-node-critical
'
```

Setting `system-node-critical` gives ztunnel a built-in critical priority class so it is scheduled ahead of lower-priority pods and can preempt them when needed.

## Recovering from ztunnel Failures

### Automatic Recovery

In most cases, the DaemonSet controller automatically restarts the ztunnel pod. Monitor the recovery:

```bash
# Watch ztunnel pods
kubectl get pods -n istio-system -l app=ztunnel -w
```

After restart, verify the ztunnel is healthy:

```bash
ZTUNNEL_POD=$(kubectl get pods -n istio-system -l app=ztunnel \
  --field-selector spec.nodeName=<node-name> -o jsonpath='{.items[0].metadata.name}')

# Check health endpoint
kubectl debug -n istio-system "$ZTUNNEL_POD" --image=curlimages/curl -- \
  curl -s localhost:15021/healthz/ready

# Verify it has loaded workload information
kubectl debug -n istio-system "$ZTUNNEL_POD" --image=curlimages/curl -- \
  curl -s localhost:15000/config_dump | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Workloads: {len(d.get(\"workloads\", {}))}')"
```

### Manual Recovery

If the ztunnel pod is stuck and not recovering, you can force a restart:

```bash
# Delete the pod (DaemonSet will recreate it)
kubectl delete pod -n istio-system ztunnel-xxxxx

# If the pod is stuck in Terminating
kubectl delete pod -n istio-system ztunnel-xxxxx --grace-period=0 --force
```

### Node-Level Recovery

If the ztunnel keeps crashing on a specific node, there might be a node-level issue:

```bash
# Cordon the node to prevent new pods from scheduling
kubectl cordon <node-name>

# Drain workloads to other nodes
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Fix the node issue (e.g., clear disk space, restart kubelet)

# Uncordon the node
kubectl uncordon <node-name>
```

## Preventing ztunnel Failures

### Right-Size Resources

Monitor actual resource usage and set limits accordingly:

```bash
# Check memory usage over time
kubectl top pods -n istio-system -l app=ztunnel

# Check per-container resource usage
kubectl top pod -n istio-system ztunnel-xxxxx --containers
```

### Set DaemonSet Update Strategy

While ztunnel is a DaemonSet, a PDB only constrains voluntary evictions made through the Kubernetes Eviction API. For ztunnel upgrades, use the DaemonSet update strategy instead:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    ztunnel:
      updateStrategy:
        type: RollingUpdate
        rollingUpdate:
          maxSurge: 1
          maxUnavailable: 0
```

### Monitor Connection Counts

High connection counts can predict future OOM issues:

```bash
kubectl debug -n istio-system ztunnel-xxxxx --image=curlimages/curl -- \
  curl -s localhost:15020/metrics | grep -E 'istio_tcp_connections_(opened|closed)_total'
```

You can also inspect active connections with `istioctl ztunnel-config connections`. If a node has an unusually high number of connections, consider spreading workloads to other nodes.

## Failover Behavior

When ztunnel fails on one node, workloads on other nodes are unaffected. Kubernetes and Istio will eventually stop routing traffic to pods on the affected node because:

1. Kubernetes readiness probes on the application pods may fail (if they depend on network connectivity)
2. Other ztunnel instances will see connection failures to the affected node's pods
3. If the service uses waypoint proxies or sidecars for traffic management, outlier detection can eject endpoints after observed failures

To speed up failover for services using waypoint proxies or sidecars, make sure your services have outlier detection configured:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: fast-failover
  namespace: my-app
spec:
  host: my-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 2
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
```

ztunnel failures are disruptive but recoverable. The key is to monitor proactively, right-size resources, and configure fast failover so that traffic quickly moves to healthy nodes when a ztunnel goes down.
