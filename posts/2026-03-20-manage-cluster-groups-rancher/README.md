# How to Manage Cluster Groups in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Cluster Groups, Fleet, Kubernetes, Multi-Cluster, Organization, Management

Description: Learn how to organize Rancher-managed clusters into logical groups using Fleet cluster groups and labels to simplify policy application, monitoring, and workload targeting.

---

As your Kubernetes estate grows, organizing clusters into groups becomes critical for applying consistent policies, deploying workloads, and delegating management responsibilities. Rancher provides two complementary mechanisms: Fleet cluster groups and cluster labels.

---

## Approach 1: Fleet Cluster Groups

A `ClusterGroup` in Fleet is a named collection of clusters that match a label selector. This allows you to target an entire group with a single `GitRepo`.

### Create a ClusterGroup

```yaml
# clustergroup-production.yaml

apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: production-clusters
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      env: production
      tier: frontend
```

```bash
kubectl apply -f clustergroup-production.yaml

# Verify which clusters are in the group
kubectl get clustergroup production-clusters \
  -n fleet-default \
  -o jsonpath='{.status.clusterCount}'
```

---

### Target a GitRepo at a ClusterGroup

```yaml
# gitrepo targeting a cluster group
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: frontend-apps
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/frontend.git
  branch: main
  targets:
    - name: production-frontend
      clusterGroup: production-clusters   # reference the cluster group
```

---

## Approach 2: Cluster Labels and Projects

In Fleet, label the workspace `Cluster` resources to group them logically. Labels power Fleet selectors:

```bash
# Label clusters by environment
kubectl label clusters.fleet.cattle.io frontend-us-east \
  env=production tier=frontend region=us-east \
  -n fleet-default

kubectl label clusters.fleet.cattle.io backend-us-west \
  env=production tier=backend region=us-west \
  -n fleet-default

kubectl label clusters.fleet.cattle.io staging-us-east \
  env=staging tier=all region=us-east \
  -n fleet-default
```

---

## Step 3: Apply Cluster-Level Policies to Groups

Use Fleet to apply a cluster hardening policy to all production clusters:

```yaml
# gitrepo-policies.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: cluster-policies
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/policies.git
  branch: main
  paths:
    - security/
  targets:
    - clusterSelector:
        matchLabels:
          env: production
```

---

## Step 4: Delegate Management via Rancher Projects

Rancher **Projects** group namespaces within a cluster and allow per-project RBAC. Use them to delegate management of a subset of namespaces to a team:

```yaml
# Assign a user as project owner via Rancher API
apiVersion: management.cattle.io/v3
kind: ProjectRoleTemplateBinding
metadata:
  name: alice-project-owner
  namespace: c-m-abcde-p-vwxyz
projectName: c-m-abcde:p-vwxyz
roleTemplateName: project-owner
userPrincipalName: keycloak_user://alice
```

---

## Step 5: Monitor Group Health

Inspect the aggregated Fleet status on the cluster group:

```bash
# Inspect aggregated health and rollout status for the cluster group
kubectl get clustergroup production-clusters \
  -n fleet-default \
  -o yaml
```

---

## Best Practices

- Assign clusters to groups at provisioning time using automation (Terraform, Crossplane) to ensure consistency.
- Use a consistent label taxonomy - start with `env` (production/staging), then `region`, then `tier`.
- Keep group definitions in Git and manage them with Fleet so group membership is auditable.
- Regularly audit group membership to catch clusters that have been mis-labeled.
