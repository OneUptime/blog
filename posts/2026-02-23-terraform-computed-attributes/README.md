# How to Handle Resources with Computed Attributes in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Computed Attributes, Resource Management, Infrastructure as Code, Planning

Description: Learn how to work with computed attributes in Terraform - values that are only known after resource creation - and strategies for handling them in your configurations.

---

Many resource attributes in Terraform are not known until the resource actually exists. An EC2 instance's public IP, an S3 bucket's ARN, a database's endpoint - these are all computed by the cloud provider during creation. Terraform calls these "computed attributes" and they introduce specific challenges when writing configurations, especially around dependencies and plan output interpretation.

This guide explains what computed attributes are, how they affect your workflow, and practical strategies for dealing with them.

## What Are Computed Attributes?

Computed attributes are resource properties that Terraform cannot determine until the resource is created (or updated) by the cloud provider. They are calculated server-side, not defined in your configuration.

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

output "instance_details" {
  value = {
    # These are computed attributes - unknown until the instance exists
    id         = aws_instance.web.id
    arn        = aws_instance.web.arn
    public_ip  = aws_instance.web.public_ip
    private_ip = aws_instance.web.private_ip

    # These are specified in config - known during plan
    ami           = aws_instance.web.ami
    instance_type = aws_instance.web.instance_type
  }
}
```

During `terraform plan`, computed attributes show as `(known after apply)`:

```
# aws_instance.web will be created
+ resource "aws_instance" "web" {
    + ami                    = "ami-0c55b159cbfafe1f0"
    + arn                    = (known after apply)
    + id                     = (known after apply)
    + instance_type          = "t3.micro"
    + public_ip              = (known after apply)
    + private_ip             = (known after apply)
  }
```

## How Computed Attributes Affect Dependencies

When resource B uses a computed attribute from resource A, Terraform knows it must create A first. But it cannot fully evaluate B's configuration during planning:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# This security group rule depends on the instance's private IP
# which is not known until the instance is created
resource "aws_security_group_rule" "allow_web" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["${aws_instance.web.private_ip}/32"]
  security_group_id = aws_security_group.db.id
}
```

In the plan output, the `cidr_blocks` will show as `(known after apply)` because it depends on a computed value.

## Common Computed Attributes by Resource

### EC2 Instances

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# Computed attributes
# aws_instance.web.id                     - Instance ID
# aws_instance.web.arn                    - Instance ARN
# aws_instance.web.public_ip              - Public IP (if assigned)
# aws_instance.web.private_ip             - Private IP
# aws_instance.web.public_dns             - Public DNS name
# aws_instance.web.private_dns            - Private DNS name
# aws_instance.web.instance_state         - Running, stopped, etc.
# aws_instance.web.primary_network_interface_id
```

### S3 Buckets

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}

# Computed attributes
# aws_s3_bucket.data.id                   - Bucket name
# aws_s3_bucket.data.arn                  - Bucket ARN
# aws_s3_bucket.data.bucket_domain_name   - Domain name
# aws_s3_bucket.data.hosted_zone_id       - Route53 zone ID
# aws_s3_bucket.data.region               - Bucket region
```

### RDS Instances

```hcl
resource "aws_db_instance" "main" {
  identifier     = "my-database"
  engine         = "postgres"
  instance_class = "db.r5.large"
}

# Computed attributes
# aws_db_instance.main.endpoint           - Connection endpoint
# aws_db_instance.main.address            - Database hostname
# aws_db_instance.main.port               - Database port
# aws_db_instance.main.arn                - Instance ARN
# aws_db_instance.main.hosted_zone_id     - Route53 zone ID
# aws_db_instance.main.resource_id        - DBI resource ID
```

## Strategies for Working with Computed Attributes

### 1. Accept "Known After Apply" in Plans

For most configurations, `(known after apply)` in your plan is normal and expected. Get comfortable reading plans with these placeholders:

```
# aws_route53_record.web will be created
+ resource "aws_route53_record" "web" {
    + fqdn    = (known after apply)
    + name    = "web.example.com"
    + records = [
        + (known after apply),   # This is the EC2 public IP
      ]
    + type    = "A"
    + zone_id = "Z1234567890"
  }
```

### 2. Use Elastic IPs for Predictable Addressing

When you need to know an IP address before the instance exists:

```hcl
# Allocate the EIP first - its address is computed but known before the instance
resource "aws_eip" "web" {
  domain = "vpc"
}

# Now you can use the EIP address in other resources
resource "aws_route53_record" "web" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "web.example.com"
  type    = "A"
  ttl     = 300
  records = [aws_eip.web.public_ip]  # Known after EIP creation
}

# Associate the EIP with the instance
resource "aws_eip_association" "web" {
  instance_id   = aws_instance.web.id
  allocation_id = aws_eip.web.id
}
```

### 3. Use Data Sources for Pre-Existing Computed Values

If you need computed values from resources that already exist, data sources read them during the plan phase:

```hcl
# This reads the instance during plan - values are known immediately
data "aws_instance" "existing" {
  instance_id = "i-0abc123def456"
}

# These values are known during plan, not "known after apply"
resource "aws_security_group_rule" "allow" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["${data.aws_instance.existing.private_ip}/32"]
  security_group_id = aws_security_group.app.id
}
```

### 4. Use Locals to Compose Computed Values

When you need to build strings from computed attributes, use locals for clarity:

```hcl
resource "aws_db_instance" "main" {
  identifier     = "my-database"
  engine         = "postgres"
  instance_class = "db.r5.large"
  username       = "admin"
  password       = var.db_password
}

locals {
  # These will be "known after apply" during plan
  db_connection_string = "postgresql://admin:${var.db_password}@${aws_db_instance.main.endpoint}/mydb"
  db_host              = aws_db_instance.main.address
  db_port              = aws_db_instance.main.port
}

# Use the composed values in other resources
resource "aws_ssm_parameter" "db_url" {
  name  = "/app/database-url"
  type  = "SecureString"
  value = local.db_connection_string
}
```

### 5. Handle Conditional Logic with Computed Attributes

You cannot use computed attributes in `count` or `for_each` expressions because those need to be known during plan:

```hcl
# BAD: This will not work
# count depends on a computed attribute
resource "aws_eip" "extra" {
  count  = aws_instance.web.associate_public_ip_address ? 0 : 1  # Error!
  domain = "vpc"
}

# GOOD: Use a variable or a known value instead
variable "needs_eip" {
  type    = bool
  default = true
}

resource "aws_eip" "extra" {
  count  = var.needs_eip ? 1 : 0
  domain = "vpc"
}
```

### 6. Use precondition and postcondition for Validation

Validate computed attributes after creation:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  lifecycle {
    postcondition {
      condition     = self.public_ip != ""
      error_message = "Instance must have a public IP address."
    }
  }
}

resource "aws_db_instance" "main" {
  identifier     = "production"
  engine         = "postgres"
  instance_class = "db.r5.large"

  lifecycle {
    postcondition {
      condition     = self.status == "available"
      error_message = "Database instance is not in available state."
    }
  }
}
```

## Computed Attributes and State Refresh

When Terraform refreshes state, computed attributes are updated with current values from the cloud provider:

```bash
# Refresh state to get current computed values
terraform refresh

# Or use plan with refresh (default behavior)
terraform plan
```

If a computed attribute has changed outside of Terraform (someone modified the resource manually), the refresh picks up the new value. This can cause unexpected plan diffs.

## Computed Attributes in Outputs

Outputs that reference computed attributes behave differently depending on whether the resource exists:

```hcl
output "web_url" {
  value = "http://${aws_instance.web.public_ip}"
}
```

- First apply: Shows as `(known after apply)` in plan, real value after apply
- Subsequent plans: Shows the actual value from state
- After destroy: Value is removed from state

## Debugging Computed Attribute Issues

When computed attributes cause problems:

```bash
# See the current state values for a resource
terraform state show aws_instance.web

# See all computed attributes
terraform show

# Check if a value changed unexpectedly
terraform plan -detailed-exitcode
```

## Conclusion

Computed attributes are a fundamental part of working with Terraform. They represent the reality that some values simply do not exist until cloud resources are created. The key is to structure your configuration so that the dependency chain flows naturally - let Terraform handle the ordering, use elastic IPs or pre-allocated resources when you need predictable values during planning, and use data sources for values that already exist. The `(known after apply)` marker in your plan output is not a problem to solve; it is normal behavior that tells you Terraform understands the creation order.

For related patterns, see our guide on [how to handle resource attribute conflicts in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-resource-attribute-conflicts/view).
