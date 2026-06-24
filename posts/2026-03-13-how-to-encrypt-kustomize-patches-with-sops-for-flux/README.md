# How to Encrypt Kustomize Patches with SOPS for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secret, Encryption, Kustomize, Patches

Description: Learn how to encrypt Kustomize patches containing sensitive data using SOPS for secure GitOps deployments with Flux.

---

Kustomize patches are a common way to customize Kubernetes resources across environments. When the values you want to configure are sensitive, store them in Kubernetes Secret manifests encrypted with SOPS, then use plain Kustomize patches to reference those Secrets. This guide shows how to use SOPS-encrypted Secrets with Kustomize patches in Flux.

## When Patches Need Encryption

Kustomize patches often inject environment-specific values into deployments. Some of these values are sensitive:

- Database connection strings in container environment variables
- API keys passed as environment variables
- Secret volume mount configurations
- Init container credentials

Do not encrypt arbitrary Deployment patch files and reference them directly from `kustomization.yaml`. Flux's SOPS support decrypts Kubernetes Secret data during reconciliation; Kustomize still needs readable patch files to build the manifests.

## Prerequisites

You need:

- A Kubernetes cluster with Flux installed
- SOPS and age CLI tools
- An age key pair with the private key stored in a Kubernetes Secret referenced by Flux
- A working Kustomize overlay structure

## Setting Up SOPS for Kustomize Patches

Configure `.sops.yaml` to encrypt only Kubernetes Secret values while leaving `apiVersion`, `kind`, and `metadata` readable:

```yaml
creation_rules:
  - path_regex: .*secret.*\.yaml$
    age: age1yourkey...
    encrypted_regex: ^(data|stringData)$

  - path_regex: .*\.enc\.yaml$
    age: age1yourkey...
    encrypted_regex: ^(data|stringData)$
```

## Creating an Encrypted Secret and Strategic Merge Patch

Suppose you have a deployment that needs database credentials injected. Create a Secret manifest for the sensitive values:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secrets
type: Opaque
stringData:
  DB_HOST: db.production.internal
  DB_PASSWORD: production-db-password-here
  API_SECRET: api-secret-key-value
```

Save this as `secret-values.yaml` and encrypt it:

```bash
sops --encrypt --in-place secret-values.yaml
```

Then create a plain patch that references the Secret:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: myapp
          env:
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: DB_HOST
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: DB_PASSWORD
            - name: API_SECRET
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: API_SECRET
```

Save this as `secret-env-patch.yaml`. The patch itself does not contain secret values, so it does not need to be encrypted.

## Using the Encrypted Secret in Kustomization

In your Kustomize overlay, reference the encrypted Secret as a resource and the plain patch as a patch. Kustomize itself cannot decrypt SOPS files. Flux decrypts SOPS-encrypted Secret data during reconciliation.

Structure your overlay:

```text
overlays/
  production/
    kustomization.yaml
    secret-values.yaml      # SOPS encrypted Secret
    secret-env-patch.yaml   # Plain patch with Secret references
    deployment-patch.yaml   # Plain, non-sensitive
```

The `kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - secret-values.yaml
patches:
  - path: deployment-patch.yaml
  - path: secret-env-patch.yaml
```

## Flux Kustomization with Decryption

Configure the Flux Kustomization to decrypt SOPS-encrypted Secret data:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-production
  namespace: flux-system
spec:
  interval: 10m
  path: ./overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

Flux decrypts the SOPS-encrypted Secret before applying it, and the Deployment patch points the application at those decrypted Secret keys through `secretKeyRef`.

## Encrypting JSON Secret Data

JSON configuration with sensitive data can also be stored in an encrypted Secret. Create the Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: myapp-config
type: Opaque
stringData:
  config.json: |
    {
      "database": {
        "password": "secret-password"
      },
      "api": {
        "key": "secret-api-key"
      }
    }
```

Encrypt it:

```bash
sops --encrypt --in-place secret-json-config.yaml
```

Reference it in your kustomization:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - secret-json-config.yaml
```

## Separating Sensitive and Non-Sensitive Patches

A best practice is to separate sensitive values into dedicated encrypted Secret files and keep patches non-sensitive:

```text
overlays/
  production/
    kustomization.yaml
    replicas-patch.yaml         # Plain: replica count
    resources-patch.yaml        # Plain: CPU/memory limits
    secret-env-patch.yaml       # Plain: Secret references
    secret-values.yaml          # Encrypted: credentials
    secret-config.yaml          # Encrypted: secret configs
```

This makes it clear which files contain sensitive data and keeps non-sensitive patches easy to review.

## Handling Multiple Secret Files and Patches

When you have multiple encrypted Secret files and plain patches, list the Secret files under `resources` and the patch files under `patches`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - secret-values.yaml
  - secret-config.yaml
patches:
  - path: replicas-patch.yaml
  - path: resources-patch.yaml
  - path: secret-env-patch.yaml
```

Flux decrypts SOPS-encrypted Kubernetes Secret data during reconciliation.

## Editing Encrypted Secret Files

To modify an encrypted Secret file:

```bash
# Open in editor with automatic decrypt/re-encrypt

sops secret-values.yaml

# Or decrypt, edit manually, and re-encrypt
sops --decrypt secret-values.yaml > /tmp/secret-values.yaml
# Edit /tmp/secret-values.yaml
sops --encrypt /tmp/secret-values.yaml > secret-values.yaml
rm /tmp/secret-values.yaml
```

## Verifying the Result

After pushing changes, verify that Flux applies the patches correctly:

```bash
# Check Kustomization reconciliation
flux get kustomizations myapp-production

# Verify the deployment has the expected Secret references
kubectl get deployment myapp -n default -o jsonpath='{.spec.template.spec.containers[0].env}'

# Verify the Secret exists
kubectl get secret myapp-secrets -n default

# Check for reconciliation errors
flux logs --kind=Kustomization --name=myapp-production
```

## Common Issues

If Flux reports decryption errors, ensure the `.sops.yaml` creation rules match your Secret file paths and that the referenced Flux decryption Secret contains the private age key. If Kustomize reports invalid patch formats, verify that patch files are plain YAML and that only Kubernetes Secret `data` or `stringData` values are SOPS-encrypted. Remember that `apiVersion`, `kind`, and `metadata` must remain unencrypted.

## Conclusion

Using SOPS-encrypted Kubernetes Secrets with Kustomize patches allows you to safely store environment-specific sensitive configuration in Git. Flux handles Secret decryption during reconciliation, while Kustomize applies plain patches that reference the decrypted Secret keys. By separating sensitive Secret manifests from non-sensitive patches and using clear naming conventions, you maintain a secure and reviewable GitOps workflow.
