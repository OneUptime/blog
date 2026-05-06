# How to Compare Plans Between Runs in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Plan Comparison, CI/CD, Infrastructure as Code, Automation

Description: Learn how to compare OpenTofu plan JSON outputs between different runs to detect drift, track infrastructure changes over time, and identify unintended modifications.

Comparing plan outputs between runs helps you answer questions like "did the plan change since yesterday?", "did a new resource appear in this PR?", or "is the infrastructure drifting from its expected state?" JSON-format plans make this comparison scriptable and automatable.

## Storing Plans for Comparison

Save the plan JSON from each run with a consistent naming scheme:

```bash
# Save plan with a timestamp

mkdir -p plans

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
tofu plan -out=tfplan
tofu show -json tfplan > "plans/plan-${TIMESTAMP}.json"

# Or save by git commit SHA
COMMIT=$(git rev-parse --short HEAD)
tofu show -json tfplan > "plans/plan-${COMMIT}.json"
```

## Simple Diff: Compare Resource Change Lists

Extract the list of changed resources from two plans and diff them:

```bash
# Extract changed resource addresses from plan A
jq -r '.resource_changes[] |
  select(.change.actions != ["no-op"]) |
  "\(.change.actions | join("+"))\t\(.address)"' plan-before.json | sort > changes-before.txt

# Extract from plan B
jq -r '.resource_changes[] |
  select(.change.actions != ["no-op"]) |
  "\(.change.actions | join("+"))\t\(.address)"' plan-after.json | sort > changes-after.txt

# Show differences between the two plans
diff changes-before.txt changes-after.txt
```

## Python: Structured Plan Comparison

```python
#!/usr/bin/env python3
# compare-plans.py - compare two OpenTofu plan JSON files

import json, sys
from typing import Dict, Set

def load_changes(path: str) -> Dict[str, list]:
    """Load resource changes from a plan JSON, keyed by address."""
    with open(path) as f:
        plan = json.load(f)
    return {
        c["address"]: c["change"]["actions"]
        for c in plan.get("resource_changes", [])
        if c["change"]["actions"] != ["no-op"]
    }

before = load_changes(sys.argv[1])
after  = load_changes(sys.argv[2])

before_set: Set[str] = set(before.keys())
after_set:  Set[str] = set(after.keys())

added   = after_set - before_set
removed = before_set - after_set
both    = before_set & after_set

print("=== Plan Comparison ===\n")

if added:
    print(f"NEW in plan B ({len(added)}):")
    for addr in sorted(added):
        print(f"  + {after[addr]} {addr}")

if removed:
    print(f"\nREMOVED from plan B ({len(removed)}):")
    for addr in sorted(removed):
        print(f"  - {before[addr]} {addr}")

changed_action = {
    addr for addr in both
    if before[addr] != after[addr]
}

if changed_action:
    print(f"\nACTION CHANGED ({len(changed_action)}):")
    for addr in sorted(changed_action):
        print(f"  ~ {before[addr]} -> {after[addr]}  {addr}")

if not (added or removed or changed_action):
    print("Plans are identical.")
```

```bash
python3 compare-plans.py plan-before.json plan-after.json
```

## Detecting Drift in Scheduled Runs

Schedule a daily plan and compare it against the last known clean plan to detect infrastructure drift:

```yaml
# .github/workflows/drift-detection.yml
name: Drift Detection

on:
  schedule:
    - cron: "0 6 * * *"  # Daily at 6 AM UTC

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate Today's Plan
        run: |
          mkdir -p plans
          tofu init
          tofu plan -out=tfplan
          tofu show -json tfplan > plans/today.json

      - name: Compare with Baseline
        id: compare
        run: |
          python3 compare-plans.py plans/baseline.json plans/today.json > drift-report.txt
          cat drift-report.txt
          grep -q "Plans are identical." drift-report.txt

      - name: Alert on Drift
        if: ${{ failure() && steps.compare.conclusion == 'failure' }}
        uses: slackapi/slack-github-action@v3
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK }}
          webhook-type: incoming-webhook
          payload: |
            text: "Infrastructure drift detected! See drift-report.txt."
```

## Comparing Attribute-Level Changes

For deeper comparison, check which specific attributes changed between two `update` operations:

```python
import json

with open("plan-after.json") as f:
    plan = json.load(f)

# Find attributes that differ between before and after for updated resources
for change in plan["resource_changes"]:
    if change["change"]["actions"] == ["update"]:
        before = change["change"]["before"] or {}
        after  = change["change"]["after"] or {}
        for key in set(list(before.keys()) + list(after.keys())):
            if before.get(key) != after.get(key):
                print(f"  {change['address']}.{key}: {before.get(key)!r} -> {after.get(key)!r}")
```

## Conclusion

Plan comparison is a powerful technique for tracking infrastructure change over time. Simple diffs catch new or removed planned changes between runs, while attribute-level comparisons reveal exactly what properties are being modified. Use scheduled drift detection workflows to catch unintended changes before they accumulate into bigger problems.
