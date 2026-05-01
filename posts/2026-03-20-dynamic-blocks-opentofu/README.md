# How to Use Dynamic Blocks in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HCL, Dynamic Blocks, Collection, Infrastructure as Code, DevOps

Description: A guide to using dynamic blocks in OpenTofu to generate repeated configuration blocks from a collection of values.

## Introduction

Dynamic blocks allow you to generate multiple instances of a nested block within a resource by iterating over a collection. Instead of writing multiple identical or similar blocks, you define the pattern once and let OpenTofu generate the blocks from your data. This is particularly useful for security group rules, IAM policies, and any resource that accepts multiple repeated blocks.

## Basic Dynamic Block Syntax

```hcl
# dynamic "block_name" {

#   for_each = collection
#   content {
#     # Use iterator.key and iterator.value
#     # Or iterator.value.attribute for object collections
#   }
# }

variable "ingress_ports" {
  type    = list(number)
  default = [80, 443, 8080]
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.ingress_ports
    content {
      from_port   = ingress.value   # The port number
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}
```

## Dynamic Block with Objects

```hcl
variable "ingress_rules" {
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = [
    {
      port        = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP"
    },
    {
      port        = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS"
    }
  ]
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }
}
```

## Custom Iterator Name

```hcl
variable "routes" {
  type = list(object({
    cidr_block = string
    gateway_id = string
  }))
}

resource "aws_route_table" "main" {
  vpc_id = aws_vpc.main.id

  # Custom iterator name: "route_entry" instead of default "route"
  dynamic "route" {
    for_each = var.routes
    iterator = route_entry  # Explicit iterator name

    content {
      cidr_block = route_entry.value.cidr_block
      gateway_id = route_entry.value.gateway_id
    }
  }
}
```

## Dynamic IAM Policy Statements

```hcl
variable "s3_buckets" {
  type    = list(string)
  default = ["bucket-a", "bucket-b", "bucket-c"]
}

data "aws_iam_policy_document" "s3_access" {
  dynamic "statement" {
    for_each = var.s3_buckets
    content {
      sid    = "AllowBucket${statement.key}"
      effect = "Allow"
      actions = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ]
      resources = [
        "arn:aws:s3:::${statement.value}",
        "arn:aws:s3:::${statement.value}/*"
      ]
    }
  }
}
```

## Dynamic EBS Volumes

```hcl
variable "data_volumes" {
  type = list(object({
    device_name = string
    size        = number
    type        = string
    iops        = number
  }))
  default = [
    { device_name = "/dev/sdb", size = 100, type = "gp3", iops = 3000 },
    { device_name = "/dev/sdc", size = 200, type = "io2", iops = 1000 }
  ]
}

resource "aws_instance" "data" {
  ami           = var.ami_id
  instance_type = "t3.large"

  dynamic "ebs_block_device" {
    for_each = var.data_volumes
    content {
      device_name = ebs_block_device.value.device_name
      volume_size = ebs_block_device.value.size
      volume_type = ebs_block_device.value.type
      iops        = ebs_block_device.value.iops
      encrypted   = true
    }
  }
}
```

## Kubernetes Labels and Dynamic Tolerations

```hcl
variable "pod_labels" {
  type = map(string)
  default = {
    "role"        = "worker"
    "environment" = "prod"
  }
}

variable "tolerations" {
  type = list(object({
    key      = string
    operator = string
    effect   = string
  }))
}

resource "kubernetes_deployment_v1" "app" {
  metadata {
    name   = "myapp"
    labels = var.pod_labels
  }

  spec {
    selector {
      match_labels = var.pod_labels
    }

    template {
      metadata {
        labels = var.pod_labels
      }

      spec {
        container {
          name  = "myapp"
          image = "nginx:1.21.6"
        }

        dynamic "toleration" {
          for_each = var.tolerations
          content {
            key      = toleration.value.key
            operator = toleration.value.operator
            effect   = toleration.value.effect
          }
        }
      }
    }
  }
}
```

## Conditional Dynamic Blocks

```hcl
variable "enable_https" {
  type    = bool
  default = true
}

resource "aws_security_group" "web" {
  name = "web-sg"

  # Only create HTTPS rule when enabled
  dynamic "ingress" {
    for_each = var.enable_https ? [443] : []
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}
```

## Conclusion

Dynamic blocks eliminate repetitive nested block definitions by generating them from collections at plan time. They use a similar `for_each` form to resources, but can iterate over any collection or structural value, including lists, maps, and sets. The iterator variable (defaulting to the block type name, or customizable with `iterator`) provides access to `key` and `value` in each iteration. Use dynamic blocks for security group rules, IAM policy statements, EBS volumes, Kubernetes tolerations, and any other resource with variable numbers of repeated nested blocks. For conditional inclusion of a single optional block, use `for_each = condition ? [1] : []`.
