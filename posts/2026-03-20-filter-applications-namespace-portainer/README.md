# How to Filter Applications by Namespace in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Namespace, Application Management, UI

Description: Learn how to filter and view applications scoped to specific Kubernetes namespaces in Portainer.

## Why Filter by Namespace?

In a cluster with many namespaces and dozens of applications, viewing all workloads at once is overwhelming. Namespace filtering in Portainer lets you focus on a specific team, environment, or application group.

## Filtering Applications in Portainer

1. Select your Kubernetes environment.
2. Go to **Applications** in the sidebar.
3. At the top of the applications list, find the **Namespace** dropdown.
4. Select the namespace you want to view (or **All namespaces**).

The application list updates immediately to show only resources in the selected namespace.

## Using the kubectl Equivalent

```bash
# List all deployments across all namespaces

kubectl get deployments --all-namespaces

# List deployments in a specific namespace
kubectl get deployments --namespace=production

# Alias for convenience
kubectl get deployments -n production

# List all workload types in a namespace
kubectl get deployments,statefulsets,daemonsets -n staging

# Get pods with namespace filter
kubectl get pods -n production --sort-by='.status.startTime'
```

## Filtering with Labels

For even more targeted filtering, combine namespace and label selectors:

```bash
# Get only pods with specific labels in a namespace
kubectl get pods -n production \
  --selector=app=my-app,env=production

# Get pods for a specific team
kubectl get pods --all-namespaces \
  --selector=team=frontend
```

## Setting a Default Namespace Context

If you frequently work with a specific namespace, set it as default:

```bash
# Set default namespace for current kubectl context
kubectl config set-context --current --namespace=production

# Verify
kubectl config view --minify | grep namespace

# Reset to default
kubectl config set-context --current --namespace=default
```

## Portainer Namespace Access

Portainer namespace visibility is controlled by roles and namespace assignments, not by a shared or isolated visibility toggle.

- **Environment administrators** can access the full environment.
- **Operators** and **Helpdesk** users can access all non-system namespaces.
- **Standard** and **Read-Only** users typically see the `default` namespace plus any namespaces assigned to them.
- **Namespace Operator** users are limited to the namespaces assigned to them.

Manage namespace access from **Namespaces > Manage access**. Kubernetes RBAC must be enabled for namespace access control to work in Portainer.

## Filtering Events by Namespace

When debugging, filtering events by namespace is critical:

```bash
# View recent events in a specific namespace
kubectl events --namespace=production

# Filter events by type
kubectl events --namespace=production \
  --types=Warning
```

## Conclusion

Namespace filtering in Portainer makes managing multi-tenant Kubernetes clusters practical. As you scale to tens of namespaces, the ability to quickly focus on a specific environment or team's workloads becomes essential for day-to-day operations.
