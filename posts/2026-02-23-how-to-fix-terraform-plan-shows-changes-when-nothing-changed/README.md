# How to Fix Terraform Plan Shows Changes When Nothing Changed

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, State Drift, Plan, DevOps

Description: How to fix phantom diffs in Terraform plan where changes are shown even though you did not modify any code or infrastructure settings.

---

You did not change anything in your Terraform code. No infrastructure changes were made. But when you run `terraform plan`, it shows changes. Maybe it wants to update tags, modify a security group rule, or change an attribute you never touched.

This is commonly called "phantom diff" or "plan noise," and it is one of the most annoying Terraform behaviors. Let us figure out where it comes from and how to make it stop.

## Why Terraform Shows Unexpected Changes

There are several reasons this happens:

1. **Cloud provider made changes** - Auto-applied defaults, AWS feature updates, or drift from manual changes
2. **Provider normalization** - The provider reads data differently than it writes it
3. **State file is stale** - The state does not reflect what actually exists
4. **Ordering differences** - Lists or sets that are semantically the same but in different order
5. **Default values being applied** - The cloud provider fills in defaults that differ from what Terraform expects

## Pattern 1: Tags Being Updated

The most common phantom diff:

```text
# aws_instance.web will be updated in-place
~ resource "aws_instance" "web" {
    ~ tags = {
        + "LastModifiedBy" = "terraform"
      }
  }
```

Or tag ordering changes:

```text
~ tags = {
    - "Environment" = "prod" -> null
    + "Environment" = "prod"
  }
```

**Fix**: Check if something external is modifying tags. AWS services sometimes add tags automatically. Use `ignore_changes` for tags you do not control:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"

  tags = {
    Name        = "web-server"
    Environment = "prod"
  }

  lifecycle {
    # Ignore tags that are managed by other systems
    ignore_changes = [
      tags["LastModifiedBy"],
      tags["aws:autoscaling:groupName"],
    ]
  }
}
```

If you want to ignore ALL tag changes from external sources:

```hcl
lifecycle {
  ignore_changes = [tags]
}
```

But be careful with this. It means Terraform will never update tags, even when you intentionally change them in code.

## Pattern 2: Security Group Rule Ordering

Security group rules can show changes even when nothing actually changed:

```text
# aws_security_group.web will be updated in-place
~ resource "aws_security_group" "web" {
    ~ ingress = [
        - {
            cidr_blocks = ["10.0.0.0/8"]
            from_port   = 443
            ...
          },
        - {
            cidr_blocks = ["172.16.0.0/12"]
            from_port   = 443
            ...
          },
        + {
            cidr_blocks = ["172.16.0.0/12"]
            from_port   = 443
            ...
          },
        + {
            cidr_blocks = ["10.0.0.0/8"]
            from_port   = 443
            ...
          },
      ]
  }
```

This is the order of rules changing, not the rules themselves.

**Fix**: Use separate `aws_security_group_rule` resources instead of inline rules:

```hcl
resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  # Do not use inline ingress/egress blocks
}

# Use individual rule resources instead
resource "aws_security_group_rule" "web_from_private" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/8"]
  security_group_id = aws_security_group.web.id
}

resource "aws_security_group_rule" "web_from_corporate" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["172.16.0.0/12"]
  security_group_id = aws_security_group.web.id
}
```

Individual rule resources do not have ordering issues.

## Pattern 3: JSON Policy Formatting

IAM policies and similar JSON fields often show changes due to whitespace or key ordering:

```text
# aws_iam_role_policy.app will be updated in-place
~ resource "aws_iam_role_policy" "app" {
    ~ policy = jsonencode(
        ~ {
            ~ Statement = [
                ~ {
                    ~ Action   = [
                        - "s3:GetObject",
                        + "s3:GetObject",
                      ]
                  },
              ]
          }
      )
  }
```

**Fix**: Use `jsonencode()` consistently and sort your policy elements:

```hcl
resource "aws_iam_role_policy" "app" {
  name = "app-policy"
  role = aws_iam_role.app.id

  # Use jsonencode for consistent JSON formatting
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowS3Read"
        Effect   = "Allow"
        Action   = ["s3:GetObject"]  # Single-element list
        Resource = ["arn:aws:s3:::my-bucket/*"]
      }
    ]
  })
}
```

For complex policies, use the `aws_iam_policy_document` data source:

```hcl
data "aws_iam_policy_document" "app" {
  statement {
    sid     = "AllowS3Read"
    effect  = "Allow"
    actions = ["s3:GetObject"]
    resources = ["arn:aws:s3:::my-bucket/*"]
  }
}

resource "aws_iam_role_policy" "app" {
  name   = "app-policy"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app.json
}
```

## Pattern 4: Default Values Applied by the Cloud Provider

Some resources show changes because the cloud provider applies defaults that differ from what is in the state:

```text
# aws_instance.web will be updated in-place
~ resource "aws_instance" "web" {
    ~ credit_specification {
        ~ cpu_credits = "standard" -> "unlimited"
      }
  }
```

**Fix**: Explicitly set the attribute in your configuration to match the provider default, or use `ignore_changes`:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"

  credit_specification {
    cpu_credits = "standard"  # Explicit value prevents drift
  }
}

# Or ignore it
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"

  lifecycle {
    ignore_changes = [credit_specification]
  }
}
```

## Pattern 5: EBS Volume Changes

EC2 instances often show phantom changes for their root or attached volumes:

```text
# aws_instance.web will be updated in-place
~ resource "aws_instance" "web" {
    ~ root_block_device {
        ~ throughput = 0 -> 125
      }
  }
```

**Fix**: Set the volume configuration explicitly:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    throughput  = 125  # Set explicitly
    iops        = 3000 # Set explicitly
  }
}
```

## Pattern 6: External Changes (Drift)

If someone modified the infrastructure outside of Terraform (through the console, CLI, or another tool), Terraform detects the difference:

```bash
# Refresh the state to match reality
terraform refresh

# Then plan again
terraform plan
```

If you want to keep the external changes, update your code to match:

```bash
# See the current state of a resource
terraform state show aws_instance.web

# Update your code to match, then plan should show no changes
```

If you want to revert the external changes:

```bash
# Apply will reset the resource to match your code
terraform apply
```

## Pattern 7: Provider Bug

Sometimes the phantom diff is a bug in the provider. This is more common than you might think.

**Fix**: Check the provider's GitHub issues:

```bash
# Search for similar issues
# https://github.com/hashicorp/terraform-provider-aws/issues
```

If it is a known bug, you can work around it with `ignore_changes`:

```hcl
resource "aws_some_resource" "example" {
  # ...

  lifecycle {
    ignore_changes = [problematic_attribute]
  }
}
```

## The Nuclear Option: Replace the Resource in State

If nothing else works and the phantom diff persists:

```bash
# Taint the resource to force recreation
terraform taint aws_instance.web

# Or in newer Terraform
terraform apply -replace=aws_instance.web
```

This destroys and recreates the resource, which often resolves state inconsistencies. Only use this if the resource can be safely recreated.

## Refresh State to Eliminate Drift

```bash
# Refresh all resources to match reality
terraform apply -refresh-only

# This updates the state file without changing infrastructure
# Review the changes and approve if they look correct
```

## Prevention

1. **Do not make manual changes** to resources managed by Terraform
2. **Run `terraform plan` regularly** (even without changes) to catch drift early
3. **Set up drift detection** in CI/CD to alert when unexpected changes are detected
4. **Explicitly set values** for attributes that cloud providers tend to fill in with defaults
5. **Use [OneUptime](https://oneuptime.com) or similar monitoring** to track infrastructure changes that happen outside of Terraform

Phantom diffs in `terraform plan` are annoying but almost always explainable. The key is identifying whether the diff is coming from ordering differences, provider normalization, external changes, or a provider bug, and then applying the appropriate fix. For persistent noise, `ignore_changes` is your friend, but use it sparingly because it can mask real drift.
