# How to Test Specific IP Assignment with Calico IPAM Before Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Static IP, Networking

Description: Test specific IP assignment configurations in Calico to verify reliability across pod restarts and rescheduling.

---

## Introduction

Specific IP Assignment with Calico IPAM provides important IP address management capabilities in Calico. This feature allows for fine-grained control over how IP addresses are assigned to pods in your Kubernetes cluster.

## Prerequisites

- Calico v3.20+ installed
- kubectl and calicoctl access
- Cluster using Calico IPAM
- IP pools configured

## Configuration

```bash
calicoctl get ippools -o yaml
calicoctl ipam show --show-blocks
```

## Example

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: example-pool
spec:
  cidr: 10.48.0.0/16
  blockSize: 26
  natOutgoing: true
---
apiVersion: v1
kind: Pod
metadata:
  name: static-ip-test
  annotations:
    cni.projectcalico.org/ipAddrs: '["10.48.0.10"]'
spec:
  containers:
    - name: nginx
      image: nginx:1.25
```

## Verification

```bash
calicoctl ipam check -o ipam-report.json
calicoctl ipam show --ip=10.48.0.10
kubectl get pods -A -o wide
```

## Architecture

```mermaid
graph LR
    POOL[IP Pool] --> ALLOC[IPAM]
    ALLOC --> POD[Pod IP]
```

## Conclusion

How to Test Specific IP Assignment with Calico IPAM Before Production helps ensure your Calico deployment handles IP addressing correctly for your specific workload requirements.
