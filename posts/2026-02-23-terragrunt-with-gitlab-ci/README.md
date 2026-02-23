# How to Use Terragrunt with GitLab CI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, GitLab CI, CI/CD, DevOps, Infrastructure as Code

Description: A step-by-step guide to integrating Terragrunt into GitLab CI pipelines with automated plans, merge request comments, manual approval gates, and multi-environment deployments.

---

GitLab CI is a natural fit for Terragrunt workflows, especially if your organization is already using GitLab for source control. Its built-in environments, manual approval gates, and artifact system map well to infrastructure deployment pipelines. In this post, we'll build a full GitLab CI pipeline for Terragrunt from scratch.

## Project Setup

Your GitLab repository should have a structure like this:

```
infrastructure/
  terragrunt.hcl             # Root config
  dev/
    env.hcl
    us-east-1/
      region.hcl
      vpc/
        terragrunt.hcl
      ecs/
        terragrunt.hcl
  staging/
    env.hcl
    us-east-1/
      region.hcl
      vpc/
        terragrunt.hcl
  prod/
    env.hcl
    us-east-1/
      region.hcl
      vpc/
        terragrunt.hcl
.gitlab-ci.yml
```

## Docker Image

First, create a Docker image with Terraform and Terragrunt pre-installed, or use existing community images:

```dockerfile
# Dockerfile.ci
FROM hashicorp/terraform:1.7.0

# Install Terragrunt
ARG TERRAGRUNT_VERSION=0.55.0
RUN wget -q "https://github.com/gruntwork-io/terragrunt/releases/download/v${TERRAGRUNT_VERSION}/terragrunt_linux_amd64" \
    -O /usr/local/bin/terragrunt && \
    chmod +x /usr/local/bin/terragrunt

# Install additional tools
RUN apk add --no-cache bash curl jq git

ENTRYPOINT ["/bin/bash"]
```

Build and push this to your GitLab Container Registry:

```bash
docker build -f Dockerfile.ci -t registry.gitlab.com/your-group/infra-tools:latest .
docker push registry.gitlab.com/your-group/infra-tools:latest
```

## Basic Pipeline Configuration

Here's a complete `.gitlab-ci.yml` for Terragrunt:

```yaml
# .gitlab-ci.yml

image: registry.gitlab.com/your-group/infra-tools:latest

# Cache Terraform providers across pipeline runs
cache:
  key: terraform-plugins
  paths:
    - .terraform-plugin-cache/

variables:
  TF_IN_AUTOMATION: "true"
  TF_INPUT: "false"
  TF_PLUGIN_CACHE_DIR: "$CI_PROJECT_DIR/.terraform-plugin-cache"
  TERRAGRUNT_NON_INTERACTIVE: "true"

# Define the pipeline stages
stages:
  - validate
  - plan
  - apply

# Run before every job
before_script:
  - mkdir -p "$TF_PLUGIN_CACHE_DIR"
  - terraform --version
  - terragrunt --version

# --------------------------------------------------
# Validate stage - runs on all merge requests
# --------------------------------------------------
validate:
  stage: validate
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      changes:
        - infrastructure/**/*
  script:
    - cd infrastructure
    - terragrunt run-all validate --terragrunt-non-interactive

# --------------------------------------------------
# Plan stage - runs on merge requests
# --------------------------------------------------
plan:dev:
  stage: plan
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      changes:
        - infrastructure/**/*
  script:
    - cd infrastructure/dev
    - terragrunt run-all plan --terragrunt-non-interactive -no-color 2>&1 | tee plan-output.txt
  artifacts:
    paths:
      - infrastructure/dev/plan-output.txt
    expire_in: 7 days
  after_script:
    # Post plan output as MR note
    - |
      PLAN=$(cat infrastructure/dev/plan-output.txt | head -c 60000)
      BODY=$(cat <<HEREDOC
      ## Dev Environment Plan

      \`\`\`
      $PLAN
      \`\`\`
      HEREDOC
      )
      curl --request POST \
        --header "PRIVATE-TOKEN: ${GITLAB_API_TOKEN}" \
        --header "Content-Type: application/json" \
        --data "$(jq -n --arg body "$BODY" '{body: $body}')" \
        "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/notes"

plan:staging:
  stage: plan
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      changes:
        - infrastructure/**/*
  script:
    - cd infrastructure/staging
    - terragrunt run-all plan --terragrunt-non-interactive -no-color 2>&1 | tee plan-output.txt
  artifacts:
    paths:
      - infrastructure/staging/plan-output.txt
    expire_in: 7 days

plan:prod:
  stage: plan
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      changes:
        - infrastructure/**/*
  script:
    - cd infrastructure/prod
    - terragrunt run-all plan --terragrunt-non-interactive -no-color 2>&1 | tee plan-output.txt
  artifacts:
    paths:
      - infrastructure/prod/plan-output.txt
    expire_in: 7 days

# --------------------------------------------------
# Apply stage - runs on merge to main
# --------------------------------------------------
apply:dev:
  stage: apply
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      changes:
        - infrastructure/**/*
  environment:
    name: dev
  script:
    - cd infrastructure/dev
    - terragrunt run-all apply --terragrunt-non-interactive -auto-approve -no-color

apply:staging:
  stage: apply
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      changes:
        - infrastructure/**/*
  environment:
    name: staging
  needs: ["apply:dev"]    # Deploy to staging only after dev succeeds
  script:
    - cd infrastructure/staging
    - terragrunt run-all apply --terragrunt-non-interactive -auto-approve -no-color

apply:prod:
  stage: apply
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      changes:
        - infrastructure/**/*
  environment:
    name: production
  needs: ["apply:staging"]
  when: manual              # Require manual click for production
  allow_failure: false
  script:
    - cd infrastructure/prod
    - terragrunt run-all apply --terragrunt-non-interactive -auto-approve -no-color
```

## AWS Authentication with OIDC

GitLab supports OIDC authentication with AWS. First, set up the OIDC provider in AWS:

```hcl
# One-time setup in your AWS account
resource "aws_iam_openid_connect_provider" "gitlab" {
  url             = "https://gitlab.com"
  client_id_list  = ["https://gitlab.com"]
  thumbprint_list = ["b3dd7606d2b5a8b4a13771dbecc9ee1cecafa38a"]
}

resource "aws_iam_role" "gitlab_ci" {
  name = "GitLabCI-TerraformRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.gitlab.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "gitlab.com:aud" = "https://gitlab.com"
        }
        StringLike = {
          "gitlab.com:sub" = "project_path:your-group/your-project:ref_type:branch:ref:main"
        }
      }
    }]
  })
}
```

Then configure the pipeline to use OIDC:

```yaml
variables:
  AWS_ROLE_ARN: "arn:aws:iam::123456789012:role/GitLabCI-TerraformRole"

# Add this to each job that needs AWS access
.aws_oidc: &aws_oidc
  id_tokens:
    GITLAB_OIDC_TOKEN:
      aud: https://gitlab.com
  before_script:
    - >
      export $(printf "AWS_ACCESS_KEY_ID=%s AWS_SECRET_ACCESS_KEY=%s AWS_SESSION_TOKEN=%s"
      $(aws sts assume-role-with-web-identity
      --role-arn "$AWS_ROLE_ARN"
      --role-session-name "GitLabCI-${CI_PIPELINE_ID}"
      --web-identity-token "$GITLAB_OIDC_TOKEN"
      --duration-seconds 3600
      --query "Credentials.[AccessKeyId,SecretAccessKey,SessionToken]"
      --output text))
```

## Using GitLab CI Variables

Store sensitive values in GitLab CI/CD Variables (Settings > CI/CD > Variables):

```yaml
# These variables are set in GitLab UI, not in the file
# AWS_ACCESS_KEY_ID (masked)
# AWS_SECRET_ACCESS_KEY (masked)
# GITLAB_API_TOKEN (for MR comments)

# You can also use variable environments to scope credentials
# Set different AWS credentials for dev vs prod environments
```

## Child Pipelines for Large Repos

If your repo has many modules, consider using GitLab's child pipeline feature to parallelize:

```yaml
# .gitlab-ci.yml (parent)
stages:
  - generate
  - trigger

generate-pipeline:
  stage: generate
  script:
    # Dynamically generate a child pipeline based on changed modules
    - python scripts/generate-child-pipeline.py > child-pipeline.yml
  artifacts:
    paths:
      - child-pipeline.yml

trigger-child:
  stage: trigger
  trigger:
    include:
      - artifact: child-pipeline.yml
        job: generate-pipeline
    strategy: depend
```

The generator script creates a pipeline with a job per changed module:

```python
#!/usr/bin/env python3
# scripts/generate-child-pipeline.py
import subprocess
import yaml
import os

# Get changed files from MR
changed = subprocess.check_output(
    ["git", "diff", "--name-only", "origin/main...HEAD"]
).decode().strip().split("\n")

# Find affected Terragrunt modules
modules = set()
for f in changed:
    d = os.path.dirname(f)
    while d:
        if os.path.exists(os.path.join(d, "terragrunt.hcl")):
            modules.add(d)
            break
        d = os.path.dirname(d)

# Generate pipeline YAML
pipeline = {"stages": ["plan"], "image": "your-image:latest"}
for mod in modules:
    safe_name = mod.replace("/", "-")
    pipeline[f"plan-{safe_name}"] = {
        "stage": "plan",
        "script": [f"cd {mod}", "terragrunt plan --terragrunt-non-interactive"],
    }

print(yaml.dump(pipeline, default_flow_style=False))
```

## Handling Terragrunt Cache

GitLab CI caching helps avoid re-downloading providers:

```yaml
cache:
  key:
    files:
      - infrastructure/**/.terraform.lock.hcl
    prefix: terragrunt
  paths:
    - .terraform-plugin-cache/
    - infrastructure/**/.terragrunt-cache/
  policy: pull-push
```

Be careful with caching `.terragrunt-cache` - it can grow large. A safer approach is to only cache the plugin directory.

## Manual Destroy Jobs

For cleanup, add manual destroy jobs:

```yaml
destroy:dev:
  stage: apply
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      when: manual
  environment:
    name: dev
    action: stop
  script:
    - cd infrastructure/dev
    - terragrunt run-all destroy --terragrunt-non-interactive -auto-approve
  allow_failure: true
```

## Summary

GitLab CI pairs well with Terragrunt thanks to its built-in environment support, manual gates, and artifact system. The key points: use OIDC for authentication, cache your provider plugins, post plan output to merge requests, and always require manual approval for production applies. For more CI/CD patterns with Terragrunt, check out our [general CI/CD guide](https://oneuptime.com/blog/post/2026-02-23-terragrunt-with-ci-cd-pipelines/view) and the [GitHub Actions equivalent](https://oneuptime.com/blog/post/2026-02-23-terragrunt-with-github-actions/view).
