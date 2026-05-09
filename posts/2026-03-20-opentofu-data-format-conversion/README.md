# How to Convert Between Data Formats with OpenTofu Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Function, JSON, YAML, Base64, Format Conversion

Description: Learn how to convert between JSON, YAML, Base64, and other data formats using OpenTofu built-in functions for configuration transformation and interoperability.

## Overview

OpenTofu provides encode/decode functions for JSON, YAML, and Base64, enabling data transformation between formats. These are essential for passing configuration between resources that accept different formats.

## Step 1: JSON Encoding and Decoding

```hcl
# main.tf - JSON format conversions

locals {
  # HCL map to JSON string
  policy_map = {
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "arn:aws:s3:::my-bucket/*"
    }]
  }

  policy_json = jsonencode(local.policy_map)

  # JSON string back to HCL map
  parsed_policy = jsondecode(local.policy_json)

  # Access nested value
  effect = local.parsed_policy.Statement[0].Effect  # "Allow"
}

# Use jsonencode for AWS IAM policies
resource "aws_iam_policy" "app" {
  name   = "app-policy"
  policy = jsonencode(local.policy_map)  # Cleaner than heredoc
}
```

## Step 2: YAML Encoding and Decoding

```hcl
# Convert HCL to YAML for Helm values
locals {
  helm_values = {
    replicaCount = 3
    image = {
      repository = "nginx"
      tag        = "latest"
    }
    resources = {
      requests = { cpu = "100m", memory = "128Mi" }
      limits   = { cpu = "500m", memory = "512Mi" }
    }
  }

  # Convert to YAML string for helm_release
  helm_values_yaml = yamlencode(local.helm_values)

  # Parse YAML string back to HCL map
  parsed_values = yamldecode(local.helm_values_yaml)
}

resource "helm_release" "nginx" {
  name       = "nginx"
  chart      = "nginx"
  repository = "https://charts.bitnami.com/bitnami"

  values = [yamlencode(local.helm_values)]
}
```

## Step 3: Base64 Encoding

```hcl
# Base64 encoding for various use cases
locals {
  # Encode a string
  encoded_string = base64encode("Hello, World!")   # "SGVsbG8sIFdvcmxkIQ=="

  # Decode base64
  decoded_string = base64decode("SGVsbG8sIFdvcmxkIQ==")  # "Hello, World!"

  # Encode a file (for EC2 user data)
  user_data_b64 = base64encode(templatefile("${path.module}/user-data.sh", {
    region = var.region
  }))

  # Standard base64 encoding (RFC 4648 section 4)
  secret_data = base64encode("my-secret-value")
}

# EC2 instance with base64-encoded user data
resource "aws_instance" "app" {
  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo "Hello from ${var.environment}" > /tmp/info.txt
  EOF
  )
}

# Kubernetes secret - provider auto-encodes `data` values, so pass plaintext.
# Use `binary_data` when you need to supply pre-encoded base64 values.
resource "kubernetes_secret" "app" {
  metadata {
    name = "app-secrets"
  }

  data = {
    api-key = var.api_key
    db-pass = random_password.db.result
  }
}
```

## Step 4: Cross-Format Transformation

```hcl
# Convert YAML config to JSON for API
locals {
  yaml_config = yamldecode(file("${path.module}/config/api-config.yaml"))
  json_config = jsonencode(local.yaml_config)
}

# Use JSON config in an AWS parameter
resource "aws_ssm_parameter" "api_config" {
  name  = "/app/api-config"
  type  = "String"
  value = local.json_config
}

# Convert JSON policy template to YAML for documentation
locals {
  policy_as_yaml = yamlencode(jsondecode(file("${path.module}/policies/policy.json")))
}
```

## Summary

Format conversion functions in OpenTofu bridge data between different resource types. `jsonencode` is preferred over heredoc JSON for IAM policies and container definitions because it handles escaping automatically and integrates with HCL variables. `yamlencode` converts HCL maps to YAML strings for Helm release values, enabling full HCL logic (loops, conditions, functions) when constructing Helm values. Base64 encoding is required for Kubernetes secrets (though the `kubernetes_secret` resource handles this automatically for the `data` block).
