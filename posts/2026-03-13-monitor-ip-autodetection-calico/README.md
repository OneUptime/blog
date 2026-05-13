# How to Monitor IP Autodetection in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, IP Autodetection, Networking

Description: Monitor Calico node IP assignments to detect unintended IP changes caused by interface reconfiguration.

---

## Introduction

Calico IP Autodetection is a critical configuration aspect of Calico networking. This guide provides step-by-step instructions for managing this feature effectively in production Kubernetes clusters.

## Prerequisites

- Calico v3.20+ installed
- kubectl and calicoctl configured
- Cluster-admin access

## Steps

```bash
# Check current state

calicoctl get nodes -o yaml
kubectl get nodes -o wide
calicoctl ipam show --show-blocks
```

## Configuration

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    nodeAddressAutodetectionV4:
      kubernetes: NodeInternalIP
```

## Verify

```bash
# Validate changes
calicoctl get nodes -o yaml
calicoctl ipam check
kubectl get nodes -o 'custom-columns=NAME:.metadata.name,INTERNAL-IP:.status.addresses[?(@.type=="InternalIP")].address' --no-headers
```

## Architecture

```mermaid
graph LR
    K8S[Kubernetes Node InternalIP] --> DETECT[Calico IP Autodetection]
    DETECT --> NODE[Calico Node ipv4Address]
    NODE --> ROUTE[Inter-node Routing]
```

## Conclusion

How to Monitor IP Autodetection in Calico requires careful planning and validation. Use the steps above to ensure your configuration meets your cluster's IP addressing requirements.
