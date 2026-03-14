# How to Migrate Existing Workloads to Calico on Windows Nodes with Rancher

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Rancher, Networking, CNI, Migration

Description: A guide to migrating Windows workloads to Calico networking in a Rancher-managed cluster.

---

## Introduction

Migrating Windows workloads to Calico in a Rancher-managed cluster involves Rancher in the coordination process. Rancher's cluster configuration controls which CNI is deployed, and changing the CNI requires either creating a new Rancher cluster with Calico selected or modifying an existing cluster's CNI settings through Rancher's edit cluster workflow.

For existing Rancher clusters not using Calico, the migration path depends on whether Rancher supports in-place CNI migration for the cluster provisioner being used. RKE2-based clusters support changing the CNI provider, which Rancher can manage through its UI. This makes Rancher-managed migration cleaner than unmanaged cluster migration.

## Prerequisites

- A Rancher-managed RKE2 cluster with Windows nodes using a non-Calico CNI
- Access to Rancher UI with cluster admin rights
- A maintenance window

## Step 1: Document Current Workload State

```bash
kubectl get all -A -o yaml > pre-migration-workloads.yaml
kubectl get networkpolicies -A -o yaml > pre-migration-policies.yaml
```

## Step 2: Edit Cluster CNI in Rancher

For RKE2 clusters in Rancher:

1. Navigate to the cluster in Rancher UI
2. Click **Edit Config**
3. Under **Network Provider**, change from the current CNI to **Calico**
4. Review the configuration and click **Save**

Rancher will begin the cluster update process.

## Step 3: Monitor Cluster Update

```bash
# Watch the cluster nodes
kubectl get nodes -w

# Watch Calico components
kubectl get pods -n calico-system -w
```

In Rancher UI, monitor the cluster status under **Cluster** > **Events**.

## Step 4: Apply SCC/Windows-Specific Configuration

After the cluster update, configure Calico for Windows nodes.

```bash
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"encapsulation":"VXLAN"}}'
```

## Step 5: Restart Windows Workloads

After Calico is installed, Windows pods must be restarted to receive Calico-assigned IPs.

```bash
# For each Windows node
kubectl drain <windows-node> --ignore-daemonsets --delete-emptydir-data
kubectl uncordon <windows-node>
```

## Step 6: Verify and Apply Network Policies

```bash
kubectl get pods -A -o wide | grep <windows-node>
calicoctl ipam show
kubectl apply -f pre-migration-policies.yaml
```

Test cross-OS connectivity:

```bash
kubectl run linux-test --image=busybox -- sleep 60
WIN_IP=$(kubectl get pod <windows-pod> -o jsonpath='{.status.podIP}')
kubectl exec linux-test -- ping -c3 $WIN_IP
```

## Conclusion

Migrating Windows workloads to Calico in Rancher-managed RKE2 clusters can be initiated through Rancher's cluster edit UI, which handles the CNI change and cluster update orchestration. Post-migration steps — IP pool configuration for Windows, Windows node drain/uncordon, and network policy re-application — complete the migration to a correctly configured Calico networking environment for Windows pods.
