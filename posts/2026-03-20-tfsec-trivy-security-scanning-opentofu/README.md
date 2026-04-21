# How to Use tfsec/trivy for Security Scanning with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tfsec, Trivy, Security Scanning, Infrastructure as Code, DevOps

Description: Learn how to use tfsec (now integrated into Trivy) to scan OpenTofu configurations for security misconfigurations and enforce security standards in CI/CD pipelines.

## Introduction

tfsec was a popular standalone Terraform/OpenTofu security scanner. Aqua Security merged its capabilities into Trivy, making Trivy a unified security scanning tool that covers container images, file systems, IaC configurations, and more. Both tools find OpenTofu security issues before deployment.

## Installing Trivy (Includes tfsec Capabilities)

```bash
# macOS

brew install trivy

# Linux
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sudo sh -s -- -b /usr/local/bin

# Docker
docker pull aquasec/trivy

trivy --version
```

## Scanning OpenTofu Configurations

```bash
# Scan the current directory
trivy config .

# Scan with specific severity levels
trivy config . --severity HIGH,CRITICAL

# Scan with detailed output
trivy config . --format table

# Scan and output JSON for processing
trivy config . --format json --output results.json

# Exit with non-zero code on findings (for CI)
trivy config . --exit-code 1 --severity HIGH,CRITICAL
```

## Sample Output

```text
main.tf (terraform)

Tests: 47 (SUCCESSES: 44, FAILURES: 3, EXCEPTIONS: 0)
Failures: 3 (HIGH: 3, CRITICAL: 0)

HIGH: Security group allows unrestricted ingress on port 22
══════════════════════════════════════════════════════════════════
Ensure no security groups allow ingress from 0.0.0.0/0 to port 22

 17 ┃ resource "aws_security_group" "web" {
 18 ┃   ingress {
 19 ┃     from_port   = 22
 20 ┃     to_port     = 22
 21 ┃     protocol    = "tcp"
 22 ┃     cidr_blocks = ["0.0.0.0/0"]   ← HIGH
 ...
```

## Fixing Common tfsec/trivy Findings

```hcl
# Fix: AVD-AWS-0107 - no unrestricted SSH
resource "aws_security_group" "web" {
  name = "web-sg"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    # BEFORE: cidr_blocks = ["0.0.0.0/0"]
    # AFTER: restrict to bastion host only
    cidr_blocks = ["10.0.1.5/32"]  # Bastion host IP
  }
}

# Fix: AVD-AWS-0180 - RDS should not be publicly accessible
resource "aws_db_instance" "main" {
  identifier         = "prod-postgres"
  publicly_accessible = false  # Must be false
  # ...
}

# Fix: AVD-AWS-0131 - root block device should be encrypted
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"

  root_block_device {
    encrypted = true   # Required
  }
}
```

## Suppressing False Positives or Accepted Exceptions

```hcl
# Suppress a specific finding with a justification when the exception is approved
# Temporary emergency SSH access during migration; remove after VPN cutover.
#trivy:ignore:AVD-AWS-0107
resource "aws_security_group" "temporary_bastion" {
  name = "temporary-bastion-sg"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## GitHub Actions: Trivy Scanning

```yaml
- name: Trivy IaC Security Scan
  uses: aquasecurity/trivy-action@0.35.0
  with:
    scan-type: config
    scan-ref: .
    format: sarif
    output: trivy-results.sarif
    exit-code: 1
    severity: HIGH,CRITICAL
    limit-severities-for-sarif: true
    trivyignores: .trivyignore

- name: Upload Trivy Results to GitHub Security
  uses: github/codeql-action/upload-sarif@v4
  if: always()
  with:
    sarif_file: trivy-results.sarif
```

## .trivyignore - Shared Suppressions

```text
# .trivyignore - project-wide finding suppressions
# Format: one finding ID per line; use comments for reasons.

# S3 server access logging handled by centralized CloudTrail data events
AVD-AWS-0089

# Temporary break-glass SSH security group approved during migration
AVD-AWS-0107
```

## Conclusion

Trivy (encompassing tfsec) provides fast, comprehensive security scanning of OpenTofu configurations. Run it in pre-commit hooks and CI/CD pipelines to catch HIGH and CRITICAL security misconfigurations - unrestricted SSH, public databases, unencrypted storage - before they reach production. Use the SARIF output format to surface findings in GitHub Security without blocking developers.
