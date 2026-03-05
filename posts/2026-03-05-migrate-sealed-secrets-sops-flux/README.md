# How to Migrate from Sealed Secrets to SOPS in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, SOPS, Sealed Secrets, Secret Management, Migration

Description: A step-by-step guide to migrating your Kubernetes secret management from Bitnami Sealed Secrets to Mozilla SOPS within a Flux CD GitOps workflow.

---

Many teams start their GitOps journey with Bitnami Sealed Secrets because of its simplicity. However, as infrastructure grows, SOPS (Secrets OPerationS) often becomes the preferred choice due to its support for multiple key management services, partial file encryption, and native Flux CD integration. This guide walks you through a safe migration from Sealed Secrets to SOPS in a Flux-managed cluster.

## Why Migrate to SOPS?

Sealed Secrets encrypts entire secret manifests using a cluster-side controller and its own key pair. While effective, it has limitations. You cannot inspect encrypted values without cluster access, key rotation requires resealing all secrets, and multi-cloud key management is not natively supported.

SOPS, on the other hand, integrates with AWS KMS, GCP KMS, Azure Key Vault, and age encryption. It encrypts only the values in YAML files, leaving keys readable for easier code review. Flux has built-in SOPS decryption support through the kustomize-controller, making it a natural fit.

## Prerequisites

Before starting the migration, ensure you have the following in place:

- A running Flux CD installation (v2.x)
- Access to your Git repository managed by Flux
- SOPS installed locally (`brew install sops` or equivalent)
- An encryption key (age key or cloud KMS key)
- `kubeseal` CLI for extracting current secrets

## Step 1: Generate an Age Key Pair

Age is the simplest encryption backend for SOPS. Generate a key pair:

```bash
age-keygen -o age.agekey
# Public key: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

Store the private key as a Kubernetes secret so the kustomize-controller can decrypt:

```bash
cat age.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

## Step 2: Configure SOPS

Create a `.sops.yaml` file in your repository root to define encryption rules:

```yaml
creation_rules:
  - path_regex: .*\.sops\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
  - path_regex: .*secrets.*\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

## Step 3: Configure Flux Kustomization for SOPS Decryption

Update your Flux Kustomization resource to enable SOPS decryption:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

The `decryption` block tells the kustomize-controller to decrypt SOPS-encrypted files using the age key stored in the `sops-age` secret.

## Step 4: Extract Existing Secrets from Sealed Secrets

For each SealedSecret in your repository, extract the actual secret values from the cluster:

```bash
kubectl get secret my-app-secret -n default -o yaml > my-app-secret.yaml
```

Clean up the extracted manifest by removing cluster-specific metadata:

```bash
kubectl get secret my-app-secret -n default -o yaml | \
  kubectl neat > my-app-secret-clean.yaml
```

If you do not have `kubectl-neat`, manually remove the fields `metadata.creationTimestamp`, `metadata.resourceVersion`, `metadata.uid`, and `metadata.managedFields`.

## Step 5: Encrypt Secrets with SOPS

Encrypt the cleaned secret manifest using SOPS:

```bash
sops --encrypt --in-place my-app-secret-clean.yaml
```

Rename the file to follow your naming convention, for example `my-app-secret.sops.yaml`, and place it in the appropriate directory in your Git repository.

Verify the encrypted file looks correct. SOPS encrypts only the data values:

```yaml
apiVersion: v1
kind: Secret
metadata:
    name: my-app-secret
    namespace: default
type: Opaque
data:
    username: ENC[AES256_GCM,data:abc123...,type:str]
    password: ENC[AES256_GCM,data:def456...,type:str]
sops:
    age:
        - recipient: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
          enc: |
            -----BEGIN AGE ENCRYPTED FILE-----
            ...
            -----END AGE ENCRYPTED FILE-----
    lastmodified: "2026-03-05T00:00:00Z"
    version: 3.7.3
```

## Step 6: Remove Sealed Secrets Resources

Once you have encrypted all secrets with SOPS and committed them, remove the corresponding SealedSecret resources from your repository. Also remove the Sealed Secrets controller if no other workloads depend on it:

```yaml
# Remove from your Git repository:
# - All .sealed-secret.yaml files
# - The SealedSecret CRD deployment (if managed by Flux)
```

## Step 7: Migrate Incrementally

For production environments, migrate one namespace or application at a time:

1. Create the SOPS-encrypted secret for one application.
2. Commit and push. Let Flux reconcile.
3. Verify the application works with the new secret.
4. Remove the old SealedSecret resource.
5. Repeat for the next application.

Monitor the kustomize-controller logs during each step:

```bash
kubectl logs -n flux-system deploy/kustomize-controller | grep -i sops
```

## Step 8: Validate the Migration

After migrating all secrets, confirm everything is working:

```bash
# Check all Kustomizations are reconciled
flux get kustomizations

# Verify no SealedSecret resources remain
kubectl get sealedsecrets --all-namespaces

# Confirm secrets exist and applications are healthy
kubectl get secrets --all-namespaces | grep my-app
```

## Common Pitfalls

Avoid these mistakes during migration:

- **Committing unencrypted secrets**: Always verify files are encrypted before pushing. Use `sops --decrypt` to test locally.
- **Missing decryption configuration**: Every Kustomization that references SOPS-encrypted files must have the `decryption` block.
- **Wrong SOPS rules**: Ensure `.sops.yaml` patterns match your file naming convention. Test with `sops --encrypt` before committing.
- **Forgetting the age key secret**: The `sops-age` secret must exist in the `flux-system` namespace before Flux attempts decryption.

## Conclusion

Migrating from Sealed Secrets to SOPS in Flux is a straightforward process when done incrementally. SOPS provides better key management flexibility, readable encrypted files, and native Flux integration. By following this step-by-step approach, you can complete the migration with zero downtime and full confidence in your secret management pipeline.
