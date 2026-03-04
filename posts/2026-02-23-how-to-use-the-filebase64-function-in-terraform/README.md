# How to Use the filebase64 Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, filebase64 Function, File Systems, HCL, Infrastructure as Code, Encoding, Base64

Description: Learn how to use the filebase64 function in Terraform to read local files and encode their contents as base64 strings for use with cloud resources and APIs.

---

The `filebase64` function reads a file from the local filesystem and returns its contents as a base64-encoded string. This is essential when you need to pass binary files or file contents to cloud resources that expect base64-encoded data, such as Lambda function code, EC2 user data, or container image configurations.

## What Is the filebase64 Function?

The `filebase64` function reads a file and returns a base64-encoded representation of its contents:

```hcl
# filebase64(path)
# Reads a file and returns base64-encoded contents
filebase64("${path.module}/scripts/init.sh")
# Returns something like: "IyEvYmluL2Jhc2gKZWNobyAiSGVsbG8i..."
```

Unlike the `file` function which only handles UTF-8 text, `filebase64` can handle any file type - including binary files like images, compiled programs, and archives.

## Why Base64?

Many cloud APIs require binary data to be transmitted as base64-encoded strings. This encoding converts binary data into a text-safe format that can be embedded in JSON, HCL, and other text-based formats without corruption. Common scenarios include:

- EC2 user data
- Lambda function code
- Container definitions
- Cloud-init configurations
- Certificate and key data
- Custom AMI boot configurations

## Basic Usage with EC2 User Data

Some providers accept user data in base64 format:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"

  # user_data_base64 expects base64-encoded data
  user_data_base64 = filebase64("${path.module}/scripts/startup.sh")

  tags = {
    Name = "web-server"
  }
}
```

This is equivalent to using `base64encode(file(...))` but more concise and handles binary content correctly.

## Embedding Binary Files in Cloud-Init

Cloud-init configurations sometimes need to include binary files:

```hcl
locals {
  # Read a binary configuration file as base64
  agent_binary = filebase64("${path.module}/binaries/monitoring-agent")

  cloud_init = <<-YAML
    #cloud-config
    write_files:
      - encoding: b64
        content: ${local.agent_binary}
        path: /opt/monitoring/agent
        permissions: '0755'
    runcmd:
      - /opt/monitoring/agent --config /etc/monitoring.conf
  YAML
}

resource "aws_instance" "monitored" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  user_data     = local.cloud_init

  tags = {
    Name = "monitored-instance"
  }
}
```

## Working with Container Definitions

ECS task definitions sometimes need base64-encoded configuration:

```hcl
locals {
  # Encode a configuration file for embedding in environment variables
  app_config_b64 = filebase64("${path.module}/configs/app.yaml")
}

resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  network_mode             = "awsvpc"

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "${var.ecr_repo_url}:latest"
      environment = [
        {
          name  = "APP_CONFIG_B64"
          value = local.app_config_b64
        }
      ]
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
    }
  ])
}
```

The application can then decode the base64 config at startup.

## Uploading Binary Files to S3

When you need to upload a binary file to S3 using the `content_base64` attribute:

```hcl
resource "aws_s3_object" "favicon" {
  bucket         = aws_s3_bucket.website.id
  key            = "favicon.ico"
  content_base64 = filebase64("${path.module}/static/favicon.ico")
  content_type   = "image/x-icon"
}

resource "aws_s3_object" "logo" {
  bucket         = aws_s3_bucket.website.id
  key            = "images/logo.png"
  content_base64 = filebase64("${path.module}/static/logo.png")
  content_type   = "image/png"
}
```

## filebase64 vs file vs base64encode

Here is how these three approaches compare:

```hcl
locals {
  # file() - reads UTF-8 text files only
  # Returns the raw string content
  text_content = file("${path.module}/readme.txt")

  # base64encode(file()) - reads UTF-8 text then encodes
  # Works for text files but NOT for binary files
  text_as_b64 = base64encode(file("${path.module}/readme.txt"))

  # filebase64() - reads ANY file and returns base64
  # Works for both text and binary files
  any_file_b64 = filebase64("${path.module}/readme.txt")

  # For text files, these produce the same result:
  # base64encode(file("readme.txt")) == filebase64("readme.txt")

  # For binary files, only filebase64 works correctly
  binary_b64 = filebase64("${path.module}/image.png")
  # file("image.png") would fail or produce incorrect output
}
```

The rule is simple: use `file` for text you want to use as-is, use `filebase64` when you need base64 encoding (especially for binary files).

## Passing Certificates and Keys

Some resources need certificates in base64 format:

```hcl
resource "kubernetes_secret" "tls" {
  metadata {
    name      = "app-tls"
    namespace = "default"
  }

  type = "kubernetes.io/tls"

  data = {
    "tls.crt" = filebase64("${path.module}/certs/tls.crt")
    "tls.key" = filebase64("${path.module}/certs/tls.key")
  }
}
```

## Custom Launch Templates

AWS Launch Templates accept user data in base64:

```hcl
resource "aws_launch_template" "web" {
  name_prefix   = "web-"
  image_id      = var.ami_id
  instance_type = "t3.medium"

  # Launch templates expect base64-encoded user data
  user_data = filebase64("${path.module}/scripts/web-init.sh")

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "web-server"
    }
  }
}
```

## Encoding Configuration for Azure Resources

Azure resources frequently use base64-encoded content:

```hcl
resource "azurerm_virtual_machine_extension" "custom_script" {
  name                 = "custom-script"
  virtual_machine_id   = azurerm_linux_virtual_machine.app.id
  publisher            = "Microsoft.Azure.Extensions"
  type                 = "CustomScript"
  type_handler_version = "2.1"

  settings = jsonencode({
    "script" = filebase64("${path.module}/scripts/azure-setup.sh")
  })
}
```

## Multiple Binary Files with for_each

Upload multiple binary files dynamically:

```hcl
locals {
  # Map of binary files to upload
  binary_assets = {
    "favicon.ico"     = { content_type = "image/x-icon" }
    "logo.png"        = { content_type = "image/png" }
    "background.jpg"  = { content_type = "image/jpeg" }
    "app-icon.svg"    = { content_type = "image/svg+xml" }
  }
}

resource "aws_s3_object" "assets" {
  for_each = local.binary_assets

  bucket         = aws_s3_bucket.assets.id
  key            = "assets/${each.key}"
  content_base64 = filebase64("${path.module}/assets/${each.key}")
  content_type   = each.value.content_type
  cache_control  = "max-age=86400"
}
```

## GCP Cloud Functions

Google Cloud Functions can use base64-encoded source:

```hcl
resource "google_cloudfunctions_function" "processor" {
  name        = "data-processor"
  runtime     = "python39"
  entry_point = "handler"

  source_archive_bucket = google_storage_bucket.functions.name
  source_archive_object = google_storage_bucket_object.function_zip.name
}

resource "google_storage_bucket_object" "function_zip" {
  name    = "functions/processor.zip"
  bucket  = google_storage_bucket.functions.name
  content = filebase64("${path.module}/functions/processor.zip")
}
```

## Combining with filebase64sha256 for Change Detection

A common pattern is using `filebase64` for the content and `filebase64sha256` for detecting changes:

```hcl
resource "aws_lambda_function" "api" {
  function_name = "api-handler"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  filename         = "${path.module}/lambda/api.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda/api.zip")
}
```

## Important Notes

```hcl
# filebase64 reads the file at plan time
# The file must exist when terraform plan runs

# The returned string can be very large for big files
# This gets stored in the Terraform state
# Avoid using it for files larger than a few MB

# For very large files, consider:
# - Using the source attribute with a file path instead of content_base64
# - Uploading files via a provisioner or external tool
# - Using a CI/CD pipeline for large artifacts

# filebase64 does not compress the data
# Base64 encoding increases size by approximately 33%
```

## Summary

The `filebase64` function reads any local file - text or binary - and returns a base64-encoded string. It is essential for passing file contents to cloud resources that expect base64 data, such as EC2 user data, Lambda code, S3 objects, Kubernetes secrets, and Azure VM extensions. For text files, it produces the same result as `base64encode(file(...))`, but for binary files it is the only correct option. Keep in mind that base64 encoding adds about 33% to the data size, and the encoded content is stored in the Terraform state.

For related functions, check out our posts on the [file function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-file-function-to-read-local-files-in-terraform/view) and the [filebase64sha256 function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-filebase64sha256-function-in-terraform/view).
