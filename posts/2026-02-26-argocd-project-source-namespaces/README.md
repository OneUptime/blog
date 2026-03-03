# How to Use Project Source Namespaces in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Multi-Tenancy, Configuration

Description: Learn how to configure ArgoCD project source namespaces to allow Application resources to be created in namespaces outside of argocd, enabling true namespace-based multi-tenancy.

---

By default, all ArgoCD Application resources must live in the `argocd` namespace. This creates a bottleneck in multi-tenant environments because every team needs access to the same namespace to create their applications. Project source namespaces solve this by allowing Application resources to be created in team-specific namespaces while still being managed by ArgoCD.

This guide covers how to enable and configure source namespaces for ArgoCD projects.

## The Multi-Tenancy Problem

In a standard ArgoCD setup:

```text
argocd namespace:
  - Application: payments-api (project: payments)
  - Application: payments-worker (project: payments)
  - Application: frontend-web (project: frontend)
  - Application: frontend-api (project: frontend)
  - Application: monitoring (project: platform)
  ... hundreds of applications, all in one namespace
```

Every team needs RBAC access to create Application resources in the `argocd` namespace. This makes namespace-level Kubernetes RBAC ineffective for isolating teams, because everyone shares the same namespace.

## What Source Namespaces Enable

With source namespaces, each team can create Application resources in their own namespace:

```text
payments namespace:
  - Application: payments-api (project: payments)
  - Application: payments-worker (project: payments)

frontend namespace:
  - Application: frontend-web (project: frontend)
  - Application: frontend-api (project: frontend)

platform namespace:
  - Application: monitoring (project: platform)
```

This means Kubernetes RBAC on the source namespace naturally restricts who can create which applications.

## Enabling Applications in Any Namespace

### Step 1: Configure ArgoCD Server

Enable the feature in the ArgoCD ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Enable applications in any namespace
  application.namespaces: "payments, frontend, platform, data-team"
```

You can also use wildcards:

```yaml
data:
  # Allow applications in any namespace starting with "team-"
  application.namespaces: "team-*"

  # Or allow applications in all namespaces (less secure)
  application.namespaces: "*"
```

After changing this, restart the ArgoCD components:

```bash
kubectl rollout restart deployment/argocd-server -n argocd
kubectl rollout restart deployment/argocd-application-controller -n argocd
```

### Step 2: Configure Project Source Namespaces

In each AppProject, specify which namespaces can contain Application resources for that project:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: payments
  namespace: argocd
spec:
  description: "Payments team project"

  # Which namespaces can contain Application resources for this project
  sourceNamespaces:
    - "payments"

  sourceRepos:
    - "https://github.com/my-org/payments-*"

  destinations:
    - server: "https://kubernetes.default.svc"
      namespace: "payments-dev"
    - server: "https://kubernetes.default.svc"
      namespace: "payments-staging"
    - server: "https://kubernetes.default.svc"
      namespace: "payments-prod"
```

### Step 3: Create Applications in the Team Namespace

Now the payments team can create Application resources in the `payments` namespace:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payments-api
  # Application lives in the team's namespace, not argocd
  namespace: payments
spec:
  project: payments
  source:
    repoURL: "https://github.com/my-org/payments-service.git"
    targetRevision: main
    path: k8s/overlays/production
  destination:
    server: "https://kubernetes.default.svc"
    namespace: payments-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

```bash
kubectl apply -f payments-api-app.yaml -n payments
```

## Complete Multi-Tenant Setup

Here is a full setup for three teams:

### ArgoCD Configuration

```yaml
# argocd-cmd-params-cm
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  application.namespaces: "payments, frontend, platform"
```

### Create Team Namespaces

```bash
kubectl create namespace payments
kubectl create namespace frontend
kubectl create namespace platform
```

### Configure Projects with Source Namespaces

```yaml
# payments-project.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: payments
  namespace: argocd
spec:
  sourceNamespaces:
    - "payments"
  sourceRepos:
    - "https://github.com/my-org/payments-*"
  destinations:
    - server: "https://kubernetes.default.svc"
      namespace: "payments-*"
  namespaceResourceWhitelist:
    - group: "*"
      kind: "*"
  clusterResourceWhitelist: []
---
# frontend-project.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: frontend
  namespace: argocd
spec:
  sourceNamespaces:
    - "frontend"
  sourceRepos:
    - "https://github.com/my-org/frontend-*"
  destinations:
    - server: "https://kubernetes.default.svc"
      namespace: "frontend-*"
  namespaceResourceWhitelist:
    - group: "*"
      kind: "*"
  clusterResourceWhitelist: []
---
# platform-project.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: platform
  namespace: argocd
spec:
  sourceNamespaces:
    - "platform"
  sourceRepos:
    - "https://github.com/my-org/platform-*"
  destinations:
    - server: "*"
      namespace: "*"
  namespaceResourceWhitelist:
    - group: "*"
      kind: "*"
  clusterResourceWhitelist:
    - group: "*"
      kind: "*"
```

### Set Up Kubernetes RBAC

Now you can use standard Kubernetes RBAC to control who can create Applications in each namespace:

```yaml
# payments-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: argocd-app-manager
  namespace: payments
rules:
  - apiGroups: ["argoproj.io"]
    resources: ["applications"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: payments-app-manager
  namespace: payments
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: argocd-app-manager
subjects:
  - kind: Group
    name: payments-team
    apiGroup: rbac.authorization.k8s.io
```

This means the `payments-team` group can only create Application resources in the `payments` namespace. They cannot create applications in the `frontend` namespace.

## ApplicationSets with Source Namespaces

ApplicationSets can also be created in team namespaces:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: payments-environments
  namespace: payments    # In the team's namespace
spec:
  generators:
    - list:
        elements:
          - env: dev
            namespace: payments-dev
          - env: staging
            namespace: payments-staging
          - env: prod
            namespace: payments-prod
  template:
    metadata:
      name: "payments-api-{{env}}"
      namespace: payments    # Applications also in team namespace
    spec:
      project: payments
      source:
        repoURL: "https://github.com/my-org/payments-service.git"
        targetRevision: main
        path: "k8s/overlays/{{env}}"
      destination:
        server: "https://kubernetes.default.svc"
        namespace: "{{namespace}}"
```

## Important Limitations

### Application Names Must Be Unique Cluster-Wide

Even though applications can live in different namespaces, ArgoCD still requires application names to be globally unique. Two applications in different namespaces cannot have the same name.

Use a naming convention that includes the team or project:

```text
payments-api-dev        # In payments namespace
frontend-web-dev        # In frontend namespace
```

### The ArgoCD Namespace Still Hosts Core Resources

AppProjects, repository Secrets, and ArgoCD configuration resources still live in the `argocd` namespace. Source namespaces only affect where Application (and ApplicationSet) resources can be created.

### CLI Behavior

When using the ArgoCD CLI, specify the application namespace if it is not in the `argocd` namespace:

```bash
# List apps in a specific namespace
argocd app list --app-namespace payments

# Get an app in a specific namespace
argocd app get payments-api --app-namespace payments

# Sync an app in a specific namespace
argocd app sync payments-api --app-namespace payments
```

## Migrating Existing Applications

To move applications from the `argocd` namespace to team namespaces:

```bash
# Step 1: Export the application
kubectl get application payments-api -n argocd -o yaml > payments-api.yaml

# Step 2: Update the namespace in the YAML
# Change metadata.namespace from "argocd" to "payments"

# Step 3: Delete from argocd namespace (without deleting managed resources)
argocd app delete payments-api --cascade=false

# Step 4: Create in the new namespace
kubectl apply -f payments-api.yaml -n payments
```

Be careful with this migration - there will be a brief period where the application is not managed by ArgoCD. Plan for a maintenance window.

## Troubleshooting

**Application not picked up by ArgoCD**: Verify the namespace is listed in `argocd-cmd-params-cm` under `application.namespaces` and the project has the namespace in `sourceNamespaces`.

**Permission denied creating Application**: Check Kubernetes RBAC for the user in the target namespace:

```bash
kubectl auth can-i create applications.argoproj.io -n payments --as user@example.com
```

**Application shows in wrong project**: The `spec.project` in the Application must match a project that has the Application's namespace in its `sourceNamespaces`.

## Summary

Source namespaces enable true namespace-based multi-tenancy in ArgoCD by letting teams create Application resources in their own namespaces instead of the shared `argocd` namespace. Combined with Kubernetes RBAC, this provides strong isolation between teams. Configure `application.namespaces` in `argocd-cmd-params-cm`, add `sourceNamespaces` to each AppProject, and set up Kubernetes RBAC roles in each team's namespace. This approach scales well for organizations with many teams sharing a single ArgoCD instance.
