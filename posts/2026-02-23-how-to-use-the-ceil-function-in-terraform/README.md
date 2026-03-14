# How to Use the ceil Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Ceil Function, Math, HCL, Infrastructure as Code, Numeric Functions

Description: Learn how to use the ceil function in Terraform to round numbers up to the nearest integer and apply it to real infrastructure sizing and capacity planning.

---

When you need to ensure you have "enough" of something in Terraform - enough instances, enough storage, enough subnets - rounding up is almost always the right choice. You do not want to round down and end up one server short. The `ceil` function rounds a number up to the nearest whole integer, making it perfect for capacity and resource calculations.

## What Is the ceil Function?

The `ceil` function takes a numeric value and returns the smallest integer that is greater than or equal to the input. In other words, it always rounds up.

```hcl
# ceil(number)
# Rounds up to nearest integer
ceil(4.1)  # Returns: 5
ceil(4.9)  # Returns: 5
ceil(4.0)  # Returns: 4
ceil(-4.1) # Returns: -4
```

## Playing with terraform console

```hcl
# Launch with: terraform console

# Rounds up fractional numbers
> ceil(1.1)
2

> ceil(1.9)
2

> ceil(1.5)
2

# Whole numbers are unchanged
> ceil(5)
5

> ceil(0)
0

# Negative numbers round toward zero
> ceil(-2.3)
-2

> ceil(-2.9)
-2

# Very small fractions still round up
> ceil(0.001)
1

> ceil(0.0)
0

# Works with division results
> ceil(10 / 3)
4

> ceil(7 / 2)
4
```

## Calculating Instance Count from Capacity Requirements

The most common use of `ceil` is figuring out how many instances you need to meet a capacity target:

```hcl
variable "total_requests_per_second" {
  type    = number
  default = 5000
}

variable "requests_per_instance" {
  type    = number
  default = 750
}

locals {
  # Calculate how many instances we need
  # ceil ensures we always have enough capacity
  required_instances = ceil(var.total_requests_per_second / var.requests_per_instance)
  # 5000 / 750 = 6.67 -> ceil = 7
}

resource "aws_autoscaling_group" "web" {
  name                = "web-asg"
  min_size            = local.required_instances
  max_size            = local.required_instances * 2
  desired_capacity    = local.required_instances
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "web-server"
    propagate_at_launch = true
  }
}

output "instance_count" {
  value = "Need ${local.required_instances} instances to handle ${var.total_requests_per_second} req/s"
  # Output: "Need 7 instances to handle 5000 req/s"
}
```

If you used `floor` instead, you would get 6 instances handling only 4500 requests per second - falling 500 short of your target.

## Distributing Resources Across Availability Zones

When spreading resources evenly across AZs, `ceil` ensures no AZ gets shortchanged:

```hcl
variable "total_instances" {
  type    = number
  default = 10
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

locals {
  az_count = length(var.availability_zones)

  # Minimum instances per AZ (rounded up so total is met)
  instances_per_az = ceil(var.total_instances / local.az_count)
  # 10 / 3 = 3.33 -> ceil = 4 per AZ

  # Note: this means total capacity might exceed the minimum
  actual_total = local.instances_per_az * local.az_count
  # 4 * 3 = 12 (2 more than requested minimum)
}

resource "aws_instance" "app" {
  count         = local.instances_per_az * local.az_count
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"

  availability_zone = var.availability_zones[count.index % local.az_count]

  tags = {
    Name = "app-${count.index}"
    AZ   = var.availability_zones[count.index % local.az_count]
  }
}

output "capacity_info" {
  value = "${local.instances_per_az} instances per AZ across ${local.az_count} AZs = ${local.actual_total} total"
}
```

## Sizing Storage Volumes

Storage requirements often involve converting between units, and `ceil` prevents undersizing:

```hcl
variable "data_size_mb" {
  type    = number
  default = 15360  # 15 GB in MB
}

variable "growth_factor" {
  type    = number
  default = 1.5  # 50% headroom
}

locals {
  # Convert MB to GB and round up
  required_gb = ceil(var.data_size_mb / 1024)
  # 15360 / 1024 = 15 (exact in this case)

  # Add growth headroom and round up
  provisioned_gb = ceil(local.required_gb * var.growth_factor)
  # 15 * 1.5 = 22.5 -> ceil = 23
}

resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = local.provisioned_gb
  type              = "gp3"

  tags = {
    Name = "data-volume"
  }
}

output "storage_sizing" {
  value = "Raw need: ${local.required_gb} GB, Provisioned (with growth): ${local.provisioned_gb} GB"
}
```

## Calculating Batch Sizes

When processing items in batches, `ceil` tells you how many batches you need:

```hcl
variable "total_items" {
  type    = number
  default = 1000
}

variable "batch_size" {
  type    = number
  default = 75
}

locals {
  # How many batches to process all items?
  num_batches = ceil(var.total_items / var.batch_size)
  # 1000 / 75 = 13.33 -> ceil = 14 batches
}

output "batch_info" {
  value = "${var.total_items} items in batches of ${var.batch_size} = ${local.num_batches} batches"
}
```

## Subnet CIDR Calculations

When figuring out how many subnet bits you need for a given number of subnets, `ceil` with log calculations is the right approach:

```hcl
variable "desired_subnets" {
  type    = number
  default = 5
}

locals {
  # How many bits do we need to address the desired number of subnets?
  # log2(5) = 2.32, ceil = 3 bits, which gives us 8 possible subnets
  newbits = ceil(log(var.desired_subnets, 2))
  actual_subnets = pow(2, local.newbits)
}

output "subnet_bits" {
  value = "Need ${local.newbits} bits for ${var.desired_subnets} subnets (${local.actual_subnets} available)"
  # Output: "Need 3 bits for 5 subnets (8 available)"
}
```

## Scaling with Percentages

When computing scale-up targets based on percentages, `ceil` prevents rounding down to the same value:

```hcl
variable "current_count" {
  type    = number
  default = 3
}

variable "scale_up_percentage" {
  type    = number
  default = 50  # Scale up by 50%
}

locals {
  # Calculate the new target count
  raw_target = var.current_count * (1 + var.scale_up_percentage / 100)
  target_count = ceil(local.raw_target)
  # 3 * 1.5 = 4.5 -> ceil = 5
}

output "scaling" {
  value = "Scaling from ${var.current_count} to ${local.target_count} instances (${var.scale_up_percentage}% increase)"
}
```

## ceil vs floor vs round

Here is a quick comparison of the three rounding functions:

```hcl
locals {
  value = 4.3

  # ceil - always rounds up
  ceiling = ceil(local.value)    # 5

  # floor - always rounds down
  floored = floor(local.value)   # 4

  # round has no built-in, but you can simulate it:
  # Add 0.5 then floor, or use the formula:
  rounded = floor(local.value + 0.5)  # 4
}
```

The general rule: use `ceil` when you need "at least this many" (capacity planning), use `floor` when you need "at most this many" (budget constraints), and use rounding when you want the nearest value.

## Combining ceil with max

A common pattern is using `ceil` with `max` to enforce minimum values:

```hcl
variable "user_count" {
  type    = number
  default = 25
}

variable "users_per_server" {
  type    = number
  default = 10
}

locals {
  # Calculate needed servers, but ensure at least 2 for redundancy
  calculated = ceil(var.user_count / var.users_per_server)
  server_count = max(local.calculated, 2)
}

output "servers" {
  value = "Need ${local.server_count} servers for ${var.user_count} users"
}
```

## Pagination Calculations

When working with APIs or displays that paginate results, `ceil` calculates total pages:

```hcl
variable "total_records" {
  type    = number
  default = 237
}

variable "page_size" {
  type    = number
  default = 25
}

locals {
  total_pages = ceil(var.total_records / var.page_size)
  # 237 / 25 = 9.48 -> ceil = 10 pages
}

output "pagination" {
  value = "${var.total_records} records across ${local.total_pages} pages of ${var.page_size}"
}
```

## Summary

The `ceil` function rounds a number up to the nearest integer, and it is the right choice whenever "not enough" is worse than "a little too much." In infrastructure, that covers most sizing calculations - instance counts, storage volumes, batch sizes, subnet planning, and scaling targets. Remember that `ceil` rounds negative numbers toward zero (so `ceil(-2.3)` is `-2`, not `-3`), and whole numbers pass through unchanged. Pair it with `max` for minimum guarantees and with `floor` when you need the complementary "round down" behavior.

For more Terraform math functions, see our posts on the [floor function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-floor-function-in-terraform/view) and the [abs function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-abs-function-in-terraform/view).
