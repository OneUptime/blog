# Using tofu state pull in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, State

Description: Learn how to use tofu state pull to download the current state from your configured backend for inspection and backup.

The `tofu state pull` command downloads the current state from whatever backend is configured (S3, GCS, Terraform Cloud, etc.) and outputs it to stdout. It's useful for inspecting remote state, creating backups, and scripting state operations.

## Basic Usage

```bash
# Download state from configured backend to stdout

tofu state pull

# Save to a file
tofu state pull > current.tfstate

# Pretty-print with jq
tofu state pull | jq .
```

## Inspecting Remote State Without Downloading

```bash
# Check state version and serial
tofu state pull | jq '{version: .version, serial: .serial, terraform_version: .terraform_version}'

# Count resources in remote state
tofu state pull | jq '.resources | length'

# List all resource addresses
tofu state pull | jq -r '.resources[] | (if .module then .module + "." else "" end) + .type + "." + .name'
```

## Creating State Backups

```bash
# Backup remote state before making changes
tofu state pull > "backup/terraform.tfstate.$(date +%Y%m%d-%H%M%S)"

# Automated backup script
#!/bin/bash
BACKUP_DIR="./state-backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/terraform.tfstate.$TIMESTAMP"

tofu state pull > "$BACKUP_FILE"
echo "State backed up to: $BACKUP_FILE"
echo "Resources: $(cat "$BACKUP_FILE" | jq '.resources | length')"
```

## Comparing States

```bash
# Compare current state with a previous backup
tofu state pull > /tmp/current.tfstate
diff /tmp/current.tfstate backup/terraform.tfstate.20260301-120000 | head -50

# Or use jq to compare resource lists
current_resources=$(tofu state pull | jq -r '.resources[].name' | sort)
backup_resources=$(cat backup/terraform.tfstate.old | jq -r '.resources[].name' | sort)
diff <(echo "$current_resources") <(echo "$backup_resources")
```

## Auditing State Contents

```bash
# List all resource types and counts
tofu state pull | jq -r '.resources[].type' | sort | uniq -c | sort -rn

# Find resources with specific attribute
tofu state pull | jq '
  .resources[] | 
  select(.instances[0].attributes.instance_type? == "t3.large") |
  .type + "." + .name
'

# Find all resources in a specific module
tofu state pull | jq -r '.resources[] | select(.module != null) | .module' | sort -u

# Get all resource IDs
tofu state pull | jq -r '
  .resources[] | 
  .type + "." + .name + ": " + (.instances[0].attributes.id // "no-id")
'
```

## Extracting Specific Resource Data

```bash
# Get the full attributes of a specific resource
tofu state pull | jq '
  .resources[] | 
  select(.type == "aws_instance" and .name == "web") |
  .instances[0].attributes
'

# Get private IPs of all EC2 instances
tofu state pull | jq -r '
  .resources[] |
  select(.type == "aws_instance") |
  .name + ": " + (.instances[0].attributes.private_ip // "none")
'

# Get all S3 bucket names
tofu state pull | jq -r '
  .resources[] |
  select(.type == "aws_s3_bucket") |
  .instances[0].attributes.bucket
'
```

## State Monitoring Script

```bash
#!/bin/bash
# monitor-state-changes.sh

PREVIOUS_SERIAL_FILE=".state-serial"

current_serial=$(tofu state pull | jq -r '.serial')

if [[ -f "$PREVIOUS_SERIAL_FILE" ]]; then
  previous_serial=$(cat "$PREVIOUS_SERIAL_FILE")
  if [[ "$current_serial" != "$previous_serial" ]]; then
    echo "STATE CHANGED: serial $previous_serial -> $current_serial"
    # Alert, log, etc.
  else
    echo "State unchanged (serial: $current_serial)"
  fi
fi

echo "$current_serial" > "$PREVIOUS_SERIAL_FILE"
```

## Combining pull with state push

```bash
# Download, modify, and re-upload state
# (advanced - use with extreme caution)

# Pull current state
tofu state pull > local.tfstate

# Make necessary modifications to local.tfstate
# (e.g., fix corrupt data, manual corrections)

# Push modified state back
tofu state push local.tfstate
```

## State Version Information

```bash
# Check state metadata
tofu state pull | jq '{
  format_version: .version,
  tofu_version: .terraform_version,
  serial: .serial,
  lineage: .lineage,
  resource_count: (.resources | length)
}'
```

## Conclusion

`tofu state pull` is an invaluable tool for state inspection, backup, and automation. Use it to create point-in-time backups before risky operations, audit what's in your remote state, extract specific resource data for reporting, and detect state changes between runs. Combined with `jq`, it provides powerful state analysis capabilities without modifying anything.
