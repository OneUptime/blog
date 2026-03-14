# How to Test Dual-Stack IPv6 with Calico Before Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPv6, Dual-Stack, Networking

Description: Test dual-stack IPv6 networking in Calico before production deployment including application compatibility.

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
  name: example-pool
spec:
  cidr: 10.48.0.0/16
  natOutgoing: true
```

## Verify

```bash
kubectl get svc -A
calicoctl ipam check
```

## Architecture

```mermaid
graph LR
    POOL[IP Pool] --> SERVICE[Service IP]
    SERVICE --> POD[Pod]
```

## Conclusion

How to Test Dual-Stack IPv6 with Calico Before Production in Calico provides reliable IP addressing for Kubernetes services and workloads. Follow the configuration and verification steps to ensure correct behavior.
