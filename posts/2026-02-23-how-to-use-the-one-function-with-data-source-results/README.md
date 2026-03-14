# How to Use the one Function with Data Source Results

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, One Function, Data Source, HCL, Infrastructure as Code, Collections

Description: Learn how to use the one function in Terraform to safely extract a single element from a list, especially when working with data source results that should return exactly one item.

---

When you query a data source in Terraform, you often expect exactly one result back. Maybe you are looking up a specific AMI, a particular VPC, or a single DNS zone. The `one` function helps you express that expectation clearly and catch problems early when the data does not match what you anticipated.

## What Is the one Function?

The `one` function takes a list or set and returns its element if the collection contains exactly one item. If the collection is empty, it returns `null`. If the collection contains more than one element, Terraform throws an error. Here is the basic signature:

```hcl
# one(list)
# Returns the single element, null for empty, or errors for 2+ elements
one(["hello"])  # Returns "hello"
one([])         # Returns null
one(["a", "b"]) # Error: must not have more than one element
```

This behavior makes it a perfect fit for data sources where you expect a unique result.

## Experimenting in terraform console

Before diving into real configurations, try out the `one` function in the Terraform console:

```hcl
# Launch with: terraform console

# Single element - returns the value directly
> one(["single-value"])
"single-value"

# Empty list - returns null
> one([])
null

# Works with sets too
> one(toset(["only-one"]))
"only-one"

# More than one element - throws an error
> one(["first", "second"])
# Error: must not have more than one element

# Works with complex types
> one([{name = "web", port = 80}])
{
  "name" = "web"
  "port" = 80
}
```

## The Problem one Solves

Before `one` existed, extracting a single result from a data source often looked like this:

```hcl
data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["main-vpc"]
  }
}

# Old approach - index into the list and hope for the best
output "vpc_id" {
  value = data.aws_vpc.main.id
}
```

This works when the data source itself guarantees a single result, but many data sources return lists. Consider `aws_ami_ids` or custom queries that could return multiple matches:

```hcl
data "aws_ami_ids" "ubuntu" {
  owners = ["099720109477"]  # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

# Without one(), you might accidentally get multiple AMIs
# and silently pick the wrong one by indexing [0]
locals {
  # Bad: silently picks the first one even if multiple match
  ami_id_risky = data.aws_ami_ids.ubuntu.ids[0]
}
```

## Using one with Data Source Results

Here is how `one` helps make your intent explicit:

```hcl
data "aws_vpcs" "tagged" {
  filter {
    name   = "tag:Environment"
    values = ["production"]
  }
}

locals {
  # Clear intent: we expect exactly one production VPC
  # If there are zero or multiple, Terraform will let us know
  prod_vpc_id = one(data.aws_vpcs.tagged.ids)
}

resource "aws_subnet" "app" {
  vpc_id            = local.prod_vpc_id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "app-subnet"
  }
}
```

If someone accidentally creates a second production VPC, or if the tag filter matches nothing, Terraform will flag the issue at plan time rather than silently deploying into the wrong VPC.

## Combining one with for Expressions

A powerful pattern is filtering a list with a `for` expression and then using `one` to extract the matching element:

```hcl
variable "subnets" {
  type = list(object({
    name = string
    cidr = string
    zone = string
    type = string
  }))
  default = [
    { name = "public-a",  cidr = "10.0.1.0/24", zone = "us-east-1a", type = "public" },
    { name = "public-b",  cidr = "10.0.2.0/24", zone = "us-east-1b", type = "public" },
    { name = "private-a", cidr = "10.0.3.0/24", zone = "us-east-1a", type = "private" },
  ]
}

locals {
  # Find the single private subnet in zone us-east-1a
  private_subnet_a = one([
    for s in var.subnets : s
    if s.type == "private" && s.zone == "us-east-1a"
  ])
}

output "private_subnet_cidr" {
  # Access the attributes of the matched subnet
  value = local.private_subnet_a.cidr
}
```

This approach is much more readable and safer than using index-based access with hardcoded offsets.

## one with Conditional Resource Creation

The `one` function is also handy when working with resources that use `count` for conditional creation:

```hcl
variable "create_bastion" {
  type    = bool
  default = true
}

resource "aws_instance" "bastion" {
  count         = var.create_bastion ? 1 : 0
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "bastion-host"
  }
}

# one() cleanly handles both the created and not-created cases
output "bastion_ip" {
  # Returns the IP if the instance was created, null otherwise
  value = one(aws_instance.bastion[*].public_ip)
}
```

Without `one`, you would need to write something like:

```hcl
# More verbose alternative
output "bastion_ip_verbose" {
  value = length(aws_instance.bastion) > 0 ? aws_instance.bastion[0].public_ip : null
}
```

The `one` version is cleaner and communicates intent better.

## Real-World Example - Finding a Specific Security Group

Here is a practical scenario where `one` prevents a common deployment mistake:

```hcl
# Look up all security groups with a specific tag
data "aws_security_groups" "db_access" {
  filter {
    name   = "tag:Purpose"
    values = ["database-access"]
  }

  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
}

locals {
  # We expect exactly one security group for database access
  # per VPC. If there are duplicates, we want to know about it.
  db_sg_id = one(data.aws_security_groups.db_access.ids)
}

resource "aws_db_instance" "primary" {
  identifier     = "primary-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"

  vpc_security_group_ids = [local.db_sg_id]

  # ... other configuration
}
```

If a teammate accidentally creates a duplicate security group with the same tag, the `one` function will catch it during `terraform plan` instead of randomly picking one.

## Handling the null Case

Remember that `one` returns `null` for empty lists. You can handle this with a conditional or by combining it with `coalesce`:

```hcl
data "aws_vpcs" "staging" {
  filter {
    name   = "tag:Environment"
    values = ["staging"]
  }
}

locals {
  # one returns null if no staging VPC exists
  staging_vpc = one(data.aws_vpcs.staging.ids)

  # Provide a fallback if needed
  target_vpc = coalesce(local.staging_vpc, var.default_vpc_id)
}

output "selected_vpc" {
  value = local.target_vpc
}
```

## one vs element vs Index Access

Here is a comparison of the three approaches for extracting items from a list:

```hcl
locals {
  my_list = ["only-item"]

  # Index access - fails on empty list, silently works on multi-element lists
  via_index = local.my_list[0]

  # element() - wraps around, so element(["a","b"], 2) returns "a"
  via_element = element(local.my_list, 0)

  # one() - returns null for empty, errors for multi-element
  via_one = one(local.my_list)
}
```

Choose `one` when you want to enforce the "exactly zero or one" constraint. Use index access when you know the list will have items and you want a specific position. Use `element` when you need wrap-around behavior.

## Using one in Module Outputs

When building reusable modules, `one` helps create clean output interfaces:

```hcl
# modules/networking/main.tf
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? 1 : 0
  domain = "vpc"

  tags = {
    Name = "${var.environment}-nat-eip"
  }
}

resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? 1 : 0
  allocation_id = one(aws_eip.nat[*].id)
  subnet_id     = var.public_subnet_id

  tags = {
    Name = "${var.environment}-nat-gw"
  }
}

# modules/networking/outputs.tf
output "nat_gateway_id" {
  description = "The ID of the NAT gateway, or null if not created"
  value       = one(aws_nat_gateway.main[*].id)
}

output "nat_public_ip" {
  description = "The public IP of the NAT gateway, or null if not created"
  value       = one(aws_eip.nat[*].public_ip)
}
```

## Summary

The `one` function is a small but important part of writing defensive Terraform configurations. It makes your assumptions about data explicit - when you expect a single result, `one` enforces that expectation at plan time. Use it with data source results, conditional resource outputs (via splat expressions), and filtered lists. It is especially valuable in team environments where infrastructure can drift in unexpected ways, and catching duplicates or missing resources early saves everyone time.

For related topics, check out our guides on the [try function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-try-function-to-handle-optional-attributes/view) and the [distinct function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-distinct-function-to-deduplicate-lists/view) for more ways to work with collections in Terraform.
