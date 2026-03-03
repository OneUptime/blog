# How to Fix 'invalid spec.destination' Error in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Configuration

Description: Fix the ArgoCD invalid spec.destination error by correcting cluster server URLs, namespace values, and understanding the rules for destination configuration in applications.

---

The "invalid spec.destination" error in ArgoCD means your application's destination configuration is malformed. The destination tells ArgoCD which cluster and namespace to deploy resources to, and if this configuration violates ArgoCD's validation rules, you get this error.

The error appears when creating or updating an application:

```text
application spec for my-app has an invalid destination: application destination can't have both name and server
```

Or:

```text
application spec is invalid: InvalidSpecError: application destination server is missing
```

This guide covers all the validation rules for the destination field and how to fix violations.

## Destination Configuration Rules

ArgoCD's destination has three fields:

```yaml
spec:
  destination:
    server: https://kubernetes.default.svc  # Cluster URL
    name: my-cluster                         # Cluster name (alternative to server)
    namespace: default                       # Target namespace
```

The rules are:
1. You must specify either `server` OR `name`, but NOT both
2. You must specify at least `server` or `name`
3. `namespace` is optional but usually should be set

## Error 1: Both Server and Name Specified

```text
application destination can't have both name and server defined
```

**You used both `server` and `name`:**

```yaml
# WRONG - both server and name
destination:
  server: https://kubernetes.default.svc
  name: in-cluster
  namespace: production
```

**Fix by choosing one:**

```yaml
# Option A: Use server URL
destination:
  server: https://kubernetes.default.svc
  namespace: production

# Option B: Use cluster name
destination:
  name: in-cluster
  namespace: production
```

**Which should you use?**

- Use `server` when you know the exact cluster URL
- Use `name` when you want to reference clusters by their ArgoCD name, which is more readable and survives URL changes

```bash
# See registered cluster names and URLs
argocd cluster list
```

## Error 2: Neither Server Nor Name Specified

```text
application destination server and/or name is missing
```

**The destination block is incomplete:**

```yaml
# WRONG - only namespace specified
destination:
  namespace: production
```

**Fix by adding the server or name:**

```yaml
destination:
  server: https://kubernetes.default.svc
  namespace: production
```

## Error 3: Empty Server URL

```text
application destination server is empty
```

**The server field is set to an empty string:**

```yaml
# WRONG
destination:
  server: ""
  namespace: production
```

**Fix by providing a valid URL:**

```yaml
destination:
  server: https://kubernetes.default.svc
  namespace: production
```

For the local cluster (where ArgoCD runs), always use:

```yaml
server: https://kubernetes.default.svc
```

## Error 4: Server URL Not Found in Clusters

While not technically an "invalid spec" error, a similar issue occurs when the server URL does not match any registered cluster:

```text
cluster 'https://wrong-url.example.com' has not been configured
```

**Check registered clusters:**

```bash
argocd cluster list
```

**Fix by using the correct URL:**

```bash
# Find the right URL
argocd cluster list | grep production

# Update the application
argocd app set my-app --dest-server https://correct-url.example.com
```

## Error 5: Cluster Name Not Found

```text
cluster 'nonexistent-cluster' has not been configured
```

**Check registered cluster names:**

```bash
argocd cluster list
```

**Fix by using the correct name:**

```bash
argocd app set my-app --dest-name correct-cluster-name
```

## Error 6: Destination in ApplicationSet Templates

ApplicationSets have their own destination rules. Common issues:

```yaml
# WRONG - template variable might resolve to empty string
spec:
  template:
    spec:
      destination:
        server: '{{url}}'  # If 'url' parameter is empty, this fails
        namespace: '{{namespace}}'
```

**Fix by providing defaults or validating generator output:**

```yaml
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            env: production
  template:
    spec:
      destination:
        server: '{{server}}'  # 'server' is a built-in cluster generator field
        namespace: my-namespace
```

**For list generators, ensure all entries have the required fields:**

```yaml
generators:
  - list:
      elements:
        - cluster: production
          url: https://prod-cluster.example.com
          namespace: app-prod
        - cluster: staging
          url: https://staging-cluster.example.com
          namespace: app-staging
          # Make sure every element has 'url' and 'namespace'
```

## Error 7: Destination With Multiple Sources

When using multiple sources, the destination is shared across all sources:

```yaml
spec:
  # Destination applies to all sources
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  sources:
    - repoURL: https://github.com/org/base
      path: base/
    - repoURL: https://github.com/org/overlays
      path: overlays/production
```

If you need different sources to deploy to different namespaces, you need separate ArgoCD applications.

## Migrating Between Server and Name

If you want to switch from server URL to name (or vice versa):

**Using the CLI:**

```bash
# Switch from server to name
argocd app set my-app --dest-name production-cluster

# This automatically removes the server field
```

**Declaratively, edit the Application YAML:**

```yaml
# Before (server-based)
destination:
  server: https://kubernetes.default.svc
  namespace: production

# After (name-based)
destination:
  name: in-cluster
  namespace: production
```

**Important:** When changing declaratively, make sure to remove the old field completely. Having both `server` and `name` will cause the error.

## Validating Destination Before Creating

You can validate your application spec before creating it:

```bash
# Dry-run creation to check for errors
argocd app create my-app \
  --repo https://github.com/org/repo \
  --path deploy/ \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace production \
  --dry-run

# Or validate a YAML file
kubectl apply --dry-run=server -f application.yaml
```

## Common Patterns

### Local Cluster Deployment

```yaml
destination:
  server: https://kubernetes.default.svc
  namespace: my-namespace
```

### Remote Cluster by URL

```yaml
destination:
  server: https://my-remote-cluster.example.com:6443
  namespace: my-namespace
```

### Remote Cluster by Name

```yaml
destination:
  name: production-east
  namespace: my-namespace
```

### Cluster-Scoped Resources (No Namespace)

For resources like ClusterRoles or Namespaces that are not namespaced:

```yaml
destination:
  server: https://kubernetes.default.svc
  # namespace can be omitted for cluster-scoped resources
```

Or explicitly set it to empty:

```yaml
destination:
  server: https://kubernetes.default.svc
  namespace: ""
```

## Summary

The "invalid spec.destination" error is always about the structure of your application's destination configuration. The key rules are: use either `server` or `name` but never both, and ensure at least one of them is specified. Check `argocd cluster list` to verify the correct cluster URLs and names. When using ApplicationSets, validate that template variables resolve to valid destination values.
