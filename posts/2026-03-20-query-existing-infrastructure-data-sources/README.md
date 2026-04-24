# How to Query Existing Infrastructure with Data Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Data Source, Infrastructure as Code, HCL, DevOps

Description: Learn how to query existing infrastructure using data sources in OpenTofu to read resource attributes and use them in your configurations.

---

Data sources let you pull information from already-existing infrastructure and feed it into your OpenTofu configurations. Instead of hardcoding values like VPC IDs, subnet IDs, or AMI names, you query the provider's API and use the live values.

---

## Why Query Existing Infrastructure

When your team manages infrastructure across multiple configurations or stacks, you need to reference shared resources without duplicating them or creating circular dependencies. Data sources let you:

- Reference VPCs, subnets, and security groups created in another Terraform/OpenTofu root
- Look up the latest AMI without hardcoding IDs that change over time
- Read secrets or parameters created outside OpenTofu
- Access account/region metadata dynamically

---

## Query a Resource by Tag

The most common pattern is looking up a resource by one of its tags.

```hcl
# Find an existing VPC using its Name tag

data "aws_vpc" "shared" {
  tags = {
    Name        = "shared-services-vpc"
    Environment = "production"
  }
}

# Use the VPC's ID in a new subnet
resource "aws_subnet" "app" {
  vpc_id            = data.aws_vpc.shared.id
  cidr_block        = "10.10.50.0/24"
  availability_zone = "us-east-1a"
}
```

---

## Query a Resource by Filter

Many AWS data sources support `filter` blocks that map directly to the underlying AWS API filter parameters.

```hcl
# Find the most recent Amazon Linux 2 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
}
```

---

## Query Multiple Resources

Some data sources return multiple results - use the plural form (e.g., `aws_subnets` vs `aws_subnet`).

```hcl
# Find all private subnets in a VPC
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.shared.id]
  }

  tags = {
    Tier = "private"
  }
}

resource "aws_lb" "app" {
  internal           = true
  load_balancer_type = "application"
  subnets            = data.aws_subnets.private.ids   # list of all matching subnet IDs
}
```

---

## Query AWS Systems Manager Parameter Store

```hcl
# Read a parameter from SSM
data "aws_ssm_parameter" "db_host" {
  name = "/production/database/host"
}

data "aws_ssm_parameter" "db_port" {
  name = "/production/database/port"
}

resource "aws_ecs_task_definition" "app" {
  family = "app"

  container_definitions = jsonencode([{
    name  = "app"
    image = "nginx:latest"
    environment = [
      { name = "DB_HOST", value = data.aws_ssm_parameter.db_host.value },
      { name = "DB_PORT", value = data.aws_ssm_parameter.db_port.value },
    ]
  }])
}
```

---

## Query DNS Records

```hcl
# Look up an existing hosted zone
data "aws_route53_zone" "primary" {
  name         = "example.com."
  private_zone = false
}

# Add a new record to the found zone
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "api.example.com"
  type    = "A"
  ttl     = 300
  records = ["203.0.113.10"]
}
```

---

## Using Output from Another Stack

When infrastructure is managed by a separate OpenTofu/Terraform state, use `terraform_remote_state` to query outputs from that state.

```hcl
# Read outputs from a shared networking stack
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-tfstate"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = data.terraform_remote_state.networking.outputs.private_subnet_id
}
```

---

## Summary

Data sources query existing infrastructure by filtering on tags, IDs, names, or other attributes. Use singular data sources when you expect exactly one match, and plural sources (like `aws_subnets`) when you need a collection. Common patterns include looking up AMIs by name filter, finding VPCs and subnets by tag, reading secrets from Parameter Store or Secrets Manager, and accessing outputs from remote state.
