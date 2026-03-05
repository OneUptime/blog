# How to Verify Flux CD Software Bill of Materials (SBOM)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, SBOM, Supply Chain, SPDX

Description: Learn how to download, verify, and analyze Flux CD Software Bill of Materials (SBOM) to understand dependencies and identify vulnerabilities.

---

A Software Bill of Materials (SBOM) provides a complete inventory of components, libraries, and dependencies included in a software artifact. Flux CD publishes SBOMs for all its controller images, enabling you to audit dependencies and scan for known vulnerabilities. This guide shows you how to retrieve and verify Flux CD SBOMs.

## What is an SBOM

An SBOM is a machine-readable document that lists every component in a software package. Flux CD publishes SBOMs in SPDX format, which is a widely adopted standard. SBOMs help you:

- Identify all third-party libraries and their versions.
- Scan for known CVEs in dependencies.
- Meet regulatory compliance requirements.
- Track license obligations.

## Prerequisites

Install the necessary tools:

```bash
# Install Cosign for fetching signed SBOMs
brew install cosign

# Install Flux CLI
brew install fluxcd/tap/flux

# Install syft for SBOM analysis (optional)
brew install syft

# Install grype for vulnerability scanning against SBOMs (optional)
brew install grype
```

## Step 1: Download the SBOM from Flux CD Releases

Flux CD attaches SBOMs to each GitHub release. You can download them directly:

```bash
# Download the SBOM for a specific Flux CLI release
FLUX_VERSION="2.4.0"
curl -sLO "https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}/flux_${FLUX_VERSION}_sbom.spdx.json"

# View the SBOM contents
cat flux_${FLUX_VERSION}_sbom.spdx.json | jq '.packages | length'
echo "Total packages in SBOM"

# List all package names and versions
cat flux_${FLUX_VERSION}_sbom.spdx.json | jq -r '.packages[] | "\(.name) \(.versionInfo)"'
```

## Step 2: Retrieve SBOMs for Controller Images

Flux CD controller images have SBOMs attached as OCI artifacts. Use Cosign to download them:

```bash
# Download the SBOM for source-controller
cosign download sbom ghcr.io/fluxcd/source-controller:v1.4.1 > source-controller-sbom.spdx.json

# Download the SBOM for kustomize-controller
cosign download sbom ghcr.io/fluxcd/kustomize-controller:v1.4.0 > kustomize-controller-sbom.spdx.json

# Download the SBOM for helm-controller
cosign download sbom ghcr.io/fluxcd/helm-controller:v1.1.0 > helm-controller-sbom.spdx.json

# Download the SBOM for notification-controller
cosign download sbom ghcr.io/fluxcd/notification-controller:v1.4.0 > notification-controller-sbom.spdx.json
```

## Step 3: Analyze the SBOM Contents

Examine the SBOM to understand what dependencies are included:

```bash
# Count the number of packages in the source-controller SBOM
cat source-controller-sbom.spdx.json | jq '.packages | length'

# List all Go modules and their versions
cat source-controller-sbom.spdx.json | jq -r '.packages[] | select(.externalRefs != null) | "\(.name)@\(.versionInfo)"' | sort

# Find specific packages (e.g., check for a particular library)
cat source-controller-sbom.spdx.json | jq -r '.packages[] | select(.name | contains("crypto")) | "\(.name) \(.versionInfo)"'

# Check the SBOM creation info
cat source-controller-sbom.spdx.json | jq '.creationInfo'
```

## Step 4: Scan the SBOM for Vulnerabilities

Use Grype to scan the SBOM for known CVEs:

```bash
# Scan the source-controller SBOM for vulnerabilities
grype sbom:source-controller-sbom.spdx.json

# Scan with severity filtering (only Critical and High)
grype sbom:source-controller-sbom.spdx.json --fail-on high

# Output results in JSON for further processing
grype sbom:source-controller-sbom.spdx.json -o json > source-controller-vulns.json

# Scan all controller SBOMs
for SBOM in *-sbom.spdx.json; do
  echo "=== Scanning $SBOM ==="
  grype sbom:$SBOM --fail-on critical
  echo ""
done
```

## Step 5: Automate SBOM Verification in CI/CD

Add SBOM retrieval and scanning to your CI/CD pipeline:

```yaml
# .github/workflows/verify-flux-sbom.yaml
# GitHub Actions workflow to verify and scan Flux CD SBOMs
name: Verify Flux SBOMs
on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday at 6 AM
  workflow_dispatch: {}

jobs:
  verify-sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Cosign
        uses: sigstore/cosign-installer@v3

      - name: Install Grype
        uses: anchore/scan-action/download-grype@v4

      - name: Download and scan Flux SBOMs
        run: |
          CONTROLLERS=(
            "source-controller:v1.4.1"
            "kustomize-controller:v1.4.0"
            "helm-controller:v1.1.0"
            "notification-controller:v1.4.0"
          )

          for CTRL in "${CONTROLLERS[@]}"; do
            NAME="${CTRL%%:*}"
            echo "Processing $NAME..."

            # Download SBOM
            cosign download sbom "ghcr.io/fluxcd/${CTRL}" > "${NAME}-sbom.spdx.json"

            # Scan for vulnerabilities
            grype "sbom:${NAME}-sbom.spdx.json" --fail-on critical
          done

      - name: Upload SBOMs as artifacts
        uses: actions/upload-artifact@v4
        with:
          name: flux-sboms
          path: '*-sbom.spdx.json'
```

## Step 6: Compare SBOMs Between Versions

When upgrading Flux, compare SBOMs to understand what changed:

```bash
# Download SBOMs for two versions
cosign download sbom ghcr.io/fluxcd/source-controller:v1.3.0 > sc-old.spdx.json
cosign download sbom ghcr.io/fluxcd/source-controller:v1.4.1 > sc-new.spdx.json

# Extract package lists and compare
jq -r '.packages[] | "\(.name)@\(.versionInfo)"' sc-old.spdx.json | sort > old-packages.txt
jq -r '.packages[] | "\(.name)@\(.versionInfo)"' sc-new.spdx.json | sort > new-packages.txt

# Show added packages
diff old-packages.txt new-packages.txt | grep "^>" | sed 's/^> /ADDED: /'

# Show removed packages
diff old-packages.txt new-packages.txt | grep "^<" | sed 's/^< /REMOVED: /'
```

## Best Practices

1. **Scan SBOMs regularly**: Dependencies may have new CVEs discovered after release. Run regular scans.
2. **Store SBOMs**: Archive SBOMs for every Flux version you deploy for future auditing.
3. **Automate in CI/CD**: Never rely on manual SBOM verification. Integrate it into your deployment pipeline.
4. **Compare before upgrading**: Always compare SBOMs between old and new Flux versions to understand dependency changes.
5. **Use SBOMs for compliance**: SBOMs satisfy software composition analysis requirements in many regulatory frameworks.

Verifying Flux CD SBOMs is an essential part of supply chain security. By understanding exactly what components are included in your GitOps controllers, you can proactively identify and mitigate vulnerabilities before they are exploited.
