# How to Implement Cluster Federation with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Cluster Federation, Multi-Cluster, Kubernetes, Fleet, Submariner, High Availability

Description: Learn how to implement cluster federation in Rancher to synchronize workloads, policies, and namespaces across multiple Kubernetes clusters for high availability and geographic distribution.

---

Rancher-based multi-cluster "federation" is usually assembled from tools such as Fleet, Rancher Projects and RoleTemplates, and Submariner so you can distribute workloads, standardize governance, and enable cross-cluster service connectivity.

---

## Federation Approaches in Rancher

Rancher is typically used with several multi-cluster patterns:

| Approach | Tool | Best For |
|---|---|---|
| GitOps-based federation | Rancher Fleet | Config and app distribution |
| Cross-cluster networking | Submariner | Pod/service communication |
| Governance consistency | Rancher Projects and RoleTemplates | Per-cluster quotas and RBAC standards |

---

## Approach 1: Rancher Fleet for Config Federation

Deploy the same application configuration to multiple clusters using a single `GitRepo`. Use the `GitRepo` to select target clusters, and put per-cluster Helm overrides in the repo's `fleet.yaml`:

```yaml
# gitrepo-federated.yaml

apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: federated-apps
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/k8s-configs.git
  branch: main
  paths:
    - apps/
  targets:
    - name: all-production
      clusterSelector:
        matchLabels:
          env: production

---

# apps/fleet.yaml
targetCustomizations:
  - name: us-east
    clusterSelector:
      matchLabels:
        region: us-east
    helm:
      values:
        region: us-east

  - name: eu-west
    clusterSelector:
      matchLabels:
        region: eu-west
    helm:
      values:
        region: eu-west
```

---

## Approach 2: Submariner for Cross-Cluster Networking

Submariner creates encrypted tunnels between clusters enabling pod-to-pod and service communication:

```bash
# Install the subctl CLI
curl -Ls https://get.submariner.io | bash
export PATH=$PATH:~/.local/bin

# Deploy the broker on the primary cluster
subctl deploy-broker --kubeconfig cluster1.yaml

# Join each cluster to the broker
subctl join broker-info.subm \
  --kubeconfig cluster1.yaml \
  --clusterid cluster1

subctl join broker-info.subm \
  --kubeconfig cluster2.yaml \
  --clusterid cluster2
```

After joining, export a service so it is discoverable from other clusters:

```bash
# Export the my-app service from cluster1 to all federated clusters
subctl export service my-app \
  --namespace my-app \
  --kubeconfig cluster1.yaml
```

From cluster2, access the service using its federated DNS name:

```bash
# Access service across clusters via Submariner DNS
curl http://my-app.my-app.svc.clusterset.local
```

---

## Approach 3: Rancher Projects for Governance Consistency

Rancher Projects let you standardize quotas and access patterns per downstream cluster, but they are not a cross-cluster federation mechanism on their own:

```yaml
# project.yaml (applied to the Rancher management cluster)
apiVersion: management.cattle.io/v3
kind: Project
metadata:
  name: standard-team-project
  namespace: c-m-abcde
spec:
  clusterName: c-m-abcde
  displayName: standard-team-project
  resourceQuota:
    limit:
      limitsCpu: 1000m
  namespaceDefaultResourceQuota:
    limit:
      limitsCpu: 50m
```

---

## Step 3: Federated Health Monitoring

Use Rancher's multi-cluster dashboard or Grafana to monitor all federated clusters. Create a Grafana dashboard variable for the `cluster` label:

```promql
# Alert when any cluster in the federation has high error rate
sum by (cluster) (
  rate(http_requests_total{status=~"5.."}[5m])
)
/ sum by (cluster) (
  rate(http_requests_total[5m])
) > 0.01
```

---

## Best Practices

- Treat each cluster as an autonomous unit - federation should augment, not couple clusters tightly.
- Use Fleet's **`targetCustomizations`** to customize behavior (replicas, resource limits) per cluster.
- Test cross-cluster failover regularly to ensure Submariner tunnels remain healthy.
- Use Rancher `RoleTemplates` and `ProjectRoleTemplateBindings` to reduce per-cluster permission drift.
