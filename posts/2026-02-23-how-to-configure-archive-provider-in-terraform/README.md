# How to Configure Archive Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Archive, Lambda, Infrastructure as Code

Description: Learn how to use the Archive provider in Terraform to create zip files for Lambda functions, Cloud Functions, and other deployment packages.

---

If you deploy serverless functions with Terraform, you have almost certainly needed to create a zip file as part of your workflow. AWS Lambda, Google Cloud Functions, and Azure Functions all expect code to be uploaded as an archive. The Archive provider in Terraform handles this natively, so you do not need to run separate commands or maintain pre-built zip files.

The Archive provider creates zip archives from files, directories, or inline content. It also computes checksums that Terraform uses to detect when the archive needs to be recreated, which means your functions only get redeployed when the code actually changes.

## Prerequisites

- Terraform 1.0 or later
- No external services or credentials needed

## Declaring the Provider

```hcl
# versions.tf - Declare the Archive provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}
```

No configuration required.

```hcl
# provider.tf - Nothing to configure
provider "archive" {}
```

## Creating Archives from a Directory

The most common use case is zipping a directory of source code.

```hcl
# Create a zip from a directory of Lambda function code
data "archive_file" "lambda_function" {
  type        = "zip"
  source_dir  = "${path.module}/src/lambda-handler"
  output_path = "${path.module}/dist/lambda-handler.zip"
}

# Deploy the Lambda function using the zip
resource "aws_lambda_function" "handler" {
  function_name    = "my-handler"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"

  filename         = data.archive_file.lambda_function.output_path
  source_code_hash = data.archive_file.lambda_function.output_base64sha256
}
```

The `source_code_hash` attribute is key here. It tells Terraform to update the Lambda function only when the zip contents change.

## Creating Archives from a Single File

```hcl
# Create a zip from a single file
data "archive_file" "single_file" {
  type        = "zip"
  source_file = "${path.module}/src/handler.py"
  output_path = "${path.module}/dist/handler.zip"
}

# Use with a Google Cloud Function
resource "google_cloudfunctions_function" "function" {
  name        = "my-function"
  runtime     = "python311"
  entry_point = "handler"

  source_archive_bucket = google_storage_bucket.functions.name
  source_archive_object = google_storage_bucket_object.function_zip.name
}

resource "google_storage_bucket_object" "function_zip" {
  name   = "function-${data.archive_file.single_file.output_md5}.zip"
  bucket = google_storage_bucket.functions.name
  source = data.archive_file.single_file.output_path
}
```

## Creating Archives from Inline Content

You can create an archive from content defined directly in your Terraform configuration.

```hcl
# Create a zip from inline content
data "archive_file" "inline_lambda" {
  type        = "zip"
  output_path = "${path.module}/dist/inline-handler.zip"

  source {
    content  = <<-EOT
      exports.handler = async (event) => {
        console.log('Event:', JSON.stringify(event));
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Hello from Lambda' }),
        };
      };
    EOT
    filename = "index.js"
  }
}
```

## Multiple Source Files

You can include multiple files from different locations in a single archive.

```hcl
# Create a zip with multiple source files
data "archive_file" "multi_source" {
  type        = "zip"
  output_path = "${path.module}/dist/multi-handler.zip"

  # Main handler file
  source {
    content  = file("${path.module}/src/handler.py")
    filename = "handler.py"
  }

  # Configuration file
  source {
    content  = file("${path.module}/src/config.json")
    filename = "config.json"
  }

  # Generated configuration
  source {
    content = jsonencode({
      database_host = var.db_host
      database_port = var.db_port
      environment   = var.environment
    })
    filename = "runtime-config.json"
  }
}
```

## Excluding Files from Archives

When zipping a directory, you can exclude specific files or patterns.

```hcl
# Zip a directory but exclude test files and documentation
data "archive_file" "lambda_clean" {
  type        = "zip"
  source_dir  = "${path.module}/src/app"
  output_path = "${path.module}/dist/app.zip"

  excludes = [
    "__pycache__",
    "*.pyc",
    "tests",
    "tests/**",
    "README.md",
    ".env",
    ".git",
    "node_modules",
  ]
}
```

## Practical Patterns

### Lambda with Dependencies

A common pattern is building the Lambda package with dependencies before Terraform zips it.

```hcl
# Step 1: Install dependencies using null_resource
resource "null_resource" "install_deps" {
  triggers = {
    requirements = filesha256("${path.module}/src/requirements.txt")
  }

  provisioner "local-exec" {
    command = <<-EOT
      cd ${path.module}/src
      pip install -r requirements.txt -t ./package/
      cp handler.py ./package/
    EOT
  }
}

# Step 2: Create the zip after dependencies are installed
data "archive_file" "lambda_with_deps" {
  type        = "zip"
  source_dir  = "${path.module}/src/package"
  output_path = "${path.module}/dist/handler-with-deps.zip"

  depends_on = [null_resource.install_deps]
}

# Step 3: Deploy the Lambda
resource "aws_lambda_function" "api" {
  function_name    = "api-handler"
  role             = aws_iam_role.lambda.arn
  handler          = "handler.main"
  runtime          = "python3.11"
  filename         = data.archive_file.lambda_with_deps.output_path
  source_code_hash = data.archive_file.lambda_with_deps.output_base64sha256
}
```

### Lambda Layer

```hcl
# Create a Lambda layer for shared dependencies
data "archive_file" "lambda_layer" {
  type        = "zip"
  source_dir  = "${path.module}/layers/shared-libs"
  output_path = "${path.module}/dist/shared-libs-layer.zip"
}

resource "aws_lambda_layer_version" "shared" {
  layer_name          = "shared-libs"
  filename            = data.archive_file.lambda_layer.output_path
  source_code_hash    = data.archive_file.lambda_layer.output_base64sha256
  compatible_runtimes = ["python3.11", "python3.12"]
}
```

### Azure Functions

```hcl
# Create a zip for Azure Functions
data "archive_file" "azure_function" {
  type        = "zip"
  source_dir  = "${path.module}/src/azure-func"
  output_path = "${path.module}/dist/azure-func.zip"
}

resource "azurerm_storage_blob" "function_code" {
  name                   = "function-${data.archive_file.azure_function.output_md5}.zip"
  storage_account_name   = azurerm_storage_account.functions.name
  storage_container_name = azurerm_storage_container.deployments.name
  type                   = "Block"
  source                 = data.archive_file.azure_function.output_path
}
```

### Step Functions with Multiple Lambdas

```hcl
# Create individual zips for each Lambda in a Step Functions workflow
locals {
  lambda_functions = {
    validator   = "${path.module}/src/validator"
    processor   = "${path.module}/src/processor"
    notifier    = "${path.module}/src/notifier"
    error_handler = "${path.module}/src/error-handler"
  }
}

data "archive_file" "lambdas" {
  for_each = local.lambda_functions

  type        = "zip"
  source_dir  = each.value
  output_path = "${path.module}/dist/${each.key}.zip"
}

resource "aws_lambda_function" "step_functions" {
  for_each = local.lambda_functions

  function_name    = each.key
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  filename         = data.archive_file.lambdas[each.key].output_path
  source_code_hash = data.archive_file.lambdas[each.key].output_base64sha256
}
```

## Output Attributes

The `archive_file` data source provides several useful output attributes.

```hcl
data "archive_file" "example" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/dist/output.zip"
}

output "archive_info" {
  value = {
    # Path to the created zip file
    path = data.archive_file.example.output_path

    # File size in bytes
    size = data.archive_file.example.output_size

    # MD5 hash of the archive
    md5 = data.archive_file.example.output_md5

    # SHA256 hash (base64 encoded) - great for Lambda source_code_hash
    sha256_base64 = data.archive_file.example.output_base64sha256

    # SHA256 hash (hex encoded)
    sha256 = data.archive_file.example.output_sha256
  }
}
```

## Tips and Gotchas

1. The `archive_file` is a data source, not a resource. It runs during every `terraform plan`, not just `terraform apply`. This is usually what you want since it lets Terraform detect code changes.

2. The output path directory must exist. Terraform does not create parent directories for the output file. Use `local_file` or a `null_resource` to ensure the directory exists if needed.

3. File permissions in the zip are set based on the source files. On Windows, this may differ from Linux/macOS, which can cause unexpected re-deployments.

4. The archive is recreated if any source file changes, which is the expected behavior for detecting code updates.

5. For large dependencies, consider using a Lambda layer instead of bundling everything into one zip. This keeps deployment packages smaller and speeds up updates.

6. Add the `dist/` directory to `.gitignore` since the zip files are generated artifacts.

## Best Practices

- Use `source_code_hash` (or equivalent) when deploying archives to cloud functions. This ensures the function is updated only when the code changes.

- Keep source code and Terraform configuration in the same repository for easier management.

- Use `excludes` to keep archives lean by removing test files, documentation, and development artifacts.

- For Python and Node.js projects, install dependencies into a subdirectory and zip that directory to include everything the function needs.

## Wrapping Up

The Archive provider is a small but essential piece of the serverless deployment puzzle in Terraform. It handles the zip creation step that would otherwise require a separate build script, and its checksum outputs integrate naturally with cloud function resources to detect when re-deployment is needed.

For monitoring your Lambda functions and other serverless workloads, check out [OneUptime](https://oneuptime.com) for end-to-end observability across your infrastructure.
