# How to Understand Terraform File Loading Order

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, File Loading, Configuration, Infrastructure as Code

Description: Understand how Terraform loads and processes configuration files, the order it reads them, and how override files and JSON files fit into the loading sequence.

---

When you run `terraform plan` or `terraform apply`, Terraform reads all the configuration files in your working directory and assembles them into a single configuration. But the order in which it loads these files is not random, and understanding that order helps you predict behavior - especially when using override files.

## The Loading Process

Terraform's file loading follows a specific sequence:

1. Read all `.tf` and `.tf.json` files in the directory (not subdirectories)
2. Sort regular files alphabetically by filename
3. Sort override files alphabetically by filename
4. Process regular files first, then override files

```text
project/
  compute.tf          # regular - loaded alphabetically
  data.tf             # regular
  main.tf             # regular
  networking.tf       # regular
  outputs.tf          # regular
  variables.tf        # regular
  override.tf         # override - loaded after all regular files
  dev_override.tf     # override - loaded after override.tf
```

## Regular Files: Order Does Not Matter

For regular `.tf` files (anything not ending in `_override.tf` and not named `override.tf`), the alphabetical loading order is practically irrelevant. Terraform reads all of them and combines their contents. Since Terraform configurations are declarative, the order does not affect the result.

```hcl
# File: aaa.tf
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.main.id  # references something in zzz.tf
}

# File: zzz.tf
resource "aws_subnet" "main" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
```

This works perfectly even though `aaa.tf` references resources defined in `zzz.tf`. Terraform builds the full configuration before resolving any references.

## Override Files: Order Matters

Override files are the exception. They are processed after regular files, and their order determines which override wins when multiple overrides modify the same argument.

The processing order is:

1. `override.tf` (if it exists) - processed first
2. Files matching `*_override.tf` - processed in alphabetical order

```text
override.tf           # processed first
alpha_override.tf     # processed second
beta_override.tf      # processed third
```

If both `alpha_override.tf` and `beta_override.tf` set the same attribute, `beta_override.tf` wins because it is processed last:

```hcl
# main.tf
resource "aws_instance" "web" {
  instance_type = "t3.large"
}

# alpha_override.tf
resource "aws_instance" "web" {
  instance_type = "t3.small"  # overrides main.tf
}

# beta_override.tf
resource "aws_instance" "web" {
  instance_type = "t3.micro"  # overrides alpha_override.tf
}

# Final result: instance_type = "t3.micro"
```

## What Files Are Loaded

Terraform loads these file types from the current directory:

- `*.tf` - HCL configuration files
- `*.tf.json` - JSON configuration files

It does NOT automatically load:
- Files in subdirectories (those are separate modules)
- `.tfvars` files (except `terraform.tfvars` and `*.auto.tfvars`)
- `.hcl` files (these are for CLI configuration, not Terraform config)
- Any non-.tf files

```text
project/
  main.tf              # loaded
  variables.tf         # loaded
  config.tf.json       # loaded
  terraform.tfvars     # auto-loaded for variable values
  prod.auto.tfvars     # auto-loaded for variable values
  staging.tfvars       # NOT auto-loaded (use -var-file flag)
  scripts/
    bootstrap.sh       # NOT loaded as config (it's not .tf)
  modules/
    vpc/
      main.tf          # NOT loaded (subdirectory = separate module)
```

## Variable Files Loading Order

While `.tf` file order does not matter for configuration, variable value files have a specific loading priority:

1. `terraform.tfvars` (auto-loaded if present)
2. `*.auto.tfvars` files (auto-loaded, alphabetical order)
3. `-var-file` flags (in the order specified on the command line)
4. `-var` flags (in the order specified on the command line)
5. `TF_VAR_*` environment variables

Later values override earlier ones:

```bash
# If all of these set the same variable, the last one wins
terraform apply \
  -var-file="base.tfvars" \
  -var-file="override.tfvars" \
  -var="instance_type=t3.nano"

# Priority: t3.nano wins (from -var flag)
```

```text
project/
  terraform.tfvars       # loaded first (auto)
  alpha.auto.tfvars      # loaded second (auto, alphabetical)
  beta.auto.tfvars       # loaded third (auto, alphabetical)
```

## JSON and HCL Files Together

You can mix `.tf` (HCL) and `.tf.json` (JSON) files in the same directory. They are merged together:

```hcl
# main.tf (HCL format)
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
```

```json
// generated.tf.json (JSON format)
{
  "resource": {
    "aws_instance": {
      "web": {
        "ami": "ami-0c55b159cbfafe1f0",
        "instance_type": "t3.micro",
        "subnet_id": "${aws_subnet.public.id}"
      }
    }
  }
}
```

Both files contribute to the same configuration. This is useful when some of your configuration is machine-generated (JSON) and some is hand-written (HCL).

## How Subdirectories Work

Terraform only reads files from the current directory. Subdirectories are treated as child modules and are only loaded when explicitly called:

```text
project/
  main.tf                  # root module
  modules/
    vpc/
      main.tf              # only loaded if root calls module "vpc"
    compute/
      main.tf              # only loaded if root calls module "compute"
```

```hcl
# main.tf
# This is what makes Terraform load the vpc module's files
module "vpc" {
  source = "./modules/vpc"
}
```

## Symlinks

Terraform follows symlinks when loading files. A symlinked `.tf` file is treated the same as a regular file:

```bash
# Create a symlink to share a providers file
ln -s ../shared/providers.tf providers.tf
```

This can be useful for sharing configuration across multiple root modules, though it can also be confusing. Use with care.

## Debugging File Loading

If you are unsure which files Terraform is loading, you can use the `TF_LOG` environment variable:

```bash
# Enable trace-level logging to see file loading
TF_LOG=TRACE terraform plan 2>&1 | grep -i "loading"

# Or just check what .tf files exist
ls *.tf *.tf.json 2>/dev/null
```

You can also run `terraform validate` to check that all loaded files form a valid configuration:

```bash
terraform validate
# Success! The configuration is valid.
```

## Common Confusion Points

### Duplicate Blocks

You cannot define the same resource twice in regular files:

```hcl
# networking.tf
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

# compute.tf
resource "aws_vpc" "main" {     # ERROR: duplicate resource
  cidr_block = "10.0.0.0/16"
}
```

But you can define the same resource in a regular file and an override file - that is the whole point of overrides.

### Multiple locals Blocks

You can have multiple `locals` blocks across different files:

```hcl
# tags.tf
locals {
  common_tags = { ManagedBy = "terraform" }
}

# naming.tf
locals {
  name_prefix = "myapp"
}
```

This is fine. Terraform merges all `locals` blocks together.

### Multiple terraform Blocks

You can split the `terraform` block across files too:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.6.0"
}

# providers.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# backend.tf
terraform {
  backend "s3" {
    bucket = "my-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}
```

Terraform merges all `terraform` blocks. Just make sure you do not duplicate the same nested block (like two `backend` blocks).

## Wrapping Up

Terraform loads all `.tf` and `.tf.json` files from the working directory, processes regular files first (in alphabetical order, though order does not matter for them), then processes override files (where order does matter). Variable files have their own priority chain. Understanding this loading behavior helps you organize your code confidently and debug unexpected behavior when override files are in play.

For more on file organization, see [How to Split Terraform Configuration Across Multiple Files](https://oneuptime.com/blog/post/2026-02-23-terraform-split-configuration-multiple-files/view) and [How to Use Override Files in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-override-files/view).
