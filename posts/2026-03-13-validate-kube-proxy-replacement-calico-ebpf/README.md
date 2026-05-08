# How to Validate Kube-Proxy Replacement with Calico eBPF

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, eBPF, Kube-proxy, Networking

Description: Validate that Calico eBPF is correctly replacing kube-proxy by verifying service routing without iptables KUBE rules.

---

## Introduction

Calico eBPF mode can completely replace kube-proxy for service routing, eliminating the iptables KUBE-* chains that grow with the number of services and endpoints. In large clusters with thousands of services, kube-proxy's iptables rules add measurable latency for each connection setup. Calico eBPF uses kernel-level hash tables for O(1) service lookups regardless of cluster size.

The replacement also enables Direct Server Return (DSR) for external service traffic such as NodePort and LoadBalancer traffic, where return traffic goes directly from the backend node to the client without traversing the ingress node again. This reduces latency and CPU overhead when the underlying network allows nodes to send traffic on behalf of each other.

## Prerequisites

- Linux kernel 5.10+ (RHEL: 4.18.0-305+); kernel 6.6+ is recommended for all current eBPF features
- A Calico version that supports the eBPF dataplane
- Calico is configured to reach the Kubernetes API server directly, without relying on the Kubernetes service IP
- kube-proxy can be safely disabled, or Calico is configured to avoid conflicts with a managed kube-proxy
- If kube-proxy is running in IPVS mode, switch it to iptables mode and restart nodes before enabling eBPF

## Configure kube-proxy Replacement

```bash
# Step 1: Disable kube-proxy

kubectl patch ds -n kube-system kube-proxy \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico":"true"}}}}}'

# Step 2: Enable Calico eBPF for an operator-based install
kubectl patch installation.operator.tigera.io default --type merge \
  -p '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF"}}}'

# For a manifest-based install, set BPFEnabled on Felix instead
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"bpfEnabled":true}}'

# Step 3: Verify no kube-proxy service chains remain
iptables-save -t nat | grep -E 'KUBE-(SERVICES|SVC|SEP|NODEPORTS)'
# Expected: no output
```

## Verify eBPF Service Handling

```bash
# Check Calico BPF service map
kubectl get pod -n calico-system -l k8s-app=calico-node
kubectl exec -n calico-system <calico-node-pod> -- \
  calico-node -bpf nat dump

# Verify service IP routes
kubectl exec test-pod -- nslookup kubernetes.default.svc.cluster.local
kubectl exec test-pod -- wget -O- http://kubernetes.default.svc
```

## Enable DSR for LoadBalancer Services

```bash
# DSR requires the underlying network to allow a backend node to reply
# using the ingress node's IP.
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"bpfExternalServiceMode":"DSR"}}'
```

## eBPF vs iptables Service Routing

```mermaid
graph LR
    subgraph eBPF Mode
        PKT1[Incoming Packet] --> EBPF[eBPF Map Lookup\nO(1) - constant time]
        EBPF --> BACKEND1[Backend Pod]
    end
    subgraph iptables Mode
        PKT2[Incoming Packet] --> RULE1[KUBE-SERVICES]
        RULE1 --> RULE2[KUBE-SVC-xxx]
        RULE2 --> RULE3[KUBE-SEP-xxx]
        RULE3 --> BACKEND2[Backend Pod]
    end
```

## Conclusion

Replacing kube-proxy with Calico eBPF provides O(1) service routing performance that scales with cluster size, eliminates iptables chain traversal overhead, and enables DSR for lower-latency load balancing. The migration requires disabling kube-proxy and enabling Calico eBPF, which can be done without rebooting nodes but does require restarting pods in some configurations.
