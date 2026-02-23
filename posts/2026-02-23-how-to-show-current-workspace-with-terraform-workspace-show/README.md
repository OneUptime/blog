# How to Show Current Workspace with terraform workspace show

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, CLI Commands, State Management, DevOps

Description: Learn how to use terraform workspace show to display the current active workspace, integrate it into scripts, build safety checks, and understand where Terraform stores the active workspace information.

---

The `terraform workspace show` command does one thing: it prints the name of the currently active workspace. It is the simplest command in the workspace family, but it is arguably one of the most important for building safe automation. Knowing which workspace you are in before running `terraform apply` can save you from accidentally modifying the wrong environment. This post covers the command, its uses in scripts, and practical patterns built around it.

## Basic Usage

```bash
# Show the current workspace
terraform workspace show
```

Output:

```
staging
```

That is the entire output - just the workspace name. No decoration, no extra whitespace, no prefix. This makes it trivial to use in scripts.

If you have never created any workspaces, it returns `default`:

```bash
terraform workspace show
# Output: default
```

## Where This Information Lives

Terraform tracks the current workspace in a file called `.terraform/environment`. You can read it directly, but using the command is preferred:

```bash
# The command reads from this file
cat .terraform/environment
# Output: staging

# These are equivalent
terraform workspace show
# Output: staging
```

If the `.terraform/environment` file does not exist, Terraform assumes you are in the `default` workspace. This file is created by `terraform init` or the first workspace command you run.

## Using workspace show in Shell Scripts

The clean, single-line output makes `terraform workspace show` perfect for variable capture:

```bash
#!/bin/bash
# capture-workspace.sh

# Capture the current workspace into a variable
CURRENT_WORKSPACE=$(terraform workspace show)

echo "Currently in workspace: $CURRENT_WORKSPACE"

# Use it in conditional logic
case "$CURRENT_WORKSPACE" in
  prod|production)
    echo "Running in PRODUCTION - extra caution required"
    EXTRA_FLAGS="-lock-timeout=60s"
    ;;
  staging)
    echo "Running in STAGING"
    EXTRA_FLAGS=""
    ;;
  *)
    echo "Running in development workspace: $CURRENT_WORKSPACE"
    EXTRA_FLAGS="-parallelism=20"
    ;;
esac

terraform plan $EXTRA_FLAGS -var-file="envs/${CURRENT_WORKSPACE}.tfvars"
```

## Safety Checks Before Apply

The most valuable use of `workspace show` is preventing accidental production deployments:

```bash
#!/bin/bash
# safe-apply.sh - Apply with workspace verification

EXPECTED_WORKSPACE=$1
CURRENT_WORKSPACE=$(terraform workspace show)

# Verify we are in the expected workspace
if [ "$CURRENT_WORKSPACE" != "$EXPECTED_WORKSPACE" ]; then
  echo "ERROR: Expected workspace '$EXPECTED_WORKSPACE' but currently in '$CURRENT_WORKSPACE'"
  echo "Run: terraform workspace select $EXPECTED_WORKSPACE"
  exit 1
fi

echo "Confirmed workspace: $CURRENT_WORKSPACE"

# Additional safety for production
if [ "$CURRENT_WORKSPACE" = "prod" ]; then
  echo ""
  echo "=== PRODUCTION DEPLOYMENT ==="
  echo "This will modify production infrastructure."
  read -p "Type 'yes' to continue: " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 1
  fi
fi

terraform apply -var-file="envs/${CURRENT_WORKSPACE}.tfvars"
```

## Integration with Makefiles

```makefile
# Makefile with workspace awareness

.PHONY: show plan apply guard-prod

# Show current workspace
show:
	@terraform workspace show

# Guard against accidental production operations
guard-prod:
	@if [ "$$(terraform workspace show)" = "prod" ]; then \
		echo "WARNING: You are in the PRODUCTION workspace!"; \
		read -p "Continue? (yes/no): " confirm; \
		if [ "$$confirm" != "yes" ]; then \
			echo "Aborted."; \
			exit 1; \
		fi \
	fi

# Plan with automatic var-file selection
plan:
	$(eval WORKSPACE := $(shell terraform workspace show))
	terraform plan -var-file="envs/$(WORKSPACE).tfvars" -out=tfplan

# Apply with production guard
apply: guard-prod
	terraform apply tfplan
```

## Shell Prompt Integration

Display the current workspace in your terminal prompt so you always know where you are:

```bash
# Add to your ~/.bashrc or ~/.zshrc

# Function to get Terraform workspace
tf_workspace() {
  if [ -f ".terraform/environment" ]; then
    cat .terraform/environment
  elif [ -d ".terraform" ]; then
    echo "default"
  fi
}

# Bash prompt
export PS1='\u@\h:\w $(tf_workspace && echo "[tf:$(tf_workspace)]") \$ '

# Or for zsh (add to ~/.zshrc)
# precmd() {
#   if [ -d ".terraform" ]; then
#     TF_WS=$(tf_workspace)
#     RPROMPT="[tf:${TF_WS}]"
#   fi
# }
```

With this configuration, your prompt looks like:

```
user@host:~/project [tf:staging] $
```

Reading the `.terraform/environment` file directly is faster than running `terraform workspace show` and is fine for prompt integration where speed matters.

## Using workspace show in CI/CD

Log the workspace in your pipeline for audit trails:

```yaml
# GitHub Actions
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Init
        run: terraform init -input=false

      - name: Select Workspace
        run: terraform workspace select -or-create ${{ github.event.inputs.environment }}

      - name: Verify Workspace
        run: |
          WORKSPACE=$(terraform workspace show)
          echo "Active workspace: $WORKSPACE"

          # Fail if workspace does not match expected
          if [ "$WORKSPACE" != "${{ github.event.inputs.environment }}" ]; then
            echo "::error::Workspace mismatch! Expected ${{ github.event.inputs.environment }}, got $WORKSPACE"
            exit 1
          fi

      - name: Plan
        run: terraform plan -var-file="envs/$(terraform workspace show).tfvars" -out=tfplan

      - name: Apply
        run: terraform apply -auto-approve tfplan
```

## Workspace Show in Terraform Code

Inside your Terraform configuration, you do not use the CLI command. Instead, use the `terraform.workspace` expression:

```hcl
# This is the in-code equivalent of "terraform workspace show"
output "current_workspace" {
  value = terraform.workspace
}

# Use it for resource naming
resource "aws_s3_bucket" "logs" {
  bucket = "app-logs-${terraform.workspace}"
}

# Use it for conditional logic
locals {
  is_production = terraform.workspace == "prod"
}

resource "aws_instance" "web" {
  instance_type = local.is_production ? "t3.large" : "t3.micro"

  tags = {
    Environment = terraform.workspace
  }
}
```

## Comparing workspace show with workspace list

Both commands tell you about workspaces, but they serve different purposes:

```bash
# workspace show - returns just the current workspace name
terraform workspace show
# Output: staging

# workspace list - returns all workspaces with the current one marked
terraform workspace list
#   default
#   dev
# * staging
#   prod
```

Use `workspace show` when you need the current workspace name programmatically. Use `workspace list` when you need to discover what workspaces exist.

## Handling the Default Workspace

When no workspace has been explicitly selected, `terraform workspace show` returns "default":

```bash
# Fresh Terraform init - no workspace selected
terraform init
terraform workspace show
# Output: default
```

Your scripts should handle this case:

```bash
#!/bin/bash
# workspace-guard.sh - Prevent operations in default workspace

WORKSPACE=$(terraform workspace show)

if [ "$WORKSPACE" = "default" ]; then
  echo "ERROR: Running in the default workspace is not allowed."
  echo "Select a specific workspace: terraform workspace select <name>"
  exit 1
fi

echo "Workspace: $WORKSPACE - proceeding."
```

## Multi-Directory Workspace Tracking

If your project has multiple Terraform configurations in different directories, track them all:

```bash
#!/bin/bash
# show-all-workspaces.sh - Show current workspace for each Terraform directory

TERRAFORM_DIRS=$(find . -name "*.tf" -exec dirname {} \; | sort -u)

echo "Terraform Workspace Status:"
echo "==========================="

for DIR in $TERRAFORM_DIRS; do
  if [ -d "$DIR/.terraform" ]; then
    WS=$(cd "$DIR" && terraform workspace show 2>/dev/null)
    printf "%-40s %s\n" "$DIR" "$WS"
  else
    printf "%-40s %s\n" "$DIR" "(not initialized)"
  fi
done
```

Output:

```
Terraform Workspace Status:
===========================
./infra/networking                       prod
./infra/compute                          staging
./infra/database                         prod
./modules/shared                         (not initialized)
```

## Troubleshooting

**"Backend initialization required"** - You need to run `terraform init` before workspace commands work. The `.terraform` directory must exist.

**Shows "default" when you expected something else** - Check if the `.terraform/environment` file exists. If Terraform was recently initialized or the directory was recreated, the workspace resets to default.

**Different workspace than expected in CI** - Make sure your CI pipeline explicitly selects the workspace. Do not assume it persists between pipeline runs since CI environments are typically ephemeral.

## Conclusion

The `terraform workspace show` command is small but foundational. It powers safety checks, script automation, prompt customization, and audit logging. Get in the habit of checking your workspace before every apply, whether through a manual glance or an automated guard. The few seconds it takes to verify can prevent hours of incident response. For building workspace names into your resource configurations, see our guide on [using terraform.workspace in configurations](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-workspace-in-configurations/view).
