# How to Configure External Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, External Provider, Scripting, Infrastructure as Code

Description: Learn how to use the External provider in Terraform to integrate custom scripts and external programs into your infrastructure workflow.

---

There are times when Terraform's built-in providers and data sources just do not cover your specific use case. Maybe you need to call a custom API, run a database query, fetch data from an internal tool, or perform some calculation that HCL cannot handle. The External provider in Terraform lets you call any external program and use its output in your Terraform configuration.

The External provider works through a simple contract: your program reads JSON from stdin, does its work, and writes JSON to stdout. That is it. This makes it compatible with scripts written in Python, Bash, Go, or any other language.

## Prerequisites

- Terraform 1.0 or later
- The external program or script you want to call must be installed and accessible on the machine running Terraform

## Declaring the Provider

```hcl
# versions.tf - Declare the External provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "~> 2.3"
    }
  }
}
```

No configuration is needed for the provider.

```hcl
# provider.tf - Nothing to configure
provider "external" {}
```

## How It Works

The External provider has a single data source: `external`. It calls an external program, passes it a JSON object via stdin, and expects a JSON object back via stdout. All values in the JSON objects must be strings.

The flow looks like this:

1. Terraform passes the `query` map to the program as JSON via stdin
2. The program processes the input
3. The program writes a JSON object to stdout
4. Terraform makes the output available as `data.external.<name>.result`

## Basic Example

Let us start with a simple example that calls a shell script.

```hcl
# Call an external script to get the current git commit hash
data "external" "git_info" {
  program = ["bash", "${path.module}/scripts/git-info.sh"]
}

output "git_commit" {
  value = data.external.git_info.result.commit
}

output "git_branch" {
  value = data.external.git_info.result.branch
}
```

The script (`scripts/git-info.sh`):

```bash
#!/bin/bash
# git-info.sh - Return git information as JSON
# The External provider expects a JSON object on stdout

# All values must be strings
cat <<EOF
{
  "commit": "$(git rev-parse HEAD)",
  "branch": "$(git rev-parse --abbrev-ref HEAD)",
  "short_commit": "$(git rev-parse --short HEAD)"
}
EOF
```

## Passing Input to Scripts

Use the `query` argument to pass data to your external program.

```hcl
# Pass parameters to the script
data "external" "subnet_calculator" {
  program = ["python3", "${path.module}/scripts/subnet-calc.py"]

  query = {
    cidr_block   = "10.0.0.0/16"
    subnet_count = "4"
    subnet_bits  = "8"
  }
}

output "subnets" {
  value = data.external.subnet_calculator.result
}
```

The Python script (`scripts/subnet-calc.py`):

```python
#!/usr/bin/env python3
"""Calculate subnet CIDRs from a base CIDR block."""

import json
import sys
import ipaddress

def main():
    # Read input from stdin
    input_data = json.load(sys.stdin)

    cidr_block = input_data["cidr_block"]
    subnet_count = int(input_data["subnet_count"])
    subnet_bits = int(input_data["subnet_bits"])

    # Calculate subnets
    network = ipaddress.ip_network(cidr_block)
    subnets = list(network.subnets(prefixlen_diff=subnet_bits))

    # Build output - all values must be strings
    result = {}
    for i in range(min(subnet_count, len(subnets))):
        result[f"subnet_{i}"] = str(subnets[i])

    # Write output to stdout
    json.dump(result, sys.stdout)

if __name__ == "__main__":
    main()
```

## Querying External APIs

You can use the External provider to query APIs that do not have a native Terraform provider.

```hcl
# Query an internal API for configuration data
data "external" "app_config" {
  program = ["python3", "${path.module}/scripts/fetch-config.py"]

  query = {
    environment = var.environment
    service     = "api-gateway"
    api_url     = var.config_api_url
  }
}

# Use the returned configuration
locals {
  app_port     = data.external.app_config.result.port
  app_replicas = data.external.app_config.result.replicas
}
```

The Python script:

```python
#!/usr/bin/env python3
"""Fetch configuration from an internal API."""

import json
import sys
import urllib.request

def main():
    input_data = json.load(sys.stdin)

    api_url = input_data["api_url"]
    environment = input_data["environment"]
    service = input_data["service"]

    # Make API request
    url = f"{api_url}/config/{environment}/{service}"
    req = urllib.request.Request(url)

    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())

        # Return relevant fields as strings
        result = {
            "port": str(data.get("port", "8080")),
            "replicas": str(data.get("replicas", "2")),
            "version": str(data.get("version", "latest")),
        }
    except Exception as e:
        # Write errors to stderr (Terraform displays them)
        print(f"Error fetching config: {e}", file=sys.stderr)
        sys.exit(1)

    json.dump(result, sys.stdout)

if __name__ == "__main__":
    main()
```

## Database Queries

Query a database for information to use in your Terraform configuration.

```hcl
# Look up a database ID from its name
data "external" "db_lookup" {
  program = ["python3", "${path.module}/scripts/db-lookup.py"]

  query = {
    db_host   = var.db_host
    db_name   = "app_metadata"
    tenant_id = var.tenant_id
  }
}

output "tenant_database_name" {
  value = data.external.db_lookup.result.database_name
}
```

## Working with jq

For simple JSON transformations, you can use `jq` directly.

```hcl
# Use curl and jq to fetch and transform data
data "external" "latest_release" {
  program = [
    "bash", "-c",
    "curl -s https://api.github.com/repos/hashicorp/terraform/releases/latest | jq '{tag: .tag_name, url: .html_url, date: .published_at}'"
  ]
}

output "terraform_latest" {
  value = data.external.latest_release.result.tag
}
```

## Error Handling

The External provider treats any non-zero exit code as an error. Write error messages to stderr so Terraform can display them.

```python
#!/usr/bin/env python3
"""Example with proper error handling."""

import json
import sys

def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Failed to parse input: {e}", file=sys.stderr)
        sys.exit(1)

    required_fields = ["environment", "region"]
    for field in required_fields:
        if field not in input_data:
            print(f"Missing required field: {field}", file=sys.stderr)
            sys.exit(1)

    # Do your work here
    result = {
        "status": "ok",
        "environment": input_data["environment"],
    }

    # Always output valid JSON to stdout
    json.dump(result, sys.stdout)

if __name__ == "__main__":
    main()
```

## Important Constraints

The External provider has some limitations you should be aware of:

1. All input and output values must be strings. You cannot pass or return numbers, booleans, or nested objects. Convert everything to strings.

2. The program must be deterministic. If you call the same program with the same inputs, it should return the same outputs. Non-deterministic programs will cause Terraform to detect changes on every plan.

3. The data source is read-only. It runs during `terraform plan` and `terraform apply`. It cannot create or modify resources.

4. The program must complete within a reasonable time. There is no configurable timeout, so long-running scripts can block Terraform.

5. The program runs on the machine executing Terraform. In CI/CD pipelines, make sure the required tools are installed on the build agent.

```hcl
# All values in query and result must be strings
data "external" "example" {
  program = ["bash", "-c", "echo '{\"count\": \"42\", \"enabled\": \"true\"}'"]

  query = {
    number  = "42"       # Not 42
    enabled = "true"     # Not true
    items   = "a,b,c"    # Not ["a", "b", "c"]
  }
}

# Convert string values to proper types in Terraform
locals {
  count   = tonumber(data.external.example.result.count)
  enabled = tobool(data.external.example.result.enabled)
  items   = split(",", data.external.example.result.items)
}
```

## Practical Pattern: Checking Prerequisites

```hcl
# Check if required tools are installed before proceeding
data "external" "check_tools" {
  program = ["bash", "${path.module}/scripts/check-tools.sh"]

  query = {
    required_tools = "kubectl,helm,aws"
  }
}
```

The script:

```bash
#!/bin/bash
# check-tools.sh - Verify required tools are installed

# Read input
INPUT=$(cat)
TOOLS=$(echo "$INPUT" | jq -r '.required_tools')

MISSING=""
IFS=',' read -ra TOOL_ARRAY <<< "$TOOLS"
for tool in "${TOOL_ARRAY[@]}"; do
  if ! command -v "$tool" &>/dev/null; then
    MISSING="${MISSING}${tool} "
  fi
done

if [ -n "$MISSING" ]; then
  echo "Missing required tools: $MISSING" >&2
  exit 1
fi

# Return status as JSON
echo '{"status": "all_tools_present", "checked": "'"$TOOLS"'"}'
```

## Alternatives to Consider

Before reaching for the External provider, consider these alternatives:

- **Custom providers**: If you find yourself using the External provider heavily, writing a custom Terraform provider might be worth the effort.
- **null_resource with provisioners**: For actions that create side effects, `null_resource` with `local-exec` is often more appropriate.
- **terraform_data**: For simple data passing between resources without external scripts.
- **Built-in functions**: Terraform has many built-in functions for string manipulation, math, and encoding that might handle your use case.

## Best Practices

1. Keep scripts simple and focused. Each script should do one thing well.

2. Always handle errors properly. Write meaningful error messages to stderr and exit with a non-zero code.

3. Make scripts idempotent and deterministic. The same inputs should always produce the same outputs.

4. Include the scripts in your version control alongside your Terraform code.

5. Test scripts independently before using them in Terraform.

6. Document what each script does and what inputs/outputs it expects.

## Wrapping Up

The External provider is the escape hatch for when Terraform's built-in capabilities do not cover your needs. It lets you integrate any external program or script into your Terraform workflow through a simple JSON-based contract. Use it sparingly, handle errors well, and keep your scripts deterministic.

For monitoring the infrastructure and services you manage with Terraform, including those configured through external scripts, check out [OneUptime](https://oneuptime.com) for a unified monitoring platform.
