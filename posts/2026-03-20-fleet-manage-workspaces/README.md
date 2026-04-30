# How to Manage Fleet Workspaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Workspaces

Description: Learn how to create and manage Fleet workspaces to isolate GitOps deployments across different teams, environments, or organizational units.

## Introduction

Fleet workspaces provide namespace-level isolation for GitOps operations. In Rancher, a Fleet workspace is backed by a Kubernetes namespace of the same name and contains its own set of GitRepo resources, Cluster resources, ClusterGroups, and Bundles. This isolation enables multi-tenant Fleet deployments where different teams can manage their own clusters and applications without interfering with each other.

This guide covers how to create workspaces, assign clusters to workspaces, and manage RBAC for workspace isolation.

## Prerequisites

- Fleet installed in Rancher
- Admin access to the Fleet manager cluster
- `kubectl` configured with cluster-admin privileges
- Basic understanding of Kubernetes RBAC

## Understanding Fleet Workspaces

In Rancher, Fleet workspaces are `FleetWorkspace` resources backed by Kubernetes namespaces with a specific structure:

- **fleet-local**: The default workspace for the local Rancher cluster
- **fleet-default**: The default workspace for all downstream clusters
- **Custom workspaces**: User-defined Fleet workspaces backed by namespaces for team or environment isolation

Each workspace has its own:
- Cluster resources
- ClusterGroup resources
- GitRepo resources
- Bundle resources
- RBAC policies

## Creating a New Workspace

### Step 1: Create the FleetWorkspace

In Rancher, creating a `FleetWorkspace` automatically creates a backing namespace with the same name.

```bash
# Create a new Fleet workspace in Rancher
cat <<EOF | kubectl apply -f -
apiVersion: management.cattle.io/v3
kind: FleetWorkspace
metadata:
  name: fleet-team-alpha
  labels:
    team: alpha
EOF

# Verify the workspace exists
kubectl get fleetworkspaces.management.cattle.io fleet-team-alpha
```

### Step 2: Register Clusters to the Workspace

In Rancher, create or move clusters from the **Continuous Delivery** UI after selecting the target workspace. The cluster's Fleet namespace is the backing namespace for that workspace:

```bash
# Show Fleet clusters and the workspace namespace each one belongs to
kubectl get clusters.fleet.cattle.io -A

# Do not patch metadata.namespace on a Cluster resource:
# namespaces are immutable, so use Rancher to move the cluster between workspaces
```

### Step 3: Create Resources in the Workspace

```yaml
# gitrepo-in-workspace.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: team-alpha-apps
  # Place the GitRepo in the team workspace
  namespace: fleet-team-alpha
spec:
  repo: https://github.com/rancher/fleet-examples
  paths:
    - simple
  targets:
    - clusterSelector: {}
```

```bash
kubectl apply -f gitrepo-in-workspace.yaml
```

## Configuring Workspace RBAC

For direct Kubernetes API access, you can grant Kubernetes RBAC in the workspace's backing namespace. If users need to work with the workspace in the Rancher UI, also grant access to the `FleetWorkspace` resource through a Rancher `GlobalRole`.

### Creating a Workspace Admin Role

```yaml
# workspace-admin-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: fleet-workspace-admin
  namespace: fleet-team-alpha
rules:
  # Manage GitRepo resources
  - apiGroups: ["fleet.cattle.io"]
    resources: ["gitrepos"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

  # Manage ClusterGroups
  - apiGroups: ["fleet.cattle.io"]
    resources: ["clustergroups"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

  # Read-only access to Bundles (BundleDeployments live in per-cluster namespaces)
  - apiGroups: ["fleet.cattle.io"]
    resources: ["bundles"]
    verbs: ["get", "list", "watch"]
```

```yaml
# workspace-admin-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-admin
  namespace: fleet-team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: fleet-workspace-admin
subjects:
  # Bind to a specific user
  - kind: User
    name: alice@example.com
    apiGroup: rbac.authorization.k8s.io
  # Or bind to a group
  - kind: Group
    name: team-alpha
    apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f workspace-admin-role.yaml
kubectl apply -f workspace-admin-binding.yaml
```

### Creating a Read-Only Role

```yaml
# workspace-viewer-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: fleet-workspace-viewer
  namespace: fleet-team-alpha
rules:
  - apiGroups: ["fleet.cattle.io"]
    resources: ["gitrepos", "clustergroups", "bundles"]
    verbs: ["get", "list", "watch"]
```

## Managing Multiple Workspaces

### Viewing All Workspaces

```bash
# List Fleet workspaces in Rancher
kubectl get fleetworkspaces.management.cattle.io

# Or inspect their backing namespaces
kubectl get namespaces | grep '^fleet-'
```

### Switching Between Workspaces

```bash
# List GitRepos in a specific workspace
kubectl get gitrepos -n fleet-team-alpha

# List all GitRepos across all workspaces
kubectl get gitrepos -A

# Get bundles in a specific workspace
kubectl get bundles -n fleet-team-alpha
```

## Using Rancher UI for Workspace Management

### Switching Workspaces in the UI

1. Navigate to **Continuous Delivery** in Rancher
2. In the top-right area, look for the **workspace selector** dropdown
3. Click to switch between `fleet-default`, `fleet-local`, or custom workspaces

### Creating a Workspace in Rancher

1. Navigate to **Continuous Delivery** in Rancher
2. Use the workspace selector at the top of the page to create a new workspace or switch to an existing one
3. After selecting the workspace, click **Clusters** in the left navigation
4. Assign or move clusters into the current workspace

## Workspace Isolation Best Practices

### Recommended Workspace Structure

```text
fleet-local           # Local Rancher cluster management
fleet-default         # Shared/platform-wide deployments
fleet-team-frontend   # Frontend team's clusters and apps
fleet-team-backend    # Backend team's clusters and apps
fleet-team-data       # Data platform clusters
fleet-prod-only       # Production-only critical services
```

### Environment-Based Workspaces

```bash
# Create workspaces by environment
for env in development staging production; do
  cat <<EOF | kubectl apply -f -
apiVersion: management.cattle.io/v3
kind: FleetWorkspace
metadata:
  name: fleet-${env}
  labels:
    environment: "${env}"
EOF
done
```

## Conclusion

Fleet workspaces provide a clean isolation model for multi-team, multi-environment GitOps deployments. By using Fleet workspaces backed by namespaces and combining them with Kubernetes RBAC, you can give teams autonomy over their own deployments without risking interference with other teams. A thoughtful workspace design - whether team-based, environment-based, or a combination - forms the foundation of a scalable and secure Fleet deployment.
