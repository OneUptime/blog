# How to Migrate from kubectl Apply to ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Migration, kubectl

Description: Learn how to migrate from manual kubectl apply deployments to ArgoCD GitOps with a practical step-by-step guide covering manifest extraction, repository setup, and adoption.

---

Most Kubernetes journeys start with `kubectl apply`. You have a YAML file, you run the command, and your application is deployed. Simple. But as your cluster grows, this approach breaks down. Nobody knows what is running where, there is no audit trail, drift goes undetected, and deployments depend on whoever has the right kubeconfig on their laptop.

Migrating from `kubectl apply` to ArgoCD gives you a centralized, auditable, self-healing deployment system. In this guide, I will walk through the migration process step by step.

## Why Move from kubectl Apply to ArgoCD

The problems with `kubectl apply` as a deployment strategy become apparent at scale:

- No single source of truth - YAML files live on different laptops
- No audit trail - `kubectl apply` does not record who deployed what
- No drift detection - manual changes in the cluster go unnoticed
- No rollback mechanism - you hope someone has the previous YAML
- No access control - anyone with cluster access can deploy anything
- No visibility - no dashboard showing what is deployed where

ArgoCD solves all of these by making Git the single source of truth and continuously reconciling cluster state with the desired state in Git.

## Step 1: Extract Current State

First, document everything that is currently running. The challenge is that `kubectl apply` leaves no organized record of what was deployed.

```bash
# Export all resources from a namespace
kubectl get all -n production -o yaml > production-all.yaml

# Export specific resource types
kubectl get deployments -n production -o yaml > production-deployments.yaml
kubectl get services -n production -o yaml > production-services.yaml
kubectl get configmaps -n production -o yaml > production-configmaps.yaml
kubectl get ingress -n production -o yaml > production-ingress.yaml
kubectl get pdb -n production -o yaml > production-pdb.yaml
```

Clean up the exported YAML by removing runtime fields that Kubernetes adds.

```bash
# Use a tool like kubectl-neat to clean up exports
# Install: kubectl krew install neat
kubectl get deployment my-app -n production -o yaml | kubectl neat > my-app-deployment.yaml
```

Or write a script to strip common runtime fields.

```bash
#!/bin/bash
# clean-manifest.sh
# Removes runtime fields from Kubernetes manifests

yq eval 'del(
  .metadata.resourceVersion,
  .metadata.uid,
  .metadata.creationTimestamp,
  .metadata.generation,
  .metadata.managedFields,
  .metadata.annotations."kubectl.kubernetes.io/last-applied-configuration",
  .metadata.annotations."deployment.kubernetes.io/revision",
  .status
)' "$1"
```

## Step 2: Organize Into a GitOps Repository

Create a repository structure that ArgoCD can work with.

```text
gitops-repo/
  apps/
    production/
      api/
        deployment.yaml
        service.yaml
        configmap.yaml
        ingress.yaml
        pdb.yaml
      frontend/
        deployment.yaml
        service.yaml
        ingress.yaml
      worker/
        deployment.yaml
        configmap.yaml
    staging/
      api/
        kustomization.yaml  # Patches for staging differences
      frontend/
        kustomization.yaml
```

For each application, place the cleaned manifests in the appropriate directory.

```yaml
# apps/production/api/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
  labels:
    app: api
    team: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: registry.myorg.com/api:v2.1.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
```

## Step 3: Validate Manifests Match Cluster State

Before connecting ArgoCD, verify that your Git manifests match what is actually running.

```bash
# Dry-run apply to see if there are differences
kubectl diff -f apps/production/api/

# If using Kustomize
kubectl diff -k apps/production/api/
```

Fix any differences until `kubectl diff` shows no output. This ensures that when ArgoCD takes over, it will not immediately trigger changes.

## Step 4: Install ArgoCD

If ArgoCD is not already installed, set it up. See our guide on [installing ArgoCD on Kubernetes](https://oneuptime.com/blog/post/2026-01-25-install-argocd-kubernetes/view).

## Step 5: Create ArgoCD Applications

Start with manual sync mode so ArgoCD observes but does not change anything.

```yaml
# argocd-applications/production-api.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-api
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/myorg/gitops-repo.git
    path: apps/production/api
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  # Start with manual sync
  syncPolicy:
    syncOptions:
      - Validate=true
      - CreateNamespace=false
```

Apply the ArgoCD Application.

```bash
kubectl apply -f argocd-applications/production-api.yaml
```

## Step 6: Verify Sync Status

Check ArgoCD to see if it shows the application as Synced. If it shows OutOfSync, investigate the differences.

```bash
# Check sync status
argocd app get production-api

# See what differences ArgoCD detects
argocd app diff production-api
```

Common differences you will encounter:

**Annotation differences**: kubectl apply adds `kubectl.kubernetes.io/last-applied-configuration`. ArgoCD can ignore this.

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration
```

**Default values**: Kubernetes adds defaults that are not in your manifests. Add them to your manifests or configure ArgoCD to ignore them.

**Status fields**: These should already be stripped from your Git manifests.

## Step 7: Migrate One Application at a Time

Do not try to migrate everything at once. Pick a low-risk application first.

```yaml
# Migration order:
# 1. Development/staging applications (low risk)
# 2. Internal tools and dashboards (medium risk)
# 3. Non-critical production services (medium risk)
# 4. Critical production services (high risk, migrate last)
```

For each application, follow this checklist.

```bash
# 1. Create ArgoCD Application (manual sync mode)
kubectl apply -f argocd-applications/my-app.yaml

# 2. Verify it shows as Synced
argocd app get my-app

# 3. If Synced, do a test sync (should be a no-op)
argocd app sync my-app --dry-run

# 4. If dry run shows no changes, do the actual sync
argocd app sync my-app

# 5. Verify application health
argocd app get my-app

# 6. After validation period, enable auto-sync
# Edit the Application to add syncPolicy.automated
```

## Step 8: Update Deployment Workflows

Replace `kubectl apply` in your CI/CD pipelines with Git commits.

Before (CI/CD pipeline):
```bash
# Old way
kubectl apply -f deployment.yaml
```

After (CI/CD pipeline):
```bash
# New way - update the Git repository
git clone https://github.com/myorg/gitops-repo.git
cd gitops-repo
# Update the image tag
yq eval '.spec.template.spec.containers[0].image = "registry.myorg.com/api:v2.2.0"' \
  -i apps/production/api/deployment.yaml
git add .
git commit -m "deploy: api v2.2.0"
git push
# ArgoCD takes it from here
```

## Step 9: Enable Auto-Sync Gradually

After each application has been running under ArgoCD for at least a few days without issues, enable auto-sync.

```yaml
spec:
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 1m
```

## Step 10: Revoke Direct kubectl Access

The final step is restricting direct `kubectl apply` access so that all changes go through Git and ArgoCD.

```yaml
# RBAC: Remove write access for developers
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: developer-readonly
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]  # Read-only
```

This prevents people from bypassing ArgoCD with `kubectl apply`, which would create drift.

## Handling the Transition Period

During migration, you will have some applications on ArgoCD and some still using `kubectl apply`. Document the current state clearly.

```bash
# Check which applications are ArgoCD-managed
argocd app list -o name

# Check which namespaces have un-managed resources
# (Resources not tracked by any ArgoCD application)
```

## Conclusion

Migrating from `kubectl apply` to ArgoCD is the most impactful operational improvement you can make in a Kubernetes environment. The process is straightforward: extract current state, organize it into a Git repository, create ArgoCD Applications, verify sync, and gradually enable auto-sync. The key is doing it incrementally - one application at a time, starting with low-risk workloads. Within a few weeks, you will have a fully auditable, self-healing deployment system that makes the old `kubectl apply` workflow feel like the dark ages.
