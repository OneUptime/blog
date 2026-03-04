# How to Access Outputs from Other Terraform Configurations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Outputs, Remote State, Cross-Configuration, Infrastructure as Code

Description: Learn how to share data between separate Terraform configurations using remote state data sources, including setup, access patterns, and security considerations.

---

In real-world infrastructure, your Terraform code is rarely a single monolithic configuration. You split it into separate configurations - one for networking, one for databases, one for applications. But these configurations need to share data. The networking configuration creates a VPC, and the application configuration needs that VPC ID. Terraform solves this with the `terraform_remote_state` data source, which lets one configuration read the outputs of another.

This post covers how to set up cross-configuration data sharing, the alternatives, and the security implications you need to consider.

## The terraform_remote_state Data Source

The `terraform_remote_state` data source reads the state file of another Terraform configuration and makes its outputs available:

```hcl
# application/main.tf

# Read outputs from the networking configuration
data "terraform_remote_state" "network" {
  backend = "s3"

  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use the outputs
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  # Access the VPC's subnet from the network config
  subnet_id = data.terraform_remote_state.network.outputs.public_subnet_ids[0]

  vpc_security_group_ids = [
    data.terraform_remote_state.network.outputs.app_security_group_id
  ]

  tags = {
    Name = "app-server"
  }
}
```

The key requirement: the source configuration must define those values as `output` blocks. Regular resources, locals, and variables are not accessible through remote state - only outputs.

## Setting Up the Source Configuration

The configuration that produces the outputs needs a remote backend and properly defined outputs:

```hcl
# networking/backend.tf

terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "networking/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

```hcl
# networking/outputs.tf

output "vpc_id" {
  description = "VPC ID for use by other configurations"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "app_security_group_id" {
  description = "Security group ID for application instances"
  value       = aws_security_group.app.id
}

output "database_subnet_group_name" {
  description = "DB subnet group name for RDS instances"
  value       = aws_db_subnet_group.main.name
}
```

## Reading from Different Backends

### S3 Backend

```hcl
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}
```

### Azure Blob Storage

```hcl
data "terraform_remote_state" "network" {
  backend = "azurerm"
  config = {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "networking.tfstate"
  }
}
```

### Google Cloud Storage

```hcl
data "terraform_remote_state" "network" {
  backend = "gcs"
  config = {
    bucket = "my-terraform-state"
    prefix = "networking"
  }
}
```

### Terraform Cloud

```hcl
data "terraform_remote_state" "network" {
  backend = "remote"
  config = {
    organization = "my-org"
    workspaces = {
      name = "networking-production"
    }
  }
}
```

### Local State (for development only)

```hcl
data "terraform_remote_state" "network" {
  backend = "local"
  config = {
    path = "../networking/terraform.tfstate"
  }
}
```

## Practical Multi-Configuration Architecture

Here is a typical setup with three separate configurations that share data:

### 1. Networking Configuration

```hcl
# networking/main.tf

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = { Name = "production-vpc" }
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = var.azs[count.index]
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index + 10)
  availability_zone = var.azs[count.index]
}

# ... route tables, NAT gateways, etc.
```

```hcl
# networking/outputs.tf

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
```

### 2. Database Configuration

```hcl
# database/main.tf

# Read networking outputs
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "myapp-db"
  subnet_ids = data.terraform_remote_state.network.outputs.private_subnet_ids
}

resource "aws_db_instance" "main" {
  identifier           = "myapp-db"
  engine               = "postgres"
  instance_class       = "db.r6g.large"
  db_subnet_group_name = aws_db_subnet_group.main.name
  # ...
}
```

```hcl
# database/outputs.tf

output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "port" {
  value = aws_db_instance.main.port
}

output "database_name" {
  value = var.database_name
}
```

### 3. Application Configuration

```hcl
# application/main.tf

# Read from both networking and database
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

data "terraform_remote_state" "database" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "database/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_ecs_service" "app" {
  name = "myapp"
  # ...

  network_configuration {
    subnets = data.terraform_remote_state.network.outputs.private_subnet_ids
  }
}

resource "aws_ssm_parameter" "db_host" {
  name  = "/myapp/db-host"
  type  = "String"
  value = data.terraform_remote_state.database.outputs.endpoint
}
```

## Using Variables to Configure Remote State

Avoid hardcoding backend configuration. Use variables:

```hcl
variable "state_bucket" {
  description = "S3 bucket containing Terraform state files"
  type        = string
}

variable "state_region" {
  description = "AWS region of the state bucket"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = var.state_bucket
    key    = "${var.environment}/networking/terraform.tfstate"
    region = var.state_region
  }
}
```

## The Alternative: Data Sources Instead of Remote State

Instead of reading remote state, you can look up resources using provider data sources:

```hcl
# Instead of terraform_remote_state, look up the VPC by tag
data "aws_vpc" "main" {
  tags = {
    Name = "production-vpc"
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  tags = {
    Tier = "private"
  }
}

resource "aws_instance" "app" {
  subnet_id = data.aws_subnets.private.ids[0]
  # ...
}
```

### When to Use Each Approach

| Feature | terraform_remote_state | Provider Data Sources |
|---------|----------------------|----------------------|
| Coupling | Tightly coupled to source config | Loosely coupled |
| Speed | Fast (reads state file) | Slower (API calls) |
| Reliability | Depends on state backend | Depends on cloud API |
| Access control | Need state read access | Need cloud read access |
| Discovery | Must know state location | Discovers by tags/names |

## The tfe_outputs Data Source (Terraform Cloud)

If you use Terraform Cloud, the `tfe_outputs` data source is a cleaner alternative:

```hcl
data "tfe_outputs" "network" {
  organization = "my-org"
  workspace    = "networking-production"
}

resource "aws_instance" "app" {
  subnet_id = data.tfe_outputs.network.values.public_subnet_ids[0]
}
```

This only shares outputs (not the full state), which is more secure.

## Security Considerations

Reading remote state means reading the entire state file, which may contain sensitive values beyond just the outputs.

### Limit State Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::my-terraform-state/networking/*",
      "Condition": {
        "StringEquals": {
          "aws:PrincipalTag/Team": "platform"
        }
      }
    }
  ]
}
```

### Use Terraform Cloud for Better Isolation

Terraform Cloud's `tfe_outputs` data source only exposes outputs, not the full state. This is a significant security improvement.

### Do Not Output Secrets

If another configuration reads your state, they get all your outputs. Do not output secrets unless absolutely necessary:

```hcl
# Avoid outputting secrets for cross-config sharing
# Instead, store secrets in a secrets manager
# and output the secret ARN

output "database_secret_arn" {
  description = "ARN of the Secrets Manager secret with DB credentials"
  value       = aws_secretsmanager_secret.db.arn
  # Not sensitive - it's just the ARN, not the secret itself
}
```

## Handling Missing or Changed Outputs

If the source configuration has not been applied yet or if an output name changes, you will get an error. Handle this defensively:

```hcl
# Check if the remote state has the expected output
locals {
  network_outputs = data.terraform_remote_state.network.outputs

  # Use try() for optional outputs
  monitoring_sg_id = try(local.network_outputs.monitoring_security_group_id, null)
}

resource "aws_security_group_rule" "monitoring" {
  count = local.monitoring_sg_id != null ? 1 : 0

  type                     = "ingress"
  from_port                = 9090
  to_port                  = 9090
  protocol                 = "tcp"
  source_security_group_id = local.monitoring_sg_id
  security_group_id        = aws_security_group.app.id
}
```

## Wrapping Up

Accessing outputs from other Terraform configurations is how you break a monolithic infrastructure into manageable, independently deployable pieces. The `terraform_remote_state` data source is the most common approach, but provider data sources offer looser coupling, and Terraform Cloud's `tfe_outputs` provides better security isolation. Whichever approach you choose, design your outputs with cross-configuration consumers in mind - expose meaningful values, avoid exposing secrets, and add clear descriptions.

For more on Terraform outputs, see our posts on [defining output values](https://oneuptime.com/blog/post/2026-02-23-how-to-define-output-values-in-terraform/view) and [exporting outputs from modules](https://oneuptime.com/blog/post/2026-02-23-how-to-export-outputs-from-modules-in-terraform/view).
