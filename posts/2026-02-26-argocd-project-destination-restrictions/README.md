# How to Configure Project Destination Restrictions in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, Multi-Tenancy

Description: Learn how to configure ArgoCD project destination restrictions to control which Kubernetes clusters and namespaces teams can deploy to, with patterns for multi-cluster and multi-environment setups.

---

While source restrictions control where code comes from, destination restrictions control where it gets deployed. In a multi-tenant ArgoCD setup, destination restrictions prevent teams from deploying to each other's namespaces, accessing production clusters they should not touch, or creating resources in system namespaces like `kube-system`.

This guide covers how to configure the `destinations` field in ArgoCD AppProjects, including multi-cluster patterns and common gotchas.

## How Destination Restrictions Work

The `destinations` field in an AppProject defines which cluster-namespace combinations applications in the project can deploy to. Each destination entry specifies a cluster server URL and a namespace. When ArgoCD syncs an application, it checks that the application's destination matches at least one allowed destination in the project.

```yaml
spec:
  destinations:
    - server: "https://kubernetes.default.svc"
      namespace: "my-namespace"
```

If an application targets a destination not in this list, ArgoCD will refuse to sync it.

## Basic Destination Configuration

### Single Cluster, Specific Namespaces

The most common setup - a team gets access to their namespaces on the local cluster:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: backend-team
  namespace: argocd
spec:
  destinations:
    - server: "https://kubernetes.default.svc"
      namespace: "backend-dev"
    - server: "https://kubernetes.default.svc"
      namespace: "backend-staging"
    - server: "https://kubernetes.default.svc"
      namespace: "backend-prod"
```

### Using Cluster Names Instead of URLs

ArgoCD also supports cluster names (as registered via `argocd cluster add`):

```yaml
destinations:
  - name: "in-cluster"
    namespace: "backend-dev"
  - name: "production-cluster"
    namespace: "backend-prod"
```

You can use either `server` or `name`, but not both in the same destination entry.

## Wildcard Destinations

### Allow All Namespaces on a Specific Cluster

For a team that manages multiple namespaces with a common prefix:

```yaml
destinations:
  # Any namespace starting with "backend-"
  - server: "https://kubernetes.default.svc"
    namespace: "backend-*"
```

### Allow a Specific Namespace on Any Cluster

For services that need to deploy to the same namespace across multiple clusters:

```yaml
destinations:
  # monitoring namespace on any cluster
  - server: "*"
    namespace: "monitoring"
```

### Allow Everything (Not Recommended)

The `default` project uses this:

```yaml
destinations:
  - server: "*"
    namespace: "*"
```

This disables destination restrictions. Never use this in team projects.

## Multi-Cluster Destination Patterns

### Environment-Based Clusters

When you have separate clusters for each environment:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: payments-team
  namespace: argocd
spec:
  destinations:
    # Development cluster
    - server: "https://dev-cluster.example.com"
      namespace: "payments"
    - server: "https://dev-cluster.example.com"
      namespace: "payments-jobs"
    # Staging cluster
    - server: "https://staging-cluster.example.com"
      namespace: "payments"
    - server: "https://staging-cluster.example.com"
      namespace: "payments-jobs"
    # Production cluster
    - server: "https://prod-cluster.example.com"
      namespace: "payments"
    - server: "https://prod-cluster.example.com"
      namespace: "payments-jobs"
```

### Regional Clusters

For multi-region deployments:

```yaml
destinations:
  # US East
  - server: "https://us-east-1.k8s.example.com"
    namespace: "my-service"
  # US West
  - server: "https://us-west-2.k8s.example.com"
    namespace: "my-service"
  # EU West
  - server: "https://eu-west-1.k8s.example.com"
    namespace: "my-service"
```

### Using Wildcards for Multi-Cluster

If cluster URLs follow a naming convention:

```yaml
destinations:
  # All clusters matching the pattern
  - server: "https://*.k8s.example.com"
    namespace: "my-service"
```

Note that ArgoCD uses glob matching, not regex, for wildcard patterns.

## Denying Specific Destinations

ArgoCD does not have a native "deny" mechanism for destinations - it uses an allow list model. But you can achieve deny-like behavior by being specific about what you allow.

For example, to allow all namespaces except `kube-system`:

```yaml
# There is no deny syntax, so you must list allowed namespaces explicitly
# or use a prefix convention that excludes system namespaces
destinations:
  - server: "https://kubernetes.default.svc"
    namespace: "team-*"
```

If your naming convention puts team namespaces under a common prefix, this effectively denies access to system namespaces.

## Combining with Namespace Creation

A common question is: can a team create the namespace they need? This depends on two things:

1. The project must allow `Namespace` as a cluster resource
2. The namespace must be in the allowed destinations

```yaml
spec:
  destinations:
    - server: "https://kubernetes.default.svc"
      namespace: "backend-dev"

  # Allow creating namespaces
  clusterResourceWhitelist:
    - group: ""
      kind: "Namespace"
```

And in the application:

```yaml
syncPolicy:
  syncOptions:
    - CreateNamespace=true
```

However, granting `Namespace` creation is a cluster-scoped privilege. Most organizations prefer having the platform team pre-create namespaces and only grant namespace-scoped resources to application teams.

## Practical Project Templates

### Microservice Team Template

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: "{{ team_name }}"
  namespace: argocd
spec:
  description: "{{ team_name }} microservices"

  sourceRepos:
    - "https://github.com/my-org/{{ team_name }}-*"
    - "https://github.com/my-org/shared-charts.git"

  destinations:
    # Dev: unrestricted within team namespace
    - server: "https://kubernetes.default.svc"
      namespace: "{{ team_name }}-dev"
    # Staging: team namespace on staging cluster
    - server: "https://staging.k8s.example.com"
      namespace: "{{ team_name }}"
    # Production: team namespace on prod cluster
    - server: "https://prod.k8s.example.com"
      namespace: "{{ team_name }}"

  namespaceResourceWhitelist:
    - group: "*"
      kind: "*"

  clusterResourceWhitelist: []
```

### Shared Services Template

For platform components that deploy to specific system namespaces across all clusters:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: shared-services
  namespace: argocd
spec:
  description: "Shared infrastructure services"

  sourceRepos:
    - "https://github.com/my-org/infrastructure.git"
    - "https://charts.bitnami.com/bitnami"

  destinations:
    # Monitoring stack on all clusters
    - server: "*"
      namespace: "monitoring"
    # Logging stack on all clusters
    - server: "*"
      namespace: "logging"
    # Ingress controllers on all clusters
    - server: "*"
      namespace: "ingress-nginx"

  clusterResourceWhitelist:
    - group: ""
      kind: "Namespace"
    - group: "rbac.authorization.k8s.io"
      kind: "ClusterRole"
    - group: "rbac.authorization.k8s.io"
      kind: "ClusterRoleBinding"

  namespaceResourceWhitelist:
    - group: "*"
      kind: "*"
```

## Updating Destinations

### Adding a Destination

```bash
# Using CLI
argocd proj add-destination payments-team \
  https://kubernetes.default.svc \
  payments-canary

# Verify
argocd proj get payments-team
```

### Removing a Destination

```bash
# Using CLI
argocd proj remove-destination payments-team \
  https://kubernetes.default.svc \
  payments-canary
```

Removing a destination does not delete applications that target it, but those applications will fail to sync.

## Validation and Testing

Always verify your destination restrictions work correctly:

```bash
# Should succeed
argocd app create allowed-test \
  --project payments-team \
  --repo https://github.com/my-org/payments-service.git \
  --path k8s \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace payments-dev

# Should fail
argocd app create denied-test \
  --project payments-team \
  --repo https://github.com/my-org/payments-service.git \
  --path k8s \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace kube-system
# Expected: application destination {https://kubernetes.default.svc kube-system}
#           is not permitted in project 'payments-team'
```

## Common Mistakes

**Using wrong cluster URL**: The server URL must exactly match what ArgoCD has registered. Check with `argocd cluster list`. The in-cluster URL is always `https://kubernetes.default.svc`.

**Namespace name mismatch**: Destination namespaces are exact matches (unless using wildcards). A typo in the namespace name silently results in denied access.

**Forgetting to add new namespaces**: When a team creates a new microservice that needs its own namespace, someone needs to update the project destinations. Automate this with naming conventions and wildcards.

## Summary

Destination restrictions are your primary tool for controlling where workloads land in your clusters. Use specific namespace names for tight control, or wildcard patterns when teams manage multiple namespaces with a common prefix. In multi-cluster setups, restrict access to production clusters more tightly than development clusters. Always test restrictions by attempting to create applications that should be denied, and manage project configurations in Git for auditability.
