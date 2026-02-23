# How to Implement Drift Detection in Terraform CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Drift Detection, Infrastructure as Code, DevOps, Monitoring

Description: Learn how to detect infrastructure drift in Terraform CI/CD pipelines using scheduled plans, webhook notifications, and automated remediation workflows.

---

Infrastructure drift happens when the actual state of your cloud resources diverges from what Terraform expects. Someone modifies a security group through the AWS console, a script changes a DNS record, or an auto-scaling event creates resources Terraform does not know about. Without drift detection, you only discover these changes when your next `terraform apply` does something unexpected.

## What Causes Drift

Drift comes from several sources:

- **Manual changes** - Engineers making quick fixes through cloud consoles
- **Other automation** - Scripts, Lambda functions, or other tools modifying resources
- **Cloud provider actions** - Auto-scaling, self-healing, or maintenance events
- **Third-party integrations** - Tools that modify your infrastructure independently
- **Terraform bugs** - Rare but possible state corruption

The common thread is that something changes the infrastructure outside of Terraform's workflow.

## Basic Drift Detection with terraform plan

The simplest form of drift detection is running `terraform plan` and checking if it reports any changes:

```bash
# Run plan and capture the exit code
terraform plan -detailed-exitcode -no-color -out=driftcheck.tfplan

# Exit codes:
# 0 = No changes (no drift)
# 1 = Error
# 2 = Changes detected (drift found)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 2 ]; then
  echo "DRIFT DETECTED: Infrastructure has diverged from Terraform state"
elif [ $EXIT_CODE -eq 0 ]; then
  echo "No drift detected"
else
  echo "Error running plan"
  exit 1
fi
```

The `-detailed-exitcode` flag is the key. Without it, `terraform plan` always exits with 0 on success, whether or not there are changes.

## GitHub Actions Drift Detection Workflow

```yaml
# .github/workflows/drift-detection.yml
name: Terraform Drift Detection

on:
  schedule:
    # Run every 6 hours
    - cron: "0 */6 * * *"
  workflow_dispatch:  # Allow manual triggers

permissions:
  id-token: write
  contents: read
  issues: write  # Needed to create GitHub issues

jobs:
  detect-drift:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Terraform Init
        run: |
          cd terraform
          terraform init -no-color

      - name: Check for Drift
        id: drift
        run: |
          cd terraform
          set +e  # Don't exit on non-zero

          terraform plan -detailed-exitcode -no-color -out=driftcheck.tfplan 2>&1 | tee plan-output.txt
          EXIT_CODE=${PIPESTATUS[0]}

          echo "exit_code=$EXIT_CODE" >> $GITHUB_OUTPUT

          if [ $EXIT_CODE -eq 2 ]; then
            echo "drift_detected=true" >> $GITHUB_OUTPUT
            # Extract summary of changes
            grep -E "^(Plan:|  #|  \+|  -|  ~)" plan-output.txt > drift-summary.txt
          else
            echo "drift_detected=false" >> $GITHUB_OUTPUT
          fi

      - name: Create Issue for Drift
        if: steps.drift.outputs.drift_detected == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const summary = fs.readFileSync('terraform/drift-summary.txt', 'utf8');
            const fullPlan = fs.readFileSync('terraform/plan-output.txt', 'utf8');

            // Check if an open drift issue already exists
            const issues = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: 'infrastructure-drift',
              state: 'open'
            });

            const body = `## Infrastructure Drift Detected

            Terraform detected the following drift from the expected state:

            \`\`\`
            ${summary}
            \`\`\`

            <details>
            <summary>Full plan output</summary>

            \`\`\`
            ${fullPlan.substring(0, 60000)}
            \`\`\`
            </details>

            **Action Required**: Review the drift and either:
            1. Update Terraform to match the current state (\`terraform import\` or update config)
            2. Revert the manual change by running \`terraform apply\`

            *Detected at: ${new Date().toISOString()}*`;

            if (issues.data.length > 0) {
              // Update existing issue
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issues.data[0].number,
                body: body
              });
            } else {
              // Create new issue
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: 'Infrastructure Drift Detected',
                body: body,
                labels: ['infrastructure-drift', 'needs-attention']
              });
            }

      - name: Send Slack notification
        if: steps.drift.outputs.drift_detected == 'true'
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H "Content-Type: application/json" \
            -d '{
              "text": "Infrastructure drift detected in production. Check GitHub Issues for details.",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Infrastructure Drift Detected*\nTerraform found unexpected changes in production infrastructure."
                  }
                }
              ]
            }'
```

## Drift Detection with JSON Output

For programmatic drift analysis, use Terraform's JSON output:

```bash
# Generate plan in JSON format for parsing
terraform plan -detailed-exitcode -no-color -out=driftcheck.tfplan
terraform show -json driftcheck.tfplan > plan.json
```

```python
# analyze_drift.py - Parse plan JSON to categorize drift
import json
import sys

with open('plan.json') as f:
    plan = json.load(f)

drift_report = {
    'creates': [],
    'updates': [],
    'deletes': [],
    'replaces': []
}

for change in plan.get('resource_changes', []):
    actions = change['change']['actions']
    address = change['address']

    if 'create' in actions and 'delete' not in actions:
        drift_report['creates'].append(address)
    elif 'update' in actions:
        drift_report['updates'].append(address)
    elif 'delete' in actions and 'create' not in actions:
        drift_report['deletes'].append(address)
    elif 'delete' in actions and 'create' in actions:
        drift_report['replaces'].append(address)

print("=== Drift Report ===")
for category, resources in drift_report.items():
    if resources:
        print(f"\n{category.upper()} ({len(resources)}):")
        for r in resources:
            print(f"  - {r}")

# Exit with error if destructive changes detected
if drift_report['deletes'] or drift_report['replaces']:
    print("\nWARNING: Destructive drift detected!")
    sys.exit(2)
```

## Multi-Environment Drift Detection

Check drift across all environments in a single workflow:

```yaml
# .github/workflows/drift-all-envs.yml
name: Multi-Environment Drift Check

on:
  schedule:
    - cron: "0 8 * * *"  # Daily at 8 AM

jobs:
  drift-check:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, production]
      fail-fast: false  # Check all environments even if one has drift

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Check Drift - ${{ matrix.environment }}
        run: |
          cd terraform
          terraform init -no-color
          terraform workspace select ${{ matrix.environment }}

          set +e
          terraform plan -detailed-exitcode -no-color \
            -var-file="envs/${{ matrix.environment }}.tfvars" 2>&1 | tee plan-output.txt
          EXIT_CODE=${PIPESTATUS[0]}

          if [ $EXIT_CODE -eq 2 ]; then
            echo "DRIFT DETECTED in ${{ matrix.environment }}"
            exit 1  # Fail the job to make drift visible
          fi
```

## Automated Drift Remediation

For non-critical drift, you can auto-remediate by applying the Terraform config:

```yaml
# Auto-fix drift for dev environment only
- name: Auto-remediate drift (dev only)
  if: steps.drift.outputs.drift_detected == 'true' && matrix.environment == 'dev'
  run: |
    cd terraform
    terraform apply -no-color -auto-approve \
      -var-file="envs/dev.tfvars"
    echo "Drift auto-remediated in dev environment"
```

For production, always require human review before remediation.

## Drift Prevention with AWS Config Rules

Complement Terraform drift detection with cloud-native tools:

```hcl
# aws-config.tf - Detect manual changes via AWS Config
resource "aws_config_configuration_recorder" "main" {
  name     = "terraform-drift-recorder"
  role_arn = aws_iam_role.config_role.arn

  recording_group {
    all_supported = true
  }
}

resource "aws_config_config_rule" "required_tags" {
  name = "required-tags"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key   = "ManagedBy"
    tag1Value = "terraform"
  })

  depends_on = [aws_config_configuration_recorder.main]
}
```

## Summary

Drift detection is essential for maintaining infrastructure integrity. Schedule regular `terraform plan` runs, parse the output programmatically, and alert your team when drift is found. For dev environments, consider auto-remediation. For production, create issues that require human review. The combination of scheduled plans, JSON analysis, and multi-environment checks gives you comprehensive drift visibility.

For a deeper look at scheduling, see our guide on [setting up scheduled Terraform plans for drift detection](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-scheduled-terraform-plans-for-drift-detection/view).
