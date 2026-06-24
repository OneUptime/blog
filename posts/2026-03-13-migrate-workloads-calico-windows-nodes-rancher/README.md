# How to Migrate Existing Workloads to Calico on Windows Nodes with Rancher

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Window, Rancher, Networking, CNI, Migration

Description: A guide to migrating Windows workloads to Calico networking in a Rancher-managed cluster.

---

## Introduction

Migrating Windows workloads to Calico in a Rancher-managed cluster involves Rancher in the coordination process. Rancher's cluster configuration controls which CNI is deployed, and Rancher does not support changing the network provider after the cluster has been launched. The supported migration path is to create a new Rancher-managed RKE2 cluster with Calico selected, then move the workloads to the new cluster.

For existing Rancher clusters not using Calico, plan this as a workload migration rather than an in-place CNI migration. RKE2 supports Calico and Flannel for Windows nodes, and Rancher can provision the replacement cluster with Calico selected.

## Prerequisites

- A Rancher-managed RKE2 source cluster with Windows nodes using a non-Calico CNI
- Capacity to create a replacement Rancher-managed RKE2 cluster with Calico selected
- Access to Rancher UI with cluster admin rights
- A maintenance window

## Step 1: Document Current Workload State

```bash
kubectl get all -A -o yaml > pre-migration-workloads.yaml
kubectl get networkpolicies -A -o yaml > pre-migration-policies.yaml
```

## Step 2: Create a Replacement Cluster with Calico in Rancher

For the new RKE2 cluster in Rancher:

1. Navigate to **Cluster Management** in Rancher UI
2. Create a new RKE2 cluster
3. Under **Container Network Provider**, select **Calico**
4. Add the required Linux and Windows node pools
5. Review the configuration and click **Create**

Rancher will begin the cluster provisioning process.

## Step 3: Monitor Cluster Provisioning

```bash
# Watch the cluster nodes

kubectl get nodes -w

# Watch Calico components
kubectl get pods -n calico-system -w
```

In Rancher UI, monitor the cluster status under **Cluster** > **Events**.

## Step 4: Apply Windows-Specific Configuration

After Calico is installed, configure the IP pool for Windows nodes. Calico for Windows does not support IP-in-IP encapsulation, so use VXLAN and enable strict IPAM affinity.

```bash
kubectl patch ippool default-ipv4-ippool \
  -p '{"spec":{"ipipMode":"Never","vxlanMode":"Always"}}'

kubectl patch ipamconfigurations default \
  --type merge \
  --patch='{"spec":{"strictAffinity":true}}'
```

## Step 5: Move Windows Workloads

After the new cluster is ready, deploy the Windows workloads to the Calico-backed cluster. If you need to force workloads to restart on a Windows node after applying the Calico settings, drain and uncordon that node during the maintenance window.

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

Migrating Windows workloads to Calico in Rancher-managed RKE2 clusters should be handled by creating a replacement Rancher-managed cluster with Calico selected, then moving workloads to the new cluster. Post-migration steps - IP pool configuration for Windows, workload redeployment, and network policy re-application - complete the migration to a correctly configured Calico networking environment for Windows pods.
