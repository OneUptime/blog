# How to Implement Self-Service Deployments for Tenants with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Self-Service, Developer Experience

Description: Learn how to enable self-service deployments for tenants in Flux CD so teams can independently deploy applications without platform admin intervention.

---

Self-service deployments allow tenant teams to deploy and manage their applications independently, without requiring platform admin involvement for every change. The platform admin sets up guardrails, and tenants operate freely within those boundaries. This guide covers how to build a self-service deployment model with Flux CD.

## The Self-Service Model

In a self-service model:

- The platform admin sets up the tenant namespace, RBAC, quotas, and network policies once
- The tenant team owns their Git repository and can push changes at any time
- Flux automatically reconciles changes from the tenant's repository
- The platform admin only intervenes for infrastructure changes or policy updates

## Step 1: Set Up the Tenant Foundation

The platform admin creates the tenant's namespace, service account, RBAC, and registers the tenant's Git repository.

```yaml
# tenants/team-alpha/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  labels:
    toolkit.fluxcd.io/tenant: team-alpha
---
# tenants/team-alpha/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-alpha
  namespace: team-alpha
---
# tenants/team-alpha/rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-reconciler
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tenant-reconciler
subjects:
  - kind: ServiceAccount
    name: team-alpha
    namespace: team-alpha
```

## Step 2: Register the Tenant's Self-Service Repository

Create a GitRepository that points to the tenant's own repository. The tenant has full write access to this repository.

```yaml
# tenants/team-alpha/git-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-apps
  namespace: team-alpha
spec:
  interval: 1m
  url: https://github.com/org/team-alpha-apps
  ref:
    branch: main
  secretRef:
    name: team-alpha-git-auth
```

## Step 3: Create the Self-Service Kustomization

The Kustomization reconciles whatever the tenant has in their repository, within the constraints of their RBAC and resource quotas.

```yaml
# tenants/team-alpha/sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-apps
  namespace: team-alpha
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: team-alpha-apps
  path: ./
  prune: true
  serviceAccountName: team-alpha
  targetNamespace: team-alpha
  # Allow tenants to use variable substitution
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: team-alpha-vars
```

## Step 4: Provide Tenant Variables

Give tenants a ConfigMap with environment-specific variables they can reference in their manifests.

```yaml
# tenants/team-alpha/vars.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: team-alpha-vars
  namespace: team-alpha
data:
  CLUSTER_NAME: production
  ENVIRONMENT: production
  DOMAIN: team-alpha.example.com
  IMAGE_REGISTRY: registry.example.com/team-alpha
```

Tenants can reference these variables in their manifests using `${VARIABLE_NAME}` syntax.

## Step 5: Structure the Tenant Repository

The tenant's own repository contains their application manifests. Here is a recommended structure.

```bash
# team-alpha-apps repository structure
team-alpha-apps/
  apps/
    frontend/
      deployment.yaml
      service.yaml
      ingress.yaml
    backend/
      deployment.yaml
      service.yaml
    worker/
      deployment.yaml
  kustomization.yaml
```

The tenant's kustomization.yaml assembles their applications.

```yaml
# team-alpha-apps/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - apps/frontend/deployment.yaml
  - apps/frontend/service.yaml
  - apps/frontend/ingress.yaml
  - apps/backend/deployment.yaml
  - apps/backend/service.yaml
  - apps/worker/deployment.yaml
```

## Step 6: Tenant Deploys an Application

The tenant creates their application manifests in their repository. They can use the platform-provided variables.

```yaml
# team-alpha-apps/apps/frontend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          # Uses the variable from platform ConfigMap
          image: ${IMAGE_REGISTRY}/frontend:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

## Step 7: Enable HelmRelease Self-Service

Allow tenants to deploy Helm charts from approved repositories.

```yaml
# Platform admin creates approved Helm repositories in the tenant namespace
# tenants/team-alpha/helm-repos.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: team-alpha
spec:
  interval: 10m
  url: https://charts.bitnami.com/bitnami
```

The tenant can then create HelmRelease resources in their repository (if their RBAC allows it).

```yaml
# team-alpha-apps/apps/redis/helm-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
spec:
  interval: 5m
  chart:
    spec:
      chart: redis
      version: "18.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
  values:
    architecture: standalone
    auth:
      enabled: true
    master:
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
```

For this to work, the tenant's RBAC must include permissions for HelmRelease CRDs.

```yaml
# Additional RBAC rule for Helm self-service
- apiGroups: ["helm.toolkit.fluxcd.io"]
  resources: ["helmreleases"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

## Step 8: Set Up Tenant Notifications

Give tenants visibility into their deployment status by setting up notifications in their namespace.

```yaml
# tenants/team-alpha/notification.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: team-alpha-slack
  namespace: team-alpha
spec:
  type: slack
  channel: team-alpha-deployments
  secretRef:
    name: team-alpha-slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: team-alpha-alerts
  namespace: team-alpha
spec:
  providerRef:
    name: team-alpha-slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: team-alpha-apps
    - kind: GitRepository
      name: team-alpha-apps
```

## Step 9: Verify Self-Service Workflow

Test the end-to-end self-service flow.

```bash
# As the tenant, push a change to the tenant repository
# Then verify Flux picks it up
flux get kustomizations -n team-alpha

# Force reconciliation to test immediately
flux reconcile kustomization team-alpha-apps -n team-alpha --with-source

# Check deployed resources
kubectl get all -n team-alpha

# Verify the tenant's deployment is running
kubectl get deployments -n team-alpha
```

## Summary

Self-service deployments in Flux CD empower tenant teams to deploy independently while the platform admin maintains control through RBAC, resource quotas, and approved sources. The platform admin sets up the tenant foundation once, and then the tenant manages their own repository and deployment lifecycle. This model reduces the platform team's operational burden and gives development teams the autonomy to ship faster within safe guardrails.
