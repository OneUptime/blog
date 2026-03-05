# How to Scan Flux CD for CVEs with Trivy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Trivy, CVE, Vulnerability Scanning

Description: Learn how to scan Flux CD controller images for known CVEs using Trivy to maintain a secure GitOps infrastructure.

---

Regularly scanning Flux CD controller images for Common Vulnerabilities and Exposures (CVEs) is essential for maintaining a secure GitOps infrastructure. Trivy is an open-source vulnerability scanner that can scan container images, filesystems, and Kubernetes clusters. This guide shows you how to use Trivy to scan Flux CD for CVEs.

## Prerequisites

Install Trivy on your machine:

```bash
# Install Trivy via Homebrew (macOS/Linux)
brew install trivy

# Or install on Linux via apt
sudo apt-get install -y trivy

# Verify the installation
trivy version
```

## Step 1: Scan Individual Flux Controller Images

Scan each Flux controller image for vulnerabilities:

```bash
# Scan the source-controller image
trivy image ghcr.io/fluxcd/source-controller:v1.4.1

# Scan the kustomize-controller image
trivy image ghcr.io/fluxcd/kustomize-controller:v1.4.0

# Scan the helm-controller image
trivy image ghcr.io/fluxcd/helm-controller:v1.1.0

# Scan the notification-controller image
trivy image ghcr.io/fluxcd/notification-controller:v1.4.0
```

## Step 2: Filter by Severity

Focus on critical and high severity vulnerabilities:

```bash
# Scan for only CRITICAL and HIGH vulnerabilities
trivy image --severity CRITICAL,HIGH ghcr.io/fluxcd/source-controller:v1.4.1

# Fail the scan if CRITICAL vulnerabilities are found (useful for CI/CD)
trivy image --severity CRITICAL --exit-code 1 ghcr.io/fluxcd/source-controller:v1.4.1

# Ignore unfixed vulnerabilities (show only those with available patches)
trivy image --ignore-unfixed --severity CRITICAL,HIGH ghcr.io/fluxcd/source-controller:v1.4.1
```

## Step 3: Scan All Flux Controllers

Automate scanning all Flux controller images currently deployed in your cluster:

```bash
#!/bin/bash
# scan-flux-images.sh
# Scans all deployed Flux CD controller images for CVEs using Trivy

echo "Fetching Flux controller images from the cluster..."
IMAGES=$(kubectl get deployments -n flux-system \
  -o jsonpath='{range .items[*]}{.spec.template.spec.containers[*].image}{"\n"}{end}')

EXIT_CODE=0

for IMAGE in $IMAGES; do
  echo ""
  echo "=========================================="
  echo "Scanning: $IMAGE"
  echo "=========================================="

  trivy image \
    --severity CRITICAL,HIGH \
    --ignore-unfixed \
    "$IMAGE"

  if [ $? -ne 0 ]; then
    EXIT_CODE=1
  fi
done

exit $EXIT_CODE
```

```bash
# Make the script executable and run it
chmod +x scan-flux-images.sh
./scan-flux-images.sh
```

## Step 4: Generate Reports in Different Formats

Trivy supports multiple output formats for integration with security tools:

```bash
# Generate a JSON report for programmatic analysis
trivy image --format json --output source-controller-report.json \
  ghcr.io/fluxcd/source-controller:v1.4.1

# Generate a SARIF report for GitHub Security tab integration
trivy image --format sarif --output source-controller-report.sarif \
  ghcr.io/fluxcd/source-controller:v1.4.1

# Generate a table report (default, human-readable)
trivy image --format table --output source-controller-report.txt \
  ghcr.io/fluxcd/source-controller:v1.4.1

# Generate an HTML report for sharing with stakeholders
trivy image --format template --template "@contrib/html.tpl" \
  --output source-controller-report.html \
  ghcr.io/fluxcd/source-controller:v1.4.1
```

## Step 5: Scan the Flux CLI Binary

You can also scan the Flux CLI binary for vulnerabilities:

```bash
# Scan the locally installed Flux CLI
trivy fs $(which flux)

# Scan a specific Flux CLI binary
trivy fs /usr/local/bin/flux --severity CRITICAL,HIGH
```

## Step 6: Scan Flux Kubernetes Resources In-Cluster

Use Trivy to scan the running Flux installation in your cluster:

```bash
# Scan the flux-system namespace for misconfigured resources
trivy k8s --namespace flux-system --report summary

# Scan with detailed vulnerability information
trivy k8s --namespace flux-system --report all --severity CRITICAL,HIGH

# Scan only workloads (deployments, pods)
trivy k8s --namespace flux-system --scanners vuln --report summary
```

## Step 7: Automate Scanning in CI/CD

Integrate Trivy scanning into your CI/CD pipeline:

```yaml
# .github/workflows/scan-flux-cves.yaml
# Scan Flux CD images for CVEs on a schedule and before upgrades
name: Scan Flux CVEs
on:
  schedule:
    - cron: '0 8 * * *'  # Daily at 8 AM
  pull_request:
    paths:
      - 'clusters/**/flux-system/gotk-components.yaml'

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Extract Flux images
        id: images
        run: |
          IMAGES=$(grep "image:" clusters/production/flux-system/gotk-components.yaml \
            | awk '{print $2}' | sort -u)
          echo "images<<EOF" >> $GITHUB_OUTPUT
          echo "$IMAGES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'image'
          image-ref: 'ghcr.io/fluxcd/source-controller:v1.4.1'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
          ignore-unfixed: true
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload scan results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

## Step 8: Create a Trivy Ignore File

If certain CVEs are accepted risks, create a `.trivyignore` file:

```bash
# .trivyignore
# Accepted risk: This CVE does not affect our usage of the library
CVE-2023-XXXXX

# Accepted risk: Mitigated by network policy restrictions
CVE-2023-YYYYY
```

```bash
# Run Trivy with the ignore file
trivy image --ignorefile .trivyignore \
  --severity CRITICAL,HIGH \
  ghcr.io/fluxcd/source-controller:v1.4.1
```

## Best Practices

1. **Scan regularly**: Run vulnerability scans daily, not just during upgrades.
2. **Fail on critical CVEs**: Configure your CI/CD pipeline to block deployments with critical vulnerabilities.
3. **Use --ignore-unfixed**: Focus on actionable vulnerabilities that have patches available.
4. **Track over time**: Store scan results and compare them between runs to track your security posture.
5. **Upgrade promptly**: When CVEs are found in Flux components, upgrade to the latest patched version as soon as possible.
6. **Combine with SBOM analysis**: Use SBOMs alongside Trivy for comprehensive dependency visibility.

Scanning Flux CD for CVEs with Trivy is a straightforward but critical security practice. Regular automated scanning ensures that vulnerabilities are identified and addressed before they can be exploited in your GitOps infrastructure.
