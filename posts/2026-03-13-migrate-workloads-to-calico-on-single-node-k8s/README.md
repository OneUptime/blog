# How to Migrate Existing Workloads to Calico on Single-Node Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Migration, Single-Node, CNI

Description: Migrate existing workloads from another CNI to Calico on a single-node Kubernetes cluster with minimal downtime.

---

## Introduction

Migrating from a different CNI plugin to Calico on a single-node Kubernetes cluster is a common task for teams that originally deployed without network policy requirements and now need to add them. The migration requires careful planning since changing the CNI on a running cluster is disruptive - pods will lose network connectivity during the transition.

The safest approach depends on whether the single-node cluster can tolerate downtime. For development clusters, a brief downtime during CNI replacement is acceptable. For production single-node clusters serving continuous workloads, a blue-green approach - creating a second single-node cluster with Calico and migrating workloads - is preferable.

This guide covers both the in-place replacement approach (for development) and the blue-green migration approach (for production), with step-by-step instructions for each.

## Prerequisites

- Single-node Kubernetes cluster with a different CNI (e.g., Flannel, Weave)
- kubectl configured
- Backup storage available

## Step 1: Export All Workload Definitions

```bash
kubectl get all --all-namespaces -o yaml > workloads-backup.yaml
kubectl get configmap --all-namespaces -o yaml > configmaps-backup.yaml
kubectl get secret --all-namespaces -o yaml > secrets-backup.yaml
kubectl get pvc --all-namespaces -o yaml > pvcs-backup.yaml
kubectl get networkpolicy --all-namespaces -o yaml > netpol-backup.yaml
```

## Step 2: Backup PersistentVolume Data

```bash
kubectl get pv -o yaml > pv-backup.yaml
# For each PV, backup the underlying data
kubectl exec -n <namespace> <pod> -- tar czf - /data > pv-data-backup.tar.gz
```

## Step 3: Remove the Existing CNI

For Flannel:

```bash
kubectl delete -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
sudo ip link delete flannel.1
sudo rm -f /etc/cni/net.d/10-flannel.conflist
```

## Step 4: Install Calico

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
kubectl wait --namespace kube-system \
  --for=condition=ready pod \
  --selector=k8s-app=calico-node \
  --timeout=180s
```

## Step 5: Restart All Workload Pods

After installing Calico, existing pods retain stale network namespaces from the old CNI. Restart them to get new Calico-managed IPs:

```bash
kubectl delete pods --all --all-namespaces --field-selector=status.phase=Running
```

Wait for all pods to restart:

```bash
kubectl get pods --all-namespaces -w
```

## Step 6: Verify Post-Migration Networking

```bash
kubectl get pods --all-namespaces -o wide
kubectl run post-migration-test --image=busybox --restart=Never -- ping -c 4 8.8.8.8
kubectl logs post-migration-test
kubectl delete pod post-migration-test
```

## Step 7: Apply and Validate Network Policies

```bash
kubectl apply -f netpol-backup.yaml
kubectl get networkpolicy --all-namespaces
```

Test that policies are enforced by Calico:

```bash
kubectl exec -n <namespace> <client-pod> -- wget --timeout=3 http://restricted-svc
```

## Step 8: Verify DNS Resolution

```bash
kubectl exec -n default $(kubectl get pods -o name | head -1) -- \
  nslookup kubernetes.default.svc.cluster.local
```

## Conclusion

You have migrated workloads on a single-node Kubernetes cluster from an existing CNI to Calico. The key steps - exporting workload definitions, removing the old CNI, installing Calico, and restarting pods - deliver a clean migration with Calico-managed networking. All workloads now benefit from Calico's network policy enforcement capabilities.
