# How to Use OpenTofu with GitLab CI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, GitLab CI, CI/CD, Infrastructure as Code, DevOps

Description: A complete guide to setting up OpenTofu with GitLab CI for automated infrastructure deployment, covering pipeline configuration, merge request plans, environment protection, and caching strategies.

---

GitLab CI has strong built-in support for infrastructure-as-code workflows. Its native environment management, manual approval gates, and artifact system make it well-suited for OpenTofu pipelines. This guide walks through setting up a production-ready pipeline from scratch.

## Basic Pipeline Setup

Create a `.gitlab-ci.yml` file in your repository root:

```yaml
# .gitlab-ci.yml
image: ghcr.io/opentofu/opentofu:1.8.0

variables:
  TF_ROOT: "infrastructure"
  TF_STATE_NAME: "production"

stages:
  - validate
  - plan
  - apply

cache:
  key: opentofu-plugins
  paths:
    - ${TF_ROOT}/.terraform/

before_script:
  - cd ${TF_ROOT}
  - tofu init

validate:
  stage: validate
  script:
    - tofu fmt -check -recursive
    - tofu validate
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

plan:
  stage: plan
  script:
    - tofu plan -out=plan.bin
    - tofu show -no-color plan.bin > plan.txt
  artifacts:
    paths:
      - ${TF_ROOT}/plan.bin
      - ${TF_ROOT}/plan.txt
    reports:
      terraform: ${TF_ROOT}/plan.json
    expire_in: 7 days
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

apply:
  stage: apply
  script:
    - tofu apply -auto-approve plan.bin
  dependencies:
    - plan
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
  environment:
    name: production
```

## Authentication Configuration

### AWS with OIDC

GitLab supports OIDC for AWS authentication:

```yaml
# Configure AWS OIDC in .gitlab-ci.yml
variables:
  AWS_ROLE_ARN: "arn:aws:iam::123456789012:role/GitLabOpenTofu"
  AWS_DEFAULT_REGION: "us-east-1"

.aws_auth:
  id_tokens:
    GITLAB_OIDC_TOKEN:
      aud: https://gitlab.com
  before_script:
    - >
      STS=$(aws sts assume-role-with-web-identity
      --role-arn ${AWS_ROLE_ARN}
      --role-session-name "gitlab-${CI_PROJECT_ID}-${CI_PIPELINE_ID}"
      --web-identity-token ${GITLAB_OIDC_TOKEN}
      --duration-seconds 3600)
    - export AWS_ACCESS_KEY_ID=$(echo $STS | jq -r '.Credentials.AccessKeyId')
    - export AWS_SECRET_ACCESS_KEY=$(echo $STS | jq -r '.Credentials.SecretAccessKey')
    - export AWS_SESSION_TOKEN=$(echo $STS | jq -r '.Credentials.SessionToken')
```

### AWS with CI/CD Variables

For simpler setups, use GitLab CI/CD variables:

```bash
# Add variables in GitLab UI (Settings > CI/CD > Variables)
# AWS_ACCESS_KEY_ID (masked)
# AWS_SECRET_ACCESS_KEY (masked)
# AWS_DEFAULT_REGION
```

### Azure with Service Principal

```yaml
variables:
  ARM_CLIENT_ID: ${AZURE_CLIENT_ID}
  ARM_CLIENT_SECRET: ${AZURE_CLIENT_SECRET}
  ARM_SUBSCRIPTION_ID: ${AZURE_SUBSCRIPTION_ID}
  ARM_TENANT_ID: ${AZURE_TENANT_ID}
```

### Google Cloud with Service Account

```yaml
before_script:
  - echo ${GCP_SERVICE_ACCOUNT_KEY} > /tmp/gcp-key.json
  - export GOOGLE_APPLICATION_CREDENTIALS="/tmp/gcp-key.json"
```

## Merge Request Plans

Show the plan output directly in merge requests:

```yaml
plan:
  stage: plan
  script:
    - tofu plan -out=plan.bin
    - tofu show -json plan.bin > plan.json
    - tofu show -no-color plan.bin > plan.txt
  artifacts:
    paths:
      - ${TF_ROOT}/plan.bin
    reports:
      terraform: ${TF_ROOT}/plan.json
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

GitLab natively renders Terraform plan reports in the merge request widget when you use the `reports:terraform` artifact. This works with OpenTofu because the plan JSON format is compatible.

To generate the JSON plan:

```bash
# Generate JSON plan for GitLab's MR widget
tofu show -json plan.bin | jq '.' > plan.json
```

## Multi-Environment Pipeline

Handle staging and production deployments:

```yaml
# .gitlab-ci.yml
image: ghcr.io/opentofu/opentofu:1.8.0

stages:
  - validate
  - plan-staging
  - apply-staging
  - plan-production
  - apply-production

variables:
  TF_ROOT: "infrastructure"

.tofu_init:
  before_script:
    - cd ${TF_ROOT}
    - tofu init -backend-config="environments/${ENVIRONMENT}/backend.hcl"

validate:
  stage: validate
  before_script:
    - cd ${TF_ROOT}
    - tofu init -backend=false
  script:
    - tofu fmt -check -recursive
    - tofu validate

# Staging
plan-staging:
  stage: plan-staging
  extends: .tofu_init
  variables:
    ENVIRONMENT: staging
  script:
    - tofu plan -var-file="environments/staging/terraform.tfvars" -out=plan.bin
    - tofu show -json plan.bin > plan.json
  artifacts:
    paths:
      - ${TF_ROOT}/plan.bin
    reports:
      terraform: ${TF_ROOT}/plan.json
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

apply-staging:
  stage: apply-staging
  extends: .tofu_init
  variables:
    ENVIRONMENT: staging
  script:
    - tofu apply -auto-approve plan.bin
  dependencies:
    - plan-staging
  environment:
    name: staging
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# Production
plan-production:
  stage: plan-production
  extends: .tofu_init
  variables:
    ENVIRONMENT: production
  script:
    - tofu plan -var-file="environments/production/terraform.tfvars" -out=plan.bin
    - tofu show -json plan.bin > plan.json
  artifacts:
    paths:
      - ${TF_ROOT}/plan.bin
    reports:
      terraform: ${TF_ROOT}/plan.json
  needs:
    - apply-staging
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

apply-production:
  stage: apply-production
  extends: .tofu_init
  variables:
    ENVIRONMENT: production
  script:
    - tofu apply -auto-approve plan.bin
  dependencies:
    - plan-production
  environment:
    name: production
  when: manual
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

## Using GitLab-Managed Terraform State

GitLab has a built-in HTTP backend for Terraform state. It works with OpenTofu too:

```hcl
# backend.tf
terraform {
  backend "http" {
    address        = "https://gitlab.com/api/v4/projects/${PROJECT_ID}/terraform/state/${STATE_NAME}"
    lock_address   = "https://gitlab.com/api/v4/projects/${PROJECT_ID}/terraform/state/${STATE_NAME}/lock"
    unlock_address = "https://gitlab.com/api/v4/projects/${PROJECT_ID}/terraform/state/${STATE_NAME}/lock"
    lock_method    = "POST"
    unlock_method  = "DELETE"
    retry_wait_min = 5
  }
}
```

```yaml
# .gitlab-ci.yml
variables:
  TF_STATE_NAME: "production"
  TF_ADDRESS: "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/terraform/state/${TF_STATE_NAME}"

before_script:
  - cd ${TF_ROOT}
  - |
    tofu init \
      -backend-config="address=${TF_ADDRESS}" \
      -backend-config="lock_address=${TF_ADDRESS}/lock" \
      -backend-config="unlock_address=${TF_ADDRESS}/lock" \
      -backend-config="username=gitlab-ci-token" \
      -backend-config="password=${CI_JOB_TOKEN}" \
      -backend-config="lock_method=POST" \
      -backend-config="unlock_method=DELETE" \
      -backend-config="retry_wait_min=5"
```

## Caching Strategies

Cache provider plugins to speed up pipeline runs:

```yaml
cache:
  key:
    files:
      - ${TF_ROOT}/.terraform.lock.hcl
  paths:
    - ${TF_ROOT}/.terraform/providers/

# Or use a global cache
cache:
  key: opentofu-${CI_COMMIT_REF_SLUG}
  paths:
    - ${TF_ROOT}/.terraform/
  policy: pull-push
```

## Scheduled Drift Detection

```yaml
drift-check:
  stage: validate
  script:
    - cd ${TF_ROOT}
    - tofu init
    - |
      tofu plan -detailed-exitcode -no-color > drift.txt 2>&1
      EXIT=$?
      if [ $EXIT -eq 2 ]; then
        echo "DRIFT DETECTED"
        cat drift.txt
        exit 1
      fi
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
  allow_failure: false
```

Configure the schedule in GitLab (CI/CD > Schedules) to run daily.

## Protected Environments

Configure environment protection in GitLab:

1. Go to Settings > CI/CD > Protected Environments
2. Add "production" as a protected environment
3. Set allowed deployers (specific users or groups)
4. Enable required approvals

This ensures only authorized personnel can trigger the production apply job.

## Custom Docker Image

For faster pipeline starts, build a custom image with OpenTofu pre-installed:

```dockerfile
# Dockerfile
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    jq \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install OpenTofu
ARG OPENTOFU_VERSION=1.8.0
RUN curl -LO "https://github.com/opentofu/opentofu/releases/download/v${OPENTOFU_VERSION}/tofu_${OPENTOFU_VERSION}_linux_amd64.zip" \
    && unzip "tofu_${OPENTOFU_VERSION}_linux_amd64.zip" -d /usr/local/bin/ \
    && rm "tofu_${OPENTOFU_VERSION}_linux_amd64.zip"

# Install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws

ENTRYPOINT [""]
```

```yaml
# Use your custom image
image: registry.gitlab.com/myorg/opentofu-runner:latest
```

GitLab CI provides a mature platform for OpenTofu automation. The native Terraform state management, merge request integration, and environment protection features make it a strong choice for teams already using GitLab.

For working with Terragrunt alongside OpenTofu, see [How to Use OpenTofu with Terragrunt](https://oneuptime.com/blog/post/2026-02-23-use-opentofu-with-terragrunt/view).
