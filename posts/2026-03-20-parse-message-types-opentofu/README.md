# How to Parse OpenTofu JSON Message Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, JSON, Machine Readable, Automation, CI/CD, Infrastructure as Code

Description: Learn how to parse each OpenTofu JSON message type - version, log, planned_change, apply_complete, diagnostic, and outputs - for building custom CI/CD integrations and automation tools.

## Introduction

When you run `tofu plan -json` or `tofu apply -json`, each line of output is a JSON object with a `type` field. Different types carry different data. This guide covers each message type and how to extract useful information from it.

## Message Structure

Every message shares a common envelope:

```json
{
  "@level": "info",
  "@message": "Human-readable summary",
  "@module": "tofu.ui",
  "@timestamp": "2026-03-19T10:00:00.000000Z",
  "type": "message_type",
  // ... type-specific fields
}
```

## Type: version

First message in any output - identifies the OpenTofu version:

```json
{
  "@level": "info",
  "@message": "OpenTofu 1.9.0",
  "@module": "tofu.ui",
  "@timestamp": "2026-03-19T10:00:00.000000Z",
  "type": "version",
  "terraform": "1.9.0",
  "ui": "1.2"
}
```

```bash
# Extract version

cat output.jsonl | jq -r 'select(.type == "version") | .terraform'
# 1.9.0
```

## Type: log

General informational messages:

```json
{
  "@level": "info",
  "@message": "Refreshing state...",
  "type": "log"
}
```

```bash
# Show all log messages
cat output.jsonl | jq -r 'select(.type == "log") | .["@message"]'
```

## Type: planned_change

One message per resource change in the plan:

```json
{
  "type": "planned_change",
  "change": {
    "action": "create",
    "resource": {
      "addr": "aws_vpc.main",
      "module": "",
      "resource": "aws_vpc.main",
      "implied_provider": "aws",
      "resource_type": "aws_vpc",
      "resource_name": "main",
      "resource_key": null
    }
  }
}
```

```bash
# List all planned creates
cat plan.jsonl | jq -r '
  select(.type == "planned_change" and .change.action == "create")
  | .change.resource.addr
'

# Count by action
cat plan.jsonl | jq '
  [select(.type == "planned_change")]
  | group_by(.change.action)
  | map({action: .[0].change.action, count: length})
'
```

## Type: change_summary

Summary after the plan is computed:

```json
{
  "type": "change_summary",
  "changes": {
    "add": 3,
    "change": 1,
    "remove": 0,
    "operation": "plan"
  }
}
```

```bash
# Get the summary
cat plan.jsonl | jq 'select(.type == "change_summary") | .changes'
```

## Type: resource_drift

Detected when current infrastructure differs from state:

```json
{
  "type": "resource_drift",
  "change": {
    "action": "update",
    "resource": {
      "addr": "aws_security_group.web",
      "module": "",
      "resource": "aws_security_group.web",
      "implied_provider": "aws",
      "resource_type": "aws_security_group",
      "resource_name": "web",
      "resource_key": null
    }
  }
}
```

This message does not include the exact attribute changes that caused the drift. For that detail, use the JSON plan output.

```bash
# Find all drifted resources
cat plan.jsonl | jq -r 'select(.type == "resource_drift") | .change.resource.addr'
```

## Type: apply_start / apply_progress / apply_complete / apply_errored

Track apply progress per resource:

```json
{"type": "apply_start", "hook": {"resource": {"addr": "aws_vpc.main"}, "action": "create"}}
{"type": "apply_complete", "hook": {"resource": {"addr": "aws_vpc.main"}, "action": "create", "elapsed_seconds": 1.234}}
{"type": "apply_errored", "hook": {"resource": {"addr": "aws_instance.web"}, "action": "create", "elapsed_seconds": 5.6}}
```

```bash
# Show apply timeline
cat apply.jsonl | jq -r '
  select(.type == "apply_complete" or .type == "apply_errored")
  | [.type, .hook.resource.addr, (.hook.elapsed_seconds | tostring + "s")]
  | join(" ")
'
```

## Type: diagnostic

Errors and warnings:

```json
{
  "type": "diagnostic",
  "diagnostic": {
    "severity": "error",
    "summary": "Error creating VPC: VPCLimitExceeded",
    "detail": "The maximum number of VPCs has been reached for this account.",
    "range": {
      "filename": "main.tf",
      "start": {"line": 5, "column": 1},
      "end": {"line": 10, "column": 2}
    }
  }
}
```

```bash
# Show all errors
cat apply.jsonl | jq '
  select(.type == "diagnostic" and .diagnostic.severity == "error")
  | {summary: .diagnostic.summary, detail: .diagnostic.detail, file: .diagnostic.range.filename}
'

# Check if apply had errors
ERRORS=$(cat apply.jsonl | jq '[select(.type == "diagnostic" and .diagnostic.severity == "error")] | length')
[ "$ERRORS" -gt 0 ] && echo "Apply had $ERRORS errors" && exit 1
```

## Type: outputs

Final output values after apply:

```json
{
  "type": "outputs",
  "outputs": {
    "vpc_id": {"value": "vpc-12345678", "type": "string", "sensitive": false},
    "db_password": {"value": null, "type": "string", "sensitive": true}
  }
}
```

```bash
# Extract all non-sensitive outputs
cat apply.jsonl | jq '
  select(.type == "outputs")
  | .outputs
  | to_entries[]
  | select(.value.sensitive == false)
  | {key: .key, value: .value.value}
'
```

## Complete Parsing Script

```bash
#!/bin/bash
# parse-tofu-output.sh

INPUT="${1:-/dev/stdin}"
ERRORS=0

while IFS= read -r line; do
  TYPE=$(echo "$line" | jq -r '.type')

  case "$TYPE" in
    version)
      VERSION=$(echo "$line" | jq -r '.terraform')
      echo "OpenTofu version: $VERSION"
      ;;
    planned_change)
      ADDR=$(echo "$line" | jq -r '.change.resource.addr')
      ACTION=$(echo "$line" | jq -r '.change.action')
      echo "  $ACTION: $ADDR"
      ;;
    change_summary)
      echo "$(echo "$line" | jq -r '.changes | "Plan: +\(.add) ~\(.change) -\(.remove)"')"
      ;;
    apply_complete)
      ADDR=$(echo "$line" | jq -r '.hook.resource.addr')
      echo "  ✅ $ADDR"
      ;;
    apply_errored)
      ADDR=$(echo "$line" | jq -r '.hook.resource.addr')
      echo "  ❌ $ADDR FAILED"
      ERRORS=$((ERRORS + 1))
      ;;
    diagnostic)
      SEVERITY=$(echo "$line" | jq -r '.diagnostic.severity')
      SUMMARY=$(echo "$line" | jq -r '.diagnostic.summary')
      echo "  [$SEVERITY] $SUMMARY"
      [ "$SEVERITY" = "error" ] && ERRORS=$((ERRORS + 1))
      ;;
  esac
done < "$INPUT"

exit $ERRORS
```

## Conclusion

OpenTofu's JSON message types provide structured access to every aspect of plan and apply operations. The most useful types for automation are `planned_change` (what will change), `change_summary` (summary counts), `apply_complete`/`apply_errored` (apply progress), and `diagnostic` (errors and warnings). Parse these types in CI/CD to build custom status reporting, error alerting, and change auditing pipelines.
