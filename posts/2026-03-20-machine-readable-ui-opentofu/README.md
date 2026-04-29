# How to Use OpenTofu's Machine-Readable UI Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Machine Readable, JSON, UI, Automation, CI/CD, Infrastructure as Code

Description: Learn how to use OpenTofu's `-json` flag for machine-readable structured log output - enabling CI/CD systems to parse progress, resource changes, and errors programmatically.

## Introduction

OpenTofu supports a machine-readable JSON output mode with `-json` on `plan` and `apply` commands. Instead of human-readable text output, each line is a JSON object with structured fields. This enables CI/CD systems, custom UIs, and monitoring tools to parse and respond to OpenTofu operations programmatically.

## Enabling Machine-Readable Output

```bash
# Plan with JSON output

tofu plan -json | tee plan-output.jsonl

# Apply with JSON output
tofu apply -auto-approve -json | tee apply-output.jsonl
```

`-json` implies `-input=false`, so all required input variables must already be set. For `tofu apply`, you must also use `-auto-approve` or pass a saved plan file.

Each line is a complete JSON object (JSON Lines format):

```json
{"@level":"info","@message":"OpenTofu 1.9.0","@module":"tofu.ui","@timestamp":"2026-03-19T10:00:00.000000Z","tofu":"1.9.0","type":"version","ui":"1.2"}
{"@level":"info","@message":"aws_vpc.main: Plan to create","@module":"tofu.ui","@timestamp":"2026-03-19T10:00:01.000000Z","change":{"resource":{"addr":"aws_vpc.main","module":"","resource":"aws_vpc.main","implied_provider":"aws","resource_type":"aws_vpc","resource_name":"main","resource_key":null},"action":"create"},"type":"planned_change"}
{"@level":"info","@message":"Plan: 3 to add, 0 to change, 0 to destroy.","@module":"tofu.ui","@timestamp":"2026-03-19T10:00:01.500000Z","changes":{"add":3,"change":0,"import":0,"remove":0,"forget":0,"operation":"plan"},"type":"change_summary"}
```

## Message Types

```bash
# Get all unique message types from a plan output
cat plan-output.jsonl | jq -r '.type' | sort -u
```

Common message types:

| Type | Description |
|------|-------------|
| `version` | OpenTofu version info |
| `log` | General log message |
| `planned_change` | A resource change in the plan |
| `change_summary` | Summary of planned or applied changes |
| `resource_drift` | Drift detected in existing resource |
| `apply_start` | Resource apply beginning |
| `apply_progress` | Periodic apply progress update |
| `apply_complete` | Resource apply completed |
| `apply_errored` | Resource apply failed |
| `outputs` | Root module outputs |
| `diagnostic` | Error or warning message |

## Parsing the Output

```bash
# Extract all planned changes
cat plan-output.jsonl | jq 'select(.type == "planned_change") | {addr: .change.resource.addr, action: .change.action}'

# Count changes
cat plan-output.jsonl | jq 'select(.type == "change_summary") | .changes'

# Find errors
cat plan-output.jsonl | jq 'select(.type == "diagnostic" and .diagnostic.severity == "error")'

# Show apply progress
cat apply-output.jsonl | jq 'select(.type == "apply_start" or .type == "apply_progress" or .type == "apply_complete") | {type, addr: .hook.resource.addr, elapsed_seconds: .hook.elapsed_seconds}'
```

## Building a Custom Progress Reporter

```python
#!/usr/bin/env python3
# scripts/tofu-progress.py - pretty progress reporter for OpenTofu JSON output

import json
import sys
from datetime import datetime

def format_time(ts: str) -> str:
    dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
    return dt.strftime('%H:%M:%S')

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        msg = json.loads(line)
    except json.JSONDecodeError:
        continue

    msg_type = msg.get('type', '')
    ts = format_time(msg.get('@timestamp', ''))

    if msg_type == 'planned_change':
        resource = msg['change']['resource']['addr']
        action = msg['change']['action']
        action_symbols = {'create': '+ ', 'delete': '- ', 'update': '~ ', 'replace': '-/+ ', 'move': '-> ', 'read': '<= ', 'import': '<> ', 'remove': 'x ', 'noop': '  '}
        symbol = action_symbols.get(action, '? ')
        print(f"[{ts}] {symbol}{resource}")

    elif msg_type == 'change_summary':
        changes = msg['changes']
        parts = []
        if changes.get('import', 0):
            parts.append(f"{changes['import']} to import")
        parts.extend([
            f"{changes['add']} to add",
            f"{changes['change']} to change",
            f"{changes['remove']} to destroy",
        ])
        if changes.get('forget', 0):
            parts.append(f"{changes['forget']} to forget")
        print(f"\n[{ts}] Plan: {', '.join(parts)}")

    elif msg_type == 'apply_complete':
        resource = msg['hook']['resource']['addr']
        elapsed = msg['hook'].get('elapsed_seconds', 0)
        print(f"[{ts}] ✅ {resource} ({elapsed:.1f}s)")

    elif msg_type == 'apply_errored':
        resource = msg['hook']['resource']['addr']
        print(f"[{ts}] ❌ {resource} FAILED")

    elif msg_type == 'diagnostic' and msg['diagnostic']['severity'] == 'error':
        print(f"[{ts}] ERROR: {msg['diagnostic']['summary']}")
        if 'detail' in msg['diagnostic']:
            print(f"       {msg['diagnostic']['detail']}")
```

Usage:

```bash
tofu apply -auto-approve -json | python3 scripts/tofu-progress.py
```

## CI/CD Integration

```yaml
# GitHub Actions: parse JSON output for status reporting
- name: OpenTofu Apply
  id: apply
  run: |
    set -o pipefail
    tofu apply -auto-approve -json | tee /tmp/apply.jsonl
    # Get final status
    RESULT=$(jq -r 'select(.type == "change_summary" and .changes.operation == "apply") | .changes | "Imported: \(.import), Added: \(.add), Changed: \(.change), Removed: \(.remove), Forgotten: \(.forget)"' /tmp/apply.jsonl)
    echo "result=$RESULT" >> $GITHUB_OUTPUT

- name: Report status
  run: echo "Apply complete - ${{ steps.apply.outputs.result }}"
```

## Conclusion

OpenTofu's machine-readable JSON UI mode (`-json` flag) enables CI/CD systems and custom tooling to parse plan and apply operations programmatically. Each operation emits structured JSON Lines with typed messages - `planned_change` for resources in the plan, `apply_start`/`apply_progress`/`apply_complete`/`apply_errored` for per-resource apply status, and `diagnostic` for errors. Use this output to build custom progress reporters, parse apply results in CI, trigger notifications on failures, or build dashboards showing infrastructure change history.
