# How to Reference count.index in Resource Configuration in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Count, Count.index, HCL, Resource Configuration

Description: Learn how to use count.index in OpenTofu to customize each instance of a count-based resource with unique names, subnet assignments, and configuration values.

## Introduction

When using `count` to create multiple resource instances, `count.index` provides the zero-based index of the current instance. You can use it for naming, for selecting items from lists by position, and for computing instance-specific values.

## Unique Naming with count.index

```hcl
variable "worker_count" {
  type    = number
  default = 3
}

resource "aws_instance" "worker" {
  count = var.worker_count

  ami           = data.aws_ami.worker.id
  instance_type = "c5.large"

  # Human-friendly 1-based names
  tags = {
    Name  = "worker-${count.index + 1}"
    Index = count.index
    Role  = "worker"
  }
}
```

## Distributing Across Subnets with count.index

```hcl
variable "subnet_ids" {
  type = list(string)
}

data "aws_subnet" "selected" {
  count = length(var.subnet_ids)
  id    = var.subnet_ids[count.index]
}

resource "aws_instance" "app" {
  count = 6  # 6 instances distributed across the provided subnets

  ami           = data.aws_ami.app.id
  instance_type = "t3.medium"

  # Distribute round-robin across available subnets using modulo
  subnet_id = var.subnet_ids[count.index % length(var.subnet_ids)]

  tags = {
    Name = "app-${count.index + 1}"
    AZ   = data.aws_subnet.selected[count.index % length(var.subnet_ids)].availability_zone
  }
}
```

## Per-Instance Configuration from Lists

```hcl
variable "hostnames" {
  type    = list(string)
  default = ["web-01", "web-02", "web-03"]
}

variable "private_ips" {
  type    = list(string)
  default = ["10.0.1.10", "10.0.1.11", "10.0.1.12"]
}

resource "aws_instance" "web" {
  count = length(var.hostnames)

  ami           = data.aws_ami.web.id
  instance_type = "t3.small"
  subnet_id     = var.subnet_id
  private_ip    = var.private_ips[count.index]

  tags = {
    Name     = var.hostnames[count.index]
    Hostname = var.hostnames[count.index]
  }
}

# Create a Route53 record for each instance

resource "aws_route53_record" "web" {
  count = length(var.hostnames)

  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.hostnames[count.index]
  type    = "A"
  ttl     = 60
  records = [aws_instance.web[count.index].private_ip]
}
```

## Count.Index for Port Offsets

```hcl
variable "shard_count" {
  type    = number
  default = 4
}

variable "base_port" {
  type    = number
  default = 6379  # Redis base port
}

resource "aws_vpc_security_group_ingress_rule" "redis_shards" {
  count = var.shard_count

  security_group_id = aws_security_group.redis.id
  cidr_ipv4         = "10.0.0.0/8"
  from_port         = var.base_port + count.index
  to_port           = var.base_port + count.index
  ip_protocol       = "tcp"
  description       = "Redis shard ${count.index} port ${var.base_port + count.index}"
}
```

## Interleaving Outputs from count-Based Resources

```hcl
output "worker_details" {
  value = [
    for i in range(var.worker_count) : {
      id         = aws_instance.worker[i].id
      private_ip = aws_instance.worker[i].private_ip
      az         = aws_instance.worker[i].availability_zone
      name       = "worker-${i + 1}"
    }
  ]
}
```

## Conclusion

`count.index` is the mechanism that makes count-based resources individually configurable. Use modulo (`%`) for round-robin distribution across subnets or AZs, list indexing for per-instance configuration from ordered lists, and arithmetic for sequential port numbers or naming offsets. Add 1 to `count.index` when you want human-readable 1-based names.
