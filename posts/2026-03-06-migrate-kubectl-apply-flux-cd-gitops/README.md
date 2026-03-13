# How to Migrate from kubectl apply to Flux CD GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, kubectl, Migration, Kubernetes, GitOps, Deployments, Infrastructure as Code

Description: A step-by-step guide to migrating from manual kubectl apply workflows to automated Flux CD GitOps-based deployment.

---

## Introduction

Many teams start deploying to Kubernetes using `kubectl apply` commands, either manually or through CI/CD scripts. While this works initially, it leads to configuration drift, lack of auditability, and inconsistent deployments as teams grow. Migrating to Flux CD GitOps means your Git repository becomes the single source of truth, with Flux automatically reconciling your cluster state to match what is declared in Git.

## Why Migrate from kubectl apply

Manual `kubectl apply` workflows have several drawbacks:

- **Configuration drift**: Cluster state diverges from what is in version control
- **No audit trail**: Hard to track who changed what and when
- **Inconsistent deployments**: Different team members may apply different versions
- **No automatic recovery**: If someone manually modifies a resource, it stays modified
- **Manual rollbacks**: Reverting changes requires finding and reapplying old manifests

Flux CD addresses all of these by continuously reconciling your cluster with your Git repository.

## Prerequisites

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify prerequisites
flux check --pre

# Ensure you have a Git repository for your manifests
# This guide assumes you already have YAML manifests used with kubectl
```

## Step 1: Organize Your Existing Manifests

First, restructure your existing Kubernetes manifests into a Git-friendly directory layout.

```bash
# Typical starting point: scattered YAML files
# Before migration:
# manifests/
#   app.yaml           (deployment + service mixed)
#   database.yaml      (statefulset + service + pvc)
#   ingress.yaml
#   configmap.yaml
#   secrets.yaml

# Recommended structure for Flux CD:
# clusters/
#   production/
#     flux-system/        (Flux bootstrap files)
#     apps/               (application Kustomizations)
#       my-app.yaml
#       database.yaml
# apps/
#   my-app/
#     deployment.yaml
#     service.yaml
#     configmap.yaml
#     kustomization.yaml
#   database/
#     statefulset.yaml
#     service.yaml
#     pvc.yaml
#     kustomization.yaml
# infrastructure/
#   ingress/
#     ingress.yaml
#     kustomization.yaml
```

### Create Kustomization Files

Add `kustomization.yaml` files to each application directory so Flux can manage them.

```yaml
# apps/my-app/kustomization.yaml
# Lists all resources in this directory for Kustomize
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

## Step 2: Prepare Your Manifests

Clean up your YAML manifests before importing them into the Flux-managed repository.

```yaml
# apps/my-app/deployment.yaml
# Clean deployment manifest without kubectl-specific annotations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
  labels:
    app: my-app
    # Add labels to help Flux track the resource
    app.kubernetes.io/name: my-app
    app.kubernetes.io/managed-by: flux
spec:
  replicas: 3
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
          image: myregistry/my-app:1.2.3
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          # Health checks for reliable deployments
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
```

```yaml
# apps/my-app/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: default
  labels:
    app: my-app
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
  selector:
    app: my-app
```

```yaml
# apps/my-app/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  namespace: default
data:
  APP_ENV: production
  LOG_LEVEL: info
  API_TIMEOUT: "30"
```

## Step 3: Bootstrap Flux CD

Bootstrap Flux into your cluster, connecting it to your Git repository.

```bash
# Bootstrap Flux with GitHub
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-config \
  --path=clusters/production \
  --branch=main \
  --personal

# Or bootstrap with a generic Git provider
flux bootstrap git \
  --url=ssh://git@git.example.com/org/fleet-config.git \
  --path=clusters/production \
  --branch=main
```

This command:
- Installs Flux controllers in the `flux-system` namespace
- Creates a `GitRepository` source pointing to your repository
- Creates a `Kustomization` to sync the specified path

## Step 4: Create Flux Kustomizations for Your Applications

Define Flux `Kustomization` resources that point to your application directories.

```yaml
# clusters/production/apps/my-app.yaml
# Flux Kustomization to manage the my-app application
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  # How often Flux reconciles this application
  interval: 10m
  # Reference to the Git repository source
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Path to the application manifests
  path: ./apps/my-app
  # Automatically delete resources removed from Git
  prune: true
  # Wait for resources to become ready
  wait: true
  # Timeout for health checks
  timeout: 5m
  # Target namespace (if not specified in manifests)
  # targetNamespace: default
```

```yaml
# clusters/production/apps/database.yaml
# Flux Kustomization for the database components
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/database
  prune: true
  wait: true
  timeout: 5m
  # Ensure database is deployed before the app
  # The my-app Kustomization can depend on this
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: postgres
      namespace: default
```

### Set Up Dependencies Between Applications

```yaml
# clusters/production/apps/my-app.yaml
# Updated with dependency on the database
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  # Wait for database to be ready before deploying the app
  dependsOn:
    - name: database
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
  prune: true
  wait: true
  timeout: 5m
```

## Step 5: Handle Existing Resources (Adoption)

When Flux applies manifests for resources that already exist in the cluster (created earlier via `kubectl apply`), it needs to adopt them.

```bash
# Check for existing resources that will conflict
kubectl get deployment my-app -n default -o yaml | grep "last-applied"

# Flux will adopt existing resources if the manifests match
# If there are annotation conflicts, you may need to remove
# the kubectl last-applied-configuration annotation
kubectl annotate deployment my-app -n default \
  kubectl.kubernetes.io/last-applied-configuration-
```

For resources with field conflicts, use server-side apply:

```yaml
# clusters/production/apps/my-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
  prune: true
  wait: true
  # Use server-side apply for clean adoption of existing resources
  force: true
```

## Step 6: Migrate Secrets

Secrets require special handling since they should not be stored in plain text in Git.

```bash
# Install Mozilla SOPS for secret encryption
brew install sops

# Generate a GPG key or use an existing one for encryption
gpg --batch --full-generate-key <<EOF
%no-protection
Key-Type: RSA
Key-Length: 4096
Name-Real: flux-sops
Name-Email: flux@example.com
Expire-Date: 0
EOF

# Export the public key fingerprint
gpg --list-keys flux@example.com
```

```yaml
# .sops.yaml
# SOPS configuration file at the root of your repository
creation_rules:
  - path_regex: .*\.encrypted\.yaml$
    pgp: YOUR_GPG_KEY_FINGERPRINT
```

```yaml
# apps/my-app/secret.encrypted.yaml
# This file is encrypted with SOPS before committing
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  namespace: default
type: Opaque
stringData:
  DATABASE_URL: postgresql://user:password@postgres:5432/mydb
  API_KEY: my-secret-api-key
```

```bash
# Encrypt the secret before committing
sops --encrypt --in-place apps/my-app/secret.encrypted.yaml

# Configure Flux decryption
flux create kustomization my-app \
  --source=flux-system \
  --path=./apps/my-app \
  --prune=true \
  --interval=10m \
  --decryption-provider=sops \
  --decryption-secret=sops-gpg \
  --export > clusters/production/apps/my-app.yaml
```

## Step 7: Replace CI/CD kubectl Commands

Update your CI/CD pipelines to push to Git instead of running `kubectl apply`.

```yaml
# BEFORE: CI/CD pipeline using kubectl apply
# .github/workflows/deploy.yaml (old approach)
# jobs:
#   deploy:
#     steps:
#       - run: kubectl apply -f manifests/

# AFTER: CI/CD pipeline pushing to Git (GitOps approach)
# .github/workflows/deploy.yaml
name: Deploy
on:
  push:
    branches: [main]
    paths: ["apps/**"]
jobs:
  update-image:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Update image tag
        run: |
          # Update the image tag in the deployment manifest
          cd apps/my-app
          sed -i "s|image: myregistry/my-app:.*|image: myregistry/my-app:${GITHUB_SHA::8}|" deployment.yaml
      - name: Commit and push
        run: |
          git config user.name "CI Bot"
          git config user.email "ci@example.com"
          git add apps/my-app/deployment.yaml
          git commit -m "Update my-app image to ${GITHUB_SHA::8}"
          git push origin main
```

## Step 8: Verify the Migration

After committing all manifests and Flux Kustomizations, verify the migration.

```bash
# Check that Flux has synced the Git repository
flux get sources git -A

# Check that Kustomizations are reconciling
flux get kustomizations -A

# Verify specific resources are managed by Flux
kubectl get deployment my-app -n default \
  -o jsonpath='{.metadata.labels.kustomize\.toolkit\.fluxcd\.io/name}'

# Force a reconciliation to test
flux reconcile kustomization my-app -n flux-system --with-source

# Watch the reconciliation in real time
flux get kustomization my-app -w
```

## Step 9: Enable Drift Detection and Correction

One of the key benefits of Flux over `kubectl apply` is automatic drift correction.

```bash
# Test drift detection by manually modifying a resource
kubectl scale deployment my-app --replicas=1

# Wait for Flux to detect and correct the drift
# (within the reconciliation interval)
flux get kustomization my-app -w

# Verify the replica count was restored
kubectl get deployment my-app -n default
```

## Migration Workflow Summary

```mermaid
graph TD
    A[Existing kubectl apply workflow] --> B[Organize manifests in Git]
    B --> C[Add kustomization.yaml files]
    C --> D[Bootstrap Flux CD]
    D --> E[Create Flux Kustomizations]
    E --> F[Adopt existing resources]
    F --> G[Encrypt and migrate secrets]
    G --> H[Update CI/CD pipelines]
    H --> I[Verify and monitor]
    I --> J[Decommission kubectl scripts]
```

## Conclusion

Migrating from `kubectl apply` to Flux CD GitOps transforms your deployment workflow from imperative commands to declarative, version-controlled configurations. The migration can be done incrementally, one application at a time, allowing your team to gain confidence with the GitOps approach. Once complete, you gain automatic drift detection, full audit trails through Git history, and consistent deployments across all environments.
