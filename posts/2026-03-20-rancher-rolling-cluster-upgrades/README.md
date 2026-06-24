# How to Perform Rolling Cluster Upgrades in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Upgrade, Operation, RKE2

Description: Perform safe rolling Kubernetes version upgrades on Rancher-managed clusters with zero downtime using RKE2 and Rancher's built-in upgrade management.

## Introduction

Keeping Kubernetes clusters up to date is critical for security patches, feature access, and support. Rancher provides guided cluster upgrade workflows for RKE2 and K3s clusters, with the ability to control the upgrade pace (one node at a time) and monitor progress. This guide focuses on Rancher-provisioned RKE2 clusters with embedded etcd and covers how to plan and execute rolling cluster upgrades safely.

## Pre-Upgrade Checklist

Before upgrading, verify:

```bash
# 1. Check current cluster and node versions

kubectl get nodes -o wide
kubectl version

# 2. Check available upgrade versions in Rancher
# Rancher UI: Cluster → Edit Config → Kubernetes Version dropdown

# 3. Verify etcd health (for RKE2 clusters)
sudo /var/lib/rancher/rke2/bin/etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/rke2/server/tls/etcd/server-client.crt \
  --key=/var/lib/rancher/rke2/server/tls/etcd/server-client.key \
  endpoint health

# 4. Verify all nodes are Ready
kubectl get nodes

# 5. Check for any PodDisruptionBudgets that could block drain
kubectl get pdb -A

# 6. Verify workload replicas (ensure > 1 for critical services)
kubectl get deployments -A -o json \
  | jq '.items[] | select(.spec.replicas < 2) | "\(.metadata.namespace)/\(.metadata.name)"'
```

## Step 1: Take an etcd Snapshot Before Upgrading

```bash
# Create a manual snapshot before the upgrade
# In Rancher UI: Cluster Management → <cluster> → Snapshots → Snapshot Now

# Or on an RKE2 server / etcd node:
sudo rke2 etcd-snapshot save --name pre-upgrade-snapshot

# Verify snapshot was created
sudo rke2 etcd-snapshot ls | grep pre-upgrade-snapshot
```

## Step 2: Initiate the Upgrade via Rancher UI

1. Navigate to **Cluster Management** → select the cluster.
2. Click **⋮ → Edit Config**.
3. Under **Kubernetes Version**, select the target version.
4. Under **Upgrade Strategy**, configure:
   - **Worker Concurrency**: `1` (safest)
   - **Control Plane Concurrency**: `1`
   - **Drain Nodes (Control Plane)**: Yes
   - **Drain Nodes (Worker Nodes)**: Yes
5. Click **Save**.

Rancher will begin the upgrade process automatically.

## Step 3: Initiate the Upgrade via Rancher Kubernetes API

```bash
# Use a kubeconfig configured for the Rancher Kubernetes API.
# If needed, discover the namespace first:
# kubectl get clusters.provisioning.cattle.io -A

CLUSTER_NAMESPACE=fleet-default
CLUSTER_NAME=my-cluster

kubectl patch clusters.provisioning.cattle.io "${CLUSTER_NAME}" \
  -n "${CLUSTER_NAMESPACE}" \
  --type merge \
  -p '{
    "spec": {
      "kubernetesVersion": "v1.29.0+rke2r1",
      "rkeConfig": {
        "upgradeStrategy": {
          "controlPlaneConcurrency": "1",
          "controlPlaneDrainOptions": {
            "deleteEmptyDirData": true,
            "enabled": true,
            "gracePeriod": -1,
            "ignoreDaemonSets": true,
            "timeout": 120
          },
          "workerConcurrency": "1",
          "workerDrainOptions": {
            "deleteEmptyDirData": true,
            "enabled": true,
            "gracePeriod": -1,
            "ignoreDaemonSets": true,
            "timeout": 120
          }
        }
      }
    }
  }'
```

## Step 4: Monitor the Upgrade Progress

```bash
# Watch node versions change during the rolling upgrade
watch -n 5 'kubectl get nodes -o custom-columns=NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion'

# On the management cluster, inspect Rancher provisioning resources
kubectl get clusters.provisioning.cattle.io -A
kubectl get rkecontrolplanes.rke.cattle.io -A
kubectl describe rkecontrolplanes.rke.cattle.io -n <namespace> <cluster-name>

# Check specific node machine status
kubectl get machines.cluster.x-k8s.io -A
kubectl describe machines.cluster.x-k8s.io -n <namespace> <machine-name>

# Watch recent provisioning events
kubectl get events -A --sort-by=.metadata.creationTimestamp | tail -n 50
```

## Step 5: Understand the Upgrade Order

For Rancher-provisioned RKE2 clusters, upgrades follow the role-based concurrency you configured:

1. In the common RKE2 layout, server nodes carry both etcd and control-plane roles, and are upgraded one at a time when **Control Plane Concurrency** is `1`.
2. **Worker nodes** are upgraded after the server-side nodes, using the configured **Worker Concurrency**.

Each node is:
1. Cordoned (no new pods scheduled).
2. Drained (existing pods evicted gracefully).
3. Upgraded (RKE2 binary replaced, service restarted).
4. Uncordoned (returns to the scheduling pool).

## Step 6: Handle Stuck Upgrades

```bash
# If a node gets stuck in Upgrading state:
kubectl get clusters.provisioning.cattle.io -A
kubectl get machines.cluster.x-k8s.io -A

# Check the cluster and machine status for errors
kubectl describe clusters.provisioning.cattle.io -n <namespace> <cluster-name>
kubectl describe machines.cluster.x-k8s.io -n <namespace> <stuck-machine>

# Common issues:
# - PodDisruptionBudget blocking drain → if the PDB uses minAvailable,
#   temporarily lower it
kubectl patch pdb <pdb-name> -n <namespace> \
  --type='json' \
  -p='[{"op":"replace","path":"/spec/minAvailable","value":0}]'

# - Node drain timeout → increase the timeout
# Edit the cluster via Rancher UI:
# Cluster Management → <cluster> → Edit Config → Upgrade Strategy

# - Node did not return Ready after restart → inspect node service logs
sudo journalctl -u rke2-server -u rke2-agent -xe
```

## Step 7: Post-Upgrade Verification

```bash
# Verify all nodes are on the new version
kubectl get nodes -o custom-columns="NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion"

# Verify all system pods are running
kubectl get pods -n kube-system -o wide
kubectl get pods -n cattle-system -o wide

# Run a quick sanity check deployment
kubectl create deployment upgrade-test --image=nginx:stable --replicas=3
kubectl rollout status deployment/upgrade-test
kubectl delete deployment upgrade-test

# Verify etcd health after upgrade
sudo /var/lib/rancher/rke2/bin/etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/rke2/server/tls/etcd/server-client.crt \
  --key=/var/lib/rancher/rke2/server/tls/etcd/server-client.key \
  endpoint health
```

## Conclusion

Rolling cluster upgrades in Rancher are designed to minimize downtime and risk. By taking a pre-upgrade snapshot, configuring a conservative upgrade strategy (one node at a time with draining), and monitoring progress through both Rancher UI and kubectl, you can safely keep your Rancher-provisioned RKE2 clusters current. Always upgrade in the pattern: dev → staging → production, and verify each environment before proceeding to the next.
