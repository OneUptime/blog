# How to Fix Invalid for_each Argument Errors in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, HCL, for_each, Infrastructure as Code

Description: A practical guide to fixing Invalid for_each argument errors in Terraform caused by unknown values, wrong types, and computed dependencies.

---

The `for_each` meta-argument is one of Terraform's most powerful features for creating multiple instances of a resource or module. But it is also one of the most common sources of confusing errors. If you have seen something like this, you are in the right place:

```
Error: Invalid for_each argument

on main.tf line 15, in resource "aws_instance" "servers":
  15:   for_each = var.servers

The "for_each" value depends on resource attributes that cannot be determined
until apply, and so Terraform cannot predict how many instances will be created.
To work around this, use the -target argument to first apply only the resources
that the for_each depends on.
```

Let us break down why this happens and how to fix it in different scenarios.

## Why for_each Is Strict

Terraform needs to know the full set of keys for `for_each` during the plan phase, before any resources are created. This is because each key in the map or set becomes part of the resource address (like `aws_instance.servers["web-1"]`). Terraform needs these addresses to build the dependency graph and generate the plan.

This means the value you pass to `for_each` must be known at plan time. It cannot depend on values that only exist after a resource is created.

## Error: for_each Depends on Resource Attributes

This is the most common for_each error. You are passing a value that depends on something Terraform has not created yet:

```hcl
# This FAILS - subnet IDs are not known until the VPC is created
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
}

resource "aws_instance" "servers" {
  # ERROR: These subnet IDs are not known at plan time
  for_each = toset(aws_subnet.private[*].id)

  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
  subnet_id     = each.value
}
```

**Fix**: Use values that are known at plan time. Instead of using the computed subnet IDs, use an index-based approach:

```hcl
# Use a map with known keys instead of computed values
locals {
  subnets = {
    "private-0" = { index = 0 }
    "private-1" = { index = 1 }
    "private-2" = { index = 2 }
  }
}

resource "aws_subnet" "private" {
  for_each = local.subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, each.value.index)
  availability_zone = data.aws_availability_zones.available.names[each.value.index]
}

resource "aws_instance" "servers" {
  for_each = local.subnets

  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.private[each.key].id
}
```

## Error: for_each Value Must Be a Map or Set of Strings

```
Error: Invalid for_each argument

on main.tf line 10, in resource "aws_iam_user" "users":
  10:   for_each = ["alice", "bob", "charlie"]

The given "for_each" argument value is unsuitable: the "for_each" argument
must be a map, or set of strings, and you have provided a value of type
tuple.
```

Terraform does not accept lists (tuples) directly in `for_each`. It needs a set or a map.

**Fix**: Convert your list to a set:

```hcl
variable "user_names" {
  type    = list(string)
  default = ["alice", "bob", "charlie"]
}

# WRONG - list is not accepted
resource "aws_iam_user" "users" {
  for_each = var.user_names  # Error: this is a list
  name     = each.value
}

# RIGHT - convert to a set
resource "aws_iam_user" "users" {
  for_each = toset(var.user_names)
  name     = each.value
}

# ALSO RIGHT - use a map for more complex data
variable "users" {
  type = map(object({
    email = string
    team  = string
  }))
  default = {
    alice   = { email = "alice@example.com", team = "platform" }
    bob     = { email = "bob@example.com", team = "backend" }
    charlie = { email = "charlie@example.com", team = "frontend" }
  }
}

resource "aws_iam_user" "users" {
  for_each = var.users
  name     = each.key
  tags = {
    Email = each.value.email
    Team  = each.value.team
  }
}
```

## Error: for_each Set Includes Values Derived from Resource Attributes

```
Error: Invalid for_each argument

The "for_each" set includes values derived from resource attributes that
cannot be determined until apply, so Terraform cannot determine the full
set of keys that will identify the instances of this resource.
```

This happens when you transform a computed value into a set for for_each:

```hcl
# FAILS - the data source result depends on apply-time values
data "aws_instances" "existing" {
  filter {
    name   = "tag:Environment"
    values = ["production"]
  }
}

resource "aws_eip" "servers" {
  # ERROR: instance IDs are not known until the data source is read
  for_each = toset(data.aws_instances.existing.ids)
  instance = each.value
}
```

**Fix**: If the data source values are truly dynamic, use a two-step approach with `-target`, or restructure to use known values:

```hcl
# Option 1: Define the servers explicitly
variable "server_names" {
  type    = set(string)
  default = ["web-1", "web-2", "web-3"]
}

resource "aws_instance" "servers" {
  for_each      = var.server_names
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
  tags = {
    Name = each.key
  }
}

resource "aws_eip" "servers" {
  for_each = var.server_names
  instance = aws_instance.servers[each.key].id
}

# Option 2: Use count instead of for_each when dealing with computed values
resource "aws_eip" "servers" {
  count    = length(data.aws_instances.existing.ids)
  instance = data.aws_instances.existing.ids[count.index]
}
```

## Error: for_each with Null or Empty Values

```
Error: Invalid for_each argument

The given "for_each" argument value is unsuitable: "for_each" supports maps
and sets of strings, but you have provided a set containing type bool.
```

This happens when your set contains non-string values or null entries:

```hcl
# WRONG - set contains non-string values
locals {
  ports = toset([80, 443, 8080])  # These are numbers, not strings
}

resource "aws_security_group_rule" "ingress" {
  for_each = local.ports  # Error: set of numbers
  # ...
}
```

**Fix**: Convert values to strings:

```hcl
# Convert numbers to strings
locals {
  ports = toset([for p in [80, 443, 8080] : tostring(p)])
}

resource "aws_security_group_rule" "ingress" {
  for_each          = local.ports
  type              = "ingress"
  from_port         = tonumber(each.value)
  to_port           = tonumber(each.value)
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.web.id
}
```

## Error: for_each with Sensitive Values

```
Error: Invalid for_each argument

Sensitive values, or values derived from sensitive values, cannot be used
as for_each arguments. If used, the sensitive value could be exposed in
the resource's address.
```

You cannot use sensitive values in `for_each` because the keys become part of the resource address, which is shown in logs and the state file.

**Fix**: Remove the sensitive marking or use non-sensitive keys:

```hcl
# WRONG - sensitive variable used in for_each
variable "db_passwords" {
  type      = map(string)
  sensitive = true
}

resource "aws_secretsmanager_secret" "db" {
  for_each = var.db_passwords  # Error: sensitive value
  name     = each.key
}

# RIGHT - separate the keys (non-sensitive) from values (sensitive)
variable "db_names" {
  type = set(string)
  # Not sensitive - these are just names
}

variable "db_passwords" {
  type      = map(string)
  sensitive = true
}

resource "aws_secretsmanager_secret" "db" {
  for_each = var.db_names
  name     = "db-password-${each.key}"
}

resource "aws_secretsmanager_secret_version" "db" {
  for_each      = var.db_names
  secret_id     = aws_secretsmanager_secret.db[each.key].id
  secret_string = var.db_passwords[each.key]  # Sensitive value used here, not in for_each
}
```

## General Debugging Tips

When you hit a for_each error and the cause is not obvious:

```bash
# Use terraform console to test your expressions
terraform console

> toset(var.user_names)
> type(var.servers)
> keys(var.servers)
```

Check what type your variable actually is:

```hcl
# Add a temporary output to debug the type
output "debug_for_each_value" {
  value = var.servers
}
```

```bash
terraform plan -target=output.debug_for_each_value
```

The key principle with `for_each` is simple: the keys must be known at plan time, they must be strings (or a map with string keys), and they cannot be sensitive. If you keep these rules in mind, most for_each errors become easy to diagnose and fix. When in doubt, define your resource set as an explicit variable rather than deriving it from computed values.
