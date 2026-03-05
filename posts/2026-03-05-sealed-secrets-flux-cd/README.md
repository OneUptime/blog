# How to Use Sealed Secrets with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secrets, Sealed Secrets, Bitnami

Description: Learn how to use Bitnami Sealed Secrets with Flux CD to safely store encrypted secrets in Git repositories.

---

Sealed Secrets by Bitnami is a Kubernetes controller and CLI tool that allows you to encrypt secrets into "sealed" versions that are safe to store in Git. Unlike SOPS, Sealed Secrets uses asymmetric encryption with a controller running in the cluster that holds the private key. The `kubeseal` CLI encrypts secrets using the controller's public key, and only the controller can decrypt them.

## How Sealed Secrets Works

1. The Sealed Secrets controller generates a public/private key pair in the cluster
2. You use `kubeseal` CLI to encrypt a Secret into a SealedSecret using the public key
3. The SealedSecret custom resource is committed to Git
4. Flux applies the SealedSecret to the cluster
5. The controller decrypts it and creates the actual Secret

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- `kubeseal` CLI installed
- `kubectl` access to your cluster

## Step 1: Install Sealed Secrets Controller with Flux

Deploy the Sealed Secrets controller using a Flux HelmRelease.

```yaml
# infrastructure/sealed-secrets/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sealed-secrets
---
# infrastructure/sealed-secrets/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: sealed-secrets
  namespace: sealed-secrets
spec:
  interval: 1h
  url: https://bitnami-labs.github.io/sealed-secrets
---
# infrastructure/sealed-secrets/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: sealed-secrets-controller
  namespace: sealed-secrets
spec:
  interval: 1h
  chart:
    spec:
      chart: sealed-secrets
      version: ">=2.0.0"
      sourceRef:
        kind: HelmRepository
        name: sealed-secrets
  values:
    fullnameOverride: sealed-secrets-controller
```

## Step 2: Fetch the Public Key

Retrieve the public key from the controller to use with `kubeseal`.

```bash
# Fetch the public certificate from the controller
kubeseal --fetch-cert \
  --controller-name=sealed-secrets-controller \
  --controller-namespace=sealed-secrets \
  > pub-sealed-secrets.pem

# Store the certificate in the repository for team access
# This is safe to commit - it is a public key
```

## Step 3: Create and Seal a Secret

Create a standard Kubernetes Secret and seal it using `kubeseal`.

```bash
# Create a Kubernetes secret (dry-run, output to YAML)
kubectl create secret generic my-app-secret \
  --namespace=default \
  --from-literal=username=admin \
  --from-literal=password=super-secret-password \
  --dry-run=client -o yaml > secret.yaml
```

Seal the secret using the public certificate.

```bash
# Seal the secret
kubeseal \
  --cert pub-sealed-secrets.pem \
  --format yaml \
  < secret.yaml > sealed-secret.yaml

# Remove the plaintext secret
rm secret.yaml
```

## Step 4: Examine the SealedSecret

The sealed secret is a custom resource that is safe to commit to Git.

```yaml
# sealed-secret.yaml - Safe to store in Git
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: my-app-secret
  namespace: default
spec:
  encryptedData:
    username: AgBy3i4OJSWK+PiT...
    password: AgCtr8rLnFL+Oh...
  template:
    metadata:
      name: my-app-secret
      namespace: default
    type: Opaque
```

## Step 5: Add to Flux Kustomization

Include the sealed secret in your Flux-managed directory. No special decryption configuration is needed in the Kustomization because the Sealed Secrets controller handles decryption.

```yaml
# apps/my-app/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - sealed-secret.yaml
```

The Flux Kustomization does not need a decryption provider for Sealed Secrets.

```yaml
# clusters/my-cluster/apps-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # No decryption block needed - Sealed Secrets controller handles it
```

## Step 6: Commit and Verify

Push the sealed secret and verify it is decrypted in the cluster.

```bash
# Commit the sealed secret
git add sealed-secret.yaml
git commit -m "Add sealed secret for my-app"
git push

# Wait for Flux reconciliation
flux reconcile kustomization my-app --with-source

# Verify the actual Secret was created by the controller
kubectl get secret my-app-secret -n default
kubectl get secret my-app-secret -n default -o jsonpath='{.data.username}' | base64 -d
# Output: admin
```

## Updating a Sealed Secret

To update a sealed secret, create a new one with the updated values and replace the file in Git.

```bash
# Create updated secret and seal it
kubectl create secret generic my-app-secret \
  --namespace=default \
  --from-literal=username=admin \
  --from-literal=password=new-password \
  --dry-run=client -o yaml | \
  kubeseal \
    --cert pub-sealed-secrets.pem \
    --format yaml > sealed-secret.yaml

# Commit the update
git add sealed-secret.yaml
git commit -m "Update my-app-secret password"
git push
```

## Sealed Secrets Scopes

Sealed Secrets supports three scopes that control how tightly bound a sealed secret is.

```bash
# strict scope (default) - bound to name and namespace
kubeseal --cert pub-sealed-secrets.pem --format yaml < secret.yaml

# namespace-wide scope - can be renamed within the namespace
kubeseal --cert pub-sealed-secrets.pem --scope namespace-wide --format yaml < secret.yaml

# cluster-wide scope - can be used in any namespace with any name
kubeseal --cert pub-sealed-secrets.pem --scope cluster-wide --format yaml < secret.yaml
```

## Sealed Secrets vs SOPS

| Feature | Sealed Secrets | SOPS |
|---------|---------------|------|
| Key Management | Controller manages keys | You manage keys |
| Encryption | Asymmetric (RSA) | Symmetric + envelope |
| Partial Encryption | No (entire values) | Yes (encrypted_regex) |
| Git Diff Readability | Limited | Better with encrypted_regex |
| Cloud KMS Support | No | Yes (AWS, GCP, Azure) |
| Offline Encryption | Requires cluster access | Works offline |

## Troubleshooting

If the Secret is not being created from the SealedSecret, check the controller logs.

```bash
# Check the Sealed Secrets controller logs
kubectl logs -n sealed-secrets deployment/sealed-secrets-controller

# Verify the SealedSecret was applied
kubectl get sealedsecrets -n default

# Check for events on the SealedSecret
kubectl describe sealedsecret my-app-secret -n default
```

Common issues include using a public key from a different cluster, namespace mismatches when using strict scope, or the controller not having been deployed yet when the SealedSecret was applied.

Sealed Secrets provides a straightforward approach to secret management with Flux CD that requires no special Flux configuration, making it a good choice for teams that want a simple, controller-based solution.
