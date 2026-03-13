# How to Encrypt Docker Registry Credentials with SOPS for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, Docker, Container Registry, Image Pull

Description: Learn how to encrypt Docker registry credentials with SOPS and manage image pull secrets through Flux for private container registries.

---

Pulling container images from private registries requires authentication credentials stored as Kubernetes image pull secrets. In a GitOps workflow with Flux, these credentials need to be committed to your Git repository. SOPS encryption ensures these sensitive credentials are protected at rest while Flux handles decryption during deployment. This guide covers the complete process.

## Understanding Image Pull Secrets

Kubernetes uses secrets of type `kubernetes.io/dockerconfigjson` to authenticate with private container registries. These secrets contain a JSON configuration with registry URLs, usernames, passwords, and optionally email addresses. Storing these credentials unencrypted in Git is a security risk.

## Prerequisites

Ensure you have:

- A Kubernetes cluster with Flux installed
- SOPS and age CLI tools
- Credentials for your private container registry
- An age key pair configured in Flux for SOPS decryption

## Creating the Registry Secret Manifest

First, generate the Docker config JSON and create a Kubernetes secret manifest:

```bash
kubectl create secret docker-registry registry-creds \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=user@example.com \
  --dry-run=client -o yaml > registry-secret.yaml
```

This produces a manifest like:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: registry-creds
  namespace: default
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: eyJhdXRocyI6eyJyZWdpc3RyeS5leGFtcGxlLmNvbSI6eyJ1c2VybmFtZSI6Im15dXNlciIsInBhc3N3b3JkIjoibXlwYXNzd29yZCIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsImF1dGgiOiIifX19
```

## Configuring SOPS

Set up `.sops.yaml` to encrypt the data field:

```yaml
creation_rules:
  - path_regex: .*registry.*\.yaml$
    age: age1yourkey...
    encrypted_regex: ^(data|stringData)$
```

## Encrypting the Registry Secret

Encrypt the manifest:

```bash
sops --encrypt --in-place registry-secret.yaml
```

The encrypted file keeps the metadata readable while the `.dockerconfigjson` value is encrypted:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: registry-creds
  namespace: default
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: ENC[AES256_GCM,data:...,type:str]
sops:
  # ... metadata ...
```

## Using stringData for Readability

For easier editing, you can use `stringData` with the JSON directly:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: registry-creds
  namespace: default
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "registry.example.com": {
          "username": "myuser",
          "password": "mypassword",
          "email": "user@example.com",
          "auth": ""
        }
      }
    }
```

Encrypt this with SOPS:

```bash
sops --encrypt --in-place registry-secret.yaml
```

## Multiple Registry Credentials

For applications that pull from multiple registries, include all registries in a single secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: multi-registry-creds
  namespace: default
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "registry.example.com": {
          "username": "user1",
          "password": "password1",
          "auth": ""
        },
        "ghcr.io": {
          "username": "githubuser",
          "password": "ghp_tokenvalue",
          "auth": ""
        },
        "123456789.dkr.ecr.us-east-1.amazonaws.com": {
          "username": "AWS",
          "password": "ecr-token-value",
          "auth": ""
        }
      }
    }
```

## Deploying with Flux

Set up the Flux Kustomization to decrypt and apply the registry secret:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: registry-credentials
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/registry
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Referencing in Deployments

Reference the image pull secret in your deployment manifests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  template:
    spec:
      imagePullSecrets:
        - name: registry-creds
      containers:
        - name: myapp
          image: registry.example.com/myapp:latest
```

## Namespace-Wide Image Pull Secrets

To use the same registry credentials across all pods in a namespace, patch the default service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: default
  namespace: default
imagePullSecrets:
  - name: registry-creds
```

This way, every pod in the namespace automatically uses the registry credentials without explicit `imagePullSecrets` in each deployment.

## Multi-Namespace Deployment

If you need registry credentials in multiple namespaces, create the secret in each namespace. Use Kustomize to replicate:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - registry-secret.yaml
namespace: app-namespace
```

Or create separate encrypted secrets for each namespace:

```text
infrastructure/
  registry/
    kustomization.yaml
    default-registry-secret.yaml       # SOPS encrypted
    monitoring-registry-secret.yaml    # SOPS encrypted
    app-registry-secret.yaml           # SOPS encrypted
```

## Rotating Registry Credentials

When registry passwords change, update the encrypted secret:

```bash
# Decrypt, update credentials, re-encrypt
sops registry-secret.yaml
# Edit the password in the opened editor
# Save and close - SOPS re-encrypts automatically
```

Commit and push the updated file. Flux detects the change and updates the secret in the cluster.

## Verifying the Setup

After deployment, verify everything works:

```bash
# Check the secret exists
kubectl get secret registry-creds -n default

# Test pulling an image
kubectl run test --image=registry.example.com/myapp:latest --restart=Never

# Check events for pull errors
kubectl describe pod test
```

## Conclusion

Encrypting Docker registry credentials with SOPS provides a secure way to manage image pull secrets in a Flux GitOps workflow. The credentials are protected in Git, and Flux handles decryption transparently during reconciliation. Combined with namespace-wide service account configuration, this approach scales well across multiple applications and namespaces.
