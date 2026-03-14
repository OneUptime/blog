# Service Endpoints in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, EBPF, Services

Description: Understand how Cilium manages Kubernetes service endpoints using eBPF maps, replacing kube-proxy for load balancing and connection tracking at kernel speed.

---

## Introduction

Kubernetes services traditionally rely on kube-proxy to manage iptables rules that load balance traffic across pod endpoints. As clusters scale to thousands of services and tens of thousands of endpoints, kube-proxy's iptables approach creates performance bottlenecks: iptables rules are evaluated linearly, updates require full rule rebuilds, and each new service adds to the latency of every subsequent packet traversal.

Cilium replaces kube-proxy entirely using eBPF maps for service endpoint management. eBPF hash maps provide O(1) lookup regardless of cluster size - looking up a service with 50,000 endpoints takes the same time as looking up one with 10. When a pod is added or removed, Cilium updates only the relevant eBPF map entry, not the entire rule set. This architecture also enables features that iptables simply cannot provide, like per-service load balancing algorithms, service topology awareness, and session affinity without conntrack tables.

This guide explains how Cilium manages service endpoints, how to inspect the endpoint state, and how to troubleshoot endpoint-related connectivity issues.

## Prerequisites

- Cilium v1.10+ with kube-proxy replacement (or compatibility mode)
- `kubectl` installed
- `cilium` CLI installed

## Step 1: Check Service Endpoint State

```bash
# List all services Cilium is managing
cilium service list

# Show detailed endpoint state for a specific service
cilium service get <service-id>

# Show load balancing backends
cilium bpf lb list
```

## Step 2: Inspect eBPF Load Balancer Maps

```bash
# List all load balancer service entries
cilium bpf lb list --frontend

# List all backend endpoints
cilium bpf lb list --backend

# Inspect a specific service entry
kubectl exec -n kube-system cilium-xxxxx -- \
  cilium bpf lb list | grep "10.96.0.1"
```

## Step 3: Verify Endpoint Health

```bash
# List all endpoints and their health
cilium endpoint list

# Get detailed endpoint information
cilium endpoint get <endpoint-id>

# Check endpoint policy enforcement state
cilium endpoint list | grep -E "ID|POLICY|STATE"
```

## Step 4: Service Topology Awareness

Configure topology-aware routing to prefer local endpoints:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    service.kubernetes.io/topology-mode: auto
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
```

## Step 5: Session Affinity Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: stateful-service
spec:
  selector:
    app: stateful
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
  ports:
    - port: 8080
```

Verify session affinity in Cilium:

```bash
# Check session affinity configuration
cilium bpf lb list | grep -A 5 "stateful-service"

# Verify connections are going to same backend
for i in {1..5}; do
  kubectl exec test-pod -- curl -s http://stateful-service:8080/whoami
done
```

## Service Endpoint Architecture

```mermaid
flowchart TD
    A[Pod makes connection\nto Service VIP] --> B[eBPF Hook\nat connect() syscall]
    B --> C[Lookup Service\nin eBPF LB map]
    C --> D[Select Backend\nRound-robin/affinity]
    D --> E[Replace VIP with\nPod IP in-place]
    E --> F[Direct connection\nto Backend Pod]
    G[kube-apiserver] -->|EndpointSlice update| H[Cilium Operator]
    H -->|Update| I[eBPF LB map]
```

## Conclusion

Cilium's eBPF-based service endpoint management provides O(1) lookup performance for any scale of Kubernetes service deployment, eliminates the kube-proxy iptables bottleneck, and enables advanced features like topology-aware routing and efficient session affinity. The `cilium service list` and `cilium bpf lb list` commands give you direct visibility into how Cilium is handling your service traffic, which is invaluable for debugging connectivity issues that standard Kubernetes tools cannot expose.
