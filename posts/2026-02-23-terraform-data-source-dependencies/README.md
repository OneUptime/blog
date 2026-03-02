# How to Handle Data Source Dependencies in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Data Source, Dependencies, Infrastructure as Code, Best Practices

Description: Learn how to manage data source dependencies in Terraform, including implicit dependencies, explicit ordering, and strategies for handling circular and cross-module references.

---

Terraform data sources are powerful for reading existing infrastructure, but they introduce dependency challenges that are different from regular resources. A data source might depend on a resource that has not been created yet, or two data sources might depend on each other in ways that Terraform cannot automatically resolve. Understanding how these dependencies work - and how to manage them - is essential for writing reliable Terraform configurations.

## How Terraform Resolves Dependencies

Terraform builds a dependency graph before executing any operations. It looks at attribute references to determine which resources and data sources depend on which. When resource A references an attribute of resource B, Terraform knows to create B first.

Data sources follow the same rules, but with an important distinction: Terraform tries to read data sources as early as possible during the plan phase. If a data source has no dependencies on managed resources, Terraform reads it before creating any resources. If it depends on a managed resource, Terraform defers the read until after that resource exists.

```hcl
# This data source has no dependencies on managed resources
# Terraform reads it during the plan phase
data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  owners = ["099720109477"]
}

# This resource depends on the data source above
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
}
```

## Implicit Dependencies Between Data Sources and Resources

When a data source references an attribute from a managed resource, Terraform creates an implicit dependency:

```hcl
# Create a VPC first
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "main-vpc"
  }
}

# This data source implicitly depends on the VPC resource
# because it references aws_vpc.main.id
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [aws_vpc.main.id]
  }

  tags = {
    Tier = "private"
  }
}

# This resource depends on the data source, which depends on the VPC
resource "aws_lb" "internal" {
  name               = "internal-lb"
  internal           = true
  load_balancer_type = "application"
  subnets            = data.aws_subnets.private.ids
}
```

Terraform will create the VPC, then read the subnets data source, then create the load balancer. The order is determined automatically.

## When Implicit Dependencies Are Not Enough

Sometimes the dependency between a data source and a resource is not expressed through attribute references. For example, you might create a security group and then want to look up all security groups with a certain tag - but you do not directly reference the created security group's ID in the data source.

```hcl
resource "aws_security_group" "app" {
  name        = "app-sg"
  description = "Application security group"
  vpc_id      = aws_vpc.main.id

  tags = {
    Role = "application"
  }
}

# This data source should run AFTER the security group is created
# but there is no direct attribute reference creating that dependency
data "aws_security_groups" "app_sgs" {
  tags = {
    Role = "application"
  }
}
```

In this case, Terraform might read the data source before creating the security group, meaning the new group would not appear in the results. This is where explicit dependencies come in.

## Using depends_on with Data Sources

The `depends_on` meta-argument tells Terraform to wait until specified resources are created before reading the data source:

```hcl
resource "aws_security_group" "app" {
  name        = "app-sg"
  description = "Application security group"
  vpc_id      = aws_vpc.main.id

  tags = {
    Role = "application"
  }
}

# Now Terraform waits for the security group before reading this
data "aws_security_groups" "app_sgs" {
  depends_on = [aws_security_group.app]

  tags = {
    Role = "application"
  }
}
```

Note that `depends_on` on a data source forces Terraform to defer reading it until the apply phase. During the plan, Terraform will show the data source values as "known after apply."

## Data Sources That Depend on Other Data Sources

Data sources can depend on each other through attribute references, just like resources:

```hcl
# First, look up the VPC
data "aws_vpc" "main" {
  tags = {
    Name = "main-vpc"
  }
}

# Then look up subnets in that VPC
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  tags = {
    Tier = "private"
  }
}

# Then look up details for each subnet
data "aws_subnet" "private_details" {
  for_each = toset(data.aws_subnets.private.ids)
  id       = each.value
}

# Use the chain of data source results
output "subnet_cidrs" {
  value = [for s in data.aws_subnet.private_details : s.cidr_block]
}
```

This creates a chain: VPC lookup -> subnet IDs lookup -> individual subnet details. Each step depends on the previous one.

## Cross-Module Data Source Dependencies

When data sources in one module need to reference resources from another module, pass the dependency through module outputs:

```hcl
# modules/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
}

output "vpc_id" {
  value = aws_vpc.main.id
}

# modules/application/main.tf
variable "vpc_id" {
  type = string
}

# This data source depends on the VPC from the networking module
# The dependency is carried through the variable
data "aws_subnets" "app" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
}

# Root module - wiring it together
module "networking" {
  source   = "./modules/networking"
  vpc_cidr = "10.0.0.0/16"
}

module "application" {
  source = "./modules/application"
  # Passing the VPC ID carries the dependency
  vpc_id = module.networking.vpc_id
}
```

## Handling Data Sources During Initial Apply

A tricky scenario is when a data source queries for resources that only exist after the first `terraform apply`. For example, you create a KMS key and then need to look it up by alias:

```hcl
# Create the KMS key and alias
resource "aws_kms_key" "app" {
  description = "Application encryption key"
}

resource "aws_kms_alias" "app" {
  name          = "alias/app-key"
  target_key_id = aws_kms_key.app.key_id
}

# This data source needs the alias to exist first
data "aws_kms_alias" "app" {
  name = "alias/app-key"

  # Force Terraform to wait for the alias to be created
  depends_on = [aws_kms_alias.app]
}
```

Without the `depends_on`, this configuration would fail on the first apply because the alias does not exist yet.

## Avoiding Circular Dependencies

Circular dependencies between data sources and resources will cause Terraform to error out:

```hcl
# BAD: This creates a circular dependency
# resource "aws_security_group" "app" {
#   name   = "app-sg"
#   vpc_id = data.aws_vpc.main.id  # depends on data source
# }
#
# data "aws_vpc" "main" {
#   filter {
#     name   = "tag:SG"
#     values = [aws_security_group.app.id]  # depends on resource
#   }
# }
```

To break circular dependencies, restructure your configuration. Usually, one of the references can be replaced with a direct value or a different lookup:

```hcl
# GOOD: Break the cycle by looking up the VPC independently
data "aws_vpc" "main" {
  tags = {
    Name = "main-vpc"
  }
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = data.aws_vpc.main.id
}
```

## Conditional Data Source Reads

Sometimes you only want to read a data source if certain conditions are met:

```hcl
variable "use_existing_sg" {
  type    = bool
  default = false
}

# Only look up the security group if we are using an existing one
data "aws_security_group" "existing" {
  count = var.use_existing_sg ? 1 : 0
  name  = "existing-app-sg"
}

# Create a new one if we are not using existing
resource "aws_security_group" "new" {
  count       = var.use_existing_sg ? 0 : 1
  name        = "new-app-sg"
  description = "New application security group"
  vpc_id      = data.aws_vpc.main.id
}

# Reference whichever one exists
locals {
  sg_id = var.use_existing_sg ? data.aws_security_group.existing[0].id : aws_security_group.new[0].id
}
```

## Best Practices

1. Prefer implicit dependencies over explicit ones. If you can reference an attribute from a resource in your data source filter, do that instead of using `depends_on`.

2. Be aware of plan-time vs apply-time reads. Data sources without dependencies are read during plan. Data sources with `depends_on` are deferred to apply.

3. Use `count` or `for_each` to conditionally skip data source reads that would fail.

4. When chaining data sources, keep the chain short. Deep chains of data sources make configurations harder to debug.

5. Document non-obvious dependencies with comments explaining why `depends_on` is needed.

## Conclusion

Data source dependencies in Terraform require a bit more thought than regular resource dependencies. The key things to remember are that Terraform reads data sources as early as possible, implicit dependencies through attribute references work automatically, and `depends_on` is your tool for when automatic dependency detection is not enough. By understanding these mechanics, you can build configurations that correctly order data source reads and avoid the frustrating errors that come from reading data too early.

For more on explicit dependency management, check out our guide on [how to use depends_on with data sources in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-depends-on-data-sources/view).
