# How to Resolve Lock File Conflicts in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Lock File, Git Conflicts, Provider Versions, Merge Conflicts, Infrastructure as Code

Description: Learn how to resolve merge conflicts in the OpenTofu .terraform.lock.hcl dependency lock file when multiple team members upgrade providers simultaneously, with strategies to prevent conflicts in...

---

Lock file conflicts occur when two branches both update provider versions. Because the lock file is auto-generated HCL with complex checksums, standard line-by-line git conflict resolution is error-prone - leaving conflict markers or combining a provider version with checksums from another selection produces invalid files. The correct approach is to regenerate the lock file after resolving provider version conflicts in `providers.tf`.

## Conflict Scenario

```mermaid
graph TD
    A[main branch<br/>AWS provider 5.38] --> B[Branch A<br/>Upgrades to 5.40]
    A --> C[Branch B<br/>Upgrades to 5.42]
    B --> D[Both merged<br/>CONFLICT in lock file]
    D --> E[Regenerate lock file<br/>with resolved constraints]
```

## Understanding the Conflict

```hcl
# .terraform.lock.hcl after merge conflict - INVALID HCL

provider "registry.opentofu.org/hashicorp/aws" {
<<<<<<< HEAD
  version     = "5.40.0"
  constraints = "~> 5.0"

  hashes = [
    "h1:abc123...",
    "h1:def456...",
=======
  version     = "5.42.0"
  constraints = "~> 5.0"

  hashes = [
    "h1:xyz789...",
    "h1:uvw456...",
>>>>>>> feature/upgrade-aws
  ]
}
```

## Step-by-Step Conflict Resolution

```bash
# Step 1: After git merge/rebase detects conflict in lock file
git status
# modified: .terraform.lock.hcl (both modified)

# Step 2: Resolve providers.tf first - decide which version wins
# Edit providers.tf to use the desired version constraint
cat providers.tf

# Step 3: Accept one version of the lock file as the starting point
# Choose one of these commands
# During a merge, --theirs is incoming and --ours is current
# During a rebase, --ours is the branch being rebased onto and --theirs is your rebased work
# Option A:
git checkout --theirs .terraform.lock.hcl

# Option B:
git checkout --ours .terraform.lock.hcl

# Step 4: Regenerate the lock file for the resolved constraints
tofu init

# Step 5: Add the platform checksums your team/CI uses
tofu providers lock \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64

# Step 6: Verify the configuration is valid
tofu validate

# Step 7: Stage the regenerated lock file
git add .terraform.lock.hcl

# Step 8: Complete the merge
git merge --continue
# or if rebasing:
git rebase --continue
```

## When Resolving Provider Version Disagreements

```bash
# If branch A wants aws ~> 5.40 and branch B wants aws ~> 5.42:
# Choose the desired constraint for the merge result

# 1. Edit providers.tf to use the chosen constraint
vim providers.tf

# 2. Delete the conflicted lock file and regenerate
rm .terraform.lock.hcl

# 3. Install and generate fresh lock file
tofu init

# 4. Add platform checksums
tofu providers lock \
  -platform=linux_amd64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64

# 5. Run plan to verify no breaking changes
tofu plan
```

## Git Configuration to Prevent Conflicts

```bash
# .gitattributes - mark lock file as requiring manual merge handling
# This tells git to keep the current branch's file but leave the path conflicted
echo '.terraform.lock.hcl merge=binary' >> .gitattributes

# Alternative: use the built-in binary macro, which also disables text diffs
echo '.terraform.lock.hcl binary' >> .gitattributes
```

## Lock File Conflict Prevention Strategy

```bash
# Prevention strategy 1: Feature branches should pull main before upgrading
git checkout feature/my-feature
git rebase main  # Get latest lock file from main

# Then perform upgrade
tofu init -upgrade
tofu providers lock -platform=linux_amd64 -platform=darwin_amd64 -platform=darwin_arm64

# Prevention strategy 2: Dedicated "dependency upgrade" branches
# Only one branch upgrades providers at a time
git checkout -b deps/upgrade-providers-march-2026
tofu init -upgrade
tofu providers lock -platform=linux_amd64 -platform=darwin_amd64 -platform=darwin_arm64
git add providers.tf .terraform.lock.hcl
git commit -m "Upgrade AWS provider to 5.45.0"
```

## Automated Conflict Detection in CI

```yaml
# .github/workflows/lock-file-check.yml
name: Lock File Validation

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Check for lock file conflicts
        run: |
          if grep -q '<<<<<<<' .terraform.lock.hcl; then
            echo "ERROR: .terraform.lock.hcl contains unresolved merge conflicts"
            echo "Run: tofu init && tofu providers lock -platform=linux_amd64 -platform=darwin_amd64"
            exit 1
          fi

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2

      - name: Validate lock file syntax
        run: tofu init
```

## Best Practices

- When resolving lock file conflicts, regenerate the file with `tofu init` (or `tofu init -upgrade` when you intentionally want the newest version allowed by your constraints) rather than manually editing checksums - checksums are cryptographic hashes that must match exactly.
- Resolve `providers.tf` version constraints before regenerating the lock file - the lock file is derived from the version constraints, not the other way around.
- Use Renovate or Dependabot to automate provider upgrades through dedicated PRs - this serializes upgrades and prevents simultaneous version changes that cause conflicts.
- Add `.gitattributes` to mark the lock file as requiring manual merge resolution (`merge=binary` or `binary`) - this prevents git from attempting an auto-merge that produces invalid HCL.
- In CI, explicitly check for conflict markers (`<<<<<<<`) in the lock file before running `tofu init` - a lock file with conflict markers causes confusing errors that are hard to diagnose.
