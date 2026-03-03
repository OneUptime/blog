# How to Use Trivy for Infrastructure Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Trivy, Security, Container Security, Infrastructure as Code

Description: Learn how to use Trivy to scan Terraform configurations, container images, and file systems for security vulnerabilities and misconfigurations.

---

Trivy started life as a container vulnerability scanner, but it has grown into a comprehensive security scanner that covers Terraform, Kubernetes, Dockerfiles, and more. If you are already using Trivy for container scanning, adding Terraform security scanning is almost free. And if you are not using it yet, Trivy is worth considering as a single tool that covers multiple security scanning needs.

This guide focuses on using Trivy for Terraform and infrastructure security, including installation, configuration, CI/CD integration, and practical usage patterns.

## What Trivy Scans

Trivy operates in several modes:

- **Config scanning**: Terraform, CloudFormation, Kubernetes YAML, Dockerfiles, Helm charts
- **Vulnerability scanning**: Container images, file systems, Git repositories
- **Secret scanning**: Detects hardcoded secrets in code and config files
- **License scanning**: Checks dependency licenses for compliance

For Terraform specifically, Trivy includes all the rules from tfsec (which Aqua Security acquired and integrated) plus additional checks.

## Installation

```bash
# macOS
brew install trivy

# Linux (Debian/Ubuntu)
sudo apt-get install wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt-get update && sudo apt-get install trivy

# Docker
docker run --rm -v "$(pwd):/src" aquasec/trivy config /src

# Verify
trivy --version
```

## Scanning Terraform Configurations

The `trivy config` command scans IaC files:

```bash
# Scan current directory for Terraform misconfigurations
trivy config .

# Scan a specific directory
trivy config ./infrastructure/production

# Only show high and critical severity
trivy config --severity HIGH,CRITICAL .

# Output as JSON
trivy config --format json --output trivy-results.json .
```

Example output:

```text
main.tf (terraform)
===================
Tests: 45 (SUCCESSES: 37, FAILURES: 8, EXCEPTIONS: 0)
Failures: 8 (HIGH: 5, CRITICAL: 3)

CRITICAL: S3 bucket has no server-side encryption configured
════════════════════════════════════════════════════
  You should ensure that S3 bucket encryption is enabled.

  See https://avd.aquasec.com/misconfig/avd-aws-0088

  ──────────────────────────────────────────────
   main.tf:45-52
  ──────────────────────────────────────────────
    45 │ resource "aws_s3_bucket" "data" {
    46 │   bucket = "my-data-bucket"
    47 │   acl    = "private"
    48 │ }
  ──────────────────────────────────────────────
```

## Scanning Terraform Plan Output

Scanning plan files gives you more accurate results because Terraform has already resolved variables, data sources, and module calls:

```bash
# Generate the plan in JSON format
terraform init
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json

# Scan the plan
trivy config --tf-vars terraform.tfvars tfplan.json
```

This catches issues that static file scanning might miss, like dynamically computed values that result in insecure configurations.

## Combining Config and Secret Scanning

One of Trivy's strengths is running multiple scanners at once:

```bash
# Scan for both misconfigurations and secrets
trivy fs --scanners misconfig,secret .

# This catches things like:
# - Hardcoded AWS access keys in .tf files
# - Database passwords in terraform.tfvars
# - Private keys committed to the repo
# - Misconfigured resources
```

The secret scanner uses pattern matching and entropy analysis to find credentials that should not be in your codebase:

```text
secrets.tf (secrets)
====================
Total: 2 (HIGH: 1, CRITICAL: 1)

CRITICAL: AWS Access Key ID
════════════════════════════
  AWS access key IDs should not be hardcoded.

  ──────────────────────────────────────────────
   variables.tf:12
  ──────────────────────────────────────────────
    12 │   default = "AKIAIOSFODNN7EXAMPLE"
  ──────────────────────────────────────────────
```

## Custom Policies with Rego

Trivy supports custom policies written in Rego (the Open Policy Agent language):

```rego
# policies/require_encryption.rego
package custom.terraform.aws

# Deny unencrypted EBS volumes
deny[msg] {
    resource := input.resource.aws_ebs_volume[name]
    not resource.encrypted
    msg := sprintf("EBS volume '%s' must have encryption enabled", [name])
}

# Deny RDS instances without encryption
deny[msg] {
    resource := input.resource.aws_db_instance[name]
    not resource.storage_encrypted
    msg := sprintf("RDS instance '%s' must have storage encryption enabled", [name])
}

# Require specific tags on all resources
deny[msg] {
    resource := input.resource[type][name]
    required_tags := {"Environment", "Team", "CostCenter"}
    provided_tags := {tag | resource.tags[tag]}
    missing := required_tags - provided_tags
    count(missing) > 0
    msg := sprintf("Resource '%s.%s' is missing required tags: %v", [type, name, missing])
}
```

Run with custom policies:

```bash
trivy config --policy ./policies --namespaces custom .
```

## Configuration File

Create a `trivy.yaml` configuration file for consistent settings:

```yaml
# trivy.yaml
severity:
  - CRITICAL
  - HIGH

scan:
  scanners:
    - misconfig
    - secret

misconfig:
  # Terraform-specific settings
  terraform:
    vars:
      - terraform.tfvars
      - production.tfvars

  # Custom policy directory
  policy:
    - ./policies

  # Skip specific checks
  skip-check:
    - AVD-AWS-0088  # Handled at org level

secret:
  # Custom secret patterns
  config: .trivy-secret.yaml

output:
  - json

format: json
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Trivy Infrastructure Security
on:
  pull_request:
    paths:
      - '**.tf'
      - 'Dockerfile*'
      - '**.yaml'

jobs:
  trivy-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy config scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          scan-ref: '.'
          severity: 'HIGH,CRITICAL'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Run Trivy secret scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scanners: 'secret'
          scan-ref: '.'
          format: 'table'

      - name: Upload Trivy SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Security Scan') {
            steps {
                script {
                    // Run Trivy config scan
                    sh '''
                        trivy config \
                            --severity HIGH,CRITICAL \
                            --format json \
                            --output trivy-config.json \
                            --exit-code 1 \
                            .
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-config.json'
                }
            }
        }
    }
}
```

## Scanning Container Images Alongside Infrastructure

If your Terraform deploys containers, scan the images too:

```bash
# Scan container images for vulnerabilities
trivy image --severity HIGH,CRITICAL myapp:latest

# Scan an image referenced in your Terraform
IMAGE=$(grep -oP 'image\s*=\s*"\K[^"]+' ecs.tf | head -1)
trivy image --severity HIGH,CRITICAL "$IMAGE"
```

This gives you a complete picture: your infrastructure configuration is secure, and the workloads running on it are free of known vulnerabilities.

## Comparing Trivy with Other Tools

If you are evaluating tools, here is how Trivy stacks up:

- **Trivy vs tfsec**: Trivy includes all tfsec rules plus more. tfsec is lighter weight if you only need Terraform scanning.
- **Trivy vs Checkov**: Checkov has better compliance framework mapping. Trivy has broader scanning scope (containers, secrets, licenses).
- **Trivy vs Terrascan**: Similar coverage for IaC. Trivy wins on container scanning. Terrascan has better OPA integration.

For many teams, using Trivy as the primary scanner and Checkov for compliance reporting is a solid combination.

## Wrapping Up

Trivy is a versatile security tool that fits naturally into Terraform workflows. Its ability to scan infrastructure code, detect secrets, and check container images in a single tool makes it a practical choice for teams that want broad coverage without managing multiple scanners. Start with the default rules, add custom policies as needed, and integrate it into your CI/CD pipeline.

For production monitoring after your secure infrastructure is deployed, [OneUptime](https://oneuptime.com) provides uptime monitoring, incident management, and observability to keep everything running smoothly.
