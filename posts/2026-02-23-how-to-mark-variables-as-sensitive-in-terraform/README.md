# How to Mark Variables as Sensitive in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Variables, Infrastructure as Code, DevOps

Description: Learn how to use the sensitive flag on Terraform variables to prevent secrets like passwords and API keys from appearing in plan output, logs, and the terminal.

---

When you work with Terraform, your configurations will almost certainly need secrets at some point - database passwords, API tokens, private keys, and other credentials. If you are not careful, these values will show up in your terminal during `terraform plan` and `terraform apply`, in CI/CD logs, and anywhere else Terraform writes its output. The `sensitive` flag on variables is your first line of defense against accidental exposure.

This post walks through how to mark variables as sensitive, what that actually does behind the scenes, and where its protections fall short so you can fill in the gaps.

## What Does sensitive = true Actually Do?

When you add `sensitive = true` to a variable declaration, Terraform redacts the variable's value from its standard output. That means anywhere Terraform would normally print the value - in plan diffs, apply output, or error messages - it replaces the actual content with `(sensitive value)`.

Here is a basic example:

```hcl
# variables.tf

# This variable holds a database password.
# The sensitive flag tells Terraform to hide
# this value in all CLI output.
variable "db_password" {
  description = "Master password for the RDS instance"
  type        = string
  sensitive   = true
}
```

When you run `terraform plan`, you will see something like this in the output:

```text
# aws_db_instance.main will be created
+ resource "aws_db_instance" "main" {
    + password = (sensitive value)
    ...
  }
```

Without the `sensitive` flag, that password would appear in plain text right there in your terminal.

## Declaring Sensitive Variables

The syntax is straightforward. You add `sensitive = true` alongside the other meta-arguments in your variable block.

```hcl
# variables.tf

# API key for an external monitoring service
variable "monitoring_api_key" {
  description = "API key for the monitoring provider"
  type        = string
  sensitive   = true
}

# TLS private key content
variable "tls_private_key" {
  description = "PEM-encoded private key for TLS certificates"
  type        = string
  sensitive   = true
}

# A complex object that contains sensitive fields
variable "database_credentials" {
  description = "Database connection credentials"
  type = object({
    username = string
    password = string
    host     = string
    port     = number
  })
  sensitive = true
}
```

Notice that the `sensitive` flag applies to the entire variable. In the last example, the username and host are also redacted even though they may not be truly secret. If you need granular control, you will need to split those into separate variables.

## Using Sensitive Variables in Resources

Once declared, you use sensitive variables exactly like any other variable - with `var.name`. Terraform tracks the sensitivity through references.

```hcl
# main.tf

resource "aws_db_instance" "main" {
  identifier     = "myapp-database"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"

  # Terraform knows this comes from a sensitive variable
  # and will redact it in output automatically
  username = "admin"
  password = var.db_password

  allocated_storage = 50
  storage_encrypted = true

  skip_final_snapshot = true
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/myapp/database/password"
  type  = "SecureString"
  # The value reference carries sensitivity forward
  value = var.db_password
}
```

## Sensitivity Propagation

Terraform propagates sensitivity through expressions. If a sensitive variable is used in a string interpolation or a function, the result is also treated as sensitive.

```hcl
locals {
  # This local is automatically marked sensitive because
  # var.db_password is sensitive
  connection_string = "postgresql://admin:${var.db_password}@${aws_db_instance.main.endpoint}/myapp"
}

# This output will require sensitive = true because it
# references a value derived from a sensitive variable
output "connection_string" {
  description = "Database connection string"
  value       = local.connection_string
  sensitive   = true
}
```

If you try to output a sensitive value without marking the output as sensitive, Terraform will throw an error:

```text
Error: Output refers to sensitive values

Output "connection_string" includes a sensitive value.
To declare this output value as sensitive, set sensitive = true.
```

This is a safety net. Terraform will not let you accidentally expose a sensitive value through an output.

## Providing Values for Sensitive Variables

You supply values for sensitive variables the same way you do for regular ones, but some methods are safer than others.

### Environment Variables (Recommended)

```bash
# The TF_VAR_ prefix tells Terraform to use this value
# for the matching variable. The value never touches disk.
export TF_VAR_db_password="my-super-secret-password"
export TF_VAR_monitoring_api_key="ak-9f8e7d6c5b4a3210"

terraform apply
```

This is often the safest approach because the value stays in memory and does not end up in a file that could be committed to version control.

### Variable Files (Use With Care)

```hcl
# secrets.tfvars
# IMPORTANT: Add this file to .gitignore!
db_password        = "my-super-secret-password"
monitoring_api_key = "ak-9f8e7d6c5b4a3210"
```

```bash
terraform apply -var-file="secrets.tfvars"
```

Make sure your `.gitignore` includes this file:

```gitignore
# Never commit secret variable files
secrets.tfvars
*.secret.tfvars
```

### Command Line (Avoid in CI/CD)

```bash
# Works but the value may appear in shell history
# and process listings
terraform apply -var="db_password=my-super-secret-password"
```

This is fine for local development but problematic in CI/CD pipelines where command lines get logged.

## What Sensitive Does NOT Protect

It is important to understand the boundaries of the `sensitive` flag. It is not encryption and it does not provide complete security on its own.

### State Files Still Contain the Value

Terraform stores the actual value in the state file in plain text (or at least, not additionally encrypted by Terraform itself). If you use a local state backend, anyone with access to the `terraform.tfstate` file can read your secrets.

```json
{
  "mode": "managed",
  "type": "aws_db_instance",
  "name": "main",
  "attributes": {
    "password": "my-super-secret-password"
  }
}
```

To protect state, use a remote backend with encryption:

```hcl
# backend.tf

terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "alias/terraform-state"
    dynamodb_table = "terraform-locks"
  }
}
```

### Provider Logs May Expose Values

If you enable debug logging with `TF_LOG=DEBUG`, the provider may log API calls that include your sensitive values. The `sensitive` flag does not control provider-level logging.

### Plan Files Are Not Redacted

When you save a plan to a file with `terraform plan -out=plan.tfplan`, the sensitive values are stored in that binary file. Treat plan files with the same care as state files.

## Combining Sensitive with Validation

You can use both `sensitive` and `validation` on the same variable. This lets you enforce password policies while still keeping the value hidden.

```hcl
variable "db_password" {
  description = "Database password - must be at least 16 characters"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 16
    error_message = "Database password must be at least 16 characters long."
  }

  validation {
    condition     = can(regex("[A-Z]", var.db_password))
    error_message = "Database password must contain at least one uppercase letter."
  }

  validation {
    condition     = can(regex("[0-9]", var.db_password))
    error_message = "Database password must contain at least one digit."
  }
}
```

Note that validation error messages will not reveal the actual value. They only indicate which check failed.

## A Complete Working Example

Here is a full configuration that demonstrates sensitive variables in a realistic scenario:

```hcl
# variables.tf

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub personal access token for CI/CD"
  type        = string
  sensitive   = true
}

# main.tf

resource "aws_db_instance" "app" {
  identifier     = "app-${var.environment}"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = "db.t3.medium"
  username       = "admin"
  password       = var.db_password

  allocated_storage = 20
  storage_encrypted = true

  skip_final_snapshot = true
}

resource "aws_codebuild_project" "app" {
  name         = "app-build-${var.environment}"
  service_role = aws_iam_role.codebuild.arn

  source {
    type     = "GITHUB"
    location = "https://github.com/myorg/myapp.git"
  }

  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    image        = "aws/codebuild/standard:7.0"
    type         = "LINUX_CONTAINER"

    # The token value is sensitive and will be
    # redacted in plan output
    environment_variable {
      name  = "GITHUB_TOKEN"
      value = var.github_token
      type  = "PLAINTEXT"
    }
  }

  artifacts {
    type = "NO_ARTIFACTS"
  }
}

# outputs.tf

output "db_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.app.endpoint
}

# This output requires sensitive = true because it
# references the sensitive db_password variable
output "db_connection_url" {
  description = "Full database connection URL"
  value       = "mysql://admin:${var.db_password}@${aws_db_instance.app.endpoint}/app"
  sensitive   = true
}
```

## Best Practices

1. **Mark early, mark often.** If there is any chance a value is sensitive, flag it. The cost is minimal and the protection is immediate.

2. **Encrypt your state.** The `sensitive` flag alone is not enough. Always use encrypted remote state backends.

3. **Use environment variables in CI/CD.** Do not pass secrets via `-var` flags where they might appear in logs.

4. **Split mixed objects.** If an object has both sensitive and non-sensitive fields, consider separating them into distinct variables so only the truly secret parts get redacted.

5. **Pair with validation.** Add validation rules to your sensitive variables to catch formatting issues without exposing the actual values.

## Wrapping Up

The `sensitive` flag in Terraform is a simple but important tool for preventing accidental exposure of secrets in your terminal output and logs. It works by redacting values in plan and apply output and by propagating sensitivity through expressions. But remember that it is one layer in a broader security strategy - you still need encrypted state, proper access controls, and good secret management practices to keep your infrastructure credentials truly safe.

For more on securing your Terraform workflows, check out our guide on [handling sensitive data in Terraform](https://oneuptime.com/blog/post/2026-01-27-terraform-sensitive-data/view).
