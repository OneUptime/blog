# How to Package Lambda Code with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, Packaging, Deployments, Serverless

Description: A practical guide to packaging AWS Lambda function code with Terraform, covering ZIP archives, Docker containers, dependency management, and deployment strategies.

---

Getting your Lambda code packaged and deployed correctly is one of those things that should be simple but has a lot of subtle gotchas. The function code needs to be in a ZIP file or a container image. Dependencies need to be included. The package needs to be the right size. And Terraform needs to know when to redeploy.

This guide covers every packaging approach for Lambda with Terraform: inline ZIP archives, pre-built packages, Docker containers, and the dependency management patterns that make each approach work reliably.

## Method 1: archive_file Data Source

The simplest approach for small functions. Terraform creates the ZIP file for you:

```hcl
# Package the Lambda code into a ZIP
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/build/lambda.zip"

  # Exclude files you don't want in the package
  excludes = [
    "__pycache__",
    "*.pyc",
    "tests",
    ".env",
  ]
}

# Deploy the Lambda function
resource "aws_lambda_function" "main" {
  function_name = "myapp-handler"
  handler       = "index.handler"
  runtime       = "python3.12"
  role          = aws_iam_role.lambda_exec.arn

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  # source_code_hash triggers redeployment when code changes

  tags = {
    Name = "myapp-handler"
  }
}
```

The `source_code_hash` is critical - without it, Terraform has no way to detect code changes and will not redeploy your function.

For a single file instead of a directory:

```hcl
data "archive_file" "lambda" {
  type        = "zip"
  source_file = "${path.module}/src/index.py"
  output_path = "${path.module}/build/lambda.zip"
}
```

## Method 2: Pre-Built ZIP with Dependencies

When your function has pip or npm dependencies, build the package before Terraform runs:

```hcl
# Build step - install dependencies and create ZIP
resource "null_resource" "build_lambda" {
  triggers = {
    # Rebuild when source code or dependencies change
    source_hash = sha256(join("", [
      for f in fileset("${path.module}/src", "**") :
      filesha256("${path.module}/src/${f}")
    ]))
    requirements_hash = filesha256("${path.module}/src/requirements.txt")
  }

  provisioner "local-exec" {
    command = <<-EOT
      cd ${path.module}
      rm -rf build/package
      mkdir -p build/package

      # Install dependencies
      pip install -r src/requirements.txt \
        -t build/package \
        --platform manylinux2014_x86_64 \
        --only-binary=:all:

      # Copy source code
      cp -r src/*.py build/package/

      # Create ZIP
      cd build/package
      zip -r ../lambda.zip .
    EOT
  }
}

resource "aws_lambda_function" "main" {
  function_name = "myapp-handler"
  handler       = "index.handler"
  runtime       = "python3.12"
  role          = aws_iam_role.lambda_exec.arn

  filename         = "${path.module}/build/lambda.zip"
  source_code_hash = null_resource.build_lambda.triggers.source_hash

  depends_on = [null_resource.build_lambda]

  tags = {
    Name = "myapp-handler"
  }
}
```

For Node.js:

```hcl
resource "null_resource" "build_lambda" {
  triggers = {
    source_hash  = sha256(join("", [
      for f in fileset("${path.module}/src", "**") :
      filesha256("${path.module}/src/${f}")
    ]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      cd ${path.module}/src
      npm ci --production
      zip -r ../build/lambda.zip . -x "*.test.js" "jest.config.*"
    EOT
  }
}
```

## Method 3: S3-Based Deployment

For larger packages or CI/CD pipelines, upload the ZIP to S3 first:

```hcl
# S3 bucket for Lambda deployment packages
resource "aws_s3_bucket" "lambda_packages" {
  bucket = "myapp-lambda-packages-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "lambda-packages"
  }
}

resource "aws_s3_bucket_versioning" "lambda_packages" {
  bucket = aws_s3_bucket.lambda_packages.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Upload the package to S3
resource "aws_s3_object" "lambda_package" {
  bucket = aws_s3_bucket.lambda_packages.id
  key    = "myapp-handler/${var.version}/lambda.zip"
  source = "${path.module}/build/lambda.zip"
  etag   = filemd5("${path.module}/build/lambda.zip")
}

# Deploy from S3
resource "aws_lambda_function" "main" {
  function_name = "myapp-handler"
  handler       = "index.handler"
  runtime       = "python3.12"
  role          = aws_iam_role.lambda_exec.arn

  s3_bucket         = aws_s3_bucket.lambda_packages.id
  s3_key            = aws_s3_object.lambda_package.key
  s3_object_version = aws_s3_object.lambda_package.version_id
  source_code_hash  = filebase64sha256("${path.module}/build/lambda.zip")

  tags = {
    Name = "myapp-handler"
  }
}

data "aws_caller_identity" "current" {}
```

## Method 4: Docker Container Image

For functions with complex dependencies, large packages, or custom runtimes, use container images:

```hcl
# ECR repository for the Lambda image
resource "aws_ecr_repository" "lambda" {
  name                 = "myapp-lambda"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "myapp-lambda"
  }
}

# Build and push the Docker image
resource "null_resource" "docker_build" {
  triggers = {
    dockerfile = filesha256("${path.module}/Dockerfile")
    source     = sha256(join("", [
      for f in fileset("${path.module}/src", "**") :
      filesha256("${path.module}/src/${f}")
    ]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Log in to ECR
      aws ecr get-login-password --region ${var.aws_region} | \
        docker login --username AWS --password-stdin ${aws_ecr_repository.lambda.repository_url}

      # Build the image
      docker build -t ${aws_ecr_repository.lambda.repository_url}:latest \
        -f ${path.module}/Dockerfile ${path.module}

      # Push to ECR
      docker push ${aws_ecr_repository.lambda.repository_url}:latest
    EOT
  }
}

# Lambda function from container image
resource "aws_lambda_function" "main" {
  function_name = "myapp-handler"
  role          = aws_iam_role.lambda_exec.arn
  timeout       = 300
  memory_size   = 512

  package_type = "Image"
  image_uri    = "${aws_ecr_repository.lambda.repository_url}:latest"

  depends_on = [null_resource.docker_build]

  tags = {
    Name = "myapp-handler"
  }
}
```

The Dockerfile for a Python Lambda:

```dockerfile
FROM public.ecr.aws/lambda/python:3.12

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy function code
COPY src/ ${LAMBDA_TASK_ROOT}/

# Set the handler
CMD ["index.handler"]
```

## Method 5: Using a Build Script Module

For teams with many Lambda functions, create a reusable module that handles packaging:

```hcl
# modules/lambda-package/main.tf

variable "source_dir" {
  type = string
}

variable "output_path" {
  type = string
}

variable "runtime" {
  type    = string
  default = "python3.12"
}

# Detect if there are pip dependencies
locals {
  has_requirements = fileexists("${var.source_dir}/requirements.txt")
}

# Build with dependencies
resource "null_resource" "build" {
  count = local.has_requirements ? 1 : 0

  triggers = {
    hash = sha256(join("", [
      for f in fileset(var.source_dir, "**") :
      filesha256("${var.source_dir}/${f}")
    ]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      rm -rf ${var.output_path}_build
      mkdir -p ${var.output_path}_build
      pip install -r ${var.source_dir}/requirements.txt -t ${var.output_path}_build
      cp -r ${var.source_dir}/*.py ${var.output_path}_build/
      cd ${var.output_path}_build && zip -r ${var.output_path} .
    EOT
  }
}

# Simple archive without dependencies
data "archive_file" "simple" {
  count = local.has_requirements ? 0 : 1

  type        = "zip"
  source_dir  = var.source_dir
  output_path = var.output_path
}

output "filename" {
  value = var.output_path
}

output "source_code_hash" {
  value = local.has_requirements ? (
    null_resource.build[0].triggers.hash
  ) : (
    data.archive_file.simple[0].output_base64sha256
  )
}
```

Usage:

```hcl
module "api_package" {
  source      = "./modules/lambda-package"
  source_dir  = "${path.module}/functions/api"
  output_path = "${path.module}/build/api.zip"
}

resource "aws_lambda_function" "api" {
  function_name    = "myapp-api"
  handler          = "index.handler"
  runtime          = "python3.12"
  role             = aws_iam_role.lambda_exec.arn
  filename         = module.api_package.filename
  source_code_hash = module.api_package.source_code_hash
}
```

## Package Size Limits

Know the limits:

- **ZIP upload (direct)**: 50MB
- **ZIP upload (from S3)**: 50MB compressed, 250MB unzipped
- **Container image**: 10GB

If your ZIP package is approaching 50MB, consider:
1. Moving dependencies to a Lambda layer
2. Switching to container images
3. Removing unused dependencies
4. Using `--no-cache-dir` with pip

## Summary

There are multiple ways to package Lambda code with Terraform, and the right choice depends on your situation. Use `archive_file` for simple functions without dependencies. Use `null_resource` build steps for functions with pip or npm dependencies. Use S3-based deployment for CI/CD pipelines. Use Docker containers for complex dependencies or large packages. Whatever approach you choose, always set `source_code_hash` so Terraform detects code changes, and use `triggers` on build steps so they re-run when source files change.
