# How to Fix Terraform Known After Apply Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, Planning

Description: Understand and resolve Terraform known after apply issues that block plan-time evaluations, for_each usage, and conditional logic.

---

When running `terraform plan`, you will frequently see the phrase "(known after apply)" next to certain values. This is normal behavior - it means Terraform cannot determine the value until the resource is actually created. But when you try to use one of these unknown values in a context that requires a known value at plan time, things break. This article explains when "known after apply" becomes a problem and how to work around it.

## What "Known After Apply" Means

Many resource attributes are only determined by the cloud provider at creation time. For example:

- An EC2 instance's private IP address
- An RDS instance's endpoint hostname
- A randomly generated password
- A resource's ARN

During `terraform plan`, these values do not exist yet, so Terraform marks them as "(known after apply)":

```text
# aws_instance.web will be created
+ resource "aws_instance" "web" {
    + ami                    = "ami-0c55b159cbfafe1f0"
    + arn                    = (known after apply)
    + id                     = (known after apply)
    + instance_type          = "t3.micro"
    + private_ip             = (known after apply)
    + public_ip              = (known after apply)
  }
```

This is fine for most resource arguments that accept computed values. The problem arises when you try to use these unknown values in places that need to be resolved at plan time.

## Problem 1: for_each with Unknown Values

The `for_each` meta-argument must be fully known at plan time. Terraform needs to know exactly which resource instances to create before it creates anything.

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# This FAILS - the private_ip is not known at plan time
resource "aws_route53_record" "web" {
  for_each = toset([aws_instance.web.private_ip])
  # Error: The "for_each" set includes values derived from resource
  # attributes that cannot be determined until apply

  zone_id = var.zone_id
  name    = "web-${each.key}"
  type    = "A"
  ttl     = 300
  records = [each.key]
}
```

**Fix:** Restructure to avoid depending on unknown values in `for_each`:

```hcl
# Use a known identifier for for_each
resource "aws_route53_record" "web" {
  zone_id = var.zone_id
  name    = "web"
  type    = "A"
  ttl     = 300
  records = [aws_instance.web.private_ip]
  # The records argument accepts unknown values - it will be resolved at apply time
}
```

If you need multiple records:

```hcl
# Use count with a known value instead of for_each with unknown values
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

resource "aws_route53_record" "web" {
  count   = 3
  zone_id = var.zone_id
  name    = "web-${count.index}"
  type    = "A"
  ttl     = 300
  records = [aws_instance.web[count.index].private_ip]
}
```

## Problem 2: count with Unknown Values

Like `for_each`, `count` must be known at plan time:

```hcl
data "aws_instances" "existing" {
  filter {
    name   = "tag:Environment"
    values = ["production"]
  }
}

# This FAILS - the number of instances is not known until the data source is read
resource "aws_eip" "web" {
  count    = length(data.aws_instances.existing.ids)
  instance = data.aws_instances.existing.ids[count.index]
}
```

**Fix:** Use a variable for the count or use `for_each` with known keys:

```hcl
variable "instance_count" {
  type    = number
  default = 3
}

resource "aws_eip" "web" {
  count    = var.instance_count
  instance = aws_instance.web[count.index].id
}
```

Note that data source attributes are usually known after the data source is read, which happens during planning for most data sources. The issue above occurs mainly when the data source itself depends on resources being created in the same apply.

## Problem 3: Conditional Logic with Unknown Values

Using unknown values in conditions that affect resource creation causes problems:

```hcl
# This can fail if the private_ip is used to determine resource creation
resource "aws_security_group_rule" "allow_db" {
  count = aws_instance.web.private_ip != "" ? 1 : 0
  # The condition cannot be evaluated at plan time

  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = ["${aws_instance.web.private_ip}/32"]
  security_group_id = aws_security_group.db.id
}
```

**Fix:** Use a known value for the condition:

```hcl
variable "create_db_rule" {
  type    = bool
  default = true
}

resource "aws_security_group_rule" "allow_db" {
  count = var.create_db_rule ? 1 : 0

  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = ["${aws_instance.web.private_ip}/32"]
  security_group_id = aws_security_group.db.id
}
```

## Problem 4: Module Arguments with Unknown Values

When passing unknown values to module arguments that affect `for_each` or `count` inside the module, the error propagates:

```hcl
module "dns_records" {
  source = "./modules/dns"

  # If the module uses this in for_each internally, it will fail
  record_ips = aws_instance.web[*].private_ip
}
```

**Fix:** Pass the count separately:

```hcl
module "dns_records" {
  source = "./modules/dns"

  record_count = var.instance_count  # Known at plan time
  record_ips   = aws_instance.web[*].private_ip  # Known after apply, but used in records argument
}
```

Inside the module:

```hcl
variable "record_count" {
  type = number
}

variable "record_ips" {
  type = list(string)
}

resource "aws_route53_record" "main" {
  count   = var.record_count  # Uses the known count
  zone_id = var.zone_id
  name    = "server-${count.index}"
  type    = "A"
  ttl     = 300
  records = [var.record_ips[count.index]]  # This is fine - resolved at apply
}
```

## Problem 5: Data Sources Depending on Unknown Values

If a data source depends on a value that is not yet known, it cannot be evaluated during planning:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# This data source cannot run during plan because the instance does not exist yet
data "aws_instance" "web_details" {
  instance_id = aws_instance.web.id
}
```

**Fix:** Usually you do not need a data source for a resource you are creating in the same configuration. Use the resource attributes directly:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# Use the resource attribute directly instead of a data source
output "private_ip" {
  value = aws_instance.web.private_ip
}
```

## Problem 6: Validation Blocks with Unknown Values

Variable validation and precondition/postcondition blocks might reference values that are unknown at plan time:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  lifecycle {
    postcondition {
      condition     = self.public_ip != ""
      error_message = "Instance must have a public IP."
    }
  }
}
```

Postconditions are evaluated after apply, so this is actually fine. But preconditions that reference unknown values from other resources will be deferred:

```hcl
resource "aws_lb_target_group_attachment" "web" {
  target_group_arn = aws_lb_target_group.web.arn
  target_id        = aws_instance.web.id

  lifecycle {
    precondition {
      # This condition is deferred until the instance is created
      condition     = aws_instance.web.private_ip != ""
      error_message = "Instance must have a private IP."
    }
  }
}
```

## Strategies for Working with Unknown Values

### Strategy 1: Separate plan-time and apply-time concerns

Keep your `for_each` keys, `count` values, and conditional logic based on variables and locals that do not depend on resource attributes. Use resource attributes only in regular resource arguments.

### Strategy 2: Use targeted applies

If you need values from one set of resources to plan another, use targeted applies:

```bash
# First, create the instances
terraform apply -target=aws_instance.web

# Now the IPs are known and you can plan the full configuration
terraform plan
```

### Strategy 3: Use -replace instead of tainted resources

When replacing resources, the new values are unknown. Plan accordingly:

```bash
terraform plan -replace=aws_instance.web[0]
```

### Strategy 4: Pre-allocate known values

Instead of letting the cloud provider assign values, pre-allocate them:

```hcl
# Pre-allocate the Elastic IP (known immediately)
resource "aws_eip" "web" {
  domain = "vpc"
}

# Associate it with the instance
resource "aws_eip_association" "web" {
  instance_id   = aws_instance.web.id
  allocation_id = aws_eip.web.id
}

# Now the IP is known at plan time
resource "aws_route53_record" "web" {
  zone_id = var.zone_id
  name    = "web"
  type    = "A"
  ttl     = 300
  records = [aws_eip.web.public_ip]
}
```

## Conclusion

"Known after apply" is a fundamental aspect of how Terraform works. The value genuinely does not exist until the resource is created. The errors only occur when you try to use these unknown values in plan-time contexts like `for_each`, `count`, or certain conditions. The fix is to restructure your configuration so that plan-time decisions use known values (variables, locals, static data) while apply-time values are only used in regular resource arguments where deferred evaluation is supported.
