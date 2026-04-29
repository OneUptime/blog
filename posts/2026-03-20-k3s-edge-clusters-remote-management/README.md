# How to Manage K3s Edge Clusters Remotely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Edge Computing, Remote Management, Rancher, Fleet, GitOps, SUSE Rancher

Description: Learn how to remotely manage K3s edge clusters using Rancher, Fleet GitOps, and secure tunneling to deploy workloads, apply configurations, and monitor cluster health from a central location.

---

Managing K3s clusters at the edge requires secure remote access, centralized configuration management, and automated deployment pipelines that work even over unreliable connections.

---

## Architecture

```text
┌─────────────────────────────────────┐
│         Central Rancher             │
│                                     │
│  ┌─────────┐   ┌──────────────┐    │
│  │ Rancher │   │ Fleet GitOps │    │
│  │   UI    │   │   Manager    │    │
│  └────┬────┘   └──────┬───────┘    │
│       │               │            │
└───────┼───────────────┼────────────┘
        │               │
   Secure Tunnel  Bundle Sync
        │               │
┌───────┼───────────────┼────────────┐
│       │   Edge Site   │            │
│  ┌────▼────┐   ┌──────▼───────┐   │
│  │ K3s     │   │ Fleet Agent  │   │
│  │ Cluster │   │              │   │
│  └─────────┘   └──────────────┘   │
└────────────────────────────────────┘
```

---

## Step 1: Register Edge K3s Clusters with Rancher

In Rancher, create an import command for the edge cluster:

```bash
# In Rancher UI: Cluster Management → Import Existing → Generic

# Run the generated command on the edge cluster

kubectl apply -f https://rancher.example.com/v3/import/<token>.yaml

# Verify the cluster becomes Active in Rancher
# Or, from the Rancher management cluster:
kubectl get clusters.management.cattle.io
```

---

## Step 2: Deploy Fleet Agent for GitOps

Imported downstream clusters are automatically registered with Fleet, and the Fleet agent is deployed on the downstream cluster:

```bash
# On the edge cluster, verify the Fleet agent is running
kubectl get pods -n cattle-fleet-system -l app=fleet-agent

# On the Rancher management cluster, verify the downstream cluster has checked in
kubectl get clusters.fleet.cattle.io -n fleet-default
```

---

## Step 3: Deploy Workloads via Fleet

```yaml
# gitrepo-edge.yaml (applied on the Rancher management cluster)
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: edge-apps
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/edge-manifests
  branch: main
  paths:
    - apps/

  # Target edge clusters by label
  targets:
    - name: edge-sites
      clusterSelector:
        matchLabels:
          cluster-type: edge
```

Fleet polls the Git repository from the management cluster and creates BundleDeployments for matching downstream clusters. If an edge cluster disconnects, the last applied workloads continue running, and pending changes are applied after the cluster reconnects.

---

## Step 4: Access Edge Cluster via kubectl through Rancher Proxy

```bash
# Download the edge cluster kubeconfig from Rancher
# Rancher UI → Cluster Management → ⋮ → Download KubeConfig

# Use kubectl with the downloaded kubeconfig
kubectl --kubeconfig /path/to/edge-cluster-kubeconfig get pods -A

# Or use the Rancher CLI after logging in and selecting a context
rancher context switch
rancher kubectl get pods -A
```

---

## Step 5: Set Up Automated Health Monitoring

```yaml
# Enable rancher-monitoring on the edge cluster first
# Rancher UI → Apps → Monitoring

# Then create alerting rules
# Rancher UI → Monitoring → Advanced → Prometheus Rules

# Example alert expression for a node that stays NotReady for 5 minutes
# alert: EdgeNodeNotReady
# expr: kube_node_status_condition{condition="Ready",status="true"} == 0
# for: 5m
# labels:
#   severity: critical
# annotations:
#   summary: "Edge node {{ $labels.node }} is not Ready"
```

---

## Step 6: Configure Automatic Reconnection

When installed via the official script, the K3s service is configured to restart automatically after node reboots or if the process crashes. If connectivity to Rancher is interrupted, cluster management resumes after the cluster reconnects.

```bash
# On a K3s agent node, confirm the service is running
sudo systemctl status k3s-agent

# View recent logs if the agent is reconnecting
sudo journalctl -u k3s-agent -n 50 --no-pager
```

---

## Step 7: Manage Edge Cluster Updates

```bash
# If version management is enabled for an imported K3s cluster,
# upgrade it from Rancher:
# Cluster Management → <cluster> → ⋮ → Edit Config → Kubernetes Version → Save

# If version management is disabled, Rancher removes the
# system-upgrade-controller resources and you must manage
# K3s upgrades independently.
```

---

## Step 8: Handle Configuration Drift

```bash
# Check Fleet status across all edge clusters
kubectl get gitrepos.fleet.cattle.io -n fleet-default
kubectl get bundles.fleet.cattle.io -A

# Force a redeploy by incrementing forceSyncGeneration
# Increase the integer each time you want to force a sync
kubectl patch gitrepos.fleet.cattle.io edge-apps -n fleet-default \
  --type merge \
  -p '{"spec":{"forceSyncGeneration":2}}'
```

---

## Best Practices

- Use Fleet for workload deployment to edge clusters - it centralizes desired state, and the last applied workloads keep running if a cluster temporarily disconnects.
- Label edge clusters consistently (`cluster-type: edge`, `region: store-42`) to enable precise Fleet targeting without hardcoding cluster names.
- Store Rancher-generated kubeconfigs in a secure vault, and enable an Authorized Cluster Endpoint (ACE) or retain the cluster's native K3s kubeconfig if you need direct access while Rancher is unavailable.
