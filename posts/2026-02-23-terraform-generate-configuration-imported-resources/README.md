# How to Generate Configuration for Imported Resources in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Import, Code Generation, Infrastructure as Code, Migration

Description: Learn how to automatically generate Terraform configuration files for imported resources using terraform plan -generate-config-out to speed up infrastructure adoption.

---

Importing existing infrastructure into Terraform has traditionally been a two-step headache: first import the resource into state, then manually write the configuration to match. Getting the configuration exactly right often means running `terraform plan` repeatedly, fixing attribute mismatches each time. Terraform 1.5 introduced a much better workflow - you can now generate configuration automatically for imported resources using `terraform plan -generate-config-out`.

This guide covers the complete workflow for generating configuration during import, what the generated code looks like, and how to clean it up for production use.

## The Old Pain Point

Before configuration generation, importing a resource looked like this:

```bash
# Step 1: Write an empty resource block
# resource "aws_instance" "web" {}

# Step 2: Import the resource
terraform import aws_instance.web i-0abc123def456

# Step 3: Run terraform plan, see a dozen attribute mismatches
# Step 4: Manually add each attribute to the configuration
# Step 5: Run terraform plan again, fix more mismatches
# Step 6: Repeat until the plan shows no changes
```

This was tedious, especially for resources with many attributes like RDS instances or ECS task definitions.

## The New Workflow: import Block + Generated Config

The modern approach uses `import` blocks combined with `terraform plan -generate-config-out`:

### Step 1: Write the Import Block

Create an import block that tells Terraform which resource to import and what address to give it:

```hcl
# imports.tf
import {
  to = aws_instance.web
  id = "i-0abc123def456"
}
```

You do not need to write the resource block yet. That is the whole point.

### Step 2: Generate the Configuration

```bash
# Generate configuration into a new file
terraform plan -generate-config-out=generated.tf
```

Terraform reads the import block, fetches the resource from AWS, and writes a complete resource block to `generated.tf`.

### Step 3: Review the Generated Code

The generated file will look something like this:

```hcl
# generated.tf
resource "aws_instance" "web" {
  ami                                  = "ami-0c55b159cbfafe1f0"
  associate_public_ip_address          = true
  availability_zone                    = "us-east-1a"
  cpu_core_count                       = 1
  cpu_threads_per_core                 = 2
  disable_api_stop                     = false
  disable_api_termination              = false
  ebs_optimized                        = false
  get_password_data                    = false
  hibernation                          = false
  instance_initiated_shutdown_behavior = "stop"
  instance_type                        = "t3.micro"
  key_name                             = "my-key"
  monitoring                           = false
  placement_partition_number            = 0
  source_dest_check                    = true
  subnet_id                            = "subnet-0abc123"
  tenancy                              = "default"
  vpc_security_group_ids               = ["sg-0abc123"]

  capacity_reservation_specification {
    capacity_reservation_preference = "open"
  }

  credit_specification {
    cpu_credits = "unlimited"
  }

  enclave_options {
    enabled = false
  }

  maintenance_options {
    auto_recovery = "default"
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 1
    http_tokens                 = "optional"
    instance_metadata_tags      = "disabled"
  }

  private_dns_name_options {
    enable_resource_name_dns_a_record    = false
    enable_resource_name_dns_aaaa_record = false
    hostname_type                        = "ip-name"
  }

  root_block_device {
    delete_on_termination = true
    encrypted             = false
    iops                  = 3000
    throughput            = 125
    volume_size           = 8
    volume_type           = "gp3"
  }

  tags = {
    Name = "web-server"
  }

  tags_all = {
    Name = "web-server"
  }
}
```

### Step 4: Clean Up the Generated Code

The generated configuration includes every attribute, even defaults. You should clean it up:

```hcl
# cleaned up version of generated.tf
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  key_name      = "my-key"
  subnet_id     = "subnet-0abc123"

  vpc_security_group_ids = ["sg-0abc123"]

  root_block_device {
    volume_size = 8
    volume_type = "gp3"
  }

  tags = {
    Name = "web-server"
  }
}
```

### Step 5: Apply the Import

```bash
# Now apply to actually perform the import
terraform apply
```

## Importing Multiple Resources at Once

You can define multiple import blocks and generate configuration for all of them in a single command:

```hcl
# imports.tf
import {
  to = aws_vpc.main
  id = "vpc-0abc123"
}

import {
  to = aws_subnet.public
  id = "subnet-0abc123"
}

import {
  to = aws_subnet.private
  id = "subnet-0def456"
}

import {
  to = aws_security_group.web
  id = "sg-0abc123"
}

import {
  to = aws_instance.web
  id = "i-0abc123"
}
```

```bash
# Generate all configurations at once
terraform plan -generate-config-out=generated_imports.tf
```

The generated file will contain resource blocks for all five resources.

## Generating Configuration for Complex Resources

Configuration generation is especially valuable for complex resources with many nested blocks.

### RDS Instances

```hcl
import {
  to = aws_db_instance.production
  id = "my-production-database"
}
```

The generated configuration captures all the database settings - engine version, parameter groups, backup windows, maintenance windows, storage configuration, and more. Writing this by hand is error-prone; generating it is reliable.

### ECS Task Definitions

```hcl
import {
  to = aws_ecs_task_definition.app
  id = "arn:aws:ecs:us-east-1:123456789012:task-definition/app:5"
}
```

ECS task definitions with container definitions, volume mounts, logging configuration, and environment variables can have hundreds of lines of configuration. Generation handles all of it.

### IAM Roles with Policies

```hcl
import {
  to = aws_iam_role.app
  id = "app-role"
}

import {
  to = aws_iam_role_policy.app_inline
  id = "app-role:app-inline-policy"
}
```

## Handling Generated Code Quality

The generated code works but is not always pretty. Here are tips for cleaning it up:

### Remove Default Values

Many attributes in the generated code are just the defaults. You can safely remove them:

```hcl
# Generated - verbose
resource "aws_instance" "web" {
  disable_api_termination = false  # This is the default, remove it
  monitoring              = false  # Also default
  source_dest_check       = true   # Also default
  # ...
}

# Cleaned up
resource "aws_instance" "web" {
  # Only keep non-default values
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  # ...
}
```

### Replace Hardcoded IDs with References

Generated code uses raw IDs. Replace them with references to other resources or data sources:

```hcl
# Generated
resource "aws_instance" "web" {
  subnet_id              = "subnet-0abc123"
  vpc_security_group_ids = ["sg-0def456"]
}

# Improved
resource "aws_instance" "web" {
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]
}
```

### Add Variables for Environment-Specific Values

```hcl
# Generated
resource "aws_instance" "web" {
  instance_type = "t3.micro"
  key_name      = "production-key"
}

# Improved
resource "aws_instance" "web" {
  instance_type = var.instance_type
  key_name      = var.key_name
}
```

## Limitations

There are a few things to be aware of:

1. The output file must not already exist. If `generated.tf` exists, the command will fail. Delete or rename it first.

2. Not all providers support configuration generation equally. AWS provider support is solid, but some community providers may produce incomplete configurations.

3. Sensitive values are included in the generated output. Review the file for any secrets before committing to version control.

4. Read-only computed attributes might appear in the generated config. Terraform will warn you about these, and you should remove them.

5. The generated code does not include variable definitions, provider configuration, or backend configuration. You still need to write those yourself.

## Complete Workflow Example

Here is a start-to-finish example of importing an existing AWS setup:

```bash
# 1. Create your project structure
mkdir terraform-import && cd terraform-import
```

```hcl
# 2. Write provider configuration (providers.tf)
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

```hcl
# 3. Write import blocks (imports.tf)
import {
  to = aws_vpc.main
  id = "vpc-0abc123"
}

import {
  to = aws_instance.web
  id = "i-0abc123"
}
```

```bash
# 4. Initialize Terraform
terraform init

# 5. Generate configuration
terraform plan -generate-config-out=generated.tf

# 6. Review and clean up generated.tf
# (edit the file manually)

# 7. Apply the import
terraform apply

# 8. Verify no drift
terraform plan
# Should show: No changes. Your infrastructure matches the configuration.

# 9. Remove the import blocks (they are no longer needed)
# Delete imports.tf
```

## Conclusion

Generating configuration for imported resources eliminates the most painful part of bringing existing infrastructure under Terraform management. Instead of manually writing resource blocks and fixing attribute mismatches through trial and error, you let Terraform do the heavy lifting. The generated code needs cleanup - removing defaults, replacing hardcoded IDs with references, and adding variables - but that is a much better starting point than an empty file. If you are adopting Terraform for existing infrastructure, this workflow will save you significant time.

For the complete import workflow, see our guide on [how to handle resource attribute changes in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-resource-attribute-changes/view).
