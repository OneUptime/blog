# How to Avoid Common Mistakes with Specific IP Assignment with Calico IPAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Static IP, Networking

Description: Avoid common mistakes with Calico specific IP assignments including pool conflicts and IP reuse issues.

---

## Introduction

Specific IP Assignment with Calico IPAM provides important IP address management capabilities in Calico. This feature allows for fine-grained control over how IP addresses are assigned to pods in your Kubernetes cluster.

## Prerequisites

- Calico installed with Calico IPAM enabled
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
  nodeSelector: "!all()"
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example-static-ip
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
kubectl get pods -A -o wide
```

## Architecture

```mermaid
graph LR
    POOL[IP Pool] --> ALLOC[IPAM]
    ALLOC --> POD[Pod IP]
```

## Conclusion

How to Avoid Common Mistakes with Specific IP Assignment with Calico IPAM helps ensure your Calico deployment handles IP addressing correctly for your specific workload requirements.
