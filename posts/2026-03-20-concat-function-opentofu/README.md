# How to Use the concat Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, concat, List Functions, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the concat function in OpenTofu to combine multiple lists into a single list.

---

`concat()` takes two or more lists and returns a new list containing all the elements from each list in order.

---

## Syntax

```hcl
concat(list1, list2, ...)
```

---

## Basic Examples

```hcl
locals {
  list_a   = ["a", "b", "c"]
  list_b   = ["d", "e"]
  list_c   = ["f"]

  combined = concat(local.list_a, local.list_b, local.list_c)
  # ["a", "b", "c", "d", "e", "f"]
}
```

---

## Combining Security Group IDs

```hcl
variable "base_security_groups" {
  type    = list(string)
  default = ["sg-base1", "sg-base2"]
}

variable "extra_security_groups" {
  type    = list(string)
  default = []
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  # Combine required and optional security groups
  vpc_security_group_ids = concat(
    var.base_security_groups,
    var.extra_security_groups,
    [aws_security_group.app.id]
  )
}
```

---

## Merging Subnet Lists

```hcl
resource "aws_subnet" "public_primary" {
  count  = 3
  vpc_id = aws_vpc.main.id
  # ...
}

resource "aws_subnet" "public_secondary" {
  count  = 3
  vpc_id = aws_vpc.main.id
  # ...
}

resource "aws_lb" "app" {
  name     = "app-lb"
  internal = false
  subnets  = concat(aws_subnet.public_primary[*].id, aws_subnet.public_secondary[*].id)
}
```

---

## Conditional List Merging

```hcl
variable "additional_policies" {
  type    = list(string)
  default = []
}

variable "enable_admin" {
  type    = bool
  default = false
}

locals {
  base_policies  = ["arn:aws:iam::aws:policy/ReadOnlyAccess"]
  admin_policies = var.enable_admin ? ["arn:aws:iam::aws:policy/AdministratorAccess"] : []

  all_policies = concat(
    local.base_policies,
    local.admin_policies,
    var.additional_policies
  )
}
```

---

## Building IAM Policy Lists

```hcl
locals {
  required_actions = [
    "s3:GetObject",
    "s3:ListBucket",
  ]

  write_actions = [
    "s3:PutObject",
    "s3:DeleteObject",
  ]

  all_actions = var.read_only ? local.required_actions : concat(
    local.required_actions,
    local.write_actions
  )
}
```

---

## concat vs tolist and merge

```hcl
locals {
  # concat: for lists
  combined_list = concat(["a", "b"], ["c", "d"])

  # merge: for maps and objects (not lists)
  combined_map = merge({ a = 1 }, { b = 2 })

  # tolist on a set before concat (resulting order is undefined)
  set_as_list = tolist(toset(["x", "y", "z"]))
  with_more   = concat(local.set_as_list, ["a"])
}
```

---

## Summary

`concat()` combines multiple lists into a single ordered list. Use it to merge security group IDs, subnet lists, policy ARNs, and any other list-type resource arguments. It preserves order and allows duplicates. For merging maps or objects, use `merge()` instead. Combine with conditional expressions to add optional lists only when needed.
