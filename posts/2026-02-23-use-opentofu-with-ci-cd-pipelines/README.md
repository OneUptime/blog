# How to Use OpenTofu with CI/CD Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, CI/CD, DevOps, Automation, Infrastructure as Code

Description: A comprehensive guide to integrating OpenTofu into CI/CD pipelines, covering pipeline design, approval workflows, state management, secrets handling.

---

Running OpenTofu manually works for small projects, but any team managing production infrastructure needs automated pipelines. A well-designed CI/CD pipeline for OpenTofu runs plans on pull requests, requires approvals before applying, and handles state locking and secrets securely. This guide covers the design patterns and implementation details.

## Pipeline Architecture

A typical OpenTofu CI/CD pipeline has these stages:

1. **Validate** - Syntax check and formatting
2. **Plan** - Generate an execution plan
3. **Review** - Human approval of the plan
4. **Apply** - Execute the approved changes
5. **Verify** - Post-deployment checks

```text
PR Created -> Validate -> Plan -> Comment Plan on PR
PR Merged  -> Plan -> Approve -> Apply -> Verify
```

## General Pipeline Configuration

Regardless of your CI/CD platform, these principles apply:

### Installing OpenTofu

```bash
# Method 1: Official installer script
curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh | sh -s -- --install-method standalone

# Method 2: Direct binary download
OPENTOFU_VERSION="1.8.0"
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${OPENTOFU_VERSION}/tofu_${OPENTOFU_VERSION}_linux_amd64.zip"
unzip "tofu_${OPENTOFU_VERSION}_linux_amd64.zip" -d /usr/local/bin/

# Method 3: Docker image
docker pull ghcr.io/opentofu/opentofu:1.8.0
```

### Caching Dependencies

Speed up pipelines by caching provider plugins:

```bash
# Cache the .terraform directory between runs
# The exact mechanism depends on your CI platform

# Set plugin cache directory
export TF_PLUGIN_CACHE_DIR="/opt/cache/opentofu-plugins"
mkdir -p "$TF_PLUGIN_CACHE_DIR"
```

### Managing Secrets

Never store credentials in your pipeline configuration:

```bash
# Use CI/CD platform secrets
# AWS
export AWS_ACCESS_KEY_ID="${CI_AWS_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${CI_AWS_SECRET_ACCESS_KEY}"

# Or better: use OIDC/workload identity federation
# No long-lived credentials needed
```

## Pipeline Stages in Detail

### Stage 1: Validate

```bash
#!/bin/bash
# validate.sh

# Format check (fail if files are not formatted)
tofu fmt -check -recursive
if [ $? -ne 0 ]; then
  echo "Files are not properly formatted. Run 'tofu fmt' locally."
  exit 1
fi

# Initialize (no backend needed for validation)
tofu init -backend=false

# Validate syntax
tofu validate
```

### Stage 2: Plan

```bash
#!/bin/bash
# plan.sh

# Initialize with backend
tofu init

# Run plan and save output
tofu plan -out=plan.bin -detailed-exitcode

# Exit codes:
# 0 = no changes
# 1 = error
# 2 = changes present

PLAN_EXIT=$?

# Generate human-readable plan output
tofu show -no-color plan.bin > plan.txt

# Exit with the plan exit code
exit $PLAN_EXIT
```

### Stage 3: Apply

```bash
#!/bin/bash
# apply.sh

# Initialize
tofu init

# Apply the saved plan
tofu apply -auto-approve plan.bin

# Verify the apply succeeded
if [ $? -ne 0 ]; then
  echo "Apply failed!"
  exit 1
fi

echo "Apply successful"
```

## Plan on Pull Requests

Post the plan output as a PR comment so reviewers can see what changes:

```bash
#!/bin/bash
# pr-plan.sh

tofu init
tofu plan -out=plan.bin -no-color 2>&1 | tee plan-output.txt

# Format for PR comment
PLAN_OUTPUT=$(cat plan-output.txt)

# Post as PR comment (example using GitHub CLI)
gh pr comment "$PR_NUMBER" --body "$(cat <<EOF
## OpenTofu Plan Output

\`\`\`
${PLAN_OUTPUT}
\`\`\`
EOF
)"
```

## Multi-Environment Pipelines

For organizations with multiple environments:

```bash
#!/bin/bash
# deploy.sh

ENVIRONMENT="${1:-staging}"

# Use workspace-based separation
tofu workspace select "$ENVIRONMENT" || tofu workspace new "$ENVIRONMENT"

# Or use directory-based separation
cd "environments/${ENVIRONMENT}"

# Use environment-specific variables
tofu init -backend-config="environments/${ENVIRONMENT}/backend.hcl"
tofu plan -var-file="environments/${ENVIRONMENT}/terraform.tfvars" -out=plan.bin
```

```yaml
# Typical multi-environment flow:
# 1. PR: Plan for staging
# 2. Merge to main: Apply to staging
# 3. Manual trigger: Plan for production
# 4. Approval: Apply to production
```

## Handling State Locking in Pipelines

State locking prevents concurrent modifications. Your pipeline should handle lock conflicts gracefully:

```bash
#!/bin/bash
# apply-with-retry.sh

MAX_RETRIES=3
RETRY_DELAY=30

for i in $(seq 1 $MAX_RETRIES); do
  tofu apply -auto-approve plan.bin 2>&1
  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    echo "Apply succeeded"
    exit 0
  fi

  # Check if the failure was due to a lock
  if tofu apply -auto-approve plan.bin 2>&1 | grep -q "Error acquiring the state lock"; then
    echo "State locked, retrying in ${RETRY_DELAY}s (attempt $i/$MAX_RETRIES)"
    sleep $RETRY_DELAY
  else
    echo "Apply failed with non-lock error"
    exit 1
  fi
done

echo "Failed after $MAX_RETRIES retries"
exit 1
```

## Drift Detection

Schedule periodic drift detection to catch manual changes:

```bash
#!/bin/bash
# drift-check.sh

tofu init
tofu plan -detailed-exitcode -out=drift-plan.bin

EXIT_CODE=$?

if [ $EXIT_CODE -eq 2 ]; then
  # Drift detected
  tofu show -no-color drift-plan.bin > drift-report.txt

  # Send notification (Slack, email, etc.)
  curl -X POST "$SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"Infrastructure drift detected! Check the pipeline for details.\"}"

  exit 1
elif [ $EXIT_CODE -eq 0 ]; then
  echo "No drift detected"
  exit 0
else
  echo "Error running drift check"
  exit 1
fi
```

```yaml
# Schedule drift detection
# Runs daily at 6 AM UTC
schedule:
  - cron: '0 6 * * *'
```

## Security Considerations

### OIDC Authentication

Avoid long-lived credentials by using OpenID Connect:

```yaml
# GitHub Actions with OIDC
permissions:
  id-token: write
  contents: read

steps:
  - name: Configure AWS credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
      aws-region: us-east-1
```

### Plan File Security

Plan files can contain sensitive data. Handle them carefully:

```bash
# Encrypt plan files with OpenTofu state encryption
# (covers plan files too when configured)

# Or delete plan files after use
trap "rm -f plan.bin" EXIT
```

### Audit Trail

Log every plan and apply for audit purposes:

```bash
# Save plan outputs to a persistent store
tofu plan -out=plan.bin -no-color 2>&1 | tee "/audit/plans/$(date +%Y%m%d-%H%M%S).log"
tofu apply plan.bin 2>&1 | tee "/audit/applies/$(date +%Y%m%d-%H%M%S).log"
```

## Pipeline Anti-Patterns

**Running apply on every commit.** Always require explicit approval for production applies. Automated applies are acceptable for development environments only.

**Skipping the plan step.** Never run `tofu apply` without first reviewing the plan. Even automated pipelines should save and review the plan.

**Hardcoding credentials.** Use OIDC, managed identities, or secrets management. Never put keys in pipeline config files.

**Ignoring exit codes.** The `tofu plan -detailed-exitcode` flag returns 0 (no changes), 1 (error), or 2 (changes). Use these to make pipeline decisions.

**Running plan and apply as separate pipeline steps without a saved plan.** If you run `tofu plan` and then `tofu apply` (without `-out`), the apply may see different changes than the plan showed. Always use `-out=plan.bin` and `tofu apply plan.bin`.

## Complete Pipeline Example

Here is a platform-agnostic pipeline structure:

```bash
#!/bin/bash
# pipeline.sh
# Usage: ./pipeline.sh [plan|apply] [environment]

ACTION="${1:-plan}"
ENVIRONMENT="${2:-staging}"

set -euo pipefail

# Setup
export TF_IN_AUTOMATION=true
export TF_INPUT=false

# Initialize
tofu init \
  -backend-config="environments/${ENVIRONMENT}/backend.hcl"

case "$ACTION" in
  plan)
    tofu plan \
      -var-file="environments/${ENVIRONMENT}/terraform.tfvars" \
      -out=plan.bin \
      -detailed-exitcode
    ;;
  apply)
    if [ ! -f plan.bin ]; then
      echo "No plan file found. Run plan first."
      exit 1
    fi
    tofu apply plan.bin
    ;;
  *)
    echo "Usage: $0 [plan|apply] [environment]"
    exit 1
    ;;
esac
```

A well-built CI/CD pipeline turns OpenTofu from a manual tool into a reliable, auditable infrastructure deployment system. The investment in pipeline setup pays off quickly as your infrastructure grows.

For platform-specific guides, see [How to Use OpenTofu with GitHub Actions](https://oneuptime.com/blog/post/2026-02-23-use-opentofu-with-github-actions/view) and [How to Use OpenTofu with GitLab CI](https://oneuptime.com/blog/post/2026-02-23-use-opentofu-with-gitlab-ci/view).
