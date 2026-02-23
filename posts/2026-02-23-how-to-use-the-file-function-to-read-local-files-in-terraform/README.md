# How to Use the file Function to Read Local Files in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, file Function, File System, HCL, Infrastructure as Code, Configuration Management

Description: Learn how to use the file function in Terraform to read the contents of local files and embed them directly into your infrastructure configuration.

---

The `file` function in Terraform reads the contents of a file from the local filesystem and returns it as a string. This is one of the most useful functions when you need to embed configuration files, scripts, policies, or templates directly into your Terraform configuration without inlining everything.

## What Is the file Function?

The `file` function takes a file path as its argument and returns the file's contents as a UTF-8 encoded string:

```hcl
# file(path)
# Reads the file at the given path and returns its contents as a string
file("./scripts/startup.sh")
```

The path is relative to the root module directory (where you run `terraform plan`), unless you use `path.module`, `path.root`, or an absolute path.

## Basic Usage

Here is the simplest use case - reading a shell script to use as EC2 user data:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"

  # Read the startup script from a local file
  user_data = file("${path.module}/scripts/startup.sh")

  tags = {
    Name = "web-server"
  }
}
```

And the script file at `scripts/startup.sh`:

```bash
#!/bin/bash
# Install and configure nginx
apt-get update
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx

# Configure the default site
cat > /var/www/html/index.html <<'HTMLEOF'
<h1>Hello from Terraform</h1>
HTMLEOF
```

## Using path.module for Module-Relative Paths

When your code is inside a module, file paths need to be relative to the module, not the root:

```hcl
# modules/web-server/main.tf

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  # path.module resolves to the directory containing this .tf file
  user_data = file("${path.module}/files/user-data.sh")
}

# Without path.module, Terraform would look in the root module directory
# which would break when the module is called from elsewhere
```

## Reading IAM Policy Documents

Instead of writing JSON policies inline, you can keep them in separate files:

```hcl
# The policy file at policies/s3-access.json:
# {
#   "Version": "2012-10-17",
#   "Statement": [
#     {
#       "Effect": "Allow",
#       "Action": ["s3:GetObject", "s3:ListBucket"],
#       "Resource": ["arn:aws:s3:::my-bucket", "arn:aws:s3:::my-bucket/*"]
#     }
#   ]
# }

resource "aws_iam_policy" "s3_access" {
  name        = "s3-read-access"
  description = "Allow read access to the application S3 bucket"

  # Read the policy from a file instead of using an inline heredoc
  policy = file("${path.module}/policies/s3-access.json")
}
```

This approach keeps your `.tf` files cleaner and makes the policies easier to review in pull requests since they are standalone JSON files.

## Loading SSH Public Keys

A common pattern is reading SSH public keys from local files:

```hcl
resource "aws_key_pair" "deploy" {
  key_name   = "deploy-key"
  # Read the public key from the local .ssh directory
  public_key = file("~/.ssh/id_rsa.pub")
}

# Or from a project-local file
resource "aws_key_pair" "app" {
  key_name   = "app-key"
  public_key = file("${path.module}/keys/app-deploy.pub")
}
```

## Reading TLS Certificates

When working with TLS certificates stored locally:

```hcl
resource "aws_iam_server_certificate" "app" {
  name             = "app-cert"
  certificate_body = file("${path.module}/certs/app.crt")
  private_key      = file("${path.module}/certs/app.key")
  certificate_chain = file("${path.module}/certs/chain.crt")
}

# Or for ACM
resource "aws_acm_certificate" "imported" {
  private_key       = file("${path.module}/certs/private.key")
  certificate_body  = file("${path.module}/certs/certificate.crt")
  certificate_chain = file("${path.module}/certs/chain.crt")
}
```

## Nginx and Application Configuration Files

Reading full configuration files for services:

```hcl
resource "aws_s3_object" "nginx_config" {
  bucket  = aws_s3_bucket.config.id
  key     = "nginx/nginx.conf"
  content = file("${path.module}/configs/nginx.conf")
}

resource "aws_s3_object" "app_config" {
  bucket  = aws_s3_bucket.config.id
  key     = "app/config.yaml"
  content = file("${path.module}/configs/app-config.yaml")
}
```

## file vs templatefile

An important distinction: `file` reads a file as-is, while `templatefile` reads a file and processes template variables within it:

```hcl
# file() - reads the content literally, no variable substitution
locals {
  raw_script = file("${path.module}/scripts/install.sh")
  # Returns the exact contents of the file, dollar signs and all
}

# templatefile() - reads and processes template variables
locals {
  rendered_script = templatefile("${path.module}/scripts/install.tftpl", {
    package_name = "nginx"
    port         = 8080
  })
  # Replaces ${package_name} and ${port} in the template
}
```

Use `file` when you want the exact file contents. Use `templatefile` when you need to inject variables.

## Combining file with Other Functions

The `file` function returns a string, so you can chain it with other string or encoding functions:

```hcl
locals {
  # Read a file and base64 encode it
  encoded_script = base64encode(file("${path.module}/scripts/bootstrap.sh"))

  # Read a JSON file and decode it into an HCL object
  config_object = jsondecode(file("${path.module}/configs/settings.json"))

  # Read a file and compute its hash for change detection
  script_hash = sha256(file("${path.module}/scripts/deploy.sh"))

  # Read a YAML file and decode it (requires yamldecode)
  yaml_config = yamldecode(file("${path.module}/configs/app.yaml"))
}

resource "aws_lambda_function" "processor" {
  function_name = "data-processor"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "python3.9"

  # Use the hash to trigger updates when the script changes
  source_code_hash = local.script_hash

  environment {
    variables = {
      CONFIG = file("${path.module}/configs/lambda-env.json")
    }
  }
}
```

## Reading Configuration for Multiple Environments

Structure your files by environment and use variables to select them:

```hcl
variable "environment" {
  type    = string
  default = "staging"
}

locals {
  # Read environment-specific configuration
  app_config = file("${path.module}/configs/${var.environment}/app.conf")
  db_config  = file("${path.module}/configs/${var.environment}/database.conf")
}

# Directory structure:
# configs/
#   dev/
#     app.conf
#     database.conf
#   staging/
#     app.conf
#     database.conf
#   production/
#     app.conf
#     database.conf
```

## Error Handling

The `file` function throws an error if the file does not exist. Use `fileexists` to check first:

```hcl
locals {
  # Check if a custom config exists, otherwise use default
  has_custom_config = fileexists("${path.module}/configs/custom.conf")

  config_content = local.has_custom_config ? (
    file("${path.module}/configs/custom.conf")
  ) : (
    file("${path.module}/configs/default.conf")
  )
}
```

## Important Limitations

There are a few things to keep in mind when using `file`:

```hcl
# 1. file() only reads UTF-8 text files
# For binary files, use filebase64() instead
# file("image.png") would fail or produce garbled output

# 2. file() reads at plan time, not apply time
# The file must exist when you run terraform plan
# You cannot read files that are created during apply

# 3. file() should not be used for sensitive data in state
# The contents will be stored in the state file
# Use a secrets manager for passwords and API keys

# 4. Maximum file size is limited by Terraform's memory
# Very large files (hundreds of MB) are not a good fit
```

## Multi-line Configuration Embedding

For configuration management tools like cloud-init:

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.large"

  # Cloud-init configuration from a local file
  user_data = file("${path.module}/cloud-init/web-server.yaml")

  tags = {
    Name = "app-server"
  }
}
```

Where `cloud-init/web-server.yaml` is:

```yaml
#cloud-config
package_update: true
packages:
  - nginx
  - certbot
  - python3-certbot-nginx
runcmd:
  - systemctl start nginx
  - certbot --nginx -d example.com --non-interactive --agree-tos -m admin@example.com
```

## Summary

The `file` function reads a local file and returns its contents as a string. It is one of the most frequently used functions in Terraform because it lets you keep scripts, policies, certificates, and configuration files as separate, manageable files rather than embedding them inline. Always use `path.module` to make paths module-relative, combine `file` with `jsondecode` or `yamldecode` for structured data, and remember that it only handles UTF-8 text. For binary files, reach for `filebase64` instead.

For related functions, check out our posts on the [fileexists function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-fileexists-function-in-terraform/view) and the [filebase64 function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-filebase64-function-in-terraform/view).
