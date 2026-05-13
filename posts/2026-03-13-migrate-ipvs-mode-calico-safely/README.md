# How to Migrate to IPVS Mode with Calico Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPVS, Kube-proxy, Networking

Description: Safely migrate from iptables kube-proxy mode to IPVS mode in a Calico cluster with minimal service disruption.

---

## Introduction

IPVS (IP Virtual Server) mode for kube-proxy can provide performance improvements over iptables mode for clusters with large numbers of services. Where iptables rule processing grows with the number of services and endpoints, IPVS uses hash tables for efficient lookups. This difference becomes significant at scale: clusters with thousands of services may see measurable latency reduction and CPU savings from switching to IPVS mode. Note that Kubernetes v1.35 marks IPVS proxy mode as deprecated and recommends nftables mode for modern Linux clusters; use IPVS only when it is the appropriate supported mode for your environment.

Calico works with IPVS mode kube-proxy without conflict. Calico handles pod routing and network policy while kube-proxy in IPVS mode handles service routing. The two systems operate on different parts of the networking stack and complementarily serve their respective roles.

## Prerequisites

- Kubernetes cluster with Calico
- Linux nodes with kube-proxy IPVS support (kernel modules: ip_vs, ip_vs_rr, ip_vs_wrr, ip_vs_sh, nf_conntrack)
- kubectl access
- ipvsadm installed on nodes where you verify IPVS state

## Enable IPVS Mode

```bash
# Check if IPVS modules are loaded

lsmod | grep -E "ip_vs|nf_conntrack"

# Load IPVS modules
modprobe -a ip_vs ip_vs_rr ip_vs_wrr ip_vs_sh nf_conntrack

# Configure kube-proxy for IPVS
kubectl edit configmap -n kube-system kube-proxy
# Set: mode: "ipvs"

# Restart kube-proxy
kubectl rollout restart daemonset -n kube-system kube-proxy

# Restart calico-node so Calico re-detects kube-proxy IPVS mode
# Replace kube-system if your Calico installation uses a different namespace
kubectl rollout restart daemonset -n kube-system calico-node
```

## Verify IPVS Rules

```bash
# Check IPVS virtual services
ipvsadm -ln

# Count IPVS entries
ipvsadm -ln | grep -c "TCP\|UDP"

# Compare with the number of service ports; IPVS can include ClusterIP,
# NodePort, external IP, and load-balancer entries, so this is not a
# one-to-one match with the number of Service objects.
kubectl get svc -A | wc -l
```

## Test Service Connectivity

```bash
# Deploy test service
kubectl create deployment test-app --image=nginx --replicas=3
kubectl expose deployment test-app --port=80 --type=ClusterIP

SVC_IP=$(kubectl get svc test-app -o jsonpath='{.spec.clusterIP}')
kubectl run test-client --image=busybox -- wget -O- http://${SVC_IP}/
```

## IPVS Architecture with Calico

```mermaid
graph LR
    subgraph Data Plane
        POD[Pod] -->|Service IP| IPVS[kube-proxy IPVS\nO(1) lookup]
        IPVS -->|Backend selection| BACKEND[Backend Pod]
        POD -->|Pod IP routing| CALICO[Calico routing/policy]
        CALICO -->|Route| BACKEND
    end
```

## Conclusion

IPVS mode can provide better service routing performance compared to iptables mode, especially at scale with many services, but newer Kubernetes versions recommend nftables mode as the replacement for both iptables and IPVS on supported Linux nodes. Calico and IPVS mode work together effectively - Calico handles pod connectivity and network policy while IPVS handles service load balancing. After migrating to IPVS mode, validate that expected service ports are represented in the IPVS table and that service connectivity functions correctly.
