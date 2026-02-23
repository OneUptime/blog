# How to Use Trivy for Terraform Security Scanning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Trivy, Security, Static Analysis, DevSecOps, Infrastructure as Code

Description: Learn how to use Trivy to scan Terraform configurations for security misconfigurations, vulnerabilities, and compliance violations before deployment.

---

Trivy started as a container vulnerability scanner, but it has evolved into a comprehensive security scanner that covers infrastructure as code, including Terraform. It detects security misconfigurations in your Terraform files by checking against built-in policies based on industry standards like CIS benchmarks. Trivy is fast, easy to install, and works well in CI pipelines.

## Why Trivy for Terraform

There are several IaC security scanners out there. Trivy stands out for a few reasons:

- Single binary that covers containers, IaC, file systems, and git repositories
- Built-in policies from Aqua Security that are regularly updated
- Supports Terraform HCL files and Terraform plan JSON
- Returns structured output (JSON, SARIF, table) for easy CI integration
- No account or API key required

If your team already uses Trivy for container scanning, extending it to Terraform requires zero additional tooling.

## Installation

Install Trivy on your system:

```bash
# macOS with Homebrew
brew install trivy

# Linux with apt
sudo apt-get install trivy

# Linux with the install script
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Verify the installation
trivy version
```

For Docker:

```bash
# Pull the Trivy image
docker pull aquasec/trivy:latest
```

## Basic Terraform Scanning

Point Trivy at a directory containing Terraform files:

```bash
# Scan the current directory for Terraform misconfigurations
trivy config .

# Scan a specific directory
trivy config ./modules/networking

# Scan with a specific severity threshold
trivy config --severity HIGH,CRITICAL .
```

The output shows each finding with its severity, rule ID, description, and the file/line where the issue was found:

```
main.tf (terraform)
===================

Tests: 23 (SUCCESSES: 18, FAILURES: 5)
Failures: 5

HIGH: S3 bucket does not have encryption enabled
════════════════════════════════════════════════
S3 Buckets should be encrypted at rest.

See https://avd.aquasec.com/misconfig/avd-aws-0088

 main.tf:15-20
────────────────────────────────────────
  15 │ resource "aws_s3_bucket" "data" {
  16 │   bucket = "my-data-bucket"
  17 │   acl    = "private"
  18 │
  19 │   tags = { ... }
  20 │ }
────────────────────────────────────────
```

## Scanning Terraform Plan JSON

For more accurate results, scan the Terraform plan output. This resolves variables and expressions, giving Trivy the actual values that will be applied:

```bash
# Generate a plan and convert to JSON
terraform init
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json

# Scan the plan JSON
trivy config tfplan.json
```

Plan scanning catches issues that HCL scanning misses, like variables that resolve to insecure values or conditional resources that only exist in certain environments.

## Filtering Results

Trivy provides several options to filter scan results:

```bash
# Show only HIGH and CRITICAL findings
trivy config --severity HIGH,CRITICAL .

# Skip specific checks by ID
trivy config --skip-dirs "test,examples" .

# Ignore specific checks
trivy config --ignorefile .trivyignore .

# Only check specific types of misconfigurations
trivy config --misconfig-scanners terraform .
```

Create a `.trivyignore` file to suppress known false positives:

```
# .trivyignore
# Skip public read access check for the static website bucket
AVD-AWS-0088

# Skip the encryption check for the development bucket
# (encrypted at the bucket level, not the object level)
AVD-AWS-0132
```

## Custom Severity Exit Codes

Configure Trivy to fail CI only for specific severity levels:

```bash
# Exit with code 1 only for CRITICAL findings
trivy config --exit-code 1 --severity CRITICAL .

# Exit with code 1 for HIGH and CRITICAL
trivy config --exit-code 1 --severity HIGH,CRITICAL .

# Always exit 0 (report only, do not fail)
trivy config --exit-code 0 .
```

## Output Formats

Trivy supports multiple output formats for different use cases:

```bash
# Default table format (human-readable)
trivy config .

# JSON output for programmatic processing
trivy config --format json --output results.json .

# SARIF format for GitHub Code Scanning
trivy config --format sarif --output results.sarif .

# Template-based output
trivy config --format template --template "@contrib/html.tpl" --output report.html .
```

## Scanning Specific Cloud Providers

Trivy has built-in checks for AWS, Azure, and GCP resources:

```bash
# AWS-specific checks
trivy config --severity HIGH,CRITICAL ./modules/aws

# Check what rules are available
trivy config --list-all-pkgs .
```

Common checks Trivy runs for each provider:

**AWS:**
- S3 bucket encryption and public access
- Security group rules (unrestricted ingress)
- RDS encryption and public accessibility
- IAM password policy and MFA
- CloudTrail logging configuration
- EBS volume encryption

**Azure:**
- Storage account HTTPS enforcement
- Network security group rules
- Key Vault purge protection
- SQL server auditing
- AKS RBAC and network policies

**GCP:**
- GCS bucket uniform access and encryption
- Firewall rule restrictions
- Cloud SQL SSL enforcement
- GKE node auto-upgrade and RBAC

## GitHub Actions Integration

```yaml
# .github/workflows/trivy-terraform.yml
name: Trivy Terraform Scan

on:
  pull_request:
    paths:
      - '**/*.tf'

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy IaC Scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          scan-ref: '.'
          severity: 'HIGH,CRITICAL'
          exit-code: '1'
          format: 'sarif'
          output: 'trivy-results.sarif'

      # Upload results to GitHub Security tab
      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

## GitLab CI Integration

```yaml
# .gitlab-ci.yml
trivy-scan:
  stage: security
  image: aquasec/trivy:latest
  script:
    - trivy config
        --severity HIGH,CRITICAL
        --exit-code 1
        --format json
        --output trivy-report.json
        .
  artifacts:
    reports:
      # GitLab can parse Trivy's JSON output
      container_scanning: trivy-report.json
    paths:
      - trivy-report.json
    when: always
```

## Using Trivy with Docker

Run Trivy without installing it locally:

```bash
# Mount your Terraform directory and scan
docker run --rm \
  -v "$(pwd):/workspace" \
  aquasec/trivy:latest \
  config /workspace

# Scan with specific options
docker run --rm \
  -v "$(pwd):/workspace" \
  aquasec/trivy:latest \
  config \
  --severity HIGH,CRITICAL \
  --exit-code 1 \
  /workspace
```

## Writing Custom Policies

Trivy supports custom Rego policies for organization-specific rules:

```rego
# policies/terraform/required_tags.rego
# Deny resources without required tags

package user.terraform.required_tags

import rego.v1

# Define required tags
required_tags := ["Environment", "Team", "ManagedBy"]

deny contains msg if {
    resource := input.resource[type][name]
    type_requires_tags(type)
    tags := object.get(resource, "tags", {})
    missing := [tag | tag := required_tags[_]; not tags[tag]]
    count(missing) > 0
    msg := sprintf("%s.%s is missing required tags: %v", [type, name, missing])
}

type_requires_tags(type) if {
    taggable_types := {
        "aws_instance",
        "aws_s3_bucket",
        "aws_rds_cluster",
        "aws_vpc",
    }
    taggable_types[type]
}
```

Run Trivy with custom policies:

```bash
# Include custom policies from a directory
trivy config --policy ./policies .

# Only run custom policies (skip built-in)
trivy config --policy ./policies --skip-policy-update .
```

## Scanning Terraform Modules

When scanning modules that reference other modules, make sure to run `terraform init` first so that module sources are downloaded:

```bash
# Initialize to download module sources
terraform init

# Then scan - Trivy will check the downloaded modules too
trivy config .

# Or scan the .terraform/modules directory directly
trivy config .terraform/modules
```

## Comparing Trivy with Other IaC Scanners

| Feature | Trivy | tfsec | Checkov |
|---------|-------|-------|---------|
| Language | Go | Go | Python |
| Terraform HCL | Yes | Yes | Yes |
| Terraform Plan | Yes | Yes | Yes |
| Custom policies | Rego | Rego/JSON | Python/YAML |
| Container scanning | Yes | No | No |
| SARIF output | Yes | Yes | Yes |
| Speed | Fast | Fast | Moderate |

Trivy's advantage is that it is a single tool for multiple scanning needs. If you already use it for container scanning, adding Terraform scanning is just a flag change.

## Best Practices

1. **Scan early and often.** Add Trivy to pre-commit hooks or early CI stages so developers get feedback before code review.

2. **Start with HIGH and CRITICAL.** Do not try to fix everything at once. Focus on the most impactful findings first.

3. **Use .trivyignore for accepted risks.** Document why each ignore exists so future developers understand the decision.

4. **Scan both HCL and plan JSON.** HCL scanning is fast but misses runtime values. Plan scanning catches more issues but requires credentials.

5. **Update Trivy regularly.** New security checks are added frequently. Pin to a specific version in CI but update periodically.

Trivy makes Terraform security scanning straightforward. Install it, point it at your Terraform directory, and it tells you what to fix. No configuration files, no accounts, no complex setup.

For complementary security testing, see [How to Set Up Pre-Commit Hooks for Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-pre-commit-hooks-for-terraform/view) and [How to Use Infracost with Terraform for Cost Testing](https://oneuptime.com/blog/post/2026-02-23-how-to-use-infracost-with-terraform-for-cost-testing/view).
