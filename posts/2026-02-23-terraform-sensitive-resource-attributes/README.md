# How to Use Sensitive Resource Attributes in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Sensitive Data, Infrastructure as Code, Best Practices

Description: Learn how to mark resource attributes as sensitive in Terraform to prevent secrets from appearing in plan output, logs, and state file exploration.

---

Terraform configurations regularly deal with sensitive values - database passwords, API keys, TLS private keys, and authentication tokens. If you are not careful, these values end up displayed in plan output, logged in CI/CD pipelines, and visible to anyone with access to the state file. Terraform provides the `sensitive` attribute to control where these values are shown.

This guide covers how to mark variables, outputs, and resource attributes as sensitive, what protections that provides, and what it does not protect against.

## Sensitive Variables

The most common starting point is marking input variables as sensitive:

```hcl
variable "db_password" {
  type        = string
  description = "The master password for the RDS instance"
  sensitive   = true
}

variable "api_key" {
  type        = string
  description = "API key for the external service"
  sensitive   = true
}
```

When a variable is marked sensitive, Terraform redacts its value from plan output and any log output:

```
# aws_db_instance.main will be created
+ resource "aws_db_instance" "main" {
    + password = (sensitive value)
  }
```

### Providing Sensitive Variable Values

You can pass sensitive values through several methods:

```bash
# Environment variable (recommended for CI/CD)
export TF_VAR_db_password="my-secret-password"
terraform apply

# .tfvars file (make sure it is in .gitignore)
# secrets.tfvars
# db_password = "my-secret-password"
terraform apply -var-file="secrets.tfvars"

# Command line (visible in process list - avoid in production)
terraform apply -var="db_password=my-secret-password"
```

## Sensitive Outputs

When you need to output a sensitive value (for example, to pass it to another module), mark the output as sensitive:

```hcl
output "db_password" {
  value     = aws_db_instance.main.password
  sensitive = true
}

output "generated_api_key" {
  value     = random_password.api_key.result
  sensitive = true
}
```

Without the `sensitive` flag, Terraform will refuse to output a value derived from a sensitive variable:

```
Error: Output refers to sensitive values

  Output "db_password" includes a sensitive value. Use sensitive = true
  to suppress this warning.
```

### Reading Sensitive Outputs

Sensitive outputs are hidden from `terraform output` display:

```bash
terraform output
# db_password = <sensitive>
# generated_api_key = <sensitive>

# To see the actual value, use -json
terraform output -json
# {
#   "db_password": {
#     "sensitive": true,
#     "type": "string",
#     "value": "actual-password-here"
#   }
# }

# Or request a specific output with -raw
terraform output -raw db_password
# actual-password-here
```

## Sensitive Attribute Propagation

When you reference a sensitive value, the sensitivity propagates through expressions:

```hcl
variable "db_password" {
  type      = string
  sensitive = true
}

locals {
  # This local is automatically sensitive because it derives from a sensitive variable
  connection_string = "postgres://admin:${var.db_password}@db.example.com:5432/mydb"
}

# This output must be marked sensitive because it includes sensitive data
output "connection_string" {
  value     = local.connection_string
  sensitive = true
}
```

## Using sensitive Function

Terraform provides a `sensitive()` function to mark any value as sensitive inline:

```hcl
locals {
  # Mark a value as sensitive even if the source is not
  api_endpoint = sensitive("https://api.example.com/secret-endpoint")
}

# The nonsensitive() function removes the sensitive flag
# Use with caution - only when you have verified the value is safe to expose
output "safe_value" {
  value = nonsensitive(var.maybe_sensitive)
}
```

## Provider-Level Sensitive Attributes

Some resource attributes are automatically marked sensitive by the provider, regardless of your configuration:

```hcl
# The password attribute of aws_db_instance is sensitive by default
resource "aws_db_instance" "main" {
  identifier     = "my-database"
  engine         = "postgres"
  instance_class = "db.r5.large"
  username       = "admin"
  password       = var.db_password  # Always shown as (sensitive value) in plans

  skip_final_snapshot = true
}

# random_password always marks its result as sensitive
resource "random_password" "main" {
  length  = 32
  special = true
}

# tls_private_key marks the private key as sensitive
resource "tls_private_key" "deploy" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# The private key PEM is automatically sensitive
output "private_key" {
  value     = tls_private_key.deploy.private_key_pem
  sensitive = true
}
```

## Working with Sensitive Values in Provisioners

Sensitive values in provisioners require extra attention:

```hcl
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # Connection blocks handle sensitive values
  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = tls_private_key.deploy.private_key_pem  # Sensitive
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      # Be careful - this could log the password
      "echo 'DB_PASSWORD=${var.db_password}' >> /etc/app/config",
    ]
  }
}
```

The problem here is that the provisioner command itself might log the sensitive value. A better approach:

```hcl
provisioner "remote-exec" {
  inline = [
    # Write to a file without echoing the value
    "cat > /etc/app/config << 'CONF'",
    "DB_HOST=${aws_db_instance.main.endpoint}",
    "CONF",
  ]
}

# Better yet, use a template file
provisioner "file" {
  content     = templatefile("${path.module}/config.tpl", {
    db_host     = aws_db_instance.main.endpoint
    db_password = var.db_password
  })
  destination = "/etc/app/config"
}
```

## Sensitive Values and the State File

Here is the most important thing to understand: marking a value as `sensitive` does NOT encrypt it in the state file. The state file contains the actual plaintext values regardless of the sensitive flag. The `sensitive` marking only controls what is displayed in terminal output and logs.

To protect sensitive values in state:

```hcl
# Use a remote backend with encryption
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/my-key"
    dynamodb_table = "terraform-lock"
  }
}
```

Additional state protection measures:
- Restrict access to the state file using IAM policies
- Enable versioning on the S3 bucket to track state changes
- Use state file locking to prevent concurrent modifications
- Never commit state files to version control

## Sensitive Values in Modules

When passing sensitive values between modules:

```hcl
# Root module
variable "db_password" {
  type      = string
  sensitive = true
}

module "database" {
  source      = "./modules/database"
  db_password = var.db_password  # Sensitivity carries through
}

# modules/database/variables.tf
variable "db_password" {
  type      = string
  sensitive = true  # Mark as sensitive in the module too
}
```

If you forget to mark the module's variable as sensitive, Terraform will still respect the sensitivity from the calling module, but it is good practice to be explicit.

## Common Patterns

### Database Credentials

```hcl
# Generate a random password
resource "random_password" "db" {
  length  = 24
  special = true
}

# Use it in the database
resource "aws_db_instance" "main" {
  identifier     = "production"
  engine         = "postgres"
  instance_class = "db.r5.large"
  username       = "admin"
  password       = random_password.db.result  # Automatically sensitive

  skip_final_snapshot = true
}

# Store in Secrets Manager for applications to read
resource "aws_secretsmanager_secret" "db_password" {
  name = "production/db-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db.result
}
```

### API Keys

```hcl
variable "third_party_api_key" {
  type      = string
  sensitive = true
}

resource "aws_ssm_parameter" "api_key" {
  name  = "/app/api-key"
  type  = "SecureString"
  value = var.third_party_api_key
}
```

## Conclusion

Sensitive resource attributes in Terraform are your first line of defense against leaking secrets in plan output, CI/CD logs, and terminal sessions. Use the `sensitive` flag on variables, outputs, and locals that contain secrets. Remember that sensitivity is a display concern, not an encryption mechanism - your state file still contains plaintext values and needs its own protection through backend encryption and access controls. Combine sensitive attributes with external secrets managers like AWS Secrets Manager or HashiCorp Vault for a complete secrets management strategy.

For more on resource management, see our guide on [how to understand resource addressing in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-resource-addressing/view).
