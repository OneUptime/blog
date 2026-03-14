# How to Migrate Existing Workloads to Calico on Kind

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Migration, Kind, CNI

Description: A guide to migrating existing workloads from another CNI to Calico on a Kind cluster with minimal disruption.

---

## Introduction

Migrating a Kind cluster from one CNI to Calico requires careful planning because CNI changes in Kubernetes affect all running workloads. Unlike in-place CNI swaps which can be disruptive, the recommended approach for Kind is to create a new cluster with Calico and migrate workloads to it. This ensures clean networking state and avoids leftover iptables rules from the previous CNI.

The migration process involves exporting workload definitions from the existing cluster, creating a new Kind cluster with Calico, redeploying workloads, and validating that connectivity and network policies work as expected. Stateful workloads require additional attention to data migration.

This guide walks through migrating workloads from a Kind cluster using the default kindnet CNI to a new Kind cluster running Calico. The same principles apply when migrating from Flannel or Weave on Kind.

## Prerequisites

- Existing Kind cluster with workloads running
- Kind CLI, kubectl, and calicoctl installed
- Sufficient local resources to run two Kind clusters simultaneously (optional)

## Step 1: Export Existing Workload Definitions

Export all workloads from the current cluster:

```bash
kubectl get deploy,svc,configmap,secret,ingress --all-namespaces -o yaml > workloads-backup.yaml
```

Export NetworkPolicy resources if any exist:

```bash
kubectl get networkpolicy --all-namespaces -o yaml > network-policies-backup.yaml
```

## Step 2: Create a New Kind Cluster with Calico

```bash
cat <<EOF > kind-calico.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  disableDefaultCNI: true
  podSubnet: "192.168.0.0/16"
EOF

kind create cluster --config kind-calico.yaml --name calico-migration
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

## Step 3: Wait for Calico to Be Ready

```bash
kubectl wait --namespace kube-system \
  --for=condition=ready pod \
  --selector=k8s-app=calico-node \
  --timeout=120s
```

## Step 4: Deploy Workloads to the New Cluster

Apply your exported workloads:

```bash
kubectl apply -f workloads-backup.yaml
```

Review and apply network policies:

```bash
kubectl apply -f network-policies-backup.yaml
```

## Step 5: Validate Workload Functionality

Check that all pods are running and services are reachable:

```bash
kubectl get pods --all-namespaces
kubectl get svc --all-namespaces
```

Run connectivity tests between representative pods:

```bash
kubectl exec -n <namespace> <frontend-pod> -- wget -qO- http://<backend-svc>
```

## Step 6: Validate Network Policy Enforcement

Test that deny-by-default and allow rules are correctly enforced by Calico on the new cluster:

```bash
kubectl exec -n policy-test unauthorized-pod -- wget --timeout=5 http://backend-svc
```

## Step 7: Decommission the Old Cluster

Once validation is complete:

```bash
kind delete cluster --name old-cluster
```

## Conclusion

You have successfully migrated workloads from a non-Calico Kind cluster to a new Kind cluster running Calico. The blue-green cluster approach ensures clean networking state and zero conflict between CNI plugins, making it the safest method for CNI migration in Kind environments.
