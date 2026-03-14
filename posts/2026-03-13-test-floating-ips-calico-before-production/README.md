# How to Test Floating IPs with Calico Before Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Floating IP, Networking

Description: Test floating IP failover behavior in Calico to validate connectivity is maintained during pod reassignment.

---

## Introduction

Floating IPs with Calico provides important IP address management capabilities in Calico. This feature allows for fine-grained control over how IP addresses are assigned to pods in your Kubernetes cluster.

## Prerequisites

- Calico v3.20+ installed
- kubectl and calicoctl access
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
```

## Verification

```bash
calicoctl ipam check -o ipam-report.json
kubectl get pods -A -o wide
```

## Architecture

```mermaid
graph LR
    POOL[IP Pool] --> ALLOC[IPAM]
    ALLOC --> POD[Pod IP]
```

## Conclusion

How to Test Floating IPs with Calico Before Production helps ensure your Calico deployment handles IP addressing correctly for your specific workload requirements.
