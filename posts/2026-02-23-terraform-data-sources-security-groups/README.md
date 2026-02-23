# How to Use Data Sources to Query Existing Security Groups

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Security Groups, Data Sources, VPC, Networking

Description: Learn how to use Terraform data sources to query and reference existing AWS security groups in your infrastructure configurations for cleaner cross-team collaboration.

---

Security groups in AWS are often managed by different teams or created through separate processes. Your networking team might maintain base security groups, your security team might manage compliance-related groups, and your application teams need to reference all of them. Terraform data sources let you query existing security groups and use them in your configurations without hardcoding IDs or recreating resources.

This article shows you how to look up security groups by various criteria, use them across modules, and handle common patterns that come up in real-world infrastructure work.

## Basic Security Group Lookup

The `aws_security_group` data source lets you find a security group by ID, name, tags, or a combination of filters.

### By ID

```hcl
# Look up a security group when you know its ID
data "aws_security_group" "known" {
  id = "sg-0123456789abcdef0"
}

output "sg_name" {
  value = data.aws_security_group.known.name
}
```

### By Name

```hcl
# Look up a security group by its name
data "aws_security_group" "web" {
  name = "web-server-sg"
}

# Use it when launching an EC2 instance
resource "aws_instance" "web" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.micro"
  vpc_security_group_ids = [data.aws_security_group.web.id]

  tags = {
    Name = "web-server"
  }
}
```

### By Tags

```hcl
# Look up a security group using tags
data "aws_security_group" "by_tag" {
  tags = {
    Environment = "production"
    Service     = "api"
  }
}
```

## Using Filters for Advanced Queries

Filters give you more control over how you search. They map directly to the AWS EC2 API `DescribeSecurityGroups` filters.

```hcl
# Find a security group in a specific VPC with a name pattern
data "aws_security_group" "app_sg" {
  filter {
    name   = "vpc-id"
    values = ["vpc-abc12345"]
  }

  filter {
    name   = "group-name"
    values = ["app-*-production"]
  }
}
```

### Common Filter Options

```hcl
# Filter by VPC ID
data "aws_security_group" "in_vpc" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "group-name"
    values = ["database-sg"]
  }
}

# Filter by description
data "aws_security_group" "by_description" {
  filter {
    name   = "description"
    values = ["Managed by security team*"]
  }

  # Combine with tag filter to narrow results
  tags = {
    Team = "security"
  }
}
```

## Querying Multiple Security Groups

When you need to look up several security groups at once, use `aws_security_groups` (plural). This returns a list of IDs matching your criteria.

```hcl
# Find all security groups with a specific tag
data "aws_security_groups" "app_sgs" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  tags = {
    ManagedBy = "terraform"
  }
}

output "all_sg_ids" {
  # Returns a list of matching security group IDs
  value = data.aws_security_groups.app_sgs.ids
}

# Attach all matching security groups to an instance
resource "aws_instance" "app" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.medium"
  vpc_security_group_ids = data.aws_security_groups.app_sgs.ids

  tags = {
    Name = "app-server"
  }
}
```

## Combining Security Group Lookups with VPC Data Sources

A common pattern is to look up the VPC first, then find security groups within it:

```hcl
# Look up the VPC by tag
data "aws_vpc" "main" {
  tags = {
    Name = "main-vpc"
  }
}

# Find the default security group in that VPC
data "aws_security_group" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "group-name"
    values = ["default"]
  }
}

# Find a custom security group in the same VPC
data "aws_security_group" "bastion" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "group-name"
    values = ["bastion-ssh"]
  }
}

# Use both security groups for an instance
resource "aws_instance" "internal" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.micro"
  subnet_id              = data.aws_subnet.private.id
  vpc_security_group_ids = [
    data.aws_security_group.default.id,
    data.aws_security_group.bastion.id,
  ]

  tags = {
    Name = "internal-server"
  }
}
```

## Using for_each with Security Group Data Sources

When you have a list of security group names to look up, combine `for_each` with data sources:

```hcl
variable "required_security_groups" {
  type = map(string)
  default = {
    web     = "web-server-sg"
    db      = "database-sg"
    cache   = "redis-sg"
    monitor = "monitoring-sg"
  }
}

# Look up each security group by name
data "aws_security_group" "required" {
  for_each = var.required_security_groups
  name     = each.value
}

# Collect all the IDs into a list
locals {
  all_sg_ids = [for sg in data.aws_security_group.required : sg.id]
}

# Use all of them on a resource
resource "aws_instance" "app" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.large"
  vpc_security_group_ids = local.all_sg_ids

  tags = {
    Name = "app-server"
  }
}
```

## Referencing Security Groups Across Modules

Data sources are particularly useful when different Terraform modules need to share security group references:

```hcl
# In your networking module output
# modules/networking/outputs.tf
output "web_sg_name" {
  value = aws_security_group.web.name
}

# In your application module - look up the security group by name
# modules/application/main.tf
variable "web_sg_name" {
  type = string
}

data "aws_security_group" "web" {
  name = var.web_sg_name
}

resource "aws_lb" "app" {
  name               = "app-lb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [data.aws_security_group.web.id]
  subnets            = var.public_subnet_ids
}
```

## Reading Security Group Rules

Once you have looked up a security group, you can inspect its rules:

```hcl
data "aws_security_group" "existing" {
  name = "legacy-app-sg"
}

# The data source exposes ingress and egress rules
output "sg_details" {
  value = {
    id          = data.aws_security_group.existing.id
    name        = data.aws_security_group.existing.name
    description = data.aws_security_group.existing.description
    vpc_id      = data.aws_security_group.existing.vpc_id
    arn         = data.aws_security_group.existing.arn
  }
}
```

## Adding Rules to Existing Security Groups

You can add new rules to security groups that you looked up via data sources:

```hcl
# Look up the existing security group
data "aws_security_group" "app" {
  name = "application-sg"
}

# Add a new ingress rule to it
resource "aws_security_group_rule" "allow_monitoring" {
  type              = "ingress"
  from_port         = 9090
  to_port           = 9090
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/8"]
  security_group_id = data.aws_security_group.app.id
  description       = "Allow Prometheus scraping"
}
```

## Handling Errors

If a data source query matches zero security groups, Terraform will throw an error during the plan. If it matches more than one, you will also get an error (for the singular `aws_security_group` data source). Here are strategies to handle this:

```hcl
# Be specific with your filters to avoid multiple matches
data "aws_security_group" "unique" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  # Use exact name match, not wildcards
  filter {
    name   = "group-name"
    values = ["exactly-this-name"]
  }
}

# If you expect multiple matches, use the plural data source
data "aws_security_groups" "multiple" {
  filter {
    name   = "group-name"
    values = ["app-*"]
  }
}
```

## Conclusion

Querying existing security groups with Terraform data sources is essential for building infrastructure that integrates with your existing AWS environment. Whether you are looking up a single group by name, finding all groups with a certain tag, or pulling security group references across modules, data sources keep your configuration clean and your security group IDs out of hardcoded strings. The combination of filters and tags gives you enough flexibility to find exactly the groups you need.

For more on working with data sources, check out our guide on [how to handle data source dependencies in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-data-source-dependencies/view).
