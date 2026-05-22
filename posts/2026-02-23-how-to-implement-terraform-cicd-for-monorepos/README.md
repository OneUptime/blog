# How to Implement Terraform CI/CD for Monorepos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Monorepo, GitHub Action, DevOps, Infrastructure as Code

Description: Learn how to set up efficient Terraform CI/CD pipelines for monorepos with change detection, parallel execution, dependency ordering, and selective plan and apply workflows.

---

Monorepos are increasingly popular for infrastructure code. Having all your Terraform configurations in one repository makes it easier to share modules, enforce standards, and review cross-cutting changes. But monorepos create a CI/CD challenge: you do not want to plan and apply every Terraform directory when only one file changes. This guide covers the patterns for building efficient Terraform pipelines in monorepos.

## Typical Monorepo Structure

```text
infrastructure/
  modules/
    vpc/
    ecs-cluster/
    rds/
    iam-role/
  environments/
    dev/
      networking/
        main.tf
        backend.tf
      compute/
        main.tf
        backend.tf
      database/
        main.tf
        backend.tf
    staging/
      networking/
      compute/
      database/
    production/
      networking/
      compute/
      database/
  global/
    iam/
    dns/
    monitoring/
```

Each directory under `environments/` has its own state file and can be planned and applied independently.

## Change Detection

The first step is figuring out which directories actually changed. There are several approaches:

### Path-Based Filtering with dorny/paths-filter

```yaml
# .github/workflows/terraform.yml

name: Terraform Monorepo

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      directories: ${{ steps.filter.outputs.changes }}

    steps:
      - uses: actions/checkout@v4

      - uses: dorny/paths-filter@v4
        id: filter
        with:
          filters: |
            dev-networking:
              - 'environments/dev/networking/**'
              - 'modules/vpc/**'
            dev-compute:
              - 'environments/dev/compute/**'
              - 'modules/ecs-cluster/**'
            dev-database:
              - 'environments/dev/database/**'
              - 'modules/rds/**'
            prod-networking:
              - 'environments/production/networking/**'
              - 'modules/vpc/**'
            prod-compute:
              - 'environments/production/compute/**'
              - 'modules/ecs-cluster/**'
            prod-database:
              - 'environments/production/database/**'
              - 'modules/rds/**'
```

### Git Diff Based Detection

For more dynamic detection that does not require listing every directory:

```bash
#!/bin/bash
# scripts/detect-changed-dirs.sh
# Find all Terraform directories that have changes

BASE_REF=${1:-"origin/main"}

# Get list of changed files
CHANGED_FILES=$(git diff --name-only $BASE_REF...HEAD)

# Find unique Terraform directories that contain changes
CHANGED_DIRS=$(echo "$CHANGED_FILES" | \
  grep -E '\.(tf|tfvars)$' | \
  xargs -I {} dirname {} | \
  sort -u)

# Also detect changes in shared modules
MODULE_CHANGES=$(echo "$CHANGED_FILES" | grep "^modules/" | \
  xargs -I {} dirname {} | sort -u)

# If a module changed, find all directories that reference it
if [ -n "$MODULE_CHANGES" ]; then
  for module_dir in $MODULE_CHANGES; do
    module_name=$(basename $module_dir)
    # Find all directories that use this module
    DEPENDENT_DIRS=$(grep -rl "source.*modules/$module_name" environments/ --include="*.tf" | \
      xargs -I {} dirname {} | sort -u)
    CHANGED_DIRS=$(printf "%s\n%s\n" "$CHANGED_DIRS" "$DEPENDENT_DIRS")
  done
fi

# Output unique directories
printf "%s\n" "$CHANGED_DIRS" | sort -u | grep -v '^$'
```

Use it in GitHub Actions:

```yaml
- name: Detect changed Terraform directories
  id: changes
  run: |
    DIRS=$(bash scripts/detect-changed-dirs.sh)
    # Convert to JSON array for matrix strategy
    JSON=$(echo "$DIRS" | jq -R -s 'split("\n") | map(select(length > 0))')
    echo "directories=$JSON" >> $GITHUB_OUTPUT
    echo "Found changed directories: $DIRS"
```

## Dynamic Matrix Strategy

Use the detected changes to dynamically create plan and apply jobs:

```yaml
# .github/workflows/terraform-monorepo.yml
name: Terraform Monorepo CI/CD

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  detect:
    runs-on: ubuntu-latest
    outputs:
      directories: ${{ steps.changes.outputs.directories }}
      has_changes: ${{ steps.changes.outputs.has_changes }}

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need full history for diff

      - name: Find changed directories
        id: changes
        run: |
          if [ "${{ github.event_name }}" = "pull_request" ]; then
            BASE="origin/${{ github.base_ref }}"
          else
            BASE="HEAD~1"
          fi

          DIRS=$(bash scripts/detect-changed-dirs.sh "$BASE")

          if [ -z "$DIRS" ]; then
            echo "has_changes=false" >> $GITHUB_OUTPUT
            echo "directories=[]" >> $GITHUB_OUTPUT
          else
            echo "has_changes=true" >> $GITHUB_OUTPUT
            JSON=$(echo "$DIRS" | jq -R -s 'split("\n") | map(select(length > 0))')
            echo "directories=$JSON" >> $GITHUB_OUTPUT
          fi

  plan:
    needs: detect
    if: needs.detect.outputs.has_changes == 'true'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        directory: ${{ fromJson(needs.detect.outputs.directories) }}
      fail-fast: false  # Plan all directories even if one fails

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v4
        with:
          terraform_version: 1.15.2
          terraform_wrapper: false

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Terraform Plan - ${{ matrix.directory }}
        env:
          TF_DIR: ${{ matrix.directory }}
        run: |
          cd "$TF_DIR"
          terraform init -no-color
          terraform plan -no-color -out=tfplan
          terraform show -no-color tfplan > plan-output.txt

      - name: Upload plan
        uses: actions/upload-artifact@v4
        with:
          name: plan-${{ strategy.job-index }}
          path: |
            ${{ matrix.directory }}/tfplan
            ${{ matrix.directory }}/plan-output.txt

  apply:
    needs: [detect, plan]
    if: github.event_name == 'push' && needs.detect.outputs.has_changes == 'true'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        directory: ${{ fromJson(needs.detect.outputs.directories) }}
      max-parallel: 1  # Apply one at a time for safety

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v4
        with:
          terraform_version: 1.15.2

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Terraform Apply - ${{ matrix.directory }}
        env:
          TF_DIR: ${{ matrix.directory }}
        run: |
          cd "$TF_DIR"
          terraform init -no-color
          terraform apply -no-color -auto-approve
```

## Dependency Ordering

Some Terraform directories depend on others. Networking must be applied before compute, for example. Handle this with explicit job dependencies:

```yaml
# Define execution order
jobs:
  apply-networking:
    needs: detect
    if: contains(fromJSON(needs.detect.outputs.directories), 'environments/production/networking')
    runs-on: ubuntu-latest
    steps:
      - run: cd environments/production/networking && terraform init && terraform apply -auto-approve

  apply-database:
    needs: [detect, apply-networking]  # Database depends on networking
    if: always() && needs.detect.result == 'success' && contains(fromJSON(needs.detect.outputs.directories), 'environments/production/database') && (needs.apply-networking.result == 'success' || needs.apply-networking.result == 'skipped')
    runs-on: ubuntu-latest
    steps:
      - run: cd environments/production/database && terraform init && terraform apply -auto-approve

  apply-compute:
    needs: [detect, apply-networking, apply-database]  # Compute depends on both
    if: always() && needs.detect.result == 'success' && contains(fromJSON(needs.detect.outputs.directories), 'environments/production/compute') && (needs.apply-networking.result == 'success' || needs.apply-networking.result == 'skipped') && (needs.apply-database.result == 'success' || needs.apply-database.result == 'skipped')
    runs-on: ubuntu-latest
    steps:
      - run: cd environments/production/compute && terraform init && terraform apply -auto-approve
```

Or define dependencies in a configuration file:

```json
{
  "environments/production/networking": {
    "dependencies": []
  },
  "environments/production/database": {
    "dependencies": ["environments/production/networking"]
  },
  "environments/production/compute": {
    "dependencies": [
      "environments/production/networking",
      "environments/production/database"
    ]
  }
}
```

## Module Change Impact Analysis

When a shared module changes, you need to plan every directory that uses it:

```bash
#!/bin/bash
# scripts/find-module-dependents.sh
# Find all Terraform directories that depend on a given module

MODULE_PATH=$1  # e.g., "modules/vpc"
MODULE_NAME=$(basename $MODULE_PATH)

echo "Finding dependents of module: $MODULE_NAME"

# Search for module source references
grep -rl "source.*$MODULE_NAME" environments/ --include="*.tf" | \
  xargs -I {} dirname {} | \
  sort -u
```

Integrate this into your change detection:

```yaml
- name: Expand module dependencies
  env:
    DIRECTORIES: ${{ steps.changes.outputs.directories }}
  run: |
    EXPANDED_DIRS=""

    while IFS= read -r dir; do
      EXPANDED_DIRS="$EXPANDED_DIRS $dir"

      # If this is a module directory, find all dependents
      if echo "$dir" | grep -q "^modules/"; then
        DEPENDENTS=$(bash scripts/find-module-dependents.sh "$dir")
        EXPANDED_DIRS="$EXPANDED_DIRS $DEPENDENTS"
      fi
    done < <(printf "%s" "$DIRECTORIES" | jq -r '.[]')

    echo "$EXPANDED_DIRS" | tr ' ' '\n' | sort -u
```

## PR Comments with Multi-Directory Plans

Post a consolidated plan summary for all affected directories:

````yaml
- name: Download plan artifacts
  uses: actions/download-artifact@v4
  with:
    pattern: plan-*
    path: plans
    merge-multiple: true

- name: Post consolidated plan
  uses: actions/github-script@v8
  with:
    script: |
      const fs = require('fs');
      const directories = ${{ needs.detect.outputs.directories }};
      let body = '## Terraform Plan Summary\n\n';

      for (const dir of directories) {
        const planFile = `plans/${dir}/plan-output.txt`;
        if (fs.existsSync(planFile)) {
          const plan = fs.readFileSync(planFile, 'utf8');
          body += `### ${dir}\n\n```\n${plan.substring(0, 10000)}\n```\n\n`;
        }
      }

      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        body: body
      });
````

## Summary

Terraform CI/CD in monorepos requires three things: accurate change detection, parallel execution for independent changes, and dependency ordering for related changes. Start with path-based filtering, expand to include module dependency analysis, and use dynamic matrix strategies to run only what needs to run. This keeps your pipeline fast while ensuring every change gets planned and applied correctly.

For more on managing multiple environments, see our guide on [handling Terraform CI/CD for multiple environments](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-cicd-for-multiple-environments/view).
