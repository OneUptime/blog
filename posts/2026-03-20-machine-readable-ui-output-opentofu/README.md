# How to Use Machine-Readable UI Output in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, JSON Output, CI/CD, Automation, Infrastructure as Code

Description: Learn how to enable and parse OpenTofu's machine-readable JSON output to integrate infrastructure operations into automated pipelines and monitoring systems.

## Introduction

OpenTofu supports a machine-readable output mode that formats CLI output as JSON, making it straightforward to parse results in CI/CD pipelines, scripts, and monitoring tools. This feature is especially useful when automating infrastructure workflows where you need to extract specific data from plan or apply operations.

## Enabling Machine-Readable Output

Pass the `-json` flag on long-running commands such as `plan` and `apply` to produce a stream of structured JSON UI messages:

```bash
tofu plan -json
tofu apply -json -auto-approve
```

If you want the machine-readable JSON representation of a saved plan or the current state snapshot instead, use `tofu show -json`:

```bash
tofu show -json -plan=tfplan
tofu show -json -state
```

You can also redirect the JSONL output to a file for post-processing:

```bash
tofu plan -json > plan_output.jsonl
```

## Understanding JSON Output Structure

For `tofu plan -json` and `tofu apply -json`, each line of output is a separate JSON message object with a consistent structure:

```json
{
  "@level": "info",
  "@message": "OpenTofu 1.6.0",
  "@module": "tofu.ui",
  "@timestamp": "2026-03-20T10:00:00.000000Z",
  "tofu": "1.6.0",
  "type": "version",
  "ui": "1.0"
}
```

Key fields:
- `@level` – log level (info, warn, error)
- `@message` – human-readable description
- `type` – message type (version, resource_drift, planned_change, apply_complete, etc.)

## Parsing Plan Output

Filter specific message types to extract planned changes:

```bash
tofu plan -json | jq 'select(.type == "planned_change")'
```

Extract the count of resources to be created:

```bash
tofu plan -json | \
  jq 'select(.type == "change_summary") | .changes.add'
```

## Parsing Apply Output

Monitor apply progress in real time:

```bash
set -o pipefail

tofu apply -json -auto-approve | while IFS= read -r line; do
  type=$(echo "$line" | jq -r '.type // empty')
  if [ "$type" = "apply_complete" ]; then
    action=$(echo "$line" | jq -r '.hook.action')
    resource=$(echo "$line" | jq -r '.hook.resource.addr')
    echo "Completed ($action): $resource"
  fi
done
```

## Integrating with CI/CD

### GitHub Actions Example

```yaml
- name: OpenTofu Plan
  run: |
    tofu plan -json -out=tfplan > plan_output.jsonl

- name: Check for Destructive Changes
  run: |
    DELETES=$(cat plan_output.jsonl | \
      jq 'select(.type == "change_summary") | .changes.remove')
    if [ "$DELETES" -gt "0" ]; then
      echo "WARNING: $DELETES resources will be deleted"
      exit 1
    fi
```

### Extracting Outputs After Apply

```bash
tofu output -json | jq '{
  endpoint: .api_endpoint.value,
  db_host:  .database_host.value
}'
```

## Message Types Reference

| Type | Description |
|------|-------------|
| `version` | OpenTofu version info |
| `log` | General log message |
| `diagnostic` | Warning or error details |
| `planned_change` | A resource change in the plan |
| `change_summary` | Summary of all planned changes |
| `apply_start` | Resource apply started |
| `apply_complete` | Resource apply finished |
| `apply_errored` | Resource apply failed |
| `outputs` | Output values after apply |

## Sending Results to Monitoring

Post a summary to a webhook after apply:

```bash
set -o pipefail

SUMMARY=$(tofu apply -json -auto-approve | \
  jq -c -s 'map(select(.type == "change_summary")) | last')

curl -X POST https://hooks.example.com/notify \
  -H "Content-Type: application/json" \
  -d "$(jq -n --argjson summary "$SUMMARY" \
    '{text: ("Deploy complete: " + ($summary | tostring))}')"
```

## Best Practices

- Process output line by line - each line is an independent JSON object (JSONL format).
- Use `jq -s` to collect all lines into an array for summary processing.
- Store raw JSON output as CI artifacts for audit purposes.
- Watch for `apply_errored` messages and `diagnostic` messages with `@level` set to `error` to detect failures programmatically.

## Conclusion

OpenTofu's machine-readable JSON output mode unlocks powerful automation possibilities. By integrating structured plan and apply output into your pipelines, you can build sophisticated deployment workflows with automated change validation, notifications, and audit trails.
