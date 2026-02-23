# How to Set Up Scheduled Terraform Plans for Drift Detection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Drift Detection, Scheduled Jobs, GitHub Actions, Cron, DevOps

Description: Learn how to configure scheduled Terraform plan runs for continuous drift detection using GitHub Actions cron, GitLab schedules, and AWS EventBridge with Lambda.

---

Running Terraform only when someone pushes code means drift can go undetected for days or weeks. Scheduled plans run automatically at regular intervals, comparing your Terraform configuration against the actual infrastructure state. When something has changed outside of Terraform, you find out quickly instead of during your next deployment.

## Choosing a Schedule Frequency

How often you run drift detection depends on your risk tolerance and pipeline costs:

- **Every hour** - For critical production infrastructure where manual changes are common
- **Every 6 hours** - Good balance for most teams
- **Daily** - Sufficient for stable environments with strict change management
- **Weekly** - Minimum viable drift detection

Consider running more frequently for production and less frequently for development environments.

## GitHub Actions Cron Schedule

GitHub Actions supports cron expressions for scheduling:

```yaml
# .github/workflows/scheduled-drift-check.yml
name: Scheduled Drift Detection

on:
  schedule:
    # Run at 6 AM, 12 PM, and 6 PM UTC every day
    - cron: "0 6,12,18 * * *"

  # Allow manual runs for testing
  workflow_dispatch:

permissions:
  id-token: write
  contents: read
  issues: write

env:
  TF_VERSION: "1.7.0"

jobs:
  drift-check:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component:
          - name: networking
            path: terraform/networking
          - name: compute
            path: terraform/compute
          - name: database
            path: terraform/database
      fail-fast: false

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}
          terraform_wrapper: false

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Run drift check for ${{ matrix.component.name }}
        id: plan
        run: |
          cd ${{ matrix.component.path }}
          terraform init -no-color

          set +e
          terraform plan -detailed-exitcode -no-color 2>&1 | tee plan-output.txt
          EXIT_CODE=${PIPESTATUS[0]}
          set -e

          echo "exit_code=$EXIT_CODE" >> $GITHUB_OUTPUT

          if [ $EXIT_CODE -eq 2 ]; then
            echo "drift=true" >> $GITHUB_OUTPUT
            echo "Drift detected in ${{ matrix.component.name }}"
          elif [ $EXIT_CODE -eq 0 ]; then
            echo "drift=false" >> $GITHUB_OUTPUT
            echo "No drift in ${{ matrix.component.name }}"
          else
            echo "Error running plan for ${{ matrix.component.name }}"
            exit 1
          fi

      - name: Report drift
        if: steps.plan.outputs.drift == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const output = fs.readFileSync(
              '${{ matrix.component.path }}/plan-output.txt', 'utf8'
            );

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Drift detected in ${{ matrix.component.name }} - ${new Date().toISOString().split('T')[0]}`,
              body: `Scheduled drift check found changes in **${{ matrix.component.name }}**.\n\n\`\`\`\n${output.substring(0, 60000)}\n\`\`\``,
              labels: ['drift', '${{ matrix.component.name }}']
            });
```

### GitHub Actions Cron Quirks

A few things to know about GitHub Actions scheduled workflows:

- Schedules use UTC time, not your local timezone
- Scheduled workflows only run on the default branch
- GitHub may delay scheduled runs during high-load periods by up to 15 minutes
- If the repository has no activity for 60 days, scheduled workflows are disabled automatically

```yaml
# Workaround for the 60-day inactivity issue
# Add a workflow that runs monthly to keep the repo active
name: Keep Alive
on:
  schedule:
    - cron: "0 0 1 * *"
jobs:
  keep-alive:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Keeping scheduled workflows alive"
```

## GitLab CI Scheduled Pipelines

GitLab has a dedicated pipeline scheduling feature:

```yaml
# .gitlab-ci.yml
stages:
  - drift-check

drift-detection:
  stage: drift-check
  image: hashicorp/terraform:1.7.0
  rules:
    # Only run on schedules, not on pushes
    - if: $CI_PIPELINE_SOURCE == "schedule"
  script:
    - cd terraform
    - terraform init -no-color

    - |
      set +e
      terraform plan -detailed-exitcode -no-color 2>&1 | tee plan-output.txt
      EXIT_CODE=$?
      set -e

      if [ $EXIT_CODE -eq 2 ]; then
        echo "DRIFT_DETECTED=true" >> drift.env
        # Send notification
        curl -X POST "$SLACK_WEBHOOK" \
          -H "Content-Type: application/json" \
          -d "{\"text\": \"Drift detected in production infrastructure. Check the pipeline: $CI_PIPELINE_URL\"}"
      fi
  artifacts:
    paths:
      - terraform/plan-output.txt
    reports:
      dotenv: drift.env
    expire_in: 7 days
```

Set up the schedule in GitLab:

1. Go to CI/CD > Schedules
2. Click "New schedule"
3. Set the cron expression (e.g., `0 */6 * * *` for every 6 hours)
4. Select the target branch
5. Optionally add variables like `ENVIRONMENT=production`

## AWS EventBridge with Lambda

For a cloud-native approach, use EventBridge to trigger drift checks via Lambda and CodeBuild:

```hcl
# scheduled-drift.tf - Trigger drift checks via EventBridge
resource "aws_cloudwatch_event_rule" "drift_check" {
  name                = "terraform-drift-check"
  description         = "Run Terraform drift detection every 6 hours"
  schedule_expression = "rate(6 hours)"
}

resource "aws_cloudwatch_event_target" "codebuild" {
  rule     = aws_cloudwatch_event_rule.drift_check.name
  arn      = aws_codebuild_project.drift_check.arn
  role_arn = aws_iam_role.eventbridge_codebuild.arn
}

resource "aws_codebuild_project" "drift_check" {
  name         = "terraform-drift-check"
  service_role = aws_iam_role.codebuild_terraform.arn

  source {
    type            = "GITHUB"
    location        = "https://github.com/myorg/infrastructure.git"
    git_clone_depth = 1
    buildspec       = "buildspec-drift.yml"
  }

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    image        = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type         = "LINUX_CONTAINER"
  }
}
```

```yaml
# buildspec-drift.yml
version: 0.2

env:
  variables:
    TF_VERSION: "1.7.0"

phases:
  install:
    commands:
      - wget -q https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip
      - unzip -o terraform_${TF_VERSION}_linux_amd64.zip -d /usr/local/bin/

  build:
    commands:
      - cd terraform
      - terraform init -no-color
      - |
        set +e
        terraform plan -detailed-exitcode -no-color 2>&1 | tee plan-output.txt
        EXIT_CODE=$?
        set -e

        if [ $EXIT_CODE -eq 2 ]; then
          # Publish to SNS for notifications
          aws sns publish \
            --topic-arn arn:aws:sns:us-east-1:123456789012:drift-alerts \
            --subject "Terraform Drift Detected" \
            --message file://plan-output.txt
        fi
```

## Storing Drift History

Track drift over time by storing results in a database or S3:

```yaml
# Store drift check results in S3 for historical tracking
- name: Store drift result
  run: |
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    RESULT_FILE="drift-results/${TIMESTAMP}.json"

    # Create a JSON report
    cat > /tmp/drift-result.json <<EOF
    {
      "timestamp": "$TIMESTAMP",
      "component": "${{ matrix.component.name }}",
      "drift_detected": ${{ steps.plan.outputs.drift }},
      "exit_code": ${{ steps.plan.outputs.exit_code }},
      "commit": "${{ github.sha }}"
    }
    EOF

    aws s3 cp /tmp/drift-result.json \
      "s3://mycompany-drift-reports/$RESULT_FILE"
```

## Building a Drift Dashboard

Use the stored drift data to build a simple dashboard:

```python
# drift_dashboard.py - Generate drift metrics from S3 data
import boto3
import json
from datetime import datetime, timedelta

s3 = boto3.client('s3')

def get_drift_stats(days=30):
    """Calculate drift statistics for the last N days."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    results = []

    # List all drift check results
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket='mycompany-drift-reports', Prefix='drift-results/'):
        for obj in page.get('Contents', []):
            response = s3.get_object(Bucket='mycompany-drift-reports', Key=obj['Key'])
            result = json.loads(response['Body'].read())

            check_time = datetime.fromisoformat(result['timestamp'].replace('Z', '+00:00'))
            if check_time.replace(tzinfo=None) > cutoff:
                results.append(result)

    total_checks = len(results)
    drift_checks = sum(1 for r in results if r['drift_detected'])

    print(f"Drift Statistics (last {days} days)")
    print(f"  Total checks: {total_checks}")
    print(f"  Drift detected: {drift_checks}")
    print(f"  Drift rate: {drift_checks/total_checks*100:.1f}%")

    # Break down by component
    components = set(r['component'] for r in results)
    for comp in sorted(components):
        comp_results = [r for r in results if r['component'] == comp]
        comp_drift = sum(1 for r in comp_results if r['drift_detected'])
        print(f"  {comp}: {comp_drift}/{len(comp_results)} checks with drift")

if __name__ == "__main__":
    get_drift_stats()
```

## Reducing Noise

Scheduled drift checks can generate a lot of alerts if your infrastructure has expected drift sources. Filter out known noise:

```bash
# Filter out expected drift from plan output
terraform plan -detailed-exitcode -no-color -out=driftcheck.tfplan 2>&1 | \
  grep -v "aws_autoscaling_group.*.desired_capacity" | \
  grep -v "aws_ecs_service.*.desired_count" | \
  tee filtered-plan-output.txt
```

Or use a targeted plan that only checks specific resources:

```bash
# Only check specific resources for drift
terraform plan -detailed-exitcode -no-color \
  -target=aws_security_group.main \
  -target=aws_db_instance.primary \
  -target=aws_iam_role.app
```

## Summary

Scheduled Terraform plans are the backbone of drift detection. They run automatically, compare your code against reality, and alert you when something has changed. Start with a daily cron job and adjust the frequency based on how often drift actually occurs. Store the results for historical tracking, and filter out expected noise to keep alerts actionable.

For the full drift detection picture, see our guide on [implementing drift detection in Terraform CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-drift-detection-in-terraform-cicd/view).
