# How to Clean Up Stale Workspaces in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Workspaces, Cost Optimization, Automation, Infrastructure as Code

Description: Learn how to identify and safely remove stale OpenTofu workspaces to prevent orphaned cloud resources and unnecessary costs.

Stale workspaces accumulate over time - developer branches are merged, experiments are abandoned, and the infrastructure they created is forgotten. A regular cleanup process prevents orphaned resources from quietly draining your cloud budget.

## Identifying Stale Workspaces

List all workspaces in a directory and compare them against active branches or users:

```bash
# List all workspaces

tofu workspace list

# Output example:
#   default
#   dev-alice
#   dev-bob
# * dev-charlie
#   feature-auth
#   feature-old-experiment
```

## Script: Detect Workspaces With No Recent State Change

Check when each workspace's state was last modified using your backend's metadata. For an S3 backend:

```bash
#!/usr/bin/env bash
# find-stale-workspaces.sh
# Finds workspaces whose state hasn't changed in more than 14 days

BUCKET="mycompany-opentofu-state"
PREFIX="env:/"                # Match backend workspace_key_prefix + trailing slash
STATE_KEY="terraform.tfstate" # Match backend key
STALE_DAYS=14
CUTOFF=$(date -d "-${STALE_DAYS} days" +%s 2>/dev/null || date -v-${STALE_DAYS}d +%s)

echo "Workspaces not modified in the last ${STALE_DAYS} days:"

aws s3api list-objects-v2 \
  --bucket "$BUCKET" \
  --prefix "$PREFIX" \
  --output json | \
jq -r --arg state_key "$STATE_KEY" '
  .Contents[]?
  | select(.Key | endswith("/" + $state_key))
  | [.LastModified, .Key]
  | @tsv
' | \
while IFS=$'\t' read -r modified key; do
  mod_epoch=$(jq -nr --arg ts "$modified" '$ts | sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601')
  if [[ $mod_epoch -lt $CUTOFF ]]; then
    workspace="${key#${PREFIX}}"
    workspace="${workspace%/$STATE_KEY}"
    echo "  STALE: $workspace (last modified: $modified)"
  fi
done
```

## Script: Destroy and Delete a Workspace

Before deleting a workspace, destroy all its resources to avoid orphans:

```bash
#!/usr/bin/env bash
# cleanup-workspace.sh
set -euo pipefail

WORKSPACE="${1:-}"

if [[ -z "$WORKSPACE" || "$WORKSPACE" == "default" ]]; then
  echo "Error: provide a non-default workspace name."
  exit 1
fi

echo "Switching to workspace: $WORKSPACE"
tofu workspace select "$WORKSPACE"

echo "Destroying all resources in workspace: $WORKSPACE"
# Use -auto-approve only in automated pipelines with review steps upstream
tofu destroy -auto-approve

echo "Switching back to default workspace"
tofu workspace select default

echo "Deleting workspace: $WORKSPACE"
tofu workspace delete "$WORKSPACE"

echo "Done. Workspace $WORKSPACE has been removed."
```

Run it with:

```bash
chmod +x cleanup-workspace.sh
./cleanup-workspace.sh dev-alice
```

## Automating Cleanup in CI/CD

Add a scheduled pipeline job to run the detection script weekly:

```yaml
# .github/workflows/cleanup-workspaces.yml
name: Cleanup Stale Workspaces

on:
  schedule:
    - cron: "0 8 * * 1"  # Every Monday at 8 AM UTC

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v2

      - name: Find Stale Workspaces
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
        run: bash scripts/find-stale-workspaces.sh | tee stale.txt
```

## Safety Guardrails

- **Never auto-destroy without review**: Send the stale workspace list to a Slack channel and require a human to approve destruction.
- **Protect named workspaces**: Maintain an allowlist of workspaces that should never be deleted (e.g., `staging`, `production`).
- **Keep destroy logs**: Archive the output of each destroy run for audit purposes.

```bash
# Allowlist check before destruction
PROTECTED=("default" "staging" "production")
if [[ " ${PROTECTED[*]} " == *" ${WORKSPACE} "* ]]; then
  echo "ERROR: $WORKSPACE is protected and cannot be deleted."
  exit 1
fi
```

## Conclusion

A periodic workspace cleanup routine keeps your infrastructure tidy, reduces cloud costs, and ensures your state backend doesn't accumulate stale entries. Combine automated detection, a destroy script, and human approval gates for a safe and practical cleanup process.
