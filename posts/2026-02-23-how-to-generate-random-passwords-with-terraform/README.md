# How to Generate Random Passwords with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Random Provider, Passwords, Security, Infrastructure as Code

Description: Learn how to generate secure random passwords with Terraform using the random_password resource, store them safely in AWS Secrets Manager, and manage password rotation.

---

Hardcoding passwords in Terraform configurations is a security risk that many teams still take. The random_password resource in Terraform generates cryptographically secure passwords that are never stored in plain text in your configuration files. Combined with a secrets manager, this approach gives you secure, automated password management for databases, API keys, and service accounts.

In this guide, we will cover everything about generating random passwords with Terraform. We will create passwords with various complexity requirements, store them securely in AWS Secrets Manager, and implement automated password rotation.

## Why Generate Passwords with Terraform

There are several reasons to generate passwords within Terraform rather than managing them externally. First, passwords are created as part of your infrastructure deployment, so they are ready when the resources that need them are created. Second, passwords are stored in Terraform state, which should already be encrypted and access-controlled. Third, you can define password policies as code, ensuring all passwords meet your organization's security requirements.

## Basic Password Generation

```hcl
# main.tf - Provider configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type = string
}
```

## Creating a Simple Random Password

The most basic usage generates a password with default settings:

```hcl
# simple-password.tf - Basic password generation
resource "random_password" "simple" {
  length  = 24    # 24 characters long
  special = true  # Include special characters
  upper   = true  # Include uppercase letters
  lower   = true  # Include lowercase letters
  numeric = true  # Include numbers
}

# The password is marked as sensitive by default
# It will not appear in plan output or logs
output "password_generated" {
  value     = true  # Just confirm it was generated
  sensitive = false
}
```

## Generating Passwords with Specific Requirements

Many services have specific password requirements. Here is how to handle them:

```hcl
# custom-passwords.tf - Passwords with specific requirements
# Database password - no special chars that might cause SQL issues
resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?" # Exclude problematic chars like @ and '
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
  min_special      = 2
}

# API key - alphanumeric only
resource "random_password" "api_key" {
  length  = 48
  special = false
  upper   = true
  lower   = true
  numeric = true
}

# Password for services that do not support special characters
resource "random_password" "no_special" {
  length  = 20
  special = false
}

# Strong password with minimum character type requirements
resource "random_password" "strong" {
  length           = 40
  special          = true
  override_special = "!@#$%^&*"
  min_upper        = 4
  min_lower        = 4
  min_numeric      = 4
  min_special      = 4
}
```

## Storing Passwords in AWS Secrets Manager

Never leave passwords only in Terraform state. Store them in a dedicated secrets manager:

```hcl
# secrets-manager.tf - Store passwords securely
resource "aws_secretsmanager_secret" "db_password" {
  name        = "${var.environment}/database/master-password"
  description = "Master password for the production database"

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id

  # Store the password as a JSON object with metadata
  secret_string = jsonencode({
    username = "admin"
    password = random_password.database.result
    engine   = "postgres"
    host     = "db.example.com"
    port     = 5432
  })
}

# Use the password when creating the RDS instance
resource "aws_db_instance" "main" {
  identifier     = "main-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"
  allocated_storage = 100

  db_name  = "appdb"
  username = "admin"
  password = random_password.database.result

  # Do not show the password in logs
  skip_final_snapshot = true

  tags = {
    Environment = var.environment
  }
}
```

## Generating Multiple Passwords for Different Services

```hcl
# multi-service-passwords.tf - Generate passwords for multiple services
variable "services_requiring_passwords" {
  description = "Services that need generated passwords"
  type = map(object({
    length       = number
    special      = bool
    min_upper    = number
    min_numeric  = number
    description  = string
  }))
  default = {
    "redis" = {
      length      = 32
      special     = false
      min_upper   = 2
      min_numeric = 2
      description = "Redis authentication password"
    }
    "rabbitmq" = {
      length      = 24
      special     = true
      min_upper   = 2
      min_numeric = 2
      description = "RabbitMQ admin password"
    }
    "elasticsearch" = {
      length      = 32
      special     = true
      min_upper   = 2
      min_numeric = 2
      description = "Elasticsearch admin password"
    }
  }
}

resource "random_password" "service" {
  for_each = var.services_requiring_passwords

  length      = each.value.length
  special     = each.value.special
  min_upper   = each.value.min_upper
  min_numeric = each.value.min_numeric
}

# Store each password in Secrets Manager
resource "aws_secretsmanager_secret" "service" {
  for_each = var.services_requiring_passwords

  name        = "${var.environment}/${each.key}/password"
  description = each.value.description
}

resource "aws_secretsmanager_secret_version" "service" {
  for_each = var.services_requiring_passwords

  secret_id     = aws_secretsmanager_secret.service[each.key].id
  secret_string = random_password.service[each.key].result
}
```

## Implementing Password Rotation with Keepers

Use the `keepers` argument to trigger password regeneration on a schedule:

```hcl
# rotation.tf - Password rotation using keepers
resource "random_password" "rotating" {
  length  = 32
  special = true

  # Regenerate the password when the rotation date changes
  keepers = {
    rotation_date = var.password_rotation_date
  }
}

variable "password_rotation_date" {
  description = "Change this value to trigger password rotation"
  type        = string
  default     = "2026-01-01"
}

# Store the rotating password with versioning
resource "aws_secretsmanager_secret" "rotating" {
  name        = "${var.environment}/rotating-secret"
  description = "Password that rotates based on keeper value"
}

resource "aws_secretsmanager_secret_version" "rotating" {
  secret_id     = aws_secretsmanager_secret.rotating.id
  secret_string = random_password.rotating.result
}
```

## Security Best Practices

When using random passwords in Terraform, follow these security practices:

```hcl
# security.tf - Secure password handling patterns

# Always encrypt your Terraform state
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "passwords/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true  # Enable state encryption
    dynamodb_table = "terraform-locks"
  }
}

# Never output passwords directly
output "database_secret_arn" {
  description = "ARN of the database password secret (retrieve value from Secrets Manager)"
  value       = aws_secretsmanager_secret.db_password.arn
}

# Use sensitive = true for any output that might expose a password
output "password_length" {
  description = "Length of generated database password"
  value       = length(random_password.database.result)
  sensitive   = true  # Extra caution
}
```

## Conclusion

Generating passwords with Terraform's random_password resource is more secure than hardcoding credentials and more convenient than managing passwords externally. The key is to combine random_password with a secrets manager like AWS Secrets Manager, never output passwords in plain text, and use keepers for controlled rotation. For other random value use cases, see our guides on [random IDs](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-random-ids-with-terraform/view) and [random UUIDs](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-random-uuids-with-terraform/view).
