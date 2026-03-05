# How to Troubleshoot OCIRepository Pull Errors in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, OCI, Troubleshooting, Debugging

Description: Learn how to diagnose and fix common OCIRepository pull errors in Flux CD, from authentication failures to TLS issues.

---

## Introduction

When Flux CD's source controller fails to pull an OCI artifact, the OCIRepository resource enters a stalled or failed state with an error message in its status conditions. These errors can stem from authentication problems, network issues, TLS configuration, missing artifacts, or registry-specific quirks. Knowing how to diagnose each type of error quickly will save you significant debugging time.

This guide covers the most common OCIRepository pull errors, their causes, and step-by-step resolution instructions.

## General Debugging Commands

Start every troubleshooting session with these commands to gather information.

```bash
# Check the OCIRepository status and conditions
flux get sources oci -A

# Get detailed status including error messages
kubectl describe ocirepository <name> -n flux-system

# Check source controller logs for detailed error context
kubectl logs -n flux-system deploy/source-controller --tail=50 | grep -i oci

# Check Kubernetes events related to the OCIRepository
kubectl events -n flux-system --for ocirepository/<name>
```

## Error 1: Authentication Failure (401 Unauthorized)

### Symptoms

```
failed to pull artifact: GET https://registry.example.com/v2/manifests/app/manifests/v1.0.0: UNAUTHORIZED
```

### Causes

- Missing or incorrect registry credentials
- Expired token or password
- Secret not in the same namespace as the OCIRepository
- Wrong secret type

### Resolution

Verify the secret exists and is correctly configured.

```bash
# Check if the secret exists in the correct namespace
kubectl get secret registry-auth -n flux-system -o yaml

# Verify the secret contains valid credentials
kubectl get secret registry-auth -n flux-system \
  -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | jq .
```

Recreate the secret if needed.

```bash
# Delete and recreate the registry secret
kubectl delete secret registry-auth -n flux-system

kubectl create secret docker-registry registry-auth \
  --namespace=flux-system \
  --docker-server=registry.example.com \
  --docker-username=your-username \
  --docker-password=$REGISTRY_PASSWORD
```

Test authentication from within the cluster using a debug pod.

```bash
# Test registry authentication from inside the cluster
kubectl run -n flux-system debug --rm -it --image=curlimages/curl -- \
  curl -u "your-username:your-password" \
  https://registry.example.com/v2/manifests/app/tags/list
```

## Error 2: TLS Certificate Errors

### Symptoms

```
failed to pull artifact: x509: certificate signed by unknown authority
```

Or:

```
failed to pull artifact: tls: failed to verify certificate
```

### Causes

- Self-signed or internal CA certificate not trusted
- Missing `certSecretRef` in the OCIRepository spec
- Wrong certificate in the secret

### Resolution

Create or update the CA certificate secret.

```bash
# Create a secret with the CA certificate
kubectl create secret generic registry-ca \
  --namespace=flux-system \
  --from-file=ca.crt=/path/to/ca-certificate.crt
```

The key name in the secret must be `ca.crt`. Update the OCIRepository to reference it.

```yaml
# OCIRepository with custom CA certificate
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/manifests/app
  ref:
    tag: v1.0.0
  secretRef:
    name: registry-auth
  certSecretRef:
    # Must contain a key named 'ca.crt'
    name: registry-ca
```

Verify the certificate chain.

```bash
# Test the TLS connection and certificate chain
kubectl run -n flux-system debug --rm -it --image=curlimages/curl -- \
  curl -v --cacert /dev/null https://registry.example.com/v2/
```

## Error 3: Artifact Not Found (404)

### Symptoms

```
failed to pull artifact: not found
```

Or:

```
failed to determine artifact digest: manifest unknown
```

### Causes

- Wrong repository URL or tag
- Artifact was deleted from the registry
- Tag was overwritten and the original is gone
- Incorrect registry path (missing project or namespace)

### Resolution

Verify the artifact exists in the registry.

```bash
# List available tags to confirm the artifact exists
flux list artifacts oci://registry.example.com/manifests/app \
  --creds=username:$REGISTRY_PASSWORD

# Or use crane to inspect
crane ls registry.example.com/manifests/app
```

Double-check the URL in your OCIRepository. Common mistakes include:

```yaml
# WRONG: Including the tag in the URL
url: oci://registry.example.com/manifests/app:v1.0.0

# CORRECT: Tag goes in spec.ref, not in the URL
url: oci://registry.example.com/manifests/app
```

## Error 4: SemVer Resolution Failure

### Symptoms

```
failed to determine artifact tag: no match found for semver: >=1.0.0
```

### Causes

- No tags in the repository match the SemVer constraint
- Tags are not valid SemVer (e.g., `latest`, `dev-build-123`)
- Tags use a `v` prefix but the constraint does not account for it

### Resolution

List all tags and check which ones are valid SemVer.

```bash
# List all tags
crane ls registry.example.com/manifests/app

# Example output:
# latest
# v1.0.0
# 1.0.0
# dev-abc123
```

Flux strips the `v` prefix when evaluating SemVer, so both `v1.0.0` and `1.0.0` should work. If none of your tags are valid SemVer, push a properly versioned artifact.

```bash
# Push with a valid SemVer tag
flux push artifact oci://registry.example.com/manifests/app:1.0.0 \
  --path=./deploy \
  --source="$(git config --get remote.origin.url)" \
  --revision="main@sha1:$(git rev-parse HEAD)"
```

## Error 5: Timeout Errors

### Symptoms

```
failed to pull artifact: context deadline exceeded
```

Or:

```
failed to pull artifact: i/o timeout
```

### Causes

- Network connectivity issues between the cluster and registry
- Firewall blocking egress to the registry
- Large artifact taking too long to download
- DNS resolution failures

### Resolution

Test network connectivity from the cluster.

```bash
# Test DNS resolution
kubectl run -n flux-system debug --rm -it --image=busybox -- \
  nslookup registry.example.com

# Test HTTP connectivity
kubectl run -n flux-system debug --rm -it --image=curlimages/curl -- \
  curl -v https://registry.example.com/v2/
```

If the artifact is large, increase the timeout on the source controller.

```bash
# Check current source controller arguments
kubectl get deploy source-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].args}'
```

## Error 6: Signature Verification Failure

### Symptoms

```
failed to verify artifact: no matching signatures
```

### Causes

- Artifact was not signed
- Wrong public key in the verification secret
- Signature was made with a different key
- For keyless: OIDC identity or issuer mismatch

### Resolution

Verify the signature exists and matches.

```bash
# Check if the artifact has a signature
cosign verify --key cosign.pub registry.example.com/manifests/app:v1.0.0

# For keyless verification, check the identity
COSIGN_EXPERIMENTAL=1 cosign verify \
  --certificate-identity="expected-identity" \
  --certificate-oidc-issuer="expected-issuer" \
  registry.example.com/manifests/app:v1.0.0
```

Ensure the Kubernetes secret contains the correct public key.

```bash
# Inspect the cosign public key secret
kubectl get secret cosign-pub-key -n flux-system \
  -o jsonpath='{.data.cosign\.pub}' | base64 -d
```

If the artifact is unsigned, sign it.

```bash
# Sign the artifact
cosign sign --key cosign.key registry.example.com/manifests/app:v1.0.0
```

## Error 7: Rate Limiting (429 Too Many Requests)

### Symptoms

```
failed to pull artifact: unexpected status code 429: rate limit exceeded
```

### Resolution

Increase the poll interval to reduce request frequency.

```yaml
# Reduce pull frequency to avoid rate limits
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  # Increase interval from 5m to 30m
  interval: 30m
  url: oci://registry.example.com/manifests/app
  ref:
    tag: v1.0.0
```

For Docker Hub specifically, consider using authenticated pulls (even for public images) to get higher rate limits, or set up a pull-through cache with a registry like Harbor.

## Quick Reference: Error to Solution

| Error Message | Likely Cause | First Step |
|--------------|-------------|------------|
| UNAUTHORIZED / 401 | Bad credentials | Verify secret contents |
| x509 certificate | Missing CA cert | Add `certSecretRef` |
| not found / 404 | Wrong URL or tag | Verify with `flux list artifacts` |
| no match for semver | No valid SemVer tags | Check tags with `crane ls` |
| context deadline | Network/firewall | Test connectivity from cluster |
| no matching signatures | Missing or wrong signature | Verify with `cosign verify` |
| 429 rate limit | Too frequent polling | Increase `spec.interval` |

## Force Reconciliation

After fixing an issue, force Flux to retry immediately instead of waiting for the next interval.

```bash
# Force an immediate reconciliation
flux reconcile source oci app-manifests
```

## Conclusion

Most OCIRepository pull errors in Flux fall into a handful of categories: authentication, TLS, artifact existence, version resolution, network, and verification. By starting with `flux get sources oci` and `kubectl describe`, you can quickly identify the error category and apply the targeted fix. The key is to methodically verify each layer -- credentials, network, certificate trust, and artifact availability -- using the debugging commands outlined in this guide. Once the root cause is identified, the fix is usually a secret update, URL correction, or configuration change away.
