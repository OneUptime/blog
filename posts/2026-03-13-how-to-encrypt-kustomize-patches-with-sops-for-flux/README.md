# How to Encrypt Kustomize Patches with SOPS for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, Kustomize, Patches

Description: Learn how to encrypt Kustomize patches containing sensitive data using SOPS for secure GitOps deployments with Flux.

---

Kustomize patches are a common way to customize Kubernetes resources across environments. When patches contain sensitive data like environment variables with credentials or secret references, they need to be encrypted before committing to Git. This guide shows how to encrypt Kustomize patches with SOPS and use them in Flux.

## When Patches Need Encryption

Kustomize patches often inject environment-specific values into deployments. Some of these values are sensitive:

- Database connection strings in container environment variables
- API keys passed as environment variables
- Secret volume mount configurations
- Init container credentials

## Prerequisites

You need:

- A Kubernetes cluster with Flux installed
- SOPS and age CLI tools
- An age key pair with the private key stored in Flux
- A working Kustomize overlay structure

## Setting Up SOPS for Kustomize Patches

Configure `.sops.yaml` to handle patch files:

```yaml
creation_rules:
  - path_regex: .*secret.*patch.*\.yaml$
    age: age1yourkey...
    encrypted_regex: ^(data|stringData|value|env)$

  - path_regex: .*\.enc\.yaml$
    age: age1yourkey...
    encrypted_regex: ^(data|stringData|value)$
```

## Creating an Encrypted Strategic Merge Patch

Suppose you have a deployment that needs database credentials injected via a patch. Create the patch:

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
              value: db.production.internal
            - name: DB_PASSWORD
              value: production-db-password-here
            - name: API_SECRET
              value: api-secret-key-value
```

Save this as `secret-patch.yaml` and encrypt it:

```bash
sops --encrypt --in-place secret-patch.yaml
```

## Using the Encrypted Patch in Kustomization

In your Kustomize overlay, reference the encrypted patch. However, Kustomize itself cannot decrypt SOPS files. The decryption is handled by Flux at the Kustomization controller level.

Structure your overlay:

```
overlays/
  production/
    kustomization.yaml
    secret-patch.yaml        # SOPS encrypted
    deployment-patch.yaml    # Plain, non-sensitive
```

The `kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patchesStrategicMerge:
  - deployment-patch.yaml
  - secret-patch.yaml
```

## Flux Kustomization with Decryption

Configure the Flux Kustomization to decrypt SOPS files:

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

Flux decrypts the SOPS-encrypted patch file before applying Kustomize, so the patch is applied with the decrypted values.

## Encrypting JSON Patches

JSON patches with sensitive data can also be encrypted. Create the patch:

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
sops --encrypt --in-place secret-json-patch.yaml
```

Reference it in your kustomization:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - secret-json-patch.yaml
```

## Separating Sensitive and Non-Sensitive Patches

A best practice is to separate sensitive values into dedicated patch files:

```
overlays/
  production/
    kustomization.yaml
    replicas-patch.yaml         # Plain: replica count
    resources-patch.yaml        # Plain: CPU/memory limits
    secret-env-patch.yaml       # Encrypted: credentials
    secret-config-patch.yaml    # Encrypted: secret configs
```

This makes it clear which files contain sensitive data and keeps non-sensitive patches easy to review.

## Handling Multiple Secret Patches

When you have multiple encrypted patches, list them all in the Kustomize configuration:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patchesStrategicMerge:
  - replicas-patch.yaml
  - resources-patch.yaml
  - secret-env-patch.yaml
  - secret-config-patch.yaml
```

Flux decrypts all SOPS-encrypted files in the path before running Kustomize.

## Editing Encrypted Patches

To modify an encrypted patch:

```bash
# Open in editor with automatic decrypt/re-encrypt
sops secret-env-patch.yaml

# Or decrypt, edit manually, and re-encrypt
sops --decrypt secret-env-patch.yaml > /tmp/patch.yaml
# Edit /tmp/patch.yaml
sops --encrypt /tmp/patch.yaml > secret-env-patch.yaml
rm /tmp/patch.yaml
```

## Verifying the Result

After pushing changes, verify that Flux applies the patches correctly:

```bash
# Check Kustomization reconciliation
flux get kustomizations myapp-production

# Verify the deployment has the expected env vars
kubectl get deployment myapp -n default -o jsonpath='{.spec.template.spec.containers[0].env}'

# Check for reconciliation errors
flux logs --kind=Kustomization --name=myapp-production
```

## Common Issues

If Flux reports decryption errors, ensure the `.sops.yaml` creation rules match your patch file paths. If Kustomize reports invalid patch formats, decrypt the file locally and verify the YAML structure is valid. Remember that SOPS adds a `sops` metadata block to the file, which Flux removes during decryption before passing to Kustomize.

## Conclusion

Encrypting Kustomize patches with SOPS allows you to safely store environment-specific sensitive configuration in Git. Flux handles the decryption transparently, applying patches with the decrypted values during reconciliation. By separating sensitive patches from non-sensitive ones and using clear naming conventions, you maintain a secure and reviewable GitOps workflow.
