# How to Use Splat Expressions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HCL, Splat Expressions, Collection, Expression, Infrastructure as Code, DevOps

Description: A guide to using splat expressions in OpenTofu to extract attributes from all elements of a list or set of resources.

## Introduction

Splat expressions in OpenTofu provide a concise way to extract a specific attribute or nested value from all instances of a count-based resource or all elements in a list, set, or tuple. When used with those collection values, the `[*]` splat operator is equivalent to a for expression that iterates over all elements and applies the attribute or index operations on its right.

## Basic Splat Expression

```hcl
resource "aws_instance" "web" {
  count         = 3
  ami           = var.ami_id
  instance_type = "t3.micro"
}

# Splat: get all public IPs as a list

output "all_public_ips" {
  value = aws_instance.web[*].public_ip
  # Equivalent to: [for instance in aws_instance.web : instance.public_ip]
}

output "all_instance_ids" {
  value = aws_instance.web[*].id
}
```

## Splat with for_each Resources

```hcl
resource "aws_iam_user" "team" {
  for_each = toset(["alice", "bob", "charlie"])
  name     = each.key
}

# Note: for_each resources don't support splat [*]
# Use values() + splat or a for expression instead

# Using values() to get all values from map
output "all_arns" {
  value = values(aws_iam_user.team)[*].arn
}

# Or use a for expression
output "all_arns_for" {
  value = [for user in aws_iam_user.team : user.arn]
}
```

## Nested Attribute Splat

```hcl
resource "aws_eks_cluster" "main" {
  count = 2
  name  = "cluster-${count.index}"
  role_arn = aws_iam_role.eks[count.index].arn

  vpc_config {
    subnet_ids = var.subnet_ids
  }
}

# Access nested attributes with splat
output "cluster_endpoints" {
  value = aws_eks_cluster.main[*].endpoint
}

output "cluster_ca_data" {
  # Access nested block attributes
  value = aws_eks_cluster.main[*].certificate_authority[0].data
}
```

## Splat with Data Sources

```hcl
data "aws_subnet" "public" {
  count = length(var.public_subnet_ids)
  id    = var.public_subnet_ids[count.index]
}

output "public_subnet_cidrs" {
  value = data.aws_subnet.public[*].cidr_block
}

output "public_subnet_azs" {
  value = data.aws_subnet.public[*].availability_zone
}
```

## Using Splat in Resource Arguments

```hcl
resource "aws_instance" "backend" {
  count         = 3
  ami           = var.ami_id
  instance_type = "t3.small"
}

# Pass all instance IDs to a target group
resource "aws_lb_target_group_attachment" "backend" {
  count            = length(aws_instance.backend)
  target_group_arn = aws_lb_target_group.app.arn
  target_id        = aws_instance.backend[count.index].id
  port             = 8080
}

# Alternative: use splat to get all IDs
locals {
  backend_ids = aws_instance.backend[*].id
}
```

## Legacy Splat Operator

```hcl
# Legacy splat uses .*.attribute syntax (less common)
resource "aws_instance" "web" {
  count = 3
  ami   = var.ami_id
  instance_type = "t3.micro"
}

# Legacy syntax (still works but [*] is preferred)
output "legacy_ips" {
  value = aws_instance.web.*.public_ip
}

# Modern syntax (preferred)
output "modern_ips" {
  value = aws_instance.web[*].public_ip
}
```

## Splat in Security Group Rules

```hcl
resource "aws_instance" "backend" {
  count         = var.instance_count
  ami           = var.ami_id
  instance_type = "t3.micro"
  private_ip    = cidrhost(aws_subnet.private.cidr_block, count.index + 10)
}

resource "aws_security_group_rule" "allow_backend" {
  type              = "ingress"
  from_port         = 8080
  to_port           = 8080
  protocol          = "tcp"
  security_group_id = aws_security_group.lb.id
  # Get all private IPs and format as CIDR blocks
  cidr_blocks       = [for ip in aws_instance.backend[*].private_ip : "${ip}/32"]
}
```

## Combining Splat with Functions

```hcl
resource "aws_instance" "web" {
  count         = 5
  ami           = var.ami_id
  instance_type = "t3.micro"
}

output "instance_summary" {
  value = {
    count       = length(aws_instance.web[*].id)
    all_ids     = aws_instance.web[*].id
    first_ip    = aws_instance.web[0].public_ip
    all_ips     = join(", ", aws_instance.web[*].public_ip)
    sorted_ids  = sort(aws_instance.web[*].id)
  }
}
```

## Splat vs For Expression

```hcl
resource "aws_instance" "web" {
  count         = 3
  ami           = var.ami_id
  instance_type = "t3.micro"
}

# Splat: concise for attribute and index access
output "ips_splat" {
  value = aws_instance.web[*].public_ip
}

# For expression: more flexible, can transform values
output "ips_for" {
  value = [for i in aws_instance.web : "Server at ${i.public_ip}"]
}
```

## Conclusion

Splat expressions provide a concise shorthand for extracting attributes or nested values from all instances of a count-based resource or a list, set, or tuple. The `[*]` operator is the modern syntax, preferred over the legacy `.*`. For `for_each` resources, use `values()` combined with splat or a for expression, as the map structure doesn't directly support the splat operator. Splat expressions are most useful for extracting attribute lists for outputs, passing to other resources, or using with functions like `join()`, `sort()`, and `length()`.
