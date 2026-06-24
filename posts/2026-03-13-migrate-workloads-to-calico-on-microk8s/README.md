# How to Migrate Existing Workloads to Calico on MicroK8s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Migration, MicroK8s, CNI

Description: A guide to migrating workloads on MicroK8s from the default networking to Calico for full network policy support.

---

## Introduction

MicroK8s uses Calico as its default CNI in current releases, but older or custom installations may still be using Flannel or another CNI configuration. Migrating to Calico on MicroK8s enables network policy enforcement and the full Calico feature set. Since changing the CNI requires a cluster restart, careful planning and workload backup are essential.

The migration process for MicroK8s is somewhat more straightforward than other distributions because MicroK8s ships the Calico manifest used for its default CNI. However, you must still account for workload downtime during the CNI switch and validate all workloads post-migration.

This guide covers migrating a MicroK8s cluster from an older or custom CNI to Calico, including workload export, CNI switch, redeployment, and validation.

## Prerequisites

- MicroK8s cluster using an older or custom non-Calico CNI
- sudo access on the MicroK8s host
- Backup storage for workload definitions and access to the original workload manifests

## Step 1: Export Current Workloads

```bash
microk8s kubectl get all --all-namespaces -o yaml > microk8s-workloads.yaml
microk8s kubectl get configmap --all-namespaces -o yaml > microk8s-configmaps.yaml
microk8s kubectl get secret --all-namespaces -o yaml > microk8s-secrets.yaml
```

Treat these exports as a backup reference. For redeployment, use your original manifests or remove generated fields such as `uid`, `resourceVersion`, `managedFields`, and `status` before applying exported YAML.

## Step 2: Note Current Pod IPs and Service IPs

```bash
microk8s kubectl get pods --all-namespaces -o wide
microk8s kubectl get svc --all-namespaces
```

After migration, pod IPs will change. Ensure workloads use DNS service names, not hardcoded IPs.

## Step 3: Stop All Workloads (Optional but Recommended)

```bash
microk8s kubectl get deployments --all-namespaces
microk8s kubectl scale deployment --all --replicas=0 --all-namespaces
```

Record the original replica counts before scaling down so you can restore them accurately after the migration.

## Step 4: Install the MicroK8s Calico Manifest

```bash
sudo cp /snap/microk8s/current/upgrade-scripts/000-switch-to-calico/resources/calico.yaml \
  /var/snap/microk8s/current/args/cni-network/cni.yaml
microk8s kubectl apply -f /var/snap/microk8s/current/args/cni-network/cni.yaml
sudo snap restart microk8s
```

Wait for Calico to fully initialize:

```bash
microk8s status --wait-ready
microk8s kubectl wait --namespace kube-system \
  --for=condition=ready pod \
  --selector=k8s-app=calico-node \
  --timeout=180s
```

## Step 5: Restart Workloads

```bash
microk8s kubectl scale deployment/<deployment-name> --replicas=<original-count> -n <namespace>
```

Or redeploy from your original manifests. If you need to use the exported backups, clean generated metadata first:

```bash
microk8s kubectl apply -f microk8s-configmaps.yaml
microk8s kubectl apply -f microk8s-secrets.yaml
microk8s kubectl apply -f microk8s-workloads.yaml
```

## Step 6: Validate Workload Health

```bash
microk8s kubectl get pods --all-namespaces
microk8s kubectl get svc --all-namespaces
```

## Step 7: Apply and Test Network Policies

```bash
microk8s kubectl apply -f network-policies.yaml
```

Verify that policies are enforced:

```bash
microk8s kubectl exec -n <ns> <pod> -- wget --timeout=5 http://restricted-service
```

## Step 8: Verify Calico IPAM

```bash
microk8s kubectl get ippools.crd.projectcalico.org
microk8s kubectl get blockaffinities.crd.projectcalico.org
```

If you have `calicoctl` installed and configured for the cluster, you can also run:

```bash
calicoctl ipam show
calicoctl ipam show --show-blocks
```

## Conclusion

You have migrated MicroK8s workloads to Calico by exporting resources, applying the MicroK8s Calico manifest, redeploying workloads, and validating networking and policy enforcement. MicroK8s with Calico provides a robust local and edge platform with full network policy support.
