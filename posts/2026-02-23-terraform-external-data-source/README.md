# How to Use the external Data Source in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Data Sources, External, Scripting, Infrastructure as Code

Description: Learn how to use the external data source in Terraform to execute external programs and scripts that return JSON data for use in your infrastructure configuration.

---

The `external` data source runs a program on the machine executing Terraform and reads its JSON output. This gives you an escape hatch for data lookups that no existing provider or data source supports. Need to query a proprietary API? Parse a local file in a custom format? Run a database query? The `external` data source lets you write a script in any language and feed the results back into Terraform.

## How It Works

The `external` data source:

1. Runs a specified program with optional input (passed as JSON via stdin)
2. Reads the program's stdout, which must be valid JSON
3. Makes the JSON keys and values available as a map of strings

The program must:
- Read JSON from stdin (if query arguments are provided)
- Write valid JSON to stdout
- Return a flat map of string key-value pairs
- Exit with code 0 on success, non-zero on failure

## Basic Syntax

```hcl
terraform {
  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "~> 2.0"
    }
  }
}

data "external" "example" {
  program = ["python3", "${path.module}/scripts/lookup.py"]

  query = {
    environment = var.environment
    region      = var.region
  }
}

output "result" {
  value = data.external.example.result
}
```

## Writing the External Program

### Python Example

```python
#!/usr/bin/env python3
"""lookup.py - Look up configuration from a custom service."""

import json
import sys
import urllib.request

# Read the query from stdin
input_data = json.load(sys.stdin)
environment = input_data["environment"]
region = input_data["region"]

# Do the lookup (this could be any custom logic)
url = f"https://config.internal/api/v1/{environment}/{region}"
try:
    with urllib.request.urlopen(url) as response:
        config = json.loads(response.read())
except Exception as e:
    # Write error to stderr and exit with non-zero
    print(f"Error fetching config: {e}", file=sys.stderr)
    sys.exit(1)

# Output must be a flat map of strings
result = {
    "instance_type": config.get("instance_type", "t3.medium"),
    "ami_id": config.get("ami_id", ""),
    "subnet_id": config.get("subnet_id", ""),
    "max_instances": str(config.get("max_instances", 3)),
}

# Write JSON to stdout
json.dump(result, sys.stdout)
```

### Bash Example

```bash
#!/bin/bash
# get-next-cidr.sh - Calculate the next available CIDR block

# Read JSON input from stdin
eval "$(jq -r '@sh "VPC_ID=\(.vpc_id) PREFIX=\(.prefix)"')"

# Query AWS for existing CIDR blocks
EXISTING=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=${VPC_ID}" \
  --query 'Subnets[].CidrBlock' \
  --output text)

# Custom logic to find next available CIDR
# (simplified for demonstration)
NEXT_CIDR=$(python3 -c "
import ipaddress
existing = '${EXISTING}'.split()
vpc_network = ipaddress.ip_network('10.0.0.0/16')
subnets = list(vpc_network.subnets(new_prefix=int('${PREFIX}')))
used = [ipaddress.ip_network(c) for c in existing]
available = [str(s) for s in subnets if s not in used]
print(available[0] if available else '')
")

# Output as JSON
jq -n --arg cidr "$NEXT_CIDR" '{"next_cidr": $cidr}'
```

### Node.js Example

```javascript
#!/usr/bin/env node
// vault-lookup.js - Read a secret from a custom vault service

const fs = require('fs');

// Read JSON from stdin
const input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
const secretPath = input.secret_path;
const vaultAddr = input.vault_addr;

async function main() {
  try {
    const response = await fetch(`${vaultAddr}/v1/secret/${secretPath}`, {
      headers: {
        'X-Vault-Token': process.env.VAULT_TOKEN
      }
    });

    if (!response.ok) {
      process.stderr.write(`Vault returned ${response.status}\n`);
      process.exit(1);
    }

    const data = await response.json();

    // Must return a flat map of strings
    const result = {};
    for (const [key, value] of Object.entries(data.data)) {
      result[key] = String(value);
    }

    process.stdout.write(JSON.stringify(result));
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }
}

main();
```

## Practical Use Cases

### Looking Up the Next Available CIDR

```hcl
data "external" "next_cidr" {
  program = ["python3", "${path.module}/scripts/next-cidr.py"]

  query = {
    vpc_id = aws_vpc.main.id
    prefix = "24"
  }
}

resource "aws_subnet" "new" {
  vpc_id     = aws_vpc.main.id
  cidr_block = data.external.next_cidr.result.next_cidr
}
```

### Querying a CMDB

If your organization uses a Configuration Management Database:

```hcl
data "external" "cmdb_lookup" {
  program = ["python3", "${path.module}/scripts/cmdb-query.py"]

  query = {
    application = "web-app"
    environment = var.environment
    datacenter  = var.region
  }
}

resource "aws_instance" "app" {
  ami           = data.external.cmdb_lookup.result.approved_ami
  instance_type = data.external.cmdb_lookup.result.instance_type
  subnet_id     = data.external.cmdb_lookup.result.subnet_id

  tags = {
    CostCenter = data.external.cmdb_lookup.result.cost_center
    Owner      = data.external.cmdb_lookup.result.owner
  }
}
```

### Generating Passwords or Tokens

```hcl
data "external" "generate_password" {
  program = ["python3", "-c", <<-EOT
    import json, secrets, string, sys
    input_data = json.load(sys.stdin)
    length = int(input_data.get("length", "32"))
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    json.dump({"password": password}, sys.stdout)
  EOT
  ]

  query = {
    length = "24"
  }
}

# Warning: the password will be in the state file
output "generated_password" {
  value     = data.external.generate_password.result.password
  sensitive = true
}
```

### Reading from a Local Database

```hcl
data "external" "db_config" {
  program = ["python3", "${path.module}/scripts/read-db-config.py"]

  query = {
    database = "infrastructure"
    table    = "server_configs"
    key      = var.server_role
  }
}
```

Where `read-db-config.py` might connect to SQLite, PostgreSQL, or any database:

```python
#!/usr/bin/env python3
import json
import sys
import sqlite3

input_data = json.load(sys.stdin)
db_path = f"/opt/data/{input_data['database']}.db"
table = input_data['table']
key = input_data['key']

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute(f"SELECT config_json FROM {table} WHERE role = ?", (key,))
row = cursor.fetchone()
conn.close()

if row is None:
    print(f"No config found for role: {key}", file=sys.stderr)
    sys.exit(1)

config = json.loads(row[0])
# Flatten to string map
result = {k: str(v) for k, v in config.items()}
json.dump(result, sys.stdout)
```

### Integrating with AWS CLI for Unsupported Operations

Sometimes the AWS Terraform provider does not support a specific API call:

```hcl
data "external" "container_insights" {
  program = ["bash", "-c", <<-EOT
    CLUSTER_NAME=$(cat /dev/stdin | jq -r '.cluster_name')
    STATUS=$(aws ecs describe-clusters \
      --clusters "$CLUSTER_NAME" \
      --include SETTINGS \
      --query 'clusters[0].settings[?name==`containerInsights`].value' \
      --output text)
    echo "{\"container_insights\": \"$STATUS\"}"
  EOT
  ]

  query = {
    cluster_name = aws_ecs_cluster.main.name
  }
}
```

## Important Constraints

### Output Must Be a Flat String Map

The external program must return a JSON object where all values are strings. Nested objects, arrays, numbers, and booleans are not allowed in the output.

```json
// Valid output
{"key1": "value1", "key2": "value2", "count": "5"}

// Invalid output (nested object)
{"key1": {"nested": "value"}}

// Invalid output (number value)
{"count": 5}

// Invalid output (array)
{"items": ["a", "b", "c"]}
```

If you need to return complex data, serialize it as a JSON string:

```python
result = {
    "config_json": json.dumps({"nested": "data", "list": [1, 2, 3]})
}
json.dump(result, sys.stdout)
```

Then parse it in Terraform:

```hcl
locals {
  config = jsondecode(data.external.example.result.config_json)
}
```

### Errors Go to stderr

Write error messages to stderr. They will appear in Terraform's output. Writing errors to stdout will break the JSON parsing.

### Programs Must Be Deterministic

The external program should return the same output for the same input. Non-deterministic programs (like generating random values) will cause Terraform to show changes on every plan.

## Security Considerations

1. **State exposure.** All output values are stored in the Terraform state file. Do not return sensitive data unless your state backend is encrypted.

2. **Script injection.** Be careful about passing user input to shell commands. Use parameterized queries and avoid string concatenation in SQL or shell commands.

3. **Execution environment.** The script runs with the same permissions as the Terraform process. In CI/CD, this might have elevated access.

4. **Path security.** Use `${path.module}` for script paths to avoid picking up scripts from unintended locations.

## Summary

The `external` data source is Terraform's ultimate escape hatch for data retrieval. It runs any program and reads its JSON output, letting you integrate with databases, proprietary APIs, custom scripts, and any tool that can produce JSON. The output must be a flat map of strings, errors go to stderr, and the program should be deterministic.

Use it sparingly - if a Terraform provider or data source exists for your use case, prefer that. But when no provider exists, the `external` data source fills the gap reliably. For simpler HTTP-based lookups, see our post on the [http data source](https://oneuptime.com/blog/post/2026-02-23-terraform-http-data-source/view).
