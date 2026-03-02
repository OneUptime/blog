# How to Create Lambda Extensions with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, Serverless, Extension, Monitoring

Description: Learn how to create and deploy AWS Lambda extensions using Terraform to add monitoring, security, and operational capabilities to your Lambda functions.

---

AWS Lambda extensions allow you to integrate monitoring, security, governance, and operational tools directly into the Lambda execution environment. Extensions run as companion processes alongside your function code, enabling capabilities like sending telemetry data, capturing logs, or injecting configuration without modifying your application logic. Managing Lambda extensions with Terraform provides a consistent, repeatable way to deploy and version these operational enhancements.

This guide covers everything you need to know about creating, packaging, and deploying Lambda extensions using Terraform.

## What Are Lambda Extensions?

Lambda extensions come in two types:

- **Internal Extensions**: Run within the Lambda function process. They are typically language-specific and modify the runtime startup behavior.
- **External Extensions**: Run as separate processes in the execution environment. They start before the runtime and can continue running after the function invocation completes.

Extensions participate in the Lambda lifecycle through the Extensions API, which includes the `INVOKE` and `SHUTDOWN` events.

## Creating an External Extension

Let us build an external extension that captures telemetry data. First, create the extension code:

```python
# extensions/telemetry-extension
#!/usr/bin/env python3
"""
External Lambda extension that captures telemetry data
and forwards it to a monitoring endpoint.
"""

import sys
import os
import json
import urllib.request
import signal

# Lambda Extensions API base URL
LAMBDA_EXTENSION_NAME = os.path.basename(__file__)
EXTENSIONS_API_BASE = f"http://{os.environ['AWS_LAMBDA_RUNTIME_API']}/2020-01-01/extension"

def register_extension():
    """Register this extension with the Lambda Extensions API."""
    url = f"{EXTENSIONS_API_BASE}/register"
    headers = {
        "Lambda-Extension-Name": LAMBDA_EXTENSION_NAME,
        "Content-Type": "application/json"
    }
    # Register for both INVOKE and SHUTDOWN events
    data = json.dumps({"events": ["INVOKE", "SHUTDOWN"]}).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    resp = urllib.request.urlopen(req)
    extension_id = resp.headers.get("Lambda-Extension-Identifier")
    return extension_id

def next_event(extension_id):
    """Wait for the next event from the Extensions API."""
    url = f"{EXTENSIONS_API_BASE}/event/next"
    headers = {
        "Lambda-Extension-Identifier": extension_id
    }
    req = urllib.request.Request(url, headers=headers, method="GET")
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())

def main():
    """Main loop for the extension."""
    extension_id = register_extension()

    while True:
        event = next_event(extension_id)

        if event["eventType"] == "INVOKE":
            # Process invocation telemetry
            print(f"[telemetry-extension] Function invoked: {event.get('requestId', 'unknown')}")

        elif event["eventType"] == "SHUTDOWN":
            # Clean up and flush any remaining telemetry
            print("[telemetry-extension] Shutting down")
            sys.exit(0)

if __name__ == "__main__":
    main()
```

## Packaging the Extension as a Lambda Layer

Lambda extensions are deployed as Lambda layers. The layer must follow a specific directory structure:

```hcl
# Package the extension into the required directory structure
# Extensions must be in the 'extensions' directory at the root of the layer
data "archive_file" "telemetry_extension_layer" {
  type        = "zip"
  output_path = "${path.module}/telemetry-extension-layer.zip"

  # The extension script goes in the extensions/ directory
  source {
    content  = file("${path.module}/extensions/telemetry-extension")
    filename = "extensions/telemetry-extension"
  }

  # Any supporting libraries go in their respective directories
  source {
    content  = file("${path.module}/extensions/lib/helpers.py")
    filename = "extensions/lib/helpers.py"
  }
}

# Create the Lambda layer for the extension
resource "aws_lambda_layer_version" "telemetry_extension" {
  layer_name          = "telemetry-extension"
  filename            = data.archive_file.telemetry_extension_layer.output_path
  source_code_hash    = data.archive_file.telemetry_extension_layer.output_base64sha256
  compatible_runtimes = ["python3.9", "python3.10", "python3.11", "python3.12"]
  description         = "Telemetry collection extension for Lambda functions"
}
```

## Setting Up IAM Permissions

Create the IAM role with the necessary permissions:

```hcl
# IAM role for Lambda functions using the extension
resource "aws_iam_role" "lambda_with_extension" {
  name = "lambda-with-extension-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Basic execution role for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.lambda_with_extension.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy for the extension to send telemetry data
resource "aws_iam_role_policy" "extension_telemetry" {
  name = "extension-telemetry-policy"
  role = aws_iam_role.lambda_with_extension.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "kinesis:PutRecord"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Deploying the Lambda Function with the Extension

Attach the extension layer to your Lambda function:

```hcl
# Lambda function with the telemetry extension attached
resource "aws_lambda_function" "app_function" {
  filename         = data.archive_file.app_code.output_path
  function_name    = "my-application-function"
  role             = aws_iam_role.lambda_with_extension.arn
  handler          = "index.handler"
  runtime          = "python3.12"
  source_code_hash = data.archive_file.app_code.output_base64sha256
  timeout          = 30
  memory_size      = 256

  # Attach the extension layer
  layers = [
    aws_lambda_layer_version.telemetry_extension.arn
  ]

  # Environment variables available to both function and extension
  environment {
    variables = {
      TELEMETRY_ENDPOINT = "https://telemetry.example.com/ingest"
      TELEMETRY_ENABLED  = "true"
    }
  }
}
```

## Using Third-Party Extensions

AWS Partner extensions are available as public layers. You can reference them directly by ARN:

```hcl
# Using a third-party extension like Datadog
resource "aws_lambda_function" "monitored_function" {
  filename         = data.archive_file.app_code.output_path
  function_name    = "monitored-function"
  role             = aws_iam_role.lambda_with_extension.arn
  handler          = "index.handler"
  runtime          = "python3.12"
  source_code_hash = data.archive_file.app_code.output_base64sha256
  timeout          = 30
  memory_size      = 256

  # Combine your custom extension with a third-party extension
  layers = [
    aws_lambda_layer_version.telemetry_extension.arn,
    "arn:aws:lambda:us-east-1:464622532012:layer:Datadog-Extension:49"
  ]

  environment {
    variables = {
      DD_API_KEY = var.datadog_api_key
      DD_SITE    = "datadoghq.com"
    }
  }
}
```

## Creating an Internal Extension

Internal extensions modify the runtime behavior. Here is an example that wraps a Python runtime:

```hcl
# Internal extension wrapper script
data "archive_file" "internal_extension_layer" {
  type        = "zip"
  output_path = "${path.module}/internal-extension-layer.zip"

  # Wrapper script for internal extension
  source {
    content  = <<-SCRIPT
    #!/bin/bash
    # Internal extension wrapper that sets up the environment
    # before the Lambda runtime starts

    # Add custom CA certificates
    export SSL_CERT_FILE=/opt/custom-certs/ca-bundle.crt

    # Set up profiling
    export PYTHONPROFILEIMPORTTIME=1

    # Execute the original handler
    exec "$@"
    SCRIPT
    filename = "wrapper-script"
  }
}

# Create layer for internal extension
resource "aws_lambda_layer_version" "internal_extension" {
  layer_name          = "internal-runtime-extension"
  filename            = data.archive_file.internal_extension_layer.output_path
  source_code_hash    = data.archive_file.internal_extension_layer.output_base64sha256
  compatible_runtimes = ["python3.9", "python3.10", "python3.11", "python3.12"]
}

# Function using the internal extension via AWS_LAMBDA_EXEC_WRAPPER
resource "aws_lambda_function" "wrapped_function" {
  filename         = data.archive_file.app_code.output_path
  function_name    = "wrapped-function"
  role             = aws_iam_role.lambda_with_extension.arn
  handler          = "index.handler"
  runtime          = "python3.12"
  source_code_hash = data.archive_file.app_code.output_base64sha256

  layers = [
    aws_lambda_layer_version.internal_extension.arn
  ]

  environment {
    variables = {
      # Tell Lambda to use our wrapper script
      AWS_LAMBDA_EXEC_WRAPPER = "/opt/wrapper-script"
    }
  }
}
```

## Managing Extension Versions

Use Terraform variables to manage extension versions consistently:

```hcl
variable "extension_version" {
  description = "Version tag for the telemetry extension"
  type        = string
  default     = "1.0.0"
}

# Layer with versioning in the description
resource "aws_lambda_layer_version" "versioned_extension" {
  layer_name       = "telemetry-extension"
  filename         = data.archive_file.telemetry_extension_layer.output_path
  source_code_hash = data.archive_file.telemetry_extension_layer.output_base64sha256
  description      = "Telemetry extension v${var.extension_version}"

  compatible_runtimes = ["python3.9", "python3.10", "python3.11", "python3.12"]

  # Keep old versions available during rollback windows
  lifecycle {
    create_before_destroy = true
  }
}
```

## Outputs

```hcl
output "extension_layer_arn" {
  description = "ARN of the telemetry extension layer"
  value       = aws_lambda_layer_version.telemetry_extension.arn
}

output "extension_layer_version" {
  description = "Version number of the extension layer"
  value       = aws_lambda_layer_version.telemetry_extension.version
}

output "function_name" {
  description = "Name of the Lambda function with extension"
  value       = aws_lambda_function.app_function.function_name
}
```

## Monitoring Extensions with OneUptime

Lambda extensions add complexity to your serverless architecture. With OneUptime, you can monitor both your Lambda functions and the extensions running alongside them. Track extension initialization times, error rates, and the telemetry pipeline health from a unified dashboard. Visit [OneUptime](https://oneuptime.com) to get started with serverless monitoring.

## Conclusion

Lambda extensions provide a clean separation between your application logic and operational concerns like monitoring, security, and configuration management. By packaging extensions as Lambda layers and managing them with Terraform, you maintain full control over deployment, versioning, and rollback. Whether you are building custom telemetry collectors, integrating third-party monitoring tools, or wrapping the runtime with internal extensions, Terraform gives you the infrastructure-as-code foundation to manage it all reliably.

For more on serverless infrastructure, see our guide on [How to Create Lambda@Edge Functions with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-lambda-edge-functions-with-terraform/view) and [How to Handle Lambda Cold Start Optimization with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-lambda-cold-start-optimization-with-terraform/view).
