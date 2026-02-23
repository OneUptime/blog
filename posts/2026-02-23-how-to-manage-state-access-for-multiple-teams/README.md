# How to Manage State Access for Multiple Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Team Access, IAM, Infrastructure as Code, DevOps, Security

Description: Learn how to configure fine-grained Terraform state access for multiple teams using IAM policies, backend permissions, and organizational patterns for safe multi-team infrastructure management.

---

When multiple teams use Terraform in the same organization, state access becomes a security and operational concern. The networking team should not accidentally modify the application team's state. Junior developers should not have write access to production state. And external contractors should not see state files containing database passwords.

This guide covers how to organize state files for multi-team access, configure backend permissions, and implement access patterns that keep teams productive while protecting critical infrastructure.

## State Organization for Multiple Teams

The first step is organizing state files so access can be controlled independently per team:

```
s3://org-terraform-state/
  platform-team/
    networking/
      dev/terraform.tfstate
      staging/terraform.tfstate
      prod/terraform.tfstate
    dns/
      terraform.tfstate
  database-team/
    rds/
      dev/terraform.tfstate
      staging/terraform.tfstate
      prod/terraform.tfstate
    elasticache/
      dev/terraform.tfstate
      prod/terraform.tfstate
  app-team/
    services/
      dev/terraform.tfstate
      staging/terraform.tfstate
      prod/terraform.tfstate
```

This structure lets you set IAM policies at the S3 prefix level, giving each team access only to their slice of the state bucket.

## AWS IAM Policies for State Access

### Full Access for Team Owners

```hcl
# iam-platform-team.tf - Full access for the platform team
resource "aws_iam_policy" "platform_team_state" {
  name        = "terraform-state-platform-team"
  description = "Full state access for the platform team"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowStateAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::org-terraform-state",
          "arn:aws:s3:::org-terraform-state/platform-team/*"
        ]
      },
      {
        Sid    = "AllowLocking"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/terraform-locks"
        Condition = {
          "ForAllValues:StringLike" = {
            "dynamodb:LeadingKeys" = [
              "org-terraform-state/platform-team/*"
            ]
          }
        }
      }
    ]
  })
}
```

### Read-Only Access for Consumers

The app team needs to read networking outputs but should not modify networking state:

```hcl
# iam-app-team.tf - Read-only access to platform state
resource "aws_iam_policy" "app_team_read_platform" {
  name        = "terraform-state-app-team-read-platform"
  description = "Read-only access to platform team state for the app team"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadPlatformState"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::org-terraform-state",
          "arn:aws:s3:::org-terraform-state/platform-team/networking/*"
        ]
        # No PutObject or DeleteObject - read only
      },
      {
        Sid    = "FullAccessOwnState"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::org-terraform-state",
          "arn:aws:s3:::org-terraform-state/app-team/*"
        ]
      }
    ]
  })
}
```

### Production Write Restrictions

Require additional conditions for production state access:

```hcl
# iam-prod-restrictions.tf
resource "aws_iam_policy" "prod_state_write" {
  name        = "terraform-state-prod-write"
  description = "Production state write access with MFA requirement"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowProdStateWrite"
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::org-terraform-state/*/prod/*"
        Condition = {
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
          StringEquals = {
            "aws:PrincipalTag/team-role" = "lead"
          }
        }
      }
    ]
  })
}
```

## GCP IAM for Multi-Team State

On Google Cloud, use IAM conditions with bucket prefixes:

```hcl
# gcp-iam.tf - Team-specific access on GCS
resource "google_storage_bucket_iam_member" "platform_team_admin" {
  bucket = "org-terraform-state"
  role   = "roles/storage.objectAdmin"
  member = "group:platform-team@company.com"

  condition {
    title      = "Platform team prefix only"
    expression = "resource.name.startsWith('projects/_/buckets/org-terraform-state/objects/platform-team/')"
  }
}

resource "google_storage_bucket_iam_member" "app_team_viewer" {
  bucket = "org-terraform-state"
  role   = "roles/storage.objectViewer"
  member = "group:app-team@company.com"

  condition {
    title      = "Read platform networking state"
    expression = "resource.name.startsWith('projects/_/buckets/org-terraform-state/objects/platform-team/networking/')"
  }
}
```

## Azure RBAC for State Access

```hcl
# azure-rbac.tf - Role assignments per team
resource "azurerm_role_assignment" "platform_team_state" {
  scope                = "${azurerm_storage_account.state.id}/blobServices/default/containers/tfstate"
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azuread_group.platform_team.object_id
}

resource "azurerm_role_assignment" "app_team_state_reader" {
  scope                = "${azurerm_storage_account.state.id}/blobServices/default/containers/tfstate"
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azuread_group.app_team.object_id
}
```

## Terraform Cloud Workspace Permissions

Terraform Cloud has built-in team management with workspace-level permissions:

```hcl
# tfc-teams.tf - Team and workspace permissions
resource "tfe_team" "platform" {
  name         = "platform-team"
  organization = "my-org"
}

resource "tfe_team" "app" {
  name         = "app-team"
  organization = "my-org"
}

# Platform team has admin access to networking workspaces
resource "tfe_team_access" "platform_networking" {
  access       = "admin"
  team_id      = tfe_team.platform.id
  workspace_id = tfe_workspace.networking_prod.id
}

# App team has read access to networking workspaces
resource "tfe_team_access" "app_read_networking" {
  access       = "read"
  team_id      = tfe_team.app.id
  workspace_id = tfe_workspace.networking_prod.id
}

# App team has write access to their own workspaces
resource "tfe_team_access" "app_services" {
  access       = "write"
  team_id      = tfe_team.app.id
  workspace_id = tfe_workspace.app_services_prod.id
}

# Configure remote state sharing
resource "tfe_workspace_settings" "networking_prod" {
  workspace_id   = tfe_workspace.networking_prod.id
  # Allow specific workspaces to read this state
  global_remote_state = false
}
```

## Shared Output Layer

Instead of giving teams direct access to each other's state, create a shared output layer:

```hcl
# modules/shared-outputs/main.tf
# The platform team runs this to publish outputs for other teams

data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "org-terraform-state"
    key    = "platform-team/networking/prod/terraform.tfstate"
    region = "us-east-1"
  }
}

# Publish only the outputs other teams need
resource "aws_ssm_parameter" "vpc_id" {
  name  = "/shared/networking/vpc-id"
  type  = "String"
  value = data.terraform_remote_state.networking.outputs.vpc_id
}

resource "aws_ssm_parameter" "private_subnets" {
  name  = "/shared/networking/private-subnet-ids"
  type  = "StringList"
  value = join(",", data.terraform_remote_state.networking.outputs.private_subnet_ids)
}

resource "aws_ssm_parameter" "database_endpoint" {
  name  = "/shared/database/endpoint"
  type  = "SecureString"
  value = data.terraform_remote_state.database.outputs.endpoint
}
```

Other teams consume outputs from SSM instead of reading state directly:

```hcl
# In the app team's configuration
data "aws_ssm_parameter" "vpc_id" {
  name = "/shared/networking/vpc-id"
}

data "aws_ssm_parameter" "private_subnets" {
  name = "/shared/networking/private-subnet-ids"
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = split(",", data.aws_ssm_parameter.private_subnets.value)[0]

  vpc_security_group_ids = [aws_security_group.app.id]
}
```

This approach has several advantages:
- Teams do not need any access to each other's state files.
- Sensitive values can use SecureString with separate KMS keys.
- The output layer acts as a stable API between teams.

## Auditing State Access

Track who accesses state files and when:

```hcl
# audit.tf - CloudTrail for state access auditing
resource "aws_cloudtrail" "state_audit" {
  name                          = "terraform-state-audit"
  s3_bucket_name               = aws_s3_bucket.audit_logs.id
  include_global_service_events = false

  event_selector {
    read_write_type           = "All"
    include_management_events = false

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::org-terraform-state/"]
    }
  }
}

# Alert on production state access outside of CI/CD
resource "aws_cloudwatch_metric_alarm" "unauthorized_prod_access" {
  alarm_name          = "terraform-unauthorized-prod-access"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UnauthorizedProdStateAccess"
  namespace           = "Custom/Terraform"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
}
```

## Access Review Process

Implement a regular access review:

```bash
#!/bin/bash
# access-review.sh - Generate a report of state access permissions

echo "=== Terraform State Access Review ==="
echo "Date: $(date)"

# List all IAM policies related to state access
echo ""
echo "IAM Policies:"
aws iam list-policies --query "Policies[?contains(PolicyName, 'terraform-state')].[PolicyName,Arn]" --output table

# For each policy, show who has it attached
for policy_arn in $(aws iam list-policies --query "Policies[?contains(PolicyName, 'terraform-state')].Arn" --output text); do
  echo ""
  echo "Policy: $policy_arn"

  echo "  Attached to roles:"
  aws iam list-entities-for-policy --policy-arn "$policy_arn" --query "PolicyRoles[].RoleName" --output text

  echo "  Attached to groups:"
  aws iam list-entities-for-policy --policy-arn "$policy_arn" --query "PolicyGroups[].GroupName" --output text
done
```

## Best Practices

1. **Organize state by team and environment** to enable fine-grained access control.
2. **Use read-only access** for cross-team state consumption. Never give write access to another team's state.
3. **Require MFA for production state writes** to prevent accidental modifications.
4. **Use a shared output layer** (SSM, Consul, or similar) instead of direct state access between teams.
5. **Audit state access** with CloudTrail or equivalent to detect unauthorized access.
6. **Review permissions regularly.** Team members change roles, contractors leave, and access should be revoked promptly.
7. **Use Terraform Cloud or HCP Terraform** if available - it provides built-in team management that is easier to maintain than raw IAM policies.
8. **Separate CI/CD credentials per team** so one team's pipeline cannot access another team's state.

Multi-team state access is fundamentally about applying the principle of least privilege to your infrastructure-as-code workflow. Give each team what they need and nothing more.
