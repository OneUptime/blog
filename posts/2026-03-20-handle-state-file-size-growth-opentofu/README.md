# How to Handle State File Size Growth in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, State Management, Performance, Optimization

Description: Learn how to manage and reduce OpenTofu state file size growth by splitting states, cleaning up orphaned resources, and optimizing state file structure.

## Introduction

State files grow over time as resources accumulate. Large state files slow down plan operations, increase lock contention, and can hit backend size limits. Proactive state management keeps operations fast and reliable.

## Diagnosing State File Size

```bash
# Check current state file size

tofu state pull | wc -c
# Output in bytes; compare this with your backend limits and plan/apply latency

# Count resources in state
tofu state list | wc -l

# Find resource types with the most instances
tofu state list | awk -F. '{i=1; while ($i=="module") i+=2; if ($i=="data") {print "data."$(i+1)} else {print $i}}' | sort | uniq -c | sort -rn | head -20
```

## Removing Orphaned Resources

Resources that exist in state but are no longer in HCL normally show as "destroy" in plans. If you want them deleted, apply the plan. If you want OpenTofu to forget them without destroying the remote object, use a `removed` block or `tofu state rm`.

```bash
# List resources that OpenTofu plans to destroy
tofu plan -no-color | grep "will be destroyed"
```

```hcl
# Preferred: remove from configuration without destroying the live object
removed {
  from = aws_cloudwatch_log_group.old_service
  lifecycle {
    destroy = false
  }
}
```

```bash
# CLI alternative: make OpenTofu forget a live object

tofu state rm aws_cloudwatch_log_group.old_service

# Remove multiple resources with indexed addresses
tofu state rm 'aws_lambda_function.deprecated[0]'
tofu state rm 'aws_lambda_function.deprecated[1]'

# Use state list and grep to find a set to remove safely
tofu state list | grep "deprecated" | while IFS= read -r addr; do
  tofu state rm "$addr"
done
```

## Splitting a Large State File

The most effective long-term solution is usually splitting by component. For local state files, `tofu state mv` supports `-state` and `-state-out` to move bindings between files:

```bash
# Example: Extract all ECR resources to a new local state file
RESOURCES=$(tofu state list | grep "aws_ecr_")
SOURCE="terraform.tfstate"
DEST="ecr/terraform.tfstate"

mkdir -p ecr

for resource in $RESOURCES; do
  echo "Moving: $resource"
  tofu state mv -state="$SOURCE" -state-out="$DEST" "$resource" "$resource"
done
```

If you use a remote backend, pull the state to local files first and push the reviewed results back carefully, because `-state` and `-state-out` are local-state options.

## Removing Unused Data Sources

Data sources are stored in state but don't represent managed remote objects. However, they add size.

```bash
# Data sources include a `data.` segment in their address
tofu state list | grep -E '(^|\.)data\.'
# Review whether these data blocks are still needed in configuration
# Data sources removed from configuration are cleaned up on the next plan/apply
```

## Optimizing for_each vs count

Large multi-instance resources can bloat state whether you use `count` or `for_each`. Converting to `for_each` with meaningful keys doesn't reduce size but makes state more manageable:

```bash
# Check resources addressed by numeric indices
tofu state list | grep -E '\[[0-9]+\]$'
```

## State File Rewrites

OpenTofu state snapshots do not accumulate operational history inside the state file itself. `tofu state pull` and `tofu state push` are for manual repair or migration, not routine compaction:

```bash
# Pull the current state before any manual repair
tofu state pull > /tmp/current-state.json
# Review the JSON carefully; only push it back when you intentionally need a manual fix
tofu state push /tmp/current-state.json
```

## Monitoring State File Growth

```bash
#!/bin/bash
# monitor_state_size.sh - Alert when state file exceeds an example threshold

STATE_SIZE=$(tofu state pull | wc -c)
THRESHOLD_MB=5 # Example threshold; tune for your backend and workflow
THRESHOLD_BYTES=$((THRESHOLD_MB * 1024 * 1024))

if [ "$STATE_SIZE" -gt "$THRESHOLD_BYTES" ]; then
  echo "WARNING: State file is ${STATE_SIZE} bytes (>${THRESHOLD_MB}MB)"
  echo "Consider splitting the state file"
  exit 1
fi

echo "State file size: ${STATE_SIZE} bytes - OK"
```

## Conclusion

State file size is best managed proactively: split states by component before they get large, remove resources you no longer want OpenTofu to manage, and monitor state size in CI. There is no universal MB threshold; set thresholds based on backend limits and observed plan/apply latency. The most durable fix is architectural - properly split states prevent unbounded growth.
