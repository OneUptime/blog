# How to Use Override Files for Environment-Specific Settings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Override Files, Environment Management, Configuration, Infrastructure as Code

Description: Learn how to use Terraform override files to customize environment-specific settings without modifying the base configuration, with practical examples and best practices.

---

Terraform override files let you replace or extend parts of your configuration without touching the original files. Any file named `override.tf` or ending in `_override.tf` gets merged on top of the base configuration. This is useful for environment-specific settings, local development overrides, and testing scenarios where you want to change behavior without editing shared code.

This guide shows you how override files work, when to use them, and the patterns that keep your team productive.

## How Override Files Work

Terraform processes configuration files in two passes. First, it loads all regular `.tf` files. Then it loads override files and merges their contents on top. Override files follow a specific naming convention:

- `override.tf` - Always loaded as an override
- `*_override.tf` - Any file ending with `_override.tf` is treated as an override

```text
project/
  main.tf              # Base configuration
  variables.tf         # Variable definitions
  outputs.tf           # Output definitions
  override.tf          # Overrides (merged on top)
  dev_override.tf      # Another override file
```

The key behavior: override files merge with matching top-level blocks. If `main.tf` defines an `aws_instance` resource called `web` and `override.tf` also defines `aws_instance.web`, Terraform combines them as one resource. Arguments in the override replace arguments with the same name in the original, while arguments that are not mentioned in the override stay in place.

```hcl
# main.tf - Base configuration

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.large"
  subnet_id     = aws_subnet.private.id

  tags = {
    Name        = "production-web"
    Environment = "production"
  }
}
```

```hcl
# override.tf - Overrides selected arguments from the resource above
resource "aws_instance" "web" {
  instance_type = "t3.micro"

  tags = {
    Name        = "dev-web"
    Environment = "dev"
  }
}
```

When Terraform loads this, the final resource keeps the original `ami` and `subnet_id`, but uses the overridden `instance_type` and `tags`.

## Overriding Specific Attributes

For top-level blocks like resources, providers, variables, outputs, and modules, Terraform merges the matching block headers and replaces only the arguments you specify. Nested blocks are different: if an override includes a nested block of a given type, it replaces all nested blocks of that type from the original, except for special cases such as `lifecycle` inside `resource` blocks. Here is how it works with provider blocks:

```hcl
# main.tf
provider "aws" {
  region = "us-east-1"
}
```

```hcl
# override.tf - Override just the region
provider "aws" {
  region = "us-west-2"
}
```

The result is a single provider block with `region = "us-west-2"`.

## Local Development Overrides

One of the most practical uses is overriding settings for local development. Add `override.tf` to your `.gitignore` so each developer can have their own:

```gitignore
# .gitignore
/override.tf
/*_override.tf
```

```hcl
# override.tf (not committed to git)
# Use localstack for local development instead of real AWS
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
    sqs      = "http://localhost:4566"
    iam      = "http://localhost:4566"
  }
}
```

```hcl
# Another developer's override.tf
# Use smaller instances for personal dev environment
resource "aws_instance" "app" {
  instance_type = "t3.nano"     # Cheaper for dev work

  tags = {
    Name        = "john-dev-app"
    Environment = "dev"
    Developer   = "john"
  }
}
```

## Environment-Specific Backend Configuration

Override files can change the backend configuration for different environments:

```hcl
# main.tf - Default backend
terraform {
  backend "s3" {
    bucket = "company-terraform-state"
    key    = "app/terraform.tfstate"
    region = "us-east-1"
  }
}
```

```hcl
# staging_override.tf - Different state path for staging
terraform {
  backend "s3" {
    bucket = "company-terraform-state"
    key    = "staging/app/terraform.tfstate"
    region = "us-east-1"
  }
}
```

To use this pattern, you would copy the appropriate override file before running Terraform. A wrapper script handles this:

```bash
#!/bin/bash
# setup-env.sh - Copy the right override file for the target environment

ENV=${1:?"Usage: setup-env.sh <dev|staging|production>"}

# Clean up any existing overrides
rm -f override.tf

# Copy the environment-specific override
cp "overrides/${ENV}_override.tf" override.tf

echo "Environment set to: $ENV"
terraform init
```

## Overriding Module Sources

During module development, you often want to test with a local copy instead of the remote source. This works best when the original module block does not include a `version` argument, because override files cannot remove an argument from the original block:

```hcl
# main.tf - Uses remote module in production
module "vpc" {
  source = "github.com/example/terraform-aws-vpc"

  name = "my-vpc"
  cidr = "10.0.0.0/16"
}
```

```hcl
# override.tf - Use local module copy for development
module "vpc" {
  source = "../my-local-vpc-module"

  name = "my-vpc"
  cidr = "10.0.0.0/16"
}
```

This lets you iterate on module changes locally without publishing them first.

## Overriding Variable Defaults

Override files can change variable defaults, which is different from using `.tfvars` files:

```hcl
# variables.tf
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.large"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r5.large"
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection on critical resources"
  type        = bool
  default     = true
}
```

```hcl
# dev_override.tf
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection on critical resources"
  type        = bool
  default     = false
}
```

## Override File Merging Rules

Understanding the merging rules prevents surprises:

1. **Top-level blocks** (resource, data, module, provider) - The override merges into the matching block. Arguments with the same name are replaced, and arguments not mentioned in the override are preserved.

2. **Terraform settings** - Merges at the attribute level. You can override just `required_version` without redefining `required_providers`.

3. **Variable blocks** - Merges at the attribute level. Override just `default` without redefining `type` and `description`.

4. **Output blocks** - Merges at the attribute level.

5. **Locals blocks** - All local values from all files get combined. If the same local name appears in an override, the override wins.

```hcl
# main.tf
locals {
  region      = "us-east-1"
  environment = "production"
  debug_mode  = false
}
```

```hcl
# override.tf - Only overrides specific locals
locals {
  environment = "dev"
  debug_mode  = true
  # 'region' keeps its original value from main.tf
}
```

## CI/CD Pipeline Integration

In CI/CD, you can generate override files dynamically:

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate override for environment
        run: |
          cat > override.tf <<EOF
          provider "aws" {
            region = "${{ vars.AWS_REGION }}"
            assume_role {
              role_arn = "${{ vars.DEPLOY_ROLE_ARN }}"
            }
          }
          EOF

      - name: Terraform Apply
        run: |
          terraform init
          terraform apply -auto-approve
```

## Override Files vs. Other Approaches

Override files are one of several ways to handle environment differences. Here is when each approach fits:

- **Override files**: Best for local development overrides, testing, and situations where you need to patch selected parts of existing blocks. Avoid committing root-module override files to version control.
- **tfvars files**: Best for changing variable values across environments. Cleaner than overrides for simple value changes.
- **Workspaces**: Best when environments share the same structure but differ in sizing. Uses a single configuration with workspace-aware logic.
- **Separate directories**: Best when environments have fundamentally different architectures.

## Common Mistakes

A few things trip people up with override files:

1. Forgetting to add override files to `.gitignore`. Accidentally committed overrides can break other developers and CI/CD.

2. Assuming nested blocks merge like top-level arguments. Most nested blocks in an override replace all nested blocks of the same type from the original, so missing nested settings can change behavior.

3. Having multiple override files that conflict. Terraform processes them in lexicographical order (`a_override.tf` before `b_override.tf`), and later overrides take precedence for conflicting arguments.

4. Using override files as a primary configuration management strategy. They are best for exceptions and local customization, not as the main way to handle environment differences.

## Wrapping Up

Override files are a niche but useful Terraform feature. They shine for local development customization, testing with different providers, and quick environment adjustments without modifying shared code. Keep them out of version control, understand the merging rules, and use them as a complement to other environment management strategies rather than a replacement. When used thoughtfully, they save time and reduce friction for development teams.
