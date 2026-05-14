# How to Rotate Sealed Secrets Keys with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secret, Sealed Secrets, Key Rotation, Security

Description: Learn how to rotate Sealed Secrets encryption keys in a Flux CD environment while maintaining uninterrupted secret decryption.

---

The Sealed Secrets controller automatically generates new sealing key pairs on a configurable schedule (default: every 30 days). However, key rotation for Sealed Secrets means more than just generating new keys -- you need to re-seal existing secrets with the new key and eventually deactivate old keys. This guide covers the complete key rotation process in a Flux CD GitOps workflow.

## How Sealed Secrets Key Rotation Works

The Sealed Secrets controller manages multiple key pairs simultaneously:

1. The controller generates a new key pair periodically (controlled by `--key-renew-period`)
2. The latest key pair is used for sealing new secrets
3. All previous key pairs are retained for decrypting old SealedSecrets
4. Old SealedSecrets continue to work until they are re-encrypted with the new key

This means rotation is non-disruptive by default, but you should re-encrypt SealedSecrets with the new key before removing old keys.

## Step 1: Check Current Key Status

Verify the current sealing keys in your cluster.

```bash
# List all sealing keys managed by the controller

kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key

# Check the creation dates to see when keys were generated
kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.creationTimestamp}{"\n"}{end}'
```

## Step 2: Configure Key Renewal Period

Set the key renewal period in the Flux HelmRelease for the Sealed Secrets controller.

```yaml
# infrastructure/sealed-secrets/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: sealed-secrets-controller
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: sealed-secrets
      version: ">=2.0.0"
      sourceRef:
        kind: HelmRepository
        name: sealed-secrets
  targetNamespace: kube-system
  values:
    fullnameOverride: sealed-secrets-controller
    # Rotate keys every 30 days (default)
    # Set to "0" to disable automatic rotation
    keyrenewperiod: "720h0m0s"
```

## Step 3: Fetch the Latest Public Key

After the controller generates a new key pair, fetch the latest public certificate.

```bash
# Fetch the latest public certificate
kubeseal --fetch-cert \
  --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system \
  > pub-sealed-secrets-new.pem

# Compare with the old certificate to verify it changed
diff pub-sealed-secrets-old.pem pub-sealed-secrets-new.pem
```

## Step 4: Re-encrypt All Existing Secrets

Re-encrypt all existing SealedSecrets with the new key. This does not require the plaintext secret values because `kubeseal --re-encrypt` asks the controller to decrypt and re-encrypt the existing SealedSecret data.

```bash
#!/bin/bash
# reencrypt-secrets.sh - Re-encrypt all SealedSecret manifests with the latest key

# Run from the root of your GitOps repository.
find apps infrastructure -type f \( -name '*.yaml' -o -name '*.yml' \) -print0 | \
  while IFS= read -r -d '' file; do
    if grep -q 'kind: SealedSecret' "$file"; then
      echo "Re-encrypting $file"
      tmp="$(mktemp)"
      kubeseal --re-encrypt \
        --controller-name=sealed-secrets-controller \
        --controller-namespace=kube-system \
        --format yaml < "$file" > "$tmp" && mv "$tmp" "$file"
    fi
  done
```

Alternatively, if you have the original plaintext secrets, re-seal them directly.

```bash
# Re-seal a specific secret from its original values
kubectl create secret generic my-app-secret \
  --namespace=default \
  --from-literal=username=admin \
  --from-literal=password=super-secret-password \
  --dry-run=client -o yaml | \
  kubeseal \
    --cert pub-sealed-secrets.pem \
    --format yaml > apps/my-app/sealed-secret.yaml
```

## Step 5: Update the Repository

Replace the old SealedSecret files in Git with the re-encrypted versions.

```bash
# Copy re-encrypted files to the appropriate locations in the repo
# (paths depend on your repository structure)

# Commit the re-encrypted secrets
git add apps/
git commit -m "Re-encrypt all secrets with rotated key"
git push
```

## Step 6: Verify Re-encrypted Secrets

Confirm that Flux applies the re-encrypted secrets and the controller decrypts them.

```bash
# Force reconciliation
flux reconcile kustomization my-app --with-source

# Verify secrets are still valid
kubectl get secret my-app-secret -n default -o jsonpath='{.data.username}' | base64 -d

# Check for any SealedSecret errors
kubectl get events --all-namespaces --field-selector involvedObject.kind=SealedSecret
```

## Step 7: Remove Old Keys (Optional)

After all secrets have been re-encrypted, you can optionally remove old keys. Be cautious with this step.

```bash
# List all sealing keys with their creation timestamps
kubectl get secret -n kube-system \
  -l sealedsecrets.bitnami.com/sealed-secrets-key \
  --sort-by=.metadata.creationTimestamp

# Back up before removing any keys
kubectl get secret -n kube-system \
  -l sealedsecrets.bitnami.com/sealed-secrets-key \
  -o yaml > sealed-secrets-keys-backup.yaml

# Remove a specific old key (only after all secrets are re-encrypted)
# kubectl delete secret <old-key-name> -n kube-system

# Restart the controller so manually deleted keys are removed from its in-memory registry
kubectl rollout restart deployment sealed-secrets-controller -n kube-system
```

## Manual Key Rotation

If you need to trigger an immediate key rotation rather than waiting for the automatic renewal.

```bash
# Generate an RFC1123 cutoff timestamp
date -R
```

Add the cutoff timestamp to the Flux HelmRelease values. The controller will generate a new key when it starts with a cutoff time newer than the latest active key.

```yaml
# infrastructure/sealed-secrets/helmrelease.yaml
values:
  keycutofftime: "Thu, 05 Mar 2026 12:00:00 +0000"
```

Then reconcile the HelmRelease so Flux applies the change.

```bash
flux reconcile helmrelease sealed-secrets-controller -n flux-system --with-source
kubectl rollout status deployment sealed-secrets-controller -n kube-system
```

## Disaster Recovery

Back up sealing keys regularly to recover from cluster failures.

```bash
# Create a full backup of all sealing keys
kubectl get secret -n kube-system \
  -l sealedsecrets.bitnami.com/sealed-secrets-key \
  -o yaml > sealed-secrets-backup-$(date +%Y%m%d).yaml

# Restore keys to a new cluster (before deploying the controller)
kubectl apply -f sealed-secrets-backup-20260305.yaml

# Then deploy the controller via Flux
# The controller will detect the existing keys and use them
```

## Automating Rotation with CronJobs

Set up a CronJob in your Flux repository to automate re-encryption reminders.

```yaml
# infrastructure/sealed-secrets/reseal-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: reseal-secrets
  namespace: kube-system
spec:
  schedule: "0 0 1 * *"  # Monthly
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: sealed-secrets-reseal
          containers:
            - name: reseal
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  echo "Key rotation reminder: Re-encrypt SealedSecrets with the latest key"
                  # In practice, this would trigger a CI/CD pipeline
                  # to re-encrypt and commit updated SealedSecrets
          restartPolicy: OnFailure
```

## Troubleshooting Rotation Issues

Common problems during key rotation.

```bash
# Check if the controller has multiple keys
kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key | wc -l

# Verify a SealedSecret can be decrypted
kubectl logs -n kube-system deployment/sealed-secrets-controller | grep -i "unseal\|error\|decrypt"

# Check the certificate currently served for new sealing operations
kubeseal --fetch-cert \
  --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system | \
  openssl x509 -noout -subject -dates
```

Regular key rotation combined with timely re-encryption of existing SealedSecrets ensures your Sealed Secrets deployment in Flux CD remains secure. The non-disruptive nature of the rotation means you can adopt a rolling approach, re-encrypting secrets gradually without service interruption.
