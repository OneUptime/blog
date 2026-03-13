# How to Verify Flux Controller Image Signatures with Cosign

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Supply Chain, Cosign, Image Signing, Container Security

Description: Learn how to verify the authenticity and integrity of Flux controller container images using Cosign signature verification.

---

Ensuring the integrity of container images running in your Kubernetes cluster is a critical part of supply chain security. Flux CD signs all its controller images using Cosign, allowing you to verify that the images you deploy have not been tampered with. This guide walks you through the process of verifying Flux controller image signatures using Cosign.

## Prerequisites

Before you begin, make sure you have the following tools installed and configured:

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI installed (v2.0 or later)
- Cosign CLI installed (v2.0 or later)
- kubectl configured to communicate with your cluster
- Access to a terminal with internet connectivity

Install Cosign if you have not already:

```bash
# Install Cosign on Linux
curl -sSL https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 -o /usr/local/bin/cosign
chmod +x /usr/local/bin/cosign

# Verify installation
cosign version
```

## Step 1: Identify Flux Controller Images

First, list the Flux controller images currently deployed in your cluster:

```bash
kubectl get pods -n flux-system -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}'
```

You should see images like:

```
ghcr.io/fluxcd/source-controller:v1.2.0
ghcr.io/fluxcd/kustomize-controller:v1.2.0
ghcr.io/fluxcd/helm-controller:v0.37.0
ghcr.io/fluxcd/notification-controller:v1.2.0
```

## Step 2: Verify Image Signatures Using Cosign

Flux publishes its container images to the GitHub Container Registry and signs them using keyless signing with Sigstore. Verify an image signature with Cosign:

```bash
cosign verify ghcr.io/fluxcd/source-controller:v1.2.0 \
  --certificate-identity-regexp="https://github.com/fluxcd/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
```

This command checks that the image was signed by a GitHub Actions workflow in the fluxcd organization.

## Step 3: Verify All Flux Controller Images

Create a script to verify all Flux controller images at once:

```bash
#!/bin/bash

FLUX_IMAGES=$(kubectl get pods -n flux-system \
  -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}' | sort -u)

for image in $FLUX_IMAGES; do
  echo "Verifying: $image"
  cosign verify "$image" \
    --certificate-identity-regexp="https://github.com/fluxcd/.*" \
    --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
    2>&1

  if [ $? -eq 0 ]; then
    echo "PASS: $image signature verified"
  else
    echo "FAIL: $image signature verification failed"
  fi
  echo "---"
done
```

Save this as `verify-flux-images.sh` and run it:

```bash
chmod +x verify-flux-images.sh
./verify-flux-images.sh
```

## Step 4: Verify Signatures with a Specific Cosign Public Key

If your organization requires verification against a specific public key rather than keyless verification, you can download the Flux public key and use it:

```bash
# Download the Flux cosign public key
curl -sSL https://raw.githubusercontent.com/fluxcd/flux2/main/cosign.pub -o flux-cosign.pub

# Verify using the public key
cosign verify --key flux-cosign.pub ghcr.io/fluxcd/source-controller:v1.2.0
```

## Step 5: Inspect Signature Details

To view detailed information about the signature attached to an image:

```bash
cosign verify ghcr.io/fluxcd/source-controller:v1.2.0 \
  --certificate-identity-regexp="https://github.com/fluxcd/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  --output text
```

You can also view the signature payload in JSON format:

```bash
cosign verify ghcr.io/fluxcd/source-controller:v1.2.0 \
  --certificate-identity-regexp="https://github.com/fluxcd/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  --output json | jq .
```

## Verification

After running the verification commands, confirm the following:

1. Each Flux controller image returns a successful verification result
2. The certificate identity matches the fluxcd GitHub organization
3. The OIDC issuer matches the GitHub Actions token endpoint
4. No error messages appear in the output

A successful verification output will include details such as the certificate subject, issuer, and the transparency log entry.

## Troubleshooting

### Error: No matching signatures found

This may occur if the image tag does not have an associated signature. Ensure you are using an official Flux release tag:

```bash
# List available tags for a Flux controller image
crane ls ghcr.io/fluxcd/source-controller | grep -v sig | grep -v att
```

### Error: Certificate identity mismatch

If the certificate identity does not match, verify that you are using the correct identity regexp pattern:

```bash
# Use the exact identity pattern for Flux
cosign verify ghcr.io/fluxcd/source-controller:v1.2.0 \
  --certificate-identity="https://github.com/fluxcd/source-controller/.github/workflows/release.yml@refs/tags/v1.2.0" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
```

### Error: COSIGN_EXPERIMENTAL is no longer supported

If you encounter this error, update your Cosign CLI to the latest version. Older versions used the `COSIGN_EXPERIMENTAL` environment variable for keyless verification, which has been replaced by explicit flags:

```bash
# Update Cosign
go install github.com/sigstore/cosign/v2/cmd/cosign@latest
```

### Network connectivity issues

If Cosign cannot reach the Sigstore transparency log or Rekor server, check your network configuration:

```bash
# Test connectivity to Rekor
curl -s https://rekor.sigstore.dev/api/v1/log | jq .
```

## Summary

Verifying Flux controller image signatures with Cosign is a straightforward but essential step in securing your GitOps supply chain. By integrating signature verification into your deployment workflows, you ensure that only trusted and untampered images run in your Kubernetes clusters. Consider automating this verification as part of your CI/CD pipeline or using an admission controller like Sigstore Policy Controller to enforce signature requirements at the cluster level.
