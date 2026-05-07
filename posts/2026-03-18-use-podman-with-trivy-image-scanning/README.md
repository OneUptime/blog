# How to Use Podman with Trivy for Image Scanning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Trivy, Security, Vulnerability Scanning, Container Security

Description: Learn how to use Trivy with Podman to scan container images for vulnerabilities, misconfigurations, and secrets before deploying them to production.

---

> Trivy scanning your Podman images catches vulnerabilities, misconfigurations, and exposed secrets before they reach production, making security an automated part of your container workflow.

Container images often contain vulnerabilities inherited from base images, outdated packages, or misconfigured settings. Trivy is a comprehensive security scanner that detects vulnerabilities in OS packages and language-specific dependencies, identifies misconfigurations in Dockerfiles and Kubernetes manifests, and finds exposed secrets like passwords and API keys. Integrating Trivy with your Podman workflow ensures that security scanning is an automatic part of your image building and deployment process.

---

## Installing Trivy

Install Trivy on your system:

```bash
# On Fedora

sudo dnf install -y trivy

# On RHEL/CentOS
cat << EOF | sudo tee -a /etc/yum.repos.d/trivy.repo
[trivy]
name=Trivy repository
baseurl=https://aquasecurity.github.io/trivy-repo/rpm/releases/\$basearch/
gpgcheck=1
enabled=1
gpgkey=https://aquasecurity.github.io/trivy-repo/rpm/public.key
EOF
sudo dnf -y update
sudo dnf -y install trivy

# On Ubuntu/Debian
sudo apt-get install wget gnupg
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" | sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt-get update && sudo apt-get install trivy

# Enable the rootless Podman API socket for local image scanning
systemctl --user enable --now podman.socket

# Or run Trivy itself as a container
alias trivy="podman run --rm --security-opt label=disable -v $XDG_RUNTIME_DIR/podman/podman.sock:/var/run/docker.sock -v trivy-cache:/root/.cache/ aquasec/trivy"
```

## Scanning Podman Images

Scan an image for vulnerabilities:

```bash
# Scan a local Podman image (requires podman.socket or podman system service)
trivy image --image-src podman myapp:latest

# Scan with specific severity filter
trivy image --image-src podman --severity HIGH,CRITICAL myapp:latest

# Scan a remote image
trivy image docker.io/nginx:latest

# Output in JSON format
trivy image --image-src podman --format json --output results.json myapp:latest

# Output in table format with details
trivy image --image-src podman --format table myapp:latest
```

## Integrating Scanning into Build Workflow

Create a build script that scans images automatically:

```bash
#!/bin/bash
# build-and-scan.sh

set -euo pipefail

IMAGE_NAME="$1"
IMAGE_TAG="${2:-latest}"
SEVERITY_THRESHOLD="${3:-HIGH,CRITICAL}"

echo "Building image ${IMAGE_NAME}:${IMAGE_TAG}..."
podman build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

echo "Scanning image for vulnerabilities..."
if trivy image \
  --image-src podman \
  --severity "$SEVERITY_THRESHOLD" \
  --exit-code 1 \
  --no-progress \
  "${IMAGE_NAME}:${IMAGE_TAG}"; then
    echo "Scan passed: no $SEVERITY_THRESHOLD vulnerabilities found"
else
    echo "Scan FAILED: $SEVERITY_THRESHOLD vulnerabilities detected"
    echo "Run 'trivy image --image-src podman ${IMAGE_NAME}:${IMAGE_TAG}' for details"
    exit 1
fi
```

Usage:

```bash
chmod +x build-and-scan.sh
./build-and-scan.sh myapp v1.0.0
```

## Scanning for Different Issue Types

Trivy can scan for multiple types of issues:

```bash
# Scan for vulnerabilities only
trivy image --image-src podman --scanners vuln myapp:latest

# Scan for misconfigurations in the Containerfile
trivy config --misconfig-scanners dockerfile .

# Scan for exposed secrets
trivy image --image-src podman --scanners secret myapp:latest

# Scan for all issue types
trivy image --image-src podman --scanners vuln,secret,misconfig myapp:latest

# Scan a filesystem (useful for scanning before building)
trivy fs --scanners vuln,secret .
```

## Custom Vulnerability Policy

Create a policy file to ignore specific vulnerabilities or set thresholds:

```yaml
# .trivyignore.yaml
vulnerabilities:
  - id: CVE-2023-12345
    statement: "Not exploitable in our configuration"
    expired_at: 2025-12-31

  - id: CVE-2023-67890
    statement: "Mitigated by network policy"
```

```bash
trivy image --image-src podman --ignorefile .trivyignore.yaml myapp:latest
```

Or use a simple ignore file:

```text
# .trivyignore
# Accepted risks
CVE-2023-12345
CVE-2023-67890
```

```bash
trivy image --image-src podman --ignorefile .trivyignore myapp:latest
```

## Scanning in CI/CD Pipelines

Integrate Trivy scanning into your CI pipeline:

```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write

    steps:
      - uses: actions/checkout@v4

      - name: Install Podman
        run: sudo apt-get update && sudo apt-get install -y podman

      - name: Build image
        run: podman build -t localhost/myapp:${{ github.sha }} .

      - name: Save image as a tar archive
        run: podman save -o myapp.tar localhost/myapp:${{ github.sha }}

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@v0.36.0
        with:
          input: /github/workspace/myapp.tar
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

## Generating Reports

Create detailed vulnerability reports:

```bash
# HTML report
trivy image --format template \
  --image-src podman \
  --template "@contrib/html.tpl" \
  --output report.html \
  myapp:latest

# JSON report for processing
trivy image --image-src podman --format json --output scan-results.json myapp:latest

# SARIF format for GitHub Security
trivy image --image-src podman --format sarif --output results.sarif myapp:latest

# Custom template
trivy image --format template \
  --image-src podman \
  --template '{{range .Results}}{{range .Vulnerabilities}}{{.VulnerabilityID}} {{.Severity}} {{.PkgName}} {{.InstalledVersion}} -> {{.FixedVersion}}{{"\n"}}{{end}}{{end}}' \
  myapp:latest
```

## Scanning Base Images

Scan base images to choose the most secure foundation:

```bash
#!/bin/bash
# compare-base-images.sh
# Requires jq

IMAGES=(
    "alpine:3.19"
    "ubuntu:24.04"
    "fedora:40"
    "debian:bookworm-slim"
    "gcr.io/distroless/static-debian12"
)

echo "Base Image Vulnerability Comparison"
echo "===================================="

for image in "${IMAGES[@]}"; do
    podman pull "$image" > /dev/null 2>&1
    CRITICAL=$(trivy image --image-src podman --severity CRITICAL --quiet --format json "$image" | jq '[.Results[]?.Vulnerabilities // [] | length] | add // 0')
    HIGH=$(trivy image --image-src podman --severity HIGH --quiet --format json "$image" | jq '[.Results[]?.Vulnerabilities // [] | length] | add // 0')
    echo "$image - Critical: $CRITICAL, High: $HIGH"
done
```

## Containerfile Best Practices Scanning

Scan your Containerfile for security best practices:

```bash
trivy config --misconfig-scanners dockerfile --severity HIGH,CRITICAL .
```

Common issues Trivy detects:

```dockerfile
# BAD: Running as root
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y nginx
CMD ["nginx"]

# GOOD: Running as non-root user
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y nginx && \
    rm -rf /var/lib/apt/lists/*
RUN useradd -r nginx
USER nginx
CMD ["nginx", "-g", "daemon off;"]
```

## SBOM Generation

Generate a Software Bill of Materials alongside scanning:

```bash
# Generate SBOM in SPDX format
trivy image --image-src podman --format spdx-json --output sbom.spdx.json myapp:latest

# Generate SBOM in CycloneDX format
trivy image --image-src podman --format cyclonedx --output sbom.cdx.json myapp:latest

# Scan an existing SBOM for vulnerabilities
trivy sbom sbom.cdx.json
```

## Automated Remediation Workflow

Create a workflow that suggests fixes for vulnerabilities:

```bash
#!/bin/bash
# remediate.sh
# Requires jq and column

IMAGE="$1"

echo "Scanning $IMAGE for fixable vulnerabilities..."

trivy image --image-src podman --format json "$IMAGE" | jq -r '
  .Results[]? |
  .Vulnerabilities[]? |
  select(.FixedVersion != null and .FixedVersion != "") |
  "\(.Severity)\t\(.PkgName)\t\(.InstalledVersion) -> \(.FixedVersion)\t\(.VulnerabilityID)"
' | sort | column -t -s $'\t'

echo ""
echo "To fix: update packages in your Containerfile or rebuild with updated base image"
```

## Conclusion

Trivy and Podman together create a robust container security scanning workflow. By integrating vulnerability scanning into your build process, you catch security issues before they reach production. The ability to scan for vulnerabilities, misconfigurations, and secrets in a single tool simplifies your security pipeline. Combined with SBOM generation and CI/CD integration, Trivy provides comprehensive supply chain security for your containerized applications. Making scanning automatic and mandatory through build scripts and CI pipelines ensures that no unscanned image makes it to deployment.
