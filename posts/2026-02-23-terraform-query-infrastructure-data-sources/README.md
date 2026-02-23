# How to Query Existing Infrastructure with Data Sources in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Data Sources, Infrastructure as Code, Cloud, DevOps

Description: Learn how to use Terraform data sources to query and reference existing infrastructure that is managed outside your current Terraform configuration for dynamic lookups.

---

Not everything in your cloud environment is managed by the Terraform configuration you are working on. VPCs might be created by a networking team. SSL certificates might live in a shared account. AMIs might be built by a CI/CD pipeline. DNS zones might predate your Terraform adoption. Data sources let you reach into your existing infrastructure and pull information into your configuration without managing those resources.

This is one of the most practical features in Terraform. Without data sources, you would hardcode IDs, ARNs, and endpoints - creating brittle configurations that break whenever the referenced infrastructure changes.

## What Data Sources Do

A data source performs a read-only query against your cloud provider (or other data backend) and returns attributes you can reference in your configuration. It does not create, modify, or delete anything.

```hcl
# This reads information about an existing VPC
data "aws_vpc" "main" {
  tags = {
    Name = "production-vpc"
  }
}

# Now use the VPC ID in a resource
resource "aws_subnet" "app" {
  vpc_id     = data.aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}
```

The `data` block queries AWS for a VPC with the tag `Name = production-vpc`. If it finds one, all of that VPC's attributes become available through `data.aws_vpc.main.*`.

## Data Source Syntax

```hcl
data "<provider>_<type>" "<name>" {
  # Filter/query arguments
  filter {
    name   = "attribute-name"
    values = ["value"]
  }

  # Or direct arguments
  id = "specific-id"
}
```

References follow the pattern `data.<provider>_<type>.<name>.<attribute>`.

## Common Querying Patterns

### By ID

When you know the exact ID of a resource:

```hcl
data "aws_subnet" "specific" {
  id = "subnet-0123456789abcdef0"
}

output "subnet_cidr" {
  value = data.aws_subnet.specific.cidr_block
}
```

### By Tags

When you organize infrastructure with tags:

```hcl
data "aws_vpc" "production" {
  tags = {
    Environment = "production"
    ManagedBy   = "networking-team"
  }
}
```

### By Filters

Many AWS data sources support filter blocks for complex queries:

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}
```

### By Name or Identifier

Some data sources have convenience arguments:

```hcl
# Look up by name
data "aws_iam_role" "lambda_exec" {
  name = "lambda-execution-role"
}

# Look up by ARN
data "aws_acm_certificate" "app" {
  domain   = "app.example.com"
  statuses = ["ISSUED"]
}
```

## Querying Multiple Resources

### Using for_each with Data Sources

```hcl
variable "subnet_ids" {
  type    = list(string)
  default = ["subnet-abc123", "subnet-def456", "subnet-ghi789"]
}

data "aws_subnet" "selected" {
  for_each = toset(var.subnet_ids)
  id       = each.value
}

# Access all subnet CIDR blocks
output "subnet_cidrs" {
  value = { for k, v in data.aws_subnet.selected : k => v.cidr_block }
}
```

### Using count

```hcl
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_subnet" "public" {
  count             = length(data.aws_availability_zones.available.names)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  filter {
    name   = "tag:Tier"
    values = ["public"]
  }

  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
}
```

## Real-World Examples

### Building an EC2 Instance from Queried Data

Instead of hardcoding anything, query everything:

```hcl
# Find the VPC
data "aws_vpc" "main" {
  tags = { Name = "main-vpc" }
}

# Find a private subnet
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  tags = { Tier = "private" }
}

# Find the latest AMI
data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]
  filter {
    name   = "name"
    values = ["app-server-*"]
  }
}

# Find an existing security group
data "aws_security_group" "app" {
  vpc_id = data.aws_vpc.main.id
  tags   = { Name = "app-sg" }
}

# Find the SSH key
data "aws_key_pair" "deployer" {
  key_name = "deployer"
}

# Now create the instance with zero hardcoded values
resource "aws_instance" "app" {
  ami                    = data.aws_ami.app.id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.private.ids[0]
  vpc_security_group_ids = [data.aws_security_group.app.id]
  key_name               = data.aws_key_pair.deployer.key_name

  tags = {
    Name = "app-server"
  }
}
```

### Sharing Data Between Terraform Projects

When one team manages the VPC and another deploys applications:

```hcl
# Team A manages the VPC (separate Terraform project)
# Their output: vpc_id = "vpc-123", private_subnets = ["subnet-a", "subnet-b"]

# Team B deploys the application
data "aws_vpc" "shared" {
  id = var.vpc_id  # Passed as a variable or looked up by tag
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.shared.id]
  }
  tags = {
    Tier = "private"
  }
}

resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2

  network_configuration {
    subnets         = data.aws_subnets.private.ids
    security_groups = [aws_security_group.ecs.id]
  }
}
```

### Looking Up Secrets

```hcl
data "aws_secretsmanager_secret" "db" {
  name = "production/database/credentials"
}

data "aws_secretsmanager_secret_version" "db" {
  secret_id = data.aws_secretsmanager_secret.db.id
}

locals {
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.db.secret_string)
}

resource "aws_db_instance" "main" {
  identifier     = "app-database"
  engine         = "postgres"
  instance_class = "db.r6g.large"
  username       = local.db_creds.username
  password       = local.db_creds.password
}
```

### Cross-Account Data Lookups

With proper IAM roles, you can query resources in other AWS accounts:

```hcl
provider "aws" {
  alias  = "shared_services"
  region = var.region

  assume_role {
    role_arn = "arn:aws:iam::123456789012:role/TerraformReadOnly"
  }
}

data "aws_route53_zone" "main" {
  provider = aws.shared_services
  name     = "example.com."
}

resource "aws_route53_record" "app" {
  provider = aws.shared_services
  zone_id  = data.aws_route53_zone.main.zone_id
  name     = "app.example.com"
  type     = "A"
  ttl      = 300
  records  = [aws_eip.app.public_ip]
}
```

## Data Sources and the Plan Phase

Data source queries run during `terraform plan`, not during apply. This means:

1. The infrastructure being queried must exist when you run the plan.
2. If the queried infrastructure changes between plan and apply, you might get stale data.
3. If a data source query fails (resource not found), the plan fails.

```hcl
# This will fail during plan if the VPC does not exist
data "aws_vpc" "main" {
  tags = { Name = "nonexistent-vpc" }
}
```

## Error Handling

Data sources fail loudly when they cannot find the requested resource. This is a good thing - it catches configuration errors early.

```
Error: no matching VPC found

  on main.tf line 1, in data "aws_vpc" "main":
   1: data "aws_vpc" "main" {
```

To handle optional lookups, you can use `count` or `for_each` with conditional logic:

```hcl
variable "existing_sg_name" {
  default = ""
}

# Only look up the SG if a name was provided
data "aws_security_group" "existing" {
  count = var.existing_sg_name != "" ? 1 : 0

  filter {
    name   = "group-name"
    values = [var.existing_sg_name]
  }
}

# Use the existing SG if found, otherwise create one
resource "aws_security_group" "app" {
  count  = var.existing_sg_name == "" ? 1 : 0
  name   = "app-sg"
  vpc_id = var.vpc_id
}

locals {
  sg_id = var.existing_sg_name != "" ? data.aws_security_group.existing[0].id : aws_security_group.app[0].id
}
```

## Summary

Data sources are the bridge between your Terraform configuration and the rest of your infrastructure. They let you write configurations that adapt to existing environments instead of demanding specific IDs. Query VPCs by tag, find the latest AMI by filter, look up certificates by domain name, and pull secrets from secret managers - all without hardcoding a single value.

For specific data source deep dives, check out our posts on the [http data source](https://oneuptime.com/blog/post/terraform-http-data-source/view), [external data source](https://oneuptime.com/blog/post/terraform-external-data-source/view), and [dynamic AMI lookup](https://oneuptime.com/blog/post/2026-02-23-terraform-dynamic-ami-lookup/view).
