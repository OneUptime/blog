# How to Handle .terraform.lock.hcl in Version Control

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Lock File, Version Control, Git, Infrastructure as Code, DevOps

Description: Learn the best practices for managing the .terraform.lock.hcl file in Git, including when to commit it, how to handle merge conflicts, and strategies for multi-platform teams.

---

The `.terraform.lock.hcl` file generates strong opinions. Some teams commit it. Others add it to `.gitignore`. The official HashiCorp recommendation is to commit it, and for good reason - it ensures reproducible provider installations across your team and CI/CD pipelines. But committing it introduces its own challenges: merge conflicts, platform-specific hash mismatches, and noisy pull request diffs.

This guide covers the practical aspects of managing `.terraform.lock.hcl` in version control, with solutions for the problems teams commonly encounter.

## Should You Commit the Lock File?

**Yes.** Commit `.terraform.lock.hcl` to version control. Here is why:

Without the lock file in version control:
- Each `terraform init` resolves the latest version matching your constraints. Today that might be 5.30.0, tomorrow 5.31.0.
- Different team members could run against different provider versions without realizing it.
- CI/CD pipelines may use different versions than your local machine.
- Debugging becomes harder when you cannot reproduce the exact environment.

With the lock file committed:
- Every `terraform init` installs the exact same version, everywhere.
- Provider upgrades are explicit and reviewable in pull requests.
- You get a clear audit trail of when provider versions changed.

## .gitignore Configuration

Your `.gitignore` should exclude the `.terraform` directory but include the lock file:

```gitignore
# .gitignore for Terraform projects

# Exclude the downloaded provider binaries and module cache
.terraform/

# Include the lock file (do NOT add this to .gitignore)
# .terraform.lock.hcl  <-- Do not uncomment this

# Exclude local state files (use remote backends instead)
*.tfstate
*.tfstate.backup

# Exclude plan output files
*.tfplan

# Exclude override files (used for local development)
override.tf
override.tf.json
*_override.tf
*_override.tf.json

# Exclude sensitive variable files
*.auto.tfvars
terraform.tfvars

# Exclude crash logs
crash.log
crash.*.log
```

## Initial Setup

When setting up a new project, generate the lock file with multi-platform support from the start:

```bash
# Initialize the project
terraform init

# Generate hashes for all platforms your team uses
terraform providers lock \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64 \
  -platform=windows_amd64

# Commit the lock file
git add .terraform.lock.hcl
git commit -m "Add Terraform provider lock file with multi-platform hashes"
```

If you forget to generate multi-platform hashes, team members on different operating systems will see hash verification failures when they run `terraform init`.

## Handling Merge Conflicts

Lock file merge conflicts are the biggest pain point. They happen when two branches update provider versions independently.

### Strategy 1: Regenerate After Merge

The simplest approach - do not try to manually resolve the conflict:

```bash
# Accept either side of the conflict (does not matter which)
git checkout --theirs .terraform.lock.hcl
# Or: git checkout --ours .terraform.lock.hcl

# Regenerate the lock file
terraform init -upgrade

# Regenerate multi-platform hashes
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64

# Mark as resolved and continue
git add .terraform.lock.hcl
git merge --continue
```

### Strategy 2: Pre-merge Coordination

For teams that update providers frequently, coordinate upgrades:

```bash
# One person handles provider updates
# Create a dedicated branch for provider updates
git checkout -b update-providers-weekly

# Update all providers
terraform init -upgrade
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64

# Review changes
git diff .terraform.lock.hcl

# Commit and create a PR
git add .terraform.lock.hcl
git commit -m "Weekly provider version update"
git push -u origin update-providers-weekly
```

### Strategy 3: Git Merge Driver

Set up a custom merge driver that always takes the latest version:

```bash
# .gitattributes
.terraform.lock.hcl merge=terraform-lock
```

```bash
# Configure the merge driver
git config merge.terraform-lock.name "Terraform lock file merge driver"
git config merge.terraform-lock.driver "cp %B %A && terraform providers lock -platform=linux_amd64 -platform=darwin_arm64"
```

This automatically regenerates the lock file during merges. Note that this requires Terraform to be installed on the machine performing the merge.

## Pull Request Workflow

Lock file changes in pull requests can be noisy. Here is how to handle them:

```yaml
# .github/workflows/terraform-lock-check.yml
name: Terraform Lock File Check

on:
  pull_request:
    paths:
      - '.terraform.lock.hcl'
      - '**/*.tf'

jobs:
  verify-lock:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Verify Lock File
        run: |
          terraform init

          # Check if lock file needs updating
          terraform providers lock \
            -platform=linux_amd64 \
            -platform=darwin_arm64

          # Fail if lock file changed (means it was out of date)
          if ! git diff --exit-code .terraform.lock.hcl; then
            echo "ERROR: Lock file is out of date."
            echo "Run 'terraform providers lock -platform=linux_amd64 -platform=darwin_arm64' and commit the result."
            exit 1
          fi
```

## Code Review Tips

When reviewing lock file changes in a pull request:

```bash
# Quickly see which providers changed
git diff main -- .terraform.lock.hcl | grep -E "version\s+="

# Example output:
# -  version     = "5.30.0"
# +  version     = "5.31.0"

# Check if the version bump is intentional
# Look at the provider changelog for breaking changes
```

Add a comment template for lock file PRs:

```markdown
## Provider Update Checklist
- [ ] Reviewed provider changelog for breaking changes
- [ ] Tested with `terraform plan` in dev
- [ ] Lock file includes hashes for all platforms (linux_amd64, darwin_arm64)
- [ ] No unintended provider version changes
```

## Mono-Repo Considerations

In mono-repos with multiple Terraform root modules, each root module has its own lock file:

```text
infrastructure/
  networking/
    .terraform.lock.hcl    # Lock file for networking
    main.tf
    versions.tf
  database/
    .terraform.lock.hcl    # Lock file for database
    main.tf
    versions.tf
  compute/
    .terraform.lock.hcl    # Lock file for compute
    main.tf
    versions.tf
```

Keep them in sync by updating all lock files at once:

```bash
#!/bin/bash
# update-all-locks.sh - Update lock files for all root modules

set -euo pipefail

ROOT_MODULES=$(find . -name "versions.tf" -exec dirname {} \;)

for module in $ROOT_MODULES; do
  echo "Updating lock file for: $module"
  cd "$module"
  terraform init -upgrade
  terraform providers lock \
    -platform=linux_amd64 \
    -platform=darwin_arm64
  cd -
done

echo "All lock files updated"
```

## Troubleshooting Common Issues

### Hash mismatch on CI/CD

```text
Error: Failed to install provider
  The checksums for provider [...] don't match any of the checksums
  recorded in the dependency lock file.
```

Your lock file is missing hashes for the CI/CD platform (usually `linux_amd64`):

```bash
# Add the missing platform hashes
terraform providers lock -platform=linux_amd64
git add .terraform.lock.hcl
git commit -m "Add linux_amd64 hashes to lock file"
```

### Lock file keeps changing

If the lock file changes on every `terraform init` without deliberate upgrades, you may have unconstrained provider versions:

```hcl
# Bad - no version constraint, picks latest every time
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

# Good - constrained version
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}
```

### Lock file not created

Terraform only creates a lock file after `terraform init`. If the file is missing, run init:

```bash
terraform init
```

If you are starting from scratch and the lock file was in `.gitignore` previously, remove it from `.gitignore` and regenerate:

```bash
terraform init -upgrade
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64
git add .terraform.lock.hcl
```

## Migration: Adding Lock File to an Existing Project

If your project has been running without a committed lock file:

```bash
# Step 1: Remove from .gitignore if it was listed there
# Edit .gitignore and remove the .terraform.lock.hcl line

# Step 2: Generate the lock file with multi-platform hashes
terraform init
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64

# Step 3: Commit
git add .gitignore .terraform.lock.hcl
git commit -m "Start committing Terraform lock file for reproducible builds"

# Step 4: Notify the team
# Everyone needs to run 'terraform init' after pulling this change
```

## Best Practices

1. **Always commit `.terraform.lock.hcl` to version control.** It is the only way to guarantee reproducible provider installations.
2. **Generate multi-platform hashes** at project setup. Include at least `linux_amd64` and your development platform.
3. **Resolve merge conflicts by regenerating**, not by manual editing.
4. **Verify lock file in CI/CD** to catch outdated or missing platform hashes.
5. **Coordinate provider updates** to minimize merge conflicts. Designate one person or pipeline for regular updates.
6. **Review lock file changes** as part of your pull request process. Unintentional version bumps can break things.
7. **Never add `.terraform.lock.hcl` to `.gitignore`** unless you have a very specific reason and understand the trade-offs.

The `.terraform.lock.hcl` file is a small investment in version control discipline that pays off in reproducibility and peace of mind. Every "it works on my machine but not in CI" issue it prevents is worth the occasional merge conflict.
