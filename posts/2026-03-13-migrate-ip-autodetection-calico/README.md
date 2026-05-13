# How to Migrate to IP Autodetection in Calico Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, IP Autodetection, Networking

Description: Safely change Calico IP autodetection methods in a running cluster to accommodate network interface changes.

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

calicoctl get ippools -o yaml
calicoctl ipam show --show-blocks
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
calicoctl ipam check
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.addresses[?(@.type=="InternalIP")].address}{"\n"}{end}'
```

## Architecture

```mermaid
graph LR
    NODE[Kubernetes Node] --> METHOD[Autodetection Method]
    METHOD --> ADDRESS[Calico Node Address]
    ADDRESS --> ROUTING[Internode Routing]
```

## Conclusion

How to Migrate to IP Autodetection in Calico Safely in Calico requires careful planning and validation. Use the steps above to ensure your configuration meets your cluster's IP addressing requirements.
