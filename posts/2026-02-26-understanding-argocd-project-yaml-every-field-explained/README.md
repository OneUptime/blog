# Understanding ArgoCD project.yaml: Every Field Explained

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, YAML, Multi-Tenancy

Description: A detailed reference guide to every field in the ArgoCD AppProject YAML specification, covering source repos, destinations, RBAC roles, sync windows, and resource restrictions.

---

The ArgoCD AppProject is the security and governance boundary for your GitOps applications. It controls which repositories can be used, which clusters and namespaces applications can deploy to, and which Kubernetes resource types are allowed. Understanding every field in the AppProject spec is essential for building a secure multi-tenant ArgoCD platform. This guide walks through the complete specification.

## The Complete AppProject Structure

Here is an AppProject with every available field:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: my-team
  namespace: argocd
  labels:
    team: my-team
    tier: standard
  annotations:
    project.owner: "platform-team"
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  description: "Project for the my-team engineering group"
  sourceRepos:
    - "https://github.com/org/my-team-*"
  destinations:
    - server: "https://kubernetes.default.svc"
      namespace: "my-team-*"
  clusterResourceWhitelist: []
  namespaceResourceWhitelist:
    - group: "*"
      kind: "*"
  roles:
    - name: developer
      policies:
        - "p, proj:my-team:developer, applications, get, my-team/*, allow"
  syncWindows:
    - kind: allow
      schedule: "0 8 * * 1-5"
      duration: 10h
      applications: ["*"]
```

## metadata Section

### metadata.name

The project name. Referenced by Applications in their `spec.project` field. The built-in `default` project has no restrictions and should only be used for testing.

```yaml
metadata:
  name: frontend-team
```

### metadata.namespace

Must be the ArgoCD installation namespace, typically `argocd`.

### metadata.finalizers

Controls cleanup behavior when the project is deleted:

```yaml
finalizers:
  - resources-finalizer.argocd.argoproj.io
```

With this finalizer, ArgoCD will refuse to delete a project that still has applications. Without it, deleting a project leaves orphaned applications.

## spec.description

A human-readable description of the project. Shows up in the ArgoCD UI:

```yaml
spec:
  description: "Production workloads for the frontend engineering team"
```

## spec.sourceRepos

Controls which Git repositories and Helm chart repositories applications in this project can pull from.

```yaml
spec:
  sourceRepos:
    # Exact repository URLs
    - "https://github.com/org/frontend-app.git"
    - "https://github.com/org/shared-charts.git"

    # Wildcard patterns
    - "https://github.com/org/frontend-*"

    # Helm chart repositories
    - "https://charts.helm.sh/stable"
    - "oci://registry.example.com/charts"

    # Allow all repositories (not recommended for production)
    - "*"
```

The wildcard `*` allows any repository. For security, always restrict to specific repos or patterns.

## spec.destinations

Defines which clusters and namespaces applications can deploy to:

```yaml
spec:
  destinations:
    # Specific namespace on the in-cluster server
    - server: "https://kubernetes.default.svc"
      namespace: "frontend-production"

    # Wildcard namespace pattern
    - server: "https://kubernetes.default.svc"
      namespace: "frontend-*"

    # Use cluster name instead of URL
    - name: "production-cluster"
      namespace: "frontend"

    # Any namespace on a specific server
    - server: "https://dev.k8s.example.com"
      namespace: "*"

    # All clusters and namespaces (not recommended)
    - server: "*"
      namespace: "*"
```

Each destination entry requires either `server` or `name`, plus a `namespace`. Both support wildcards.

## spec.clusterResourceWhitelist

Controls which cluster-scoped resources (not namespaced) applications can create:

```yaml
spec:
  # Allow no cluster-scoped resources (most restrictive)
  clusterResourceWhitelist: []

  # Allow specific cluster resources
  clusterResourceWhitelist:
    - group: ""
      kind: Namespace
    - group: rbac.authorization.k8s.io
      kind: ClusterRole
    - group: rbac.authorization.k8s.io
      kind: ClusterRoleBinding
    - group: apiextensions.k8s.io
      kind: CustomResourceDefinition

  # Allow all cluster resources (least restrictive)
  clusterResourceWhitelist:
    - group: "*"
      kind: "*"
```

An empty list means no cluster-scoped resources are allowed. This is the recommended default for application teams.

## spec.clusterResourceBlacklist

Explicitly deny specific cluster-scoped resources. Takes precedence over the whitelist:

```yaml
spec:
  clusterResourceBlacklist:
    - group: ""
      kind: Namespace    # Prevent teams from creating namespaces
    - group: rbac.authorization.k8s.io
      kind: ClusterRoleBinding    # Prevent cluster-wide RBAC changes
```

## spec.namespaceResourceWhitelist

Controls which namespace-scoped resources are allowed:

```yaml
spec:
  # Allow all namespace resources (default behavior when omitted)
  namespaceResourceWhitelist:
    - group: "*"
      kind: "*"

  # Allow only specific resources
  namespaceResourceWhitelist:
    - group: ""
      kind: ConfigMap
    - group: ""
      kind: Secret
    - group: ""
      kind: Service
    - group: ""
      kind: ServiceAccount
    - group: apps
      kind: Deployment
    - group: apps
      kind: StatefulSet
    - group: batch
      kind: Job
    - group: batch
      kind: CronJob
    - group: networking.k8s.io
      kind: Ingress
    - group: autoscaling
      kind: HorizontalPodAutoscaler
    - group: policy
      kind: PodDisruptionBudget
```

When this field is omitted entirely, all namespace-scoped resources are allowed.

## spec.namespaceResourceBlacklist

Deny specific namespace-scoped resources. Takes precedence over the whitelist:

```yaml
spec:
  namespaceResourceBlacklist:
    - group: ""
      kind: ResourceQuota      # Prevent teams from changing their quotas
    - group: ""
      kind: LimitRange         # Prevent teams from changing limit ranges
    - group: ""
      kind: PersistentVolume   # Prevent direct PV management
```

## spec.roles

Define RBAC roles scoped to this project. Each role has a set of policies and can optionally have groups and JWT tokens:

```yaml
spec:
  roles:
    - name: developer
      description: "Read-only access with sync capability"
      policies:
        - "p, proj:my-team:developer, applications, get, my-team/*, allow"
        - "p, proj:my-team:developer, applications, sync, my-team/*, allow"
        - "p, proj:my-team:developer, logs, get, my-team/*, allow"
      # Map SSO groups to this role
      groups:
        - "my-team-developers"
        - "my-team-engineers"
      # JWT tokens for CI/CD
      jwtTokens:
        - iat: 1710000000    # Issued at (Unix timestamp)
          exp: 1741536000    # Expires at (Unix timestamp)
          id: "ci-token"

    - name: admin
      description: "Full access to project applications"
      policies:
        - "p, proj:my-team:admin, applications, *, my-team/*, allow"
        - "p, proj:my-team:admin, logs, get, my-team/*, allow"
        - "p, proj:my-team:admin, exec, create, my-team/*, allow"
      groups:
        - "my-team-leads"

    - name: ci
      description: "CI/CD pipeline access"
      policies:
        - "p, proj:my-team:ci, applications, sync, my-team/*, allow"
        - "p, proj:my-team:ci, applications, get, my-team/*, allow"
```

The policy format follows Casbin syntax:

```text
p, <subject>, <resource>, <action>, <project>/<application>, <allow|deny>
```

Available resources: `applications`, `logs`, `exec`, `repositories`, `clusters`, `projects`

Available actions: `get`, `create`, `update`, `delete`, `sync`, `override`, `action`, `*`

## spec.syncWindows

Define time windows that control when syncs are allowed or blocked:

```yaml
spec:
  syncWindows:
    # Allow syncs during business hours
    - kind: allow
      schedule: "0 8 * * 1-5"      # Cron schedule: 8 AM Mon-Fri
      duration: 10h                  # Window duration
      applications:
        - "*"                        # Apply to all apps in project
      namespaces:
        - "my-team-*"               # Or filter by namespace
      clusters:
        - "https://kubernetes.default.svc"
      timeZone: "America/New_York"
      manualSync: true               # Allow manual sync even outside window

    # Block production deployments on weekends
    - kind: deny
      schedule: "0 0 * * 0,6"       # Saturday and Sunday
      duration: 48h
      applications:
        - "*-production"

    # Maintenance window - allow all syncs
    - kind: allow
      schedule: "0 2 * * 3"         # Wednesday 2 AM
      duration: 4h
      applications:
        - "*"
```

Window behavior:

- **allow** windows - syncs are only permitted during these windows. If any allow window exists, syncs outside all allow windows are blocked.
- **deny** windows - syncs are blocked during these windows, even if an allow window is active.
- **manualSync** - when `true`, manual syncs via UI/CLI are still allowed outside the window. Only automated syncs are blocked.

## spec.signatureKeys

Require GPG signature verification on Git commits:

```yaml
spec:
  signatureKeys:
    - keyID: "4AEE18F83AFDEB23"    # GPG key ID
    - keyID: "B5690EEEBB952194"
```

When configured, ArgoCD only syncs commits signed by one of the listed keys.

## spec.orphanedResources

Monitor and optionally warn about resources in destination namespaces that are not managed by any ArgoCD application:

```yaml
spec:
  orphanedResources:
    warn: true     # Show warnings in the UI
    ignore:
      - group: ""
        kind: ConfigMap
        name: "kube-root-ca.crt"    # Ignore auto-generated ConfigMaps
      - group: ""
        kind: ServiceAccount
        name: "default"              # Ignore default service accounts
```

## spec.sourceNamespaces

Allow applications in specific namespaces (outside argocd) to reference this project:

```yaml
spec:
  sourceNamespaces:
    - "team-argocd"
    - "apps-*"
```

This is used with the "apps in any namespace" feature.

## Practical Examples

### Minimal Restrictive Project

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: sandbox
  namespace: argocd
spec:
  description: "Sandbox project with minimal permissions"
  sourceRepos:
    - "https://github.com/org/sandbox-*"
  destinations:
    - server: "https://kubernetes.default.svc"
      namespace: "sandbox"
  clusterResourceWhitelist: []
  namespaceResourceWhitelist:
    - group: ""
      kind: ConfigMap
    - group: apps
      kind: Deployment
    - group: ""
      kind: Service
```

### Production Project with Full Controls

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  description: "Production workloads with strict controls"
  sourceRepos:
    - "https://github.com/org/production-manifests.git"
  destinations:
    - server: "https://prod.k8s.example.com"
      namespace: "app-*"
  clusterResourceWhitelist: []
  namespaceResourceBlacklist:
    - group: ""
      kind: ResourceQuota
  roles:
    - name: deployer
      policies:
        - "p, proj:production:deployer, applications, sync, production/*, allow"
        - "p, proj:production:deployer, applications, get, production/*, allow"
      groups:
        - "prod-deployers"
  syncWindows:
    - kind: allow
      schedule: "0 9 * * 1-5"
      duration: 8h
      applications: ["*"]
      timeZone: "America/New_York"
  signatureKeys:
    - keyID: "4AEE18F83AFDEB23"
  orphanedResources:
    warn: true
```

## Summary

The ArgoCD AppProject is your primary tool for implementing multi-tenancy, security policies, and governance in a GitOps environment. Every field serves a purpose in restricting what applications can do. Start with restrictive projects (empty clusterResourceWhitelist, specific sourceRepos, limited destinations) and open up access only as needed. Combined with RBAC roles and sync windows, AppProjects give you fine-grained control over your deployment pipeline.
