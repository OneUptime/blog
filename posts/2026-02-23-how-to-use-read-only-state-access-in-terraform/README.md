# How to Use Read-Only State Access in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Remote State, Data Source, Infrastructure as Code, Security

Description: Learn how to configure read-only access to Terraform state files for cross-project references, auditing, and security-conscious workflows using data sources and IAM policies.

---

Not every team or service that needs to read Terraform state should have write access to it. Giving read-only state access lets consumers pull outputs from shared infrastructure without risking accidental modifications. This is especially important in organizations where separate teams manage networking, databases, and application infrastructure independently.

This guide covers how to set up read-only access using the `terraform_remote_state` data source, IAM policies, and backend-specific configurations.

## Why Read-Only Access Matters

Consider a typical organization where one team manages the VPC and networking, another manages databases, and a third manages application workloads. The application team needs the VPC ID and subnet IDs from the networking team's state. But they should never be able to modify or delete the networking state.

Without read-only access:
- An accidental `terraform state rm` could remove networking resources from state.
- A misconfigured backend migration could overwrite the networking state.
- State file corruption from one team could cascade to others.

Read-only access eliminates these risks by enforcing access boundaries at the backend level.

## Using terraform_remote_state Data Source

The `terraform_remote_state` data source reads outputs from another Terraform configuration's state file. By its nature, this is a read-only operation - it only reads, never writes.

```hcl
# data.tf - Read outputs from the networking team's state
data "terraform_remote_state" "networking" {
  backend = "s3"

  config = {
    bucket = "networking-team-state"
    key    = "prod/vpc/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use the outputs in your resources
resource "aws_instance" "app" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.medium"

  # Reference VPC outputs from the networking state
  subnet_id              = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
  vpc_security_group_ids = [data.terraform_remote_state.networking.outputs.app_security_group_id]

  tags = {
    Name = "app-server"
  }
}
```

The networking team needs to explicitly expose these values as outputs:

```hcl
# outputs.tf - In the networking team's configuration
output "private_subnet_ids" {
  description = "Private subnet IDs for application workloads"
  value       = aws_subnet.private[*].id
}

output "app_security_group_id" {
  description = "Security group ID for application servers"
  value       = aws_security_group.app.id
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}
```

## Enforcing Read-Only Access with IAM

To prevent consumers from accidentally writing to the state, configure IAM policies that only allow read access to the state bucket.

```hcl
# iam.tf - Read-only policy for state consumers
resource "aws_iam_policy" "terraform_state_reader" {
  name        = "terraform-state-reader"
  description = "Read-only access to networking team Terraform state"

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
          "arn:aws:s3:::networking-team-state",
          "arn:aws:s3:::networking-team-state/prod/vpc/terraform.tfstate"
        ]
      }
    ]
    # Note: No s3:PutObject or s3:DeleteObject permissions
  })
}

# Attach to the application team's role
resource "aws_iam_role_policy_attachment" "app_team_state_reader" {
  role       = aws_iam_role.app_team.name
  policy_arn = aws_iam_policy.terraform_state_reader.arn
}
```

For GCS backends:

```hcl
# iam.tf - GCS read-only access
resource "google_storage_bucket_iam_member" "state_reader" {
  bucket = "networking-team-state"
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:app-team@project.iam.gserviceaccount.com"
}
```

For Azure Blob Storage:

```hcl
# iam.tf - Azure read-only access
resource "azurerm_role_assignment" "state_reader" {
  scope                = azurerm_storage_account.terraform_state.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azuread_group.app_team.object_id
}
```

## Read-Only Access in Terraform Cloud

Terraform Cloud has built-in support for read-only state sharing between workspaces:

```hcl
# In the networking workspace settings, configure "Remote state sharing"
# to allow specific workspaces to read its state

# In the app workspace, reference it like this:
data "terraform_remote_state" "networking" {
  backend = "remote"

  config = {
    organization = "my-org"
    workspaces = {
      name = "networking-prod"
    }
  }
}
```

In the Terraform Cloud UI, go to the networking workspace settings, then "General", and under "Remote state sharing", select which workspaces can access this state. This provides a clean, centrally managed access model.

## Using Outputs Instead of Full State Access

A best practice is to only expose specific values through outputs rather than granting access to the entire state file. State files can contain sensitive information like database passwords, API keys, and private IPs.

```hcl
# outputs.tf - Only expose what consumers need
output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

# Mark sensitive outputs appropriately
output "database_endpoint" {
  description = "RDS endpoint for application connections"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}
```

When an output is marked as `sensitive`, consumers using `terraform_remote_state` can still access it, but it will not be displayed in plan output. For true secrets, consider using a secrets manager instead of Terraform outputs.

## Building a State Access Layer

For larger organizations, consider creating a dedicated module that acts as an access layer for state consumption:

```hcl
# modules/state-reader/variables.tf
variable "environment" {
  description = "Environment to read state from"
  type        = string
}

variable "component" {
  description = "Infrastructure component (networking, database, etc.)"
  type        = string
}

variable "state_bucket" {
  description = "S3 bucket containing state files"
  type        = string
  default     = "org-terraform-state"
}
```

```hcl
# modules/state-reader/main.tf
data "terraform_remote_state" "component" {
  backend = "s3"

  config = {
    bucket = var.state_bucket
    key    = "${var.environment}/${var.component}/terraform.tfstate"
    region = "us-east-1"
  }
}
```

```hcl
# modules/state-reader/outputs.tf
output "outputs" {
  description = "All outputs from the referenced state"
  value       = data.terraform_remote_state.component.outputs
}
```

Consumers use it like this:

```hcl
# main.tf - Using the state reader module
module "networking" {
  source      = "./modules/state-reader"
  environment = "prod"
  component   = "networking"
}

module "database" {
  source      = "./modules/state-reader"
  environment = "prod"
  component   = "database"
}

resource "aws_instance" "app" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.medium"
  subnet_id     = module.networking.outputs.private_subnet_ids[0]

  tags = {
    db_host = module.database.outputs.endpoint
  }
}
```

## Auditing State Access

Track who reads your state files by enabling access logging on the backend:

```hcl
# logging.tf - Enable S3 access logging for state bucket
resource "aws_s3_bucket_logging" "state_access_logs" {
  bucket = aws_s3_bucket.terraform_state.id

  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "state-access-logs/"
}

# Enable CloudTrail for API-level logging
resource "aws_cloudtrail" "state_access" {
  name                          = "terraform-state-access"
  s3_bucket_name               = aws_s3_bucket.cloudtrail_logs.id
  include_global_service_events = false

  event_selector {
    read_write_type           = "ReadOnly"
    include_management_events = false

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::networking-team-state/"]
    }
  }
}
```

## Best Practices

1. **Use `terraform_remote_state` for cross-project references.** It is inherently read-only at the Terraform level.
2. **Enforce read-only at the IAM level.** Do not rely solely on Terraform's behavior - add backend-level permissions.
3. **Only expose what consumers need** through explicit outputs. Never grant access to the full state.
4. **Mark sensitive outputs.** Use the `sensitive` flag on outputs that contain credentials or private information.
5. **Audit state access** with logging to track who is reading your state and when.
6. **Use Terraform Cloud's workspace sharing** if available - it provides the cleanest access model.

Read-only state access is a foundational pattern for multi-team Terraform setups. It lets teams share infrastructure information safely without risking the integrity of each other's state files.
