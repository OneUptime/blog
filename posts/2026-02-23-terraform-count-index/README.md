# How to Use count.index in Terraform Resource Creation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Count, Loops, Infrastructure as Code

Description: Learn how to use count.index in Terraform to create multiple resource instances with unique names, configurations, and references based on their index position.

---

The `count` meta-argument lets you create multiple instances of a resource by specifying a number. Inside that resource block, `count.index` gives you the zero-based index of the current instance. It is the simplest way to create several similar resources in Terraform.

This post covers how `count.index` works, practical patterns for using it, and when to choose `count` versus `for_each`.

## Basic count.index Usage

When you set `count = 3`, Terraform creates three instances of the resource. `count.index` is `0` for the first, `1` for the second, and `2` for the third.

```hcl
# Create 3 EC2 instances
resource "aws_instance" "server" {
  count = 3

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    # count.index is 0, 1, 2
    Name = "server-${count.index}"
  }
}
```

This produces three instances named `server-0`, `server-1`, and `server-2`.

## Using count.index with Lists

A very common pattern is using `count.index` to index into a list:

```hcl
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

# Create one subnet per AZ
resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.subnet_cidrs[count.index]           # index into CIDR list
  availability_zone = var.availability_zones[count.index]     # index into AZ list

  tags = {
    Name = "public-${var.availability_zones[count.index]}"
  }
}
```

The `length()` function ensures the count matches the list size, so you do not hardcode a number that might get out of sync.

## Generating Unique Values with count.index

You can use `count.index` in expressions to generate unique values:

```hcl
# Generate CIDR blocks using count.index
resource "aws_subnet" "private" {
  count = 3

  vpc_id     = aws_vpc.main.id
  cidr_block = cidrsubnet("10.0.0.0/16", 8, count.index + 10)  # 10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24

  tags = {
    Name = "private-subnet-${count.index}"
  }
}

# Assign different ports
resource "aws_security_group_rule" "app_ports" {
  count = 3

  type              = "ingress"
  from_port         = 8080 + count.index  # 8080, 8081, 8082
  to_port           = 8080 + count.index
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/16"]
  security_group_id = aws_security_group.app.id
}
```

## Conditional Resource Creation with count

Setting `count = 0` means the resource is not created at all. This is the standard pattern for conditional resources:

```hcl
variable "create_monitoring" {
  type    = bool
  default = false
}

# Only create the alarm if monitoring is enabled
resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = var.create_monitoring ? 1 : 0

  alarm_name          = "high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
}

# When count is 0 or 1, reference with [0]
output "alarm_arn" {
  value = var.create_monitoring ? aws_cloudwatch_metric_alarm.cpu[0].arn : null
}
```

## Referencing count Resources

Resources created with `count` are referenced by index:

```hcl
resource "aws_instance" "server" {
  count = 3

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# Reference a specific instance
output "first_server_id" {
  value = aws_instance.server[0].id
}

# Reference all instances with splat
output "all_server_ids" {
  value = aws_instance.server[*].id
}

output "all_private_ips" {
  value = aws_instance.server[*].private_ip
}
```

The splat expression `[*]` collects an attribute from all instances into a list.

## Passing count.index to Other Resources

When resources depend on count-based resources, you match up the indices:

```hcl
# Create 3 instances
resource "aws_instance" "server" {
  count = 3

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public[count.index].id  # match subnet to instance

  tags = {
    Name = "server-${count.index}"
  }
}

# Create an EIP for each instance
resource "aws_eip" "server" {
  count = 3

  instance = aws_instance.server[count.index].id  # match EIP to instance
  domain   = "vpc"

  tags = {
    Name = "eip-server-${count.index}"
  }
}
```

## Using count.index with Lookup Patterns

You can use `count.index` to select values from a list of maps:

```hcl
variable "server_configs" {
  type = list(object({
    name          = string
    instance_type = string
    role          = string
  }))
  default = [
    { name = "web",    instance_type = "t3.micro",  role = "frontend" },
    { name = "api",    instance_type = "t3.small",  role = "backend" },
    { name = "worker", instance_type = "t3.medium", role = "processing" },
  ]
}

resource "aws_instance" "server" {
  count = length(var.server_configs)

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.server_configs[count.index].instance_type

  tags = {
    Name = var.server_configs[count.index].name
    Role = var.server_configs[count.index].role
  }
}
```

## The Reordering Problem

The biggest drawback of `count` is that it is index-based. If you remove an item from the middle of a list, all subsequent indices shift, and Terraform wants to destroy and recreate those resources.

```hcl
# Original list
variable "servers" {
  default = ["web", "api", "worker"]
  # index 0 = web, index 1 = api, index 2 = worker
}

# If you remove "api" from the list:
# default = ["web", "worker"]
# Now index 0 = web, index 1 = worker
# Terraform thinks index 1 changed from "api" to "worker"
# and index 2 ("worker") was removed
# Result: unnecessary destroy and recreate
```

This is why `for_each` is generally preferred when the collection might change. With `for_each`, resources are keyed by name, not position.

## When to Use count vs for_each

Use **count** when:
- You need a specific number of identical resources
- You are doing conditional creation (count = 0 or 1)
- The list order is stable and items will not be removed from the middle

Use **for_each** when:
- Each instance has a meaningful identifier
- Items might be added or removed independently
- You want stable resource addresses that do not shift

```hcl
# Good use of count - creating N identical replicas
resource "aws_instance" "replica" {
  count         = var.replica_count
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# Good use of for_each - named resources that may change
resource "aws_iam_user" "team" {
  for_each = toset(var.team_members)
  name     = each.key
}
```

## count.index in Modules

Modules also support `count`, and `count.index` works the same way:

```hcl
module "service" {
  count  = length(var.services)
  source = "./modules/ecs-service"

  service_name = var.services[count.index].name
  port         = var.services[count.index].port
}

# Reference a specific module instance
output "first_service_url" {
  value = module.service[0].service_url
}
```

## Wrapping Up

`count.index` is the zero-based index that Terraform provides when you use the `count` meta-argument. It lets you differentiate between resource instances, index into lists, generate unique values, and conditionally create resources. While `for_each` is often the better choice for named resources, `count` and `count.index` remain essential tools - especially for creating N identical copies of something or toggling resources on and off.

For the named-key approach, see [How to Use each.key and each.value in Terraform for_each](https://oneuptime.com/blog/post/2026-02-23-terraform-for-each-each-key-each-value/view).
