# How to Use Local-Only Data Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Data Source, Local, templatefile, Local_file, HCL, Infrastructure as Code

Description: Learn how to use local-only data sources in OpenTofu that compute values locally without making API calls, such as file reading, template rendering, and directory listing.

---

Local-only data sources and filesystem functions compute values from files on the machine running OpenTofu - they don't make network calls or query remote service APIs. These are useful for reading local files, rendering templates, computing checksums, and listing file sets, all within your configuration.

---

## The local_file Data Source

Read a local file's contents into your configuration:

```hcl
# Read a public key file for use in an AWS key pair

data "local_file" "public_key" {
  filename = "${path.module}/keys/deploy.pub"
}

resource "aws_key_pair" "deploy" {
  key_name   = "deploy-key"
  public_key = data.local_file.public_key.content
}
```

Commonly used attributes on `local_file` include:
- `content` - the file contents as a string
- `content_base64` - base64-encoded contents
- `content_md5` - MD5 hash of the contents

---

## The local_sensitive_file Data Source

Same as `local_file` but marks the content as sensitive, so it is redacted in normal plan and apply output:

```hcl
data "local_sensitive_file" "tls_key" {
  filename = "${path.module}/certs/server.key"
}

resource "aws_secretsmanager_secret_version" "tls" {
  secret_id     = aws_secretsmanager_secret.tls.id
  secret_string = data.local_sensitive_file.tls_key.content
}
```

---

## Using path Variables with Local Data Sources

OpenTofu provides path values to build filesystem paths relative to your configuration:

```hcl
# path.module - the directory containing the current .tf file
# path.root - the directory of the root module
# path.cwd - the original working directory where tofu was invoked

data "local_file" "config" {
  filename = "${path.module}/config/app.json"
}

data "local_file" "root_config" {
  filename = "${path.root}/shared/policy.json"
}
```

---

## The templatefile Function (Preferred over template_file)

For rendering templates, the `templatefile()` function is preferred over the `template_file` data source in modern OpenTofu:

```hcl
# templates/user_data.sh.tpl:
# #!/bin/bash
# hostnamectl set-hostname ${hostname}
# echo "${app_port}" > /etc/app_port

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  # Render a template file with variables
  user_data = templatefile("${path.module}/templates/user_data.sh.tpl", {
    hostname = "app-${var.environment}"
    app_port = var.app_port
  })
}
```

---

## The fileset Function for Listing Files

`fileset()` returns a set of file paths matching a glob pattern - useful for iterating over local files:

```hcl
# Upload all HTML files in the static/ directory to S3
resource "aws_s3_object" "static" {
  for_each = fileset("${path.module}/static", "**/*.html")

  bucket = aws_s3_bucket.website.bucket
  key    = each.value
  source = "${path.module}/static/${each.value}"
  etag   = filemd5("${path.module}/static/${each.value}")

  content_type = "text/html"
}
```

---

## Local Checksums for Change Detection

Use file hash functions to detect when local files change:

```hcl
# Re-upload the Lambda zip only when it changes
resource "aws_lambda_function" "api" {
  function_name = "api"
  filename      = "${path.module}/lambda.zip"

  # filesha256 computes the hash locally
  source_code_hash = filesha256("${path.module}/lambda.zip")

  runtime = "python3.11"
  handler = "main.handler"
  role    = aws_iam_role.lambda.arn
}
```

---

## Reading JSON Configuration Files

```hcl
# config.json:
# { "instance_type": "t3.micro", "min_size": 2, "max_size": 10 }

locals {
  config = jsondecode(file("${path.module}/config.json"))
}

resource "aws_autoscaling_group" "app" {
  min_size         = local.config.min_size
  max_size         = local.config.max_size

  launch_template {
    id = aws_launch_template.app.id
  }
}
```

---

## Summary

Local-only data sources and functions - `local_file`, `local_sensitive_file`, `templatefile()`, `fileset()`, and file hash functions - compute values from the local filesystem without network calls. Use them to read SSH keys, render templates, upload static assets, detect file changes, and load configuration from JSON files. Filesystem functions work with files already on disk, while `local_file` and `local_sensitive_file` can also respect dependencies when you need to read a file created during a run.
