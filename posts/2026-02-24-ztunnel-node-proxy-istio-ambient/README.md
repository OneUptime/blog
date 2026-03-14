# How to Understand ztunnel Node Proxy in Istio Ambient

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ztunnel, Ambient Mesh, Kubernetes, Service Mesh

Description: A practical guide to understanding the ztunnel node proxy in Istio ambient mode, covering its role, configuration, and how it handles L4 traffic.

---

The ztunnel (zero-trust tunnel) is the foundational component of Istio's ambient mode. It runs on every node in your cluster as a DaemonSet and handles all L4 traffic processing for pods enrolled in the ambient mesh. If you are working with Istio ambient mode, understanding ztunnel is essential because it is the component that actually touches your traffic.

## What ztunnel Does

At its core, ztunnel is a lightweight, purpose-built proxy that handles:

- Mutual TLS (mTLS) encryption and termination between nodes
- L4 authorization policy enforcement
- TCP traffic routing and load balancing
- Telemetry collection for L4 metrics (bytes sent/received, connection counts)
- HBONE tunnel management

Unlike Envoy, ztunnel is not a general-purpose proxy. It was written in Rust specifically for this role, which makes it fast and memory-efficient. It does not parse HTTP headers, does not handle retries at the application layer, and does not do traffic splitting based on URL paths. All of that is the waypoint proxy's job.

## How ztunnel Gets Deployed

When you install Istio with the ambient profile, ztunnel is deployed as a DaemonSet in the `istio-system` namespace:

```bash
# Install with ambient profile
istioctl install --set profile=ambient

# Verify ztunnel is running on all nodes
kubectl get daemonset -n istio-system ztunnel
```

You should see one ztunnel pod per node:

```bash
kubectl get pods -n istio-system -l app=ztunnel -o wide
```

Output will look something like:

```text
NAME            READY   STATUS    NODE
ztunnel-abc12   1/1     Running   node-1
ztunnel-def34   1/1     Running   node-2
ztunnel-ghi56   1/1     Running   node-3
```

## Traffic Interception

ztunnel intercepts traffic from pods in ambient-enrolled namespaces. The interception mechanism uses the Istio CNI plugin, which sets up network rules when pods are created. Here is the flow:

1. A pod in an ambient namespace sends traffic
2. The CNI-configured iptables/eBPF rules redirect the traffic to the local ztunnel
3. ztunnel looks up the destination, applies L4 policies, and forwards the traffic
4. On the receiving side, the destination node's ztunnel decrypts and delivers the traffic

You can check that traffic interception is working by examining the ztunnel logs:

```bash
# Check ztunnel logs for a specific node
kubectl logs -n istio-system -l app=ztunnel --field-selector spec.nodeName=node-1 --tail=100
```

## HBONE Tunneling

ztunnel uses HBONE (HTTP-Based Overlay Network Encapsulation) to create encrypted tunnels between nodes. HBONE wraps TCP streams inside HTTP/2 CONNECT requests, with mTLS applied at the transport layer.

The connection between two ztunnel instances looks like this:

```text
Source Pod -> [captured by CNI] -> Source ztunnel
  |
  | HTTP/2 CONNECT over mTLS (port 15008)
  |
Destination ztunnel -> [delivered to] -> Destination Pod
```

Port 15008 is the default HBONE port. You can verify it is in use:

```bash
# Check that ztunnel is listening on port 15008
kubectl exec -n istio-system $(kubectl get pod -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}') -- ss -tlnp | grep 15008
```

## Identity and Certificates

Each ztunnel manages SPIFFE identities for the pods on its node. When a pod is enrolled in the ambient mesh, ztunnel requests a certificate from istiod on behalf of that pod's service account. This means ztunnel holds multiple identities simultaneously, one for each service account running on its node.

The certificate workflow:

1. Pod starts on a node in an ambient namespace
2. ztunnel detects the new pod through Kubernetes API watches
3. ztunnel requests a certificate from istiod for the pod's service account
4. istiod issues an X.509 SVID certificate
5. ztunnel uses this certificate when proxying traffic for that pod

You can inspect the certificates ztunnel is managing:

```bash
# Check ztunnel certificate status
istioctl proxy-config secret $(kubectl get pod -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}') -n istio-system
```

## L4 Authorization Policies

ztunnel enforces L4 authorization policies. These are policies that make decisions based on:

- Source identity (SPIFFE ID / service account)
- Destination port
- Source/destination namespace
- Source/destination IP

Here is an example L4 policy that ztunnel can enforce:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: backend
spec:
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/frontend-sa"]
    to:
    - operation:
        ports: ["8080"]
```

This policy allows traffic from the `frontend-sa` service account to port 8080 in the backend namespace. Since it only looks at identity and port, ztunnel handles it without needing a waypoint proxy.

Policies that reference HTTP methods, paths, or headers will NOT be enforced by ztunnel. Those require a waypoint proxy.

## Resource Usage

One of the main selling points of ztunnel is its low resource footprint. Since it is written in Rust and only handles L4 processing, it uses significantly less memory than Envoy:

```bash
# Check ztunnel resource usage
kubectl top pods -n istio-system -l app=ztunnel
```

Typical resource usage for ztunnel is around 20-50MB of RAM per instance, depending on the number of pods on the node and active connections. Compare this to Envoy sidecars which typically use 50-100MB each.

You can set resource limits in the ztunnel Helm values:

```yaml
# values-ztunnel.yaml
resources:
  requests:
    cpu: 100m
    memory: 64Mi
  limits:
    cpu: 500m
    memory: 256Mi
```

## Monitoring ztunnel

ztunnel exposes Prometheus metrics for monitoring. The metrics include TCP connection counts, bytes transferred, and connection durations:

```bash
# Port-forward to ztunnel metrics endpoint
kubectl port-forward -n istio-system $(kubectl get pod -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}') 15020:15020

# Scrape metrics
curl http://localhost:15020/metrics
```

Key metrics to watch:

- `istio_tcp_connections_opened_total` - number of TCP connections opened
- `istio_tcp_connections_closed_total` - number of TCP connections closed
- `istio_tcp_sent_bytes_total` - total bytes sent
- `istio_tcp_received_bytes_total` - total bytes received

## Debugging ztunnel

When things go wrong, ztunnel has several debug endpoints and tools:

```bash
# Check ztunnel configuration dump
kubectl exec -n istio-system $(kubectl get pod -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}') -- curl -s localhost:15000/config_dump

# Check workload information ztunnel knows about
kubectl exec -n istio-system $(kubectl get pod -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}') -- curl -s localhost:15000/debug/workloads

# Increase log verbosity
kubectl exec -n istio-system $(kubectl get pod -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}') -- curl -s -X POST "localhost:15000/logging?level=debug"
```

## ztunnel and Node Failures

Since ztunnel runs as a DaemonSet, Kubernetes handles node-level failures by scheduling ztunnel on replacement nodes. If a ztunnel pod crashes, it restarts and re-establishes connections. During the restart window, traffic from pods on that node will fail until ztunnel comes back up.

To mitigate this, you should set appropriate liveness and readiness probes, and make sure your ztunnel resource limits are generous enough that the pod does not get OOMKilled under load.

## Summary

ztunnel is the workhorse of Istio ambient mode. It provides mTLS, L4 authorization, and telemetry for every pod in the mesh without requiring sidecar injection. Written in Rust for performance, it runs as a DaemonSet and handles traffic interception through the Istio CNI plugin. Understanding how ztunnel manages identities, intercepts traffic, and enforces policies is key to operating Istio ambient mode effectively.
