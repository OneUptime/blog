# How to Migrate from CDKTF to Standard Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Infrastructure as Code, Migration, HCL

Description: A practical guide to migrating your infrastructure code from Cloud Development Kit for Terraform (CDKTF) back to standard Terraform HCL, covering synthesis, state handling, and common pitfalls.

---

There are times when a team decides that CDKTF is not the right fit. Maybe the complexity of maintaining a build toolchain for a general-purpose language outweighs the benefits, or the team composition has shifted and HCL expertise is more common. Whatever the reason, migrating from CDKTF back to standard Terraform is entirely doable, though it requires planning.

This guide walks through the migration process step by step, using real examples and covering the tricky parts that documentation often glosses over.

## Why Teams Move Away from CDKTF

Before jumping into the migration, it helps to understand what drives this decision. CDKTF adds a compilation and synthesis layer between your code and the actual Terraform execution. That layer introduces dependencies on Node.js (or your language runtime), CDKTF libraries, and a build pipeline. For smaller teams or simpler infrastructure, the overhead can be a net negative.

The most common reasons include difficulty onboarding new team members who know HCL but not TypeScript/Python, slower plan/apply cycles due to synthesis time, and version compatibility issues between CDKTF and Terraform providers.

## Step 1: Synthesize Your Current CDKTF Code

The first step is generating the Terraform JSON output from your CDKTF project. This gives you a machine-readable snapshot of what your CDKTF code actually produces.

```bash
# Navigate to your CDKTF project
cd my-cdktf-project

# Run synthesis to generate Terraform JSON
cdktf synth

# The output goes to cdktf.out/stacks/<stack-name>/
ls cdktf.out/stacks/
```

Each stack in your CDKTF project creates a separate directory under `cdktf.out/stacks/`. Inside each directory, you will find a `cdk.tf.json` file. This is the Terraform configuration in JSON format.

```bash
# Examine the generated JSON
cat cdktf.out/stacks/my-stack/cdk.tf.json | python3 -m json.tool | head -50
```

## Step 2: Convert JSON to HCL

Terraform accepts both HCL and JSON configuration files, so technically you could just use the JSON files directly. But JSON Terraform configs are hard to read and maintain. You want proper HCL.

There is no official JSON-to-HCL converter, but you have a few options. The most reliable approach is using `json2hcl` or doing a manual conversion with the JSON as reference.

```bash
# Install json2hcl (if available)
go install github.com/kvz/json2hcl/v2@latest

# Convert JSON to HCL
cat cdktf.out/stacks/my-stack/cdk.tf.json | json2hcl > main.tf
```

The output from `json2hcl` will need cleanup. CDKTF generates resource names with hash suffixes and uses a flat structure that is harder to read than hand-written HCL. You will need to refactor.

Here is an example of what CDKTF generates versus what clean HCL looks like:

```hcl
# CDKTF-generated (messy)
resource "aws_s3_bucket" "mybucket_A1B2C3D4" {
  bucket = "my-application-data"
  tags = {
    "Name" = "my-application-data"
  }
}

# Clean HCL (what you want)
resource "aws_s3_bucket" "application_data" {
  bucket = "my-application-data"

  tags = {
    Name = "my-application-data"
  }
}
```

## Step 3: Handle Resource Name Changes in State

When you rename resources from the CDKTF-generated names to cleaner HCL names, Terraform will try to destroy and recreate them. You need to use `terraform state mv` to update the state file.

```bash
# Initialize Terraform in your new HCL project directory
terraform init

# Move each renamed resource in state
terraform state mv \
  'aws_s3_bucket.mybucket_A1B2C3D4' \
  'aws_s3_bucket.application_data'

# Verify the move
terraform state list | grep application_data
```

For large projects with hundreds of resources, write a script to handle this:

```bash
#!/bin/bash
# state-migration.sh
# Maps old CDKTF resource names to new HCL resource names

declare -A RESOURCE_MAP
RESOURCE_MAP["aws_s3_bucket.mybucket_A1B2C3D4"]="aws_s3_bucket.application_data"
RESOURCE_MAP["aws_instance.webserver_E5F6G7H8"]="aws_instance.web_server"
RESOURCE_MAP["aws_vpc.mainvpc_I9J0K1L2"]="aws_vpc.main"

for old_name in "${!RESOURCE_MAP[@]}"; do
  new_name="${RESOURCE_MAP[$old_name]}"
  echo "Moving $old_name -> $new_name"
  terraform state mv "$old_name" "$new_name"
done
```

## Step 4: Handle CDKTF Constructs and Abstractions

If you used CDKTF constructs (reusable components), each construct generates multiple Terraform resources. In HCL, the closest equivalent is a Terraform module.

For example, a CDKTF construct that creates a VPC with subnets would translate to either inline resources or a module call:

```hcl
# Option A: Inline resources (simple cases)
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
}

# Option B: Module call (complex reusable patterns)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"

  name = "main"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]
}
```

## Step 5: Migrate Variables and Outputs

CDKTF uses language-level variables and function parameters. In HCL, you need to define explicit `variable` and `output` blocks.

```hcl
# variables.tf
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "staging"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

# outputs.tf
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}
```

## Step 6: Validate and Plan

After converting all your code and updating the state, run a plan to confirm that Terraform sees no changes:

```bash
# Format the new HCL files
terraform fmt -recursive

# Validate syntax
terraform validate

# Run a plan - you want to see "No changes"
terraform plan
```

If the plan shows changes, investigate each one. Common causes include:

- Missed `state mv` operations for renamed resources
- Default values that CDKTF set explicitly but HCL leaves to provider defaults
- Ordering differences in list or set attributes

## Step 7: Clean Up the CDKTF Project

Once you have confirmed zero-diff plans and run a successful apply, remove the CDKTF project artifacts:

```bash
# Remove CDKTF dependencies
rm -rf node_modules package.json package-lock.json
rm -rf cdktf.out
rm cdktf.json

# Remove language-specific files
rm -rf *.ts tsconfig.json  # TypeScript
rm -rf *.py requirements.txt  # Python

# Keep your new .tf files and state
```

## Common Migration Pitfalls

Watch out for these issues during migration:

**Remote state configuration**: CDKTF might store state in a location configured differently than what your new HCL backend block specifies. Make sure the backend configuration matches exactly.

**Provider version pins**: CDKTF may have been using specific provider versions. Pin those same versions in your `required_providers` block to avoid unexpected changes.

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}
```

**Data source references**: CDKTF sometimes generates data sources differently than you would write them by hand. Double-check that data source queries return the expected results.

## Testing the Migration

Before declaring the migration complete, run through this checklist:

1. `terraform plan` shows no changes for every stack
2. A test `terraform apply` succeeds (even with no changes, it validates connectivity)
3. Your CI/CD pipeline works with the new HCL files
4. All team members can initialize and plan locally
5. State backups are in place in case you need to roll back

Migration from CDKTF to standard Terraform is not glamorous work, but it is straightforward if you approach it methodically. The key is to never skip the `terraform plan` validation step after each batch of changes. If the plan is clean, you are on the right track.

For more infrastructure-related guides, check out our post on [How to Use CDKTF with Pre-Built Constructs](https://oneuptime.com/blog/post/2026-02-23-use-cdktf-with-pre-built-constructs/view).
