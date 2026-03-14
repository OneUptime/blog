# How to Configure Dual-Stack IPv6 with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPv6, Dual-Stack, Networking

Description: Configure Calico for IPv4/IPv6 dual-stack networking to assign both IPv4 and IPv6 addresses to pods.

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

How to Configure Dual-Stack IPv6 with Calico in Calico provides reliable IP addressing for Kubernetes services and workloads. Follow the configuration and verification steps to ensure correct behavior.
