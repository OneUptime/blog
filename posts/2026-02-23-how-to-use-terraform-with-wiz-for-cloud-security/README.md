# How to Use Terraform with Wiz for Cloud Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Wiz, Cloud Security, DevOps, Infrastructure as Code, CSPM, Security

Description: Learn how to integrate Terraform with Wiz to scan infrastructure code for security risks and maintain continuous cloud security posture management across your deployments.

---

Wiz is a cloud security platform that provides agentless visibility into cloud risks across your entire environment. When integrated with Terraform, Wiz can scan your infrastructure code before deployment to identify security issues, and then continuously monitor the deployed resources for new vulnerabilities and misconfigurations. This guide covers how to set up Terraform with Wiz for comprehensive cloud security.

## Why Use Wiz with Terraform?

Wiz takes a unique approach to cloud security by building a security graph that maps relationships between cloud resources, identities, networks, and data. This context-aware approach means Wiz can identify not just individual misconfigurations but also attack paths that chain multiple issues together. When applied to Terraform, this means Wiz can predict the security impact of proposed infrastructure changes before they are deployed.

Key capabilities include IaC scanning for security misconfigurations, attack path analysis for Terraform-planned resources, compliance mapping to CIS, SOC2, PCI-DSS and more, integration with CI/CD pipelines for shift-left security, and runtime monitoring of deployed Terraform resources.

## Prerequisites

You need a Wiz enterprise account, Wiz CLI installed, a Wiz service account with appropriate permissions, Terraform version 1.0 or later, and cloud provider accounts connected to Wiz.

## Step 1: Set Up the Wiz CLI

Install and configure the Wiz CLI for Terraform scanning.

```bash
# Download and install the Wiz CLI
curl -o wizcli https://wizcli.app.wiz.io/latest/wizcli-linux-amd64
chmod +x wizcli
sudo mv wizcli /usr/local/bin/

# Authenticate with Wiz
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"

# Verify authentication
wizcli version
```

## Step 2: Scan Terraform Configurations

Use the Wiz CLI to scan Terraform files for security issues.

```bash
# Scan Terraform directory
wizcli iac scan --path terraform/

# Scan with specific policy set
wizcli iac scan --path terraform/ --policy "Default IaC policy"

# Scan and output results as JSON
wizcli iac scan --path terraform/ --format json --output results.json

# Scan a Terraform plan
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json
wizcli iac scan --path tfplan.json --type tf-plan
```

Example configurations and what Wiz detects:

```hcl
# examples/risky-infrastructure.tf
# Wiz would flag multiple security risks in this configuration

# Risk: Public RDS instance without encryption
resource "aws_db_instance" "risky" {
  identifier           = "risky-database"
  engine               = "postgres"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  publicly_accessible  = true     # Wiz: High risk - database exposed to internet
  storage_encrypted    = false    # Wiz: High risk - data at rest not encrypted
  skip_final_snapshot  = true

  # Missing: backup_retention_period
  # Missing: deletion_protection
  # Missing: vpc_security_group_ids (using default VPC)
}

# Risk: Overly permissive IAM role
resource "aws_iam_role_policy" "risky" {
  name = "risky-policy"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "*"           # Wiz: Critical - wildcard permissions
        Resource = "*"           # Wiz: Critical - access to all resources
      }
    ]
  })
}
```

```hcl
# examples/secure-infrastructure.tf
# Secure configuration that passes Wiz scanning

# Secure RDS instance
resource "aws_db_instance" "secure" {
  identifier           = "secure-database"
  engine               = "postgres"
  engine_version       = "15"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  publicly_accessible  = false
  storage_encrypted    = true
  kms_key_id           = aws_kms_key.rds.arn
  skip_final_snapshot  = false

  backup_retention_period = 7
  deletion_protection     = true

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.private.name

  # Enable enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Enable performance insights
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.rds.arn

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Least-privilege IAM policy
resource "aws_iam_role_policy" "secure" {
  name = "secure-policy"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.app_data.arn,
          "${aws_s3_bucket.app_data.arn}/*"
        ]
      }
    ]
  })
}
```

## Step 3: CI/CD Pipeline Integration

Integrate Wiz scanning into your deployment pipeline.

```yaml
# .github/workflows/terraform-wiz.yml
name: Terraform with Wiz Security Scan

on:
  pull_request:
    paths:
      - 'terraform/**'
  push:
    branches: [main]

jobs:
  wiz-scan:
    runs-on: ubuntu-latest
    name: Wiz IaC Security Scan
    steps:
      - uses: actions/checkout@v4

      # Install Wiz CLI
      - name: Install Wiz CLI
        run: |
          curl -o wizcli https://wizcli.app.wiz.io/latest/wizcli-linux-amd64
          chmod +x wizcli
          sudo mv wizcli /usr/local/bin/

      # Authenticate
      - name: Authenticate Wiz CLI
        run: wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"
        env:
          WIZ_CLIENT_ID: ${{ secrets.WIZ_CLIENT_ID }}
          WIZ_CLIENT_SECRET: ${{ secrets.WIZ_CLIENT_SECRET }}

      # Scan Terraform files
      - name: Scan Terraform
        run: |
          wizcli iac scan \
            --path terraform/ \
            --policy "Default IaC policy" \
            --format sarif \
            --output wiz-results.sarif

      # Upload results to GitHub Security
      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: wiz-results.sarif

  terraform-plan-scan:
    runs-on: ubuntu-latest
    name: Scan Terraform Plan
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        working-directory: terraform
        run: terraform init

      - name: Terraform Plan
        working-directory: terraform
        run: |
          terraform plan -out=tfplan
          terraform show -json tfplan > tfplan.json

      # Install and authenticate Wiz CLI
      - name: Setup Wiz
        run: |
          curl -o wizcli https://wizcli.app.wiz.io/latest/wizcli-linux-amd64
          chmod +x wizcli
          sudo mv wizcli /usr/local/bin/
          wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"
        env:
          WIZ_CLIENT_ID: ${{ secrets.WIZ_CLIENT_ID }}
          WIZ_CLIENT_SECRET: ${{ secrets.WIZ_CLIENT_SECRET }}

      # Scan the plan
      - name: Scan Plan
        run: |
          wizcli iac scan \
            --path terraform/tfplan.json \
            --type tf-plan \
            --policy "Default IaC policy"

  deploy:
    needs: [wiz-scan, terraform-plan-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Apply
        working-directory: terraform
        run: |
          terraform init
          terraform apply -auto-approve
```

## Step 4: Wiz Guardrails for Terraform

Configure Wiz admission policies that act as guardrails for Terraform deployments.

```hcl
# wiz-guardrails.tf
# Configure infrastructure that aligns with Wiz guardrail policies

# Ensure all EC2 instances use IMDSv2
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  # Required by Wiz guardrails
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    http_endpoint               = "enabled"
  }

  # Required: EBS volumes encrypted
  root_block_device {
    encrypted  = true
    kms_key_id = aws_kms_key.ebs.arn
  }

  # Required: Instance in private subnet
  subnet_id = var.private_subnet_id

  # Required: Specific security group
  vpc_security_group_ids = [aws_security_group.app.id]

  tags = {
    Name        = "app-server"
    Environment = var.environment
    ManagedBy   = "terraform"
    WizScanned  = "true"
  }
}

# Restrictive security group that passes Wiz checks
resource "aws_security_group" "app" {
  name_prefix = "app-"
  vpc_id      = var.vpc_id
  description = "Security group for application servers"

  # Only allow specific inbound traffic
  ingress {
    description     = "HTTPS from load balancer"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Restrict outbound traffic
  egress {
    description = "HTTPS outbound"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "DNS"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = {
    Name = "app-sg"
  }
}
```

## Step 5: Wiz Integration with Terraform Cloud

Set up Wiz as a run task in Terraform Cloud.

```hcl
# tfc-wiz.tf
# Configure Wiz as a Terraform Cloud run task
resource "tfe_organization_run_task" "wiz" {
  organization = var.tfe_organization
  url          = var.wiz_run_task_url
  name         = "wiz-iac-scan"
  enabled      = true
  hmac_key     = var.wiz_hmac_key
}

resource "tfe_workspace_run_task" "wiz_production" {
  workspace_id      = tfe_workspace.production.id
  task_id           = tfe_organization_run_task.wiz.id
  enforcement_level = "mandatory"
  stage             = "post_plan"
}
```

## Step 6: Managing Wiz Configuration with Terraform

Use Terraform to manage Wiz policies and configurations.

```hcl
# wiz-management.tf
# Manage Wiz configurations using the Wiz Terraform provider
terraform {
  required_providers {
    wiz = {
      source  = "AxtonGrams/wiz"
      version = "~> 0.1"
    }
  }
}

# Create a Wiz automation rule
resource "wiz_automation_rule" "terraform_findings" {
  name    = "Terraform IaC Critical Findings"
  enabled = true

  trigger_source = "IaC_SCAN"
  trigger_type   = "CREATED"

  filters = jsonencode({
    severity = ["CRITICAL", "HIGH"]
    source   = ["Terraform"]
  })

  action_type = "SEND_NOTIFICATION"

  action_params = jsonencode({
    notification_type = "SLACK"
    channel          = "#security-alerts"
    message          = "Critical Terraform security finding detected"
  })
}
```

## Step 7: Attack Path Prevention

Wiz's unique feature is attack path analysis. Configure Terraform resources to break common attack paths.

```hcl
# attack-path-prevention.tf
# Configuration designed to prevent common attack paths

# Prevent the "public storage to sensitive data" attack path
resource "aws_s3_bucket" "sensitive_data" {
  bucket = "sensitive-data-bucket"
}

resource "aws_s3_bucket_public_access_block" "sensitive_data" {
  bucket = aws_s3_bucket.sensitive_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Prevent the "overprivileged identity" attack path
resource "aws_iam_role" "app" {
  name = "app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
      }
    }]
  })

  # Set permission boundary to limit maximum permissions
  permissions_boundary = aws_iam_policy.boundary.arn
}

# Permission boundary prevents privilege escalation
resource "aws_iam_policy" "boundary" {
  name = "app-permission-boundary"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      {
        Effect   = "Deny"
        Action   = [
          "iam:*",
          "organizations:*",
          "account:*"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Best Practices

Scan Terraform configurations in the IDE with Wiz extensions for the earliest feedback. Run Wiz scans on every pull request and block merges for critical and high severity findings. Use Wiz's attack path analysis to understand the real-world impact of misconfigurations. Configure Wiz guardrails at the organizational level to prevent common security mistakes. Track Wiz findings over time using the platform's dashboard to measure security improvement. Use Wiz's integration with Terraform Cloud run tasks for seamless security checks. Review and tune Wiz policies regularly to reduce false positives.

## Conclusion

Wiz brings context-aware cloud security to Terraform workflows. Its ability to identify not just individual misconfigurations but complete attack paths makes it particularly valuable for understanding the real security impact of infrastructure changes. By integrating Wiz scanning into your Terraform pipeline, you gain visibility into security risks before deployment and continuous monitoring after. This combination helps maintain a strong security posture while keeping development velocity high.
