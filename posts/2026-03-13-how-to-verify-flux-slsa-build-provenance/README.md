# How to Verify Flux SLSA Build Provenance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Supply Chain, SLSA, Provenance, Build Verification

Description: Learn how to verify SLSA build provenance for Flux controller images and CLI binaries to ensure they were built from trusted sources.

---

Supply-chain Levels for Software Artifacts (SLSA) is a security framework that establishes standards for software supply chain integrity. Flux CD provides SLSA Level 3 provenance attestations for its controller images and CLI binaries, allowing you to verify that artifacts were built from the correct source code in a trusted build environment. This guide walks you through verifying Flux SLSA provenance.

## Prerequisites

Before you begin, make sure you have:

- The slsa-verifier CLI installed
- Cosign CLI (v2.0 or later)
- curl, jq, and crane utilities
- Flux CLI (v2.0 or later)
- Access to a terminal with internet connectivity

Install the SLSA verifier:

```bash
# Install slsa-verifier

curl -sSL https://github.com/slsa-framework/slsa-verifier/releases/latest/download/slsa-verifier-linux-amd64 -o /usr/local/bin/slsa-verifier
chmod +x /usr/local/bin/slsa-verifier

# Verify installation
slsa-verifier version
```

## Step 1: Verify SLSA Provenance for Flux Controller Images

Verify the build provenance of a Flux controller image using slsa-verifier:

```bash
IMAGE="ghcr.io/fluxcd/source-controller:v1.2.0"
IMAGE="${IMAGE}@$(crane digest "${IMAGE}")"

slsa-verifier verify-image "$IMAGE" \
  --source-uri github.com/fluxcd/source-controller \
  --source-tag v1.2.0
```

A successful verification output will look like:

```text
Verified build using builder "https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@refs/tags/v1.9.0" at commit abc123...
PASSED: SLSA verification passed
```

## Step 2: Verify Provenance for All Flux Controllers

Verify provenance for every Flux controller image:

```bash
#!/bin/bash
set -euo pipefail

declare -A CONTROLLERS=(
  ["source-controller"]="v1.2.0"
  ["kustomize-controller"]="v1.2.0"
  ["helm-controller"]="v0.37.0"
  ["notification-controller"]="v1.2.0"
  ["image-reflector-controller"]="v0.31.0"
  ["image-automation-controller"]="v0.36.0"
)

for controller in "${!CONTROLLERS[@]}"; do
  version="${CONTROLLERS[$controller]}"
  image="ghcr.io/fluxcd/${controller}:${version}"
  image="${image}@$(crane digest "${image}")"
  repo="github.com/fluxcd/${controller}"

  echo "Verifying SLSA provenance for ${image}..."
  slsa-verifier verify-image "$image" \
    --source-uri "$repo" \
    --source-tag "$version" && \
    echo "PASS: ${controller}" || \
    echo "FAIL: ${controller}"
  echo "---"
done
```

## Step 3: Verify SLSA Provenance for Flux CLI Binaries

Download and verify the SLSA provenance for the Flux CLI binary:

```bash
FLUX_VERSION="2.2.0"

# Download the binary
curl -sSL -o flux.tar.gz \
  "https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}/flux_${FLUX_VERSION}_linux_amd64.tar.gz"

# Download the provenance attestation
curl -sSL -o flux.intoto.jsonl \
  "https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}/provenance.intoto.jsonl"

# Verify the binary provenance
slsa-verifier verify-artifact flux.tar.gz \
  --provenance-path flux.intoto.jsonl \
  --source-uri github.com/fluxcd/flux2 \
  --source-tag "v${FLUX_VERSION}"
```

## Step 4: Inspect Provenance Details with Cosign

Use Cosign to extract and examine the full provenance attestation:

```bash
# Extract the provenance attestation
cosign verify-attestation ghcr.io/fluxcd/source-controller:v1.2.0 \
  --type slsaprovenance \
  --certificate-identity-regexp="https://github.com/slsa-framework/slsa-github-generator/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  | jq -r '.payload' | base64 -d | jq .
```

Review the key fields in the provenance:

```bash
# Extract builder information
cosign verify-attestation ghcr.io/fluxcd/source-controller:v1.2.0 \
  --type slsaprovenance \
  --certificate-identity-regexp="https://github.com/slsa-framework/slsa-github-generator/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  | jq -r '.payload' | base64 -d | jq '{
    builder: .predicate.builder.id,
    sourceRepo: .predicate.invocation.configSource.uri,
    sourceDigest: .predicate.invocation.configSource.digest,
    buildType: .predicate.buildType
  }'
```

## Step 5: Verify Provenance Against Specific Build Requirements

For stricter verification, you can specify the expected builder:

```bash
IMAGE="ghcr.io/fluxcd/source-controller:v1.2.0"
IMAGE="${IMAGE}@$(crane digest "${IMAGE}")"

slsa-verifier verify-image "$IMAGE" \
  --source-uri github.com/fluxcd/source-controller \
  --source-tag v1.2.0 \
  --builder-id "https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@refs/tags/v1.9.0"
```

## Verification

Confirm the following after running the provenance verification:

1. The slsa-verifier returns "PASSED: SLSA verification passed" for each artifact
2. The source URI matches the expected Flux GitHub repository
3. The builder ID references the SLSA GitHub generator
4. The source tag matches the expected release version

Check the SLSA generator build type:

```bash
# The provenance attestation should indicate the SLSA container generator
cosign verify-attestation ghcr.io/fluxcd/source-controller:v1.2.0 \
  --type slsaprovenance \
  --certificate-identity-regexp="https://github.com/slsa-framework/slsa-github-generator/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  | jq -r '.payload' | base64 -d | jq '.predicate.buildType'
```

## Troubleshooting

### Error: No provenance attestation found

Ensure the image version supports SLSA provenance. Flux provenance attestations are available starting with Flux v2.0.1 for the Flux CLI image and v1.0.0 or later for the main controllers shown above, with helm-controller starting at v0.35.0, image-reflector-controller at v0.29.0, and image-automation-controller at v0.35.0:

```bash
# Check if the image has attestations
cosign tree ghcr.io/fluxcd/source-controller:v1.2.0
```

### Error: Source URI mismatch

Verify you are using the correct source repository URI. Each controller has its own repository:

```bash
# Source controller
IMAGE="ghcr.io/fluxcd/source-controller:v1.2.0"
IMAGE="${IMAGE}@$(crane digest "${IMAGE}")"

slsa-verifier verify-image "$IMAGE" \
  --source-uri github.com/fluxcd/source-controller \
  --source-tag v1.2.0

# Kustomize controller
IMAGE="ghcr.io/fluxcd/kustomize-controller:v1.2.0"
IMAGE="${IMAGE}@$(crane digest "${IMAGE}")"

slsa-verifier verify-image "$IMAGE" \
  --source-uri github.com/fluxcd/kustomize-controller \
  --source-tag v1.2.0
```

### Error: Builder ID verification failed

If the builder ID does not match, check the exact builder version used for the release:

```bash
# Inspect the builder ID from the attestation
cosign verify-attestation ghcr.io/fluxcd/source-controller:v1.2.0 \
  --type slsaprovenance \
  --certificate-identity-regexp="https://github.com/slsa-framework/slsa-github-generator/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  | jq -r '.payload' | base64 -d | jq '.predicate.builder.id'
```

### slsa-verifier binary not found

If slsa-verifier is not in your PATH, install it using Go:

```bash
go install github.com/slsa-framework/slsa-verifier/v2/cli/slsa-verifier@latest
```

## Summary

Verifying SLSA build provenance for Flux artifacts confirms that the software was built from the expected source code, using a trusted build system, and has not been tampered with during the build process. By incorporating SLSA verification into your deployment pipeline, you add a strong layer of supply chain security that complements image signature verification and SBOM analysis. Flux's SLSA Level 3 compliance demonstrates a commitment to build integrity and transparency.
