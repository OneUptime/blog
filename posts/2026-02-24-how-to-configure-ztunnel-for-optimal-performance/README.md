# How to Configure ztunnel for Optimal Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Ztunnel, Performance, Kubernetes

Description: Tune ztunnel resource allocation, connection pooling, and configuration for optimal performance in Istio ambient mode deployments.

---

ztunnel is the node-level proxy in Istio ambient mode. Unlike sidecars that run per-pod, ztunnel runs as a DaemonSet with one instance per node. It handles all the L4 traffic processing for pods on its node: traffic interception, mTLS encryption/decryption, HBONE tunneling, and L4 authorization. Because it serves all pods on a node, its performance directly affects every workload on that node.

Getting ztunnel tuned correctly matters. Under-provisioned ztunnel means increased latency and potential packet drops. Over-provisioned ztunnel wastes node resources. This guide covers how to configure ztunnel for optimal performance in production.

## Understanding ztunnel Resource Usage

ztunnel is written in Rust, which makes it lightweight and efficient compared to Envoy-based sidecars. However, it still consumes CPU and memory, and the amount depends on:

- Number of pods on the node
- Traffic volume (requests per second)
- Number of concurrent connections
- Size of the mesh configuration (ServiceEntries, AuthorizationPolicies)

The default Helm chart requests 200m CPU and 512Mi memory for ztunnel. Actual idle usage is usually lower than the request, but under load CPU usage scales with traffic volume and memory usage scales with cluster size and concurrent connections.

## Setting Resource Requests and Limits

ztunnel is deployed as a DaemonSet in the `istio-system` namespace. You can configure its resource requirements through the IstioOperator or Helm values:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ztunnel:
      k8s:
        resources:
          requests:
            cpu: 200m
            memory: 512Mi
          limits:
            cpu: "1"
            memory: 512Mi
```

If you are using Helm:

```bash
helm install ztunnel istio/ztunnel \
  --namespace istio-system \
  --set resources.requests.cpu=200m \
  --set resources.requests.memory=512Mi \
  --set resources.limits.cpu=1000m \
  --set resources.limits.memory=512Mi
```

**Recommendations for sizing**:
- **Small clusters (< 20 pods/node)**: 100m CPU request, 128Mi memory request
- **Medium clusters (20-100 pods/node)**: 200m CPU request, 256Mi memory request
- **Large clusters (100+ pods/node)**: 500m CPU request, 512Mi memory request

These are starting points. Monitor actual usage and adjust.

## Monitoring ztunnel Performance

ztunnel exposes Prometheus metrics that help you understand its performance:

```promql
# CPU usage per ztunnel instance

rate(container_cpu_usage_seconds_total{container="istio-proxy", pod=~"ztunnel-.*"}[5m])
```

```promql
# Memory usage
container_memory_working_set_bytes{container="istio-proxy", pod=~"ztunnel-.*"}
```

```promql
# TCP connections opened and closed
rate(istio_tcp_connections_opened_total[5m])
rate(istio_tcp_connections_closed_total[5m])
```

```promql
# Bytes sent and received
rate(istio_tcp_sent_bytes_total[5m])
rate(istio_tcp_received_bytes_total[5m])
```

Create a Grafana dashboard that shows these metrics per node so you can identify hot spots.

## Connection Handling

ztunnel manages connections on behalf of all pods on its node. The number of concurrent connections it needs to handle can be significant in a busy cluster.

Monitor connection counts:

```bash
istioctl ztunnel-config connections
```

If you see connection counts approaching the system limits, you might need to:

1. **Increase file descriptor limits**: ztunnel needs file descriptors for open sockets. File descriptor limits are inherited from the node and container runtime, so raise them through your node or runtime configuration rather than by setting a ztunnel environment variable.

2. **Inspect HBONE connection reuse**: ztunnel uses HBONE to carry traffic over mTLS. This is efficient, but there is no general Helm value for tuning a ztunnel connection pool. If a node is saturated, use the scaling approaches below to spread traffic across more ztunnel instances.

## Log Level Tuning

ztunnel logging can impact performance if set too verbose. In production, use the `warn` or `error` log level:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    ztunnel:
      logLevel: warn
```

For debugging, you can temporarily increase the log level:

```bash
istioctl ztunnel-config log --level debug
```

Remember to set it back to `warn` after debugging to avoid performance impact from excessive logging.

## Network Performance Tuning

ztunnel's performance is heavily influenced by the underlying network stack. Some kernel parameters can help:

**TCP buffer sizes**: For high-throughput scenarios, increase the TCP buffer sizes on the node:

```bash
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216
sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"
```

**Connection tracking**: With many connections flowing through ztunnel, the conntrack table might fill up:

```bash
sysctl -w net.netfilter.nf_conntrack_max=524288
```

These should be set on the nodes, not in ztunnel itself. Use a DaemonSet with privileged access or node configuration management tools.

## Scaling Considerations

Since ztunnel runs as a DaemonSet, scaling is tied to node count. You cannot scale ztunnel independently of the number of nodes. If a single node is a bottleneck:

- **Reduce pods per node**: Use pod anti-affinity or node pools to distribute high-traffic workloads across more nodes.
- **Use dedicated node pools**: Put high-traffic workloads on nodes with more CPU and memory allocated to ztunnel.
- **Check for hot spots**: Use the per-node metrics to identify nodes where ztunnel is under the most pressure.

```promql
topk(10, rate(container_cpu_usage_seconds_total{container="istio-proxy", pod=~"ztunnel-.*"}[5m]))
```

This shows the top 10 ztunnel instances by CPU usage, helping you find hot spots.

## ztunnel vs Sidecar Performance Comparison

ztunnel has different performance characteristics than sidecars:

**Lower per-pod overhead**: Because ztunnel is shared across all pods on a node, the per-pod resource overhead is much lower than dedicated sidecars.

**Amortized TLS cost**: TLS handshakes are expensive. ztunnel amortizes this cost by reusing HBONE connections between nodes. With sidecars, each pod maintains its own TLS connections.

**Centralized bottleneck**: The downside is that ztunnel is a single point of processing for all traffic on a node. A sidecar only affects its own pod, but ztunnel affects every pod on the node.

**Lower latency for L4**: ztunnel performs L4 processing only (unless a waypoint is involved). Since it does not parse HTTP headers or apply L7 policies, the per-request processing is faster than a full Envoy sidecar.

## Health Checking ztunnel

Monitor ztunnel health with the readiness probe. The default configuration includes a readiness probe, but verify it is working:

```bash
kubectl get daemonset ztunnel -n istio-system -o yaml | grep -A10 "readinessProbe"
```

Check the health endpoint directly:

```bash
kubectl exec -n istio-system $(kubectl get pod -n istio-system -l app=ztunnel -o name | head -1) -- curl -s localhost:15021/healthz/ready
```

## Troubleshooting Performance Issues

If you are seeing increased latency or connection failures after enabling ambient mode:

1. **Check ztunnel resource usage**: Is it hitting CPU or memory limits?

```bash
kubectl top pods -n istio-system -l app=ztunnel
```

2. **Check for errors in ztunnel logs**:

```bash
kubectl logs -n istio-system -l app=ztunnel --tail=50 | grep -i "error\|fail\|timeout"
```

3. **Check connection counts**: Are there too many concurrent connections?

4. **Verify HBONE tunnel health**: Are tunnels being established and maintained correctly?

5. **Check node-level metrics**: Is the node itself under resource pressure?

ztunnel performance tuning is simpler than sidecar tuning because you are dealing with one component per node instead of one per pod. The key is monitoring, right-sizing resources, and distributing load evenly across nodes.
