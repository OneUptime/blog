# How to Configure State Access Controls in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Security, Access Control, IAM

Description: Learn how to implement fine-grained access controls for Terraform state files across S3, GCS, Azure, and Terraform Cloud backends.

---

Your Terraform state file is essentially a blueprint of your entire infrastructure. It contains resource identifiers, network configurations, and sometimes sensitive data like database passwords or API keys. Controlling who can read and write that state is a critical security requirement.

This guide covers access control patterns for the most common Terraform backends.

## Why State Access Control Matters

A few things an attacker or careless user could do with access to your state:

- Read sensitive values (database passwords, API keys, certificate details).
- Understand your entire infrastructure topology for targeted attacks.
- Modify the state to trick Terraform into destroying resources on the next apply.
- Corrupt the state, making it impossible to manage infrastructure without manual recovery.

Controlling state access is not optional for production environments.

## S3 Backend Access Controls

### IAM Policies for State Access

Create separate IAM policies for read-only and read-write access:

```hcl
# Read-only policy for Terraform state (for plan operations)
resource "aws_iam_policy" "terraform_state_read" {
  name        = "terraform-state-read"
  description = "Read-only access to Terraform state in S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowStateRead"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::my-terraform-state",
          "arn:aws:s3:::my-terraform-state/*"
        ]
      },
      {
        # DynamoDB read access for state locking info
        Sid    = "AllowLockRead"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem"
        ]
        Resource = "arn:aws:dynamodb:us-east-1:123456789012:table/terraform-locks"
      }
    ]
  })
}

# Read-write policy for Terraform state (for apply operations)
resource "aws_iam_policy" "terraform_state_write" {
  name        = "terraform-state-write"
  description = "Read-write access to Terraform state in S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowStateReadWrite"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::my-terraform-state",
          "arn:aws:s3:::my-terraform-state/*"
        ]
      },
      {
        # DynamoDB access for state locking
        Sid    = "AllowLocking"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:us-east-1:123456789012:table/terraform-locks"
      }
    ]
  })
}
```

### Environment-Specific Access

Restrict access based on state file paths to limit who can modify production:

```hcl
# Production state - limited to senior engineers and CI/CD
resource "aws_iam_policy" "terraform_state_production" {
  name = "terraform-state-production"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowProductionStateAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          # Only the production state path
          "arn:aws:s3:::my-terraform-state/production/*"
        ]
      },
      {
        # Explicitly deny access to dev and staging paths
        Sid    = "DenyNonProductionAccess"
        Effect = "Deny"
        Action = [
          "s3:PutObject"
        ]
        Resource = [
          "arn:aws:s3:::my-terraform-state/dev/*",
          "arn:aws:s3:::my-terraform-state/staging/*"
        ]
      }
    ]
  })
}

# Dev state - accessible to all developers
resource "aws_iam_policy" "terraform_state_dev" {
  name = "terraform-state-dev"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowDevStateAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::my-terraform-state/dev/*"
        ]
      }
    ]
  })
}
```

### S3 Bucket Policy

Add a bucket policy as a secondary layer of defense:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnforceTLSOnly",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::my-terraform-state",
        "arn:aws:s3:::my-terraform-state/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    },
    {
      "Sid": "RestrictToTerraformRole",
      "Effect": "Deny",
      "NotPrincipal": {
        "AWS": [
          "arn:aws:iam::123456789012:role/terraform-ci",
          "arn:aws:iam::123456789012:role/terraform-admin",
          "arn:aws:iam::123456789012:root"
        ]
      },
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::my-terraform-state",
        "arn:aws:s3:::my-terraform-state/*"
      ]
    }
  ]
}
```

## GCS Backend Access Controls

### IAM Bindings for GCS

```hcl
# Read-only access for planners
resource "google_storage_bucket_iam_member" "state_viewer" {
  bucket = google_storage_bucket.terraform_state.name
  role   = "roles/storage.objectViewer"
  member = "group:terraform-readers@example.com"
}

# Read-write access for appliers
resource "google_storage_bucket_iam_member" "state_admin" {
  bucket = google_storage_bucket.terraform_state.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:terraform-ci@my-project.iam.gserviceaccount.com"
}
```

### Custom IAM Role for Fine-Grained Control

```hcl
# Custom role that allows state operations but not bucket deletion
resource "google_project_iam_custom_role" "terraform_state_operator" {
  role_id     = "terraformStateOperator"
  title       = "Terraform State Operator"
  description = "Read and write Terraform state objects"

  permissions = [
    "storage.objects.get",
    "storage.objects.create",
    "storage.objects.update",
    "storage.objects.delete",
    "storage.objects.list",
    # No bucket-level permissions
  ]
}

resource "google_storage_bucket_iam_member" "state_operator" {
  bucket = google_storage_bucket.terraform_state.name
  role   = google_project_iam_custom_role.terraform_state_operator.id
  member = "group:terraform-operators@example.com"
}
```

## Azure Backend Access Controls

### RBAC for Azure Storage

```hcl
# Assign Storage Blob Data Contributor for read-write access
resource "azurerm_role_assignment" "terraform_state_writer" {
  scope                = azurerm_storage_account.terraform_state.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.terraform_ci.principal_id
}

# Assign Storage Blob Data Reader for read-only access
resource "azurerm_role_assignment" "terraform_state_reader" {
  scope                = azurerm_storage_account.terraform_state.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = data.azuread_group.terraform_readers.object_id
}
```

### Private Endpoint for Network-Level Control

```hcl
# Restrict state access to a specific VNet
resource "azurerm_storage_account_network_rules" "terraform_state" {
  storage_account_id = azurerm_storage_account.terraform_state.id
  default_action     = "Deny"

  # Allow access from specific subnets
  virtual_network_subnet_ids = [
    azurerm_subnet.ci_cd.id,
    azurerm_subnet.vpn.id
  ]

  # Allow access from specific IPs (office, VPN endpoints)
  ip_rules = [
    "203.0.113.10",  # Office IP
    "198.51.100.20"  # VPN endpoint
  ]
}
```

## Terraform Cloud Access Controls

Terraform Cloud provides built-in access controls through its team and workspace permissions:

```hcl
# Create teams with different access levels
resource "tfe_team" "developers" {
  name         = "developers"
  organization = "my-org"
}

resource "tfe_team" "platform" {
  name         = "platform"
  organization = "my-org"
}

# Grant read access to developers
resource "tfe_team_access" "dev_read" {
  access       = "read"
  team_id      = tfe_team.developers.id
  workspace_id = tfe_workspace.production.id
}

# Grant write access to platform team
resource "tfe_team_access" "platform_write" {
  access       = "write"
  team_id      = tfe_team.platform.id
  workspace_id = tfe_workspace.production.id
}

# Custom permissions for more granular control
resource "tfe_team_access" "staging_custom" {
  team_id      = tfe_team.developers.id
  workspace_id = tfe_workspace.staging.id

  permissions {
    runs              = "apply"
    variables         = "write"
    state_versions    = "read-outputs"  # Can read outputs but not full state
    sentinel_mocks    = "read"
    workspace_locking = false
  }
}
```

The `state_versions = "read-outputs"` permission is particularly useful. It lets users access output values without seeing the full state, which can contain sensitive data.

## Implementing Least Privilege

The principle of least privilege is especially important for state access. Here's a framework:

```text
Developer workstation:
  - Read access to dev/staging state
  - No access to production state
  - Read-write to their own workspace state

CI/CD plan job:
  - Read access to all relevant states
  - No write access

CI/CD apply job:
  - Read-write access to the specific environment being deployed
  - Requires manual approval for production

Platform/SRE team:
  - Read-write access to all states
  - Break-glass procedure for emergency state modifications
```

### Break-Glass Access

For emergency situations, set up a break-glass procedure rather than giving permanent broad access:

```hcl
# AWS SSM parameter to track break-glass events
resource "aws_ssm_parameter" "break_glass_log" {
  name  = "/terraform/break-glass-log"
  type  = "String"
  value = "initialized"
}

# Role that can be assumed in emergencies with full state access
resource "aws_iam_role" "terraform_emergency" {
  name = "terraform-emergency-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:role/platform-lead"
        }
        Action = "sts:AssumeRole"
        Condition = {
          # Require MFA for emergency access
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
        }
      }
    ]
  })

  # Short session duration for emergency access
  max_session_duration = 3600  # 1 hour
}
```

## Auditing State Access

Access controls are only useful if you can verify they're working. Enable logging:

```hcl
# Enable S3 access logging for the state bucket
resource "aws_s3_bucket_logging" "terraform_state" {
  bucket        = aws_s3_bucket.terraform_state.id
  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "terraform-state-access/"
}

# CloudTrail for API-level logging
resource "aws_cloudtrail" "terraform_state" {
  name           = "terraform-state-audit"
  s3_bucket_name = aws_s3_bucket.audit_logs.id

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::my-terraform-state/"]
    }
  }
}
```

## Wrapping Up

State access control is a layered defense. Use IAM policies for identity-based access, bucket/storage policies for resource-level enforcement, network controls for perimeter defense, and encryption for data protection. Implement least privilege access, set up audit logging, and establish emergency procedures for when normal access patterns aren't sufficient.

The goal is that only the right people and automation can read your state, and only the right people and automation can modify it. Production state should be especially locked down.

For more on securing Terraform state, check out our guides on [encrypting state at rest](https://oneuptime.com/blog/post/2026-02-23-encrypt-terraform-state-at-rest/view) and [auditing state changes](https://oneuptime.com/blog/post/2026-02-23-audit-terraform-state-changes/view).
