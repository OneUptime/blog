# How to Use Variables and Outputs in Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, Variables, DevOps, Best Practices

Description: A comprehensive guide to Terraform variables and outputs, covering input validation, type constraints, local values, sensitive data handling, and output patterns for module composition.

---

Variables and outputs are the interface to your Terraform configurations. Variables accept input; outputs expose results. Understanding both is essential for writing reusable, maintainable infrastructure code.

## Input Variables

Variables let you parameterize configurations without changing code.

### Basic Variable Declaration

```hcl
# variables.tf

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  # No default means it's required
}

variable "instance_count" {
  description = "Number of instances to create"
  type        = number
  default     = 2
}

variable "enable_monitoring" {
  description = "Enable detailed monitoring"
  type        = bool
  default     = true
}
```

### Using Variables

```hcl
# main.tf

provider "aws" {
  region = var.aws_region
}

resource "aws_instance" "app" {
  count         = var.instance_count
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  monitoring    = var.enable_monitoring

  tags = {
    Name        = "app-${var.environment}-${count.index + 1}"
    Environment = var.environment
  }
}
```

## Variable Types

### Primitive Types

```hcl
# String
variable "name" {
  type    = string
  default = "myapp"
}

# Number
variable "port" {
  type    = number
  default = 8080
}

# Boolean
variable "enabled" {
  type    = bool
  default = true
}
```

### Collection Types

```hcl
# List - Ordered collection
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Set - Unique values, unordered
variable "allowed_ips" {
  type    = set(string)
  default = ["10.0.0.1", "10.0.0.2"]
}

# Map - Key-value pairs
variable "instance_types" {
  type = map(string)
  default = {
    dev  = "t3.micro"
    prod = "t3.large"
  }
}

# Usage
resource "aws_instance" "app" {
  instance_type = var.instance_types[var.environment]
}
```

### Structural Types

```hcl
# Object - Fixed structure
variable "database_config" {
  type = object({
    engine         = string
    engine_version = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
  })
  default = {
    engine         = "postgres"
    engine_version = "14.0"
    instance_class = "db.t3.medium"
    storage_gb     = 100
    multi_az       = false
  }
}

# Tuple - Fixed length, mixed types
variable "instance_spec" {
  type    = tuple([string, number, bool])
  default = ["t3.medium", 2, true]
}
```

### Complex Nested Types

```hcl
# List of objects
variable "subnets" {
  type = list(object({
    name              = string
    cidr              = string
    availability_zone = string
    public            = bool
  }))
  default = [
    {
      name              = "public-1"
      cidr              = "10.0.1.0/24"
      availability_zone = "us-east-1a"
      public            = true
    },
    {
      name              = "private-1"
      cidr              = "10.0.10.0/24"
      availability_zone = "us-east-1a"
      public            = false
    }
  ]
}

# Map of objects
variable "applications" {
  type = map(object({
    instance_type = string
    replicas      = number
    port          = number
  }))
  default = {
    api = {
      instance_type = "t3.medium"
      replicas      = 3
      port          = 8080
    }
    web = {
      instance_type = "t3.small"
      replicas      = 2
      port          = 80
    }
  }
}
```

## Variable Validation

Add validation rules to catch errors early:

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "instance_count" {
  type        = number
  description = "Number of instances"

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 10
    error_message = "Instance count must be between 1 and 10."
  }
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block"

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "VPC CIDR must be a valid CIDR block."
  }
}

variable "email" {
  type        = string
  description = "Contact email"

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.email))
    error_message = "Must be a valid email address."
  }
}
```

## Sensitive Variables

Mark sensitive values to hide them in output:

```hcl
variable "database_password" {
  type        = string
  description = "Database master password"
  sensitive   = true
}

variable "api_key" {
  type        = string
  description = "External API key"
  sensitive   = true
}
```

Terraform will:
- Hide values in plan/apply output
- Still store in state (encrypt your state!)
- Not prevent logging in providers

## Setting Variable Values

### 1. Default Values

```hcl
variable "region" {
  default = "us-east-1"
}
```

### 2. terraform.tfvars File

```hcl
# terraform.tfvars (auto-loaded)
environment    = "prod"
instance_count = 4
enable_monitoring = true
```

### 3. Named .tfvars Files

```bash
# Use specific files
terraform apply -var-file="prod.tfvars"
terraform apply -var-file="secrets.tfvars"
```

### 4. Command Line

```bash
terraform apply -var="environment=prod" -var="instance_count=4"
```

### 5. Environment Variables

```bash
export TF_VAR_environment="prod"
export TF_VAR_instance_count=4
terraform apply
```

### Precedence (lowest to highest)

1. Default values
2. terraform.tfvars
3. terraform.tfvars.json
4. *.auto.tfvars (alphabetical)
5. -var-file flags (in order)
6. -var flags (in order)
7. TF_VAR_ environment variables

## Local Values

Locals compute values once and reuse them:

```hcl
locals {
  # Combine variables into common values
  name_prefix = "${var.project}-${var.environment}"

  # Compute derived values
  is_production = var.environment == "prod"

  # Common tags
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Team        = var.team
  }

  # Conditional values
  instance_type = local.is_production ? "t3.large" : "t3.micro"

  # Complex transformations
  subnet_cidrs = [for i in range(var.subnet_count) : cidrsubnet(var.vpc_cidr, 4, i)]
}

# Usage
resource "aws_instance" "app" {
  instance_type = local.instance_type

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app"
  })
}
```

## Outputs

Outputs expose values from your configuration.

### Basic Outputs

```hcl
# outputs.tf

output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "instance_ids" {
  description = "IDs of all created instances"
  value       = aws_instance.app[*].id
}

output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}
```

### Sensitive Outputs

```hcl
output "database_password" {
  description = "Database password"
  value       = random_password.db.result
  sensitive   = true
}
```

### Conditional Outputs

```hcl
output "bastion_ip" {
  description = "Bastion host public IP"
  value       = var.create_bastion ? aws_instance.bastion[0].public_ip : null
}
```

### Complex Outputs

```hcl
output "instances" {
  description = "Instance details"
  value = {
    for instance in aws_instance.app :
    instance.tags["Name"] => {
      id         = instance.id
      private_ip = instance.private_ip
      public_ip  = instance.public_ip
    }
  }
}

output "subnet_details" {
  description = "Subnet configuration"
  value = [
    for subnet in aws_subnet.main : {
      id                = subnet.id
      cidr              = subnet.cidr_block
      availability_zone = subnet.availability_zone
    }
  ]
}
```

## Module Interface Pattern

Modules use variables for input and outputs for results:

```hcl
# modules/vpc/variables.tf
variable "name" {
  type = string
}

variable "cidr" {
  type = string
}

variable "enable_dns" {
  type    = bool
  default = true
}

# modules/vpc/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.cidr
  enable_dns_hostnames = var.enable_dns
  enable_dns_support   = var.enable_dns

  tags = {
    Name = var.name
  }
}

# modules/vpc/outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}

output "vpc_cidr" {
  value = aws_vpc.main.cidr_block
}
```

Using the module:

```hcl
module "vpc" {
  source = "./modules/vpc"

  name = "production-vpc"
  cidr = "10.0.0.0/16"
}

# Access outputs
resource "aws_subnet" "main" {
  vpc_id     = module.vpc.vpc_id
  cidr_block = cidrsubnet(module.vpc.vpc_cidr, 4, 0)
}
```

## Best Practices

### Variable Naming

```hcl
# Use descriptive names
variable "rds_instance_class" {}  # Good
variable "instance" {}             # Too vague

# Use snake_case
variable "enable_auto_scaling" {}  # Good
variable "enableAutoScaling" {}    # Avoid
```

### Always Include Descriptions

```hcl
variable "retention_days" {
  description = "Number of days to retain logs before deletion"
  type        = number
  default     = 30
}
```

### Group Related Variables

```hcl
# Database configuration
variable "db_instance_class" {}
variable "db_allocated_storage" {}
variable "db_engine_version" {}

# Or use an object
variable "database" {
  type = object({
    instance_class    = string
    allocated_storage = number
    engine_version    = string
  })
}
```

### Use Validation Extensively

Catch misconfigurations before they reach the cloud provider.

---

Variables and outputs form the API of your Terraform configurations. Well-designed variables with proper types, defaults, and validation make configurations safer and easier to use. Outputs expose the information other configurations and users need.
