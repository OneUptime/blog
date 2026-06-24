# How to Migrate to Floating IPs with Calico Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Floating IP, Networking

Description: Safely implement floating IPs in Calico for applications that require IP address stability across pod restarts.

---

## Introduction

Floating IPs with Calico provide a stable IP address that can front a single pod and be moved to a different pod when needed. The workload itself uses its normal pod IP; Calico uses NAT so traffic sent to the floating IP reaches the selected pod.

## Prerequisites

- Calico installed with manifest-managed CNI configuration
- kubectl and calicoctl access
- IP pools configured
- Floating IPs enabled in the Calico CNI configuration

## Configuration

```bash
calicoctl get ippools -o yaml
calicoctl ipam show --show-blocks
kubectl -n kube-system edit configmap calico-config
```

In the Calico plugin section of `cni_network_config`, enable floating IPs:

```json
{
  "feature_control": {
    "floating_ips": true
  }
}
```

## Example

All floating IPs must be within a configured Calico IP pool for correct advertisement:

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
  name: floating-ip-example
  annotations:
    cni.projectcalico.org/floatingIPs: '["10.48.0.10"]'
spec:
  containers:
    - name: app
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
    POOL[IP Pool] --> FIP[Floating IP]
    FIP --> NAT[Host NAT]
    NAT --> POD[Pod IP]
```

## Conclusion

How to Migrate to Floating IPs with Calico Safely helps ensure your Calico deployment handles IP addressing correctly for your specific workload requirements.
