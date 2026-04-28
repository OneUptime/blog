# How to Use the File Hash Functions (filemd5, filesha256) in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the filemd5, filesha256, filesha1, filesha512, and filebase64sha256 functions in OpenTofu to compute hashes directly from files for deployment tracking.

## Introduction

OpenTofu provides a family of file hash functions that compute checksums directly from file contents without loading the entire file into a string variable first. These are the file-native equivalents of the string hash functions and are essential for Lambda deployment, S3 object versioning, and configuration change detection.

## Available Functions

| Function | Equivalent String Function | Output |
|----------|--------------------------|--------|
| `filemd5(path)` | `md5(file(path))` | 32-char hex |
| `filesha1(path)` | `sha1(file(path))` | 40-char hex |
| `filesha256(path)` | `sha256(file(path))` | 64-char hex |
| `filesha512(path)` | `sha512(file(path))` | 128-char hex |
| `filebase64sha256(path)` | `base64sha256(file(path))` | 44-char Base64 |
| `filebase64sha512(path)` | `base64sha512(file(path))` | 88-char Base64 |

## Syntax

```hcl
filemd5(path)
filesha256(path)
filebase64sha256(path)
# etc.

```

## Basic Examples

```hcl
output "file_md5" {
  value = filemd5("${path.module}/config/app.json")
}

output "file_sha256" {
  value = filesha256("${path.module}/scripts/setup.sh")
}

output "file_base64sha256" {
  value = filebase64sha256("${path.module}/lambda.zip")
}
```

## Practical Use Cases

### Lambda Deployment Change Detection

```hcl
resource "aws_lambda_function" "processor" {
  filename         = "${path.module}/dist/processor.zip"
  function_name    = "data-processor"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"

  # Triggers redeployment when the ZIP file changes
  source_code_hash = filebase64sha256("${path.module}/dist/processor.zip")

  tags = {
    Name = "data-processor"
  }
}
```

### S3 Object Upload with Verification

```hcl
resource "aws_s3_object" "app_config" {
  bucket = aws_s3_bucket.config.id
  key    = "app.json"
  source = "${path.module}/config/app.json"

  # ETag triggers re-upload when the file content changes
  etag = filemd5("${path.module}/config/app.json")
}
```

### Null Resource Trigger for Config Changes

```hcl
resource "null_resource" "apply_config" {
  triggers = {
    config_hash = filesha256("${path.module}/config/nginx.conf")
    script_hash = filesha256("${path.module}/scripts/deploy.sh")
  }

  provisioner "local-exec" {
    command = "${path.module}/scripts/deploy.sh"
  }
}
```

### Tracking Multiple File Changes

```hcl
locals {
  source_files = fileset("${path.module}/lambda/src", "**/*.js")

  # Combined hash of all source files
  combined_hash = sha256(join("", [
    for f in sort(tolist(local.source_files)) :
    filesha256("${path.module}/lambda/src/${f}")
  ]))
}

resource "null_resource" "rebuild" {
  triggers = {
    source_hash = local.combined_hash
  }

  provisioner "local-exec" {
    command     = "npm run build"
    working_dir = "${path.module}/lambda"
  }
}
```

### EC2 User Data Change Trigger

```hcl
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  user_data = filebase64("${path.module}/scripts/userdata.sh")

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name       = "app-server"
      ScriptHash = filesha256("${path.module}/scripts/userdata.sh")
    }
  }
}
```

## Step-by-Step Usage

1. Identify the file whose hash you need.
2. Choose the appropriate hash function based on the target API's requirements:
   - AWS Lambda `source_code_hash`: `filebase64sha256`
   - S3 object `etag`: `filemd5`
   - Custom change tracking: `filesha256`
3. Use the hash in `source_code_hash`, `triggers`, or tags.

```bash
tofu console

> filemd5("./README.md")
"..."
> filesha256("./main.tf")
"..."
```

## Why Use File Functions vs file() + hash()

```hcl
# Preferred - reads raw bytes, works for any file:
filesha256("path/to/file.zip")

# Only works if the file is valid UTF-8 text - fails on binary files:
sha256(file("path/to/file.txt"))
```

The file hash functions read the file as raw bytes, so they work with any file (including binary files like ZIP archives). The `file()` function requires the file to be valid UTF-8 text, so it cannot be used with binary content.

## Conclusion

The file hash functions in OpenTofu are essential for deployment pipelines that need to detect file changes. `filebase64sha256` is critical for Lambda deployments, `filemd5` is used by S3 for integrity verification, and `filesha256` is the standard choice for change-triggered null resources and deployment automation.
