# How to Use OpenTofu with Existing Terraform Enterprise

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform Enterprise, IaC, Migration, DevOps

Description: A practical guide to running OpenTofu alongside or migrating from Terraform Enterprise, covering workspace migration, state management, API compatibility, and transition strategies.

---

Many organizations have invested heavily in Terraform Enterprise (TFE) for their infrastructure-as-code workflows. With the licensing changes to Terraform, some teams are exploring OpenTofu as an alternative while still needing to work with their existing TFE setup. This guide covers strategies for using OpenTofu alongside Terraform Enterprise, migrating workspaces, and managing the transition.

## Understanding the Compatibility Landscape

OpenTofu forked from Terraform at version 1.5.x, which means the configuration language (HCL), state file format, and most provider interfaces are compatible. However, Terraform Enterprise is a commercial product from HashiCorp, and there are important distinctions to understand:

- **Configuration language**: Fully compatible. HCL files work in both tools.
- **State format**: Compatible at the version OpenTofu forked from. Later versions may diverge.
- **Provider protocol**: Compatible. Providers that work with Terraform work with OpenTofu.
- **TFE API**: OpenTofu does not natively connect to Terraform Enterprise's API.
- **TFE remote execution**: OpenTofu cannot use TFE as a remote execution backend directly.

## Strategy 1: Gradual Migration

The most common approach is a gradual migration where you move workspaces from TFE to an alternative backend one at a time.

### Step 1: Export State from TFE

```bash
# Use the Terraform CLI (still compatible) to pull state from TFE
# You need a TFE API token
export TFE_TOKEN="your-tfe-api-token"

# Navigate to the workspace configuration
cd my-workspace

# Pull the current state
terraform state pull > state.json

# Verify the state file is valid
python3 -c "
import json
with open('state.json') as f:
    state = json.load(f)
print(f'Resources: {len(state.get(\"resources\", []))}')
print(f'Serial: {state[\"serial\"]}')
print(f'Version: {state[\"version\"]}')
"
```

### Step 2: Set Up a New Backend

Choose a backend for OpenTofu. Common choices include S3, Azure Blob Storage, or GCS:

```hcl
# backend.tf - New backend configuration for OpenTofu
terraform {
  backend "s3" {
    bucket         = "my-opentofu-state"
    key            = "workspaces/my-workspace/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "opentofu-state-locks"
    encrypt        = true
  }
}
```

### Step 3: Push State to the New Backend

```bash
# Initialize the new backend with OpenTofu
tofu init

# When prompted about migrating state, choose to migrate
# Or push state manually:
tofu state push state.json

# Verify the state is correct
tofu state list
tofu plan  # Should show no changes if everything is correct
```

### Step 4: Remove the TFE Workspace

Once you have verified the migration, clean up the old workspace:

```bash
# Use the TFE API to delete the workspace
curl \
  --header "Authorization: Bearer $TFE_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request DELETE \
  "https://app.terraform.io/api/v2/organizations/my-org/workspaces/my-workspace"
```

## Strategy 2: Parallel Running

Some teams prefer to run OpenTofu and TFE in parallel for a period before fully committing to the migration.

### Setting Up Parallel Workspaces

```hcl
# The same configuration can be used with both tools
# Use different backend configurations for each

# For TFE (keep existing)
# terraform {
#   cloud {
#     organization = "my-org"
#     workspaces {
#       name = "my-workspace"
#     }
#   }
# }

# For OpenTofu (new)
terraform {
  backend "s3" {
    bucket = "my-opentofu-state"
    key    = "parallel/my-workspace/terraform.tfstate"
    region = "us-east-1"
  }
}
```

Use backend configuration files to switch between them:

```bash
# backend-tfe.hcl
# workspaces {
#   name = "my-workspace"
# }
# hostname     = "app.terraform.io"
# organization = "my-org"

# backend-s3.hcl
bucket         = "my-opentofu-state"
key            = "parallel/my-workspace/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "opentofu-state-locks"

# Initialize with the S3 backend for OpenTofu
tofu init -backend-config=backend-s3.hcl
```

### Read-Only Validation

During parallel running, use one tool for actual deployments and the other for validation:

```bash
# Use TFE for actual deployments (existing workflow)
# Use OpenTofu for validation (new workflow)

# OpenTofu plan to verify compatibility
tofu plan -detailed-exitcode

# Exit codes:
# 0 = no changes
# 1 = error
# 2 = changes detected
```

## Strategy 3: API-Based State Migration

For organizations with many workspaces, automate the migration using the TFE API:

```python
#!/usr/bin/env python3
# migrate_workspaces.py
# Automated workspace migration from TFE to OpenTofu backends

import requests
import json
import subprocess
import os

TFE_TOKEN = os.environ["TFE_TOKEN"]
TFE_ORG = os.environ["TFE_ORG"]
TFE_URL = "https://app.terraform.io/api/v2"

HEADERS = {
    "Authorization": f"Bearer {TFE_TOKEN}",
    "Content-Type": "application/vnd.api+json"
}

def list_workspaces():
    """List all workspaces in the TFE organization."""
    url = f"{TFE_URL}/organizations/{TFE_ORG}/workspaces"
    response = requests.get(url, headers=HEADERS)
    return response.json()["data"]

def get_state(workspace_id):
    """Download the current state from a TFE workspace."""
    url = f"{TFE_URL}/workspaces/{workspace_id}/current-state-version"
    response = requests.get(url, headers=HEADERS)
    state_url = response.json()["data"]["attributes"]["hosted-state-download-url"]

    # Download the actual state file
    state_response = requests.get(state_url, headers=HEADERS)
    return state_response.json()

def migrate_workspace(workspace):
    """Migrate a single workspace to the new backend."""
    name = workspace["attributes"]["name"]
    workspace_id = workspace["id"]

    print(f"Migrating workspace: {name}")

    # Download state
    state = get_state(workspace_id)

    # Write state to temp file
    state_file = f"/tmp/{name}-state.json"
    with open(state_file, "w") as f:
        json.dump(state, f)

    # Push state to new backend using OpenTofu
    workspace_dir = f"workspaces/{name}"
    subprocess.run(["tofu", "init"], cwd=workspace_dir, check=True)
    subprocess.run(["tofu", "state", "push", state_file], cwd=workspace_dir, check=True)

    # Verify with plan
    result = subprocess.run(
        ["tofu", "plan", "-detailed-exitcode"],
        cwd=workspace_dir,
        capture_output=True
    )

    if result.returncode == 0:
        print(f"  Successfully migrated {name} - no changes detected")
    elif result.returncode == 2:
        print(f"  WARNING: {name} has detected changes after migration")
    else:
        print(f"  ERROR: {name} migration failed")
        print(result.stderr.decode())

    return result.returncode

# Run the migration
workspaces = list_workspaces()
results = {}

for ws in workspaces:
    results[ws["attributes"]["name"]] = migrate_workspace(ws)

# Print summary
print("\n=== Migration Summary ===")
for name, code in results.items():
    status = "OK" if code == 0 else "CHANGES" if code == 2 else "FAILED"
    print(f"  {name}: {status}")
```

## Handling TFE-Specific Features

Terraform Enterprise has features that do not have direct equivalents in OpenTofu. You need alternatives for these:

### Sentinel Policies

TFE uses Sentinel for policy-as-code. With OpenTofu, switch to Open Policy Agent (OPA):

```rego
# policy/cost-limit.rego
# OPA policy equivalent of a Sentinel cost limit policy
package terraform

# Deny changes that create more than 10 instances
deny["Too many instances"] {
  resource_count := count([r |
    r := input.resource_changes[_]
    r.type == "aws_instance"
    r.change.actions[_] == "create"
  ])
  resource_count > 10
}
```

### VCS Integration

TFE's VCS integration triggers runs on commits. Replace this with CI/CD pipelines:

```yaml
# .github/workflows/opentofu.yml
name: OpenTofu

on:
  push:
    branches: [main]
    paths:
      - "infrastructure/**"
  pull_request:
    branches: [main]
    paths:
      - "infrastructure/**"

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.6.2"

      - name: Init
        run: tofu init
        working-directory: infrastructure

      - name: Plan
        run: tofu plan -no-color
        working-directory: infrastructure
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.6.2"

      - name: Apply
        run: |
          tofu init
          tofu apply -auto-approve
        working-directory: infrastructure
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### Private Registry

TFE includes a private module registry. For OpenTofu, use alternatives:

```hcl
# Option 1: Git-based module sources
module "networking" {
  source = "git::https://github.com/my-org/terraform-modules.git//networking?ref=v1.2.0"
}

# Option 2: S3-based module sources
module "networking" {
  source = "s3::https://my-modules-bucket.s3.amazonaws.com/networking/v1.2.0/module.zip"
}

# Option 3: Use a third-party registry like Spacelift or env0
```

## State Locking During Migration

Critical: ensure state is locked during migration to prevent concurrent modifications:

```bash
# Lock the TFE workspace before migration
curl \
  --header "Authorization: Bearer $TFE_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data '{"data":{"type":"workspaces","attributes":{"locked":true}}}' \
  "https://app.terraform.io/api/v2/organizations/my-org/workspaces/my-workspace"

# Perform the migration...

# Only unlock if you need to roll back
```

## Monitoring During Migration

During and after migration, monitoring your infrastructure is essential. [OneUptime](https://oneuptime.com) can help you verify that services remain healthy throughout the transition, alerting you if any infrastructure changes cause availability issues.

## Conclusion

Migrating from Terraform Enterprise to OpenTofu is a manageable process when approached systematically. Start with non-critical workspaces, validate thoroughly with plan comparisons, and automate the migration for large environments. The key is to maintain state integrity throughout the process and have rollback plans for each workspace.

For more on OpenTofu, check out our guides on [OpenTofu registry authentication](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-opentofu-registry-authentication/view) and [contributing to OpenTofu](https://oneuptime.com/blog/post/2026-02-23-how-to-contribute-to-opentofu/view).
