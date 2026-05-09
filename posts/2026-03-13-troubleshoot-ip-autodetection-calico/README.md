# How to Troubleshoot IP Autodetection in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, IP Autodetection, Networking

Description: Diagnose IP autodetection failures where Calico selects incorrect node IPs causing pod connectivity issues.

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
kubectl -n calico-system get pods -l k8s-app=calico-node -o wide
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
kubectl -n calico-system rollout status daemonset/calico-node
```

## Architecture

```mermaid
graph LR
    NODE[Kubernetes Node] --> DETECT[IP Autodetection]
    DETECT --> CALICONODE[Calico Node Address]
    CALICONODE --> ROUTING[Pod Routing]
```

## Conclusion

How to Troubleshoot IP Autodetection in Calico requires careful planning and validation. Use the steps above to ensure your configuration meets your cluster's node addressing requirements.
