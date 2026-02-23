# How to Implement Manual Approval Gates for Terraform Apply

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Approval Gates, GitHub Actions, DevOps, Infrastructure as Code

Description: Learn how to implement manual approval gates before Terraform apply in CI/CD pipelines using GitHub Actions environments, GitLab manual jobs, and AWS CodePipeline approvals.

---

Automated Terraform applies are great for speed, but production infrastructure changes need a human in the loop. Manual approval gates let your team review the plan output and explicitly approve before any changes hit your infrastructure. This guide covers how to set up approval gates across the most common CI/CD platforms.

## Why Manual Approvals Matter

A single `terraform apply` can delete a database, remove a load balancer, or change security group rules. Even with good code review on the pull request, you want a final checkpoint where someone confirms the plan looks right before execution.

Manual approvals also create an audit trail. You can see who approved what change and when, which is essential for compliance frameworks like SOC 2 and ISO 27001.

## GitHub Actions with Environments

GitHub Actions environments are the cleanest way to implement approval gates. You create an environment with required reviewers, and any job targeting that environment will pause until someone approves it.

### Step 1: Create the Environment

Go to your repository Settings > Environments > New environment. Create an environment called `production` and add required reviewers.

You can also configure this with the GitHub API:

```bash
# Create environment with required reviewers using gh CLI
gh api repos/myorg/infrastructure/environments/production \
  --method PUT \
  --field wait_timer=0 \
  --field reviewers='[{"type":"Team","id":12345}]'
```

### Step 2: Configure the Workflow

```yaml
# .github/workflows/terraform.yml
name: Terraform Deploy

on:
  push:
    branches: [main]

jobs:
  plan:
    runs-on: ubuntu-latest
    outputs:
      has_changes: ${{ steps.plan.outputs.has_changes }}

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

      - name: Terraform Init and Plan
        id: plan
        run: |
          cd terraform
          terraform init -no-color
          terraform plan -no-color -out=tfplan -detailed-exitcode 2>&1 | tee plan.txt

          # Exit code 2 means there are changes to apply
          if [ ${PIPESTATUS[0]} -eq 2 ]; then
            echo "has_changes=true" >> $GITHUB_OUTPUT
          else
            echo "has_changes=false" >> $GITHUB_OUTPUT
          fi

      - name: Upload plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: |
            terraform/tfplan
            terraform/plan.txt

  # This job requires manual approval
  apply:
    needs: plan
    if: needs.plan.outputs.has_changes == 'true'
    runs-on: ubuntu-latest
    environment: production  # This triggers the approval gate

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

      - name: Download plan
        uses: actions/download-artifact@v4
        with:
          name: tfplan
          path: terraform

      - name: Terraform Apply
        run: |
          cd terraform
          terraform init -no-color
          terraform apply -no-color -auto-approve tfplan
```

When this workflow runs, the plan job completes immediately, but the apply job shows a "Waiting for review" status. Configured reviewers get a notification and can approve or reject from the GitHub UI.

## GitLab CI Manual Jobs

GitLab CI has a built-in `when: manual` keyword that pauses a job until someone clicks a button in the UI:

```yaml
# .gitlab-ci.yml
stages:
  - plan
  - approve
  - apply

variables:
  TF_ROOT: "terraform"

plan:
  stage: plan
  image: hashicorp/terraform:1.7.0
  script:
    - cd $TF_ROOT
    - terraform init -no-color
    - terraform plan -no-color -out=tfplan
    - terraform show -no-color tfplan > plan.txt
  artifacts:
    paths:
      - $TF_ROOT/tfplan
      - $TF_ROOT/plan.txt
    expire_in: 7 days
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# Gate with specific approvers
approve:
  stage: approve
  script:
    - echo "Approved by $GITLAB_USER_LOGIN at $(date)"
  when: manual
  allow_failure: false  # Block the apply stage until this is approved
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

apply:
  stage: apply
  image: hashicorp/terraform:1.7.0
  script:
    - cd $TF_ROOT
    - terraform init -no-color
    - terraform apply -no-color -auto-approve tfplan
  dependencies:
    - plan
  needs:
    - plan
    - approve  # Waits for manual approval
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

For more granular control, use GitLab's protected environments feature to restrict who can approve:

```yaml
# In project settings, configure "production" as a protected environment
# with specific users or groups who can approve

apply:
  stage: apply
  environment:
    name: production
  when: manual
```

## AWS CodePipeline Manual Approval

AWS CodePipeline has a native manual approval action:

```hcl
# pipeline.tf - CodePipeline with approval stage
resource "aws_codepipeline" "terraform" {
  name     = "terraform-deploy"
  role_arn = aws_iam_role.pipeline.arn

  # ... source and plan stages ...

  stage {
    name = "Approval"

    action {
      name     = "ApproveApply"
      category = "Approval"
      owner    = "AWS"
      provider = "Manual"
      version  = "1"

      configuration = {
        # Send notification to SNS topic
        NotificationArn = aws_sns_topic.approvals.arn

        # Custom message with link to plan output
        CustomData = "Review the Terraform plan in the Plan stage logs before approving."

        # Optional: external URL for reviewers
        ExternalEntityLink = "https://console.aws.amazon.com/codesuite/codebuild/projects/terraform-plan/build/${var.build_id}"
      }
    }
  }

  stage {
    name = "Apply"
    # ... apply action ...
  }
}

# SNS topic for approval notifications
resource "aws_sns_topic" "approvals" {
  name = "terraform-approvals"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.approvals.arn
  protocol  = "email"
  endpoint  = "infra-team@mycompany.com"
}
```

## Azure DevOps Approval Gates

Azure DevOps pipelines support environment-based approvals:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

stages:
  - stage: Plan
    jobs:
      - job: TerraformPlan
        pool:
          vmImage: ubuntu-latest
        steps:
          - task: TerraformInstaller@1
            inputs:
              terraformVersion: 1.7.0

          - script: |
              cd terraform
              terraform init -no-color
              terraform plan -no-color -out=tfplan
            displayName: "Terraform Plan"

          - publish: terraform/tfplan
            artifact: terraform-plan

  - stage: Apply
    dependsOn: Plan
    jobs:
      - deployment: TerraformApply
        environment: production  # Requires approval configured in Azure DevOps
        pool:
          vmImage: ubuntu-latest
        strategy:
          runOnce:
            deploy:
              steps:
                - download: current
                  artifact: terraform-plan

                - script: |
                    cd terraform
                    terraform init -no-color
                    terraform apply -no-color -auto-approve $(Pipeline.Workspace)/terraform-plan/tfplan
                  displayName: "Terraform Apply"
```

## Slack-Based Approvals

For teams that live in Slack, you can build a custom approval flow using Slack interactive messages:

```python
# approve_bot.py - Slack bot for Terraform approvals
import os
import json
from slack_sdk import WebClient
from slack_sdk.webhook import WebhookClient

def request_approval(plan_summary, pipeline_url, run_id):
    """Send an approval request to Slack with approve/reject buttons."""
    client = WebClient(token=os.environ["SLACK_BOT_TOKEN"])

    client.chat_postMessage(
        channel="#infrastructure-approvals",
        text=f"Terraform apply requested for run {run_id}",
        blocks=[
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Terraform Apply Request*\n\n```{plan_summary}```"
                }
            },
            {
                "type": "actions",
                "block_id": f"approval_{run_id}",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Approve"},
                        "style": "primary",
                        "action_id": "approve_terraform",
                        "value": run_id
                    },
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Reject"},
                        "style": "danger",
                        "action_id": "reject_terraform",
                        "value": run_id
                    }
                ]
            }
        ]
    )
```

## Time-Based Auto-Approval

Some teams want approvals for production but auto-approval for dev environments after a waiting period:

```yaml
# GitHub Actions with conditional approval
jobs:
  apply-dev:
    environment:
      name: dev
      # No required reviewers - auto-approves after 0 minutes

  apply-staging:
    environment:
      name: staging
      # Wait timer of 10 minutes, then auto-approve

  apply-production:
    environment:
      name: production
      # Requires manual approval from team leads
```

## Best Practices

1. **Show the plan in the approval request** - Approvers need to see what they are approving without digging through CI logs.
2. **Limit who can approve** - Not everyone on the team should be able to approve production changes.
3. **Set approval timeouts** - Plans go stale. Set a 24-hour timeout on approvals so stale plans do not get applied days later.
4. **Require re-approval on plan changes** - If the plan changes after approval (because of state drift or concurrent changes), require a new approval.
5. **Log everything** - Record who approved, when, and the plan that was approved for audit purposes.

## Summary

Manual approval gates add a critical safety layer to Terraform CI/CD. Every major CI/CD platform supports them in some form, whether through GitHub environments, GitLab manual jobs, or AWS CodePipeline approval actions. The key is making the plan output visible to approvers and keeping the approval window short enough that plans do not go stale.

For related reading, check out our guides on [implementing plan and apply stages](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-plan-and-apply-stages-in-cicd-for-terraform/view) and [handling Terraform CI/CD pipeline failures](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-cicd-pipeline-failures/view).
