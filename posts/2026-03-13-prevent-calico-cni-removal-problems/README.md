# How to Prevent Problems During Calico CNI Removal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting

Description: Best practices and procedural guidance for cleanly removing Calico CNI from a Kubernetes cluster without leaving orphaned resources or broken node state.

---

## Introduction

Preventing problems during Calico CNI removal requires following a structured decommission procedure rather than simply deleting Kubernetes resources. Calico has multiple layers of state that must be cleaned up in the correct order: IPAM allocations, CNI configuration, iptables rules, CRDs, and RBAC resources.

The most important preventive measure is to drain all workloads from the cluster before starting the Calico removal, or at minimum to understand that active workloads will lose network connectivity during the process. A planned maintenance window with a clear rollback path is essential for production clusters.

## Symptoms

- Calico removal attempted ad-hoc without procedure leads to stuck resources
- New CNI fails to initialize because Calico state was not fully cleaned
- Node reboots required to clear leftover iptables rules after removal

## Root Causes

- Calico DaemonSet deleted directly without using cleanup scripts
- No procedure for handling running workloads during CNI migration
- CRD cleanup skipped because it seemed optional

## Diagnosis Steps

```bash
# Pre-removal checklist: document what will be cleaned
kubectl get all -n kube-system | grep calico
kubectl get crd | grep calico
calicoctl get ippool
```

## Solution

**Preventive Procedure: Proper Calico removal steps**

```bash
#!/bin/bash
# calico-removal-procedure.sh

echo "=== Step 1: Drain workloads (optional but recommended) ==="
# For each node:
# kubectl drain <node> --ignore-daemonsets --delete-emptydir-data

echo "=== Step 2: Use calicoctl to clean IPAM ==="
# Clean up IP allocations
calicoctl ipam release --from-report=all 2>/dev/null || true
calicoctl ipam check --show-all-ips 2>/dev/null || true

echo "=== Step 3: Delete Calico components in order ==="
kubectl delete daemonset calico-node -n kube-system --ignore-not-found
kubectl delete deployment calico-kube-controllers -n kube-system --ignore-not-found
kubectl delete deployment calico-typha -n kube-system --ignore-not-found

echo "=== Step 4: Wait for Calico pods to terminate ==="
kubectl wait --for=delete pod -l k8s-app=calico-node -n kube-system --timeout=120s 2>/dev/null || true

echo "=== Step 5: Clean up RBAC and ConfigMap ==="
kubectl delete clusterrole calico-node calico-kube-controllers --ignore-not-found
kubectl delete clusterrolebinding calico-node calico-kube-controllers --ignore-not-found
kubectl delete serviceaccount calico-node calico-kube-controllers -n kube-system --ignore-not-found
kubectl delete configmap calico-config -n kube-system --ignore-not-found

echo "=== Step 6: Remove finalizers and delete CRDs ==="
# (Remove finalizers first as shown in Fix post)
kubectl get crd | grep calico | awk '{print $1}' | xargs kubectl delete crd --ignore-not-found

echo "=== Step 7: Clean node-level state ==="
for NODE in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  ssh $NODE "rm -f /etc/cni/net.d/10-calico.conflist /etc/cni/net.d/calico-kubeconfig"
done

echo "=== Step 8: Reboot nodes to clear iptables state (if not installing new CNI immediately) ==="
# kubectl drain <node> && ssh <node> reboot && kubectl uncordon <node>

echo "Calico removal procedure complete"
```

**Pre-removal checklist:**

```bash
# Verify no other CNI configs will conflict
ls /etc/cni/net.d/

# Document IP pools before removal
calicoctl get ippool -o yaml > calico-ippools-backup-$(date +%Y%m%d).yaml

# Note current cluster CIDR for new CNI configuration
kubectl get configmap kubeadm-config -n kube-system -o yaml | grep podSubnet
```

```mermaid
flowchart LR
    A[Plan removal] --> B[Schedule maintenance window]
    B --> C[Drain workloads or plan downtime]
    C --> D[Run calicoctl IPAM cleanup]
    D --> E[Delete Calico DaemonSet and Deployments]
    E --> F[Remove RBAC resources]
    F --> G[Delete CRDs with finalizer cleanup]
    G --> H[Clean node-level files]
    H --> I[Reboot nodes or install new CNI]
```

## Prevention

- Store the removal procedure script in your cluster runbook
- Test the procedure in a non-production cluster before production removal
- Plan for a node reboot to ensure iptables state is completely clean

## Conclusion

Preventing Calico removal problems requires following a structured procedure that cleans up components in the correct order: IPAM allocations, DaemonSet, RBAC, CRDs with finalizer cleanup, CNI config files, and node-level iptables state. An ad-hoc deletion approach reliably leaves orphaned state that complicates new CNI installation.
