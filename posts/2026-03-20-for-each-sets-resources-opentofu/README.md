# How to Use for_each with Sets to Create Resources in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, for_each, Set, Infrastructure as Code, DevOps

Description: A guide to using for_each with set values in OpenTofu to create uniquely-keyed resources from a collection of unique values.

## Introduction

`for_each` with a set creates one resource instance for each element in the set, where each element serves as both the key and value. Sets are ideal when you have a collection of unique string identifiers like names, ARNs, or IDs.

## Basic for_each with Set

```hcl
# Create IAM users for a set of names

resource "aws_iam_user" "team" {
  for_each = toset(["alice", "bob", "charlie"])

  name = each.key    # each.key == each.value for sets
  path = "/team/"

  tags = {
    Username = each.value
  }
}

# State addresses:
# aws_iam_user.team["alice"]
# aws_iam_user.team["bob"]
# aws_iam_user.team["charlie"]
```

## Using Set Variables

```hcl
variable "team_members" {
  type        = set(string)
  description = "Set of team member usernames"
  default     = ["alice", "bob", "charlie"]
}

resource "aws_iam_user" "members" {
  for_each = var.team_members

  name = each.value
  path = "/developers/"
}

# Add to group
resource "aws_iam_group_membership" "dev" {
  name  = "dev-team-membership"
  group = aws_iam_group.developers.name

  # Collect all user names from for_each resources
  users = [for user in aws_iam_user.members : user.name]
}
```

## Converting List to Set for for_each

```hcl
variable "instance_names" {
  type    = list(string)
  default = ["web-1", "web-2", "web-3"]
}

resource "aws_instance" "web" {
  # Convert list to set for stable keys
  for_each = toset(var.instance_names)

  ami           = "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
  instance_type = "t3.micro"

  tags = {
    Name = each.key
  }
}
```

## Sets of ARNs

```hcl
variable "kms_key_arns" {
  type        = set(string)
  description = "KMS key ARNs that need grants"
}

resource "aws_kms_grant" "service" {
  for_each = var.kms_key_arns

  name              = "service-grant-${md5(each.value)}"  # Unique name from ARN
  key_id            = each.value
  grantee_principal = aws_iam_role.service.arn

  operations = [
    "Encrypt",
    "Decrypt",
    "GenerateDataKey"
  ]
}
```

## Security Group Ingress Rules with Sets

```hcl
variable "allowed_ip_addresses" {
  type        = set(string)
  description = "IP addresses to allow in security group"
  default     = ["10.0.1.5", "10.0.2.10", "10.0.3.15"]
}

resource "aws_vpc_security_group_ingress_rule" "allowed_ips" {
  for_each = var.allowed_ip_addresses

  security_group_id = aws_security_group.app.id
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "${each.value}/32"  # Each IP as /32

  description = "Allow ${each.value}"
}
```

## Sets with Complex Processing

```hcl
variable "subnets" {
  type = set(string)
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

locals {
  # Process set elements
  subnet_map = {
    for cidr in var.subnets :
    cidr => {
      cidr = cidr
      name = replace(cidr, "/", "-")  # Transform for resource naming
    }
  }
}

resource "aws_subnet" "custom" {
  for_each = local.subnet_map

  vpc_id     = aws_vpc.main.id
  cidr_block = each.value.cidr

  tags = {
    Name = "subnet-${each.value.name}"
  }
}
```

## Referencing Set-based Resources

```hcl
resource "aws_iam_user" "team" {
  for_each = toset(["alice", "bob"])
  name     = each.key
}

# Access specific user
output "alice_arn" {
  value = aws_iam_user.team["alice"].arn
}

# Get all user ARNs
output "all_arns" {
  value = { for k, v in aws_iam_user.team : k => v.arn }
}

# Get as list
output "arn_list" {
  value = [for v in aws_iam_user.team : v.arn]
}
```

## Conclusion

`for_each` with sets is the natural choice for creating resources from unique string identifiers. Unlike `count`, set-based resources maintain stable addresses when elements are added or removed because instances are keyed by value instead of by numeric index. This makes set-based `for_each` ideal for user accounts, security group rules, DNS records, and any resource where each instance has a meaningful, unique identifier.
