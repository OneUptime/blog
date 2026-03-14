# How to Migrate from SOPS to External Secrets Operator with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, External Secrets Operator, SOPS, Secret Migration

Description: Migrate from SOPS-encrypted secrets to the External Secrets Operator with Flux CD for improved secret rotation, audit logging, and centralized secret management.

---

## Introduction

SOPS (Secrets OPerationS) is a popular choice for encrypting secrets in GitOps repositories. It works well for small teams and static secrets, but it has limitations at scale: rotating secrets requires decrypting and re-encrypting files in Git, audit trails require Git log analysis, and managing age or PGP keys adds operational overhead. The External Secrets Operator (ESO) solves these problems by externalizing secrets entirely from Git while maintaining a GitOps-compatible workflow.

Migrating from SOPS to ESO is a phased process: you move secrets from SOPS-encrypted files to your external secret store, deploy ESO, create `ExternalSecret` resources to replace the SOPS secrets, and validate before removing the SOPS files. Flux CD supports both models simultaneously during the migration window, making a zero-downtime migration achievable.

This guide covers planning the migration, running both systems in parallel, cutover, and cleanup.

## Prerequisites

- Flux CD bootstrapped with SOPS decryption configured
- External Secrets Operator deployed via Flux HelmRelease
- An external secret store (AWS, Vault, etc.) accessible from the cluster
- Access to your SOPS key (age or PGP) to decrypt existing secrets

## Step 1: Audit Existing SOPS Secrets

Before migrating, inventory all SOPS-encrypted secrets in your repository:

```bash
# Find all SOPS-encrypted files
find clusters/ -name "*.yaml" -exec \
  grep -l "^sops:" {} \;

# List secret names and namespaces
find clusters/ -name "*.yaml" | xargs grep -l "kind: Secret" | \
  xargs grep -l "sops:" | while read f; do
    echo "File: $f"
    sops -d "$f" | grep -E "name:|namespace:" | head -5
  done
```

## Step 2: Upload Secrets to the External Store

For each SOPS-encrypted secret, decrypt it locally and upload to AWS Secrets Manager (or your chosen store). Never commit the decrypted output:

```bash
# Decrypt a SOPS file and upload to AWS Secrets Manager
sops -d clusters/my-cluster/apps/myapp/db-secret.enc.yaml | \
  kubectl get -f - -o json | \
  jq '.data | map_values(@base64d)' | \
  aws secretsmanager create-secret \
    --name myapp/database \
    --secret-string "$(cat -)"

# For HashiCorp Vault
sops -d clusters/my-cluster/apps/myapp/api-secret.enc.yaml | \
  kubectl get -f - -o json | \
  jq '.data | map_values(@base64d)' | \
  vault kv put secret/myapp/api -
```

## Step 3: Deploy ESO and Configure SecretStore (if not already done)

```yaml
# clusters/my-cluster/external-secrets/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/external-secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 4: Create ExternalSecret Resources Alongside SOPS Secrets

Run both systems in parallel during the migration. Create `ExternalSecret` resources that target the same secret names:

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-db.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-db-migration
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    # Target the SAME secret name as the SOPS-managed Secret
    name: myapp-db-secret
    # Use Merge to avoid conflicts with the existing SOPS-created Secret
    creationPolicy: Merge
  data:
    - secretKey: db-password
      remoteRef:
        key: myapp/database
        property: password
```

## Step 5: Validate the ExternalSecret is Syncing Correctly

```bash
# Check the ExternalSecret status
kubectl get externalsecret myapp-db-migration -n default

# Compare values: SOPS-managed vs ESO-managed
kubectl get secret myapp-db-secret -n default \
  -o jsonpath='{.data.db-password}' | base64 -d
```

## Step 6: Cutover - Switch from SOPS to ESO

Once validated, switch the `creationPolicy` to `Owner` and remove the SOPS-encrypted file:

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-db.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-db
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-db-secret
    # ESO now owns the Secret lifecycle
    creationPolicy: Owner
    deletionPolicy: Delete
  data:
    - secretKey: db-password
      remoteRef:
        key: myapp/database
        property: password
```

Remove the SOPS-encrypted Secret from Git:

```bash
git rm clusters/my-cluster/apps/myapp/db-secret.enc.yaml
git commit -m "feat: migrate myapp db secret from SOPS to ESO"
git push
```

## Step 7: Remove SOPS Configuration from Flux (After Full Migration)

Once all secrets are migrated, remove the SOPS decryption key reference from Flux:

```bash
# After all secrets are migrated and validated
flux delete source git flux-system
# Re-bootstrap without SOPS decryption configuration
flux bootstrap github \
  --owner=my-org \
  --repository=my-fleet \
  --branch=main \
  --path=clusters/my-cluster
```

## Best Practices

- Migrate one application at a time and validate before proceeding to the next, rather than migrating all secrets at once.
- Use `creationPolicy: Merge` during the parallel run phase to avoid conflicts between SOPS and ESO managing the same Secret.
- Keep SOPS-encrypted files in Git until you have confirmed ESO is reliably syncing and the application is working correctly.
- After the migration, revoke SOPS keys that are no longer needed to reduce your cryptographic attack surface.
- Document the migration in your runbooks: record which secrets were migrated, their new paths in the external store, and the date of cutover.

## Conclusion

Migrating from SOPS to the External Secrets Operator with Flux CD is a low-risk process when done in phases. The parallel run approach ensures continuity during the transition, while Flux's reconciliation model means the cutover is as simple as committing the final `ExternalSecret` manifest and removing the SOPS file. The result is a secret management system with superior rotation support, centralized audit logging, and reduced operational complexity.
