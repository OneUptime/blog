# How to Create Lambda Layers in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, Lambda Layers, Serverless, Dependencies

Description: A complete guide to creating and managing AWS Lambda layers with Terraform, covering dependency packaging, version management, sharing across functions, and best practices.

---

Lambda layers solve a practical problem: when multiple Lambda functions need the same dependencies, you do not want to bundle those dependencies into every function's deployment package. Layers let you package shared libraries, custom runtimes, or common code separately and attach them to any number of functions. This reduces deployment package sizes, speeds up deployments, and keeps your function code focused on business logic.

This guide covers creating Lambda layers in Terraform, the directory structure layers require, automating dependency installation, version management, and sharing layers across accounts.

## How Lambda Layers Work

A Lambda layer is a ZIP archive that gets extracted into the `/opt` directory of the Lambda execution environment. The runtime automatically adds certain `/opt` subdirectories to the search path:

- **Python**: `/opt/python` and `/opt/python/lib/python3.x/site-packages`
- **Node.js**: `/opt/nodejs/node_modules`
- **Java**: `/opt/java/lib`
- **Ruby**: `/opt/ruby/gems/3.x.x`

This means you need to structure your layer ZIP with the right directory layout for your runtime.

## Creating a Python Layer

Let's start with the most common case - a Python layer with pip dependencies:

```hcl
# Install dependencies and create the layer ZIP
resource "null_resource" "python_layer_deps" {
  triggers = {
    requirements = filesha256("${path.module}/layers/python/requirements.txt")
  }

  provisioner "local-exec" {
    command = <<-EOT
      cd ${path.module}/layers/python
      rm -rf package
      mkdir -p package/python
      pip install -r requirements.txt -t package/python --platform manylinux2014_x86_64 --only-binary=:all:
    EOT
  }
}

# Create the ZIP file
data "archive_file" "python_layer" {
  type        = "zip"
  source_dir  = "${path.module}/layers/python/package"
  output_path = "${path.module}/layers/python/layer.zip"

  depends_on = [null_resource.python_layer_deps]
}

# Create the Lambda layer
resource "aws_lambda_layer_version" "python_deps" {
  layer_name          = "python-common-deps"
  description         = "Common Python dependencies (requests, boto3, etc.)"
  filename            = data.archive_file.python_layer.output_path
  source_code_hash    = data.archive_file.python_layer.output_base64sha256
  compatible_runtimes = ["python3.11", "python3.12"]

  # Optional: compatible architectures
  compatible_architectures = ["x86_64"]
}
```

The `requirements.txt` file for the layer:

```
requests==2.31.0
pydantic==2.6.0
urllib3==2.1.0
```

## Creating a Node.js Layer

```hcl
# Install Node.js dependencies
resource "null_resource" "node_layer_deps" {
  triggers = {
    package_json = filesha256("${path.module}/layers/nodejs/package.json")
  }

  provisioner "local-exec" {
    command = <<-EOT
      cd ${path.module}/layers/nodejs
      rm -rf package
      mkdir -p package/nodejs
      cp package.json package/nodejs/
      cd package/nodejs
      npm install --production
    EOT
  }
}

data "archive_file" "node_layer" {
  type        = "zip"
  source_dir  = "${path.module}/layers/nodejs/package"
  output_path = "${path.module}/layers/nodejs/layer.zip"

  depends_on = [null_resource.node_layer_deps]
}

resource "aws_lambda_layer_version" "node_deps" {
  layer_name          = "node-common-deps"
  description         = "Common Node.js dependencies"
  filename            = data.archive_file.node_layer.output_path
  source_code_hash    = data.archive_file.node_layer.output_base64sha256
  compatible_runtimes = ["nodejs18.x", "nodejs20.x"]
}
```

## Shared Utility Code Layer

Besides third-party dependencies, layers are great for sharing your own utility code across functions:

```hcl
# Package shared utility code
data "archive_file" "utils_layer" {
  type        = "zip"
  source_dir  = "${path.module}/layers/utils/package"
  output_path = "${path.module}/layers/utils/layer.zip"
}

resource "aws_lambda_layer_version" "utils" {
  layer_name          = "app-utilities"
  description         = "Shared application utilities"
  filename            = data.archive_file.utils_layer.output_path
  source_code_hash    = data.archive_file.utils_layer.output_base64sha256
  compatible_runtimes = ["python3.12"]
}
```

The directory structure for a Python utils layer:

```
layers/utils/package/
  python/
    utils/
      __init__.py
      logging_config.py
      auth.py
      db.py
```

Then in your Lambda function, you can import them directly:

```python
from utils.logging_config import setup_logger
from utils.auth import verify_token
from utils.db import get_connection
```

## Attaching Layers to Functions

A Lambda function can use up to 5 layers:

```hcl
# Lambda function using multiple layers
resource "aws_lambda_function" "api" {
  function_name = "myapp-api"
  handler       = "index.handler"
  runtime       = "python3.12"
  role          = aws_iam_role.lambda_exec.arn

  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256

  # Attach layers - order matters, later layers override earlier ones
  layers = [
    aws_lambda_layer_version.python_deps.arn,
    aws_lambda_layer_version.utils.arn,
  ]

  tags = {
    Name = "myapp-api"
  }
}

# Another function sharing the same layers
resource "aws_lambda_function" "worker" {
  function_name = "myapp-worker"
  handler       = "worker.handler"
  runtime       = "python3.12"
  role          = aws_iam_role.lambda_exec.arn

  filename         = data.archive_file.worker.output_path
  source_code_hash = data.archive_file.worker.output_base64sha256

  # Same layers as the API function
  layers = [
    aws_lambda_layer_version.python_deps.arn,
    aws_lambda_layer_version.utils.arn,
  ]

  tags = {
    Name = "myapp-worker"
  }
}
```

## Layer Version Management

Every time you update a layer, Terraform creates a new version. Old versions are not automatically deleted. To manage this:

```hcl
# The layer version resource always creates new versions
resource "aws_lambda_layer_version" "python_deps" {
  layer_name       = "python-common-deps"
  filename         = data.archive_file.python_layer.output_path
  source_code_hash = data.archive_file.python_layer.output_base64sha256
  compatible_runtimes = ["python3.12"]

  # Skip deleting the previous version - functions using it still need it
  skip_destroy = true
}
```

Setting `skip_destroy = true` keeps old versions around so functions that have not been updated yet can still reference them.

## Sharing Layers Across Accounts

You can share layers with specific AWS accounts or make them public:

```hcl
# Share layer with specific accounts
resource "aws_lambda_layer_version_permission" "share" {
  layer_name     = aws_lambda_layer_version.python_deps.layer_name
  version_number = aws_lambda_layer_version.python_deps.version
  principal      = "123456789012"  # The account ID to share with
  action         = "lambda:GetLayerVersion"
  statement_id   = "share-with-account"
}

# Share with an entire organization
resource "aws_lambda_layer_version_permission" "org_share" {
  layer_name     = aws_lambda_layer_version.python_deps.layer_name
  version_number = aws_lambda_layer_version.python_deps.version
  principal      = "*"
  action         = "lambda:GetLayerVersion"
  statement_id   = "share-with-org"
  organization_id = "o-abc123def4"
}
```

## Using Existing AWS-Provided Layers

AWS provides some useful layers that you can reference by ARN:

```hcl
# Use AWS Parameters and Secrets Lambda Extension
resource "aws_lambda_function" "with_aws_layers" {
  function_name = "myapp-with-extensions"
  handler       = "index.handler"
  runtime       = "python3.12"
  role          = aws_iam_role.lambda_exec.arn

  filename = data.archive_file.api.output_path

  layers = [
    # AWS Parameters and Secrets Extension
    "arn:aws:lambda:us-east-1:177933569100:layer:AWS-Parameters-and-Secrets-Lambda-Extension:11",
    # Your custom layers
    aws_lambda_layer_version.python_deps.arn,
  ]
}
```

## Layer Size Limits

There are limits to be aware of:

- Each layer can be up to 50MB (zipped)
- Total unzipped size of all layers plus function code cannot exceed 250MB
- Maximum 5 layers per function

If your dependencies exceed 50MB, split them across multiple layers or consider using container-based Lambda instead.

## Outputs

```hcl
output "python_layer_arn" {
  description = "ARN of the Python dependencies layer"
  value       = aws_lambda_layer_version.python_deps.arn
}

output "python_layer_version" {
  description = "Version number of the Python dependencies layer"
  value       = aws_lambda_layer_version.python_deps.version
}

output "utils_layer_arn" {
  description = "ARN of the utilities layer"
  value       = aws_lambda_layer_version.utils.arn
}
```

## Summary

Lambda layers in Terraform are created with `aws_lambda_layer_version` and attached to functions via the `layers` attribute. The key is getting the directory structure right for your runtime - Python code goes in `python/`, Node.js in `nodejs/node_modules/`. Use `null_resource` with `local-exec` to automate dependency installation, set `skip_destroy = true` to preserve old versions during updates, and share layers across accounts with `aws_lambda_layer_version_permission`. Layers reduce deployment size and make dependency management cleaner, but watch the 250MB total limit and the 5-layer-per-function cap.
