# How to Debug ztunnel Log Messages in Istio Ambient

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Ztunnel, Debugging, Troubleshooting

Description: A hands-on guide to understanding and debugging ztunnel log messages in Istio ambient mode deployments.

---

The ztunnel is the heart of Istio ambient mode. It runs as a DaemonSet on every node and handles L4 traffic processing, mTLS encryption, and basic authorization for all pods on that node. When things go wrong, ztunnel logs are the first place to look. But those logs can be cryptic if you do not know what you are reading. This guide breaks down common ztunnel log messages and how to debug them.

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
# Set debug logging for all components
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -X POST "localhost:15000/logging?level=debug"

# Set trace logging for specific modules
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -X POST "localhost:15000/logging?ztunnel::proxy=trace"

# Reset to default info level
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -X POST "localhost:15000/logging?level=info"
```

For installation-time log level configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    ztunnel:
      env:
        RUST_LOG: "ztunnel=debug,ztunnel::proxy=trace"
```

## Understanding Common Log Messages

Here are the most common ztunnel log messages and what they mean.

### Workload Registration Messages

```text
INFO ztunnel::state: adding workload WorkloadInfo { name: "my-pod", namespace: "default", service_account: "default" }
```

This appears when ztunnel learns about a new pod on its node. If you do not see this for a pod that should be in the mesh, the pod might not be enrolled in ambient mode. Check that the namespace has the ambient label:

```bash
kubectl get namespace default --show-labels | grep istio.io/dataplane-mode
```

If the label is missing, add it:

```bash
kubectl label namespace default istio.io/dataplane-mode=ambient
```

### Connection Log Messages

```text
INFO ztunnel::proxy::inbound: got CONNECT request to 10.244.1.5:8080
```

This means ztunnel received an inbound HBONE (HTTP-Based Overlay Network Environment) connection for a pod on its node. If you see these, traffic is flowing through the mesh correctly.

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
# Check ztunnel's CA certificates
kubectl exec -n istio-system ztunnel-xxxxx -- \
  cat /var/run/secrets/istio/root-cert.pem | openssl x509 -noout -text

# Check workload certificate details
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -s localhost:15000/certs | python3 -m json.tool
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
DEBUG ztunnel::dns: resolving my-service.default.svc.cluster.local -> 10.96.45.67
```

ztunnel handles DNS for pods in the ambient mesh. If DNS resolution is failing, you will see:

```text
WARN ztunnel::dns: failed to resolve my-service.default.svc.cluster.local: NXDOMAIN
```

Check that the Kubernetes service exists:

```bash
kubectl get svc my-service -n default
```

## Debugging Connection Flows

To trace a specific connection through ztunnel, enable trace-level logging and look for the connection ID:

```bash
# Enable trace logging
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -X POST "localhost:15000/logging?ztunnel::proxy=trace"

# Generate a test request
kubectl exec -n default deploy/client -- curl -s http://server:8080/

# Look for the connection in logs
kubectl logs -n istio-system ztunnel-xxxxx | grep "conn_id"
```

A successful connection flow looks like this in the logs:

```text
TRACE ztunnel::proxy::outbound: new outbound connection src=10.244.1.3:45678 dst=10.244.2.5:8080
TRACE ztunnel::proxy::outbound: resolved destination to workload WorkloadInfo { name: "server-xxx", ... }
TRACE ztunnel::proxy::outbound: establishing HBONE tunnel to 10.244.2.1:15008
TRACE ztunnel::proxy::outbound: HBONE tunnel established
TRACE ztunnel::proxy::outbound: connection complete, bytes_sent=1234, bytes_recv=5678
```

## Checking ztunnel Configuration State

ztunnel exposes its internal state through a debug API:

```bash
# View all known workloads
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -s localhost:15000/config_dump | python3 -m json.tool

# View connected peers
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -s localhost:15000/connections

# View authorization policies loaded
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -s localhost:15000/config_dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
for policy in data.get('policies', []):
    print(json.dumps(policy, indent=2))
"
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
  values:
    ztunnel:
      resources:
        requests:
          memory: 128Mi
        limits:
          memory: 256Mi
```

**Traffic not flowing through ztunnel**: Verify that the node's network rules are set up correctly:

```bash
# Check iptables rules on the node (via a debug pod)
kubectl debug node/my-node -it --image=nicolaka/netshoot -- \
  iptables-save | grep ztunnel
```

**Slow performance**: Check ztunnel metrics for connection counts:

```bash
kubectl exec -n istio-system ztunnel-xxxxx -- \
  curl -s localhost:15020/metrics | grep ztunnel_connections
```

High connection counts on a single ztunnel can indicate that too many pods are scheduled on one node. Consider spreading your workloads more evenly.

Understanding ztunnel logs takes some practice, but once you know the patterns, debugging ambient mode issues becomes straightforward. Start with info-level logs to identify the category of problem, then switch to debug or trace level for the specific module to get the full picture.
