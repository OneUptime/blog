# How to Monitor Dual-Stack IPv6 with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPv6, Dual-Stack, Networking

Description: Monitor IPv6 address allocation, routing health, and pool utilization in Calico dual-stack deployments.

---

## Introduction

Dual-Stack IPv6 with Calico enables important networking capabilities in Calico Kubernetes clusters. Proper configuration ensures reliable service connectivity and IP address management.

## Prerequisites

- Calico v3.20+ installed
- kubectl and calicoctl access
- Cluster-admin access

## Configuration

```bash
calicoctl get ippools -o yaml
calicoctl get bgpconfiguration -o yaml
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
kubectl get svc -A
calicoctl ipam show --show-blocks
calicoctl ipam check
```

## Architecture

```mermaid
graph LR
    POOL[Calico IP Pool] --> POD[Pod IP]
    SERVICE[Service CIDR] --> SVCIP[Service IP]
    SVCIP --> POD
```

## Conclusion

How to Monitor Dual-Stack IPv6 with Calico in Calico provides reliable IP addressing for Kubernetes workloads while Kubernetes allocates service addresses. Follow the configuration and verification steps to ensure correct behavior.
