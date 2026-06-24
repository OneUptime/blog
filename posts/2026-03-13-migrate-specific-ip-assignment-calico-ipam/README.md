# How to Migrate to Specific IP Assignment with Calico IPAM Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Static IP, Networking

Description: Safely add specific IP assignments to existing pods without causing connectivity disruption.

---

## Introduction

Specific IP Assignment with Calico IPAM provides important IP address management capabilities in Calico. This feature allows for fine-grained control over how IP addresses are assigned to pods in your Kubernetes cluster. The annotation must be present when the pod is created; adding it to an existing pod has no effect until the pod is recreated.

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
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: specific-ip-example
  annotations:
    cni.projectcalico.org/ipAddrs: '["10.48.0.10"]'
spec:
  containers:
    - name: nginx
      image: nginx:1.27
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

How to Migrate to Specific IP Assignment with Calico IPAM Safely helps ensure your Calico deployment handles IP addressing correctly for your specific workload requirements.
