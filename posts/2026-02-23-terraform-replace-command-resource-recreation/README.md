# How to Use the Terraform Replace Command for Resource Recreation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Resource Management, CLI, Infrastructure as Code, DevOps

Description: Learn how to use the terraform apply -replace command to force resource recreation in Terraform without modifying your configuration files.

---

Sometimes you need to destroy and recreate a specific resource in Terraform without changing any configuration. Maybe the resource is in a bad state, a manual change broke it, or you need to rotate credentials. The `terraform apply -replace` command lets you do exactly that - mark a resource for replacement and rebuild it in a single operation.

This guide covers the `-replace` flag in detail, including how it works, when to use it, and how it compares to the older `taint` approach.

## What Does -replace Do?

The `-replace` flag tells Terraform to destroy a specific resource and create a new one in its place, even if the configuration has not changed. Terraform treats the resource as if it needs to be replaced, running the full destroy-then-create (or create-before-destroy) lifecycle.

```bash
# Basic syntax
terraform apply -replace="aws_instance.web"
```

This command:
1. Plans the destruction of `aws_instance.web`
2. Plans the creation of a new `aws_instance.web`
3. Shows you the plan and asks for confirmation
4. Executes the replacement

## Basic Usage

### Replacing a Single Resource

```bash
# Replace an EC2 instance
terraform apply -replace="aws_instance.web"

# Replace an RDS instance
terraform apply -replace="aws_db_instance.main"

# Replace a Lambda function
terraform apply -replace="aws_lambda_function.processor"
```

### Using -replace with Plan

You can also use `-replace` with `terraform plan` to preview what would happen without making changes:

```bash
# See what replacement would look like
terraform plan -replace="aws_instance.web"
```

The plan output will show the resource marked with `# forces replacement`:

```text
# aws_instance.web must be replaced
-/+ resource "aws_instance" "web" {
      ~ id            = "i-0abc123def456" -> (known after apply)
      ~ public_ip     = "54.123.45.67" -> (known after apply)
        # (other attributes unchanged)
    }
```

## Replacing Resources in Modules

When a resource is inside a module, include the full module path:

```bash
# Replace a resource inside a module
terraform apply -replace="module.web_server.aws_instance.main"

# Replace a resource in a nested module
terraform apply -replace="module.app.module.database.aws_db_instance.primary"
```

## Replacing Indexed Resources

For resources using `count` or `for_each`, include the index:

```bash
# Replace a specific instance from a count-based resource
terraform apply -replace='aws_instance.web[0]'
terraform apply -replace='aws_instance.web[2]'

# Replace a specific instance from a for_each-based resource
terraform apply -replace='aws_instance.web["us-east-1"]'
terraform apply -replace='aws_instance.web["eu-west-1"]'
```

Note the quoting. When using `for_each` with string keys, you need to quote the key and protect the quotes from your shell:

```bash
# Single quotes protect the double quotes from bash
terraform apply -replace='aws_security_group.env["production"]'

# Or escape the double quotes
terraform apply -replace="aws_security_group.env[\"production\"]"
```

## Replacing Multiple Resources

You can pass multiple `-replace` flags in a single command:

```bash
# Replace multiple resources at once
terraform apply \
  -replace="aws_instance.web[0]" \
  -replace="aws_instance.web[1]" \
  -replace="aws_instance.web[2]"
```

All replacements happen in a single plan and apply, so Terraform can figure out the correct ordering.

## Create Before Destroy

If your resource has `create_before_destroy = true` in its lifecycle block, the `-replace` flag respects that setting:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  lifecycle {
    # When replaced, create the new instance before destroying the old one
    create_before_destroy = true
  }
}
```

```bash
# This will create a new instance first, then destroy the old one
terraform apply -replace="aws_instance.web"
```

This is useful for minimizing downtime during replacements.

## When to Use -replace

### Corrupted or Broken Resources

When a resource is in a bad state that Terraform cannot fix through normal updates:

```bash
# EC2 instance has a corrupted root volume
terraform apply -replace="aws_instance.app"

# ECS service is stuck in a deployment
terraform apply -replace="aws_ecs_service.app"
```

### Credential or Key Rotation

Force recreation of resources that generate credentials on creation:

```bash
# Rotate an IAM access key
terraform apply -replace="aws_iam_access_key.deploy"

# Recreate an RDS instance to get new master credentials
terraform apply -replace="aws_db_instance.main"
```

### SSL Certificate Renewal

When you need a fresh certificate:

```bash
# Force a new self-signed certificate
terraform apply -replace="tls_self_signed_cert.app"

# Recreate an ACM certificate
terraform apply -replace="aws_acm_certificate.app"
```

### After Manual Changes

If someone modified a resource through the AWS console and you want to bring it back to the Terraform-defined state:

```bash
# Rebuild the instance from scratch per Terraform config
terraform apply -replace="aws_instance.web"
```

## -replace vs taint

Before Terraform 0.15.2, the way to force resource recreation was `terraform taint`. The `-replace` flag is the modern replacement. Here is how they compare:

```bash
# Old way (two commands, modifies state)
terraform taint aws_instance.web
terraform apply

# New way (single command, does not modify state until apply)
terraform apply -replace="aws_instance.web"
```

Key differences:

- `taint` modifies the state file immediately, even before you apply. If you change your mind, you need to run `terraform untaint`.
- `-replace` does not modify state until the apply runs. If you cancel the plan, nothing changes.
- `-replace` works with `terraform plan`, so you can preview the replacement before committing.
- `taint` is deprecated as of Terraform v1.x and may be removed in future versions.

## Combining -replace with Other Flags

```bash
# Replace with auto-approve (skip confirmation)
terraform apply -replace="aws_instance.web" -auto-approve

# Replace with a specific variable file
terraform apply -replace="aws_instance.web" -var-file="production.tfvars"

# Replace with parallelism control
terraform apply -replace="aws_instance.web" -parallelism=1

# Replace in a specific workspace
terraform workspace select production
terraform apply -replace="aws_instance.web"
```

## Understanding the Replacement Plan Output

When you run a replacement, the plan output uses specific symbols:

```text
Terraform will perform the following actions:

  # aws_instance.web will be replaced, as requested
-/+ resource "aws_instance" "web" {
      ~ arn                    = "arn:aws:ec2:..." -> (known after apply)
      ~ id                     = "i-0abc123..." -> (known after apply)
      ~ instance_state         = "running" -> (known after apply)
        instance_type          = "t3.micro"
      ~ primary_network_interface_id = "eni-0abc..." -> (known after apply)
      ~ private_dns            = "ip-10-0-1-45..." -> (known after apply)
      ~ private_ip             = "10.0.1.45" -> (known after apply)
      ~ public_ip              = "54.123.45.67" -> (known after apply)
        tags                   = {
            "Name" = "web-server"
        }
        # (other unchanged attributes hidden)
    }

Plan: 1 to add, 0 to change, 1 to destroy.
```

The `-/+` prefix means the resource will be destroyed and recreated. Attributes marked with `~` will change as a result of the recreation.

## Safety Considerations

1. Replacement destroys the resource. Any data stored on the resource (like an EBS volume that is not separately managed) will be lost.

2. Downstream resources may be affected. If other resources reference the replaced resource's ID, they might need updates too.

3. DNS and IP addresses will change unless you have Elastic IPs or other persistent addressing.

4. Always run `terraform plan -replace` first to understand the full impact before applying.

## Conclusion

The `terraform apply -replace` command gives you precise control over resource recreation. It is cleaner than the old `taint` workflow because it does not modify state until you confirm the apply, and it works seamlessly with `terraform plan` for previewing changes. Use it when you need to force-rebuild resources due to corruption, credential rotation, or recovery from manual changes. Just be sure to review the plan output carefully, as replacement means destruction followed by creation, and some changes cannot be undone.

For related operations, see our guide on [how to move resources between state files in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-move-resources-between-state-files/view).
