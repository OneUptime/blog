# How to Migrate Existing Workloads to Calico on OpenShift Hosted Control Planes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Hosted Control Planes, HyperShift, Kubernetes, Networking, Migration

Description: A guide to migrating workloads from OVN-Kubernetes to Calico on OpenShift Hosted Control Plane clusters.

---

## Introduction

Migrating an OpenShift Hosted Control Plane cluster from OVN-Kubernetes to Calico involves the same core steps as a standard OpenShift migration, but the isolation between the hosted cluster and the management cluster means you can perform the migration without affecting other hosted clusters on the same management infrastructure. This is one of HCP's key operational advantages - tenant clusters can be independently upgraded or reconfigured.

The migration affects only the worker nodes in the hosted cluster's data plane. The management cluster continues to run normally throughout, and sibling hosted clusters are completely unaffected. However, all workloads in the migrated hosted cluster will have their pod IPs changed during the migration.

This guide covers migrating workloads to Calico on an OpenShift Hosted Control Plane cluster.

## Prerequisites

- An OpenShift Hosted Control Plane cluster with OVN-Kubernetes
- `kubectl` configured with the hosted cluster kubeconfig
- A maintenance window for the hosted cluster

## Step 1: Backup Hosted Cluster Workload State

```bash
export KUBECONFIG=hosted-kubeconfig.yaml
kubectl get all -A -o yaml > pre-migration-workloads.yaml
kubectl get networkpolicies -A -o yaml > pre-migration-policies.yaml
```

## Step 2: Cordon All Worker Nodes

```bash
kubectl get nodes -o name | xargs kubectl cordon
```

## Step 3: Remove OVN-Kubernetes from the Hosted Cluster

```bash
kubectl delete -n openshift-ovn-kubernetes daemonset ovnkube-node
kubectl delete -n openshift-ovn-kubernetes daemonset ovs-node
```

## Step 4: Install Calico on the Hosted Cluster

```bash
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/tigera-operator.yaml
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/calico-scc.yaml

cat <<EOF | kubectl apply -f -
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  variant: Calico
  kubernetesProvider: OpenShift
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 10.132.0.0/14
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
EOF
```

## Step 5: Restart Workloads Node by Node

```bash
kubectl uncordon <worker-node-1>
kubectl delete pods -A --field-selector spec.nodeName=<worker-node-1>
```

Wait for pods to restart with Calico IPs, then proceed to the next node.

## Step 6: Verify and Apply Network Policies

```bash
kubectl get pods -A -o wide
kubectl get tigerastatus
kubectl apply -f pre-migration-policies.yaml
```

Test connectivity between key workloads and confirm external Routes are still working.

## Conclusion

Migrating workloads to Calico on an OpenShift Hosted Control Plane cluster is scoped entirely to the hosted cluster's data plane, making it an isolated operation that does not affect the management cluster or sibling hosted clusters. The migration follows the standard OpenShift CNI replacement workflow with the added step of targeting the hosted cluster's kubeconfig for all operations.
