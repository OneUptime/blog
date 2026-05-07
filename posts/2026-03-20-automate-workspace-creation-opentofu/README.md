# How to Automate Workspace Creation in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Workspaces, Automation, CI/CD, Infrastructure as Code

Description: Automate OpenTofu workspace creation in CI/CD pipelines so ephemeral environments are provisioned consistently without manual steps.

Manually running `tofu workspace new` before every deployment introduces human error and slows down pipelines. Automating workspace creation ensures environments are provisioned consistently and can be tied directly to pull requests, branches, or user identifiers.

## The Core Pattern

OpenTofu's `workspace select` command supports `-or-create`, so a robust automation script can select an existing workspace or create it on demand:

```bash
#!/usr/bin/env bash
# ensure-workspace.sh

# Creates the workspace if it does not already exist, then selects it.
set -euo pipefail

WORKSPACE="${1}"

echo "Selecting or creating workspace '${WORKSPACE}'..."
tofu workspace select -or-create "$WORKSPACE"

echo "Active workspace: $(tofu workspace show)"
```

## Integrating with GitHub Actions

Create or select a workspace automatically on every pull request from a branch in the same repository:

```yaml
# .github/workflows/preview.yml
name: Deploy Preview Environment

on:
  pull_request:
    branches: [main]

jobs:
  deploy:
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    env:
      # Derive workspace name from PR number, e.g. "pr-42"
      WORKSPACE_NAME: pr-${{ github.event.pull_request.number }}

    steps:
      - uses: actions/checkout@v6

      - name: Install OpenTofu
        run: |
          curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh -o install-opentofu.sh
          chmod +x install-opentofu.sh
          ./install-opentofu.sh --install-method standalone
          rm -f install-opentofu.sh

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Tofu Init
        run: tofu init

      - name: Ensure Workspace Exists
        run: bash scripts/ensure-workspace.sh "$WORKSPACE_NAME"

      - name: Tofu Apply
        run: tofu apply -auto-approve -var="env=$WORKSPACE_NAME"
```

## Automating Workspace Teardown on PR Close

Destroy and delete the workspace when a pull request is closed:

```yaml
# .github/workflows/teardown.yml
name: Teardown Preview Environment

on:
  pull_request:
    types: [closed]

jobs:
  teardown:
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    env:
      WORKSPACE_NAME: pr-${{ github.event.pull_request.number }}

    steps:
      - uses: actions/checkout@v6

      - name: Install OpenTofu
        run: |
          curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh -o install-opentofu.sh
          chmod +x install-opentofu.sh
          ./install-opentofu.sh --install-method standalone
          rm -f install-opentofu.sh

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Tofu Init
        run: tofu init

      - name: Destroy and Delete Workspace
        run: |
          if tofu workspace select "$WORKSPACE_NAME"; then
            tofu destroy -auto-approve
            tofu workspace select default
            tofu workspace delete "$WORKSPACE_NAME"
          else
            echo "Workspace $WORKSPACE_NAME not found, skipping."
          fi
```

## Using the TF_WORKSPACE Environment Variable

OpenTofu respects the `TF_WORKSPACE` environment variable, making it easy to set the active workspace without an explicit `workspace select` call once the workspace already exists:

```bash
# Set an existing workspace via environment variable
export TF_WORKSPACE=pr-42

# All subsequent tofu commands target this workspace automatically
tofu init
tofu plan
tofu apply -auto-approve
```

This approach works well in container-based CI once the workspace already exists and environment variables are the primary configuration mechanism.

## Bulk Creation from a List

Provision multiple workspaces from a configuration file for environments like `staging`, `qa`, or regional deployments:

```bash
#!/usr/bin/env bash
# create-all-workspaces.sh
# Reads workspace names from workspaces.txt (one per line)

while IFS= read -r workspace; do
  [[ -z "$workspace" || "$workspace" == \#* ]] && continue
  bash scripts/ensure-workspace.sh "$workspace"
done < workspaces.txt
```

```text
# workspaces.txt
staging
qa
us-west-2
eu-central-1
```

## Conclusion

Automating workspace creation removes a manual step from deployment pipelines, reduces errors, and enables powerful patterns like per-PR preview environments. Combine the `ensure-workspace.sh` pattern with CI/CD triggers to make environment lifecycle fully automated.
