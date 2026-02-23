# How to Configure Random Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, Random Provider, Infrastructure as Code, Automation

Description: A complete guide to configuring the Random provider in Terraform for generating unique names, passwords, IDs, and other random values in your infrastructure.

---

Naming things is one of the hardest problems in computing, and infrastructure is no exception. When you are provisioning cloud resources, you frequently need unique names, random suffixes, generated passwords, or shuffled lists. The Random provider in Terraform handles all of this without requiring any external service or API.

The Random provider generates random values during Terraform runs and stores them in state. Once generated, the values remain stable across subsequent applies unless you explicitly trigger regeneration. This makes it safe to use in production - your resource names will not change on every apply.

## Prerequisites

- Terraform 1.0 or later
- No external services or credentials needed

## Declaring the Provider

```hcl
# versions.tf - Declare the Random provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}
```

The provider needs no configuration at all.

```hcl
# provider.tf - Nothing to configure
provider "random" {}
```

## Resource Types

The Random provider offers several resource types, each designed for different use cases.

### random_id

Generates a random base64-encoded or hex-encoded ID. This is great for creating unique suffixes for resource names.

```hcl
# Generate a random ID for resource naming
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Use it in an S3 bucket name
resource "aws_s3_bucket" "data" {
  # Produces something like: data-bucket-a1b2c3d4
  bucket = "data-bucket-${random_id.bucket_suffix.hex}"
}

# Available attributes
output "random_id_info" {
  value = {
    hex    = random_id.bucket_suffix.hex      # "a1b2c3d4"
    dec    = random_id.bucket_suffix.dec      # "2712847316"
    b64_url = random_id.bucket_suffix.b64_url # "obLD1A"
    b64_std = random_id.bucket_suffix.b64_std # "obLD1A=="
  }
}
```

### random_string

Generates a random string with configurable character sets.

```hcl
# Generate a random string for a resource name
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false

  # Only use lowercase letters and numbers
}

# Use it in a resource name
resource "aws_sqs_queue" "tasks" {
  name = "task-queue-${random_string.suffix.result}"
}
```

### random_password

Similar to `random_string` but the result is marked as sensitive, so it will not show up in plan output or logs.

```hcl
# Generate a random password for a database
resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "!@#$%"  # Limit special characters to these

  # Ensure the password meets complexity requirements
  min_lower   = 2
  min_upper   = 2
  min_numeric = 2
  min_special = 1
}

# Use the password in a database resource
resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  username       = "admin"
  password       = random_password.db_password.result

  # ... other configuration
}

# Store the password in a secrets manager
resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = random_password.db_password.result
}
```

### random_integer

Generates a random integer within a range.

```hcl
# Pick a random port number for a service
resource "random_integer" "port" {
  min = 30000
  max = 32767
}

# Pick a random availability zone index
resource "random_integer" "az_index" {
  min = 0
  max = 2
}

locals {
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  selected_az        = local.availability_zones[random_integer.az_index.result]
}
```

### random_uuid

Generates a random UUID (version 4).

```hcl
# Generate a UUID for tagging resources
resource "random_uuid" "deployment_id" {}

# Use it as a tag
resource "aws_instance" "app" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"

  tags = {
    Name         = "app-server"
    DeploymentID = random_uuid.deployment_id.result
  }
}
```

### random_shuffle

Shuffles a list of strings. Useful for distributing resources across zones or selecting a random subset.

```hcl
# Shuffle availability zones
resource "random_shuffle" "az" {
  input = ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d"]

  # Only pick 2 from the shuffled list
  result_count = 2
}

# Use the shuffled zones for subnets
resource "aws_subnet" "app" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  availability_zone = random_shuffle.az.result[count.index]
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
}
```

### random_pet

Generates a random pet name, which is a fun way to name non-production resources.

```hcl
# Generate a random pet name
resource "random_pet" "server_name" {
  length    = 2       # Number of words
  separator = "-"     # Word separator
  prefix    = "dev"   # Optional prefix
}

# Produces something like: dev-sunny-dolphin
output "server_name" {
  value = random_pet.server_name.id
}

# Use it for development environments
resource "aws_instance" "dev" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"

  tags = {
    Name = random_pet.server_name.id
  }
}
```

## Controlling When Values Change

By default, random values are generated once and persist in state. To regenerate them, you use `keepers` - a map of values that, when changed, triggers regeneration.

```hcl
# Regenerate the password when the database engine version changes
resource "random_password" "db_password" {
  length  = 24
  special = true

  keepers = {
    engine_version = var.db_engine_version
  }
}

# Regenerate the suffix when the environment changes
resource "random_id" "suffix" {
  byte_length = 4

  keepers = {
    environment = var.environment
  }
}

# Regenerate on every apply (use with caution)
resource "random_id" "always_new" {
  byte_length = 4

  keepers = {
    timestamp = timestamp()
  }
}
```

## Practical Patterns

### Unique Resource Names Across Environments

```hcl
variable "environment" {
  type = string
}

variable "project" {
  type = string
}

# Generate a unique suffix per project-environment combo
resource "random_id" "env_suffix" {
  byte_length = 3

  keepers = {
    project     = var.project
    environment = var.environment
  }
}

locals {
  # Create a naming prefix: myproject-staging-a1b2c3
  name_prefix = "${var.project}-${var.environment}-${random_id.env_suffix.hex}"
}

resource "aws_s3_bucket" "logs" {
  bucket = "${local.name_prefix}-logs"
}

resource "aws_s3_bucket" "data" {
  bucket = "${local.name_prefix}-data"
}
```

### Generating Multiple Passwords

```hcl
# Generate passwords for multiple services
resource "random_password" "service_passwords" {
  for_each = toset(["api", "worker", "scheduler"])

  length  = 20
  special = true

  keepers = {
    rotation_date = var.password_rotation_date
  }
}

# Access individual passwords
output "api_password" {
  value     = random_password.service_passwords["api"].result
  sensitive = true
}
```

### Distributing Resources Across Zones

```hcl
# Randomly distribute instances across availability zones
resource "random_shuffle" "zones" {
  input        = var.availability_zones
  result_count = var.instance_count
}

resource "aws_instance" "app" {
  count             = var.instance_count
  ami               = var.ami_id
  instance_type     = "t3.medium"
  availability_zone = random_shuffle.zones.result[count.index]

  tags = {
    Name = "app-${count.index}"
  }
}
```

## State Considerations

Random values are stored in the Terraform state file. This means:

1. If you lose your state file, the random values will be regenerated, which could cause resource recreation.

2. The `random_password` result is marked sensitive but is still stored in plain text in state. Use an encrypted remote backend.

3. Importing random resources is possible but rarely needed.

```hcl
# Encrypted remote state is important when using random_password
terraform {
  backend "s3" {
    bucket  = "terraform-state"
    key     = "app/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}
```

## Best Practices

1. Use `random_password` instead of `random_string` for secrets. The `sensitive` marking prevents accidental exposure in logs and plan output.

2. Set meaningful `keepers` to control when values regenerate. Avoid using `timestamp()` in production unless you really want new values on every apply.

3. Pin the provider version. Changes in the random algorithm between versions could regenerate values unexpectedly.

4. Use `random_id` with `hex` output for resource name suffixes. It is compact and URL-safe.

5. Use `random_pet` for human-friendly names in development and testing environments.

## Wrapping Up

The Random provider is one of those small but essential tools in the Terraform ecosystem. It solves the practical problems of generating unique names, creating passwords, and introducing controlled randomness into your infrastructure code. Since the values persist in state, you get reproducibility without sacrificing uniqueness.

For monitoring the infrastructure you build with these randomly-named resources, check out [OneUptime](https://oneuptime.com) for comprehensive observability and alerting.
