# How to Use the chunklist Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Chunklist, List Functions, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the chunklist function in OpenTofu to split a large list into smaller sub-lists of a specified maximum size.

---

`chunklist()` divides a list into multiple sublists, each of maximum specified size. The last sublist may be smaller if the list doesn't divide evenly. This is useful for batch processing or distributing items into groups.

---

## Syntax

```hcl
chunklist(list, size)
```

Returns a list of lists, where each inner list has at most `size` elements.

---

## Basic Examples

```hcl
locals {
  items  = ["a", "b", "c", "d", "e", "f", "g"]

  chunks = chunklist(local.items, 3)
  # [["a", "b", "c"], ["d", "e", "f"], ["g"]]
  # Last chunk is smaller (only "g")

  pairs  = chunklist(local.items, 2)
  # [["a", "b"], ["c", "d"], ["e", "f"], ["g"]]
}
```

---

## Batch Processing IAM Users

```hcl
variable "iam_users" {
  type = list(string)
  default = ["user1", "user2", "user3", "user4", "user5", "user6", "user7", "user8", "user9", "user10"]
}

locals {
  # Group IAM user names into batches of 5 for downstream processing
  user_batches = chunklist(var.iam_users, 5)
  # [["user1", "user2", "user3", "user4", "user5"], ["user6", "user7", "user8", "user9", "user10"]]
}

output "batch_count" {
  value = length(local.user_batches)   # 2
}
```

---

## Distributing Instances Across Regions

```hcl
variable "instance_ids" {
  type    = list(string)
  default = ["i-1", "i-2", "i-3", "i-4", "i-5", "i-6"]
}

variable "regions" {
  type    = list(string)
  default = ["us-east-1", "us-west-2", "eu-west-1"]
}

locals {
  instances_per_region = ceil(length(var.instance_ids) / length(var.regions))

  # Split instance IDs into regional groups
  regional_instances = chunklist(var.instance_ids, local.instances_per_region)
}

output "region_assignments" {
  value = zipmap(var.regions, local.regional_instances)
}
```

---

## Creating Batch Announcements

```hcl
variable "notification_recipients" {
  type    = list(string)
  default = ["user1@example.com", "user2@example.com", "user3@example.com", "user4@example.com", "user5@example.com"]
}

locals {
  # Group recipients into batches of 10 for downstream notification processing
  recipient_batches = chunklist(var.notification_recipients, 10)
}
```

---

## Iterating Over Chunks

```hcl
variable "certificates" {
  type    = list(string)
  default = ["cert-1", "cert-2", "cert-3", "cert-4", "cert-5"]
}

locals {
  cert_chunks = chunklist(var.certificates, 2)
  # [["cert-1", "cert-2"], ["cert-3", "cert-4"], ["cert-5"]]
}

# Process each chunk with a for expression
output "certificate_batches" {
  value = {
    for index, chunk in local.cert_chunks : "batch-${index + 1}" => chunk
  }
}
```

---

## Accessing Individual Chunks

```hcl
locals {
  all_subnets = ["subnet-1", "subnet-2", "subnet-3", "subnet-4", "subnet-5", "subnet-6"]
  subnet_groups = chunklist(local.all_subnets, 3)
  # [["subnet-1", "subnet-2", "subnet-3"], ["subnet-4", "subnet-5", "subnet-6"]]

  primary_subnets   = local.subnet_groups[0]   # First group
  secondary_subnets = local.subnet_groups[1]   # Second group
}
```

---

## Summary

`chunklist(list, size)` divides a list into sublists of at most `size` elements. Use it to batch large lists for APIs with limits, distribute items into groups, or create even partitions of a dataset. The last chunk may be smaller than `size`. Access individual chunks by index and use `length(chunklist(list, size))` to get the total number of chunks.
