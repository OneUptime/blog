# How to Use External Data Sources with Python Scripts in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, External Provider, Python, Infrastructure as Code, Automation

Description: Learn how to use Python scripts as Terraform external data sources for complex data processing, API integration, calculations, and dynamic configuration generation.

---

Python is an excellent choice for Terraform external data sources when you need more complex logic than shell scripts can comfortably handle. Python's rich standard library, excellent JSON support, and access to libraries like requests and boto3 make it ideal for API integrations, complex calculations, and data transformations that feed into your Terraform configuration.

In this guide, we will create several Python-based external data sources for Terraform. We will cover the JSON exchange protocol, error handling patterns, API integrations, and complex data processing.

## How Python External Data Sources Work

The external data source protocol is simple. Terraform passes a JSON object on stdin. Your Python script reads it, performs operations, and writes a JSON object to stdout. All values must be strings. Errors go to stderr.

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

## Basic Python External Data Source

```hcl
# basic.tf - Simple Python data source
data "external" "python_example" {
  program = ["python3", "${path.module}/scripts/example.py"]

  query = {
    name        = "terraform"
    environment = var.environment
  }
}

output "python_result" {
  value = data.external.python_example.result
}
```

The Python script:

```python
#!/usr/bin/env python3
"""scripts/example.py - Basic external data source example."""

import json
import sys
from datetime import datetime, timezone

def main():
    # Read JSON input from stdin
    input_data = json.load(sys.stdin)

    name = input_data.get("name", "unknown")
    environment = input_data.get("environment", "unknown")

    # Perform operations
    result = {
        "greeting": f"Hello from {name} in {environment}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "python_version": sys.version.split()[0],
    }

    # Write JSON output to stdout
    # All values must be strings
    json.dump(result, sys.stdout)

if __name__ == "__main__":
    main()
```

## CIDR Calculation Script

```hcl
# cidr-calc.tf - Complex CIDR calculations
data "external" "subnet_calc" {
  program = ["python3", "${path.module}/scripts/cidr_calculator.py"]

  query = {
    vpc_cidr    = "10.0.0.0/16"
    num_subnets = "6"
    subnet_mask = "24"
  }
}

output "subnets" {
  value = data.external.subnet_calc.result
}
```

```python
#!/usr/bin/env python3
"""scripts/cidr_calculator.py - Calculate subnet CIDRs."""

import json
import sys
import ipaddress

def main():
    input_data = json.load(sys.stdin)

    vpc_cidr = input_data["vpc_cidr"]
    num_subnets = int(input_data["num_subnets"])
    subnet_mask = int(input_data["subnet_mask"])

    network = ipaddress.ip_network(vpc_cidr)
    subnets = list(network.subnets(new_prefix=subnet_mask))

    if len(subnets) < num_subnets:
        print(f"Error: Cannot create {num_subnets} /{subnet_mask} subnets from {vpc_cidr}",
              file=sys.stderr)
        sys.exit(1)

    result = {}
    for i in range(num_subnets):
        result[f"subnet_{i}"] = str(subnets[i])

    result["total_available"] = str(len(subnets))
    result["hosts_per_subnet"] = str(subnets[0].num_addresses - 2)

    json.dump(result, sys.stdout)

if __name__ == "__main__":
    main()
```

## API Integration Script

```hcl
# api-lookup.tf - Fetch data from a REST API
data "external" "api_data" {
  program = ["python3", "${path.module}/scripts/api_lookup.py"]

  query = {
    api_url = "https://api.github.com/repos/hashicorp/terraform"
    headers = jsonencode({"Accept": "application/vnd.github.v3+json"})
  }
}

output "repo_info" {
  value = data.external.api_data.result
}
```

```python
#!/usr/bin/env python3
"""scripts/api_lookup.py - Fetch data from a REST API."""

import json
import sys
import urllib.request

def main():
    input_data = json.load(sys.stdin)

    api_url = input_data["api_url"]
    headers = json.loads(input_data.get("headers", "{}"))

    try:
        req = urllib.request.Request(api_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())

        result = {
            "name": str(data.get("name", "")),
            "description": str(data.get("description", "")),
            "stars": str(data.get("stargazers_count", 0)),
            "language": str(data.get("language", "")),
            "default_branch": str(data.get("default_branch", "")),
        }
    except Exception as e:
        print(f"Warning: API request failed: {e}", file=sys.stderr)
        result = {
            "name": "unknown",
            "description": "API request failed",
            "stars": "0",
            "language": "unknown",
            "default_branch": "main",
        }

    json.dump(result, sys.stdout)

if __name__ == "__main__":
    main()
```

## Password Policy Validation Script

```hcl
# password-check.tf - Validate password against policy
data "external" "password_check" {
  program = ["python3", "${path.module}/scripts/password_policy.py"]

  query = {
    min_length       = "16"
    require_upper    = "true"
    require_lower    = "true"
    require_digits   = "true"
    require_special  = "true"
    forbidden_words  = "password,admin,root"
  }
}

output "password_policy" {
  value = data.external.password_check.result
}
```

```python
#!/usr/bin/env python3
"""scripts/password_policy.py - Generate and validate password policy."""

import json
import sys
import string
import secrets

def generate_compliant_password(min_length, require_upper, require_lower,
                                 require_digits, require_special):
    """Generate a password that meets the policy requirements."""
    chars = ""
    required = []

    if require_lower:
        chars += string.ascii_lowercase
        required.append(secrets.choice(string.ascii_lowercase))
    if require_upper:
        chars += string.ascii_uppercase
        required.append(secrets.choice(string.ascii_uppercase))
    if require_digits:
        chars += string.digits
        required.append(secrets.choice(string.digits))
    if require_special:
        special = "!@#$%^&*()-_=+"
        chars += special
        required.append(secrets.choice(special))

    # Fill remaining length with random characters
    remaining = min_length - len(required)
    password_chars = required + [secrets.choice(chars) for _ in range(remaining)]

    # Shuffle the characters
    password_list = list(password_chars)
    secrets.SystemRandom().shuffle(password_list)

    return "".join(password_list)

def main():
    input_data = json.load(sys.stdin)

    min_length = int(input_data.get("min_length", "16"))
    require_upper = input_data.get("require_upper", "true") == "true"
    require_lower = input_data.get("require_lower", "true") == "true"
    require_digits = input_data.get("require_digits", "true") == "true"
    require_special = input_data.get("require_special", "true") == "true"

    result = {
        "policy_description": f"Min {min_length} chars, upper={require_upper}, "
                             f"lower={require_lower}, digits={require_digits}, "
                             f"special={require_special}",
        "min_length": str(min_length),
        "charset_size": str(
            (26 if require_lower else 0) +
            (26 if require_upper else 0) +
            (10 if require_digits else 0) +
            (14 if require_special else 0)
        ),
    }

    json.dump(result, sys.stdout)

if __name__ == "__main__":
    main()
```

## Template for Robust Python External Data Sources

```python
#!/usr/bin/env python3
"""Robust template for Terraform external data sources."""

import json
import sys

def main():
    try:
        # Read input
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        # Validate required parameters
        required_params = ["param1", "param2"]
        for param in required_params:
            if param not in input_data:
                print(f"Error: Missing required parameter: {param}", file=sys.stderr)
                sys.exit(1)

        # Perform operations
        result = {
            "output1": "value1",
            "output2": "value2",
        }

        # Ensure all values are strings
        result = {k: str(v) for k, v in result.items()}

        # Write output
        json.dump(result, sys.stdout)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Conclusion

Python scripts as Terraform external data sources provide a powerful way to perform complex operations that go beyond what shell scripts can handle comfortably. Python's standard library covers most needs without requiring additional packages, and its JSON handling is natural and robust. Always validate inputs, handle errors gracefully, and ensure all output values are strings. For simpler use cases, [shell scripts](https://oneuptime.com/blog/post/2026-02-23-how-to-use-external-data-sources-with-shell-scripts-in-terraform/view) may be more appropriate.
