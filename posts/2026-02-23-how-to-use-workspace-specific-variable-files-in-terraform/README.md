# How to Use Workspace-Specific Variable Files in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, Variables, Configuration Management, Infrastructure as Code

Description: Learn how to pair Terraform workspaces with environment-specific variable files using tfvars, automatic variable loading, and wrapper scripts for clean workspace management.

---

Workspaces give you separate state, but they do not automatically give you separate configuration values. If your dev environment needs `t3.micro` instances and production needs `t3.large`, you need a way to feed different variable values into each workspace. The most practical approach is workspace-specific variable files. This post covers the patterns, from simple to sophisticated.

## The Problem

When you switch workspaces, Terraform changes which state file it uses. But it does not change which variables get loaded. If you just run `terraform plan`, the same variable values apply regardless of whether you are in dev or prod.

```bash
# These two commands use the exact same variable values
terraform workspace select dev
terraform plan
# Same variables as...

terraform workspace select prod
terraform plan
```

You need a strategy to load different values per workspace.

## Strategy 1: Manual -var-file Flag

The simplest approach is passing a variable file explicitly:

```text
project/
  main.tf
  variables.tf
  envs/
    dev.tfvars
    staging.tfvars
    prod.tfvars
```

```hcl
# variables.tf
variable "instance_type" {
  type        = string
  description = "EC2 instance type"
}

variable "instance_count" {
  type        = number
  description = "Number of instances to create"
}

variable "enable_monitoring" {
  type        = bool
  description = "Whether to enable detailed monitoring"
  default     = false
}

variable "db_instance_class" {
  type        = string
  description = "RDS instance class"
}
```

```hcl
# envs/dev.tfvars
instance_type     = "t3.micro"
instance_count    = 1
enable_monitoring = false
db_instance_class = "db.t3.micro"
```

```hcl
# envs/staging.tfvars
instance_type     = "t3.small"
instance_count    = 2
enable_monitoring = true
db_instance_class = "db.t3.small"
```

```hcl
# envs/prod.tfvars
instance_type     = "t3.large"
instance_count    = 3
enable_monitoring = true
db_instance_class = "db.r6g.large"
```

Use them with:

```bash
terraform workspace select dev
terraform plan -var-file=envs/dev.tfvars

terraform workspace select prod
terraform plan -var-file=envs/prod.tfvars
```

This works but relies on the user passing the right file for the right workspace. A mismatch (running prod vars in the dev workspace) causes confusion.

## Strategy 2: Automatic Loading with .auto.tfvars

Terraform automatically loads files ending in `.auto.tfvars`. You can combine this with a symlink or copy strategy:

```bash
#!/bin/bash
# switch-env.sh - Switch workspace and load matching variables

ENV=$1

terraform workspace select "$ENV"

# Create a symlink to the matching var file
ln -sf "envs/${ENV}.tfvars" current.auto.tfvars

echo "Switched to $ENV, loaded envs/${ENV}.tfvars"
```

Now `terraform plan` automatically picks up `current.auto.tfvars` without needing `-var-file`.

However, symlinks can be fragile. A better approach is to use a wrapper.

## Strategy 3: Wrapper Script

Build a wrapper that always pairs the workspace with its variable file:

```bash
#!/bin/bash
# tf.sh - Terraform wrapper that enforces workspace-variable pairing

set -euo pipefail

COMMAND=$1
shift

# Get current workspace
WORKSPACE=$(terraform workspace show)

# Determine the var file
VAR_FILE="envs/${WORKSPACE}.tfvars"

if [ ! -f "$VAR_FILE" ]; then
  echo "WARNING: No variable file found for workspace '$WORKSPACE'"
  echo "Expected: $VAR_FILE"
  echo "Proceeding without workspace-specific variables."
  terraform "$COMMAND" "$@"
else
  echo "Using variables from: $VAR_FILE"
  terraform "$COMMAND" -var-file="$VAR_FILE" "$@"
fi
```

Usage:

```bash
terraform workspace select staging
./tf.sh plan                    # Automatically uses envs/staging.tfvars
./tf.sh apply                   # Automatically uses envs/staging.tfvars
./tf.sh plan -target=aws_instance.web  # Extra flags still work
```

## Strategy 4: Makefile Integration

```makefile
# Makefile

WORKSPACE := $(shell terraform workspace show)
VAR_FILE := envs/$(WORKSPACE).tfvars

.PHONY: plan apply destroy

# Check that the var file exists
check-vars:
	@if [ ! -f "$(VAR_FILE)" ]; then \
		echo "Error: $(VAR_FILE) does not exist for workspace '$(WORKSPACE)'"; \
		exit 1; \
	fi
	@echo "Workspace: $(WORKSPACE)"
	@echo "Variables: $(VAR_FILE)"

plan: check-vars
	terraform plan -var-file=$(VAR_FILE) -out=tfplan

apply: check-vars
	terraform apply tfplan

destroy: check-vars
	terraform destroy -var-file=$(VAR_FILE)

# Switch workspace and plan in one step
env-%:
	terraform workspace select $*
	$(MAKE) plan
```

Usage:

```bash
make env-staging    # Switch to staging and plan
make apply          # Apply the plan
make env-prod       # Switch to prod and plan
```

## Strategy 5: In-Code Variable Maps

Instead of external files, define all environment configurations in Terraform code:

```hcl
# config.tf

locals {
  # All environment configurations in one place
  environments = {
    dev = {
      instance_type     = "t3.micro"
      instance_count    = 1
      enable_monitoring = false
      db_instance_class = "db.t3.micro"
      enable_backups    = false
      domain_prefix     = "dev"
    }
    staging = {
      instance_type     = "t3.small"
      instance_count    = 2
      enable_monitoring = true
      db_instance_class = "db.t3.small"
      enable_backups    = true
      domain_prefix     = "staging"
    }
    prod = {
      instance_type     = "t3.large"
      instance_count    = 3
      enable_monitoring = true
      db_instance_class = "db.r6g.large"
      enable_backups    = true
      domain_prefix     = "www"
    }
  }

  # Get config for current workspace, default to dev
  env = lookup(local.environments, terraform.workspace, local.environments["dev"])
}
```

```hcl
# main.tf

resource "aws_instance" "web" {
  count         = local.env.instance_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.env.instance_type

  monitoring = local.env.enable_monitoring

  tags = {
    Name        = "web-${terraform.workspace}-${count.index}"
    Environment = terraform.workspace
  }
}

resource "aws_db_instance" "main" {
  identifier          = "db-${terraform.workspace}"
  instance_class      = local.env.db_instance_class
  engine              = "postgres"
  backup_retention_period = local.env.enable_backups ? 7 : 0
}
```

The advantage: no external files to manage. The disadvantage: adding a new environment requires changing the code, and sensitive values cannot go here.

## Strategy 6: Hybrid Approach

Combine in-code defaults with external overrides:

```hcl
# variables.tf

variable "instance_type" {
  type    = string
  default = "" # Empty means use the workspace default
}

# config.tf

locals {
  defaults = {
    dev     = { instance_type = "t3.micro" }
    staging = { instance_type = "t3.small" }
    prod    = { instance_type = "t3.large" }
  }

  workspace_defaults = lookup(local.defaults, terraform.workspace, local.defaults["dev"])

  # Use the variable if set, otherwise fall back to workspace default
  instance_type = var.instance_type != "" ? var.instance_type : local.workspace_defaults.instance_type
}
```

This lets you override any default through a var file while keeping sensible workspace-based defaults.

## Organizing Variable Files

### Flat Structure

Good for small projects with few environments:

```text
envs/
  dev.tfvars
  staging.tfvars
  prod.tfvars
```

### Nested Structure

Better for projects with many variables:

```text
envs/
  dev/
    main.tfvars      # Core configuration
    secrets.tfvars   # Sensitive values (not committed)
  staging/
    main.tfvars
    secrets.tfvars
  prod/
    main.tfvars
    secrets.tfvars
```

Use with multiple `-var-file` flags:

```bash
WORKSPACE=$(terraform workspace show)
terraform plan \
  -var-file="envs/${WORKSPACE}/main.tfvars" \
  -var-file="envs/${WORKSPACE}/secrets.tfvars"
```

### Layered Variables

For values shared across environments:

```text
envs/
  common.tfvars    # Shared across all environments
  dev.tfvars       # Dev-specific overrides
  staging.tfvars
  prod.tfvars
```

```bash
WORKSPACE=$(terraform workspace show)
terraform plan \
  -var-file="envs/common.tfvars" \
  -var-file="envs/${WORKSPACE}.tfvars"
```

Later files override earlier ones, so workspace-specific values take precedence over common values.

## CI/CD Integration

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

      - name: Plan
        run: |
          WORKSPACE=$(terraform workspace show)
          terraform plan \
            -var-file="envs/${WORKSPACE}.tfvars" \
            -out=tfplan

      - name: Apply
        run: terraform apply -auto-approve tfplan
```

## Validating Variable Files

Make sure every workspace has a matching variable file:

```bash
#!/bin/bash
# validate-var-files.sh - Check that all workspaces have var files

WORKSPACES=$(terraform workspace list | sed 's/^[ *]*//' | grep -v '^default$')
MISSING=0

for WS in $WORKSPACES; do
  if [ ! -f "envs/${WS}.tfvars" ]; then
    echo "MISSING: envs/${WS}.tfvars"
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo ""
  echo "$MISSING workspace(s) are missing variable files!"
  exit 1
else
  echo "All workspaces have matching variable files."
fi
```

## Best Practices

**Keep sensitive values out of version control.** Use `.gitignore` for files containing secrets, or better yet, use a secrets manager and reference it via data sources.

**Validate var files against your variable definitions.** Terraform will error on undefined variables, but it will silently ignore extra variables. Periodically check that your var files match your variable declarations.

**Name var files after workspaces.** The convention of `envs/<workspace>.tfvars` makes automation straightforward and prevents mismatches.

**Document expected variables.** Include a `variables.tf` with descriptions and types so that anyone creating a new environment knows what values to provide.

## Conclusion

Workspace-specific variable files bridge the gap between shared code and environment-specific configuration. Whether you use external `.tfvars` files, in-code maps, or a hybrid approach depends on your team's preferences and the complexity of your environments. The key is consistency - pick a pattern and enforce it through wrapper scripts or CI/CD automation. For establishing naming standards across your workspaces, see our post on [workspace naming conventions](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-workspace-naming-conventions-in-terraform/view).
