# How to Use Trivy for Container Image Scanning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Trivy, Container Security, DevSecOps, Docker, Kubernetes, CI/CD, Vulnerability Scanning

Description: A comprehensive guide to using Trivy for scanning container images, detecting vulnerabilities, and integrating security checks into your CI/CD pipeline.

---

> "Security scanning should not be an afterthought. By integrating Trivy into your workflow, you catch vulnerabilities before they reach production - shifting security left where fixes are cheapest."

## What is Trivy?

Trivy is an open-source vulnerability scanner developed by Aqua Security. It scans container images, filesystems, git repositories, and Kubernetes clusters for known vulnerabilities, misconfigurations, and exposed secrets. Unlike heavier alternatives, Trivy runs as a single binary with no database setup required - it downloads vulnerability databases automatically and caches them locally.

## Installing Trivy

Trivy supports multiple installation methods depending on your operating system and preferences.

### macOS (Homebrew)

```bash
# Install Trivy using Homebrew package manager
brew install trivy

# Verify the installation
trivy --version
```

### Linux (APT/Debian/Ubuntu)

```bash
# Add the Trivy repository GPG key
sudo apt-get install wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -

# Add the Trivy repository to sources list
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/trivy.list

# Update package list and install Trivy
sudo apt-get update
sudo apt-get install trivy
```

### Linux (RPM/RHEL/CentOS)

```bash
# Add the Trivy YUM repository
cat << 'EOF' | sudo tee /etc/yum.repos.d/trivy.repo
[trivy]
name=Trivy repository
baseurl=https://aquasecurity.github.io/trivy-repo/rpm/releases/$releasever/$basearch/
gpgcheck=0
enabled=1
EOF

# Install Trivy using yum
sudo yum -y install trivy
```

### Docker (No Installation Required)

```bash
# Run Trivy directly from Docker - useful in CI/CD environments
# Mount Docker socket to scan local images
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $HOME/.cache/trivy:/root/.cache/ \
  aquasec/trivy:latest image python:3.12-slim
```

## Scanning Container Images

The most common use case for Trivy is scanning container images for vulnerabilities.

### Basic Image Scan

```bash
# Scan a public image from Docker Hub
# Trivy will download the image layers and scan each one
trivy image nginx:latest

# Scan a locally built image (must exist in local Docker daemon)
trivy image my-app:v1.0.0

# Scan an image from a specific registry
trivy image gcr.io/my-project/my-service:latest
```

### Understanding Scan Output

Trivy categorizes vulnerabilities by severity:
- **CRITICAL**: Exploits exist, immediate patching required
- **HIGH**: Serious vulnerabilities that should be addressed soon
- **MEDIUM**: Moderate risk, plan for remediation
- **LOW**: Minor issues, fix when convenient
- **UNKNOWN**: Severity not yet determined

```bash
# Example output shows CVE ID, package name, installed version,
# fixed version (if available), and a brief description
#
# nginx:latest (debian 12.4)
# Total: 42 (UNKNOWN: 0, LOW: 25, MEDIUM: 12, HIGH: 4, CRITICAL: 1)
#
# | CVE-2024-XXXXX | HIGH | libssl3 | 3.0.11 | 3.0.12 | OpenSSL: ... |
```

## Filtering by Severity

In CI/CD pipelines, you typically want to fail builds only for serious vulnerabilities.

```bash
# Only show HIGH and CRITICAL vulnerabilities
# Useful for focusing on what matters most
trivy image --severity HIGH,CRITICAL nginx:latest

# Exit with error code 1 if vulnerabilities of specified severity are found
# Perfect for CI/CD pipeline gates
trivy image --severity CRITICAL --exit-code 1 nginx:latest

# Ignore unfixed vulnerabilities (no patch available yet)
# Reduces noise from issues you cannot immediately resolve
trivy image --ignore-unfixed nginx:latest

# Combine severity filter with unfixed filter
trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 nginx:latest
```

### Setting Exit Codes for CI/CD

```bash
# Exit code 0: scan completed, no issues found matching criteria
# Exit code 1: vulnerabilities found matching severity threshold
# Exit code other: scan failed (network error, invalid image, etc.)

# Fail pipeline only on CRITICAL vulnerabilities
trivy image --exit-code 1 --severity CRITICAL my-app:latest

# Different exit codes for different severities (useful for conditional logic)
trivy image --exit-code 0 --severity LOW,MEDIUM my-app:latest && \
trivy image --exit-code 1 --severity HIGH,CRITICAL my-app:latest
```

## Using Ignore Files

Sometimes you need to suppress known vulnerabilities that are false positives or accepted risks.

### Creating a .trivyignore File

```bash
# Create .trivyignore in your project root
# Each line contains a CVE ID to ignore

# .trivyignore
# Accepted risk: vulnerability only exploitable with physical access
CVE-2024-12345

# False positive: we do not use the affected function
CVE-2024-67890

# Temporary ignore until vendor releases patch (review date: 2026-02-15)
CVE-2024-11111
```

### Using the Ignore File

```bash
# Trivy automatically reads .trivyignore from current directory
trivy image my-app:latest

# Specify a custom ignore file path
trivy image --ignorefile /path/to/my-ignores.txt my-app:latest

# Ignore file with expiration dates (Trivy 0.50+)
# Format: CVE-ID exp:YYYY-MM-DD
# The ignore automatically expires after the date
```

### Advanced Ignore Configuration with YAML

```yaml
# .trivy.yaml - More powerful ignore configuration
vulnerabilities:
  - id: CVE-2024-12345
    paths:
      - "usr/lib/python3.12/*"
    statement: "Accepted risk - not exploitable in our configuration"

  - id: CVE-2024-67890
    expired_at: 2026-03-01
    statement: "Temporary ignore until upstream fix is released"
```

```bash
# Use the YAML configuration file
trivy image --config .trivy.yaml my-app:latest
```

## CI/CD Integration

Integrating Trivy into your CI/CD pipeline ensures every image is scanned before deployment.

### GitHub Actions

```yaml
# .github/workflows/security-scan.yml
name: Container Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  trivy-scan:
    runs-on: ubuntu-latest
    steps:
      # Check out the repository code
      - name: Checkout code
        uses: actions/checkout@v4

      # Build the Docker image to scan
      - name: Build Docker image
        run: docker build -t my-app:${{ github.sha }} .

      # Run Trivy vulnerability scanner
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          # Image to scan (use commit SHA for traceability)
          image-ref: 'my-app:${{ github.sha }}'
          # Output format for GitHub Security tab integration
          format: 'sarif'
          output: 'trivy-results.sarif'
          # Only fail on HIGH and CRITICAL vulnerabilities
          severity: 'HIGH,CRITICAL'
          # Ignore vulnerabilities without fixes
          ignore-unfixed: true

      # Upload results to GitHub Security tab
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - security
  - deploy

# Build stage creates the Docker image
build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

# Security scan runs after build
trivy-scan:
  stage: security
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  script:
    # Update vulnerability database
    - trivy image --download-db-only

    # Scan the image built in previous stage
    # Exit code 1 fails the pipeline if CRITICAL vulnerabilities found
    - trivy image
        --exit-code 1
        --severity CRITICAL
        --ignore-unfixed
        --format template
        --template "@/contrib/gitlab.tpl"
        --output gl-container-scanning-report.json
        $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  artifacts:
    reports:
      # GitLab displays vulnerability report in merge request
      container_scanning: gl-container-scanning-report.json
    paths:
      - gl-container-scanning-report.json
  allow_failure: false
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        IMAGE_NAME = "my-app"
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Build') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
            }
        }

        stage('Security Scan') {
            steps {
                // Run Trivy scan and generate HTML report
                sh """
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        -v \$PWD:/output \
                        aquasec/trivy:latest image \
                        --format template \
                        --template "@contrib/html.tpl" \
                        --output /output/trivy-report.html \
                        --severity HIGH,CRITICAL \
                        --exit-code 1 \
                        ${IMAGE_NAME}:${IMAGE_TAG}
                """
            }
            post {
                always {
                    // Archive HTML report for review
                    archiveArtifacts artifacts: 'trivy-report.html'
                    publishHTML([
                        reportName: 'Trivy Security Report',
                        reportDir: '.',
                        reportFiles: 'trivy-report.html'
                    ])
                }
            }
        }

        stage('Deploy') {
            when {
                // Only deploy if security scan passed
                expression { currentBuild.result == null || currentBuild.result == 'SUCCESS' }
            }
            steps {
                sh "docker push ${IMAGE_NAME}:${IMAGE_TAG}"
            }
        }
    }
}
```

## Output Formats

Trivy supports multiple output formats for different use cases.

```bash
# Default table format - human readable
trivy image nginx:latest

# JSON format - machine parseable, good for custom processing
trivy image --format json --output results.json nginx:latest

# SARIF format - integrates with GitHub Security, VS Code, etc.
trivy image --format sarif --output results.sarif nginx:latest

# Template format - use custom Go templates for reports
trivy image --format template --template "@contrib/html.tpl" --output report.html nginx:latest

# CycloneDX SBOM format - software bill of materials
trivy image --format cyclonedx --output sbom.json nginx:latest

# SPDX SBOM format - alternative SBOM standard
trivy image --format spdx-json --output sbom-spdx.json nginx:latest
```

### Creating Custom Templates

```bash
# Create a custom template for Slack notifications
# slack-template.tpl
{{ range . }}
*Image:* {{ .Target }}
*Total Vulnerabilities:* {{ len .Vulnerabilities }}
{{ range .Vulnerabilities }}
- {{ .VulnerabilityID }} ({{ .Severity }}): {{ .PkgName }}
{{ end }}
{{ end }}
```

```bash
# Use custom template
trivy image --format template --template "@slack-template.tpl" nginx:latest
```

## Scanning Private Registries

Trivy can authenticate with private container registries.

### Docker Hub Private Repositories

```bash
# Login to Docker Hub first
docker login

# Trivy uses Docker credentials automatically
trivy image my-private-org/my-app:latest
```

### AWS ECR (Elastic Container Registry)

```bash
# Authenticate with ECR using AWS CLI
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Scan ECR image - Trivy uses the Docker credentials
trivy image 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest

# Alternative: Set AWS environment variables for Trivy
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_DEFAULT_REGION=us-east-1

trivy image 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

### Google Container Registry (GCR) and Artifact Registry

```bash
# Authenticate using gcloud
gcloud auth configure-docker gcr.io
gcloud auth configure-docker us-docker.pkg.dev

# Scan GCR image
trivy image gcr.io/my-project/my-app:latest

# Scan Artifact Registry image
trivy image us-docker.pkg.dev/my-project/my-repo/my-app:latest
```

### Azure Container Registry (ACR)

```bash
# Login to ACR
az acr login --name myregistry

# Scan ACR image
trivy image myregistry.azurecr.io/my-app:latest
```

### Generic Registry with Username/Password

```bash
# Set credentials via environment variables
export TRIVY_USERNAME=myuser
export TRIVY_PASSWORD=mypassword

# Scan image from private registry
trivy image registry.example.com/my-app:latest

# Alternative: use command line flags (less secure - visible in process list)
trivy image --username myuser --password mypassword registry.example.com/my-app:latest
```

### Using Registry Credentials File

```bash
# Create a config file for multiple registries
# ~/.trivy/config.yaml
registry:
  credentials:
    - registry: "registry.example.com"
      username: "user1"
      password: "pass1"
    - registry: "gcr.io"
      token: "ya29.example-token"
```

## Best Practices Summary

1. **Scan Early and Often**: Integrate Trivy into your CI/CD pipeline to catch vulnerabilities before they reach production. Scan on every pull request and before every deployment.

2. **Set Appropriate Severity Thresholds**: Use `--severity HIGH,CRITICAL` in production pipelines. Do not block builds on LOW severity issues - they create alert fatigue.

3. **Use `--ignore-unfixed`**: Filter out vulnerabilities that have no available fix. You cannot patch what does not have a patch yet.

4. **Maintain an Ignore File**: Document accepted risks in `.trivyignore` with comments explaining why each CVE is ignored. Review this file regularly.

5. **Update Trivy Regularly**: New vulnerability definitions are added daily. Run `trivy image --download-db-only` to update the database, or use the latest Trivy Docker image in CI.

6. **Generate SBOMs**: Use CycloneDX or SPDX output formats to generate Software Bills of Materials. These help with compliance and incident response.

7. **Scan Base Images Separately**: Know the vulnerabilities in your base images (alpine, debian, ubuntu) before adding your application layer.

8. **Use Minimal Base Images**: Distroless, Alpine, or scratch-based images have fewer packages and therefore fewer potential vulnerabilities.

9. **Fail Fast in Development**: Use stricter thresholds in development (`--exit-code 1 --severity MEDIUM,HIGH,CRITICAL`) to catch issues early.

10. **Monitor Continuously**: Vulnerabilities are discovered after images are built. Use Trivy in scheduled scans of running containers, not just at build time.

---

Container security is a continuous process, not a one-time check. By integrating Trivy into your development workflow and CI/CD pipelines, you establish a security baseline that grows stronger with every scan. For monitoring your containerized applications after deployment, [OneUptime](https://oneuptime.com) provides comprehensive observability to detect anomalies and ensure your services remain healthy and secure in production.
