# How to Configure Sidecar Acceleration in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, EBPF, Sidecar, Service Mesh

Description: Configure Calico sidecar acceleration to bypass redundant network processing when using service mesh sidecars like Envoy, reducing latency for sidecar-proxied traffic.

---

## Introduction

Calico sidecar acceleration uses eBPF to optimize traffic flows involving sidecar proxies like Envoy or Linkerd2-proxy. When a service mesh sidecar intercepts pod traffic, packets normally traverse the kernel network stack multiple times - once for the original pod, once for the sidecar, and once for the destination. Calico's eBPF dataplane can detect these sidecar flows and apply optimized routing that reduces redundant processing. This feature is particularly valuable in high-throughput microservices deployments where sidecar latency overhead is a concern.

## Prerequisites

- Calico v3.26+ installed on Kubernetes
- kubectl and calicoctl configured
- Cluster-admin access

## Configuration

```bash
# Enable eBPF dataplane (prerequisite for sidecar acceleration)
calicoctl patch felixconfiguration default --type merge \
  --patch '{"spec":{"bpfEnabled":true}}'

# Verify eBPF is active
kubectl exec -n calico-system ds/calico-node -- calico-node -v

# Check sidecar acceleration feature
calicoctl get felixconfiguration default -o yaml | grep -i sidecar
```

## Architecture

```mermaid
graph LR
    subgraph Kubernetes Cluster
        NODE[Calico Node] --> FEATURE[How to Configure Sidecar Acceleration in Calico]
    end
    FEATURE --> RESULT[Desired Behavior]
```

## Conclusion

How to Configure Sidecar Acceleration in Calico in Calico provides important networking capabilities for your Kubernetes cluster. Follow the steps above and validate your configuration to ensure correct behavior in production environments.
