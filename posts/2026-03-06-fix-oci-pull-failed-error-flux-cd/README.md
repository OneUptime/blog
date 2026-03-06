# How to Fix 'OCI pull failed' Error in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, OCI, Container Registry, Troubleshooting, Kubernetes, GitOps, Helm

Description: A practical guide to diagnosing and fixing OCI artifact pull failures in Flux CD, covering registry authentication, image discovery, and digest mismatch issues.

---

## Introduction

Flux CD supports pulling Kubernetes manifests and Helm charts from OCI-compliant container registries. When this process fails, you see "OCI pull failed" errors that prevent your workloads from being deployed. This guide covers the common causes of OCI pull failures and provides step-by-step fixes for each scenario.

## Identifying the Error

Check the OCIRepository or HelmRepository status:

```bash
# Check OCIRepository resources
kubectl get ocirepositories -A

# Get detailed error information
kubectl describe ocirepository <name> -n flux-system
```

Common error messages:

```python
Status:
  Conditions:
    - Type: Ready
      Status: "False"
      Reason: OCIOperationFailed
      Message: "failed to pull artifact from 'oci://registry.example.com/my-app':
        unexpected status code 401: unauthorized"
```

Or for Helm charts stored in OCI registries:

```bash
kubectl describe helmrepository <name> -n flux-system
```

```yaml
Message: "failed to login to OCI registry 'oci://registry.example.com/charts':
  GET https://registry.example.com/v2/: denied: access forbidden"
```

## Cause 1: Missing Registry Authentication

OCI registries often require authentication. If no credentials are configured, pull requests are rejected.

### Fix: Create Registry Credentials for OCIRepository

```bash
# Create a docker-registry secret with your credentials
kubectl create secret docker-registry oci-registry-creds \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  -n flux-system
```

Reference the secret in your OCIRepository:

```yaml
# ocirepository-with-auth.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/my-app
  ref:
    tag: latest
  # Reference the registry credentials
  secretRef:
    name: oci-registry-creds
```

### Fix: Create Credentials for OCI-Based HelmRepository

```yaml
# helmrepository-oci.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-charts
  namespace: flux-system
spec:
  type: oci
  interval: 10m
  url: oci://registry.example.com/charts
  # Reference the registry credentials
  secretRef:
    name: oci-registry-creds
```

### Fix: Cloud Provider Registry Authentication

#### AWS ECR

```bash
# Create an ECR credential helper secret
# First, get the login token
AWS_ACCOUNT_ID=123456789012
AWS_REGION=us-east-1

# Option 1: Static token (expires in 12 hours)
TOKEN=$(aws ecr get-login-password --region $AWS_REGION)
kubectl create secret docker-registry ecr-creds \
  --docker-server=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$TOKEN \
  -n flux-system
```

For long-lived authentication, use an IAM role with the ECR credential provider:

```yaml
# ecr-ocirepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  ref:
    tag: v1.0.0
  provider: aws
```

#### Google Artifact Registry

```yaml
# gar-ocirepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://us-docker.pkg.dev/my-project/my-repo/my-app
  ref:
    tag: v1.0.0
  # Use GCP workload identity for authentication
  provider: gcp
```

#### Azure Container Registry

```yaml
# acr-ocirepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://myregistry.azurecr.io/my-app
  ref:
    tag: v1.0.0
  # Use Azure workload identity for authentication
  provider: azure
```

## Cause 2: Artifact Not Found

The OCI artifact does not exist at the specified URL or tag.

### Diagnosing Artifact Not Found

```bash
# Test pulling the artifact with the Flux CLI
flux pull artifact oci://registry.example.com/my-app:v1.0.0 --output /tmp/artifact

# List available tags using crane (a useful OCI tool)
crane ls registry.example.com/my-app

# Or use oras to list tags
oras repo tags registry.example.com/my-app
```

### Fix: Verify the OCI URL and Tag

```yaml
# ocirepository-corrected.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Verify this URL matches exactly where the artifact is stored
  # Do NOT include the tag in the URL
  url: oci://registry.example.com/my-app
  ref:
    # Use a specific tag that exists
    tag: v1.0.0
    # Or use a semver range
    # semver: ">=1.0.0 <2.0.0"
    # Or use a digest for immutable references
    # digest: sha256:abc123...
```

### Fix: Push the Artifact if It Does Not Exist

```bash
# Push a Kustomize artifact to the OCI registry
flux push artifact oci://registry.example.com/my-app:v1.0.0 \
  --path=./apps/my-app \
  --source="$(git config --get remote.origin.url)" \
  --revision="$(git branch --show-current)@sha1:$(git rev-parse HEAD)"

# Verify the push was successful
flux pull artifact oci://registry.example.com/my-app:v1.0.0 --output /tmp/verify
ls -la /tmp/verify
```

## Cause 3: Digest Mismatch

When using digest-based references, a mismatch between the expected digest and the actual artifact digest causes pull failures.

### Diagnosing Digest Mismatch

```bash
# Check the digest of the remote artifact
crane digest registry.example.com/my-app:v1.0.0

# Compare with what Flux expects
kubectl get ocirepository my-app -n flux-system -o jsonpath='{.spec.ref.digest}'
```

### Fix: Update the Digest Reference

```yaml
# ocirepository-updated-digest.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/my-app
  ref:
    # Update to the correct digest
    digest: sha256:correct_digest_here
```

### Fix: Use Tag Instead of Digest

If digest management is problematic, switch to tags:

```yaml
# ocirepository-tag-based.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/my-app
  ref:
    # Use a mutable tag (updated via CI/CD)
    tag: latest
    # Or use semver for automatic version selection
    # semver: ">=1.0.0"
```

## Cause 4: TLS Certificate Issues

Self-signed certificates or private CA certificates can cause OCI pull failures.

### Fix: Configure Custom TLS Certificates

```bash
# Create a secret with your custom CA certificate
kubectl create secret generic oci-tls-certs \
  --from-file=ca.crt=/path/to/custom-ca.crt \
  -n flux-system
```

```yaml
# ocirepository-custom-tls.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.internal.example.com/my-app
  ref:
    tag: v1.0.0
  secretRef:
    name: oci-registry-creds
  # Reference the TLS certificate secret
  certSecretRef:
    name: oci-tls-certs
```

### Fix: Allow Insecure Registries (Development Only)

For development environments with self-signed certificates:

```yaml
# ocirepository-insecure.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.dev.local/my-app
  ref:
    tag: latest
  # Allow insecure HTTP connections (never use in production)
  insecure: true
```

## Cause 5: Network Connectivity Issues

The source-controller cannot reach the OCI registry due to network restrictions.

### Diagnosing Network Issues

```bash
# Test registry connectivity from inside the cluster
kubectl run -it --rm debug-oci \
  --image=curlimages/curl \
  --namespace=flux-system \
  --restart=Never \
  -- curl -v https://registry.example.com/v2/

# Check if DNS resolution works
kubectl run -it --rm debug-dns \
  --image=busybox \
  --namespace=flux-system \
  --restart=Never \
  -- nslookup registry.example.com
```

### Fix: Configure Proxy for OCI Access

```yaml
# Patch source-controller with proxy settings
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          env:
            - name: HTTPS_PROXY
              value: "http://proxy.example.com:3128"
            - name: NO_PROXY
              value: ".cluster.local,.svc,10.0.0.0/8"
```

## Quick Troubleshooting Commands

```bash
# 1. Check OCIRepository status
kubectl get ocirepository -A -o wide

# 2. Check source-controller logs for OCI errors
kubectl logs -n flux-system deploy/source-controller --tail=50 | grep -i "oci\|registry\|pull"

# 3. Verify credentials secret exists and has correct format
kubectl get secret oci-registry-creds -n flux-system -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | jq .

# 4. Test OCI pull with Flux CLI
flux pull artifact oci://registry.example.com/my-app:v1.0.0 --output /tmp/test

# 5. List tags on the remote registry
crane ls registry.example.com/my-app

# 6. Force reconciliation
flux reconcile source oci my-app

# 7. Check HelmRepository OCI status
kubectl get helmrepository -A -o wide
```

## Summary

OCI pull failures in Flux CD are typically caused by authentication issues, missing artifacts, digest mismatches, TLS certificate problems, or network connectivity. The most common fix is to create a properly formatted docker-registry secret and reference it in your OCIRepository or HelmRepository resource. For cloud provider registries, use the built-in provider authentication (aws, gcp, azure) instead of static credentials. Always verify that the artifact exists at the specified URL and tag using tools like the Flux CLI, crane, or oras before investigating more complex network or certificate issues.
