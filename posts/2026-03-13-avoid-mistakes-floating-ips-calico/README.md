# How to Avoid Common Mistakes with Floating IPs with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Floating IP, Networking

Description: Avoid common mistakes when implementing floating IPs in Calico including routing race conditions and ARP caching issues.

---

## Introduction

Floating IPs with Calico provide additional IP addresses that can be used to reach Kubernetes pods. The floating IP is assigned to the pod workload endpoint, and the host uses NAT to deliver incoming traffic to the pod's real IP address.

## Prerequisites

- Calico v3.20+ installed with the Calico CNI plugin
- A manifest-managed Calico installation, because floating IPs for Kubernetes pods are not currently supported for operator-managed Calico clusters
- kubectl and calicoctl access
- IP pools configured

## Configuration

```bash
calicoctl get ippools -o yaml
calicoctl ipam show --show-blocks
```

Floating IPs must also be enabled in the Calico CNI network configuration by setting `feature_control.floating_ips` to `true`.

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
  name: floating-ip-example
  annotations:
    cni.projectcalico.org/floatingIPs: '["10.48.0.10"]'
spec:
  containers:
  - name: web
    image: nginx
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

How to Avoid Common Mistakes with Floating IPs with Calico helps ensure your Calico deployment handles IP addressing correctly for your specific workload requirements.
