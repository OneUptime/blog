# How to Configure Fleet Raw YAML Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, YAML

Description: Learn how to deploy raw Kubernetes YAML manifests using Fleet, including directory organization, fleet.yaml configuration, and multi-cluster targeting.

## Introduction

The simplest way to use Fleet is to deploy raw Kubernetes YAML manifests directly from a Git repository. Without a `Chart.yaml` or `kustomization.yaml`, Fleet watches a directory in Git and deploys the YAML resources found there to your target clusters. This approach is ideal for straightforward deployments where you want direct control over your Kubernetes resources.

## Prerequisites

- Fleet installed in Rancher
- `kubectl` access to Fleet manager
- A Git repository with Kubernetes YAML manifests
- Target clusters registered in Fleet

## Understanding Raw YAML in Fleet

When Fleet encounters a directory without a `Chart.yaml` or `kustomization.yaml`, it treats `.yaml` and `.yml` files in that path as raw Kubernetes resources. For raw YAML bundles, Fleet supports per-target customization through the special `overlays/` directory.

## Organizing Your Repository

A well-organized repository structure makes managing raw YAML deployments easier:

```text
k8s-configs/
├── namespaces/
│   ├── fleet.yaml
│   └── namespaces.yaml
├── apps/
│   ├── frontend/
│   │   ├── fleet.yaml
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── overlays/
│   │   │   └── staging/
│   │   │       └── deployment_patch.yaml
│   │   └── ingress.yaml
│   ├── backend/
│   │   ├── fleet.yaml
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── database/
│       ├── fleet.yaml
│       ├── statefulset.yaml
│       ├── service.yaml
│       └── pvc.yaml
└── infrastructure/
    ├── monitoring/
    │   ├── fleet.yaml
    │   └── prometheus-stack.yaml
    └── networking/
        ├── fleet.yaml
        └── network-policies.yaml
```

## Creating Raw YAML Manifests

### Namespace Manifest

```yaml
# namespaces/namespaces.yaml

---
apiVersion: v1
kind: Namespace
metadata:
  name: frontend
  labels:
    team: frontend
    managed-by: fleet
---
apiVersion: v1
kind: Namespace
metadata:
  name: backend
  labels:
    team: backend
    managed-by: fleet
```

### Application Manifests

```yaml
# apps/frontend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: frontend
  labels:
    app: frontend
spec:
  replicas: 2
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
          image: my-registry/frontend:v2.1.0
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
```

```yaml
# apps/frontend/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: frontend
spec:
  selector:
    app: frontend
  ports:
    - name: http
      port: 80
      targetPort: 3000
  type: ClusterIP
```

## Configuring fleet.yaml for Raw YAML

The `fleet.yaml` file provides bundle configuration, and can optionally override the `GitRepo` targets for a specific bundle:

```yaml
# apps/frontend/fleet.yaml

# Force all resources into a specific namespace
# (overrides namespaces in individual YAML files)
# namespace: frontend

# Default namespace if resources don't specify one
defaultNamespace: frontend

# Optional: override the GitRepo targets for this bundle
# overrideTargets:
#   - clusterSelector:
#       matchLabels:
#         managed: "true"
```

### fleet.yaml with Per-Target Patches

For raw YAML, use `targetCustomizations` with `yaml.overlays` to vary configs per cluster:

```yaml
# apps/frontend/fleet.yaml - With raw YAML overlays per target
defaultNamespace: frontend

targetCustomizations:
  # Staging: scale down replicas
  - name: staging
    clusterSelector:
      matchLabels:
        env: staging
    yaml:
      overlays:
        - staging

  # Production: leave defaults
  - name: production
    clusterSelector:
      matchLabels:
        env: production
```

```yaml
# apps/frontend/overlays/staging/deployment_patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
```

## Creating the GitRepo for Raw YAML

```yaml
# gitrepo-raw-yaml.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: k8s-configs
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/k8s-configs
  branch: main

  # Deploy from multiple directories
  paths:
    - namespaces
    - apps/frontend
    - apps/backend
    - infrastructure/networking

  targets:
    - clusterSelector: {}
```

```bash
# Apply the GitRepo
kubectl apply -f gitrepo-raw-yaml.yaml

# Monitor sync status
kubectl get gitrepo k8s-configs -n fleet-default -w
```

## Handling Multiple YAML Files in a Directory

Fleet applies all YAML files in a directory that are not excluded by `.fleetignore`. Use clear file names for readability, but do not rely on alphabetical names to control deployment order:

```bash
# All these files will be applied by Fleet as one bundle
ls apps/frontend/
# 00-namespace.yaml        <- Naming can help humans scan the bundle
# 10-configmap.yaml
# 20-deployment.yaml
# 30-service.yaml
# 40-ingress.yaml
# fleet.yaml               <- Fleet config, not a K8s manifest
```

## Excluding Files from Deployment

You can exclude specific files from Fleet processing using `.fleetignore`:

```bash
# Create a .fleetignore file (works like .gitignore)
cat > apps/frontend/.fleetignore <<EOF
# Ignore local testing files
local-test.yaml
debug-pod.yaml
# Ignore files with the .bak extension
*.bak
EOF
```

## Verifying Raw YAML Deployments

```bash
# Check the bundle status
kubectl get bundle -n fleet-default

# Get details of deployed bundle
kubectl describe bundle k8s-configs-apps-frontend -n fleet-default

# Verify resources on downstream cluster
# (Switch context to downstream cluster)
kubectl get all -n frontend
```

## Conclusion

Deploying raw Kubernetes YAML with Fleet is the most straightforward GitOps approach available. By simply storing your manifests in Git and creating a GitRepo resource, Fleet takes care of synchronizing your desired state across all target clusters. While raw YAML lacks the templating capabilities of Helm, it offers maximum clarity and simplicity - you see exactly what will be applied to your clusters. For teams just getting started with GitOps or managing relatively stable configurations, raw YAML deployments with Fleet are an excellent choice.
