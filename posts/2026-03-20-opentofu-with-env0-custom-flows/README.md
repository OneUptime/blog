# How to Use OpenTofu with env0 Custom Flows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, env0, Custom Flows, CI/CD, GitOps, Workflow Automation

Description: Learn how to create custom deployment flows in env0 for OpenTofu that add approval gates, custom steps, notifications, and post-deployment validation.

## Introduction

env0 Custom Flows let you extend the standard OpenTofu plan/apply workflow with additional steps: custom approvals, integration tests, notifications, and conditional logic based on the plan output or environment type.

## Defining a Custom Flow

Custom Flows are defined in an `env0.yml` (or `env0.yaml`) file placed in the template folder, the repository root, or a custom-flow repository configured at the project level. The file uses predefined steps (`terraformInit`, `terraformPlan`, `terraformApply`, `storeState`, `terraformOutput`) and you attach your own shell commands via `before:` and `after:` hooks. Step names use the `terraform*` prefix even when the underlying binary is OpenTofu.

```yaml
# env0.yml

version: 2
shell: bash

deploy:
  steps:
    terraformInit:
      before:
        - |
          echo "Running pre-init validation..."
          # Check that required variables are set
          if [ -z "$TF_VAR_certificate_arn" ]; then
            echo "ERROR: certificate_arn is required for production"
            exit 1
          fi

    terraformPlan:
      after:
        - checkov -d . --framework terraform --quiet
        - tfsec . --minimum-severity HIGH

    terraformApply:
      after:
        - |
          # Wait for services to be healthy
          sleep 30
          ./scripts/smoke-test.sh

  onFailure:
    - echo "Deployment failed for $ENV0_ENVIRONMENT_NAME (deployment $ENV0_DEPLOYMENT_LOG_ID)"
```

If any command in a hook returns a non-zero exit code, env0 stops the deployment with a `Failed` status. Manual approval gates and cost-estimation thresholds aren't expressed as YAML steps - they're configured separately via env0's Approval Policies and Cost Estimation features in the UI or API.

## Environment-Specific Flow Variations

An `env0.yml` file applies to the template (or repo) it lives in, so the most common way to vary flows per environment is to point each environment at a different template folder. When environments share a template, you can branch on the `ENV0_ENVIRONMENT_NAME` variable inside hooks:

```yaml
version: 2
shell: bash

deploy:
  steps:
    terraformPlan:
      before:
        - |
          if [ "$ENV0_ENVIRONMENT_NAME" = "staging" ]; then
            ./scripts/pre-deploy-tests.sh
          fi
```

Auto-apply (skipping the manual approval between plan and apply) is a per-environment template setting in env0, not a field in `env0.yml`.

## Custom Variables in Flows

`env0.yml` doesn't have a top-level `variables:` section - environment and Terraform variables are managed in the env0 UI, API, or Terraform provider. To inject dynamic values that are computed at deploy time, export them as `TF_VAR_*` environment variables in a `before:` hook ahead of `terraformPlan`:

```yaml
version: 2
shell: bash

deploy:
  steps:
    terraformPlan:
      before:
        - export TF_VAR_deploy_timestamp=$(date -u +%Y%m%d%H%M%S)
        - export TF_VAR_git_sha=$ENV0_COMMIT_SHA
        - export TF_VAR_deployer=$ENV0_REQUESTED_BY_USER_NAME
```

env0 exposes a number of built-in variables you can reference in hook commands, including `ENV0_ENVIRONMENT_NAME`, `ENV0_DEPLOYMENT_LOG_ID`, `ENV0_COMMIT_SHA`, and `ENV0_PROJECT_NAME`.

## Drift Remediation Flow

Drift detection in env0 is configured at the environment level (schedule, scope, and notifications). When drift is detected, env0 can either alert you or trigger a remediation deployment, which runs the same `env0.yml` as a normal deploy. To send a Slack notification on success or failure, hook into the deployment lifecycle:

```yaml
version: 2
shell: bash

deploy:
  onSuccess:
    - |
      curl -X POST "$SLACK_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"Remediation succeeded for $ENV0_ENVIRONMENT_NAME\"}"
  onFailure:
    - |
      curl -X POST "$SLACK_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"Remediation failed for $ENV0_ENVIRONMENT_NAME\"}"
```

Manual approval between drift detection and remediation is enforced through env0's Approval Policies on the environment, not as a YAML step.

## Conclusion

env0 Custom Flows transform the standard OpenTofu workflow into a fully customized deployment pipeline. The multi-step approach with approval gates, security scanning, cost checks, and post-deployment validation creates a production-grade deployment process without maintaining a separate CI/CD system for infrastructure changes.
