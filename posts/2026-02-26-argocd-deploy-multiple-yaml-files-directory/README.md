# How to Deploy Multiple YAML Files from a Directory with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, YAML, Deployment

Description: Learn how to deploy multiple Kubernetes YAML files from a single directory in ArgoCD, including multi-document files, ordering, and managing large file sets.

---

Deploying a single Kubernetes resource with ArgoCD is straightforward, but real-world applications consist of many resources - Deployments, Services, ConfigMaps, Secrets, Ingresses, ServiceAccounts, and more. ArgoCD handles multi-file directories naturally, reading and applying every manifest it finds. This guide covers how to effectively manage and deploy directories containing many YAML files.

## How ArgoCD Handles Multiple Files

When you point an ArgoCD Application at a directory path, ArgoCD reads every `.yaml`, `.yml`, and `.json` file in that directory. Each file is parsed, and every Kubernetes object found is tracked as part of the application. The order files are read does not determine the order they are applied - ArgoCD uses sync waves and resource type ordering for that.

Here is a typical multi-file directory:

```text
apps/payment-service/
  00-namespace.yaml
  01-serviceaccount.yaml
  02-configmap.yaml
  03-secret.yaml
  04-deployment.yaml
  05-service.yaml
  06-ingress.yaml
  07-hpa.yaml
  08-pdb.yaml
  09-networkpolicy.yaml
  10-servicemonitor.yaml
```

Create the ArgoCD Application:

```yaml
# payment-service-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    targetRevision: main
    path: apps/payment-service
  destination:
    server: https://kubernetes.default.svc
    namespace: payments
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

ArgoCD reads all 11 files and manages them as a single application with 11 resources.

## File Naming Conventions

While ArgoCD does not care about file names (it reads everything), good naming helps your team navigate the repository. Common conventions include:

**Numbered prefixes** for visual ordering in editors:

```text
00-namespace.yaml
01-rbac.yaml
02-configmap.yaml
03-deployment.yaml
04-service.yaml
```

**Resource-type names** for clarity:

```text
namespace.yaml
configmap.yaml
deployment.yaml
service.yaml
ingress.yaml
```

**Component-based names** for microservices:

```text
api-deployment.yaml
api-service.yaml
worker-deployment.yaml
worker-service.yaml
shared-configmap.yaml
```

File numbering is purely cosmetic and does not affect the apply order. ArgoCD determines ordering based on resource type (Namespaces before Deployments) and sync wave annotations.

## Multi-Document Files vs Separate Files

You have two approaches for organizing resources:

**Separate files** (one resource per file):

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
  namespace: payments
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-api
  template:
    metadata:
      labels:
        app: payment-api
    spec:
      containers:
        - name: payment-api
          image: my-registry/payment-api:v2.1.0
          ports:
            - containerPort: 8080
```

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-api
  namespace: payments
spec:
  selector:
    app: payment-api
  ports:
    - port: 80
      targetPort: 8080
```

**Multi-document file** (multiple resources in one file):

```yaml
# payment-api.yaml - All resources for the payment API
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
  namespace: payments
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-api
  template:
    metadata:
      labels:
        app: payment-api
    spec:
      containers:
        - name: payment-api
          image: my-registry/payment-api:v2.1.0
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: payment-api
  namespace: payments
spec:
  selector:
    app: payment-api
  ports:
    - port: 80
      targetPort: 8080
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-api
  namespace: payments
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

Both approaches work equally well with ArgoCD. The choice depends on your team's preference:

| Criteria | Separate Files | Multi-Document |
|---|---|---|
| Git diffs | Cleaner per-resource diffs | All changes in one diff |
| Git blame | Per-resource history | Shared history |
| Navigation | More files to browse | Fewer files, longer files |
| Reuse | Easier to copy individual files | Harder to extract parts |

## Controlling Apply Order with Sync Waves

When deploying multiple files, you often need certain resources to exist before others. Sync waves control the apply order:

```yaml
# 00-namespace.yaml - Wave -2: Create namespace first
apiVersion: v1
kind: Namespace
metadata:
  name: payments
  annotations:
    argocd.argoproj.io/sync-wave: "-2"

---
# 01-serviceaccount.yaml - Wave -1: Create SA before deployment
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payment-api
  namespace: payments
  annotations:
    argocd.argoproj.io/sync-wave: "-1"

---
# 02-configmap.yaml - Wave -1: Config before deployment
apiVersion: v1
kind: ConfigMap
metadata:
  name: payment-config
  namespace: payments
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
data:
  DATABASE_HOST: "db.payments.svc.cluster.local"
  CACHE_HOST: "redis.payments.svc.cluster.local"

---
# 04-deployment.yaml - Wave 0 (default): Main deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
  namespace: payments
  # No sync-wave annotation means wave 0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-api
  template:
    metadata:
      labels:
        app: payment-api
    spec:
      serviceAccountName: payment-api
      containers:
        - name: payment-api
          image: my-registry/payment-api:v2.1.0
          envFrom:
            - configMapRef:
                name: payment-config

---
# 07-hpa.yaml - Wave 1: HPA after deployment exists
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-api
  namespace: payments
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-api
  minReplicas: 3
  maxReplicas: 10
```

## Handling Large File Sets

When your directory grows to dozens or hundreds of files, consider these strategies:

### Split into Subdirectories with Recursion

Group related resources:

```text
apps/platform/
  core/
    namespace.yaml
    rbac.yaml
  backend/
    deployment.yaml
    service.yaml
  frontend/
    deployment.yaml
    service.yaml
  monitoring/
    servicemonitor.yaml
```

```yaml
spec:
  source:
    path: apps/platform
    directory:
      recurse: true
```

### Split into Multiple Applications

For very large deployments, create separate ArgoCD Applications for each component:

```yaml
# backend-app.yaml
spec:
  source:
    path: apps/platform/backend

---
# frontend-app.yaml
spec:
  source:
    path: apps/platform/frontend

---
# monitoring-app.yaml
spec:
  source:
    path: apps/platform/monitoring
```

This approach gives you independent sync status, separate health checks, and the ability to sync components independently.

### Use the App of Apps Pattern

Create a parent ArgoCD Application that manages child applications:

```yaml
# parent-app.yaml - manages other ArgoCD Applications
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: platform
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    targetRevision: main
    path: argocd-apps/platform  # Directory containing Application YAMLs
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
```

The `argocd-apps/platform/` directory contains Application resources that each point to a different component directory.

## Viewing and Managing Multi-File Deployments

```bash
# List all resources in the application
argocd app resources payment-service

# View the resource tree (shows parent-child relationships)
argocd app get payment-service --show-operation

# View specific resource details
argocd app resources payment-service --kind Deployment

# Sync specific resources only
argocd app sync payment-service --resource ':Deployment:payment-api'

# View all rendered manifests
argocd app manifests payment-service
```

In the ArgoCD UI, the resource tree view shows all resources from all files organized by their Kubernetes relationships (Deployment owns ReplicaSet, ReplicaSet owns Pods, etc.).

## Pruning and Deletion

When you remove a YAML file from the directory, ArgoCD detects that the resources defined in that file are no longer in the desired state. With `prune: true` in the sync policy, ArgoCD deletes those resources automatically. Without pruning, they show as "orphaned" in the UI.

```yaml
# Enable pruning to automatically delete removed resources
syncPolicy:
  automated:
    prune: true  # Delete resources when their YAML files are removed
```

Be cautious with pruning in directories containing many files - removing or renaming a file can trigger unexpected deletions. Test changes in a staging environment first.

## Best Practices for Multi-File Directories

**Keep files focused** - Each file should contain a single resource or a tightly related group of resources.

**Use consistent labeling** - Apply the same labels across all files so ArgoCD can track them properly:

```yaml
metadata:
  labels:
    app.kubernetes.io/name: payment-api
    app.kubernetes.io/part-of: payment-service
    app.kubernetes.io/managed-by: argocd
```

**Version control everything** - Every file in the directory is part of the deployment. Review changes carefully in pull requests.

**Document the directory** - Add a README.md (which ArgoCD ignores) explaining the directory structure and what each file does.

For more on directory source configuration, see [directory recursion](https://oneuptime.com/blog/post/2026-02-26-argocd-directory-recursion/view) and [include/exclude patterns](https://oneuptime.com/blog/post/2026-02-26-argocd-include-exclude-files-directory/view).
