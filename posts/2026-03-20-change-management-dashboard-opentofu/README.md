# How to Create a Change Management Dashboard for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Change Management, Dashboard, Observability, GitOps, Infrastructure as Code

Description: Learn how to build a change management dashboard for OpenTofu that tracks infrastructure changes, approvals, and deployment history using Git and CI/CD data.

## Introduction

Understanding what changed, when, who made the change, and what the high-level impact was is critical for infrastructure change management. This guide shows how to build a lightweight dashboard by collecting change data from Git history, CI/CD runs, and OpenTofu plan outputs.

## Change Event Collection Script

```bash
#!/usr/bin/env bash
# scripts/collect-changes.sh

# Collect change event data from recent applies and save as JSON

set -euo pipefail

CHANGES_DB="changes/history.json"
mkdir -p changes

# Get the current apply info
APPLY_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
APPLY_COMMIT=$(git rev-parse HEAD)
APPLY_AUTHOR=$(git log -1 --format="%an <%ae>")
APPLY_MESSAGE=$(git log -1 --format="%s")
ENVIRONMENT="${ENVIRONMENT:-unknown}"

# Parse the plan output for change counts
PLAN_OUTPUT="${1:-plan_output.txt}"
PLAN_SUMMARY=$(grep -E '^Plan: [0-9]+ to add, [0-9]+ to change, [0-9]+ to destroy\.$' "$PLAN_OUTPUT" | tail -n1 || true)
ADDED=0
CHANGED=0
DESTROYED=0

if [[ "$PLAN_SUMMARY" =~ ^Plan:\ ([0-9]+)\ to\ add,\ ([0-9]+)\ to\ change,\ ([0-9]+)\ to\ destroy\.$ ]]; then
  ADDED="${BASH_REMATCH[1]}"
  CHANGED="${BASH_REMATCH[2]}"
  DESTROYED="${BASH_REMATCH[3]}"
fi

CI_RUN_URL=""
if [[ -n "${GITHUB_SERVER_URL:-}" && -n "${GITHUB_REPOSITORY:-}" && -n "${GITHUB_RUN_ID:-}" ]]; then
  CI_RUN_URL="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
fi

# Build change event JSON safely
CHANGE_EVENT=$(jq -n \
  --arg id "$(uuidgen | tr '[:upper:]' '[:lower:]')" \
  --arg timestamp "${APPLY_DATE}" \
  --arg environment "${ENVIRONMENT}" \
  --arg commit "${APPLY_COMMIT}" \
  --arg author "${APPLY_AUTHOR}" \
  --arg message "${APPLY_MESSAGE}" \
  --arg ci_run_url "${CI_RUN_URL}" \
  --argjson added "${ADDED}" \
  --argjson changed "${CHANGED}" \
  --argjson destroyed "${DESTROYED}" \
  '{
    id: $id,
    timestamp: $timestamp,
    environment: $environment,
    commit: $commit,
    author: $author,
    message: $message,
    changes: {
      added: $added,
      changed: $changed,
      destroyed: $destroyed
    },
    ci_run_url: $ci_run_url,
    status: "applied"
  }'
)

# Append to changes history (create if doesn't exist)
if [[ -f "$CHANGES_DB" ]]; then
  TMP_FILE=$(mktemp)
  jq --argjson event "$CHANGE_EVENT" '. + [$event]' "$CHANGES_DB" > "$TMP_FILE"
  mv "$TMP_FILE" "$CHANGES_DB"
else
  jq -n --argjson event "$CHANGE_EVENT" '[$event]' > "$CHANGES_DB"
fi

echo "Change event recorded: ${APPLY_DATE}"
```

## GitHub Actions Integration

```yaml
# .github/workflows/opentofu.yml (additions)
# Assumes the OpenTofu apply step uses `id: apply`.
# Also set workflow or job permissions:
# permissions:
#   contents: write
- name: Record change event
  if: steps.apply.outcome == 'success'
  run: |
    ./scripts/collect-changes.sh plan_output.txt
    git config user.email "ci@example.com"
    git config user.name "CI Bot"
    git add changes/history.json
    git commit -m "chore: record infrastructure change event [skip ci]"
    git push
  env:
    ENVIRONMENT: ${{ matrix.environment }}
```

## Generating an HTML Dashboard

```python
#!/usr/bin/env python3
# scripts/generate_dashboard.py

import html
import json
from datetime import datetime

def generate_dashboard(history_file: str, output_file: str):
    with open(history_file, encoding="utf-8") as f:
        events = json.load(f)

    # Sort by timestamp descending
    events.sort(key=lambda x: x["timestamp"], reverse=True)

    # Build summary stats
    total_adds     = sum(e["changes"]["added"]    for e in events)
    total_changes  = sum(e["changes"]["changed"]  for e in events)
    total_destroys = sum(e["changes"]["destroyed"] for e in events)

    rows = ""
    for event in events[:50]:  # last 50 changes
        ts = datetime.fromisoformat(event["timestamp"].replace("Z", "+00:00"))
        environment = html.escape(event["environment"])
        author = html.escape(event["author"])
        message = html.escape(event["message"][:60])
        ci_run_url = html.escape(event.get("ci_run_url", "#"), quote=True)
        rows += f"""
        <tr>
          <td>{ts.strftime('%Y-%m-%d %H:%M')}</td>
          <td><code>{environment}</code></td>
          <td>{author}</td>
          <td>{message}</td>
          <td class="add">+{event['changes']['added']}</td>
          <td class="change">~{event['changes']['changed']}</td>
          <td class="destroy">-{event['changes']['destroyed']}</td>
          <td><a href="{ci_run_url}">View</a></td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html><head><title>Infrastructure Change Dashboard</title>
<style>
  body {{ font-family: sans-serif; padding: 20px; }}
  table {{ border-collapse: collapse; width: 100%; }}
  th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
  th {{ background: #f2f2f2; }}
  .add {{ color: green; }} .change {{ color: orange; }} .destroy {{ color: red; }}
  .stat {{ display: inline-block; margin: 10px 20px; font-size: 1.5em; }}
</style></head><body>
<h1>Infrastructure Change Dashboard</h1>
<div>
  <span class="stat add">+{total_adds} added</span>
  <span class="stat change">~{total_changes} changed</span>
  <span class="stat destroy">-{total_destroys} destroyed</span>
  <span class="stat">{len(events)} total events</span>
</div>
<table><tr>
  <th>Timestamp</th><th>Environment</th><th>Author</th>
  <th>Change</th><th>Added</th><th>Changed</th><th>Destroyed</th><th>CI Run</th>
</tr>{rows}</table>
</body></html>"""

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Dashboard generated: {output_file}")

if __name__ == "__main__":
    generate_dashboard("changes/history.json", "dashboard.html")
```

## Summary

A change management dashboard built from Git metadata, CI/CD run data, and plan outputs provides visibility into infrastructure changes. OpenTofu generates the change data; scripts collect and visualize it - giving teams a lightweight audit trail without dedicated tooling.
