# How to Use Terraform with Incremental Applies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Incremental Apply, Performance, Workflow, DevOps

Description: Implement incremental apply strategies in Terraform to deploy changes faster by targeting only modified resources and modules.

---

Terraform's default behavior is to evaluate your entire configuration on every plan and apply. For small projects, this is fine. For large projects with hundreds of resources, this means every change - no matter how small - requires Terraform to process everything. An incremental apply strategy lets you focus on just the parts that changed, dramatically reducing feedback time.

This post covers several approaches to incremental applies in Terraform, from simple targeting to sophisticated change detection.

## What Incremental Apply Means

In traditional Terraform workflow, every apply processes all resources:

```text
1. Read entire state (2,000 resources)
2. Refresh entire state (2,000 API calls)
3. Compute plan for everything
4. Apply changes
```

An incremental approach limits this to just the affected resources:

```text
1. Read relevant state (50 resources)
2. Refresh relevant state (50 API calls)
3. Compute plan for affected resources
4. Apply changes
```

Terraform does not have a built-in "incremental mode," but you can achieve incremental behavior through project splitting, targeting, and change detection.

## Approach 1: Split Projects (True Incremental)

The cleanest approach is to split your infrastructure so each project is small enough that a full plan is fast:

```text
infrastructure/
  networking/      # 80 resources, 30-second plan
  compute/         # 120 resources, 60-second plan
  database/        # 40 resources, 20-second plan
  monitoring/      # 60 resources, 25-second plan
```

When you change something in the compute project, you only plan and apply compute. The other projects are untouched. This is truly incremental because each project's plan time is proportional to its own size, not the total infrastructure size.

## Approach 2: Targeted Applies

For projects that have not been split yet, use `-target` to limit the scope:

```bash
# Only apply changes to a specific module
terraform apply -target=module.api_gateway

# Apply changes to specific resources
terraform apply -target=aws_lambda_function.handler -target=aws_lambda_permission.api

# Apply an entire resource group
terraform apply -target=module.services
```

### Automated Target Detection

Detect which resources need updating based on changed files:

```bash
#!/bin/bash
# incremental-apply.sh
# Detect changed Terraform files and target relevant resources

# Get changed .tf files compared to main branch
CHANGED_FILES=$(git diff --name-only origin/main -- '*.tf')

if [ -z "$CHANGED_FILES" ]; then
  echo "No Terraform changes detected."
  exit 0
fi

echo "Changed files:"
echo "$CHANGED_FILES"
echo ""

# Build target flags from changed files
TARGETS=""
for file in $CHANGED_FILES; do
  # Extract resource and module blocks from changed files
  while IFS= read -r line; do
    if echo "$line" | grep -qE '^resource '; then
      resource=$(echo "$line" | sed 's/resource "\([^"]*\)" "\([^"]*\)".*/\1.\2/')
      TARGETS="$TARGETS -target=$resource"
    elif echo "$line" | grep -qE '^module '; then
      module=$(echo "$line" | sed 's/module "\([^"]*\)".*/module.\1/')
      TARGETS="$TARGETS -target=$module"
    fi
  done < "$file"
done

if [ -n "$TARGETS" ]; then
  echo "Detected targets:$TARGETS"
  echo ""
  terraform plan $TARGETS
else
  echo "Could not detect specific targets. Running full plan."
  terraform plan
fi
```

This is a heuristic and will not catch all cases (like variable changes that affect multiple resources), but it covers the common case of adding or modifying specific resources.

## Approach 3: Terragrunt run-all with Dependencies

Terragrunt manages multiple Terraform projects and respects dependencies between them:

```hcl
# networking/terragrunt.hcl
terraform {
  source = "../modules/networking"
}

inputs = {
  vpc_cidr = "10.0.0.0/16"
}
```

```hcl
# compute/terragrunt.hcl
terraform {
  source = "../modules/compute"
}

dependency "networking" {
  config_path = "../networking"
}

inputs = {
  vpc_id     = dependency.networking.outputs.vpc_id
  subnet_ids = dependency.networking.outputs.subnet_ids
}
```

```bash
# Only apply projects that have changes
terragrunt run-all apply --terragrunt-include-dir compute/
```

Terragrunt automatically applies dependencies first if needed, giving you incremental behavior with dependency safety.

## Approach 4: Plan Files for Staged Applies

Generate a plan file, review it, then apply only what you want:

```bash
# Generate full plan
terraform plan -out=full.tfplan

# View the plan
terraform show full.tfplan

# If the plan is too large, generate targeted plans instead
terraform plan -target=module.api -out=api.tfplan
terraform plan -target=module.database -out=db.tfplan

# Apply them sequentially
terraform apply api.tfplan
terraform apply db.tfplan
```

This lets you break a large change into stages, applying incrementally.

## Approach 5: Feature-Flag-Based Incremental Changes

Use Terraform variables as feature flags to control which resources are created:

```hcl
variable "enable_new_service" {
  default = false
}

module "new_service" {
  count  = var.enable_new_service ? 1 : 0
  source = "./modules/new-service"
}
```

When you are ready to deploy the new service, flip the flag:

```bash
# Only the new service is created, everything else is unchanged
terraform apply -var="enable_new_service=true"
```

This is an incremental approach because only the new resources are created. Existing resources see no changes.

## Building an Incremental CI/CD Pipeline

Combine change detection with project splitting for a fully incremental CI/CD pipeline:

```yaml
# .github/workflows/terraform.yml
name: Terraform Incremental

on:
  pull_request:
    paths:
      - 'infrastructure/**'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      changed_projects: ${{ steps.changes.outputs.projects }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - id: changes
        run: |
          # Find which projects have changes
          changed=$(git diff --name-only origin/main -- 'infrastructure/' | \
            cut -d'/' -f2 | sort -u | jq -R -s -c 'split("\n")[:-1]')
          echo "projects=$changed" >> $GITHUB_OUTPUT
          echo "Changed projects: $changed"

  plan:
    needs: detect-changes
    if: needs.detect-changes.outputs.changed_projects != '[]'
    strategy:
      matrix:
        project: ${{ fromJson(needs.detect-changes.outputs.changed_projects) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        working-directory: infrastructure/${{ matrix.project }}
        run: terraform init

      - name: Terraform Plan
        working-directory: infrastructure/${{ matrix.project }}
        run: terraform plan -no-color
```

This pipeline only runs Terraform for projects with changes. If you change a file in `infrastructure/compute/`, only the compute project is planned.

## Handling Dependencies in Incremental Applies

When resources depend on each other across projects, you need to handle ordering:

```bash
#!/bin/bash
# incremental-apply-with-deps.sh

# Define dependency order
declare -A DEPS
DEPS[networking]=""
DEPS[security]="networking"
DEPS[database]="networking security"
DEPS[compute]="networking security database"

# Get list of changed projects
CHANGED=$(detect_changed_projects)  # Your detection logic

# Build ordered list including dependencies
APPLY_ORDER=()
for project in $CHANGED; do
  # Add dependencies first
  for dep in ${DEPS[$project]}; do
    if [[ ! " ${APPLY_ORDER[@]} " =~ " $dep " ]]; then
      APPLY_ORDER+=("$dep")
    fi
  done
  # Add the project itself
  if [[ ! " ${APPLY_ORDER[@]} " =~ " $project " ]]; then
    APPLY_ORDER+=("$project")
  fi
done

echo "Apply order: ${APPLY_ORDER[*]}"

# Apply in order
for project in "${APPLY_ORDER[@]}"; do
  echo "Applying $project..."
  cd "infrastructure/$project"
  terraform init -input=false > /dev/null 2>&1
  terraform apply -auto-approve
  cd -
done
```

## Safety Considerations

Incremental applies are faster but carry some risks:

### Drift Detection

If you only plan changed projects, you will not detect drift in unchanged projects. Run a full plan periodically:

```bash
# Weekly full plan across all projects
*/0 9 * * 1 /opt/scripts/full-plan-all-projects.sh
```

### Dependency Staleness

If you apply to the compute project but networking has changed since you last applied, the compute project might use stale data from the networking state. Always apply dependencies first.

### State Consistency

After multiple incremental applies, run a full plan to verify that everything is consistent:

```bash
# Monthly consistency check
for project in infrastructure/*/; do
  echo "Checking $(basename $project)..."
  cd "$project"
  terraform plan -detailed-exitcode > /dev/null 2>&1
  if [ $? -eq 2 ]; then
    echo "WARNING: $(basename $project) has pending changes!"
  else
    echo "OK: $(basename $project) is in sync"
  fi
  cd -
done
```

## Performance Comparison

| Approach | Time for Small Change | Time for Large Change |
|----------|----------------------|----------------------|
| Full plan (monolith) | 10 minutes | 10 minutes |
| Targeted apply | 30 seconds | Varies |
| Split projects | 1-2 minutes | 5-8 minutes |
| Incremental CI/CD | 1-2 minutes | 3-5 minutes |

The incremental approach shines for small changes, which are the majority of day-to-day operations.

## Summary

Incremental applies in Terraform require some tooling and discipline, but the payoff is substantial. Split your projects so each one is independently applicable, use change detection to plan only what is affected, and maintain dependency awareness for safety. The result is a Terraform workflow where small changes get fast feedback, which encourages the kind of small, frequent changes that make infrastructure management safer and more predictable.

For monitoring the infrastructure you deploy incrementally with Terraform, [OneUptime](https://oneuptime.com) provides real-time visibility and alerting that helps you verify each deployment is healthy.
