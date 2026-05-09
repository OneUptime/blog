# How to Troubleshoot Kube-Proxy Replacement with Calico eBPF

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, eBPF, Kube-proxy, Networking

Description: Diagnose service routing failures when Calico eBPF replaces kube-proxy.

---

## Introduction

Calico eBPF mode can replace kube-proxy for service routing, and Felix can clean up the iptables KUBE-* chains that grow with the number of services and endpoints. In large clusters with thousands of services, kube-proxy's iptables rules add measurable latency for each connection setup. Calico eBPF uses kernel BPF maps for service lookups so service lookup cost does not grow with the number of iptables rules.

The replacement also enables Direct Server Return (DSR) for external service traffic, where return traffic goes directly from the backend pod's node to the client without traversing the ingress node again. This can reduce latency, but it requires an underlying network that allows one node to respond on behalf of another.

## Prerequisites

- Linux kernel 5.10+ for current Calico eBPF releases (or a supported distribution kernel with required eBPF backports)
- A Calico release and installation method that supports the eBPF data plane
- A cluster where kube-proxy can be disabled, or where Calico is configured not to fight kube-proxy's iptables rules

## Configure kube-proxy Replacement

```bash
# Step 1: Disable DaemonSet-managed kube-proxy

kubectl patch ds -n kube-system kube-proxy \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico":"true"}}}}}'

# Step 2: Enable Calico eBPF for an operator-managed install
kubectl patch installation.operator.tigera.io default --type merge \
  -p '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF","bpfNetworkBootstrap":"Enabled","kubeProxyManagement":"Enabled"}}}'

# For a manifest-based install, enable the Felix BPF dataplane instead:
calicoctl patch felixconfiguration default --type merge \
  --patch '{"spec":{"bpfEnabled":true}}'

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
calicoctl patch felixconfiguration default --type merge \
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

Replacing kube-proxy with Calico eBPF provides map-based service routing performance that scales with cluster size, eliminates kube-proxy iptables chain traversal overhead, and enables DSR for lower-latency external service routing on compatible networks. The migration requires disabling kube-proxy or avoiding kube-proxy cleanup conflicts and enabling Calico eBPF, which can be done without rebooting nodes but does require careful rollout because nodes may transition to eBPF mode at different times.
