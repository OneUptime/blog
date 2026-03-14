# How to Implement Supply Chain Levels for Software Artifacts (SLSA) with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Supply Chain, SLSA, Provenance, Build Security, CI/CD

Description: Learn how to implement the SLSA framework in your Flux-based GitOps pipeline to achieve higher supply chain security levels for your software artifacts.

---

Supply-chain Levels for Software Artifacts (SLSA, pronounced "salsa") is a security framework that provides a checklist of standards and controls to prevent tampering, improve integrity, and secure packages and infrastructure. This guide explains how to implement SLSA practices in your Flux-based GitOps pipeline, from generating provenance attestations to enforcing verification at deployment time.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI installed and bootstrapped (v2.1 or later)
- GitHub Actions or another CI/CD platform with OIDC support
- Cosign CLI (v2.0 or later)
- slsa-verifier CLI
- kubectl configured to access your cluster

## Step 1: Understand SLSA Levels

SLSA defines four levels of increasing security assurance:

- **SLSA Level 1**: Documentation of the build process (build provenance exists)
- **SLSA Level 2**: Tamper resistance of the build service (hosted build, signed provenance)
- **SLSA Level 3**: Extra resistance to specific threats (isolated builds, non-falsifiable provenance)
- **SLSA Level 4**: Highest assurance (hermetic, reproducible builds, two-party review)

Flux controller images are built with SLSA Level 3 compliance. This guide helps you achieve similar levels for your own artifacts.

## Step 2: Generate SLSA Provenance in GitHub Actions

Use the SLSA GitHub generator to create provenance attestations for your container images:

```yaml
# .github/workflows/build-slsa.yaml
name: Build with SLSA Provenance
on:
  push:
    tags: ["v*"]

permissions:
  contents: read
  packages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.build.outputs.image }}
      digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.ref_name }}

      - name: Output image info
        run: |
          echo "image=ghcr.io/${{ github.repository }}" >> "$GITHUB_OUTPUT"
          echo "digest=${{ steps.build.outputs.digest }}" >> "$GITHUB_OUTPUT"

  provenance:
    needs: build
    permissions:
      actions: read
      id-token: write
      packages: write
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v1.9.0
    with:
      image: ${{ needs.build.outputs.image }}
      digest: ${{ needs.build.outputs.digest }}
      registry-username: ${{ github.actor }}
    secrets:
      registry-password: ${{ secrets.GITHUB_TOKEN }}
```

## Step 3: Generate SLSA Provenance for CLI Binaries

For binary artifacts, use the SLSA generic generator:

```yaml
# .github/workflows/release-slsa.yaml
name: Release with SLSA Provenance
on:
  push:
    tags: ["v*"]

permissions:
  contents: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      hashes: ${{ steps.hash.outputs.hashes }}
    steps:
      - uses: actions/checkout@v4

      - name: Build binary
        run: |
          GOOS=linux GOARCH=amd64 go build -o myapp-linux-amd64 .
          GOOS=darwin GOARCH=amd64 go build -o myapp-darwin-amd64 .

      - name: Generate hashes
        id: hash
        run: |
          echo "hashes=$(sha256sum myapp-* | base64 -w0)" >> "$GITHUB_OUTPUT"

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: binaries
          path: myapp-*

  provenance:
    needs: build
    permissions:
      actions: read
      contents: write
      id-token: write
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.9.0
    with:
      base64-subjects: ${{ needs.build.outputs.hashes }}
      upload-assets: true
```

## Step 4: Verify SLSA Provenance Before Deployment

Configure a verification step in your deployment pipeline:

```bash
#!/bin/bash
set -euo pipefail

IMAGE="ghcr.io/myorg/myapp"
TAG="v1.0.0"

echo "Verifying SLSA provenance for ${IMAGE}:${TAG}..."

slsa-verifier verify-image "${IMAGE}:${TAG}" \
  --source-uri github.com/myorg/myapp \
  --source-tag "${TAG}" \
  --builder-id "https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@refs/tags/v1.9.0"

if [ $? -eq 0 ]; then
  echo "SLSA provenance verified successfully"
else
  echo "SLSA provenance verification FAILED - aborting deployment"
  exit 1
fi
```

## Step 5: Configure Flux to Verify SLSA Provenance

Set up Flux OCIRepository resources that verify provenance attestations:

```yaml
# clusters/my-cluster/apps/ocirepository-slsa.yaml
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
        subject: "https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@refs/tags/v1.9.0"
```

## Step 6: Enforce SLSA Requirements with Kyverno

Create admission policies that check for SLSA provenance attestations:

```yaml
# clusters/my-cluster/kyverno/policies/require-slsa-provenance.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-slsa-provenance
  annotations:
    policies.kyverno.io/title: Require SLSA Provenance
    policies.kyverno.io/description: >-
      Requires container images to have SLSA provenance attestations
      signed by the SLSA GitHub generator.
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: check-slsa-provenance
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
      verifyImages:
        - imageReferences:
            - "ghcr.io/myorg/*"
          attestations:
            - type: https://slsa.dev/provenance/v0.2
              attestors:
                - count: 1
                  entries:
                    - keyless:
                        subject: "https://github.com/slsa-framework/slsa-github-generator/.github/workflows/*"
                        issuer: "https://token.actions.githubusercontent.com"
                        rekor:
                          url: https://rekor.sigstore.dev
              conditions:
                - all:
                    - key: "{{ builder.id }}"
                      operator: Equals
                      value: "https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@refs/tags/v1.9.0"
```

## Step 7: Monitor SLSA Compliance

Create a monitoring script to regularly check SLSA compliance of deployed images:

```bash
#!/bin/bash
set -euo pipefail

echo "Checking SLSA compliance for all deployed images..."

NAMESPACES="production staging"
REPORT_FILE="slsa-compliance-report.txt"

echo "SLSA Compliance Report - $(date)" > "$REPORT_FILE"
echo "=====================================" >> "$REPORT_FILE"

for ns in $NAMESPACES; do
  echo "" >> "$REPORT_FILE"
  echo "Namespace: $ns" >> "$REPORT_FILE"
  echo "---" >> "$REPORT_FILE"

  IMAGES=$(kubectl get pods -n "$ns" -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}' | sort -u)

  for image in $IMAGES; do
    result=$(slsa-verifier verify-image "$image" \
      --source-uri "github.com/myorg/*" 2>&1 || true)

    if echo "$result" | grep -q "PASSED"; then
      echo "PASS: $image" >> "$REPORT_FILE"
    else
      echo "FAIL: $image" >> "$REPORT_FILE"
    fi
  done
done

cat "$REPORT_FILE"
```

## Verification

After implementing the SLSA workflow, verify the following:

1. Provenance attestations are generated for each build:

```bash
cosign verify-attestation ghcr.io/myorg/myapp:v1.0.0 \
  --type slsaprovenance \
  --certificate-identity-regexp="https://github.com/slsa-framework/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
```

2. The slsa-verifier confirms SLSA Level 3 compliance:

```bash
slsa-verifier verify-image ghcr.io/myorg/myapp:v1.0.0 \
  --source-uri github.com/myorg/myapp
```

3. Flux successfully reconciles with provenance verification enabled
4. Kyverno policies correctly enforce SLSA requirements on new deployments

## Troubleshooting

### Provenance generation fails in GitHub Actions

Ensure the workflow has the required permissions:

```yaml
permissions:
  actions: read
  id-token: write
  packages: write
  contents: write
```

### slsa-verifier fails with builder ID mismatch

Check the exact builder version used by inspecting the attestation:

```bash
cosign verify-attestation ghcr.io/myorg/myapp:v1.0.0 \
  --type slsaprovenance \
  --certificate-identity-regexp=".*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  | jq -r '.payload' | base64 -d | jq '.predicate.builder.id'
```

### Kyverno attestation verification timeout

Increase the webhook timeout and ensure Kyverno has network access to the Rekor transparency log:

```yaml
spec:
  webhookTimeoutSeconds: 60
```

### Source URI verification fails

The source URI must match the GitHub repository exactly:

```bash
# Check the configured source in the provenance
cosign verify-attestation ghcr.io/myorg/myapp:v1.0.0 \
  --type slsaprovenance \
  --certificate-identity-regexp=".*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  | jq -r '.payload' | base64 -d | jq '.predicate.invocation.configSource.uri'
```

## Summary

Implementing SLSA with Flux creates a comprehensive supply chain security framework for your GitOps workflows. By generating provenance attestations during the build process, verifying them at deployment time through Flux, and enforcing requirements through admission controllers, you establish a robust chain of trust from source code to production. This layered approach significantly reduces the risk of supply chain attacks and provides auditable evidence of build integrity across your software delivery pipeline.
