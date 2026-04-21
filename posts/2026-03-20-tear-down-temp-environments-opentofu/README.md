# How to Tear Down Temporary Environments with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ephemeral Environments, Teardown, CI/CD, Cost Optimization, Infrastructure as Code

Description: Learn how to safely tear down temporary OpenTofu environments using automated destroy workflows, state cleanup, and cost-prevention guardrails.

---

Temporary environments - PR previews, spike testing environments, performance test environments - accumulate quickly and become expensive if not destroyed. OpenTofu makes teardown as easy as creation, but it requires proper workflows and guardrails to avoid destroying the wrong environment.

## Safe Destroy Workflow

```bash
# Always plan destroy first to review what will be deleted

tofu plan -destroy -out=destroy.tfplan

# Review the plan carefully
tofu show destroy.tfplan

# Apply the destroy
tofu apply destroy.tfplan
```

## Automated PR Environment Cleanup

```yaml
# .github/workflows/cleanup-preview.yml
name: Cleanup Preview Environment
on:
  pull_request:
    types: [closed]  # Trigger when PR is merged or closed

permissions:
  id-token: write
  contents: read

jobs:
  destroy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: us-east-1

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Initialize OpenTofu
        run: tofu init -input=false
        working-directory: infrastructure

      - name: Select workspace
        run: |
          WORKSPACE="pr-${{ github.event.pull_request.number }}"
          tofu workspace select "$WORKSPACE"
        working-directory: infrastructure

      - name: Destroy preview environment
        run: tofu destroy -auto-approve -input=false
        working-directory: infrastructure

      - name: Remove workspace
        run: |
          WORKSPACE="pr-${{ github.event.pull_request.number }}"
          tofu workspace select default
          tofu workspace delete "$WORKSPACE"
        working-directory: infrastructure
```

## Scheduled Cleanup for Orphaned Environments

```hcl
# scheduled_cleanup.tf
# Lambda function to find and destroy stale environments
resource "aws_lambda_function" "cleanup_stale" {
  function_name = "cleanup-stale-environments"
  filename      = data.archive_file.cleanup.output_path
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.cleanup.arn
  timeout       = 300

  environment {
    variables = {
      # Destroy environments older than 7 days without recent activity
      MAX_AGE_DAYS = "7"
      TAG_KEY      = "EnvironmentType"
      TAG_VALUE    = "ephemeral"
    }
  }
}

# Run cleanup every night at midnight UTC
resource "aws_cloudwatch_event_rule" "nightly_cleanup" {
  name                = "cleanup-ephemeral-environments"
  schedule_expression = "cron(0 0 * * ? *)"
}

resource "aws_cloudwatch_event_target" "cleanup_lambda" {
  rule      = aws_cloudwatch_event_rule.nightly_cleanup.name
  target_id = "cleanup-lambda"
  arn       = aws_lambda_function.cleanup_stale.arn
}

resource "aws_lambda_permission" "allow_eventbridge_cleanup" {
  statement_id  = "AllowExecutionFromEventBridgeCleanup"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cleanup_stale.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.nightly_cleanup.arn
}
```

## Protecting Permanent Resources from Accidental Destroy

```hcl
# protections.tf
# Tag resources to indicate if they're part of a temporary environment
locals {
  is_ephemeral = var.environment_type == "ephemeral"
}

# Add lifecycle protection to permanent resources
resource "aws_s3_bucket" "permanent_data" {
  bucket = "permanent-data-bucket"

  lifecycle {
    prevent_destroy = !local.is_ephemeral
  }
}
```

## Cost Budget Alert for Temporary Environments

```hcl
# cost_control.tf
# Alert if a temp environment exceeds $50 per month
resource "aws_budgets_budget" "temp_env" {
  name         = "temp-env-pr-${var.pr_number}-budget"
  budget_type  = "COST"
  limit_amount = "50"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = [format("user:PRNumber$%s", var.pr_number)]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.ops_email]
  }
}
```

## Best Practices

- Always tag ephemeral resources with `EnvironmentType = "ephemeral"` and `PRNumber = "<number>"` for automated cleanup.
- Run `tofu plan -destroy` and review before applying destroy - separately check tagged cloud resources for orphaned objects not in state.
- Activate the `PRNumber` cost allocation tag and set AWS Budgets alerts for ephemeral environments to catch runaway costs early.
- Keep destroy logs or backend state version history after destroy long enough (7+ days) to debug any issues with cleanup.
- Remove workspace state after destroy to prevent confusion - `tofu workspace delete` after `tofu destroy`.
