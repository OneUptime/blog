# How to Use terraform state push to Upload State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, CLI Commands, Remote State, Infrastructure as Code

Description: Guide to using terraform state push to upload Terraform state to a remote backend, including safety checks, use cases for state recovery, migration scenarios, and important precautions.

---

The `terraform state push` command uploads a local state file to the configured remote backend. It is the counterpart to `terraform state pull`. While `state pull` is a safe, read-only operation you can run anytime, `state push` directly overwrites the remote state and needs to be handled with care. Used correctly, it is a powerful tool for state recovery, migration, and troubleshooting.

## Basic Usage

```bash
# Push a local state file to the remote backend
terraform state push terraform.tfstate
```

That is the entire command. You specify the path to the local state file, and Terraform uploads it to whatever backend is configured.

## How It Works

When you run `terraform state push`, Terraform:

1. Reads the local state file you specified
2. Connects to the configured backend
3. Checks lineage and serial number (safety checks)
4. Uploads the state, replacing the current remote state

The safety checks are important. Terraform will refuse to push if:
- The lineage of the local state does not match the remote state
- The serial number of the local state is lower than the remote state

These checks prevent accidentally overwriting a newer state with an older one.

## Overriding Safety Checks

If you need to force the push (for example, during state recovery), use the `-force` flag:

```bash
# Force push, bypassing lineage and serial checks
terraform state push -force recovered-state.json
```

This is dangerous and should only be used when you are certain the local state is the correct one. Without the safety checks, you could overwrite good state with bad state.

## Use Case 1: State Recovery

The most common reason to use `state push` is recovering from a corrupted or lost state.

### Recovering from a Backup

```bash
# You saved a backup earlier
# terraform state pull > backup-20260223.json

# The remote state got corrupted somehow
# Restore from your backup
terraform state push backup-20260223.json
```

### Recovering from the Auto-Backup

When running state commands, Terraform saves backups:

```bash
# After a failed state operation, the backup exists
ls terraform.tfstate.backup

# Push the backup to restore the previous state
terraform state push terraform.tfstate.backup
```

### Recovering from S3 Versioning

If you use S3 with versioning, you can recover a previous state version and push it:

```bash
# List previous versions of the state file
aws s3api list-object-versions \
  --bucket my-terraform-state \
  --prefix prod/terraform.tfstate \
  --query 'Versions[].{VersionId:VersionId,LastModified:LastModified,Size:Size}'

# Download a specific version
aws s3api get-object \
  --bucket my-terraform-state \
  --key prod/terraform.tfstate \
  --version-id "version-id-here" \
  recovered-state.json

# Push the recovered state
terraform state push recovered-state.json
```

## Use Case 2: Backend Migration

When migrating state between backends, `state push` can be part of the workflow:

```bash
# Step 1: Pull state from the old backend
cd old-config/
terraform state pull > migrated-state.json

# Step 2: Configure the new backend
cd ../new-config/
# Update backend.tf with new backend configuration

# Step 3: Initialize the new backend (empty state)
terraform init

# Step 4: Push the state to the new backend
terraform state push ../old-config/migrated-state.json
```

Note: `terraform init -migrate-state` handles most migration scenarios automatically. Use the manual pull/push approach only when the automatic migration does not work.

## Use Case 3: Fixing Diverged State

If the remote state has diverged from reality (perhaps due to manual changes or a failed apply):

```bash
# Pull the current state
terraform state pull > current-state.json

# Edit the state manually (extreme caution required)
# Usually you would fix specific values or remove corrupted entries
vim current-state.json

# Push the corrected state
terraform state push current-state.json

# Verify by running a refresh
terraform apply -refresh-only
```

Manually editing state JSON is risky and should be a last resort. Prefer using `terraform state mv`, `terraform state rm`, or `terraform import` when possible.

## Use Case 4: Syncing States Across Environments

In rare cases, you might need to duplicate a state across environments:

```bash
# This is unusual but sometimes needed for blue/green infrastructure
# Pull from source
terraform workspace select blue
terraform state pull > blue-state.json

# Modify identifiers in the state (very advanced, very risky)
# This requires careful JSON manipulation

# Push to destination
terraform workspace select green
terraform state push -force modified-state.json
```

## Lineage and Serial Numbers

Understanding these two fields is critical for working with `state push`.

### Lineage

The lineage is a UUID that identifies a state's origin. Two state files with different lineages are considered unrelated. Terraform refuses to push a state with a different lineage unless you use `-force`:

```bash
# Check lineage of local and remote state
jq '.lineage' local-state.json
terraform state pull | jq '.lineage'

# If they match, push will work
# If they differ, you need -force
```

### Serial

The serial is an incrementing counter. Every time state is written, the serial increases. Terraform refuses to push a state with a lower serial than the remote state:

```bash
# Check serial numbers
jq '.serial' local-state.json
terraform state pull | jq '.serial'

# If local serial < remote serial, push fails without -force
```

This prevents accidentally pushing an older state over a newer one.

## Safety Workflow

Follow this workflow to minimize risk when pushing state:

```bash
# Step 1: Back up the current remote state
terraform state pull > remote-state-backup-$(date +%Y%m%d%H%M%S).json

# Step 2: Verify the state you want to push
jq '{version, serial, lineage, terraform_version, resource_count: (.resources | length)}' state-to-push.json

# Step 3: Compare with the remote state
terraform state pull | jq '{version, serial, lineage, terraform_version, resource_count: (.resources | length)}'

# Step 4: Push the state
terraform state push state-to-push.json

# Step 5: Verify the push was successful
terraform state pull | jq '.serial'

# Step 6: Run a plan to check consistency
terraform plan
```

## Pushing to an Empty Backend

When pushing to a freshly initialized backend with no existing state, the lineage check does not apply:

```bash
# Initialize a new backend
terraform init

# Push a state file (no lineage conflict since the backend is empty)
terraform state push existing-state.json

# Verify
terraform state list
```

## Common Errors

### Lineage Mismatch

```
Error: Cannot overwrite state with a different lineage
```

The local state has a different lineage than the remote state. This usually means you are trying to push state from a completely different project. If you are certain this is correct, use `-force`:

```bash
terraform state push -force state-file.json
```

### Serial Number Regression

```
Error: Cannot overwrite state with an earlier serial number
```

The local state has a lower serial than the remote. This means the remote state is newer. Make sure you actually want to roll back:

```bash
# Only if you're sure the local state is correct
terraform state push -force state-file.json
```

### Invalid State Format

```
Error: Error reading state file
```

The file you are trying to push is not valid Terraform state JSON. Verify the file:

```bash
# Check if the file is valid JSON
python3 -m json.tool state-file.json > /dev/null

# Check the state version
jq '.version' state-file.json
# Should be 4 for modern Terraform
```

## What Not to Do

**Do not use state push to sync multiple backends.** If you need state in multiple locations, use proper backend migration or a state replication mechanism.

**Do not push state from a different Terraform version carelessly.** If the state was written by a newer Terraform version, older versions might not understand it:

```bash
# Check which version wrote the state
jq '.terraform_version' state-file.json
```

**Do not push state that you manually edited without extreme caution.** A single wrong character can corrupt the state and potentially cause Terraform to destroy or misconfigure infrastructure.

**Do not push frequently.** If you find yourself using state push regularly, something is wrong with your workflow. It should be a rare recovery or migration operation.

## Summary

The `terraform state push` command is a powerful but potentially dangerous tool for uploading state to remote backends. Its primary uses are state recovery, backend migration, and fixing corrupted state. Always back up the remote state before pushing, verify lineage and serial numbers, and run `terraform plan` afterward to confirm consistency. Treat it as an emergency tool rather than a routine operation. For the safe, read-only counterpart, see [terraform state pull](https://oneuptime.com/blog/post/terraform-state-pull-command/view). For routine state modifications, prefer [terraform state mv](https://oneuptime.com/blog/post/terraform-state-mv-command/view) and [terraform state rm](https://oneuptime.com/blog/post/terraform-state-rm-command/view).
