# How to Configure Kube-Proxy Replacement with Calico eBPF

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, eBPF, Kube-proxy, Networking

Description: Configure Calico eBPF dataplane as a full kube-proxy replacement to improve service routing performance.

---

## Introduction

Calico eBPF mode can completely replace kube-proxy for service routing, eliminating the iptables KUBE-* chains that grow with the number of services and endpoints. In large clusters with thousands of services, kube-proxy's iptables rules add measurable latency for each connection setup. Calico eBPF uses kernel-level hash tables for O(1) service lookups regardless of cluster size.

The replacement also enables Direct Server Return (DSR) for external service traffic, where return traffic goes directly from the backend pod's node to the client without traversing the ingress node again. This reduces latency and CPU overhead, but it requires the underlying network to allow nodes to send traffic with each other's IPs.

## Prerequisites

- A supported Calico release installed with the Kubernetes datastore driver
- A supported OS/kernel, such as Ubuntu 22.04, Red Hat 8.4 with kernel 4.18.0-305 or later, or another supported distribution with Linux kernel 5.10 or later
- Calico configured to reach the Kubernetes API server directly, not through the `kubernetes` service ClusterIP
- kube-proxy can be safely disabled, and any IPVS-mode kube-proxy has been switched back to iptables mode before migration

## Configure kube-proxy Replacement

```bash
# Step 1: Configure Calico with the real API server endpoint.
# For operator installs, create this ConfigMap in tigera-operator.
# For manifest installs, create it in kube-system.
kubectl create configmap kubernetes-services-endpoint \
  -n tigera-operator \
  --from-literal=KUBERNETES_SERVICE_HOST=<API server host> \
  --from-literal=KUBERNETES_SERVICE_PORT=<API server port>

# Step 2: Disable kube-proxy

kubectl patch ds -n kube-system kube-proxy \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico":"true"}}}}}'

# Step 3: Enable Calico eBPF.
# For manifest-based installs, patch FelixConfiguration:
calicoctl patch felixconfiguration default --type merge \
  --patch '{"spec":{"bpfEnabled":true}}'

# For operator-based installs, set the dataplane on the Installation instead:
kubectl patch installation.operator.tigera.io default --type merge \
  -p '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF"}}}'

# Step 4: Verify kube-proxy service chains have been cleaned up
iptables-save -t nat | grep -E 'KUBE-(SERVICES|SVC|SEP)'
# Expected: no output
```

## Verify eBPF Service Handling

```bash
# Check Calico BPF service map
kubectl get pods -n calico-system -l k8s-app=calico-node
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

Replacing kube-proxy with Calico eBPF provides O(1) service routing performance that scales with cluster size, eliminates iptables chain traversal overhead, and enables DSR for lower-latency external service traffic. The migration requires disabling kube-proxy and enabling Calico eBPF. Most migrations do not require rebooting nodes, but switching kube-proxy from IPVS mode requires node restarts before enabling eBPF, and some installation methods require restarting Calico pods.
