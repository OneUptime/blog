# How to Use the External Provider for Custom Scripts in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, External Provider, Custom Scripts, Infrastructure as Code, Automation

Description: Learn how to use the Terraform external provider to run custom scripts and integrate their output into your infrastructure configuration for advanced automation scenarios.

---

The external provider in Terraform allows you to integrate arbitrary external programs into your Terraform workflow. It runs a script or program, passes JSON input to it via stdin, and reads JSON output from stdout. This is useful when you need to fetch data that no Terraform provider supports, perform complex calculations, or integrate with legacy systems and APIs.

In this guide, we will explore the external data source in depth. We will cover basic usage with shell scripts, Python scripts, passing inputs and reading outputs, error handling, and practical use cases.

## Understanding the External Provider

The external data source works by executing a program and exchanging data through JSON. Terraform sends a JSON object on stdin containing the query parameters, and the program must return a JSON object on stdout. All values in both directions must be strings. The program must exit with code 0 for success, and any stderr output is displayed as a warning.

## Provider Setup

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "~> 2.3"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}
```

## Basic External Data Source

```hcl
# basic.tf - Simple external script
data "external" "example" {
  program = ["bash", "${path.module}/scripts/get-info.sh"]

  # Input passed as JSON to the script's stdin
  query = {
    environment = var.environment
    region      = "us-east-1"
  }
}

# Access the script's output
output "script_result" {
  value = data.external.example.result
}
```

The corresponding shell script:

```bash
#!/bin/bash
# scripts/get-info.sh - Read JSON input and return JSON output

# Read the JSON input from stdin
eval "$(jq -r '@sh "ENVIRONMENT=\(.environment) REGION=\(.region)"')"

# Perform some operation
HOSTNAME=$(hostname)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
IP_ADDRESS=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")

# Return JSON output to stdout
jq -n \
  --arg hostname "$HOSTNAME" \
  --arg timestamp "$TIMESTAMP" \
  --arg ip "$IP_ADDRESS" \
  --arg env "$ENVIRONMENT" \
  '{"hostname": $hostname, "timestamp": $timestamp, "ip_address": $ip, "environment": $env}'
```

## Using Python Scripts

```hcl
# python-external.tf - External data source with Python
data "external" "python_lookup" {
  program = ["python3", "${path.module}/scripts/lookup.py"]

  query = {
    service_name = "api-gateway"
    environment  = var.environment
  }
}

output "lookup_result" {
  value = data.external.python_lookup.result
}
```

## Fetching Data from Custom APIs

```hcl
# api-fetch.tf - Fetch data from a custom API
data "external" "api_config" {
  program = ["bash", "${path.module}/scripts/fetch-config.sh"]

  query = {
    api_url     = "https://config.internal.example.com/api/v1"
    service     = "web-frontend"
    environment = var.environment
  }
}

# Use the fetched configuration
resource "aws_ssm_parameter" "app_config" {
  name  = "/${var.environment}/app/config"
  type  = "String"
  value = data.external.api_config.result["config_json"]
}
```

## Computing Complex Values

```hcl
# compute.tf - Use external script for complex calculations
data "external" "cidr_calc" {
  program = ["python3", "${path.module}/scripts/cidr-calculator.py"]

  query = {
    base_cidr   = "10.0.0.0/16"
    num_subnets = "4"
    subnet_bits = "8"
  }
}

output "calculated_subnets" {
  value = data.external.cidr_calc.result
}
```

## Error Handling Patterns

```hcl
# error-handling.tf - Robust external script with error handling
data "external" "robust" {
  program = ["bash", "${path.module}/scripts/robust-script.sh"]

  query = {
    param1 = "value1"
    param2 = "value2"
  }
}
```

The robust script with proper error handling:

```bash
#!/bin/bash
# scripts/robust-script.sh - Script with proper error handling

set -e

# Read input
INPUT=$(cat)
PARAM1=$(echo "$INPUT" | jq -r '.param1')
PARAM2=$(echo "$INPUT" | jq -r '.param2')

# Validate inputs
if [ -z "$PARAM1" ] || [ "$PARAM1" = "null" ]; then
  echo "Error: param1 is required" >&2
  exit 1
fi

# Perform operation with error handling
RESULT=$(some_command "$PARAM1" "$PARAM2" 2>/dev/null) || {
  echo "Warning: command failed, using default" >&2
  RESULT="default_value"
}

# Return valid JSON
jq -n --arg result "$RESULT" '{"result": $result}'
```

## Integrating with External Systems

```hcl
# vault-lookup.tf - Look up secrets from Vault
data "external" "vault_secret" {
  program = ["bash", "${path.module}/scripts/vault-read.sh"]

  query = {
    secret_path = "secret/data/${var.environment}/database"
    vault_addr  = var.vault_address
  }
}

variable "vault_address" {
  type    = string
  default = "https://vault.example.com:8200"
}

output "db_host" {
  value     = data.external.vault_secret.result["db_host"]
  sensitive = true
}
```

## Best Practices

When using the external provider, follow these guidelines. Always validate inputs in your scripts and return proper JSON. Use stderr for diagnostic messages and warnings. Make scripts idempotent since they may be called multiple times during plan and apply. Keep scripts simple and focused on data retrieval rather than making changes. Test scripts independently before integrating with Terraform.

Remember that all values exchanged through the external data source must be strings. If you need to pass numbers or booleans, convert them to strings in the query and parse them in your script.

## Conclusion

The external provider extends Terraform's reach to any system or API that does not have a native provider. By executing custom scripts and exchanging JSON data, you can integrate legacy systems, perform complex calculations, and fetch data from any source. However, use it sparingly as it creates dependencies on external tools and reduces portability. For more details, see our guides on [external data sources with shell scripts](https://oneuptime.com/blog/post/2026-02-23-how-to-use-external-data-sources-with-shell-scripts-in-terraform/view) and [external data sources with Python](https://oneuptime.com/blog/post/2026-02-23-how-to-use-external-data-sources-with-python-scripts-in-terraform/view).
