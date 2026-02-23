# How to Use KICS for Infrastructure as Code Scanning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, KICS, Security, Infrastructure as Code, DevSecOps

Description: A complete guide to using KICS (Keeping Infrastructure as Code Secure) for scanning Terraform and other IaC frameworks for security issues.

---

KICS, which stands for Keeping Infrastructure as Code Secure, is an open-source tool from Checkmarx that scans Terraform, CloudFormation, Kubernetes, Docker, Ansible, and other IaC formats for security vulnerabilities and misconfigurations. It ships with over 2000 built-in queries and produces detailed reports that are useful for both developers and security teams.

This guide covers how to set up KICS, run scans against Terraform code, customize its behavior, and integrate it into your development pipeline.

## Why KICS

KICS has some characteristics that distinguish it from alternatives:

- Over 2000 built-in queries across 15+ IaC platforms
- Queries are written in Rego (OPA), making them easy to customize
- Supports scanning multiple IaC types in a single run
- Produces rich HTML reports alongside JSON and SARIF output
- Strong focus on CIS benchmarks and OWASP guidelines
- Written in Go, so it is fast and has no runtime dependencies

## Installation

```bash
# Docker (recommended for CI/CD)
docker pull checkmarx/kics:latest

# macOS with Homebrew
brew install kics

# Linux binary download
wget -q "https://github.com/Checkmarx/kics/releases/latest/download/kics_linux_amd64.tar.gz"
tar -xzf kics_linux_amd64.tar.gz
sudo mv kics /usr/local/bin/

# Verify installation
kics version
```

## Running a Basic Scan

```bash
# Scan a directory
kics scan -p ./infrastructure

# Scan with specific output formats
kics scan -p . --output-path ./results --report-formats "json,html,sarif"

# Scan only Terraform files
kics scan -p . --type terraform

# Filter by severity
kics scan -p . --fail-on high,critical

# Scan multiple directories
kics scan -p ./modules -p ./environments
```

The default output is a table:

```
Scanning with KICS v1.7.0

Files scanned: 23
Parsed files: 23
Queries loaded: 487

Category          Severity    Query Name                               Count
────────────────────────────────────────────────────────────────────────────
Access Control    HIGH        S3 Bucket ACL Allows Public Access        1
Encryption        CRITICAL    S3 Bucket Without Server-Side Encryption  2
Logging           MEDIUM      CloudTrail Not Enabled                    1
Networking        HIGH        Security Group With Open Ingress          3
Best Practices    LOW         Resource Missing Tags                     5

Results Summary:
HIGH:     4
MEDIUM:   1
LOW:      5
CRITICAL: 2
TOTAL:    12
```

## Understanding KICS Queries

KICS queries are organized by platform and category. Each query has:

- A unique ID
- A severity level (CRITICAL, HIGH, MEDIUM, LOW, INFO)
- A CWE (Common Weakness Enumeration) mapping where applicable
- A description and remediation guidance

You can list available queries:

```bash
# List all queries for Terraform
kics scan -p . --type terraform --list-platforms

# Show query details
kics list --type terraform | head -50
```

## Working with Results

### HTML Reports

KICS generates visually clean HTML reports that you can share with stakeholders:

```bash
kics scan -p . --output-path ./reports --report-formats html
# Open reports/results.html in your browser
```

### JSON Results for Automation

```bash
kics scan -p . --output-path ./reports --report-formats json

# Parse the JSON output
cat reports/results.json | jq '.queries[] | select(.severity == "HIGH") | .query_name'
```

### SARIF for GitHub Integration

```bash
kics scan -p . --output-path ./reports --report-formats sarif
# Upload reports/results.sarif to GitHub Security
```

## Excluding Queries

When a finding does not apply to your situation:

### Inline Comments

```hcl
# kics-scan ignore-line
resource "aws_s3_bucket" "public_website" {
  bucket = "my-public-website"
  acl    = "public-read"
}

# Or ignore a specific query by ID
# kics-scan ignore-block=a227ec01-f97a-4084-91a4-47b350c1db54
resource "aws_s3_bucket" "public_assets" {
  bucket = "my-public-assets"
  acl    = "public-read"
}
```

### Configuration File

```yaml
# kics-config.yaml
path: ./infrastructure
type: terraform
output-path: ./results
report-formats:
  - json
  - sarif
  - html
fail-on:
  - high
  - critical
exclude-queries:
  # CloudTrail - handled at organization level
  - a227ec01-f97a-4084-91a4-47b350c1db54
  # S3 logging - managed centrally
  - b4d9f7e2-c4e3-4a8b-9f6d-1234567890ab
exclude-categories:
  - Best Practices  # Focus on security issues only
exclude-severities:
  - info
  - low
```

Run with the config:

```bash
kics scan --config kics-config.yaml
```

## Custom Queries

Write custom queries in Rego to enforce organization-specific policies:

```rego
# queries/custom/require_encryption_tag.rego
package Cx

import data.generic.terraform as tf_lib

CxPolicy[result] {
    resource := input.document[i].resource[resourceType][name]

    # Check if resource supports tags
    tf_lib.allows_tags(resourceType)

    # Verify the encryption tag exists
    not resource.tags.EncryptionStatus

    result := {
        "documentId":       input.document[i].id,
        "searchKey":        sprintf("%s[%s].tags", [resourceType, name]),
        "issueType":        "MissingAttribute",
        "keyExpectedValue": "'tags' should include 'EncryptionStatus'",
        "keyActualValue":   "'tags' does not include 'EncryptionStatus'",
        "resourceType":     resourceType,
        "resourceName":     name,
        "severity":         "MEDIUM",
        "line":             resource._kics_line
    }
}
```

Create the metadata:

```json
{
  "id": "custom-001",
  "queryName": "Resource Missing Encryption Tag",
  "severity": "MEDIUM",
  "category": "Best Practices",
  "descriptionText": "All resources should have an EncryptionStatus tag",
  "descriptionUrl": "https://wiki.myorg.com/tagging-standards",
  "platform": "Terraform",
  "cwe": ""
}
```

Run with custom queries:

```bash
kics scan -p . --queries-path ./queries/custom
```

## CI/CD Integration

### GitHub Actions

```yaml
name: KICS Security Scan
on:
  pull_request:
    paths:
      - '**.tf'

jobs:
  kics-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run KICS scan
        uses: checkmarx/kics-github-action@v2.1.0
        with:
          path: ./infrastructure
          type: terraform
          fail_on: high,critical
          output_path: ./results
          output_formats: 'json,sarif'
          enable_comments: true
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results/results.sarif
```

### GitLab CI

```yaml
kics-scan:
  stage: security
  image:
    name: checkmarx/kics:latest
    entrypoint: [""]
  script:
    - kics scan
      --path ./infrastructure
      --type terraform
      --output-path ./results
      --report-formats "json,sarif,html"
      --fail-on high,critical
  artifacts:
    paths:
      - results/
    reports:
      sast: results/results-sarif.sarif
  rules:
    - changes:
        - "**/*.tf"
```

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Checkmarx/kics
    rev: v1.7.0
    hooks:
      - id: kics-scan
        args:
          - --fail-on
          - high,critical
          - --type
          - terraform
```

## Comparing KICS with Other Tools

KICS complements other IaC scanning tools rather than replacing them:

- **KICS vs tfsec**: KICS covers more IaC platforms. tfsec has deeper Terraform-specific analysis.
- **KICS vs Checkov**: Checkov has better compliance framework mapping. KICS has more total queries.
- **KICS vs Terrascan**: Both use Rego for queries. Terrascan has the server mode advantage. KICS has better reporting.

Many teams run multiple scanners because each catches different things. KICS plus Checkov is a popular combination.

## Wrapping Up

KICS is a capable IaC scanning tool with broad coverage and good reporting. Its large query library catches many common misconfigurations out of the box, and the Rego-based query system makes it straightforward to add organization-specific checks. The HTML reports are particularly useful for sharing findings with non-technical stakeholders or during compliance audits.

To keep an eye on your infrastructure once it is deployed, [OneUptime](https://oneuptime.com) provides monitoring, incident management, and status pages to help you maintain operational excellence.
