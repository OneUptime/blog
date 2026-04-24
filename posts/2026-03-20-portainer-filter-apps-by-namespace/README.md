# How to Filter Applications by Namespace in Portainer - Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Namespace, Application, DevOps

Description: Learn how to filter and view applications by namespace in Portainer to quickly find and manage workloads across a multi-namespace Kubernetes cluster.

## Introduction

In a Kubernetes cluster with multiple namespaces and dozens of applications, finding the right workload quickly is essential. Portainer provides namespace-aware filtering in its Kubernetes views, allowing you to focus on applications belonging to a specific team, environment, or purpose. This guide covers how to effectively use namespace filtering in Portainer.

## Prerequisites

- Portainer with a connected Kubernetes environment
- Multiple namespaces with deployed applications

## Step 1: Set the Namespace Filter in Portainer

On the **Applications** page, Portainer provides a **Namespace** dropdown for filtering the list:

1. Open your Kubernetes environment in Portainer
2. Click **Applications** in the left sidebar
3. Look for the **Namespace** dropdown above the applications list
4. Select a specific namespace (e.g., `production`) to show only applications from that namespace

The dropdown lists the namespaces you have access to, for example:
```text
All namespaces      - Show applications across accessible namespaces
default             - The default Kubernetes namespace
kube-system         - A Kubernetes system namespace, if visible to your account
production          - Your production namespace
staging             - Your staging namespace
development         - Your development namespace
```

## Step 2: Filter Applications in the Applications List

Navigate to **Applications** in the sidebar:

1. Select your Kubernetes environment
2. Click **Applications** in the left sidebar
3. The applications list shows all deployed workloads
4. Use the namespace dropdown to filter by namespace
5. Review the **Namespace** column to confirm which namespace each application belongs to

The list shows:
```text
Name          Namespace      Stack     Status    Created
my-api        production     -         Running   2 days ago
my-frontend   production     -         Running   2 days ago
redis         staging        -         Running   5 hours ago
postgres      development    -         Running   1 day ago
```

## Step 3: Use kubectl to Filter by Namespace

For command-line filtering alongside Portainer:

```bash
# List all deployments in a specific namespace

kubectl get deployments -n production

# List pods with namespace filter
kubectl get pods -n staging

# List all resources in a namespace
kubectl get all -n development

# List resources across all namespaces
kubectl get pods --all-namespaces
# or
kubectl get pods -A

# Filter by label within a namespace
kubectl get pods -n production -l app=my-api

# Get deployments with output showing namespace
kubectl get deployments -A -o wide
```

## Step 4: Set a Default Namespace for Your kubectl Context

To avoid specifying `-n namespace` on every command:

```bash
# Set default namespace for the current context
kubectl config set-context --current --namespace=production

# Verify the setting
kubectl config view --minify | grep namespace

# Now all commands use production by default
kubectl get pods    # Same as: kubectl get pods -n production

# Switch default namespace
kubectl config set-context --current --namespace=staging
```

## Step 5: Use Namespace Access Controls in Portainer BE

Portainer Business Edition provides namespace-scoped access control when Kubernetes RBAC is enabled:

1. **Namespace access management** - From **Namespaces**, admins can assign users or teams to specific namespaces
2. **Assigned namespace visibility** - User and Read-Only roles can be limited to only their assigned namespaces
3. **Cluster-wide roles stay broader** - Operator and Helpdesk roles apply across all non-system namespaces

For teams, this means:
- A backend team can be granted access to only `production` and `staging`
- A data team can be granted access to only `data-platform`
- Environment administrators retain cluster-wide visibility

## Step 6: Filter Other Resources by Namespace

Portainer exposes namespace filtering and namespace context differently depending on the Kubernetes page:

```text
Applications         - Namespace dropdown
ConfigMaps & Secrets - Filter menu with namespace checkboxes
Services             - Namespace shown in the list
Volumes              - Namespace shown in the list
```

Navigate to the relevant section and use the namespace control provided on that page.

## Step 7: Find Applications Across Namespaces via kubectl

```bash
# Find all deployments matching a name pattern across namespaces
kubectl get deployments -A | grep my-api

# Find pods by label across all namespaces
kubectl get pods -A -l app=my-api

# Find services exposing a specific port
kubectl get services -A -o json | \
  jq -r '.items[] | select(.spec.ports[]?.port == 8080) |
  "\(.metadata.namespace)/\(.metadata.name)"'

# Find recently deployed apps (sorted by creation time)
kubectl get deployments -A --sort-by=.metadata.creationTimestamp
```

## Step 8: Organize with Consistent Labels for Better Filtering

Labels enable filtering beyond just namespaces:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
  namespace: production
  labels:
    app: my-api
    team: backend
    environment: production
    tier: api
    version: v2.0.0
```

Filter by label with kubectl:

```bash
# Filter by team label
kubectl get deployments -A -l team=backend

# Filter by multiple labels
kubectl get pods -n production -l team=backend,tier=api

# Filter by environment
kubectl get all -A -l environment=production
```

## Conclusion

Namespace filtering in Portainer keeps your workspace organized and focused. Use the Applications namespace dropdown to limit the app list to specific environments or teams, leverage labels for fine-grained filtering with `kubectl`, and set kubectl default namespaces to reduce repetitive flags. In multi-team clusters, Portainer BE's access control ensures each team only sees relevant namespaces automatically, making filtering a natural part of the workflow.
