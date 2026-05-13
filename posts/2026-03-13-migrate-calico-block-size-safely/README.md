# How to Migrate to Changing Calico Block Size Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Block Size, Networking

Description: Safely change Calico IPAM block size in a running cluster without causing pod scheduling failures.

---

## Introduction

Calico Block Size Management is a critical configuration aspect of Calico networking. Because an IPPool's `blockSize` can only be set when the pool is created, this guide provides step-by-step instructions for managing this feature effectively in production Kubernetes clusters.

## Prerequisites

- Calico v3.20+ installed
- kubectl and calicoctl configured
- Cluster-admin access

## Steps

```bash
# Check current state

calicoctl get ippool -o yaml
calicoctl ipam show --show-blocks
kubectl get pods -A -o wide | head -10
```

Create a temporary non-overlapping pool, then disable the existing pool so new pods stop receiving addresses from it.

```bash
calicoctl apply -f temporary-pool.yaml
calicoctl patch ippool default-ipv4-ippool -p '{"spec": {"disabled": true}}'
kubectl delete pod -A --all
```

After verifying that pods are running from the temporary pool, delete and recreate the original pool with the new block size.

```bash
calicoctl delete ippool default-ipv4-ippool
calicoctl apply -f pool.yaml
calicoctl patch ippool temporary-pool -p '{"spec": {"disabled": true}}'
kubectl delete pod -A --all
calicoctl delete ippool temporary-pool
```

## Configuration

Create `temporary-pool.yaml` with a CIDR that does not overlap the existing pool.

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: temporary-pool
spec:
  cidr: 10.49.0.0/16
  ipipMode: Never
  natOutgoing: true
```

Create `pool.yaml` with the original CIDR and the new block size.

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.48.0.0/16
  blockSize: 28
  ipipMode: Never
  natOutgoing: true
```

## Verify

```bash
# Validate changes
calicoctl ipam check
kubectl get pods -A -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,IP:.status.podIP,NODE:.spec.nodeName
calicoctl ipam show --show-blocks
```

## Architecture

```mermaid
graph LR
    POOL[IP Pool] --> BLOCK[Block Allocation]
    BLOCK --> POD[Pod IP Assignment]
```

## Conclusion

How to Migrate to Changing Calico Block Size Safely in Calico requires careful planning and validation. Use the steps above to ensure your configuration meets your cluster's IP addressing requirements.
