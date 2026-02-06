# How to Troubleshoot IPv6 vs IPv4 Binding Issues When the Collector Fails to Accept Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, IPv6, IPv4, Networking

Description: Resolve IPv6 and IPv4 binding conflicts that prevent the OpenTelemetry Collector from accepting incoming connections.

You have configured the Collector to listen on `0.0.0.0:4317`, but connections from certain pods still fail. Or the Collector starts fine on one node but fails on another with "address already in use." These symptoms often point to IPv6 vs IPv4 binding conflicts.

## The Dual-Stack Problem

Modern Kubernetes clusters can run in dual-stack mode, supporting both IPv4 and IPv6. When the Collector binds to `0.0.0.0`, it only listens on IPv4. If a client resolves the Collector's service to an IPv6 address and tries to connect, it will fail because nobody is listening on the IPv6 side.

Conversely, binding to `[::]` (the IPv6 equivalent of `0.0.0.0`) on some systems also listens on IPv4 (due to IPv4-mapped IPv6 addresses), but this behavior is OS-dependent.

## Diagnosing the Issue

Check what address family the Collector is actually using:

```bash
# Check the Collector's listening sockets
kubectl exec -it otel-collector-pod -- ss -tlnp

# Look for the address family:
# tcp  LISTEN  0  128  0.0.0.0:4317     0.0.0.0:*     <- IPv4 only
# tcp  LISTEN  0  128  [::]:4317        [::]:*         <- IPv6 (may include IPv4)
```

Check what address the client is trying to connect to:

```bash
# Resolve the service name to see if it returns IPv4 or IPv6
kubectl exec -it my-app-pod -- getent hosts otel-collector.observability.svc.cluster.local

# Example output:
# 10.96.45.12  otel-collector.observability.svc.cluster.local   <- IPv4
# or
# fd00::1:2:3  otel-collector.observability.svc.cluster.local   <- IPv6
```

## Fix 1: Bind to Both IPv4 and IPv6

Configure the Collector to listen on both address families. Unfortunately, the Collector does not support binding to both in a single endpoint entry, so you may need to use the IPv6 wildcard which often covers both:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "[::]:4317"  # Listen on all IPv6 and IPv4 interfaces
      http:
        endpoint: "[::]:4318"
```

On Linux with `net.ipv6.bindv6only=0` (the default), binding to `[::]` also accepts IPv4 connections. Verify this setting:

```bash
kubectl exec -it otel-collector-pod -- sysctl net.ipv6.bindv6only
# Should output: net.ipv6.bindv6only = 0
```

## Fix 2: Force IPv4-Only in the Kubernetes Service

If you do not need IPv6, configure the Service to only use IPv4:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: observability
spec:
  ipFamilies:
    - IPv4           # Only assign IPv4 ClusterIP
  ipFamilyPolicy: SingleStack
  selector:
    app: otel-collector
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
    - name: otlp-http
      port: 4318
      targetPort: 4318
```

## Fix 3: Configure Dual-Stack Service

If you need both IPv4 and IPv6 clients to reach the Collector:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: observability
spec:
  ipFamilies:
    - IPv4
    - IPv6
  ipFamilyPolicy: PreferDualStack
  selector:
    app: otel-collector
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
```

And make sure the Collector binds to `[::]` to accept both families.

## Fix 4: Handle Node-Level Differences

Different nodes in your cluster might have different IPv6 configurations. A DaemonSet Collector might work on some nodes but fail on others:

```bash
# Check IPv6 support per node
kubectl get nodes -o wide
# Look at the INTERNAL-IP column - some nodes might only have IPv4

# Check if IPv6 is enabled on a specific node
kubectl debug node/my-node -it --image=busybox -- cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# 0 = IPv6 enabled, 1 = IPv6 disabled
```

If some nodes have IPv6 disabled, bind the Collector to `0.0.0.0` instead of `[::]` to avoid failures on those nodes:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"  # Safe fallback for IPv4-only nodes
```

## Testing Both Address Families

```bash
# Test IPv4 connectivity
kubectl exec -it test-pod -- nc -zv -4 otel-collector.observability 4317

# Test IPv6 connectivity (if available)
kubectl exec -it test-pod -- nc -zv -6 otel-collector.observability 4317

# Check what address the gRPC client resolves to
kubectl exec -it test-pod -- python3 -c "
import socket
results = socket.getaddrinfo('otel-collector.observability.svc.cluster.local', 4317)
for r in results:
    print(f'Family: {r[0].name}, Address: {r[4]}')
"
```

## Summary

IPv6 issues are tricky because they depend on the cluster configuration, node OS settings, and CNI plugin behavior. The safest approach is to use `0.0.0.0` for IPv4-only clusters and `[::]` for dual-stack clusters, and to configure your Kubernetes Services with explicit `ipFamilies` and `ipFamilyPolicy` settings so there are no surprises.
