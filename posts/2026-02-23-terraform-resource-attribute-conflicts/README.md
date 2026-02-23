# How to Handle Resource Attribute Conflicts in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Resource Attributes, Troubleshooting, Infrastructure as Code, Providers

Description: Learn how to identify and resolve resource attribute conflicts in Terraform, including mutually exclusive attributes, deprecated parameters, and provider-specific quirks.

---

Terraform resource attributes sometimes conflict with each other. Two attributes might be mutually exclusive, a nested block might clash with a standalone argument, or a deprecated attribute might overlap with its replacement. These conflicts produce confusing error messages if you do not know what to look for. This guide covers the most common types of attribute conflicts, how to diagnose them, and the patterns for resolving each one.

## Mutually Exclusive Attributes

The most common conflict is two attributes that cannot be set at the same time. The provider enforces this because the underlying API only accepts one or the other.

### Example: EC2 Security Groups

```hcl
# WRONG: Cannot set both security_groups and vpc_security_group_ids
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # These two attributes conflict
  security_groups        = ["web-sg"]
  vpc_security_group_ids = ["sg-0abc123"]
}
```

Error:
```
Error: Conflicting configuration arguments

"security_groups": conflicts with vpc_security_group_ids
"vpc_security_group_ids": conflicts with security_groups
```

Fix: Use one or the other based on your context:

```hcl
# CORRECT: Use vpc_security_group_ids for VPC instances
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  vpc_security_group_ids = ["sg-0abc123"]
}
```

### Example: EBS Volume Types

```hcl
# WRONG: iops is only valid for io1/io2/gp3 volume types
resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = 100
  type              = "gp2"  # gp2 does not support custom IOPS
  iops              = 3000   # Conflict!
}
```

Fix: Match the attribute to the correct volume type:

```hcl
# CORRECT: Use gp3 if you need custom IOPS
resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = 100
  type              = "gp3"
  iops              = 3000
  throughput        = 125
}
```

## Inline Blocks vs Separate Resources

Several AWS resources support configuring related settings either as inline blocks or separate resources. Using both creates a conflict.

### Example: Security Group Rules

```hcl
# WRONG: Mixing inline rules and separate rule resources
resource "aws_security_group" "web" {
  name = "web-sg"

  # Inline ingress rule
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Separate ingress rule for the same security group
resource "aws_security_group_rule" "https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.web.id
}
```

This can cause perpetual diffs where Terraform tries to add and remove rules on every apply. The inline rules and separate resources fight for control.

Fix: Use one approach consistently:

```hcl
# CORRECT: Use only separate rule resources
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Web server security group"

  # No inline rules
}

resource "aws_security_group_rule" "http" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.web.id
}

resource "aws_security_group_rule" "https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.web.id
}
```

### Example: Route Table Routes

```hcl
# WRONG: Mixing inline routes and separate route resources
resource "aws_route_table" "main" {
  vpc_id = aws_vpc.main.id

  # Inline route
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

# Separate route resource
resource "aws_route" "private" {
  route_table_id         = aws_route_table.main.id
  destination_cidr_block = "10.0.0.0/8"
  nat_gateway_id         = aws_nat_gateway.main.id
}

# CORRECT: Use only separate route resources
resource "aws_route_table" "main" {
  vpc_id = aws_vpc.main.id
  # No inline routes
}

resource "aws_route" "public" {
  route_table_id         = aws_route_table.main.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route" "private" {
  route_table_id         = aws_route_table.main.id
  destination_cidr_block = "10.0.0.0/8"
  nat_gateway_id         = aws_nat_gateway.main.id
}
```

## Deprecated Attribute Conflicts

When a provider updates, attributes get deprecated in favor of new ones. Using both the old and new attribute creates a conflict:

```hcl
# WRONG: Using both deprecated and new attributes
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"

  # Deprecated: these were moved to separate resources in AWS provider v4
  versioning {
    enabled = true
  }
}

# This conflicts with the inline versioning block above
resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

Fix: Use only the new approach:

```hcl
# CORRECT: Use separate resources (AWS provider v4+)
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}
```

## Conditional Attribute Conflicts

Sometimes you need to set different attributes based on a condition. Use conditional expressions to avoid conflicts:

```hcl
variable "use_spot" {
  type    = bool
  default = false
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # Only set spot options when using spot instances
  # Setting instance_market_options conflicts with certain other settings
  dynamic "instance_market_options" {
    for_each = var.use_spot ? [1] : []
    content {
      market_type = "spot"
      spot_options {
        max_price = "0.05"
      }
    }
  }
}
```

### Using Dynamic Blocks to Avoid Conflicts

```hcl
variable "enable_encryption" {
  type    = bool
  default = true
}

resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = 100

  # Only include encryption settings when enabled
  # kms_key_id conflicts with encrypted = false
  encrypted  = var.enable_encryption
  kms_key_id = var.enable_encryption ? var.kms_key_id : null
}
```

## ConflictsWith in Provider Schema

Provider developers define conflicts using the `ConflictsWith` schema property. You can find these in the provider source code or documentation. The error message usually tells you which attributes conflict:

```
Error: Conflicting configuration arguments

  "attribute_a": conflicts with attribute_b
```

When you see this error:
1. Read the provider documentation for both attributes
2. Determine which attribute is appropriate for your use case
3. Remove the conflicting attribute

## ExactlyOneOf and AtLeastOneOf Conflicts

Some providers require that exactly one of several attributes is set:

```hcl
# AWS Route requires exactly one target
resource "aws_route" "example" {
  route_table_id         = aws_route_table.main.id
  destination_cidr_block = "0.0.0.0/0"

  # Set EXACTLY ONE of these:
  gateway_id             = aws_internet_gateway.main.id
  # nat_gateway_id       = aws_nat_gateway.main.id     # Do not set both
  # vpc_peering_connection_id = "..."                   # Or this
  # network_interface_id = "..."                        # Or this
}
```

Setting more than one target attribute produces a conflict error.

## Diagnosing Attribute Conflicts

When you encounter an attribute conflict:

```bash
# 1. Read the error message carefully - it names the conflicting attributes
terraform plan 2>&1 | grep -A 5 "Conflicting"

# 2. Check the provider documentation for the resource
# Look for "Conflicts with" in attribute descriptions

# 3. Check the current state for unexpected values
terraform state show aws_instance.web

# 4. If upgrading providers, check the changelog
# Provider changelogs document attribute changes and migrations
```

## Preventing Conflicts with Validation

Use variable validation to prevent conflicts at the input level:

```hcl
variable "volume_config" {
  type = object({
    type       = string
    size       = number
    iops       = optional(number)
    throughput = optional(number)
  })

  validation {
    condition = (
      var.volume_config.type != "gp2" || var.volume_config.iops == null
    )
    error_message = "IOPS cannot be set for gp2 volume type. Use gp3 or io1."
  }

  validation {
    condition = (
      var.volume_config.type != "gp2" || var.volume_config.throughput == null
    )
    error_message = "Throughput cannot be set for gp2 volume type. Use gp3."
  }
}
```

## Conclusion

Attribute conflicts in Terraform are usually the result of mutually exclusive API parameters, mixing inline and separate resource patterns, or using deprecated attributes alongside their replacements. The error messages are generally clear about which attributes conflict, and the fix is almost always to pick one approach and remove the other. When in doubt, check the provider documentation for conflict annotations and prefer separate resources over inline blocks for better modularity and fewer surprises.

For more resource management patterns, see our guide on [how to handle resources that take long to create in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-resources-long-creation-time/view).
