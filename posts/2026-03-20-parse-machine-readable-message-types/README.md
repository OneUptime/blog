# Parsing Machine-Readable Message Types in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, JSON, Automation, CI/CD, Logging

Description: Learn how to parse OpenTofu's machine-readable JSON log message types to build automation, monitoring, and CI/CD integrations around infrastructure operations.

## What are Machine-Readable Messages?

OpenTofu can output structured JSON logs for all operations using the `-json` flag. Each line is a JSON object with a consistent structure including a message type, log level, timestamp, and message-specific fields. This enables reliable parsing by scripts, CI/CD tools, and log aggregation systems.

## Enabling Machine-Readable Output

```bash
# Plan with JSON output

tofu plan -json

# Apply with JSON output
tofu apply -json

# Test with JSON output
tofu test -json
```

## Message Structure

Every message follows this base structure:

```json
{
  "@level": "info",
  "@message": "Human-readable message",
  "@module": "tofu.ui",
  "@timestamp": "2026-03-20T10:00:00.000Z",
  "type": "message_type",
  ...additional fields
}
```

## Common Message Types

### `version`
Emitted at startup with version information:

```json
{
  "type": "version",
  "tofu": "1.6.0",
  "ui": "1.0"
}
```

### `resource_drift`
Reports resources that have changed outside of OpenTofu:

```json
{
  "type": "resource_drift",
  "@message": "aws_instance.web: Resource drift detected",
  "change": {
    "resource": {"addr": "aws_instance.web"},
    "action": "update"
  }
}
```

### `planned_change`
Reports a planned change to a resource:

```json
{
  "type": "planned_change",
  "change": {
    "resource": {"addr": "aws_s3_bucket.data"},
    "action": "create"
  }
}
```

### `change_summary`
Summary of all planned changes:

```json
{
  "type": "change_summary",
  "@message": "Plan: 3 to add, 1 to change, 0 to destroy.",
  "changes": {
    "add": 3,
    "change": 1,
    "remove": 0,
    "operation": "plan"
  }
}
```

### `apply_start` / `apply_complete` / `apply_errored`
Lifecycle events for resource operations:

```json
{"type": "apply_start", "hook": {"resource": {"addr": "aws_vpc.main"}, "action": "create"}}
{"type": "apply_complete", "hook": {"resource": {"addr": "aws_vpc.main"}, "action": "create", "elapsed_seconds": 3.2}}
{"type": "apply_errored", "hook": {"resource": {"addr": "aws_vpc.main"}, "action": "create"}}
```

## Parsing with jq

```bash
# Watch for errors during apply
tofu apply -json | jq 'select(.type == "apply_errored")'

# Extract change summary
tofu plan -json | jq 'select(.type == "change_summary") | .changes'

# Show all resource operations
tofu apply -json | jq 'select(.type | startswith("apply_")) | {type, addr: .hook.resource.addr, action: .hook.action}'

# Alert on resource drift
tofu plan -json | jq 'select(.type == "resource_drift") | .change.resource.addr'
```

## Python Parser Example

```python
import json
import sys

def parse_tofu_json(stream):
    for line in stream:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            continue

        msg_type = msg.get("type", "")

        if msg_type == "change_summary":
            changes = msg.get("changes", {})
            print(f"Summary: +{changes.get('add',0)} ~{changes.get('change',0)} -{changes.get('remove',0)}")

        elif msg_type == "apply_errored":
            addr = msg.get("hook", {}).get("resource", {}).get("addr", "unknown")
            print(f"ERROR applying: {addr}", file=sys.stderr)

        elif msg_type == "diagnostic":
            diag = msg.get("diagnostic", {})
            print(f"[{diag.get('severity', 'unknown').upper()}] {diag.get('summary', '')}")

if __name__ == "__main__":
    parse_tofu_json(sys.stdin)
```

Usage:
```bash
tofu apply -json | python3 parser.py
```

## Building a Slack Notifier

```bash
tofu apply -json | jq -c 'select(.type == "change_summary")' | while read line; do
  SUMMARY=$(echo "$line" | jq -r '.["@message"]')
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    --data "{\"text\": \"OpenTofu Apply Complete: $SUMMARY\"}"
done
```

## Best Practices

1. **Always use `-json` in CI/CD** for reliable, parseable output
2. **Filter by `type`** rather than parsing `@message` strings
3. **Check `@level`** for `error` or `warn` to detect problems early
4. **Store JSON logs** for post-run analysis and audit trails
5. **Handle unknown message types gracefully** - new types may be added in future OpenTofu versions

## Conclusion

OpenTofu's machine-readable JSON message types provide a stable, structured interface for automation. By parsing event types like `change_summary`, `apply_errored`, and `resource_drift`, you can build reliable CI/CD integrations, alerting systems, and dashboards around your infrastructure operations.
