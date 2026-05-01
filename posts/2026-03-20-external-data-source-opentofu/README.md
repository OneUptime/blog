# How to Use the external Data Source in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Data Source, External, Shell Script, Infrastructure as Code, DevOps

Description: A guide to using the external data source in OpenTofu to run external programs and scripts to fetch data that isn't available through standard provider data sources.

## Introduction

The `external` data source from the external provider allows you to run any external program as part of an OpenTofu configuration. The program reads JSON from stdin and writes JSON to stdout. This provides an escape hatch for querying data sources that don't have native OpenTofu providers.

## Setting Up the External Provider

```hcl
terraform {
  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "~> 2.0"
    }
  }
}
```

## Basic external Data Source

```hcl
data "external" "git_commit" {
  program = ["bash", "-c", "python3 -c 'import json,sys; json.load(sys.stdin)' >/dev/null && git log -1 --format='{\"sha\":\"%H\",\"short_sha\":\"%h\"}'"]
}

output "git_sha" {
  value = data.external.git_commit.result["sha"]
}
```

## Passing Query Parameters

```hcl
data "external" "aws_account_info" {
  program = ["python3", "${path.module}/scripts/get_aws_info.py"]

  query = {
    profile = var.aws_profile
    region  = var.aws_region
  }
}

# The script receives JSON on stdin with the query map

# It must write a flat JSON string map to stdout
```

## Python Script Example

```python
#!/usr/bin/env python3
# scripts/get_instance_metadata.py

import json
import sys
import subprocess

# Read query from stdin
query = json.load(sys.stdin)
region = query.get("region", "us-east-1")
tag_value = query.get("tag_value", "")

# Run AWS CLI to get instance info
result = subprocess.run(
    ["aws", "ec2", "describe-instances",
     "--region", region,
     "--filters", f"Name=tag:Application,Values={tag_value}",
                  "Name=instance-state-name,Values=running",
     "--query", "Reservations[].Instances[].InstanceId",
     "--output", "text"],
    capture_output=True, text=True
)

if result.returncode != 0:
    print(
        f"Error running aws ec2 describe-instances: {result.stderr.strip()}",
        file=sys.stderr,
    )
    sys.exit(result.returncode)

instance_ids = result.stdout.strip().split()

# Output must be a flat map of strings
output = {
    "instance_count": str(len(instance_ids)),
    "first_instance_id": instance_ids[0] if instance_ids else "",
}

json.dump(output, sys.stdout)
```

```hcl
data "external" "instances" {
  program = ["python3", "${path.module}/scripts/get_instance_metadata.py"]

  query = {
    region    = var.region
    tag_value = "myapp"
  }
}

output "instance_count" {
  value = data.external.instances.result["instance_count"]
}
```

## Bash Script Example

```bash
#!/bin/bash
# scripts/get_git_info.sh

set -euo pipefail

# Read JSON from stdin
INPUT=$(cat)

# Extract fields from JSON
BRANCH=$(printf '%s' "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('branch', 'HEAD'))")

# Get git information
SHA=$(git rev-parse --verify --end-of-options "${BRANCH}^{commit}" 2>/dev/null || echo "unknown")

if [ "$SHA" = "unknown" ]; then
  SHORT_SHA="unknown"
  MESSAGE="unknown"
else
  SHORT_SHA=$(git rev-parse --short "$SHA")
  MESSAGE=$(git log -1 --format=%s "$SHA")
fi

# Output flat JSON string map
SHA="$SHA" SHORT_SHA="$SHORT_SHA" MESSAGE="$MESSAGE" \
  python3 -c 'import json, os, sys; json.dump({"sha": os.environ["SHA"], "short_sha": os.environ["SHORT_SHA"], "message": os.environ["MESSAGE"]}, sys.stdout)'
```

```hcl
data "external" "git_info" {
  program = ["bash", "${path.module}/scripts/get_git_info.sh"]

  query = {
    branch = "main"
  }
}

locals {
  git_sha     = data.external.git_info.result["sha"]
  git_message = data.external.git_info.result["message"]
}
```

## Important Constraints

```hcl
# External data source output must be:
# 1. Valid JSON object (not array, not primitive)
# 2. All values must be STRINGS (not numbers, booleans, or nested objects)
# 3. Keys must be strings

# VALID output:
# {"count": "3", "name": "myapp", "enabled": "true"}

# INVALID output:
# {"count": 3}          -- number value, must be "3"
# {"enabled": true}     -- boolean value, must be "true"
# {"nested": {"a": "b"}} -- nested object not allowed

# If your script needs to return complex data, serialize to string:
# {"instances": "[\"i-123\", \"i-456\"]"}  -- JSON as string
```

## Error Handling

```bash
#!/bin/bash
# Good error handling pattern

INPUT=$(cat)

# Validate the JSON query input
if ! printf '%s' "$INPUT" | python3 -c "import json,sys; json.load(sys.stdin)" >/dev/null; then
    echo "Error: invalid JSON input" >&2
    exit 1
fi

# Attempt the operation
RESULT=$(some_command 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    # Write error to stderr and exit non-zero
    echo "Error running some_command: $RESULT" >&2
    exit 1
fi

# Write JSON result to stdout
RESULT="$RESULT" python3 -c 'import json, os, sys; json.dump({"result": os.environ["RESULT"]}, sys.stdout)'
```

## Conclusion

The `external` data source provides a flexible escape hatch for querying data that isn't available through standard OpenTofu providers. OpenTofu re-runs the external program when it refreshes the data source, and it may defer the read until apply if the inputs are not yet known, so scripts must be fast and idempotent. The most important constraint is that the program must output a flat JSON object where all values are strings. Prefer native provider data sources when available, and use the external data source for custom data needs that require running external scripts or programs.
