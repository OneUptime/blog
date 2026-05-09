# How to Scan Podman Images for Vulnerabilities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Vulnerability Scanning, Trivy

Description: Learn how to scan Podman container images for known vulnerabilities using open-source tools like Trivy and Grype.

---

> Shipping a container image without scanning it for vulnerabilities is like deploying code without running tests. You are guaranteed to miss something.

Container images often include operating system packages and application dependencies that contain known vulnerabilities. Scanning images before deployment catches these issues early. This guide covers how to integrate vulnerability scanning into your Podman workflow using popular open-source scanners.

---

## Why Scan Container Images

Container images are built from base images that bundle hundreds of packages. Over time, vulnerabilities are discovered in these packages. Without scanning, you may unknowingly deploy containers with critical security flaws that attackers can exploit.

## Installing Trivy

Trivy is a widely-used open-source vulnerability scanner that works well with Podman.

```bash
# Install Trivy on RHEL/CentOS
cat << EOF | sudo tee -a /etc/yum.repos.d/trivy.repo
[trivy]
name=Trivy repository
baseurl=https://aquasecurity.github.io/trivy-repo/rpm/releases/\$basearch/
gpgcheck=1
enabled=1
gpgkey=https://aquasecurity.github.io/trivy-repo/rpm/public.key
EOF
sudo yum -y update
sudo yum -y install trivy

# Or install on Debian/Ubuntu
sudo apt-get install -y wget gnupg
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install -y trivy

# Or install via the official install script
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sudo sh -s -- -b /usr/local/bin
```

```bash
# Verify the installation
trivy version
```

## Scanning a Podman Image with Trivy

Trivy can scan images stored in Podman's local storage when the local Podman socket is available.

```bash
# Enable the Podman socket for local image scanning
systemctl --user enable --now podman.socket

# Pull an image to scan
podman pull docker.io/library/nginx:alpine

# Scan the image using Trivy with Podman
trivy image docker.io/library/nginx:alpine
```

```bash
# Scan and only show critical and high severity vulnerabilities
trivy image --severity CRITICAL,HIGH docker.io/library/nginx:alpine
```

```bash
# Scan and output results as JSON for programmatic processing
trivy image --format json --output nginx-scan.json docker.io/library/nginx:alpine

# View the summary
cat nginx-scan.json | python3 -m json.tool | head -30
```

## Scanning from a Podman Archive

You can export a Podman image and scan the archive.

```bash
# Save the Podman image to a tar archive
podman save -o nginx-image.tar docker.io/library/nginx:alpine

# Scan the archive with Trivy
trivy image --input nginx-image.tar

# Clean up the archive
rm nginx-image.tar
```

## Using Grype as an Alternative Scanner

Grype is another excellent open-source vulnerability scanner.

```bash
# Install Grype
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sudo sh -s -- -b /usr/local/bin

# Verify installation
grype version
```

```bash
# Scan a Podman image with Grype
grype docker.io/library/python:3.12-slim

# Fail if fixed critical vulnerabilities are found
grype docker.io/library/python:3.12-slim --only-fixed --fail-on critical
```

## Integrating Scanning into a Build Pipeline

Create a script that builds and scans images before pushing them.

```bash
#!/bin/bash
# build-and-scan.sh - Build, scan, and conditionally push a container image

IMAGE_NAME="myapp"
IMAGE_TAG="latest"
REGISTRY="registry.example.com"
SEVERITY_THRESHOLD="CRITICAL"

# Build the image
echo "Building image..."
podman build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

# Scan the image
echo "Scanning image for vulnerabilities..."
trivy image --severity "$SEVERITY_THRESHOLD" --exit-code 1 "${IMAGE_NAME}:${IMAGE_TAG}"

# Check the scan result
if [ $? -ne 0 ]; then
  echo "FAILED: Image has $SEVERITY_THRESHOLD vulnerabilities. Fix them before pushing."
  exit 1
fi

echo "PASSED: No $SEVERITY_THRESHOLD vulnerabilities found."

# Tag and push (uncomment when ready)
# podman tag "${IMAGE_NAME}:${IMAGE_TAG}" "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
# podman push "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
```

## Scanning All Local Images

```bash
# Scan every image in local Podman storage
podman images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>' | while read img; do
  echo "========================================="
  echo "Scanning: $img"
  echo "========================================="
  trivy image --severity CRITICAL,HIGH "$img" 2>/dev/null
  echo ""
done
```

## Generating an HTML Report

```bash
# Generate an HTML vulnerability report
trivy image --format template \
  --template "@/usr/local/share/trivy/templates/html.tpl" \
  --output report.html \
  docker.io/library/nginx:alpine

echo "Report saved to report.html"
```

## Ignoring Known Vulnerabilities

Create a `.trivyignore` file to suppress known false positives.

```bash
# Create a .trivyignore file
cat > .trivyignore << 'EOF'
# Ignore specific CVEs that are false positives or accepted risks
CVE-2023-12345
CVE-2023-67890
EOF

# Scan with the ignore file
trivy image --ignorefile .trivyignore docker.io/library/nginx:alpine
```

## Cleanup

```bash
rm -f nginx-scan.json report.html .trivyignore
```

## Summary

Vulnerability scanning is a non-negotiable part of container security. By integrating tools like Trivy or Grype into your Podman workflow, you can catch known vulnerabilities before they reach production. Automate scanning in your CI/CD pipeline, set severity thresholds to gate deployments, and regularly scan all images in your local storage to stay on top of newly disclosed vulnerabilities.
