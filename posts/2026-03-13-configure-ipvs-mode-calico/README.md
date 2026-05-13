# How to Configure IPVS Mode with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPVS, Kube-proxy, Networking

Description: Configure Kubernetes kube-proxy in IPVS mode with Calico to improve service routing performance using kernel-level load balancing.

---

## Introduction

IPVS (IP Virtual Server) mode for kube-proxy provides performance improvements over iptables mode for clusters with large numbers of services. Where iptables performs sequential rule traversal for service lookups, IPVS uses hash tables for O(1) lookups regardless of the number of services. This difference becomes significant at scale: clusters with thousands of services see measurable latency reduction and CPU savings from switching to IPVS mode. In Kubernetes v1.35 and later, IPVS mode is deprecated and nftables mode is the recommended replacement where it is supported.

Calico works with IPVS mode kube-proxy without conflict when using Calico's standard Linux data plane. Calico handles pod routing and network policy while kube-proxy in IPVS mode handles service routing. The two systems operate on different parts of the networking stack and complementarily serve their respective roles.

## Prerequisites

- Kubernetes cluster with Calico
- kube-proxy with IPVS support (kernel modules: ip_vs, ip_vs_rr, ip_vs_wrr, ip_vs_sh)
- ipvsadm installed on nodes where you verify IPVS rules
- kubectl access

## Enable IPVS Mode

```bash
# Check if IPVS modules are loaded

lsmod | grep -E "ip_vs|nf_conntrack"

# Load IPVS modules
modprobe --all ip_vs ip_vs_rr ip_vs_wrr ip_vs_sh

# Configure kube-proxy for IPVS
kubectl edit configmap -n kube-system kube-proxy
# Set: mode: "ipvs"

# Restart kube-proxy
kubectl rollout restart daemonset -n kube-system kube-proxy

# Restart calico-node so Calico re-detects kube-proxy IPVS mode
kubectl rollout restart daemonset -n calico-system calico-node
# If Calico is installed in kube-system instead:
# kubectl rollout restart daemonset -n kube-system calico-node
```

## Verify IPVS Rules

```bash
# Check IPVS virtual services
ipvsadm -ln

# Count IPVS entries
ipvsadm -ln | grep -c "TCP\|UDP"

# Compare with services as a rough check; IPVS virtual servers are per service port
# plus NodePorts, external IPs, and load balancer IPs, so this is not one-to-one.
kubectl get svc -A | wc -l
```

## Test Service Connectivity

```bash
# Deploy test service
kubectl create deployment test-app --image=nginx --replicas=3
kubectl expose deployment test-app --port=80 --type=ClusterIP

SVC_IP=$(kubectl get svc test-app -o jsonpath='{.spec.clusterIP}')
kubectl run test-client --rm -i --restart=Never --image=busybox -- wget -qO- http://${SVC_IP}/
```

## IPVS Architecture with Calico

```mermaid
graph LR
    subgraph Data Plane
        POD[Pod] -->|Service IP| IPVS[kube-proxy IPVS\nO(1) lookup]
        IPVS -->|Backend selection| BACKEND[Backend Pod]
        POD -->|Pod IP routing| CALICO[Calico routing and policy]
        CALICO -->|Route| BACKEND
    end
```

## Conclusion

IPVS mode provides better service routing performance than iptables mode in some large clusters, but it is deprecated in Kubernetes v1.35 and later in favor of nftables mode. Calico and IPVS mode work together effectively when using Calico's standard Linux data plane - Calico handles pod connectivity and network policy while IPVS handles service load balancing. After migrating to IPVS mode, validate that expected service ports are represented in the IPVS table and that service connectivity functions correctly.
