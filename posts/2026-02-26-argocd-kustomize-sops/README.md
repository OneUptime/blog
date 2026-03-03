# How to Manage Secrets with ArgoCD and Kustomize SOPS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kustomize, SOPS

Description: Learn how to combine Kustomize overlays with SOPS-encrypted secrets in ArgoCD using KSOPS for environment-specific secret management in a GitOps workflow.

---

Kustomize is the default manifest management tool in ArgoCD, and SOPS is one of the best ways to encrypt secrets for Git storage. Together, they create a powerful pattern for managing environment-specific secrets in a GitOps workflow. This guide focuses specifically on the Kustomize plus SOPS integration, using KSOPS as the glue between them.

## What Is KSOPS

KSOPS (Kustomize Secret Operations) is a Kustomize exec plugin that integrates SOPS decryption into the Kustomize build process. When ArgoCD runs Kustomize to generate manifests, KSOPS intercepts SOPS-encrypted files, decrypts them, and passes the plaintext to Kustomize.

```mermaid
graph LR
    A[ArgoCD Sync] --> B[Kustomize Build]
    B --> C[KSOPS Plugin]
    C --> D[SOPS Decrypt]
    D -->|AGE/KMS key| E[Plaintext Secret]
    E --> F[Kubernetes Secret]
    B --> G[Other Resources]
    G --> H[Deployments, Services, etc.]
```

## Setting Up the ArgoCD Repo Server

The ArgoCD repo server needs KSOPS installed and configured with the decryption key.

### Build a Custom Repo Server Image

The cleanest approach is to build a custom repo server image:

```dockerfile
# Dockerfile
FROM quay.io/argoproj/argocd:v2.13.0

# Switch to root to install
USER root

# Install KSOPS
ARG KSOPS_VERSION=v4.3.2
ADD https://github.com/viaductoss/ksops/releases/download/${KSOPS_VERSION}/ksops_${KSOPS_VERSION}_Linux_x86_64.tar.gz /tmp/ksops.tar.gz
RUN tar -xzf /tmp/ksops.tar.gz -C /usr/local/bin/ ksops && \
    chmod +x /usr/local/bin/ksops && \
    rm /tmp/ksops.tar.gz

# Install SOPS
ARG SOPS_VERSION=v3.9.0
ADD https://github.com/getsops/sops/releases/download/${SOPS_VERSION}/sops-${SOPS_VERSION}.linux.amd64 /usr/local/bin/sops
RUN chmod +x /usr/local/bin/sops

# Switch back to argocd user
USER argocd
```

Build and push:

```bash
docker build -t your-registry/argocd-ksops:v2.13.0 .
docker push your-registry/argocd-ksops:v2.13.0
```

### Configure the Repo Server

Update the repo server deployment to use your custom image and mount the AGE key:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          image: your-registry/argocd-ksops:v2.13.0
          env:
            - name: SOPS_AGE_KEY_FILE
              value: /sops/age/keys.txt
            - name: XDG_CONFIG_HOME
              value: /home/argocd/.config
          volumeMounts:
            - name: sops-age
              mountPath: /sops/age
              readOnly: true
      volumes:
        - name: sops-age
          secret:
            secretName: sops-age-key
```

Create the decryption key secret:

```bash
# Generate an AGE key pair if you do not have one
age-keygen -o age-key.txt

# Store the private key in the cluster
kubectl create secret generic sops-age-key \
  --namespace argocd \
  --from-file=keys.txt=age-key.txt
```

## Repository Structure

Here is a complete repository structure for a multi-environment application with SOPS-encrypted secrets:

```text
my-app/
  base/
    deployment.yaml
    service.yaml
    configmap.yaml
    kustomization.yaml
  overlays/
    dev/
      kustomization.yaml
      secret-generator.yaml
      secret.enc.yaml
    staging/
      kustomization.yaml
      secret-generator.yaml
      secret.enc.yaml
    production/
      kustomization.yaml
      secret-generator.yaml
      secret.enc.yaml
  .sops.yaml
```

## Creating the SOPS Configuration

```yaml
# .sops.yaml (in repository root)
creation_rules:
  # Dev secrets - encrypted with dev key
  - path_regex: overlays/dev/.*\.enc\.yaml$
    age: "age1dev..."

  # Staging secrets - encrypted with staging key
  - path_regex: overlays/staging/.*\.enc\.yaml$
    age: "age1staging..."

  # Production secrets - encrypted with production key
  - path_regex: overlays/production/.*\.enc\.yaml$
    age: "age1prod..."

  # Default rule
  - age: "age1default..."
```

## Creating Encrypted Secrets

### Write the Plaintext Secret

```yaml
# secret.yaml (temporary - do not commit this)
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  namespace: app
type: Opaque
stringData:
  DB_HOST: db.production.internal
  DB_PASSWORD: production-password-here
  API_KEY: prod-api-key-12345
  REDIS_PASSWORD: redis-pass-456
```

### Encrypt with SOPS

```bash
# Encrypt using .sops.yaml rules (path determines which key is used)
cd overlays/production/
sops --encrypt ../../secret.yaml > secret.enc.yaml

# Verify the encryption
cat secret.enc.yaml
# Values should be encrypted, keys should be readable

# Delete the plaintext
rm ../../secret.yaml
```

## Configuring Kustomize with KSOPS

### Base Kustomization

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

### Overlay Kustomization with KSOPS Generator

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: app-production

resources:
  - ../../base

generators:
  - secret-generator.yaml

patches:
  - target:
      kind: Deployment
      name: my-app
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/envFrom/-
        value:
          secretRef:
            name: my-app-secrets
```

### KSOPS Generator Definition

```yaml
# overlays/production/secret-generator.yaml
apiVersion: viaduct.ai/v1
kind: ksops
metadata:
  name: my-app-secrets-generator
  annotations:
    config.kubernetes.io/function: |
      exec:
        path: ksops
files:
  - secret.enc.yaml
```

## ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/manifests.git
    path: my-app/overlays/production
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: app-production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

When ArgoCD syncs this application, it runs Kustomize, which invokes KSOPS, which decrypts the SOPS file, and the plaintext secret is deployed to the cluster.

## Multiple Encrypted Files

You can have multiple encrypted files per environment:

```yaml
# overlays/production/secret-generator.yaml
apiVersion: viaduct.ai/v1
kind: ksops
metadata:
  name: secrets-generator
  annotations:
    config.kubernetes.io/function: |
      exec:
        path: ksops
files:
  - db-secret.enc.yaml
  - api-secret.enc.yaml
  - tls-secret.enc.yaml
```

## Updating Encrypted Secrets

When you need to change a secret value:

```bash
# Edit the encrypted file directly (SOPS opens it decrypted in your editor)
cd overlays/production/
SOPS_AGE_KEY_FILE=~/age-key.txt sops secret.enc.yaml

# Or decrypt, edit, and re-encrypt
SOPS_AGE_KEY_FILE=~/age-key.txt sops --decrypt secret.enc.yaml > secret.yaml
# Edit secret.yaml
SOPS_AGE_KEY_FILE=~/age-key.txt sops --encrypt secret.yaml > secret.enc.yaml
rm secret.yaml

# Commit and push
git add secret.enc.yaml
git commit -m "Rotate production database password"
git push
```

ArgoCD detects the change and syncs automatically (if auto-sync is enabled).

## Handling Different Secret Types

### TLS Secrets

```yaml
# tls-secret.yaml (before encryption)
apiVersion: v1
kind: Secret
metadata:
  name: app-tls
  namespace: app
type: kubernetes.io/tls
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    MIIBhTCCAS...
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN PRIVATE KEY-----
    MIIEvQIBAD...
    -----END PRIVATE KEY-----
```

### Docker Registry Secrets

```yaml
# registry-secret.yaml (before encryption)
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
  namespace: app
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "your-registry.example.com": {
          "username": "deploy",
          "password": "registry-password"
        }
      }
    }
```

## CI/CD Pipeline Integration

In your CI pipeline, encrypt secrets before committing:

```yaml
# GitHub Actions example
name: Update Secrets
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - dev
          - staging
          - production

jobs:
  update-secret:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install SOPS
        run: |
          curl -LO https://github.com/getsops/sops/releases/download/v3.9.0/sops-v3.9.0.linux.amd64
          chmod +x sops-v3.9.0.linux.amd64
          sudo mv sops-v3.9.0.linux.amd64 /usr/local/bin/sops

      - name: Encrypt and commit
        env:
          SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY }}
        run: |
          echo "$SOPS_AGE_KEY" > /tmp/age-key.txt
          export SOPS_AGE_KEY_FILE=/tmp/age-key.txt
          sops --encrypt secret.yaml > overlays/${{ inputs.environment }}/secret.enc.yaml
          git add overlays/${{ inputs.environment }}/secret.enc.yaml
          git commit -m "Update ${{ inputs.environment }} secrets"
          git push
```

## Troubleshooting

```bash
# Verify KSOPS is available in the repo server
kubectl exec -n argocd deployment/argocd-repo-server -- which ksops

# Check SOPS is available
kubectl exec -n argocd deployment/argocd-repo-server -- sops --version

# Verify AGE key is mounted
kubectl exec -n argocd deployment/argocd-repo-server -- cat /sops/age/keys.txt | head -1

# Check repo server logs for decryption errors
kubectl logs -n argocd deployment/argocd-repo-server | grep -iE "sops|ksops|decrypt|age"

# Test decryption manually
kubectl exec -n argocd deployment/argocd-repo-server -- \
  env SOPS_AGE_KEY_FILE=/sops/age/keys.txt sops --decrypt /tmp/test-secret.enc.yaml
```

## Conclusion

Kustomize with SOPS through KSOPS provides a native Kustomize experience for encrypted secrets in ArgoCD. The key benefits are readable diffs (only values are encrypted), environment-specific encryption keys, and seamless integration with Kustomize overlays. The setup requires a custom repo server image with KSOPS and SOPS installed, plus the decryption key mounted as a secret. Once configured, the workflow is simple: encrypt secrets with SOPS, commit to Git, and let ArgoCD handle the rest.

For more on secret management, see our guides on [using SOPS with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-sops-secrets/view) and [using External Secrets Operator with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-external-secrets-operator/view).
