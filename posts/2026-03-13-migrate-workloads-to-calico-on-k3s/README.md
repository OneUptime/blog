# How to Migrate Existing Workloads to Calico on K3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Migration, K3s, CNI

Description: Migrate existing K3s workloads from Flannel to Calico for network policy enforcement without permanent data loss.

---

## Introduction

Migrating from Flannel to Calico on K3s requires cluster recreation because K3s does not support in-place CNI replacement. The migration must be planned carefully for production edge environments where workload downtime may have significant operational impact. The key is to export all workload state before the migration and validate everything after redeployment.

Edge workloads on K3s may include IoT data collectors, local inference engines, and data aggregators. These workloads often maintain local state that needs to be preserved across the migration. Understanding the stateful components and planning their migration separately from stateless workloads is essential.

This guide provides a comprehensive migration plan for moving K3s workloads from Flannel to Calico, including a state export phase, cluster recreation, redeployment, and validation.

## Prerequisites

- K3s cluster with Flannel and running workloads
- Storage for workload backups
- Maintenance window planned

## Step 1: Inventory All Workloads

```bash
kubectl get all --all-namespaces -o yaml > all-workloads.yaml
kubectl get configmap --all-namespaces -o yaml > configmaps.yaml
kubectl get secret --all-namespaces -o yaml > secrets.yaml
kubectl get pvc --all-namespaces -o yaml > pvcs.yaml
kubectl get ingress --all-namespaces -o yaml > ingresses.yaml
```

## Step 2: Backup Stateful Data

For each stateful workload, backup persistent data:

```bash
kubectl exec -n <namespace> <pod> -- tar czf - /data > workload-data-backup.tar.gz
```

## Step 3: Scale Down Workloads

```bash
kubectl scale deployment --all --replicas=0 --all-namespaces
kubectl scale statefulset --all --replicas=0 --all-namespaces
```

## Step 4: Uninstall K3s

```bash
sudo /usr/local/bin/k3s-uninstall.sh
```

## Step 5: Reinstall K3s with Calico Support

```bash
curl -sfL https://get.k3s.io | sh -s - \
  --flannel-backend=none \
  --disable-network-policy \
  --cluster-cidr=192.168.0.0/16

mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER ~/.kube/config
```

## Step 6: Install Calico

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
kubectl wait --namespace kube-system \
  --for=condition=ready pod \
  --selector=k8s-app=calico-node \
  --timeout=120s
```

## Step 7: Redeploy Workloads

```bash
kubectl apply -f configmaps.yaml
kubectl apply -f secrets.yaml
kubectl apply -f all-workloads.yaml
kubectl apply -f ingresses.yaml
```

## Step 8: Restore Stateful Data

```bash
kubectl exec -n <namespace> <new-pod> -- tar xzf - /data < workload-data-backup.tar.gz
```

## Step 9: Validate

```bash
kubectl get pods --all-namespaces
kubectl get svc --all-namespaces
```

Test application endpoints and verify that network policies are now enforced by Calico.

## Conclusion

You have migrated K3s workloads from Flannel to Calico by exporting all resources and state, reinstalling K3s with Flannel disabled, deploying Calico, and redeploying workloads. Your K3s cluster now has full Calico network policy enforcement with all previous workloads successfully migrated.
