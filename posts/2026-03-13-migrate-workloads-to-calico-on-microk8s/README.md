# How to Migrate Existing Workloads to Calico on MicroK8s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Migration, MicroK8s, CNI

Description: A guide to migrating workloads on MicroK8s from the default networking to Calico for full network policy support.

---

## Introduction

MicroK8s uses Calico as its preferred CNI, but some installations may have been set up without enabling the Calico add-on, using instead the default `cni` configuration. Migrating to Calico on MicroK8s enables network policy enforcement and the full Calico feature set. Since changing the CNI requires a cluster restart, careful planning and workload backup are essential.

The migration process for MicroK8s is somewhat more straightforward than other distributions because the Calico add-on automates much of the CNI replacement. However, you must still account for workload downtime during the CNI switch and validate all workloads post-migration.

This guide covers migrating a MicroK8s cluster from the default networking to Calico, including workload export, CNI switch, redeployment, and validation.

## Prerequisites

- MicroK8s cluster without Calico currently enabled
- sudo access on the MicroK8s host
- Backup storage for workload definitions

## Step 1: Export Current Workloads

```bash
microk8s kubectl get all --all-namespaces -o yaml > microk8s-workloads.yaml
microk8s kubectl get configmap --all-namespaces -o yaml > microk8s-configmaps.yaml
microk8s kubectl get secret --all-namespaces -o yaml > microk8s-secrets.yaml
```

## Step 2: Note Current Pod IPs and Service IPs

```bash
microk8s kubectl get pods --all-namespaces -o wide
microk8s kubectl get svc --all-namespaces
```

After migration, pod IPs will change. Ensure workloads use DNS service names, not hardcoded IPs.

## Step 3: Stop All Workloads (Optional but Recommended)

```bash
microk8s kubectl scale deployment --all --replicas=0 --all-namespaces
```

## Step 4: Disable Any Existing CNI and Enable Calico

```bash
microk8s disable flannel 2>/dev/null || true
microk8s enable calico
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
microk8s kubectl scale deployment --all --replicas=1 --all-namespaces
```

Or redeploy from backup:

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
calicoctl ipam show
calicoctl ipam show --show-blocks
```

## Conclusion

You have migrated MicroK8s workloads to Calico by exporting resources, enabling the Calico add-on, redeploying workloads, and validating networking and policy enforcement. MicroK8s with Calico provides a robust local and edge platform with full network policy support.
