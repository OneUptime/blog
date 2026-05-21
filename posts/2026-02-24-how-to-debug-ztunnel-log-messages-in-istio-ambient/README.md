# How to Debug ztunnel Log Messages in Istio Ambient

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Ztunnel, Debugging, Troubleshooting

Description: A hands-on guide to understanding and debugging ztunnel log messages in Istio ambient mode deployments.

---

The ztunnel is the heart of Istio ambient mode. It runs as a DaemonSet on every node and handles L4 traffic processing, mTLS encryption, and basic authorization for ambient mesh pods on that node. When things go wrong, ztunnel logs are the first place to look. But those logs can be cryptic if you do not know what you are reading. This guide breaks down common ztunnel log messages and how to debug them.

## Accessing ztunnel Logs

ztunnel runs as a DaemonSet in the istio-system namespace. To view logs for a specific node, find the ztunnel pod on that node:

```bash
# List all ztunnel pods and their nodes

kubectl get pods -n istio-system -l app=ztunnel -o wide

# View logs for a specific ztunnel pod
kubectl logs -n istio-system ztunnel-xxxxx

# Follow logs in real time
kubectl logs -n istio-system ztunnel-xxxxx -f

# View logs with timestamps
kubectl logs -n istio-system ztunnel-xxxxx --timestamps
```

## Setting Log Levels

ztunnel uses Rust's tracing framework. You can adjust log levels dynamically without restarting the pod:

```bash
# List current loggers and levels
istioctl ztunnel-config log ztunnel-xxxxx.istio-system

# Set debug logging for all components on one ztunnel
istioctl ztunnel-config log ztunnel-xxxxx.istio-system --level debug

# Set debug access logging and info for the remaining loggers
istioctl ztunnel-config log ztunnel-xxxxx.istio-system --level access:debug,info

# Reset to default levels
istioctl ztunnel-config log ztunnel-xxxxx.istio-system --reset
```

For installation-time log level configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ztunnel:
      k8s:
        env:
        - name: RUST_LOG
          value: "info,access=debug"
```

## Understanding Common Log Messages

Here are the most common ztunnel log messages and what they mean.

### Workload Registration Messages

```text
INFO ztunnel::inpod::statemanager: pod WorkloadUid("1e054806-e667-4109-a5af-08b3e6ba0c42") received netns, starting proxy
```

This appears when ztunnel receives the pod network namespace and starts proxying for that pod. If you do not see this for a pod that should be in the mesh, the pod might not be enrolled in ambient mode. Check that the namespace has the ambient label:

```bash
kubectl get namespace default --show-labels | grep istio.io/dataplane-mode
```

If the label is missing, add it:

```bash
kubectl label namespace default istio.io/dataplane-mode=ambient
```

### Connection Log Messages

```text
INFO access: connection complete src.addr=10.244.1.3:45678 src.workload="client-xxx" src.namespace="default" dst.addr=10.244.2.5:15008 dst.hbone_addr="10.244.2.5:8080" dst.workload="server-xxx" dst.namespace="default" direction="outbound" bytes_sent=1234 bytes_recv=5678 duration="12ms"
```

This means ztunnel completed a connection for mesh traffic. If you see these access logs with the expected source, destination, and identity fields, traffic is flowing through the mesh correctly.

```text
WARN ztunnel::proxy::outbound: failed to connect to upstream 10.244.2.3:8080: connection refused
```

This indicates that ztunnel tried to create an outbound connection to another pod but failed. Common causes include the destination pod not running, the destination port being wrong, or the destination node's ztunnel being down.

### mTLS Handshake Messages

```text
ERROR ztunnel::proxy::inbound: TLS handshake failed: certificate verify failed
```

This means an incoming mTLS connection presented a certificate that ztunnel could not verify. Possible causes:

1. The source is not part of the mesh
2. Certificate trust roots do not match
3. The certificate has expired

Debug by checking certificates:

```bash
# Check workload certificate details known by ztunnel
istioctl ztunnel-config certificates ztunnel-xxxxx.istio-system

# Output certificate details as JSON
istioctl ztunnel-config certificates ztunnel-xxxxx.istio-system -o json
```

### Authorization Denial Messages

```text
WARN ztunnel::proxy::inbound: RBAC: access denied for source 10.244.1.3 to destination 10.244.2.5:8080
```

This means an L4 authorization policy blocked the connection. To debug, check your authorization policies:

```bash
kubectl get authorizationpolicies -n default -o yaml
```

And verify the source identity:

```bash
# Find which pod has IP 10.244.1.3
kubectl get pods -A -o wide | grep 10.244.1.3
```

### DNS Resolution Messages

```text
DEBUG dns: resolving my-service.default.svc.cluster.local -> 10.96.45.67
```

ztunnel can capture DNS requests for pods in the ambient mesh. DNS proxying is enabled by default in ambient mode from Istio 1.25 onwards. If DNS resolution is failing, you might see:

```text
WARN dns: failed to resolve my-service.default.svc.cluster.local: NXDOMAIN
```

Check that the Kubernetes service exists:

```bash
kubectl get svc my-service -n default
```

## Debugging Connection Flows

To trace a specific connection through ztunnel, enable debug logging for access logs and look for the source and destination addresses:

```bash
# Enable debug access logging
istioctl ztunnel-config log ztunnel-xxxxx.istio-system --level access:debug,info

# Generate a test request
kubectl exec -n default deploy/client -- curl -s http://server:8080/

# Look for the connection in logs
kubectl logs -n istio-system ztunnel-xxxxx | grep "connection complete"
```

A successful connection flow looks like this in the logs:

```text
INFO access: connection complete src.addr=10.244.1.3:45678 src.workload="client-xxx" src.namespace="default" src.identity="spiffe://cluster.local/ns/default/sa/default" dst.addr=10.244.2.5:15008 dst.hbone_addr="10.244.2.5:8080" dst.service="server.default.svc.cluster.local" dst.workload="server-xxx" dst.namespace="default" dst.identity="spiffe://cluster.local/ns/default/sa/default" direction="outbound" bytes_sent=1234 bytes_recv=5678 duration="12ms"
```

## Checking ztunnel Configuration State

ztunnel exposes its internal state through `istioctl ztunnel-config` and a raw debug API:

```bash
# View all known workloads
istioctl ztunnel-config workloads ztunnel-xxxxx.istio-system

# View connected peers
istioctl ztunnel-config connections ztunnel-xxxxx.istio-system

# View authorization policies loaded
istioctl ztunnel-config policies ztunnel-xxxxx.istio-system -o json

# View the raw configuration dump if you need the full admin output
kubectl debug -it ztunnel-xxxxx -n istio-system --image=curlimages/curl -- \
  curl localhost:15000/config_dump
```

## Common Issues and Fixes

**ztunnel keeps restarting**: Check for OOMKilled status. ztunnel usually needs at least 128Mi of memory:

```bash
kubectl describe pod -n istio-system -l app=ztunnel | grep -A 3 "Last State"
```

If OOMKilled, increase the memory limit:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ztunnel:
      k8s:
        resources:
          requests:
            memory: 128Mi
          limits:
            memory: 256Mi
```

**Traffic not flowing through ztunnel**: Verify that the workload pod's network rules are set up correctly:

```bash
# Check iptables rules inside an ambient workload pod's network namespace
kubectl debug -n default deploy/client -it --image=gcr.io/istio-release/base --profile=netadmin -- \
  iptables-save | grep ISTIO
```

**Slow performance**: Check ztunnel metrics for connection counts:

```bash
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -s localhost:15020/metrics | grep 'istio_tcp_connections_'
```

High connection counts on a single ztunnel can indicate that too many pods are scheduled on one node. Consider spreading your workloads more evenly.

Understanding ztunnel logs takes some practice, but once you know the patterns, debugging ambient mode issues becomes straightforward. Start with info-level logs to identify the category of problem, then use `istioctl ztunnel-config log` to raise the relevant logger when you need more detail.
