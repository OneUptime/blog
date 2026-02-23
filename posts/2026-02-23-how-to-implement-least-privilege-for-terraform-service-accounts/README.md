# How to Implement Least Privilege for Terraform Service Accounts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, IAM, Least Privilege, Security, IaC, DevOps, AWS, Azure, GCP

Description: A practical guide to implementing least privilege for Terraform service accounts across AWS, Azure, and GCP, covering permission scoping, policy generation, boundary conditions, and audit strategies.

---

Terraform needs permissions to create, modify, and destroy cloud resources. The easiest approach is giving it admin access, but that means a compromised Terraform workflow can do anything in your cloud account. Implementing least privilege - giving Terraform only the permissions it actually needs - limits the blast radius of any security incident. This guide covers practical strategies for scoping Terraform permissions across the major cloud providers.

## Why Least Privilege Matters for Terraform

Terraform is a high-privilege workload by nature. It creates and destroys infrastructure, manages IAM policies, and handles sensitive data. If an attacker compromises your Terraform pipeline, the damage they can do is limited only by the permissions you granted. Consider these scenarios:

- A compromised CI/CD pipeline with admin permissions can exfiltrate data from every S3 bucket, create backdoor IAM users, and spin up cryptocurrency miners
- The same pipeline with scoped permissions can only affect the specific resources Terraform manages

The effort to implement least privilege pays for itself the first time you have a security incident.

## The Challenge

Determining the exact permissions Terraform needs is harder than it sounds. Terraform does not just call one API per resource - creating an EC2 instance might require permissions for EC2, VPC, IAM, KMS, and EBS. And permissions needed for `plan` differ from `apply`, which differ from `destroy`.

## Strategy 1: Start Broad, Narrow Down

Begin with broader permissions and iteratively remove them:

```hcl
# Phase 1: Start with managed policies (broad)
resource "aws_iam_role" "terraform" {
  name = "terraform-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Start broad during development
resource "aws_iam_role_policy_attachment" "initial" {
  role       = aws_iam_role.terraform.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}
```

Use CloudTrail to see which APIs Terraform actually calls:

```bash
# Query CloudTrail for all actions performed by the Terraform role
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=terraform-deploy \
  --start-time "2026-02-01T00:00:00Z" \
  --end-time "2026-02-23T00:00:00Z" \
  --query 'Events[].{Time:EventTime,Event:EventName,Source:EventSource}' \
  --output table
```

Then create a custom policy based on actual usage:

```bash
# Use IAM Access Analyzer to generate a policy from CloudTrail data
aws accessanalyzer generate-policy \
  --cloud-trail-details '{
    "trails": [
      {
        "cloudTrailArn": "arn:aws:cloudtrail:us-east-1:123456789012:trail/management-events",
        "regions": ["us-east-1"],
        "allRegions": false
      }
    ],
    "accessRole": "arn:aws:iam::123456789012:role/AccessAnalyzerRole",
    "startTime": "2026-02-01T00:00:00Z",
    "endTime": "2026-02-23T00:00:00Z"
  }'
```

## Strategy 2: Permission Boundaries

AWS IAM permission boundaries set a maximum limit on what a role can do, regardless of the policies attached:

```hcl
# Create a permission boundary
resource "aws_iam_policy" "terraform_boundary" {
  name = "terraform-permission-boundary"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow compute operations
        Effect = "Allow"
        Action = [
          "ec2:*",
          "ecs:*",
          "eks:*",
          "lambda:*",
          "elasticloadbalancing:*"
        ]
        Resource = "*"
      },
      {
        # Allow database operations
        Effect = "Allow"
        Action = [
          "rds:*",
          "dynamodb:*",
          "elasticache:*"
        ]
        Resource = "*"
      },
      {
        # Allow storage operations
        Effect = "Allow"
        Action = [
          "s3:*"
        ]
        Resource = "*"
      },
      {
        # Deny dangerous operations even if other policies allow them
        Effect = "Deny"
        Action = [
          "iam:CreateUser",
          "iam:CreateLoginProfile",
          "iam:UpdateLoginProfile",
          "iam:CreateAccessKey",
          "organizations:*",
          "account:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# Apply the boundary to the Terraform role
resource "aws_iam_role" "terraform" {
  name                 = "terraform-deploy"
  permissions_boundary = aws_iam_policy.terraform_boundary.arn

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}
```

## Strategy 3: Resource-Scoped Permissions

Instead of allowing actions on all resources, scope to specific resource ARNs:

```hcl
resource "aws_iam_policy" "terraform_scoped" {
  name = "terraform-scoped-permissions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # S3: Only allow access to specific buckets
        Effect = "Allow"
        Action = ["s3:*"]
        Resource = [
          "arn:aws:s3:::myapp-*",
          "arn:aws:s3:::myapp-*/*"
        ]
      },
      {
        # EC2: Only in specific VPC
        Effect = "Allow"
        Action = ["ec2:*"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ec2:Vpc" = "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-abc123"
          }
        }
      },
      {
        # RDS: Only specific instance classes
        Effect = "Allow"
        Action = ["rds:CreateDBInstance"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "rds:DatabaseClass" = ["db.t3.micro", "db.t3.small", "db.t3.medium"]
          }
        }
      },
      {
        # Tag-based access control
        Effect = "Allow"
        Action = ["ec2:TerminateInstances", "ec2:StopInstances"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ec2:ResourceTag/ManagedBy" = "terraform"
          }
        }
      }
    ]
  })
}
```

## Azure: Custom Roles

Azure supports custom role definitions with granular permissions:

```hcl
# Custom role for Terraform
resource "azurerm_role_definition" "terraform" {
  name        = "Terraform Deployer"
  scope       = "/subscriptions/${data.azurerm_subscription.current.subscription_id}"
  description = "Custom role for Terraform with minimal permissions"

  permissions {
    actions = [
      # Compute
      "Microsoft.Compute/virtualMachines/*",
      "Microsoft.Compute/disks/*",
      "Microsoft.Compute/availabilitySets/*",

      # Networking
      "Microsoft.Network/virtualNetworks/*",
      "Microsoft.Network/networkSecurityGroups/*",
      "Microsoft.Network/publicIPAddresses/*",
      "Microsoft.Network/loadBalancers/*",

      # Storage
      "Microsoft.Storage/storageAccounts/*",

      # Resource groups
      "Microsoft.Resources/subscriptions/resourceGroups/read",

      # Required for state management
      "Microsoft.Storage/storageAccounts/blobServices/containers/*"
    ]

    not_actions = [
      # Explicitly deny dangerous operations
      "Microsoft.Authorization/roleAssignments/write",
      "Microsoft.Authorization/roleDefinitions/write"
    ]
  }

  assignable_scopes = [
    "/subscriptions/${data.azurerm_subscription.current.subscription_id}"
  ]
}

# Assign the custom role to Terraform's service principal
resource "azurerm_role_assignment" "terraform" {
  scope              = "/subscriptions/${data.azurerm_subscription.current.subscription_id}"
  role_definition_id = azurerm_role_definition.terraform.role_definition_resource_id
  principal_id       = azuread_service_principal.terraform.object_id
}
```

## GCP: Custom Roles

Google Cloud also supports custom IAM roles:

```hcl
# Custom role with specific permissions
resource "google_project_iam_custom_role" "terraform" {
  role_id     = "terraformDeployer"
  title       = "Terraform Deployer"
  description = "Minimal permissions for Terraform infrastructure deployment"

  permissions = [
    # Compute
    "compute.instances.create",
    "compute.instances.delete",
    "compute.instances.get",
    "compute.instances.list",
    "compute.instances.setMetadata",
    "compute.instances.setTags",
    "compute.disks.create",
    "compute.disks.delete",
    "compute.disks.get",

    # Networking
    "compute.networks.create",
    "compute.networks.delete",
    "compute.networks.get",
    "compute.subnetworks.create",
    "compute.subnetworks.delete",
    "compute.subnetworks.get",
    "compute.firewalls.create",
    "compute.firewalls.delete",
    "compute.firewalls.get",

    # Storage
    "storage.buckets.create",
    "storage.buckets.delete",
    "storage.buckets.get",
    "storage.buckets.list",
    "storage.objects.create",
    "storage.objects.delete",
    "storage.objects.get",
    "storage.objects.list",

    # Cloud SQL
    "cloudsql.instances.create",
    "cloudsql.instances.delete",
    "cloudsql.instances.get",
    "cloudsql.instances.list",
    "cloudsql.instances.update"
  ]
}

# Bind the custom role to the Terraform service account
resource "google_project_iam_member" "terraform" {
  project = var.project_id
  role    = google_project_iam_custom_role.terraform.id
  member  = "serviceAccount:${google_service_account.terraform.email}"
}
```

## Splitting Roles by Environment

Use different service accounts with different permissions for different environments:

```hcl
# Development: broader permissions for experimentation
resource "aws_iam_policy" "terraform_dev" {
  name = "terraform-dev-permissions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ec2:*", "rds:*", "s3:*", "lambda:*"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = "us-east-1"
          }
        }
      }
    ]
  })
}

# Production: tightly scoped permissions
resource "aws_iam_policy" "terraform_prod" {
  name = "terraform-prod-permissions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:RunInstances",
          "ec2:TerminateInstances"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ec2:ResourceTag/Environment" = "production"
          }
        }
      }
    ]
  })
}
```

## Automated Policy Generation

Use tools to generate policies from your Terraform configuration:

```bash
# iamlive: Record AWS API calls during terraform plan/apply
# Install: go install github.com/iann0036/iamlive@latest

# Start iamlive in proxy mode
iamlive --mode proxy --bind-addr 0.0.0.0:10080 --force-wildcard-resource &

# Run Terraform through the proxy
HTTPS_PROXY=http://127.0.0.1:10080 \
HTTP_PROXY=http://127.0.0.1:10080 \
AWS_CA_BUNDLE=~/.iamlive/ca.pem \
terraform plan

# iamlive outputs the minimal IAM policy
```

## Regular Audits

Periodically review and tighten permissions:

```bash
# AWS: Find unused permissions with IAM Access Analyzer
aws accessanalyzer list-findings --analyzer-name my-analyzer

# Check for unused roles
aws iam generate-service-last-accessed-details --arn arn:aws:iam::123456789012:role/terraform-deploy

# Azure: Review role assignments
az role assignment list --assignee terraform-sp-id

# GCP: Review IAM policy bindings
gcloud projects get-iam-policy my-project --format=json
```

## Monitoring Your Infrastructure

Least privilege protects your cloud environment, but you also need to monitor the infrastructure Terraform deploys. [OneUptime](https://oneuptime.com) provides comprehensive monitoring and alerting for your services, helping you detect issues regardless of how tightly scoped your Terraform permissions are.

## Conclusion

Implementing least privilege for Terraform service accounts is an ongoing process, not a one-time task. Start with broader permissions and use audit tools to narrow them down. Use permission boundaries as a safety net, scope policies to specific resources when possible, and separate permissions by environment. The upfront investment in proper permission scoping pays dividends in reduced risk and clearer audit trails.

For more on Terraform security, see our guides on [IAM roles for authentication](https://oneuptime.com/blog/post/2026-02-23-how-to-use-iam-roles-for-terraform-authentication/view) and [OIDC for provider authentication](https://oneuptime.com/blog/post/2026-02-23-how-to-use-oidc-for-provider-authentication-in-terraform/view).
