# How to Fix Terraform External Data Source Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, Data Source

Description: Fix Terraform external data source errors including script failures, JSON output issues, and common pitfalls with the external provider.

---

The `external` data source lets Terraform call an external program and use its output in your configuration. It is a powerful escape hatch for when you need data that no Terraform provider supplies. But it is also one of the most error-prone data sources because it depends on external scripts behaving in a very specific way. This guide covers the common failure modes and their fixes.

## How the External Data Source Works

The external data source runs a program that must:
1. Read a JSON object from stdin (the query)
2. Write a JSON object to stdout (the result)
3. Exit with code 0 on success, non-zero on failure
4. Write error messages to stderr (not stdout)

```hcl
data "external" "example" {
  program = ["python3", "${path.module}/scripts/get_data.py"]

  query = {
    resource_id = "abc123"
    region      = "us-east-1"
  }
}

# Use the result
output "result" {
  value = data.external.example.result
}
```

The script must produce valid JSON with **string values only**:

```python
#!/usr/bin/env python3
import json
import sys

# Read query from stdin
query = json.load(sys.stdin)

# Do your thing
resource_id = query["resource_id"]

# Output MUST be a JSON object with string values
result = {
    "name": "my-resource",
    "status": "active",
    "id": resource_id
}

# Write to stdout
json.dump(result, sys.stdout)
```

## Error 1: Program Not Found

```
Error: Failed to execute data source

data.external.example: failed to execute
"python3": executable file not found in $PATH
```

The program specified in the `program` argument must be in the system PATH or specified with an absolute path.

**Fix:**

```hcl
# Use absolute path
data "external" "example" {
  program = ["/usr/bin/python3", "${path.module}/scripts/get_data.py"]
}

# Or use the interpreter in a portable way
data "external" "example" {
  program = ["bash", "${path.module}/scripts/get_data.sh"]
}
```

Make sure the script itself is executable:

```bash
chmod +x scripts/get_data.py
```

## Error 2: Invalid JSON Output

```
Error: Failed to parse result

data.external.example: command produced invalid JSON:
unexpected end of JSON input
```

Your script is not producing valid JSON on stdout. Common causes:

- The script prints something other than JSON to stdout (like log messages)
- The script crashes before producing output
- The JSON is malformed

**Fix:** Make sure your script only writes JSON to stdout and everything else goes to stderr:

```python
#!/usr/bin/env python3
import json
import sys

# Logs go to stderr, NOT stdout
print("Starting script...", file=sys.stderr)

query = json.load(sys.stdin)

# This is wrong - it goes to stdout and corrupts the JSON
# print("Processing query...")  # DO NOT DO THIS

# Only JSON goes to stdout
result = {"status": "ok"}
json.dump(result, sys.stdout)
```

For bash scripts:

```bash
#!/bin/bash

# Logs to stderr
echo "Starting..." >&2

# Read input
INPUT=$(cat)
RESOURCE_ID=$(echo "$INPUT" | jq -r '.resource_id')

# Log to stderr
echo "Looking up $RESOURCE_ID..." >&2

# Only JSON to stdout
echo "{\"name\": \"my-resource\", \"id\": \"$RESOURCE_ID\"}"
```

## Error 3: Non-String Values in Output

```
Error: Failed to parse result

data.external.example: command produced invalid result: all values must
be strings
```

The external data source requires ALL result values to be strings. Not numbers, not booleans, not nested objects:

```python
# Wrong - contains non-string values
result = {
    "name": "web-server",
    "port": 8080,         # Number - not allowed
    "enabled": True,      # Boolean - not allowed
    "tags": ["web"]       # List - not allowed
}

# Right - everything is a string
result = {
    "name": "web-server",
    "port": "8080",
    "enabled": "true",
    "tags": "[\"web\"]"  # Serialize complex types as JSON strings
}
```

Convert types in Terraform after reading the result:

```hcl
locals {
  port    = tonumber(data.external.example.result["port"])
  enabled = data.external.example.result["enabled"] == "true"
  tags    = jsondecode(data.external.example.result["tags"])
}
```

## Error 4: Script Exit Code Non-Zero

```
Error: Failed to execute data source

data.external.example: command exited with non-zero status: 1
```

Any non-zero exit code is treated as an error. The script must exit 0 on success.

**Fix:** Add error handling to your script:

```python
#!/usr/bin/env python3
import json
import sys

try:
    query = json.load(sys.stdin)
    resource_id = query.get("resource_id", "")

    if not resource_id:
        print("Error: resource_id is required", file=sys.stderr)
        sys.exit(1)

    # Do your thing
    result = {"name": "found", "id": resource_id}
    json.dump(result, sys.stdout)
    sys.exit(0)

except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
```

For bash scripts:

```bash
#!/bin/bash
set -e  # Exit on any error

# Read input
INPUT=$(cat)
RESOURCE_ID=$(echo "$INPUT" | jq -r '.resource_id')

if [ -z "$RESOURCE_ID" ]; then
    echo "Error: resource_id is required" >&2
    exit 1
fi

# Output
echo "{\"id\": \"$RESOURCE_ID\", \"status\": \"found\"}"
exit 0
```

## Error 5: Query Not Read from stdin

The external program must read the query from stdin, even if it does not use it. If the program ignores stdin, it might still work, but if it writes an error about unexpected input, it breaks.

```python
#!/usr/bin/env python3
import json
import sys

# MUST read stdin even if you do not use the query
query = json.load(sys.stdin)

# Now produce output
json.dump({"result": "ok"}, sys.stdout)
```

If your script does not need the query, still consume stdin:

```bash
#!/bin/bash
# Consume stdin to avoid broken pipe
cat > /dev/null

echo '{"result": "ok"}'
```

## Error 6: Script Timeout

External scripts that take too long can cause Terraform to hang. There is no built-in timeout for the external data source.

**Fix:** Add a timeout to your script:

```bash
#!/bin/bash
# Use timeout command (available on most Linux systems)
RESULT=$(timeout 30 curl -s "https://api.example.com/data")

if [ $? -eq 124 ]; then
    echo "Error: API request timed out" >&2
    exit 1
fi

echo "{\"data\": \"$RESULT\"}"
```

In Python:

```python
#!/usr/bin/env python3
import json
import sys
import signal

def timeout_handler(signum, frame):
    print("Error: Script timed out", file=sys.stderr)
    sys.exit(1)

# Set 30-second timeout
signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(30)

query = json.load(sys.stdin)
# ... your logic here ...
json.dump(result, sys.stdout)
```

## Error 7: Windows vs Unix Path Issues

External scripts can fail when paths differ between operating systems:

```hcl
# This fails on Windows
data "external" "example" {
  program = ["bash", "${path.module}/scripts/get_data.sh"]
}
```

**Fix:** Use platform-appropriate interpreters:

```hcl
data "external" "example" {
  program = ["python3", "${path.module}/scripts/get_data.py"]
  # Python works on both Windows and Unix
}
```

Or detect the platform:

```hcl
locals {
  is_windows = substr(pathexpand("~"), 0, 1) == "/"  ? false : true
}

data "external" "example" {
  program = local.is_windows ? [
    "powershell", "-File", "${path.module}/scripts/get_data.ps1"
  ] : [
    "bash", "${path.module}/scripts/get_data.sh"
  ]
}
```

## Error 8: Environment Variables Not Available

External scripts do not automatically inherit all Terraform variables. They get the system environment but not Terraform-specific values.

**Fix:** Pass required data through the query:

```hcl
data "external" "example" {
  program = ["python3", "${path.module}/scripts/get_data.py"]

  query = {
    aws_region     = var.region
    environment    = var.environment
    resource_id    = aws_instance.web.id
  }
}
```

## Debugging External Data Sources

### Test the script manually

```bash
# Pipe a test query to your script
echo '{"resource_id": "abc123"}' | python3 scripts/get_data.py

# Check the exit code
echo $?

# Validate the JSON output
echo '{"resource_id": "abc123"}' | python3 scripts/get_data.py | jq .
```

### Enable Terraform debug logging

```bash
TF_LOG=DEBUG terraform plan 2>&1 | grep -A 5 "external"
```

### Add verbose logging to stderr

```python
print(f"Received query: {query}", file=sys.stderr)
print(f"Producing result: {result}", file=sys.stderr)
```

## Alternatives to External Data Sources

Before reaching for `external`, consider these alternatives:

- **HTTP data source** - For API calls
- **Local-exec provisioner** - For side effects that do not need output
- **Custom provider** - For reusable, well-tested integrations
- **terraform_data** - For simple data passing

## Conclusion

External data source errors almost always come from one of four things: the script is not producing valid JSON on stdout, the output contains non-string values, the script exits with a non-zero code, or the program cannot be found. Test your scripts outside of Terraform first, make sure all output goes to the right stream (JSON to stdout, logs to stderr), and ensure all values in the result are strings. When in doubt, wrap everything in try/except and produce a clear error on stderr.
