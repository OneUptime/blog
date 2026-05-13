# How to Migrate to Kube-Proxy Replacement with Calico eBPF Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, eBPF, Kube-proxy, Networking

Description: Safely disable kube-proxy and enable Calico eBPF service routing in a live cluster.

---

## Introduction

Calico eBPF mode can replace kube-proxy for supported Kubernetes service routing, eliminating the iptables KUBE-* chains that grow with the number of services and endpoints. In large clusters with thousands of services, kube-proxy's iptables rules add measurable latency for each connection setup. Calico eBPF uses kernel-level maps for constant-time service lookups regardless of cluster size.

The replacement also enables Direct Server Return (DSR) for external service traffic where the underlying network supports it, where return traffic goes directly from the backend node to the client without traversing the ingress node again. This can reduce latency and CPU overhead, but it requires the network fabric to allow one node to respond on behalf of another.

## Prerequisites

- A Calico-supported Linux distribution and kernel for eBPF mode, such as Ubuntu 22.04+, Red Hat Enterprise Linux 8.4+ with the required backports, or another supported distribution with Linux kernel 5.10+
- A current Calico release with the Kubernetes datastore driver
- Calico configured to reach the Kubernetes API server directly, not through the `kubernetes` ClusterIP
- kube-proxy can be safely disabled, or Calico is configured to avoid kube-proxy iptables cleanup conflicts
- If kube-proxy uses IPVS mode, switch it to iptables mode and restart nodes before enabling eBPF mode

## Configure kube-proxy Replacement

```bash
# Step 1: Enable Calico eBPF
# Operator install:
kubectl patch installation.operator.tigera.io default --type merge \
  -p '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF"}}}'

# Manifest install:
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"bpfEnabled":true}}'

# Step 2: Disable kube-proxy on clusters where kube-proxy runs as a DaemonSet

kubectl patch ds -n kube-system kube-proxy \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico":"true"}}}}}'

# Step 3: Verify no iptables KUBE rules remain
iptables -t nat -L | grep KUBE | wc -l
# Expected: 0
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

## Enable DSR for External Services

```bash
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

Replacing kube-proxy with Calico eBPF provides constant-time service routing performance that scales with cluster size, eliminates iptables chain traversal overhead, and enables DSR for lower-latency external service handling where the network supports it. The migration requires configuring Calico for direct API server access, enabling Calico eBPF, and disabling kube-proxy or avoiding cleanup conflicts, which can be done without rebooting nodes except when migrating from IPVS mode.
