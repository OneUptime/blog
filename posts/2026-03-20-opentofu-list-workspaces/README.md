# How to List All Workspaces in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Workspaces

Description: Learn how to list all available workspaces in OpenTofu and understand which workspace is currently active.

## Introduction

The `tofu workspace list` command shows all workspaces available in the current configuration directory. The currently active workspace is marked with an asterisk (`*`). This command is useful for understanding how many environments exist and confirming which one you are operating in before running plan or apply.

## Basic Usage

```bash
tofu workspace list

# Output:

#   default
# * staging
#   production
```

The asterisk indicates the currently selected workspace. Here, `staging` is active.

## Listing After Creating Multiple Workspaces

```bash
tofu workspace new development
tofu workspace new staging
tofu workspace new production

tofu workspace list
#   default
#   development
# * production
#   staging
```

Workspaces are listed alphabetically, not in creation order. Note that `tofu workspace new` both creates and switches to the new workspace, so `production` (the last one created) is the active workspace here.

## Using in Scripts

Parse the active workspace in shell scripts:

```bash
# Get the current workspace name
CURRENT=$(tofu workspace list | grep '^\*' | awk '{print $2}')
echo "Current workspace: $CURRENT"
```

```bash
# List all workspaces (excluding the asterisk)
WORKSPACES=$(tofu workspace list | sed 's/^\*//' | tr -d ' ')
for WS in $WORKSPACES; do
  echo "Processing workspace: $WS"
done
```

## Checking Workspace Existence

```bash
# Check if a workspace exists before switching
if tofu workspace list | grep -q "^[* ]*production$"; then
  echo "Production workspace exists"
  tofu workspace select production
else
  echo "Creating production workspace"
  tofu workspace new production
fi
```

## JSON Output

For machine-readable output, check all workspaces programmatically:

```bash
# Show workspaces with selection state via JSON output
tofu workspace list -json 2>/dev/null || tofu workspace list
```

Note: As of current versions, `tofu workspace list` does not support `-json`. Use the text output with `grep` and `awk` for scripting.

## Workspace List with Remote Backends

With remote backends like S3, the workspace list reflects what exists in the backend:

```bash
# Switch to a directory with S3 backend configured
cd /path/to/terraform/config
tofu init
tofu workspace list
# Shows workspaces stored in S3
```

## Understanding the Default Workspace

```bash
tofu workspace list
# * default
```

The `default` workspace always exists and cannot be deleted. It is the workspace used when no `tofu workspace select` has been run.

## Conclusion

Use `tofu workspace list` to audit available environments before making changes. The asterisk marks the active workspace, preventing accidental operations on the wrong environment. In CI/CD scripts, parse the output to dynamically select or create workspaces based on the target environment.
