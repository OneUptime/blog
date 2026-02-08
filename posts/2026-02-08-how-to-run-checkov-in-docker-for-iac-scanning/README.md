# How to Run Checkov in Docker for IaC Scanning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Checkov, Infrastructure as Code, Security, Terraform, CloudFormation, Kubernetes, Compliance

Description: A practical guide to running Checkov in Docker to scan infrastructure-as-code files for security and compliance issues.

---

Infrastructure as Code files can contain security misconfigurations that create real vulnerabilities in your cloud environment. Checkov, developed by Bridgecrew (now part of Palo Alto Networks), scans Terraform, CloudFormation, Kubernetes manifests, Dockerfiles, and more for hundreds of known issues. Running Checkov in Docker keeps your scanning environment consistent and avoids Python dependency conflicts.

This guide covers scanning different IaC formats, customizing rules, handling output, and integrating Checkov into your development workflow.

## What Makes Checkov Different

Checkov supports a broader range of IaC frameworks than most competitors. It scans Terraform, CloudFormation, Azure ARM templates, Kubernetes manifests, Helm charts, Dockerfiles, and Serverless Framework configurations. It also understands the relationships between resources, so it can detect issues like a security group referenced by an EC2 instance that allows public access.

The built-in policy library covers CIS benchmarks, SOC2, HIPAA, PCI-DSS, and other compliance frameworks. Each check maps to specific compliance requirements, which helps during audit season.

## Basic Scanning with Docker

Bridgecrew publishes an official Docker image for Checkov. Run your first scan with a single command.

```bash
# Scan the current directory for IaC security issues
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf
```

The `-d` flag specifies the directory to scan. Checkov auto-detects the IaC framework based on file extensions and content.

## Scanning Terraform Files

Create a Terraform configuration to test Checkov's detection capabilities.

```hcl
# main.tf - Example Terraform with various security issues
provider "aws" {
  region = "us-west-2"
}

# Checkov will flag: missing encryption, no versioning, no logging
resource "aws_s3_bucket" "example" {
  bucket = "my-example-bucket"
}

# Checkov will flag: publicly accessible, no encryption, no backup retention
resource "aws_db_instance" "example" {
  engine               = "postgres"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  publicly_accessible  = true
  storage_encrypted    = false
  skip_final_snapshot  = true
}

# Checkov will flag: SSH open to the world
resource "aws_security_group" "allow_ssh" {
  name = "allow-ssh"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

```bash
# Scan only Terraform files
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf \
  --framework terraform
```

## Scanning Dockerfiles

Checkov catches common Dockerfile security mistakes like running as root, using latest tags, and exposing unnecessary ports.

```dockerfile
# Dockerfile - Example with security issues Checkov will detect
FROM ubuntu:latest

# Running as root (Checkov flags this)
RUN apt-get update && apt-get install -y python3

# Hardcoded secret (Checkov detects this pattern)
ENV DATABASE_PASSWORD=supersecret123

# Adding all files including potentially sensitive ones
ADD . /app

EXPOSE 22

CMD ["python3", "/app/server.py"]
```

```bash
# Scan Dockerfiles specifically
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf \
  --framework dockerfile
```

## Scanning Kubernetes Manifests

Checkov validates Kubernetes manifests against security best practices.

```yaml
# deployment.yaml - Kubernetes manifest with security issues
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx:latest
          # Missing: resource limits, security context, read-only root filesystem
          ports:
            - containerPort: 80
```

```bash
# Scan Kubernetes manifests
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf \
  --framework kubernetes
```

Checkov will flag the missing resource limits, lack of security context, use of the `latest` tag, and other best practice violations.

## Output Formats

Checkov supports multiple output formats for different consumption needs.

```bash
# JSON output for programmatic processing
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf \
  -o json > checkov-results.json

# JUnit XML for CI test result integration
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf \
  -o junitxml > checkov-results.xml

# SARIF for GitHub Security integration
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf \
  -o sarif > checkov.sarif

# CLI table with compact output
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf \
  --compact
```

## Filtering and Skipping Checks

Not every check applies to every project. Filter checks by ID, severity, or category.

```bash
# Skip specific checks by ID
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf \
  --skip-check CKV_AWS_18,CKV_AWS_19

# Run only specific checks
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf \
  --check CKV_AWS_145,CKV_AWS_144

# Filter by severity
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf \
  --check-severity HIGH
```

You can also skip checks inline using comments in your IaC files.

```hcl
# Skip a specific check with justification
resource "aws_s3_bucket" "public_assets" {
  #checkov:skip=CKV_AWS_18: "Public assets bucket intentionally does not need logging"
  bucket = "public-assets-cdn"
}
```

## Custom Policies

Write custom Checkov policies in Python or YAML to enforce organization-specific rules.

```yaml
# custom-policies/naming-convention.yaml - Custom naming policy
metadata:
  id: "CUSTOM_001"
  name: "Ensure S3 bucket names follow naming convention"
  category: "CONVENTION"
  severity: "MEDIUM"
definition:
  cond_type: "attribute"
  resource_types:
    - "aws_s3_bucket"
  attribute: "bucket"
  operator: "starting_with"
  value: "acme-"
```

```bash
# Run Checkov with custom policy directory
docker run --rm \
  -v "$(pwd):/tf" \
  -v "$(pwd)/custom-policies:/custom" \
  bridgecrew/checkov \
  -d /tf \
  --external-checks-dir /custom
```

## Compliance Framework Scanning

Checkov maps checks to compliance frameworks. Scan against specific standards.

```bash
# Scan against CIS AWS Foundations Benchmark
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf \
  --check-type terraform \
  --framework terraform

# List all available checks for a specific compliance framework
docker run --rm \
  bridgecrew/checkov \
  --list \
  --framework terraform
```

## CI/CD Integration with GitHub Actions

Integrate Checkov into your pull request workflow.

```yaml
# .github/workflows/checkov.yml - IaC security scanning in CI
name: IaC Security Scan

on:
  pull_request:
    paths:
      - "terraform/**"
      - "kubernetes/**"
      - "Dockerfile*"

jobs:
  checkov:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Checkov scan
        run: |
          docker run --rm \
            -v "${{ github.workspace }}:/tf" \
            bridgecrew/checkov \
            -d /tf \
            -o sarif \
            --soft-fail \
            > checkov.sarif

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: checkov.sarif

      - name: Run Checkov with hard fail for critical issues
        run: |
          docker run --rm \
            -v "${{ github.workspace }}:/tf" \
            bridgecrew/checkov \
            -d /tf \
            --check-severity CRITICAL
```

## Baseline File for Existing Projects

When adding Checkov to an existing project with many findings, create a baseline to suppress known issues and only flag new ones.

```bash
# Generate a baseline from current findings
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf \
  --create-baseline

# Future scans compare against the baseline
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf \
  --baseline /tf/.checkov.baseline
```

This approach lets you adopt Checkov incrementally. The team fixes existing issues over time while preventing new ones from being introduced.

## Scanning Helm Charts

Checkov can scan Helm charts by rendering them first.

```bash
# Render the Helm chart and pipe the output to Checkov
docker run --rm \
  -v "$(pwd):/tf" \
  bridgecrew/checkov \
  -d /tf/helm-chart \
  --framework helm
```

## Wrapping Up

Checkov in Docker provides a comprehensive, zero-install scanning solution for infrastructure as code. It covers Terraform, CloudFormation, Kubernetes, Dockerfiles, and Helm charts with hundreds of built-in checks mapped to real compliance frameworks. The baseline feature makes adoption practical for existing projects, and the multiple output formats integrate cleanly with any CI system. Start scanning your IaC today - the findings will almost certainly surprise you.
