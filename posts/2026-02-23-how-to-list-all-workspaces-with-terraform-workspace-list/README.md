# How to List All Workspaces with terraform workspace list

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, CLI Commands, State Management, DevOps

Description: Learn how to list all Terraform workspaces using terraform workspace list, understand the output format, and build automation that discovers and iterates over workspaces.

---

When you are managing infrastructure across multiple workspaces, you need to know what workspaces exist. The `terraform workspace list` command gives you that information. It sounds trivial, but understanding its output format and behavior across different backends is important for building reliable automation. This post covers the command itself plus practical patterns for working with the output.

## Basic Usage

```bash
# List all workspaces in the current configuration
terraform workspace list
```

Output:

```
  default
  dev
* staging
  prod
```

The asterisk (*) marks the currently active workspace. In this example, you are working in the "staging" workspace.

## Understanding the Output Format

The output format is consistent:

- Each workspace appears on its own line
- Two spaces of indentation before each name
- An asterisk replaces the first space for the active workspace
- The `default` workspace always exists and always appears first

```
  default       <-- always present
  dev           <-- two-space indent
* staging       <-- asterisk marks current
  prod
```

This format matters when you are parsing the output in scripts.

## Listing with Different Backends

The `workspace list` command works the same regardless of your backend, but the underlying mechanism differs.

### Local Backend

Terraform looks at the `terraform.tfstate.d` directory to find workspace names:

```bash
# These directories correspond to workspaces
ls terraform.tfstate.d/
# dev/  staging/  prod/

terraform workspace list
#   default
#   dev
#   staging
#   prod
```

### S3 Backend

Terraform queries the S3 bucket for state files with the `env:` prefix:

```bash
# The backend has these keys:
# s3://bucket/app/terraform.tfstate              (default)
# s3://bucket/env:/dev/app/terraform.tfstate      (dev)
# s3://bucket/env:/staging/app/terraform.tfstate  (staging)
# s3://bucket/env:/prod/app/terraform.tfstate     (prod)

terraform workspace list
#   default
#   dev
# * staging
#   prod
```

### Consul Backend

With Consul, workspaces are discovered from keys stored under the configured path prefix.

### Terraform Cloud

With Terraform Cloud backend, the command lists remote workspaces associated with your configuration.

## Parsing the Output in Scripts

For automation, you often need to extract workspace names from the list output. Here are several approaches:

### Get All Workspace Names

```bash
# Strip whitespace and the asterisk to get clean names
terraform workspace list | sed 's/^[ *]*//'
```

Output:

```
default
dev
staging
prod
```

### Get the Current Workspace

While `terraform workspace show` is the direct way, you can also extract it from the list:

```bash
# Get only the active workspace from the list
terraform workspace list | grep '^\*' | sed 's/^\* //'
```

### Get All Workspaces Except Default

```bash
# List non-default workspaces
terraform workspace list | sed 's/^[ *]*//' | grep -v '^default$'
```

### Count Workspaces

```bash
# Count total workspaces
terraform workspace list | wc -l | tr -d ' '
```

## Practical Automation Patterns

### Run a Plan Across All Workspaces

```bash
#!/bin/bash
# plan-all.sh - Run terraform plan in every workspace

# Get clean list of workspace names
WORKSPACES=$(terraform workspace list | sed 's/^[ *]*//')

# Save current workspace to return to it later
ORIGINAL=$(terraform workspace show)

for WS in $WORKSPACES; do
  echo "============================================"
  echo "Planning workspace: $WS"
  echo "============================================"

  terraform workspace select "$WS"

  # Use workspace-specific var file if it exists
  if [ -f "envs/${WS}.tfvars" ]; then
    terraform plan -var-file="envs/${WS}.tfvars" -no-color
  else
    terraform plan -no-color
  fi

  echo ""
done

# Return to original workspace
terraform workspace select "$ORIGINAL"
echo "Returned to workspace: $(terraform workspace show)"
```

### Generate a Status Report

```bash
#!/bin/bash
# workspace-status.sh - Report resource counts per workspace

echo "Workspace Status Report"
echo "======================="
echo ""

ORIGINAL=$(terraform workspace show)
WORKSPACES=$(terraform workspace list | sed 's/^[ *]*//')

for WS in $WORKSPACES; do
  terraform workspace select "$WS" > /dev/null 2>&1

  # Count resources in this workspace
  COUNT=$(terraform state list 2>/dev/null | wc -l | tr -d ' ')

  printf "%-20s %s resources\n" "$WS" "$COUNT"
done

# Return to original workspace
terraform workspace select "$ORIGINAL" > /dev/null 2>&1
```

Sample output:

```
Workspace Status Report
=======================

default              0 resources
dev                  8 resources
staging              12 resources
prod                 15 resources
```

### Check if a Workspace Exists

```bash
#!/bin/bash
# workspace-exists.sh - Check if a workspace exists

WORKSPACE_NAME=$1

if terraform workspace list | sed 's/^[ *]*//' | grep -qx "$WORKSPACE_NAME"; then
  echo "Workspace '$WORKSPACE_NAME' exists"
  exit 0
else
  echo "Workspace '$WORKSPACE_NAME' does not exist"
  exit 1
fi
```

Usage:

```bash
# Check before creating
if ! ./workspace-exists.sh feature-xyz; then
  terraform workspace new feature-xyz
fi
```

## Listing in CI/CD Pipelines

In continuous integration, listing workspaces helps with dynamic workflows:

```yaml
# GitHub Actions - Dynamic matrix from workspaces
jobs:
  discover:
    runs-on: ubuntu-latest
    outputs:
      workspaces: ${{ steps.list.outputs.workspaces }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Init
        run: terraform init -input=false

      - name: List Workspaces
        id: list
        run: |
          # Get workspaces as JSON array for matrix strategy
          WORKSPACES=$(terraform workspace list | sed 's/^[ *]*//' | grep -v '^default$' | jq -R -s -c 'split("\n") | map(select(length > 0))')
          echo "workspaces=$WORKSPACES" >> "$GITHUB_OUTPUT"

  plan:
    needs: discover
    runs-on: ubuntu-latest
    strategy:
      matrix:
        workspace: ${{ fromJson(needs.discover.outputs.workspaces) }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Init and Plan
        run: |
          terraform init -input=false
          terraform workspace select ${{ matrix.workspace }}
          terraform plan -var-file="envs/${{ matrix.workspace }}.tfvars"
```

## Using terraform workspace list with Terraform Cloud

When using Terraform Cloud as a backend, the `workspace list` command queries the remote API. This means:

- It requires network access to Terraform Cloud
- It only shows workspaces associated with your configuration's `cloud` block
- The list may include workspaces you do not have local configuration for

```hcl
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      tags = ["app:web"]
    }
  }
}
```

```bash
# Lists all workspaces tagged with "app:web" in your organization
terraform workspace list
```

## Sorting and Filtering

The output is typically alphabetically sorted (after "default"), but you can apply additional sorting:

```bash
# Sort workspaces alphabetically, excluding default
terraform workspace list | sed 's/^[ *]*//' | grep -v '^default$' | sort

# Filter to only workspaces matching a pattern
terraform workspace list | sed 's/^[ *]*//' | grep '^feature-'

# Show only production-like workspaces
terraform workspace list | sed 's/^[ *]*//' | grep -E '^(prod|production|prd)'
```

## Troubleshooting

**Empty list or only "default" shows up.** Make sure you have run `terraform init` and that your backend is accessible. Workspaces are stored in the backend, so if Terraform cannot reach it, it will only show `default`.

**Workspaces from a different configuration appear.** If multiple Terraform configurations share the same backend path, their workspaces can overlap. Use distinct key prefixes per configuration.

**Slow listing with many workspaces.** If you have hundreds of workspaces (common with feature-branch workflows), the list command may be slow with some backends. Consider cleaning up old workspaces regularly.

## Conclusion

The `terraform workspace list` command is a simple but essential tool for workspace management. Its consistent output format makes it easy to parse in scripts, enabling automation patterns like cross-workspace planning, status reporting, and dynamic CI/CD pipelines. Keep your workspace list clean by deleting workspaces you no longer need, and use the parsing patterns shown here to build robust automation. To clean up old workspaces, see our guide on [deleting workspaces](https://oneuptime.com/blog/post/2026-02-23-how-to-delete-a-workspace-with-terraform-workspace-delete/view).
