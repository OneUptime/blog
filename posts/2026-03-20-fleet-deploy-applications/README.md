# How to Deploy Applications with Fleet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Deployment

Description: A practical guide to deploying applications across multiple Kubernetes clusters using Fleet's GitOps-based continuous delivery system.

## Introduction

Fleet enables you to deploy and manage applications across multiple Kubernetes clusters using a GitOps model. By storing your application configurations in Git and pointing Fleet at those repositories, you gain automated, consistent deployments with full audit trails.

This guide demonstrates how to deploy a real-world application using Fleet, covering the repository structure, fleet.yaml configuration, multi-cluster targeting, and deployment validation.

## Prerequisites

- Fleet installed and configured in Rancher
- One or more Kubernetes clusters registered in Fleet
- A Git repository (GitHub, GitLab, Bitbucket, etc.)
- `kubectl` access to the upstream cluster where Fleet is installed

## Setting Up Your Application Repository

For this example, the repository contains Kubernetes manifests. Organize your repository for clarity:

```text
my-app/
├── fleet.yaml          # Fleet bundle configuration
├── deployment.yaml     # Kubernetes Deployment
├── service.yaml        # Kubernetes Service
├── configmap.yaml      # Application configuration
└── namespace.yaml      # Namespace definition
```

### Creating the Application Manifests

```yaml
# namespace.yaml - Define the application namespace

apiVersion: v1
kind: Namespace
metadata:
  name: my-app
```

```yaml
# configmap.yaml - Application configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  namespace: my-app
data:
  APP_ENV: "production"
  LOG_LEVEL: "info"
  DATABASE_HOST: "postgres.my-app.svc.cluster.local"
```

```yaml
# deployment.yaml - Application Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
  labels:
    app: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: nginx:1.25
          ports:
            - containerPort: 80
          envFrom:
            - configMapRef:
                name: my-app-config
```

```yaml
# service.yaml - Expose the application
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

## Creating the fleet.yaml Bundle Configuration

The `fleet.yaml` file in each directory tells Fleet how to handle the resources:

```yaml
# fleet.yaml - Fleet bundle configuration
defaultNamespace: my-app
```

## Creating the Fleet GitRepo Resource

```yaml
# gitrepo-my-app.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/my-app
  branch: main

  # Target all clusters
  targets:
    - clusterSelector: {}
```

```bash
# Create the GitRepo in Fleet
kubectl apply -f gitrepo-my-app.yaml

# Watch the deployment progress
kubectl get gitrepo my-app -n fleet-default -w
```

## Deploying Across Multiple Environments

Structure your repository for multi-environment deployments:

```text
my-app/
├── base/
│   ├── fleet.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── overlays/
│   ├── staging/
│   │   ├── fleet.yaml
│   │   └── kustomization.yaml
│   └── production/
│       ├── fleet.yaml
│       └── kustomization.yaml
```

```yaml
# gitrepo-multi-env.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app-staging
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/my-app
  branch: main
  # Deploy the staging overlay only to staging clusters
  paths:
    - overlays/staging

  targets:
    - name: staging
      clusterSelector:
        matchLabels:
          env: staging
---
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app-production
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/my-app
  branch: main
  # Deploy the production overlay only to production clusters
  paths:
    - overlays/production

  targets:
    - name: production
      clusterSelector:
        matchLabels:
          env: production
```

## Verifying Deployments

After creating the GitRepo, verify the deployment status:

```bash
# Check the GitRepo sync status
kubectl get gitrepo my-app -n fleet-default

# List bundles created by Fleet
kubectl get bundles -n fleet-default

# Check bundle deployments on specific clusters
kubectl get bundledeployments -A

# Verify the application is running on a downstream cluster
# (Switch kubectl context to downstream cluster first)
kubectl get pods -n my-app
kubectl get svc -n my-app
```

## Updating an Application

To update your application, simply push changes to Git:

```bash
# On your local machine, update the deployment image
# Edit deployment.yaml to change image: nginx:1.25 -> nginx:1.26

git add deployment.yaml
git commit -m "Update nginx to 1.26"
git push origin main

# Fleet will automatically detect and apply the change
# Monitor the rollout
kubectl get gitrepo my-app -n fleet-default -w
```

## Rolling Back a Deployment

To roll back, revert the Git commit:

```bash
# Revert the last commit in Git
git revert HEAD
git push origin main

# Fleet will automatically roll back the deployment
```

## Monitoring Deployment Health

```bash
# Check overall Fleet bundle health
kubectl get bundles -n fleet-default -o wide

# Get detailed bundle status
# Use a bundle name from `kubectl get bundles -n fleet-default`
kubectl describe bundle your-bundle-name -n fleet-default

# Check events for deployment issues
kubectl get events -n fleet-default --sort-by='.metadata.creationTimestamp'
```

## Conclusion

Fleet makes deploying applications across multiple Kubernetes clusters straightforward by treating Git as the single source of truth. By pushing your manifests to Git and creating a GitRepo resource, Fleet handles the complexity of keeping your clusters synchronized. As your environment scales, Fleet's targeting capabilities allow you to control exactly which clusters receive which versions of your applications, giving you fine-grained control with minimal manual intervention.
