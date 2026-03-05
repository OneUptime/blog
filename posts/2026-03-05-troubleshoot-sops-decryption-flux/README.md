# How to Troubleshoot SOPS Decryption Failures in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, SOPS, Troubleshooting, Decryption

Description: A practical troubleshooting guide for diagnosing and resolving SOPS decryption failures in Flux CD kustomize-controller.

---

SOPS decryption failures are one of the most common issues teams encounter when managing secrets with Flux CD. When the kustomize-controller cannot decrypt a SOPS-encrypted file, the Kustomization resource enters a failed state and your application secrets are not applied. This guide covers the most frequent causes and how to resolve them systematically.

## Identifying a Decryption Failure

The first step is confirming that the issue is related to SOPS decryption. Check the Kustomization status:

```bash
flux get kustomizations
```

A decryption failure typically shows a message like:

```text
NAME        REVISION    SUSPENDED   READY   MESSAGE
my-app      main@sha1   False       False   decryption failed for 'secrets/db.sops.yaml'
```

For more detail, describe the Kustomization:

```bash
kubectl describe kustomization my-app -n flux-system
```

Look for events containing phrases such as `failed to decrypt`, `MAC mismatch`, `could not decrypt data key`, or `no matching keys found`.

## Cause 1: Missing Decryption Secret

The most common cause is that the age or GPG private key secret does not exist in the cluster or is misconfigured.

### Diagnosis

```bash
kubectl get secret sops-age -n flux-system
```

If the secret does not exist, you will see a `NotFound` error.

### Resolution

Create the secret with the correct key:

```bash
cat age.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

Verify the secret contains the expected key file:

```bash
kubectl get secret sops-age -n flux-system -o jsonpath='{.data}' | jq 'keys'
```

The output should include `age.agekey`.

## Cause 2: Kustomization Missing Decryption Configuration

The Kustomization resource must explicitly declare the decryption provider and key reference.

### Diagnosis

```bash
kubectl get kustomization my-app -n flux-system -o yaml | grep -A5 decryption
```

If there is no `decryption` block, or it references the wrong secret, decryption will fail.

### Resolution

Ensure the Kustomization includes the correct decryption configuration:

```yaml
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
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

After updating, trigger reconciliation:

```bash
flux reconcile kustomization my-app
```

## Cause 3: Wrong Encryption Key

The file was encrypted with a different key than the one available in the cluster.

### Diagnosis

Inspect the SOPS metadata in the encrypted file to see which recipients are configured:

```bash
sops --decrypt --extract '["sops"]' secrets/db.sops.yaml 2>&1 || \
  grep -A2 'age:' secrets/db.sops.yaml
```

Compare the recipient public key in the file with the public key derived from the private key in the cluster:

```bash
kubectl get secret sops-age -n flux-system -o jsonpath='{.data.age\.agekey}' | \
  base64 -d | grep "public key"
```

### Resolution

If the keys do not match, you have two options:

1. Re-encrypt the file with the correct public key:

```bash
sops --rotate --in-place \
  --add-age age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p \
  secrets/db.sops.yaml
```

2. Update the cluster secret with the correct private key.

## Cause 4: Corrupted SOPS File

If the SOPS-encrypted file has been manually edited incorrectly, the MAC (Message Authentication Code) validation will fail.

### Diagnosis

The error message will contain `MAC mismatch`. Try decrypting locally:

```bash
export SOPS_AGE_KEY_FILE=age.agekey
sops --decrypt secrets/db.sops.yaml
```

If you see `MAC mismatch`, the file is corrupted.

### Resolution

You must re-encrypt the file from the original plaintext. If you have the original values, create a new plaintext file and encrypt it:

```bash
sops --encrypt secrets/db-credentials.yaml > secrets/db.sops.yaml
```

If you do not have the original values, extract the current secret from the cluster:

```bash
kubectl get secret db-credentials -o yaml | kubectl neat > /tmp/db-credentials.yaml
sops --encrypt /tmp/db-credentials.yaml > secrets/db.sops.yaml
rm /tmp/db-credentials.yaml
```

## Cause 5: SOPS Configuration File Issues

The `.sops.yaml` configuration file may not match your file paths.

### Diagnosis

Check if your encrypted file path matches a creation rule:

```bash
cat .sops.yaml
```

If your file is at `clusters/production/secrets/db.sops.yaml` but the rule only matches `secrets/*.sops.yaml`, it will not apply.

### Resolution

Update `.sops.yaml` to match your directory structure:

```yaml
creation_rules:
  - path_regex: .*\.sops\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

Note that `.sops.yaml` is used during encryption only. At decryption time, SOPS reads the metadata embedded in the encrypted file itself. So a misconfigured `.sops.yaml` causes problems when encrypting new files, not when decrypting existing ones.

## Cause 6: Namespace Mismatch

The decryption key secret must be in the same namespace as the kustomize-controller, which is typically `flux-system`.

### Diagnosis

```bash
kubectl get secret sops-age -n flux-system
```

### Resolution

If the secret exists in a different namespace, recreate it in `flux-system`:

```bash
kubectl get secret sops-age -n wrong-namespace -o yaml | \
  sed 's/namespace: wrong-namespace/namespace: flux-system/' | \
  kubectl apply -f -
```

## Systematic Debugging Checklist

When you encounter a SOPS decryption failure, work through this checklist:

1. **Read the error message** from `flux get kustomizations` or `kubectl describe kustomization`.
2. **Verify the decryption secret exists** in `flux-system` namespace.
3. **Verify the Kustomization** has the `decryption` block with the correct `secretRef`.
4. **Compare encryption keys**: the public key in the encrypted file must match the private key in the cluster.
5. **Test local decryption**: run `sops --decrypt` with the same private key to rule out file corruption.
6. **Check kustomize-controller logs**: `kubectl logs -n flux-system deploy/kustomize-controller | grep -i decrypt`.
7. **Trigger manual reconciliation**: `flux reconcile kustomization my-app` and observe the result.

## Prevention Tips

To avoid decryption failures in the future:

- Always test decryption locally before committing encrypted files.
- Use a pre-commit hook to validate SOPS files (covered in a separate guide).
- Store a backup of your age private key in a secure location outside the cluster.
- Use `.sops.yaml` with broad path patterns to avoid missing files.

## Conclusion

SOPS decryption failures in Flux are almost always caused by key mismatches, missing secrets, or misconfigured Kustomization resources. By following the systematic debugging checklist above, you can diagnose and resolve these issues quickly. The most important preventive measure is testing decryption locally before pushing changes to Git.
