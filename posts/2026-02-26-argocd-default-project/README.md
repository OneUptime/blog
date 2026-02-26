# How to Use the Default Project in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Configuration

Description: Understand the ArgoCD default project, its wide-open permissions, when it is appropriate to use, and how to restrict or replace it for production environments.

---

Every ArgoCD installation comes with a built-in project called `default`. When you create an application without specifying a project, it goes into the `default` project. This makes getting started with ArgoCD easy, but the `default` project has no restrictions at all - it allows deployment from any repository, to any cluster and namespace, with any resource type. For anything beyond a personal lab, you need to understand the implications and decide how to handle it.

## What the Default Project Allows

The `default` project ships with these settings:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: default
  namespace: argocd
spec:
  description: ""
  sourceRepos:
    - "*"              # Any repository
  destinations:
    - namespace: "*"   # Any namespace
      server: "*"      # Any cluster
  clusterResourceWhitelist:
    - group: "*"       # Any API group
      kind: "*"        # Any resource kind
```

This means any user with access to ArgoCD can:

- Deploy from any Git repository, Helm registry, or OCI source
- Deploy to any namespace on any registered cluster
- Create any Kubernetes resource type, including ClusterRoles, CRDs, and webhook configurations
- Potentially affect resources managed by other teams

## When the Default Project is Appropriate

The `default` project is fine for:

- **Personal development clusters** where you are the only user
- **Quick prototyping and testing** where security boundaries are not a concern
- **Learning and experimentation** when you first start using ArgoCD
- **Single-team setups** where everyone has the same level of access

## When to Stop Using the Default Project

Move away from the `default` project when:

- Multiple teams share the ArgoCD instance
- You have production workloads managed by ArgoCD
- You need audit trails for who deployed what
- Compliance requirements dictate access controls
- You want to prevent accidental cross-team interference

## Strategy 1: Lock Down the Default Project

Instead of deleting the `default` project (which ArgoCD will recreate), restrict it so no applications can use it:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: default
  namespace: argocd
spec:
  description: "Default project - locked down. Use team-specific projects."

  # No sources allowed
  sourceRepos: []

  # No destinations allowed
  destinations: []

  # No cluster resources
  clusterResourceWhitelist: []

  # No namespace resources
  namespaceResourceWhitelist: []
```

```bash
kubectl apply -f locked-default-project.yaml
```

With this configuration, any application in the `default` project will fail to sync because no sources or destinations are allowed.

### Handling Existing Applications

Before locking down the default project, migrate existing applications to team-specific projects:

```bash
# List applications in the default project
argocd app list --project default

# For each application, update the project
argocd app set my-app --project team-a

# Verify the application moved
argocd app get my-app -o json | jq '.spec.project'
```

## Strategy 2: Restrict the Default Project

If you want to keep the `default` project usable but less dangerous, add reasonable restrictions:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: default
  namespace: argocd
spec:
  description: "Default project with basic restrictions"

  # Only allow repos from your organization
  sourceRepos:
    - "https://github.com/my-org/*"

  # Only allow the local cluster, non-system namespaces
  destinations:
    - server: "https://kubernetes.default.svc"
      namespace: "default"
    - server: "https://kubernetes.default.svc"
      namespace: "dev-*"

  # No cluster-scoped resources
  clusterResourceWhitelist: []

  # Basic namespace resources only
  namespaceResourceWhitelist:
    - group: ""
      kind: ConfigMap
    - group: ""
      kind: Secret
    - group: ""
      kind: Service
    - group: apps
      kind: Deployment
    - group: networking.k8s.io
      kind: Ingress
```

## Strategy 3: Use the Default Project as a Catch-All

Some organizations use the `default` project as a read-only catch-all that lets users view but not modify applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: default
  namespace: argocd
spec:
  description: "Read-only catch-all project"

  sourceRepos:
    - "https://github.com/my-org/*"

  destinations:
    - server: "https://kubernetes.default.svc"
      namespace: "sandbox"

  # Minimal resources
  namespaceResourceWhitelist:
    - group: ""
      kind: ConfigMap

  # Roles with read-only access
  roles:
    - name: read-only
      description: "Read-only access to default project"
      policies:
        - p, proj:default:read-only, applications, get, default/*, allow
      groups:
        - my-org:developers
```

## Setting Up Team Projects to Replace Default

Here is a practical migration path from using the `default` project to team-specific projects:

### Step 1: Create Team Projects

```yaml
# platform-project.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: platform
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  description: "Platform team infrastructure"
  sourceRepos:
    - "https://github.com/my-org/platform-*"
    - "https://github.com/my-org/infrastructure.git"
  destinations:
    - server: "https://kubernetes.default.svc"
      namespace: "kube-system"
    - server: "https://kubernetes.default.svc"
      namespace: "monitoring"
    - server: "https://kubernetes.default.svc"
      namespace: "ingress-nginx"
  clusterResourceWhitelist:
    - group: "*"
      kind: "*"
  namespaceResourceWhitelist:
    - group: "*"
      kind: "*"
---
# app-team-project.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: app-team
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  description: "Application team services"
  sourceRepos:
    - "https://github.com/my-org/app-*"
  destinations:
    - server: "https://kubernetes.default.svc"
      namespace: "app-dev"
    - server: "https://kubernetes.default.svc"
      namespace: "app-staging"
    - server: "https://kubernetes.default.svc"
      namespace: "app-prod"
  clusterResourceWhitelist: []
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
    - group: networking.k8s.io
      kind: Ingress
    - group: autoscaling
      kind: HorizontalPodAutoscaler
```

### Step 2: Migrate Applications

```bash
# Move each application to its team project
argocd app set nginx-ingress --project platform
argocd app set monitoring-stack --project platform
argocd app set my-web-app --project app-team
argocd app set my-api --project app-team
```

### Step 3: Lock the Default Project

```bash
# Apply the locked configuration
kubectl apply -f locked-default-project.yaml

# Verify no applications remain in default
argocd app list --project default
```

### Step 4: Configure RBAC

Update RBAC policies so users can only access their team's project:

```csv
# argocd-rbac-cm ConfigMap
p, role:platform-admin, applications, *, platform/*, allow
p, role:platform-admin, projects, get, platform, allow

p, role:app-developer, applications, *, app-team/*, allow
p, role:app-developer, projects, get, app-team, allow

# Deny access to default project for everyone except admins
p, role:app-developer, applications, *, default/*, deny
```

## Preventing New Applications in Default

Add a RBAC policy that prevents non-admins from creating applications in the default project:

```csv
# In argocd-rbac-cm
p, role:readonly, applications, get, default/*, allow
p, role:readonly, applications, create, default/*, deny
p, role:readonly, applications, update, default/*, deny
p, role:readonly, applications, delete, default/*, deny
p, role:readonly, applications, sync, default/*, deny
```

## Monitoring Default Project Usage

Set up alerts when someone creates an application in the default project:

```bash
# Check periodically
argocd app list --project default

# Or watch for it with kubectl
kubectl get applications.argoproj.io -n argocd \
  -o jsonpath='{range .items[?(@.spec.project=="default")]}{.metadata.name}{"\n"}{end}'
```

## Summary

The `default` project is ArgoCD's training wheels - great for getting started, but you should remove the training wheels before riding in traffic. For any shared or production ArgoCD instance, either lock down the `default` project completely or restrict it to safe boundaries, and create team-specific projects with explicit source, destination, and resource restrictions. The migration is straightforward: create projects, move applications with `argocd app set --project`, then lock the default.

For more details on creating team-specific projects, see our guide on [ArgoCD Projects for Team Isolation](https://oneuptime.com/blog/post/2026-02-26-argocd-projects-team-isolation/view).
