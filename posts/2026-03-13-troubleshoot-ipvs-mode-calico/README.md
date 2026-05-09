# How to Troubleshoot IPVS Mode with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPVS, Kube-proxy, Networking

Description: Diagnose IPVS mode issues with Calico including conntrack conflicts, service resolution failures, and IPVS rule inconsistencies.

---

## Introduction

IPVS (IP Virtual Server) mode for kube-proxy can provide performance improvements over iptables mode for clusters with large numbers of services. Where iptables mode creates sequential rules, IPVS uses a hash table as its underlying data structure and runs in kernel space. This difference can become significant at scale, although current Kubernetes releases deprecate IPVS mode in favor of nftables mode on Linux nodes that support it.

Calico works with IPVS mode kube-proxy and automatically enables IPVS support when it detects kube-proxy using IPVS. Calico handles pod routing and network policy while kube-proxy in IPVS mode handles service routing. If you change kube-proxy to IPVS mode in a running cluster, restart calico-node so Calico detects the change.

## Prerequisites

- Kubernetes cluster with Calico
- kube-proxy with IPVS support (kernel modules: ip_vs, ip_vs_rr, ip_vs_wrr, ip_vs_sh)
- kubectl access

## Enable IPVS Mode

```bash
# Check if IPVS modules are loaded

lsmod | grep -E "ip_vs|nf_conntrack"

# Load IPVS modules
modprobe ip_vs ip_vs_rr ip_vs_wrr ip_vs_sh

# Configure kube-proxy for IPVS
kubectl edit configmap -n kube-system kube-proxy
# Set: mode: "ipvs"

# Restart kube-proxy
kubectl rollout restart daemonset/kube-proxy -n kube-system

# Restart calico-node after changing kube-proxy mode
CALICO_NAMESPACE=$(kubectl get daemonset -A --no-headers | awk '$2=="calico-node" {print $1; exit}')
kubectl rollout restart daemonset/calico-node -n "${CALICO_NAMESPACE}"
```

## Verify IPVS Rules

```bash
# Check IPVS virtual services
ipvsadm -ln

# Count IPVS virtual services
ipvsadm -ln | awk '/^(TCP|UDP|SCTP)/ { count++ } END { print count+0 }'

# Compare with Kubernetes Services; multi-port Services and NodePorts create multiple IPVS entries
kubectl get svc -A -o wide
```

## Test Service Connectivity

```bash
# Deploy test service
kubectl create deployment test-app --image=nginx --replicas=3
kubectl expose deployment test-app --port=80 --type=ClusterIP

SVC_IP=$(kubectl get svc test-app -o jsonpath='{.spec.clusterIP}')
kubectl run test-client --rm -i --restart=Never --image=busybox -- wget -O- http://${SVC_IP}/
```

## IPVS Architecture with Calico

```mermaid
graph LR
    subgraph Data Plane
        POD[Pod] -->|Service IP| IPVS[kube-proxy IPVS\nO(1) lookup]
        IPVS -->|Backend selection| BACKEND[Backend Pod]
        POD -->|Pod IP routing| CALICO[Calico eBPF/iptables]
        CALICO -->|Route| BACKEND
    end
```

## Conclusion

IPVS mode can provide improved service routing performance compared to iptables mode, especially at scale with many services, but current Kubernetes releases recommend nftables mode as the replacement where available. Calico and IPVS mode work together effectively - Calico handles pod connectivity and network policy while IPVS handles service load balancing. After migrating to IPVS mode, validate that expected Service ports are represented in the IPVS table and that service connectivity functions correctly.
