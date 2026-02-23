# How to Handle Terraform for Regulated Industries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Compliance, Regulated Industries, HIPAA, SOC2, Security

Description: Learn how to use Terraform in regulated industries like healthcare, finance, and government, covering compliance automation, audit requirements, encryption standards, and regulatory frameworks.

---

Regulated industries like healthcare, finance, and government have strict requirements for how infrastructure is managed. Every change must be traceable. Every resource must meet specific security standards. Every deployment must be auditable. Terraform, when configured properly, is an excellent tool for meeting these requirements because infrastructure as code inherently provides the documentation and repeatability that regulators demand.

In this guide, we will cover how to use Terraform effectively in environments subject to HIPAA, SOC2, PCI-DSS, FedRAMP, and other regulatory frameworks.

## Understanding Regulatory Requirements

Different regulations have different but overlapping requirements:

```yaml
# compliance/regulatory-matrix.yaml
# Mapping of regulatory requirements to Terraform controls

regulations:
  hipaa:
    name: "Health Insurance Portability and Accountability Act"
    key_requirements:
      - "Encryption of PHI at rest and in transit"
      - "Access controls and audit logging"
      - "Backup and disaster recovery"
      - "Business associate agreements"
    terraform_controls:
      - "Enforce encryption on all storage resources"
      - "IAM policies with least privilege"
      - "CloudTrail and CloudWatch logging"
      - "Automated backup configuration"

  soc2:
    name: "Service Organization Control 2"
    key_requirements:
      - "Change management procedures"
      - "Access control"
      - "System monitoring"
      - "Risk assessment"
    terraform_controls:
      - "Git-based change tracking"
      - "PR approval workflows"
      - "Monitoring and alerting resources"
      - "Automated compliance scanning"

  pci_dss:
    name: "Payment Card Industry Data Security Standard"
    key_requirements:
      - "Network segmentation"
      - "Strong access control"
      - "Encryption of cardholder data"
      - "Regular security testing"
    terraform_controls:
      - "VPC segmentation with security groups"
      - "IAM with MFA enforcement"
      - "KMS encryption for sensitive data"
      - "Security scanning in CI/CD pipeline"

  fedramp:
    name: "Federal Risk and Authorization Management Program"
    key_requirements:
      - "Continuous monitoring"
      - "Incident response"
      - "Supply chain risk management"
      - "Data sovereignty"
    terraform_controls:
      - "Automated drift detection"
      - "Incident response automation"
      - "Provider version pinning"
      - "Region-locked deployments"
```

## Implementing Encryption Standards

Every regulated industry requires encryption. Enforce it at the Terraform level:

```hcl
# compliance/encryption-module/main.tf
# Encryption standards enforcement module

# KMS key for encrypting regulated data
resource "aws_kms_key" "regulated_data" {
  description             = "KMS key for encrypting regulated data"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  # Strict key policy
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowKeyAdmin"
        Effect = "Allow"
        Principal = {
          AWS = var.key_admin_arn
        }
        Action = [
          "kms:Create*",
          "kms:Describe*",
          "kms:Enable*",
          "kms:List*",
          "kms:Put*",
          "kms:Update*",
          "kms:Revoke*",
          "kms:Disable*",
          "kms:Get*",
          "kms:Delete*",
          "kms:TagResource",
          "kms:UntagResource",
          "kms:ScheduleKeyDeletion",
          "kms:CancelKeyDeletion"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowKeyUsage"
        Effect = "Allow"
        Principal = {
          AWS = var.key_user_arns
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.common_tags, {
    Compliance  = "encrypted"
    DataClass   = "regulated"
  })
}

# S3 bucket with required encryption
resource "aws_s3_bucket" "regulated" {
  bucket = var.bucket_name

  # Prevent accidental deletion of regulated data
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "regulated" {
  bucket = aws_s3_bucket.regulated.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.regulated_data.arn
    }
    bucket_key_enabled = true
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "regulated" {
  bucket = aws_s3_bucket.regulated.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Automated Compliance Policies

Use policy-as-code to enforce compliance automatically:

```rego
# compliance/policies/hipaa.rego
# HIPAA compliance policies for Terraform

package terraform.compliance.hipaa

# All RDS instances must be encrypted
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_db_instance"
    resource.change.after.storage_encrypted != true
    msg := sprintf(
        "HIPAA: RDS instance '%s' must have storage encryption enabled",
        [resource.address]
    )
}

# All RDS instances must have backup enabled
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_db_instance"
    resource.change.after.backup_retention_period < 7
    msg := sprintf(
        "HIPAA: RDS instance '%s' must have at least 7 days backup retention",
        [resource.address]
    )
}

# All S3 buckets must block public access
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket_public_access_block"
    resource.change.after.block_public_acls != true
    msg := sprintf(
        "HIPAA: S3 bucket '%s' must block all public access",
        [resource.address]
    )
}

# CloudTrail must be enabled
deny[msg] {
    count([r | r := input.resource_changes[_]; r.type == "aws_cloudtrail"]) == 0
    msg := "HIPAA: CloudTrail must be enabled for audit logging"
}
```

## Audit Trail Requirements

Regulated industries require comprehensive audit trails:

```hcl
# compliance/audit/main.tf
# Comprehensive audit trail for regulated environments

# CloudTrail for all API activity
resource "aws_cloudtrail" "compliance" {
  name                          = "compliance-audit-trail"
  s3_bucket_name                = aws_s3_bucket.audit_logs.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  # Log data events for S3 and Lambda
  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::"]
    }
  }

  # Send logs to CloudWatch for real-time alerting
  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_cloudwatch.arn

  tags = merge(var.common_tags, {
    Compliance = "audit-trail"
  })
}

# Audit log retention - regulated data retention period
resource "aws_s3_bucket_lifecycle_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    id     = "retain-audit-logs"
    status = "Enabled"

    # Move to infrequent access after 90 days
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 1 year
    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    # Retain for 7 years (common regulatory requirement)
    expiration {
      days = 2555
    }
  }
}
```

## Network Segmentation for Compliance

```hcl
# compliance/networking/main.tf
# Network segmentation for regulated workloads

# Regulated data VPC - isolated from general workloads
resource "aws_vpc" "regulated" {
  cidr_block           = "10.100.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.common_tags, {
    Compliance  = "regulated"
    NetworkZone = "restricted"
  })
}

# Private subnets only - no internet access
resource "aws_subnet" "regulated_private" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.regulated.id
  cidr_block        = cidrsubnet("10.100.0.0/16", 8, count.index)
  availability_zone = var.availability_zones[count.index]

  # No public IPs in regulated subnets
  map_public_ip_on_launch = false

  tags = merge(var.common_tags, {
    Compliance = "regulated"
    Tier       = "private"
  })
}

# VPC Flow Logs for network audit
resource "aws_flow_log" "regulated" {
  vpc_id          = aws_vpc.regulated.id
  traffic_type    = "ALL"
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn

  tags = merge(var.common_tags, {
    Compliance = "network-audit"
  })
}
```

## Drift Detection and Remediation

Regulated environments must detect and remediate unauthorized changes:

```yaml
# .github/workflows/drift-detection.yaml
name: Compliance Drift Detection

on:
  schedule:
    # Run every hour for regulated environments
    - cron: '0 * * * *'

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        workspace:
          - compliance/production
          - compliance/staging
    steps:
      - uses: actions/checkout@v4

      - name: Terraform Plan (Drift Detection)
        id: plan
        working-directory: ${{ matrix.workspace }}
        run: |
          terraform init
          terraform plan -detailed-exitcode -out=drift.tfplan 2>&1 | tee plan-output.txt
          echo "exitcode=$?" >> $GITHUB_OUTPUT

      - name: Alert on Drift
        if: steps.plan.outputs.exitcode == '2'
        run: |
          # Alert the security team about infrastructure drift
          python scripts/alert-drift.py \
            --workspace "${{ matrix.workspace }}" \
            --plan-output plan-output.txt \
            --severity "HIGH"
```

## Best Practices for Regulated Environments

Treat compliance as code. Every compliance requirement should be expressed as a policy check that runs automatically. Manual compliance verification does not scale and is error-prone.

Version everything. Not just your Terraform code, but your state files, policies, and audit logs. Regulators want to see history, not just current state.

Implement defense in depth. No single control is sufficient. Layer preventive controls (policies that block non-compliant resources), detective controls (drift detection), and corrective controls (automated remediation).

Document your controls. Regulators need to see documentation of how your controls work. Map each regulatory requirement to a specific Terraform control and keep the mapping current.

Test your compliance controls. Regularly test that your policies actually catch violations. Write negative tests that intentionally create non-compliant configurations to verify that they are blocked.

## Conclusion

Using Terraform in regulated industries requires deliberate attention to encryption, audit trails, access controls, and network segmentation. By expressing compliance requirements as code, automating enforcement through policies, and maintaining comprehensive audit trails, you can meet regulatory requirements while still enjoying the speed and consistency benefits of infrastructure as code. The key is to build compliance into your Terraform workflow from the start, not bolt it on after the fact.
