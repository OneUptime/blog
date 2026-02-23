# How to Set Up Terraform Access Controls for Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Access Control, Security, Team Collaboration, IAM

Description: Implement granular Terraform access controls that give teams the permissions they need while preventing unauthorized changes to critical infrastructure.

---

Access control for Terraform is about more than just who can run `terraform apply`. It spans repository access, state file permissions, cloud provider credentials, and the ability to modify specific resources. Getting it right means teams can work independently without accidentally modifying each other's infrastructure. Getting it wrong means either everyone has admin access (risky) or people cannot do their jobs (frustrating).

This guide covers how to implement layered access controls for Terraform across your organization.

## The Layers of Terraform Access Control

Terraform access control operates at four layers, each providing a different type of protection:

```
Layer 1: Repository Access
  Who can view and modify Terraform code

Layer 2: State Backend Access
  Who can read and write Terraform state files

Layer 3: Cloud Provider Credentials
  What permissions the Terraform execution has in the cloud

Layer 4: CI/CD Pipeline Access
  Who can trigger terraform plan and apply operations
```

Each layer needs its own access control strategy.

## Layer 1: Repository Access

Control who can modify Terraform code through Git repository permissions:

```markdown
# Repository Access Matrix

| Role | View Code | Create Branch | Create PR | Merge to Main |
|------|-----------|--------------|-----------|---------------|
| All Engineers | Yes | Yes | Yes | No |
| Team Lead | Yes | Yes | Yes | Yes (with reviews) |
| Platform Lead | Yes | Yes | Yes | Yes |
| Security Team | Yes | Yes | Yes | Yes (security modules) |
| Read-Only Auditor | Yes | No | No | No |
```

Implement this using GitHub teams and CODEOWNERS:

```
# .github/CODEOWNERS
# Restrict who can approve merges for different areas

# Production environments need platform lead approval
/environments/production/  @org/platform-leads

# Security modules need security team approval
/modules/security/  @org/security-team
/modules/iam/      @org/security-team

# Each team can approve their own module changes
/modules/compute/    @org/compute-team
/modules/database/   @org/database-team
/modules/networking/ @org/networking-team
```

## Layer 2: State Backend Access

State files contain sensitive information including resource IDs, connection strings, and sometimes secrets. Control access carefully:

```hcl
# S3 bucket policy for state access control
resource "aws_s3_bucket_policy" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Platform team: full access to all state files
        Sid    = "PlatformTeamFullAccess"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::123456789012:role/platform-team-role"
          ]
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::company-terraform-state/*"
      },
      {
        # Networking team: access only to networking state
        Sid    = "NetworkingTeamScopedAccess"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::123456789012:role/networking-team-role"
          ]
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::company-terraform-state/networking/*"
      },
      {
        # Networking team: read-only access to shared outputs
        Sid    = "NetworkingTeamReadShared"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::123456789012:role/networking-team-role"
          ]
        }
        Action = ["s3:GetObject"]
        Resource = "arn:aws:s3:::company-terraform-state/shared/*"
      },
      {
        # CI/CD pipeline: access to all state for plan/apply
        Sid    = "CICDPipelineAccess"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::123456789012:role/github-actions-terraform"
          ]
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::company-terraform-state/*"
      }
    ]
  })
}

# DynamoDB table for state locking with scoped access
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

## Layer 3: Cloud Provider Credentials

This is the most critical layer. Terraform needs cloud credentials to create and modify resources, and those credentials should follow the principle of least privilege:

### Per-Team IAM Roles

```hcl
# IAM role for the networking team's Terraform operations
resource "aws_iam_role" "networking_terraform" {
  name = "networking-team-terraform"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:role/github-actions"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:RequestTag/Team": "networking"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "networking_terraform" {
  name = "networking-terraform-permissions"
  role = aws_iam_role.networking_terraform.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Networking team can manage VPCs, subnets, and related resources
        Effect = "Allow"
        Action = [
          "ec2:CreateVpc",
          "ec2:DeleteVpc",
          "ec2:ModifyVpcAttribute",
          "ec2:DescribeVpcs",
          "ec2:CreateSubnet",
          "ec2:DeleteSubnet",
          "ec2:ModifySubnetAttribute",
          "ec2:DescribeSubnets",
          "ec2:CreateRouteTable",
          "ec2:DeleteRouteTable",
          "ec2:CreateRoute",
          "ec2:DeleteRoute",
          "ec2:DescribeRouteTables",
          "ec2:CreateNatGateway",
          "ec2:DeleteNatGateway",
          "ec2:DescribeNatGateways",
          "ec2:CreateInternetGateway",
          "ec2:DeleteInternetGateway",
          "ec2:AttachInternetGateway",
          "ec2:DetachInternetGateway",
          "ec2:DescribeInternetGateways",
          "ec2:AllocateAddress",
          "ec2:ReleaseAddress",
          "ec2:DescribeAddresses"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion": ["us-east-1", "us-west-2"]
          }
        }
      },
      {
        # Networking team cannot manage IAM, databases, or compute
        Effect = "Deny"
        Action = [
          "iam:*",
          "rds:*",
          "ecs:*",
          "ec2:RunInstances",
          "ec2:TerminateInstances"
        ]
        Resource = "*"
      }
    ]
  })
}
```

### Separate Read and Write Roles

Create separate roles for planning (read-only) and applying (read-write):

```hcl
# Read-only role for terraform plan
resource "aws_iam_role" "terraform_planner" {
  name = "terraform-planner"

  # Can be assumed by any team member
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:root"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "planner_readonly" {
  role       = aws_iam_role.terraform_planner.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# Write role for terraform apply - more restricted access
resource "aws_iam_role" "terraform_applier" {
  name = "terraform-applier"

  # Can only be assumed by the CI/CD pipeline
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:role/github-actions"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}
```

## Layer 4: CI/CD Pipeline Access

Control who can trigger plan and apply through the CI/CD system:

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  pull_request:  # Plan runs on PRs
  push:
    branches: [main]  # Apply runs on merge

jobs:
  plan:
    # Anyone can trigger a plan via PR
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # For OIDC
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      # Use read-only role for plan
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-planner
          aws-region: us-east-1

      - uses: hashicorp/setup-terraform@v3
      - run: terraform init && terraform plan -no-color

  apply:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    # Apply requires environment approval
    environment: production
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      # Use write role for apply
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-applier
          aws-region: us-east-1

      - uses: hashicorp/setup-terraform@v3
      - run: terraform init && terraform apply -auto-approve
```

## Terraform Cloud/Enterprise Access Controls

If you use Terraform Cloud, leverage its built-in access controls:

```hcl
# Terraform Cloud workspace permissions
resource "tfe_team_access" "networking_dev" {
  team_id      = tfe_team.networking.id
  workspace_id = tfe_workspace.networking_dev.id
  access       = "write"  # Can plan and apply
}

resource "tfe_team_access" "networking_prod" {
  team_id      = tfe_team.networking.id
  workspace_id = tfe_workspace.networking_prod.id
  access       = "plan"  # Can plan but not apply
}

resource "tfe_team_access" "platform_prod" {
  team_id      = tfe_team.platform_leads.id
  workspace_id = tfe_workspace.networking_prod.id
  access       = "admin"  # Full access including apply
}
```

## Auditing Access

Monitor and audit Terraform access regularly:

```bash
#!/bin/bash
# scripts/audit-terraform-access.sh
# Generate a report of who has access to what

echo "=== Terraform Access Audit Report ==="
echo "Generated: $(date -u)"
echo ""

echo "## State Backend Access"
aws s3api get-bucket-policy --bucket company-terraform-state | \
  jq '.Policy | fromjson | .Statement[] | {Sid, Principal, Action}'

echo ""
echo "## IAM Roles for Terraform"
for role in $(aws iam list-roles --query 'Roles[?contains(RoleName, `terraform`)].RoleName' --output text); do
  echo "### $role"
  aws iam list-attached-role-policies --role-name "$role" --query 'AttachedPolicies[].PolicyName'
  aws iam list-role-policies --role-name "$role" --query 'PolicyNames'
done
```

For more on managing secrets within your Terraform workflows, see our guide on [handling Terraform secrets across teams](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-secrets-across-teams/view).

Use OneUptime to monitor access patterns and alert on anomalies. Unexpected Terraform operations outside of business hours or from unusual IP addresses may indicate compromised credentials.

Access control for Terraform is not a set-and-forget task. Review permissions quarterly, audit access logs monthly, and update controls as your team structure evolves. The goal is to give every team exactly the access they need and nothing more.
