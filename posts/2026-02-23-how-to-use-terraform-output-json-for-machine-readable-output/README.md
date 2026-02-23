# How to Use terraform output -json for Machine-Readable Output

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CLI, JSON, Automation, DevOps

Description: Learn how to use terraform output -json to get structured, machine-readable output from Terraform for integration with scripts, APIs, and automation pipelines.

---

The `terraform output -json` flag transforms Terraform's output into structured JSON that scripts, programs, and automation tools can parse reliably. While the default human-readable format is fine for a quick glance in the terminal, any programmatic consumption of Terraform outputs should use the JSON format. It handles all data types correctly, preserves structure, and follows a predictable schema.

This post covers the JSON output format, how to work with it using different tools, and integration patterns for real-world automation.

## Basic JSON Output

Running `terraform output -json` without specifying an output name returns all outputs as a JSON object:

```bash
terraform output -json
```

```json
{
  "database_endpoint": {
    "sensitive": false,
    "type": "string",
    "value": "myapp-db.abc123.us-east-1.rds.amazonaws.com:5432"
  },
  "instance_ids": {
    "sensitive": false,
    "type": [
      "tuple",
      [
        "string",
        "string",
        "string"
      ]
    ],
    "value": [
      "i-0abc123",
      "i-0def456",
      "i-0ghi789"
    ]
  },
  "vpc_id": {
    "sensitive": false,
    "type": "string",
    "value": "vpc-0abc123def456789"
  }
}
```

Notice the structure: each output has three fields:
- `sensitive` - whether the output is marked sensitive
- `type` - the Terraform type information
- `value` - the actual value

## Querying a Specific Output

When you specify an output name with `-json`, you get just the value (without the wrapper):

```bash
terraform output -json vpc_id
# "vpc-0abc123def456789"

terraform output -json instance_ids
# ["i-0abc123","i-0def456","i-0ghi789"]

terraform output -json subnet_map
# {"public":["subnet-abc","subnet-def"],"private":["subnet-ghi","subnet-jkl"]}
```

This is more convenient for scripts because you do not need to navigate the `value` wrapper.

## Working with jq

`jq` is the standard tool for processing JSON on the command line. It pairs naturally with `terraform output -json`.

### Extracting Values from All Outputs

```bash
# Get just the value of a specific output from the full JSON
terraform output -json | jq -r '.vpc_id.value'
# vpc-0abc123def456789

# Get all output values, stripping the metadata
terraform output -json | jq 'to_entries | map({(.key): .value.value}) | add'
# {"database_endpoint":"myapp-db.abc123...","instance_ids":["i-0abc123",...],"vpc_id":"vpc-0abc123..."}
```

### Working with List Outputs

```bash
# Get the first element
terraform output -json instance_ids | jq -r '.[0]'
# i-0abc123

# Get the count
terraform output -json instance_ids | jq 'length'
# 3

# Iterate over elements
terraform output -json instance_ids | jq -r '.[]'
# i-0abc123
# i-0def456
# i-0ghi789
```

### Working with Map Outputs

```bash
# Get a specific key
terraform output -json subnet_map | jq -r '.public'
# ["subnet-abc","subnet-def"]

# Get all keys
terraform output -json subnet_map | jq -r 'keys[]'
# private
# public

# Format as key=value pairs
terraform output -json tags | jq -r 'to_entries[] | "\(.key)=\(.value)"'
# Environment=production
# Project=web-store
# Team=platform
```

### Working with Object Outputs

```bash
# Extract nested values
terraform output -json cluster_config | jq -r '.endpoint'
# https://ABC123.yl4.us-east-1.eks.amazonaws.com

# Pretty-print
terraform output -json cluster_config | jq .
# {
#   "endpoint": "https://ABC123.yl4.us-east-1.eks.amazonaws.com",
#   "name": "production-cluster",
#   "version": "1.28"
# }
```

## Integration with Python

```python
#!/usr/bin/env python3
# read_terraform_outputs.py

import json
import subprocess

def get_terraform_outputs():
    """Read all Terraform outputs as a Python dictionary."""
    result = subprocess.run(
        ["terraform", "output", "-json"],
        capture_output=True,
        text=True,
        check=True,
    )
    raw_outputs = json.loads(result.stdout)

    # Extract just the values
    return {
        key: details["value"]
        for key, details in raw_outputs.items()
    }

def get_terraform_output(name):
    """Read a specific Terraform output."""
    result = subprocess.run(
        ["terraform", "output", "-json", name],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


# Usage
outputs = get_terraform_outputs()
print(f"VPC ID: {outputs['vpc_id']}")
print(f"Instances: {outputs['instance_ids']}")
print(f"Database: {outputs['database_endpoint']}")

# Get a specific output
cluster = get_terraform_output("cluster_config")
print(f"Cluster endpoint: {cluster['endpoint']}")
```

## Integration with Go

```go
package main

import (
    "encoding/json"
    "fmt"
    "os/exec"
)

// TerraformOutput represents the structure of terraform output -json
type TerraformOutput struct {
    Sensitive bool            `json:"sensitive"`
    Type      json.RawMessage `json:"type"`
    Value     json.RawMessage `json:"value"`
}

func getTerraformOutputs() (map[string]TerraformOutput, error) {
    cmd := exec.Command("terraform", "output", "-json")
    output, err := cmd.Output()
    if err != nil {
        return nil, err
    }

    var outputs map[string]TerraformOutput
    err = json.Unmarshal(output, &outputs)
    return outputs, err
}

func main() {
    outputs, err := getTerraformOutputs()
    if err != nil {
        panic(err)
    }

    var vpcID string
    json.Unmarshal(outputs["vpc_id"].Value, &vpcID)
    fmt.Printf("VPC ID: %s\n", vpcID)

    var instanceIDs []string
    json.Unmarshal(outputs["instance_ids"].Value, &instanceIDs)
    fmt.Printf("Instances: %v\n", instanceIDs)
}
```

## Integration with Node.js

```javascript
// read-outputs.js

const { execSync } = require('child_process');

function getTerraformOutputs() {
  const result = execSync('terraform output -json', {
    encoding: 'utf-8',
  });
  const raw = JSON.parse(result);

  // Extract just values
  const outputs = {};
  for (const [key, details] of Object.entries(raw)) {
    outputs[key] = details.value;
  }
  return outputs;
}

function getTerraformOutput(name) {
  const result = execSync(`terraform output -json ${name}`, {
    encoding: 'utf-8',
  });
  return JSON.parse(result);
}

// Usage
const outputs = getTerraformOutputs();
console.log('VPC:', outputs.vpc_id);
console.log('Database:', outputs.database_endpoint);
```

## CI/CD Pipeline Patterns

### GitHub Actions

```yaml
name: Deploy Application

jobs:
  infrastructure:
    runs-on: ubuntu-latest
    outputs:
      app_url: ${{ steps.outputs.outputs.app_url }}
      cluster_name: ${{ steps.outputs.outputs.cluster_name }}
    steps:
      - uses: actions/checkout@v4

      - name: Terraform Apply
        run: terraform apply -auto-approve

      - name: Export outputs
        id: outputs
        run: |
          # Export all outputs as step outputs
          terraform output -json | jq -r 'to_entries[] | select(.value.sensitive == false) | "\(.key)=\(.value.value)"' >> $GITHUB_OUTPUT

  deploy:
    needs: infrastructure
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: |
          echo "Deploying to ${{ needs.infrastructure.outputs.cluster_name }}"
          echo "URL: ${{ needs.infrastructure.outputs.app_url }}"
```

### Saving Outputs to a File

```bash
# Save all outputs to a JSON file
terraform output -json > outputs.json

# Use in later pipeline steps
APP_URL=$(jq -r '.app_url.value' outputs.json)
DB_HOST=$(jq -r '.database_endpoint.value' outputs.json)
```

### Generating Environment Files

```bash
# Generate a .env file from Terraform outputs
terraform output -json | jq -r '
  to_entries[]
  | select(.value.sensitive == false)
  | "TF_OUTPUT_\(.key | ascii_upcase)=\(.value.value)"
' > terraform.env

# Source in subsequent scripts
source terraform.env
echo "VPC ID: $TF_OUTPUT_VPC_ID"
```

## Handling Sensitive Outputs in JSON

When you request all outputs with `-json`, sensitive values are still included in the JSON:

```bash
terraform output -json
```

```json
{
  "database_password": {
    "sensitive": true,
    "type": "string",
    "value": "my-secret-password"
  },
  "vpc_id": {
    "sensitive": false,
    "type": "string",
    "value": "vpc-abc123"
  }
}
```

Yes, the actual value is present even for sensitive outputs. The `-json` flag is considered an explicit request for the data. To filter out sensitive values:

```bash
# Only non-sensitive outputs
terraform output -json | jq 'to_entries | map(select(.value.sensitive == false)) | from_entries'

# Only sensitive outputs (be careful with this!)
terraform output -json | jq 'to_entries | map(select(.value.sensitive == true)) | from_entries'
```

## Complex Output Types in JSON

### List of Objects

```hcl
output "instances" {
  value = [
    { name = "app-1", ip = "10.0.1.10", az = "us-east-1a" },
    { name = "app-2", ip = "10.0.1.11", az = "us-east-1b" },
  ]
}
```

```bash
terraform output -json instances
# [{"az":"us-east-1a","ip":"10.0.1.10","name":"app-1"},{"az":"us-east-1b","ip":"10.0.1.11","name":"app-2"}]

# Format as a table
terraform output -json instances | jq -r '.[] | [.name, .ip, .az] | @tsv'
# app-1   10.0.1.10   us-east-1a
# app-2   10.0.1.11   us-east-1b
```

### Map of Objects

```hcl
output "services" {
  value = {
    api    = { url = "http://api.example.com", port = 8080 }
    web    = { url = "http://web.example.com", port = 80 }
  }
}
```

```bash
terraform output -json services | jq -r 'to_entries[] | "\(.key): \(.value.url):\(.value.port)"'
# api: http://api.example.com:8080
# web: http://web.example.com:80
```

## Generating Configuration Files

### Ansible Inventory

```bash
terraform output -json instances | jq -r '
  "[app_servers]\n" +
  (map("\(.name) ansible_host=\(.ip)") | join("\n"))
' > inventory.ini
```

### Docker Compose Environment

```bash
terraform output -json | jq -r '
  to_entries[]
  | select(.value.sensitive == false)
  | select(.value.type == "string")
  | "\(.key | ascii_upcase)=\(.value.value)"
' > .env
```

### Kubernetes ConfigMap

```bash
terraform output -json | jq '{
  apiVersion: "v1",
  kind: "ConfigMap",
  metadata: {
    name: "terraform-outputs",
    namespace: "default"
  },
  data: (to_entries | map(select(.value.sensitive == false)) | map({(.key): (.value.value | tostring)}) | add)
}' | kubectl apply -f -
```

## Comparison: -json vs -raw

| Feature | -json | -raw |
|---------|-------|------|
| String output | `"vpc-abc123"` | `vpc-abc123` |
| Number output | `42` | `42` |
| Boolean output | `true` | `true` |
| List output | `["a","b"]` | Error |
| Map output | `{"k":"v"}` | Error |
| Object output | `{"a":1}` | Error |
| All outputs | Full metadata | Not supported |
| Best for | Programs, complex types | Shell variable assignment |

Use `-raw` when you need a single string value for a shell variable. Use `-json` for everything else.

## Wrapping Up

The `terraform output -json` flag is the right choice for any programmatic consumption of Terraform outputs. It handles all data types, preserves structure, and produces output that every programming language can parse natively. Combined with `jq` for shell scripting or native JSON parsing in Python, Go, or Node.js, it enables reliable integration between your infrastructure code and everything that depends on it. Make it your default when building automation around Terraform.

For the basics of using `terraform output`, see our post on [querying values with the terraform output command](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-output-command-to-query-values/view).
