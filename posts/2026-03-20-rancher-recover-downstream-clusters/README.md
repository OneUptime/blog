# How to Recover Downstream Clusters After Rancher Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Disaster-recovery, Downstream-clusters, Kubernetes, Recovery

Description: Guide to recovering and reconnecting downstream Kubernetes clusters after a Rancher management server failure.

## Introduction

When Rancher fails, downstream clusters continue running their workloads independently. However, you lose the management plane-the ability to deploy, configure, and monitor through Rancher. This guide explains how to reconnect and recover downstream clusters after Rancher is restored.

## What Happens to Downstream Clusters During Rancher Failure

- Existing workloads continue running (pods, services, deployments)
- Persistent volumes remain attached and functional
- DNS and load balancers continue working
- Kubernetes API server remains reachable if you already have direct kubeconfig, an authorized cluster endpoint, or provider-native access
- Rancher agents lose connection but don't crash workloads
- Fleet-managed workloads stay at their last applied state until Rancher/Fleet reconnects

## Step 1: Access Clusters Directly During Rancher Downtime

```bash
# If you have a direct kubeconfig, an authorized cluster endpoint (ACE)
# context, or provider-native kubeconfig, use it to manage the cluster.
# A Rancher-proxied kubeconfig will not work while Rancher is unavailable.

export KUBECONFIG=/path/to/direct-cluster-kubeconfig.yaml

# Verify direct access
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Emergency operations can be performed directly
kubectl scale deployment my-app --replicas=0 -n production
```

## Step 2: Verify Cluster State After Rancher Restore

After restoring Rancher, check cluster reconnection status:

```bash
# Check which clusters have reconnected
kubectl get clusters.management.cattle.io

# Detailed status for a specific cluster
kubectl describe clusters.management.cattle.io my-cluster-name
```

## Step 3: Force Agent Reconnection

If a downstream cluster does not automatically reconnect:

```bash
# On the downstream cluster, restart the Rancher agent
kubectl rollout restart deployment cattle-cluster-agent \
  -n cattle-system

# Check agent logs
kubectl logs -n cattle-system \
  -l app=cattle-cluster-agent \
  --tail=50
```

## Step 4: Reapply the Existing Cluster Registration Manifest

For clusters that fail to automatically reconnect:

```bash
# Reapply the existing registration manifest for this cluster ID
sh -c "$(curl -s \
  -H "Authorization: Bearer your-api-token" \
  "https://rancher.example.com/v3/clusterregistrationtokens?clusterId=c-xxxxx" \
  | jq -r '.data[0].command')"

# If Rancher uses a private CA or self-signed certificate, use insecureCommand instead
sh -c "$(curl -s \
  -H "Authorization: Bearer your-api-token" \
  "https://rancher.example.com/v3/clusterregistrationtokens?clusterId=c-xxxxx" \
  | jq -r '.data[0].insecureCommand')"
```

## Step 5: Preserve the Rancher Server URL

If Rancher moved behind a new IP or load balancer, keep the same Rancher Server URL hostname. Rancher does not support changing the server URL after it is set.

```bash
# Update DNS or the load balancer so the original Rancher hostname
# resolves to the restored Rancher server.

# Then restart the downstream cluster agent so it reconnects
kubectl rollout restart deployment cattle-cluster-agent -n cattle-system
```

## Step 6: Handle Certificate Changes

If Rancher's TLS certificate changed after recovery:

```bash
# From the Rancher management cluster, force Rancher to redeploy
# the agent manifest with the updated certificate settings
kubectl annotate clusters.management.cattle.io c-xxxxx \
  io.cattle.agent.force.deploy=true

# If the certificate change left a cluster disconnected, use the
# registration-manifest reapply flow from Step 4.
```

## Step 7: Verify Full Functionality

```bash
#!/bin/bash
# verify-cluster-reconnection.sh

CLUSTER_NAME="$1"
MGMT_KUBECONFIG="/path/to/rancher-local-kubeconfig.yaml"
DIRECT_KUBECONFIG="/path/to/${CLUSTER_NAME}-kubeconfig.yaml"

echo "=== Verifying cluster: $CLUSTER_NAME ==="

# Check cluster status in Rancher
kubectl --kubeconfig="$MGMT_KUBECONFIG" \
  get clusters.management.cattle.io "$CLUSTER_NAME"

kubectl --kubeconfig="$MGMT_KUBECONFIG" \
  describe clusters.management.cattle.io "$CLUSTER_NAME"

# Check agent pods on downstream cluster
kubectl --kubeconfig="$DIRECT_KUBECONFIG" get pods -n cattle-system
kubectl --kubeconfig="$DIRECT_KUBECONFIG" get pods -n cattle-fleet-system 2>/dev/null || true

echo "Verification complete"
```

## Step 8: Recover Fleet GitOps State

After Rancher recovery, Fleet should resume GitOps operations once the fleet-agent reconnects to the upstream controller:

```bash
# Check Fleet agent status on downstream cluster
kubectl get pods -n cattle-fleet-system

# If Fleet agent is stuck, restart it
kubectl rollout restart deployment fleet-agent \
  -n cattle-fleet-system

# Check GitRepo sync status from the Rancher management cluster
kubectl --kubeconfig=/path/to/rancher-local-kubeconfig.yaml get gitrepos.fleet.cattle.io -A

# If a Rancher certificate change prevents the fleet-agent from reconnecting,
# use Continuous Delivery > Clusters > Force Update in the Rancher UI.
```

## Conclusion

Downstream clusters are resilient to Rancher management server failures-workloads keep running. Recovery focuses on re-establishing the management connection between Rancher and each downstream cluster. Most clusters reconnect automatically after Rancher is restored. For those that don't, reapplying the existing cluster registration manifest is a reliable fallback.
