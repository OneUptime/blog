# How to Validate Dual-Stack IPv6 with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPv6, Dual-Stack, Networking

Description: Validate dual-stack pod networking in Calico by verifying both IPv4 and IPv6 address assignment and connectivity.

---

## Introduction

Dual-Stack IPv6 with Calico enables important networking capabilities in Calico Kubernetes clusters. Proper configuration ensures reliable service connectivity and IP address management.

## Prerequisites

- Calico v3.20+ installed
- Kubernetes dual-stack pod and service CIDRs configured
- kubectl and calicoctl access
- Cluster-admin access

## Configuration

```bash
calicoctl get ippools -o yaml
calicoctl get bgpconfiguration -o yaml
kubectl get nodes -o wide
```

## Example Configuration

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: example-ipv4-pool
spec:
  cidr: 10.48.0.0/16
  natOutgoing: true
---
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: example-ipv6-pool
spec:
  cidr: fd00:10:48::/64
  natOutgoing: true
```

## Verify

```bash
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{" "}{.status.podIPs}{"\n"}{end}'
kubectl get svc -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{" "}{.spec.ipFamilies}{" "}{.spec.clusterIPs}{"\n"}{end}'
calicoctl ipam show --show-blocks
```

## Architecture

```mermaid
graph LR
    V4POOL[IPv4 IP Pool] --> POD[Pod IPv4]
    V6POOL[IPv6 IP Pool] --> POD[Pod IPv6]
    SERVICE[Dual-stack Service] --> POD
```

## Conclusion

How to Validate Dual-Stack IPv6 with Calico in Calico provides reliable IP addressing for Kubernetes services and workloads. Follow the configuration and verification steps to ensure correct behavior.
