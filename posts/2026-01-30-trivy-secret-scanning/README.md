# How to Create Trivy Secret Scanning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Trivy, Security, Secrets, Scanning

Description: Learn how to detect and prevent credential leaks in your codebase using Trivy secret scanning with built-in patterns and custom rules.

---

Leaked credentials are one of the most common causes of security breaches. Whether it is an AWS access key committed to a public repository or an API token left in a configuration file, exposed secrets can lead to devastating consequences. Trivy provides powerful secret scanning capabilities that can detect these risks before they reach production.

## Understanding Trivy Secret Scanning

Trivy is a comprehensive security scanner that can detect secrets embedded in your code, container images, and filesystem. It uses pattern matching and entropy analysis to identify credentials across a wide range of services and providers.

## Secret Scanning Pipeline

The following diagram illustrates how Trivy secret scanning integrates into your development workflow:

```mermaid
flowchart TD
    A[Source Code Repository] --> B[Trivy Secret Scanner]
    B --> C{Secrets Detected?}
    C --> |Yes| D[Block Pipeline]
    C --> |No| E[Continue Build]

    D --> F[Generate Report]
    F --> G[Alert Security Team]
    F --> H[Notify Developer]

    E --> I[Container Build]
    I --> J[Image Scan]
    J --> K{Clean Image?}
    K --> |Yes| L[Push to Registry]
    K --> |No| D

    H --> M[Developer Fixes]
    M --> N[Commit Changes]
    N --> A
```

## Basic Secret Scanning Configuration

Trivy can scan multiple targets for secrets. Here are the fundamental commands:

```bash
# Scan a local directory for secrets
# This checks all files recursively for credential patterns
trivy fs --scanners secret /path/to/your/project

# Scan a container image for embedded secrets
# Useful for catching secrets baked into Docker images
trivy image --scanners secret your-image:tag

# Scan a Git repository
# Checks the entire repository history for leaked secrets
trivy repo --scanners secret https://github.com/your-org/your-repo

# Scan with JSON output for CI/CD integration
# JSON format makes it easy to parse results programmatically
trivy fs --scanners secret --format json --output results.json .
```

## Built-in Secret Patterns

Trivy includes detection rules for hundreds of secret types out of the box. Here are some of the most commonly detected patterns:

### Cloud Provider Credentials

```yaml
# AWS Access Keys
# Pattern matches: AKIA followed by 16 alphanumeric characters
# Example: AKIAIOSFODNN7EXAMPLE
aws-access-key-id:
  pattern: "(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}"
  severity: CRITICAL

# AWS Secret Access Keys
# Pattern matches: 40 character base64-like strings
aws-secret-access-key:
  pattern: "[A-Za-z0-9/+=]{40}"
  severity: CRITICAL

# GCP Service Account Keys
# Pattern matches: JSON key files with private_key field
gcp-service-account:
  pattern: '"type":\s*"service_account"'
  severity: CRITICAL

# Azure Storage Account Keys
# Pattern matches: 88 character base64 strings
azure-storage-key:
  pattern: "[A-Za-z0-9/+=]{88}=="
  severity: HIGH
```

### API Keys and Tokens

```yaml
# GitHub Personal Access Tokens
# Pattern matches: ghp_, gho_, ghu_, ghs_, ghr_ prefixed tokens
github-token:
  pattern: "(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36}"
  severity: HIGH

# Slack Tokens
# Pattern matches: xox prefixed tokens (bot, user, app tokens)
slack-token:
  pattern: "xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*"
  severity: HIGH

# Stripe API Keys
# Pattern matches: sk_live_ or sk_test_ prefixed keys
stripe-api-key:
  pattern: "sk_(live|test)_[0-9a-zA-Z]{24}"
  severity: CRITICAL

# SendGrid API Keys
# Pattern matches: SG. prefixed tokens
sendgrid-api-key:
  pattern: "SG\\.[a-zA-Z0-9_-]{22}\\.[a-zA-Z0-9_-]{43}"
  severity: HIGH
```

### Database Credentials

```yaml
# PostgreSQL Connection Strings
# Pattern matches: postgres:// URLs with embedded credentials
postgres-uri:
  pattern: "postgres://[^:]+:[^@]+@[^/]+/[^\\s]+"
  severity: HIGH

# MongoDB Connection Strings
# Pattern matches: mongodb:// or mongodb+srv:// with credentials
mongodb-uri:
  pattern: "mongodb(\\+srv)?://[^:]+:[^@]+@[^/]+/[^\\s]+"
  severity: HIGH

# MySQL Connection Strings
# Pattern matches: mysql:// URLs with embedded credentials
mysql-uri:
  pattern: "mysql://[^:]+:[^@]+@[^/]+/[^\\s]+"
  severity: HIGH
```

## Custom Secret Rules Definition

When built-in rules are not enough, you can define custom detection rules. Create a configuration file to specify your own patterns:

```yaml
# trivy-secret-config.yaml
# Custom secret detection rules for your organization

# Define custom rules for internal systems
rules:
  # Internal API tokens with company-specific prefix
  - id: internal-api-token
    description: "Internal API Token"
    # Pattern matches: MYCOMPANY-API- followed by 32 hex characters
    pattern: "MYCOMPANY-API-[a-f0-9]{32}"
    severity: HIGH
    keywords:
      - MYCOMPANY-API

  # Legacy system credentials
  - id: legacy-system-password
    description: "Legacy System Password"
    # Pattern matches: password= followed by quoted string
    pattern: 'password\s*=\s*["\'][^"\']{8,}["\']'
    severity: MEDIUM
    keywords:
      - password

  # Internal certificate private keys
  - id: internal-private-key
    description: "Internal Private Key"
    # Pattern matches: BEGIN PRIVATE KEY blocks
    pattern: "-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"
    severity: CRITICAL
    keywords:
      - PRIVATE KEY
      - BEGIN

  # JWT tokens (often contain sensitive claims)
  - id: jwt-token
    description: "JWT Token"
    # Pattern matches: base64 encoded JWT structure (header.payload.signature)
    pattern: "eyJ[a-zA-Z0-9_-]*\\.eyJ[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*"
    severity: MEDIUM
    keywords:
      - eyJ

  # Database credentials in environment variables
  - id: db-credentials-env
    description: "Database Credentials in Environment Variable"
    # Pattern matches: common database credential variable names
    pattern: "(DB_PASSWORD|DATABASE_PASSWORD|MYSQL_PASSWORD|POSTGRES_PASSWORD)\\s*=\\s*['\"]?[^\\s'\"]+['\"]?"
    severity: HIGH
    keywords:
      - PASSWORD
```

Run Trivy with your custom configuration:

```bash
# Use custom secret rules configuration
# The --secret-config flag points to your custom rules file
trivy fs --scanners secret --secret-config trivy-secret-config.yaml .

# Combine built-in and custom rules
# This scans using both default patterns and your custom definitions
trivy image --scanners secret --secret-config trivy-secret-config.yaml myapp:latest
```

## Exclusion Patterns for False Positives

False positives are common in secret scanning. Trivy provides several ways to exclude benign matches:

### Using .trivyignore File

Create a `.trivyignore` file in your project root:

```bash
# .trivyignore
# Exclude specific files or patterns from secret scanning

# Ignore test fixtures containing fake credentials
# These are not real secrets, just test data
tests/fixtures/*

# Ignore example configuration files
# Documentation examples often contain placeholder credentials
docs/examples/*.yaml
docs/examples/*.json

# Ignore specific files by path
# This config file contains example values, not real credentials
config/example.env

# Ignore vendor and dependency directories
# Third-party code is managed separately
vendor/
node_modules/
```

### Using Inline Comments

You can suppress specific findings with inline comments:

```python
# config.py
# Example credentials for documentation purposes

# trivy:ignore:generic-api-key
# This is a placeholder value for documentation
EXAMPLE_API_KEY = "sk_test_XXXXXXXXXXXXXXXXXXXXXXXX"

# trivy:ignore:aws-access-key-id
# This is a dummy value used in unit tests
TEST_AWS_KEY = "AKIAIOSFODNN7EXAMPLE"
```

### Configuration File Exclusions

Create a detailed exclusion configuration:

```yaml
# trivy-secret-exclusions.yaml
# Detailed exclusion rules for false positive management

# Exclude by file path patterns
exclude-paths:
  # Test directories commonly contain mock credentials
  - "**/*_test.go"
  - "**/test_*.py"
  - "**/*.test.js"
  - "**/tests/**"
  - "**/fixtures/**"

  # Documentation and examples
  - "**/docs/**"
  - "**/examples/**"
  - "**/*.example"
  - "**/*.sample"

  # Build artifacts and dependencies
  - "**/node_modules/**"
  - "**/vendor/**"
  - "**/.git/**"
  - "**/dist/**"
  - "**/build/**"

# Exclude specific secret types that generate false positives
# in your environment
exclude-rules:
  # If you have legitimate high-entropy strings
  - id: generic-api-key
    paths:
      - "config/encryption_keys.yaml"

  # Exclude JWT patterns in test files
  - id: jwt-token
    paths:
      - "**/test/**"
      - "**/*_test.*"

# Allow-list for specific known safe values
# Use sparingly and document why each is safe
allow-rules:
  - description: "Documentation example AWS key"
    value: "AKIAIOSFODNN7EXAMPLE"

  - description: "Test Stripe key (Stripe test mode)"
    value: "sk_test_"
    is_prefix: true
```

Run with exclusions:

```bash
# Apply exclusion configuration
trivy fs --scanners secret \
  --secret-config trivy-secret-exclusions.yaml \
  --ignorefile .trivyignore \
  /path/to/project
```

## CI/CD Integration

Integrate Trivy secret scanning into your CI/CD pipeline:

### GitHub Actions Example

```yaml
# .github/workflows/security-scan.yaml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          # Fetch full history for comprehensive scanning
          fetch-depth: 0

      - name: Run Trivy secret scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scanners: 'secret'
          # Fail the build on HIGH or CRITICAL severity findings
          severity: 'HIGH,CRITICAL'
          # Exit with error code 1 if secrets are found
          exit-code: '1'
          # Output format for GitHub Security tab integration
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload scan results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Run Trivy on container image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: '${{ env.IMAGE_NAME }}:${{ github.sha }}'
          scanners: 'secret,vuln'
          severity: 'HIGH,CRITICAL'
          exit-code: '1'
```

### GitLab CI Example

```yaml
# .gitlab-ci.yml
secret-scan:
  stage: test
  image: aquasec/trivy:latest
  script:
    # Scan the repository for secrets
    - trivy fs --scanners secret --exit-code 1 --severity HIGH,CRITICAL .

    # Scan the built container image
    - trivy image --scanners secret --exit-code 1 --severity HIGH,CRITICAL $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"
```

## Advanced Configuration

### Combining Multiple Scanners

```bash
# Run comprehensive security scan with multiple scanners
# This checks for secrets, vulnerabilities, and misconfigurations
trivy fs \
  --scanners secret,vuln,misconfig \
  --severity HIGH,CRITICAL \
  --format table \
  --exit-code 1 \
  .
```

### Custom Output Formatting

```bash
# Generate HTML report for security review
trivy fs --scanners secret \
  --format template \
  --template "@/path/to/html.tpl" \
  --output security-report.html \
  .

# Generate JSON for programmatic processing
trivy fs --scanners secret \
  --format json \
  --output secrets-report.json \
  . | jq '.Results[].Secrets[]'
```

### Scanning Specific File Types

```yaml
# trivy.yaml
# Global configuration file

secret:
  # Only scan specific file extensions
  enable-builtin-rules: true

  # Skip binary files
  skip-files:
    - "**/*.png"
    - "**/*.jpg"
    - "**/*.gif"
    - "**/*.ico"
    - "**/*.woff"
    - "**/*.woff2"
    - "**/*.ttf"
    - "**/*.eot"
    - "**/*.pdf"
    - "**/*.zip"
    - "**/*.tar.gz"
```

## Best Practices

1. **Shift Left**: Run secret scans as early as possible in your development workflow. Use pre-commit hooks to catch secrets before they are committed.

2. **Scan Everything**: Scan source code, container images, Infrastructure as Code templates, and configuration files.

3. **Automate Remediation**: When secrets are detected, automatically trigger rotation procedures for the affected credentials.

4. **Maintain Exclusions**: Regularly review and update your exclusion rules to minimize false positives while ensuring real secrets are not missed.

5. **Monitor Trends**: Track secret detection metrics over time to identify teams or repositories that need additional training.

6. **Document Exceptions**: When you exclude a finding, document why it is safe to ignore. This helps future reviewers understand the context.

## Conclusion

Trivy secret scanning is an essential tool for preventing credential leaks in your software supply chain. By combining built-in detection patterns with custom rules and thoughtful exclusions, you can build a robust secret detection pipeline that catches real threats while minimizing false positives.

Start with the basic commands to understand what secrets exist in your codebase today. Then progressively add custom rules, exclusions, and CI/CD integration to build a comprehensive secret management strategy. Remember that secret scanning is just one part of a defense-in-depth approach to credential security.
