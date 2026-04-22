# How to Set Up SBOM Generation in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, SBOM, Security, Compliance, Kubernetes

Description: Guide to automating SBOM (Software Bill of Materials) generation for container images in Rancher.

## Introduction

SBOM generation in Rancher-managed Kubernetes environments starts with discovering the images that are running in your clusters, then generating Software Bills of Materials for those image references with a tool such as Syft. This guide provides practical implementation steps for security teams and platform engineers.

## Why This Matters

Container and Kubernetes environments face unique supply chain challenges:
- Dynamic workloads make it hard to keep an accurate image inventory
- Supply chain attacks target container images and their dependencies
- Compliance programs often require component and license inventories
- Vulnerability response depends on knowing which workloads include affected packages

SBOM generation in Rancher addresses these challenges by giving teams a repeatable inventory of the software components deployed in their clusters.

## Prerequisites

- Rancher-managed Kubernetes cluster with permission to list pods
- kubectl configured with a kubeconfig downloaded from Rancher, or access to the Rancher kubectl shell
- Syft 1.x installed for SBOM generation
- jq and standard Unix tools such as sort and tr
- Registry credentials for any private images you need to scan

## Step 1: Assess Current Image Inventory

```bash
# List unique init container and application container images across all namespaces
kubectl get pods --all-namespaces \
  -o jsonpath="{.items[*].spec['initContainers', 'containers'][*].image}" |
  tr -s '[[:space:]]' '\n' |
  sort -u > images.txt

cat images.txt

# Optional: map images back to the pod that uses them
kubectl get pods --all-namespaces \
  -o jsonpath='{range .items[*]}{.metadata.namespace}{"/"}{.metadata.name}{":\t"}{range .spec.containers[*]}{.image}{" "}{end}{range .spec.initContainers[*]}{.image}{" "}{end}{"\n"}{end}' |
  sort
```

## Step 2: Configure SBOM Tooling

```bash
# Install Syft on your workstation or CI runner
curl -sSfL https://get.anchore.io/syft | sudo sh -s -- -b /usr/local/bin

# Verify the installation
syft version
```

## Step 3: Generate an SBOM for a Workload Image

```bash
mkdir -p sboms

# Replace this with an image from images.txt; prefer immutable digests in production
IMAGE=registry.example.com/app:1.0.0
SBOM_NAME=$(printf '%s' "$IMAGE" | tr '/:@' '---')

# Generate SPDX JSON and CycloneDX JSON outputs
syft "$IMAGE" \
  -o spdx-json="sboms/${SBOM_NAME}.spdx.json" \
  -o cyclonedx-json="sboms/${SBOM_NAME}.cdx.json"
```

## Step 4: Generate SBOMs for Rancher Workloads

```bash
mkdir -p sboms

while IFS= read -r image; do
  [ -n "$image" ] || continue
  sbom_name=$(printf '%s' "$image" | tr '/:@' '---')
  syft "$image" -o spdx-json="sboms/${sbom_name}.spdx.json"
done < images.txt
```

## Step 5: Automate SBOM Generation

```yaml
# .github/workflows/sbom.yaml
name: Generate SBOM

on:
  push:
    branches:
      - main

jobs:
  sbom:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    env:
      IMAGE_REF: registry.example.com/app:${{ github.sha }}
    steps:
      - name: Generate image SBOM
        uses: anchore/sbom-action@v0
        with:
          image: ${{ env.IMAGE_REF }}
          registry-username: ${{ secrets.REGISTRY_USERNAME }}
          registry-password: ${{ secrets.REGISTRY_PASSWORD }}
          format: spdx-json
          output-file: sbom.spdx.json
          artifact-name: sbom.spdx.json
```

## Step 6: Scan SBOMs for Vulnerabilities and Licenses

```bash
# Trivy can read SPDX and CycloneDX SBOMs and correlate them with vulnerability data
trivy sbom sboms/registry.example.com-app-1.0.0.spdx.json

# Include license scanning when your compliance process requires it
trivy sbom --scanners vuln,license sboms/registry.example.com-app-1.0.0.spdx.json
```

## Step 7: Verify SBOM Generation

```bash
#!/usr/bin/env bash
# sbom-verification.sh

set -euo pipefail

echo "=== SBOM Generation Verification ==="

expected=$(grep -cve '^[[:space:]]*$' images.txt)
actual=$(find sboms -name '*.spdx.json' -type f | wc -l | tr -d ' ')

echo "Images found: $expected"
echo "SPDX SBOMs generated: $actual"

test "$actual" -ge "$expected"

for sbom in sboms/*.spdx.json; do
  jq -e '.spdxVersion and (.packages | type == "array")' "$sbom" >/dev/null
done

echo "SBOM validation checks passed"
echo "=== Verification Complete ==="
```

## Conclusion

Implementing SBOM generation for Rancher-managed workloads adds an important layer of supply chain visibility to your Kubernetes security posture. Combine SBOM generation with image scanning, admission controls, network policies, and RBAC for comprehensive defense-in-depth. Regular SBOM generation in CI/CD and periodic checks against running cluster images help ensure your inventory remains accurate over time.
