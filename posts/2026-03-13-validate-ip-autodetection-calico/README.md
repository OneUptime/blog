# How to Validate IP Autodetection in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, IP Autodetection, Networking

Description: Validate that Calico has correctly detected node IP addresses and is using the expected interfaces for pod routing.

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
kubectl get pods -A -o wide | head -10
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
kubectl get nodes -o wide
```

## Architecture

```mermaid
graph LR
    K8S[Kubernetes Node Address] --> NODE[Calico Node Resource]
    NODE --> ROUTING[Pod Routing]
```

## Conclusion

How to Validate IP Autodetection in Calico requires careful planning and validation. Use the steps above to ensure your configuration meets your cluster's IP addressing requirements.
