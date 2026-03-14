# How to Use Cosign Keyless Verification with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Supply Chain, Cosign, Keyless Verification, Sigstore, OIDC

Description: Learn how to configure Flux to use Cosign keyless verification with Sigstore for verifying container image signatures without managing private keys.

---

Cosign keyless verification eliminates the need to manage long-lived signing keys by using short-lived certificates tied to OIDC identities. With Sigstore's Fulcio certificate authority and Rekor transparency log, you can sign and verify container images based on the identity of the signer rather than a static key. This guide shows you how to configure Flux to use Cosign keyless verification for your OCI artifacts.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI installed and bootstrapped (v2.1 or later)
- Cosign CLI (v2.0 or later)
- kubectl configured to access your cluster
- Container images signed with Cosign keyless signing
- A CI/CD system with OIDC support (e.g., GitHub Actions, GitLab CI)

## Step 1: Understand Keyless Signing and Verification

In keyless mode, Cosign works as follows:

1. The signer authenticates via an OIDC provider (e.g., GitHub, Google, Microsoft)
2. Sigstore's Fulcio CA issues a short-lived certificate bound to the signer's identity
3. The signature and certificate are recorded in the Rekor transparency log
4. Verifiers check the signature against the certificate and transparency log

No long-lived private keys need to be stored or rotated.

## Step 2: Sign Images with Cosign Keyless in CI/CD

Set up keyless signing in a GitHub Actions workflow:

```yaml
# .github/workflows/build-and-sign.yaml
name: Build and Sign
on:
  push:
    tags: ["v*"]

permissions:
  contents: read
  packages: write
  id-token: write  # Required for keyless signing

jobs:
  build-and-sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: sigstore/cosign-installer@v3

      - name: Login to registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push image
        uses: docker/build-push-action@v5
        id: build
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.ref_name }}

      - name: Sign image with Cosign keyless
        run: |
          cosign sign --yes \
            ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}
```

## Step 3: Configure Flux OCIRepository with Keyless Verification

Create an OCIRepository resource that uses keyless verification by specifying the OIDC identity:

```yaml
# clusters/my-cluster/apps/ocirepository-keyless.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/myorg/myapp-manifests
  ref:
    semver: ">=1.0.0"
  verify:
    provider: cosign
    matchOIDCIdentity:
      - issuer: "https://token.actions.githubusercontent.com"
        subject: "https://github.com/myorg/myapp/.github/workflows/build-and-sign.yaml@refs/heads/main"
```

## Step 4: Use Regular Expression Matching for OIDC Identity

For more flexible identity matching, use regular expressions:

```yaml
# clusters/my-cluster/apps/ocirepository-keyless-regexp.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app-flexible
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/myorg/myapp-manifests
  ref:
    tag: latest
  verify:
    provider: cosign
    matchOIDCIdentity:
      - issuer: "https://token.actions.githubusercontent.com"
        subject: "https://github.com/myorg/myapp/.*"
```

## Step 5: Configure Keyless Verification for Flux Controller Images

Verify Flux's own controller images using keyless verification:

```yaml
# clusters/my-cluster/flux-system/verify-flux.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: flux-manifests
  namespace: flux-system
spec:
  interval: 10m
  url: oci://ghcr.io/fluxcd/flux-manifests
  ref:
    tag: v2.2.0
  verify:
    provider: cosign
    matchOIDCIdentity:
      - issuer: "https://token.actions.githubusercontent.com"
        subject: "https://github.com/fluxcd/flux2/.github/workflows/.*"
```

## Step 6: Configure Multiple OIDC Identities

If your images may be signed by different CI/CD systems, configure multiple identity matches:

```yaml
# clusters/my-cluster/apps/ocirepository-multi-identity.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app-multi
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/myorg/myapp-manifests
  ref:
    tag: latest
  verify:
    provider: cosign
    matchOIDCIdentity:
      - issuer: "https://token.actions.githubusercontent.com"
        subject: "https://github.com/myorg/myapp/.*"
      - issuer: "https://accounts.google.com"
        subject: "build-service@myproject.iam.gserviceaccount.com"
```

## Step 7: Push and Sign OCI Artifacts for Flux

Push Kubernetes manifests as OCI artifacts and sign them keylessly:

```bash
# Push manifests as an OCI artifact
flux push artifact oci://ghcr.io/myorg/myapp-manifests:v1.0.0 \
  --path=./manifests \
  --source="https://github.com/myorg/myapp" \
  --revision="v1.0.0/$(git rev-parse HEAD)"

# Sign the artifact keylessly (requires OIDC authentication)
cosign sign --yes ghcr.io/myorg/myapp-manifests:v1.0.0
```

## Verification

After deploying the configuration, confirm the following:

1. Check the OCIRepository reconciliation:

```bash
flux get sources oci -A
```

2. View detailed status including verification results:

```bash
kubectl describe ocirepository my-app -n flux-system
```

3. Check for verification events:

```bash
kubectl get events -n flux-system --field-selector reason=VerificationSucceeded
```

4. Manually verify the image signature to confirm keyless verification works:

```bash
cosign verify ghcr.io/myorg/myapp-manifests:v1.0.0 \
  --certificate-identity-regexp="https://github.com/myorg/myapp/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
```

## Troubleshooting

### Error: No matching signatures with expected OIDC identity

The OIDC subject or issuer may not match. Inspect the actual certificate identity on the image:

```bash
cosign verify ghcr.io/myorg/myapp-manifests:v1.0.0 \
  --certificate-identity-regexp=".*" \
  --certificate-oidc-issuer-regexp=".*" \
  --output json | jq '.[0].optional'
```

Use the output to adjust the `matchOIDCIdentity` fields in your OCIRepository.

### Error: Connectivity issues with Sigstore services

Keyless verification requires access to Fulcio and Rekor. Test connectivity:

```bash
curl -s https://fulcio.sigstore.dev/api/v2/configuration | jq .
curl -s https://rekor.sigstore.dev/api/v1/log | jq .
```

If running in an air-gapped environment, consider deploying a private Sigstore infrastructure.

### Error: Token exchange failed during signing

Ensure your CI/CD environment has OIDC token generation enabled:

```yaml
# GitHub Actions: ensure id-token permission is set
permissions:
  id-token: write
```

### OCIRepository reconciliation stuck

Force a reconciliation:

```bash
flux reconcile source oci my-app -n flux-system
```

Check the controller logs for verification errors:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i verif
```

### Signatures expired

Cosign keyless signatures include a timestamp from the Rekor transparency log. If verification fails due to expired certificates, ensure the Rekor timestamp is being checked:

```bash
cosign verify ghcr.io/myorg/myapp:v1.0.0 \
  --certificate-identity-regexp=".*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  --insecure-ignore-tlog=false
```

## Summary

Cosign keyless verification with Flux provides a modern approach to supply chain security that eliminates the operational burden of key management. By tying image signatures to verifiable OIDC identities and recording them in a public transparency log, you gain strong assurance that your artifacts were produced by trusted CI/CD workflows. Configuring Flux to verify these signatures ensures that only properly signed artifacts are deployed to your Kubernetes clusters, creating a seamless and secure GitOps pipeline.
