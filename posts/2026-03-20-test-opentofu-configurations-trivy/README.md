# How to Scan OpenTofu Configurations with Trivy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Trivy, Security Scanning, Infrastructure as Code, DevSecOps

Description: Learn how to use Trivy to scan OpenTofu and Terraform configurations for security misconfigurations, vulnerabilities, and compliance violations.

## Introduction

Trivy is an all-in-one security scanner by Aqua Security that supports container images, filesystems, git repositories, and infrastructure-as-code. Its IaC scanning capabilities cover OpenTofu and Terraform configurations, detecting misconfigurations against security benchmarks.

## Installing Trivy

On macOS:

```bash
brew install trivy
```

On Linux:

```bash
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sudo sh -s -- -b /usr/local/bin v0.70.0
```

Verify:

```bash
trivy --version
```

## Scanning a Directory

```bash
trivy config ./
```

Or scan a specific module:

```bash
trivy config ./modules/networking
```

## Understanding the Output

```text
networking/main.tf (terraform)

Tests: 14 (SUCCESSES: 11, FAILURES: 3, EXCEPTIONS: 0)
Failures: 3 (UNKNOWN: 0, LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 0)

HIGH: Security group rule allows ingress from 0.0.0.0/0 to port 22
════════════════════════════════════════════
  Avoid exposing your Port 22 to the internet
  ...
```

## Setting Severity Thresholds

Fail only on HIGH and CRITICAL findings:

```bash
trivy config --severity HIGH,CRITICAL --exit-code 1 ./
```

## Outputting Results as JSON

```bash
trivy config --format json --output trivy-results.json ./
```

SARIF format for GitHub Security tab:

```bash
trivy config --format sarif --output trivy-results.sarif ./
```

## Ignoring Specific Findings

Create a `.trivyignore` file:

```text
# Suppress known false positives

AVD-AWS-0107
AVD-AWS-0086
```

## CI/CD Integration

```yaml
# GitHub Actions
- name: Trivy IaC Scan
  uses: aquasecurity/trivy-action@0.35.0
  with:
    scan-type: config
    scan-ref: .
    severity: HIGH,CRITICAL
    format: sarif
    output: trivy-results.sarif
    exit-code: '1'

- name: Upload SARIF
  if: always()
  uses: github/codeql-action/upload-sarif@v4
  with:
    sarif_file: trivy-results.sarif
```

Plain CI:

```yaml
- name: Run Trivy
  run: |
    trivy config \
      --severity HIGH,CRITICAL \
      --exit-code 1 \
      ./
```

## Scanning a Git Repository

```bash
trivy repo https://github.com/myorg/infra-repo
```

## Comparing with Other Tools

| Tool | Focus | Strength |
|------|-------|----------|
| Trivy | Multi-purpose | Broad coverage, one tool |
| Checkov | IaC security | Deep policy library |
| TFLint | Linting | Provider-specific rules |

## Conclusion

Trivy provides broad IaC security scanning with minimal setup. Its ability to scan containers, filesystems, and IaC from a single tool makes it a practical choice for teams wanting unified security scanning without managing multiple separate tools.
