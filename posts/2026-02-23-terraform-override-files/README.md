# How to Use Override Files in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Override Files, Configuration, Infrastructure as Code

Description: Learn how to use Terraform override files to modify resource configurations without changing the original files, useful for testing, local development, and environment customization.

---

Terraform override files let you change parts of your configuration without modifying the original `.tf` files. They work by merging with the existing configuration, replacing specific arguments while leaving everything else intact. This is a powerful feature for local development overrides, testing, and environment-specific tweaks.

## How Override Files Work

Any file ending in `_override.tf` or named exactly `override.tf` is treated as an override file. Terraform processes override files after all regular files and merges their contents into the existing configuration.

```
project/
  main.tf              # regular configuration
  variables.tf         # regular configuration
  override.tf          # override file - merged into the configuration
  dev_override.tf      # override file - merged into the configuration
```

The merging rules are straightforward:
- Top-level blocks (like `resource`, `variable`) are merged by type and name
- Arguments within a block are replaced entirely
- Nested blocks have more nuanced merging behavior

## A Basic Example

Say you have a production configuration:

```hcl
# main.tf
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.large"

  tags = {
    Name        = "web-server"
    Environment = "production"
  }
}
```

And you want to use a smaller instance for local testing:

```hcl
# override.tf
resource "aws_instance" "web" {
  instance_type = "t3.micro"

  tags = {
    Name        = "web-server-dev"
    Environment = "development"
  }
}
```

The result is equivalent to:

```hcl
# Merged result (what Terraform actually sees)
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"  # kept from main.tf
  instance_type = "t3.micro"               # replaced by override
  tags = {
    Name        = "web-server-dev"         # replaced by override
    Environment = "development"            # replaced by override
  }
}
```

The `ami` stayed the same because the override did not mention it. The `instance_type` and `tags` were replaced because the override provided new values.

## Override File Naming

Terraform recognizes these as override files:
- `override.tf` - processed first among overrides
- Any file matching `*_override.tf` - processed in alphabetical order after `override.tf`

```
project/
  main.tf
  override.tf          # processed first
  backend_override.tf  # processed second (alphabetical)
  dev_override.tf      # processed third
```

If multiple override files modify the same argument, the last one processed wins.

## Merging Rules in Detail

### Top-Level Arguments

Arguments in a block are replaced wholesale:

```hcl
# main.tf
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.large"
  monitoring    = true
}

# override.tf
resource "aws_instance" "web" {
  instance_type = "t3.micro"
  # ami and monitoring are NOT affected
}
```

### Nested Blocks

Nested blocks follow a "block type" merging strategy. If both the original and the override have the same nested block type, the override replaces it:

```hcl
# main.tf
resource "aws_security_group" "web" {
  name = "web-sg"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# override.tf
resource "aws_security_group" "web" {
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
}

# Result: only port 80 from 10.0.0.0/8 - the original ingress block is replaced
```

### Multiple Nested Blocks

When there are multiple blocks of the same type, they are matched by position:

```hcl
# main.tf
resource "aws_security_group" "web" {
  name = "web-sg"

  ingress {
    from_port = 443
    to_port   = 443
    protocol  = "tcp"
  }

  ingress {
    from_port = 80
    to_port   = 80
    protocol  = "tcp"
  }
}

# override.tf
resource "aws_security_group" "web" {
  # This replaces the first ingress block (position 0)
  ingress {
    from_port = 8443
    to_port   = 8443
    protocol  = "tcp"
  }
}

# Result: first ingress is 8443, second ingress (80) is unchanged
```

## Use Case: Local Development Overrides

One of the most common uses is overriding the backend configuration for local development. Your team uses a remote backend, but when you are developing locally you want to use a local state file.

```hcl
# backend.tf (committed to git)
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

```hcl
# backend_override.tf (NOT committed to git - add to .gitignore)
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

Add to `.gitignore`:

```
# .gitignore
*_override.tf
override.tf
```

Now you can work with local state while the team uses the remote backend.

## Use Case: Testing with Different Provider Configurations

```hcl
# providers.tf (production)
provider "aws" {
  region = "us-east-1"
}

# providers_override.tf (for testing against LocalStack)
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    s3       = "http://localhost:4566"
    dynamodb = "http://localhost:4566"
    ec2      = "http://localhost:4566"
    iam      = "http://localhost:4566"
    lambda   = "http://localhost:4566"
    sqs      = "http://localhost:4566"
  }
}
```

## Use Case: Overriding Variable Defaults

```hcl
# variables.tf
variable "instance_type" {
  type    = string
  default = "t3.large"
}

variable "enable_monitoring" {
  type    = bool
  default = true
}

# variables_override.tf (for dev environment)
variable "instance_type" {
  default = "t3.micro"
}

variable "enable_monitoring" {
  default = false
}
```

## Use Case: Overriding Module Sources

During module development, you might want to use a local copy instead of a remote source:

```hcl
# main.tf
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "production-vpc"
  cidr = "10.0.0.0/16"
}

# override.tf (use local module during development)
module "vpc" {
  source = "../terraform-aws-vpc"
}
```

## Override Files in JSON Format

Override files also work with the JSON configuration format:

```json
// override.tf.json
{
  "resource": {
    "aws_instance": {
      "web": {
        "instance_type": "t3.micro"
      }
    }
  }
}
```

## Things to Watch Out For

Override files can make configurations harder to understand because the effective configuration is the result of merging multiple files. Someone reading `main.tf` might not realize that an override file is changing behavior.

Recommendations:
- Always add override files to `.gitignore` if they are personal developer overrides
- If override files are committed (for testing environments), document their purpose clearly
- Use override files sparingly - they are a tool for specific situations, not a general configuration pattern
- Consider using workspaces or `.tfvars` files instead when the differences are just variable values

## Verifying the Merged Configuration

You can check what Terraform sees after merging with `terraform console` or `terraform plan`:

```bash
# See the plan to verify merged values
terraform plan

# Use console to check specific values
terraform console
> aws_instance.web.instance_type
```

## Wrapping Up

Override files in Terraform provide a merge-based mechanism for modifying configuration without touching the original files. They are identified by the `_override.tf` suffix or the `override.tf` filename. Use them for local development backends, test environment provider configurations, and development variable defaults. Just remember to keep them out of version control when they contain personal developer preferences, and use them judiciously to avoid confusion.

For more on organizing Terraform files, see [How to Split Terraform Configuration Across Multiple Files](https://oneuptime.com/blog/post/2026-02-23-terraform-split-configuration-multiple-files/view) and [How to Understand Terraform File Loading Order](https://oneuptime.com/blog/post/2026-02-23-terraform-file-loading-order/view).
