# How to Generate Docker Container SBOMs for Regulatory Compliance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, SBOM, compliance, supply chain security, syft, trivy, software bill of materials

Description: Generate and manage Software Bills of Materials (SBOMs) for Docker containers to meet regulatory compliance requirements.

---

Regulatory bodies increasingly require organizations to know exactly what software runs inside their systems. Executive Order 14028 in the United States, the EU Cyber Resilience Act, and industry-specific frameworks like PCI DSS 4.0 all point in the same direction: you need a Software Bill of Materials (SBOM) for your software. If your applications run in Docker containers, generating SBOMs for those containers is now a compliance requirement, not optional.

An SBOM lists every package, library, and dependency inside a container image. It answers the question: "What exactly is in this thing?" This guide shows you how to generate, store, verify, and integrate SBOMs into your Docker workflow.

## What Goes Into a Container SBOM

A comprehensive container SBOM includes:

- OS packages (apt, apk, yum packages)
- Language-specific packages (pip, npm, gem, go modules, Maven)
- Statically linked binaries and their versions
- Base image identification
- Container metadata (labels, environment variables)

Two standard formats dominate the SBOM landscape: SPDX (ISO standard) and CycloneDX (OWASP standard). Most tools support both.

## Generating SBOMs with Syft

Syft from Anchore is one of the most widely used SBOM generators for containers. It scans image layers and produces SBOMs in multiple formats.

```bash
# Install Syft
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Generate an SBOM for a Docker image in SPDX JSON format
syft registry.example.com/myapp:latest -o spdx-json > sbom-myapp-spdx.json

# Generate in CycloneDX format
syft registry.example.com/myapp:latest -o cyclonedx-json > sbom-myapp-cdx.json

# Generate a human-readable table format for quick inspection
syft registry.example.com/myapp:latest -o table
```

The table output gives you a quick overview:

```bash
# Show packages with their types and versions
syft registry.example.com/myapp:latest -o table | head -30
```

Output looks like:

```
NAME                  VERSION       TYPE
alpine-baselayout     3.4.3-r1      apk
busybox               1.36.1-r5     apk
ca-certificates       20240226-r0   apk
express               4.18.2        npm
lodash                4.17.21       npm
pg                    8.11.3        npm
```

## Generating SBOMs with Trivy

Trivy also generates SBOMs and can scan them for vulnerabilities in a single workflow.

```bash
# Generate a CycloneDX SBOM with Trivy
trivy image --format cyclonedx \
  --output sbom-myapp.cdx.json \
  registry.example.com/myapp:latest

# Generate an SPDX SBOM
trivy image --format spdx-json \
  --output sbom-myapp.spdx.json \
  registry.example.com/myapp:latest

# Scan an existing SBOM for vulnerabilities (no need to re-scan the image)
trivy sbom sbom-myapp.cdx.json
```

## Docker BuildKit Native SBOM Generation

Docker BuildKit 0.11+ can generate SBOMs during the build process itself. This captures build-time dependencies more accurately than post-build scanning.

```bash
# Build an image and generate an SBOM as a build attestation
docker buildx build \
  --sbom=true \
  --output type=image,name=registry.example.com/myapp:latest,push=true \
  .

# Inspect the SBOM attestation attached to the image
docker buildx imagetools inspect \
  registry.example.com/myapp:latest \
  --format '{{json .SBOM}}' | jq .
```

## Automating SBOM Generation in CI/CD

Integrate SBOM generation into your build pipeline so every image gets an SBOM automatically.

```yaml
# .github/workflows/sbom.yml
# Generates SBOMs for every Docker image build and stores them as artifacts

name: Build and Generate SBOM

on:
  push:
    branches: [main]

jobs:
  build-and-sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -t myapp:${{ github.sha }} .

      # Generate SBOM in both standard formats
      - name: Generate SPDX SBOM
        uses: anchore/sbom-action@v0
        with:
          image: myapp:${{ github.sha }}
          format: spdx-json
          output-file: sbom-spdx.json

      - name: Generate CycloneDX SBOM
        uses: anchore/sbom-action@v0
        with:
          image: myapp:${{ github.sha }}
          format: cyclonedx-json
          output-file: sbom-cyclonedx.json

      # Scan the SBOM for known vulnerabilities
      - name: Vulnerability check against SBOM
        run: |
          trivy sbom sbom-cyclonedx.json --severity CRITICAL,HIGH --exit-code 1

      # Store SBOMs as build artifacts for compliance records
      - name: Upload SBOMs
        uses: actions/upload-artifact@v4
        with:
          name: sbom-${{ github.sha }}
          path: |
            sbom-spdx.json
            sbom-cyclonedx.json
          retention-days: 365
```

## Storing and Managing SBOMs

SBOMs need a storage strategy. Compliance auditors expect you to produce the SBOM for any image running in production.

```bash
#!/bin/bash
# store-sbom.sh
# Generates and stores SBOMs alongside images in the registry using OCI artifacts

IMAGE="$1"

if [ -z "$IMAGE" ]; then
    echo "Usage: store-sbom.sh <image:tag>"
    exit 1
fi

SBOM_FILE="/tmp/sbom-$(echo $IMAGE | tr '/:' '-').cdx.json"

# Generate the SBOM
echo "Generating SBOM for $IMAGE..."
syft "$IMAGE" -o cyclonedx-json > "$SBOM_FILE"

# Attach the SBOM to the image as an OCI artifact using ORAS
# This keeps the SBOM co-located with the image in the registry
oras attach "$IMAGE" \
  --artifact-type application/vnd.cyclonedx+json \
  "$SBOM_FILE:application/vnd.cyclonedx+json"

echo "SBOM attached to $IMAGE"

# Also store a copy in a GCS bucket for long-term compliance records
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
gsutil cp "$SBOM_FILE" "gs://compliance-sboms/${IMAGE//\//-}_${TIMESTAMP}.cdx.json"

rm -f "$SBOM_FILE"
```

## Comparing SBOMs Between Image Versions

Track what changed between releases:

```bash
#!/bin/bash
# diff-sboms.sh
# Compares two SBOMs and shows added, removed, and updated packages

SBOM_OLD="$1"
SBOM_NEW="$2"

if [ -z "$SBOM_OLD" ] || [ -z "$SBOM_NEW" ]; then
    echo "Usage: diff-sboms.sh <old-sbom.json> <new-sbom.json>"
    exit 1
fi

echo "=== Packages added in new version ==="
# Find packages in the new SBOM that are not in the old one
diff <(jq -r '.components[]? | "\(.name) \(.version)"' "$SBOM_OLD" | sort) \
     <(jq -r '.components[]? | "\(.name) \(.version)"' "$SBOM_NEW" | sort) | \
     grep "^>" | sed 's/^> /  + /'

echo ""
echo "=== Packages removed in new version ==="
diff <(jq -r '.components[]? | "\(.name) \(.version)"' "$SBOM_OLD" | sort) \
     <(jq -r '.components[]? | "\(.name) \(.version)"' "$SBOM_NEW" | sort) | \
     grep "^<" | sed 's/^< /  - /'

echo ""
echo "Package counts:"
echo "  Old: $(jq '.components | length' "$SBOM_OLD")"
echo "  New: $(jq '.components | length' "$SBOM_NEW")"
```

## Validating SBOMs for Compliance

Not all SBOMs meet minimum quality standards. Validate that your SBOMs contain the required fields:

```bash
#!/bin/bash
# validate-sbom.sh
# Checks that an SBOM meets minimum compliance requirements

SBOM_FILE="$1"
PASS=true

if [ -z "$SBOM_FILE" ]; then
    echo "Usage: validate-sbom.sh <sbom.json>"
    exit 1
fi

echo "Validating SBOM: $SBOM_FILE"

# Check that the SBOM has a creation timestamp
CREATED=$(jq -r '.metadata.timestamp // .creationInfo.created // "missing"' "$SBOM_FILE")
if [ "$CREATED" = "missing" ]; then
    echo "FAIL: Missing creation timestamp"
    PASS=false
else
    echo "PASS: Creation timestamp present ($CREATED)"
fi

# Check that components/packages are listed
COMPONENT_COUNT=$(jq '.components // .packages | length' "$SBOM_FILE")
if [ "$COMPONENT_COUNT" -eq 0 ]; then
    echo "FAIL: No components found in SBOM"
    PASS=false
else
    echo "PASS: $COMPONENT_COUNT components listed"
fi

# Check that the tool information is present
TOOL=$(jq -r '.metadata.tools[0].name // .creationInfo.creators[0] // "missing"' "$SBOM_FILE")
if [ "$TOOL" = "missing" ]; then
    echo "FAIL: Missing tool/creator information"
    PASS=false
else
    echo "PASS: Tool identified ($TOOL)"
fi

# Check for package version information
MISSING_VERSIONS=$(jq '[.components[]? | select(.version == null or .version == "")] | length' "$SBOM_FILE")
if [ "$MISSING_VERSIONS" -gt 0 ]; then
    echo "WARN: $MISSING_VERSIONS components missing version information"
fi

if [ "$PASS" = true ]; then
    echo "RESULT: SBOM passes validation"
    exit 0
else
    echo "RESULT: SBOM failed validation"
    exit 1
fi
```

## Mapping SBOMs to Known Vulnerabilities

Once you have SBOMs, use them for ongoing vulnerability monitoring without rescanning images:

```bash
# Scan a stored SBOM against the latest vulnerability database
trivy sbom sbom-myapp.cdx.json --format json --output vuln-report.json

# Check if any components in the SBOM are affected by a specific CVE
jq '.Results[].Vulnerabilities[]? | select(.VulnerabilityID == "CVE-2024-1234")' vuln-report.json
```

This is particularly valuable when a new CVE drops. Instead of rescanning every image, you scan SBOMs to quickly identify which images contain the affected package.

## Compliance Framework Mapping

Different regulations require different SBOM attributes:

| Requirement | NTIA Minimum | PCI DSS 4.0 | EU CRA |
|------------|-------------|-------------|--------|
| Component name | Required | Required | Required |
| Version | Required | Required | Required |
| Supplier | Required | Recommended | Required |
| Unique ID | Required | Optional | Required |
| Dependency relationship | Required | Optional | Required |
| Timestamp | Required | Required | Required |
| Author of SBOM | Required | Optional | Required |

## Summary

SBOM generation for Docker containers is a compliance necessity that also strengthens your security posture. Use Syft or Trivy to generate SBOMs in SPDX or CycloneDX format. Automate generation in your CI/CD pipeline so every image ships with an SBOM. Store SBOMs alongside images using OCI artifacts, and validate them against your compliance requirements. When the next critical vulnerability is announced, your SBOMs let you identify affected images in seconds instead of hours.
