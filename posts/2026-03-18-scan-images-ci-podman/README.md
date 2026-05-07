# How to Scan Images in CI with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, CI/CD, Security, Vulnerability Scanning

Description: Learn how to integrate container image vulnerability scanning into your CI/CD pipeline using Podman with tools like Trivy, Grype, and Syft.

---

> Scanning container images in CI catches vulnerabilities before they reach production, making security a natural part of your delivery pipeline.

Container image scanning is a critical security practice that identifies known vulnerabilities in your images before deployment. Podman works seamlessly with popular scanning tools like Trivy, Grype, and Syft. This guide shows you how to integrate vulnerability scanning into your CI/CD pipeline using Podman.

---

## Scanning with Trivy

Trivy is one of the most popular container vulnerability scanners. It can scan Podman images directly.

```bash
#!/bin/bash
# Install Trivy for container image scanning

# Trivy detects vulnerabilities in OS packages and language dependencies

# Install Trivy on Ubuntu-based CI runners
sudo apt-get update
sudo apt-get install -y wget apt-transport-https
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | \
  gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" | \
  sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install -y trivy

# Build the image with Podman
podman build -t myapp:scan .

# Save the Podman image as a tar for Trivy to scan
podman save -o /tmp/myapp-scan.tar myapp:scan

# Scan the image for vulnerabilities
trivy image --input /tmp/myapp-scan.tar \
  --severity HIGH,CRITICAL \
  --exit-code 1 \
  --format table
SCAN_EXIT=$?

# Clean up
rm -f /tmp/myapp-scan.tar
exit $SCAN_EXIT
```

## Scanning with Grype

Grype is another excellent vulnerability scanner that works well with Podman images.

```bash
#!/bin/bash
# Install and use Grype for vulnerability scanning
# Grype provides fast, accurate vulnerability matching

# Install Grype
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | \
  sh -s -- -b /usr/local/bin

# Build the image
podman build -t myapp:scan .

# Save and scan with Grype
podman save -o /tmp/myapp.tar myapp:scan

# Scan with severity threshold
# Fails the build if HIGH or CRITICAL vulnerabilities are found
grype /tmp/myapp.tar \
  --fail-on high \
  --output table
SCAN_EXIT=$?

echo "Scan exit code: $SCAN_EXIT"
rm -f /tmp/myapp.tar
exit $SCAN_EXIT
```

## Generating an SBOM with Syft

Create a Software Bill of Materials (SBOM) for your container images.

```bash
#!/bin/bash
# Generate an SBOM using Syft from a Podman-built image
# SBOMs provide a complete inventory of software in your image

# Install Syft
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | \
  sh -s -- -b /usr/local/bin

# Build the image
podman build -t myapp:sbom .

# Save the image for Syft
podman save -o /tmp/myapp.tar myapp:sbom

# Generate SBOM in SPDX format
syft /tmp/myapp.tar -o spdx-json > sbom-spdx.json

# Generate SBOM in CycloneDX format
syft /tmp/myapp.tar -o cyclonedx-json > sbom-cyclonedx.json

# You can then scan the SBOM with Grype
grype sbom:sbom-spdx.json --fail-on critical
SCAN_EXIT=$?

echo "SBOM files generated:"
ls -la sbom-*.json

rm -f /tmp/myapp.tar
exit $SCAN_EXIT
```

## GitHub Actions Integration

Integrate image scanning into a GitHub Actions workflow.

```yaml
# .github/workflows/scan.yml
name: Build and Scan

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Build the image with Podman
      - name: Build image
        run: podman build -t myapp:${{ github.sha }} .

      # Save image for scanning
      - name: Save image
        run: podman save -o /tmp/myapp.tar myapp:${{ github.sha }}

      # Install and run Trivy
      - name: Install Trivy
        run: |
          sudo apt-get update
          sudo apt-get install -y wget
          wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | \
            gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg > /dev/null
          echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" | \
            sudo tee /etc/apt/sources.list.d/trivy.list
          sudo apt-get update && sudo apt-get install -y trivy

      # Scan and generate JSON report
      - name: Scan image
        run: |
          trivy image \
            --input /tmp/myapp.tar \
            --severity HIGH,CRITICAL \
            --format json \
            --output trivy-report.json \
            --exit-code 1

      # Upload scan results as artifact
      - name: Upload scan report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: trivy-report
          path: trivy-report.json
```

## Enforcing Scan Policies

Create a scan policy script that enforces organizational security standards.

```bash
#!/bin/bash
# scripts/scan-policy.sh
# Enforce vulnerability scan policies in CI
# Exits with non-zero code if policy violations are found

IMAGE_TAR=$1
MAX_CRITICAL=0
MAX_HIGH=5

if [ -z "$IMAGE_TAR" ]; then
  echo "Usage: $0 <image.tar>"
  exit 1
fi

# Run Trivy and output JSON
trivy image --input "$IMAGE_TAR" \
  --format json \
  --output /tmp/scan-results.json

# Count vulnerabilities by severity
CRITICAL=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' /tmp/scan-results.json)
HIGH=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="HIGH")] | length' /tmp/scan-results.json)
MEDIUM=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="MEDIUM")] | length' /tmp/scan-results.json)

echo "=== Vulnerability Summary ==="
echo "Critical: $CRITICAL (max allowed: $MAX_CRITICAL)"
echo "High:     $HIGH (max allowed: $MAX_HIGH)"
echo "Medium:   $MEDIUM (informational)"

# Check policy thresholds
FAILED=0
if [ "$CRITICAL" -gt "$MAX_CRITICAL" ]; then
  echo "POLICY VIOLATION: Too many CRITICAL vulnerabilities"
  FAILED=1
fi
if [ "$HIGH" -gt "$MAX_HIGH" ]; then
  echo "POLICY VIOLATION: Too many HIGH vulnerabilities"
  FAILED=1
fi

# Clean up
rm -f /tmp/scan-results.json

exit $FAILED
```

## Summary

Scanning container images in CI with Podman is essential for catching vulnerabilities before they reach production. Tools like Trivy and Grype can scan Podman-built images by operating on saved tar files, while Syft generates SBOMs for compliance and auditing. Integrating scans into your CI pipeline with policy enforcement ensures that images meeting your security standards are the only ones that get deployed. Upload scan reports as CI artifacts for audit trails, and consider blocking merges when critical vulnerabilities are detected.
