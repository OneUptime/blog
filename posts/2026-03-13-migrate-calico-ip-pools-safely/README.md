# How to Migrate to Migrating Calico IP Pools Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Migration, Networking

Description: Safely migrate Calico workloads from deprecated IP pools to new pools using rolling pod restarts.

---

## Introduction

Calico IP pool migration is a key part of Calico's IP address management capabilities. To migrate safely, create the new pool first, disable the old pool so it stops receiving new allocations, then restart pods so their replacement pods receive addresses from the new pool.

## Prerequisites

- Calico v3.20+ installed
- kubectl and calicoctl configured
- Cluster-admin access

## Configuration

```bash
calicoctl get ippools -o yaml
calicoctl ipam show --show-blocks
calicoctl apply -f new-pool.yaml
calicoctl patch ippool old-pool -p '{"spec":{"disabled":true}}'
```

## Example

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: new-pool
spec:
  cidr: 10.48.0.0/16
  blockSize: 26
  natOutgoing: true
  disabled: false
```

After disabling the old pool, restart workloads gradually so new pods receive addresses from the new pool:

```bash
kubectl rollout restart deployment -n <namespace> <deployment-name>
```

## Verification

```bash
calicoctl ipam check -o ipam-report.json
calicoctl ipam show --show-blocks
kubectl get pods -A -o wide
```

## Architecture

```mermaid
graph LR
    POOL[IP Pool] --> ALLOC[IPAM Allocator]
    ALLOC --> POD[Pod IP]
```

## Conclusion

Migrating Calico IP pools safely depends on ordering: add the new pool, disable the old pool, restart workloads, verify new pod IPs, and only then delete the old pool. Use the configuration and verification steps above to ensure correct behavior in your environment.
