# How to Use HCP Terraform with GitLab CI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, GitLab CI, CI/CD, Automation, DevOps

Description: Learn how to integrate HCP Terraform with GitLab CI/CD pipelines for automated infrastructure planning and deployment workflows.

---

GitLab CI is a popular choice for teams that use GitLab for source control and want their CI/CD pipeline tightly integrated with their repository. Combining GitLab CI with HCP Terraform gives you the best of both worlds - GitLab handles pipeline orchestration, while HCP Terraform manages state, remote execution, and policy enforcement.

This guide shows you how to set up the integration from scratch, including merge request previews and automated deployments.

## Integration Architecture

The flow works like this:

1. A developer pushes Terraform changes to a GitLab branch
2. GitLab CI runs a pipeline that includes `terraform plan`
3. The plan executes remotely on HCP Terraform
4. Plan results are posted back to the merge request
5. When the merge request is approved and merged, another pipeline runs `terraform apply`

## Prerequisites

- A GitLab repository containing your Terraform configuration
- An HCP Terraform organization with a workspace
- An HCP Terraform API token (team token recommended)

## Setting Up the Token

Store your HCP Terraform token as a GitLab CI/CD variable:

1. Go to your GitLab project **Settings** > **CI/CD** > **Variables**
2. Click **Add variable**
3. Key: `TF_API_TOKEN`
4. Value: Your HCP Terraform API token
5. Check **Mask variable** and **Protect variable**

## Basic Pipeline Configuration

### Terraform Configuration

```hcl
# main.tf
terraform {
  cloud {
    organization = "your-org"

    workspaces {
      name = "app-production"
    }
  }

  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

### GitLab CI Configuration

```yaml
# .gitlab-ci.yml
image:
  name: hashicorp/terraform:1.7.0
  entrypoint: [""]

variables:
  TF_IN_AUTOMATION: "true"  # Reduces unnecessary output

# Cache Terraform plugins between pipeline runs
cache:
  key: terraform-plugins
  paths:
    - .terraform/

stages:
  - validate
  - plan
  - apply

before_script:
  # Configure Terraform CLI credentials
  - |
    cat > ~/.terraformrc << EOF
    credentials "app.terraform.io" {
      token = "$TF_API_TOKEN"
    }
    EOF

validate:
  stage: validate
  script:
    - terraform init -input=false
    - terraform fmt -check -recursive
    - terraform validate
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'

plan:
  stage: plan
  script:
    - terraform init -input=false
    - terraform plan -no-color -input=false 2>&1 | tee plan_output.txt
  artifacts:
    paths:
      - plan_output.txt
    expire_in: 7 days
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'

apply:
  stage: apply
  script:
    - terraform init -input=false
    - terraform apply -auto-approve -input=false
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  when: manual  # Require manual trigger for applies
  environment:
    name: production
    url: https://app.terraform.io/app/your-org/workspaces/app-production
```

## Advanced Pipeline with Merge Request Comments

Post the plan output as a comment on the merge request:

```yaml
# .gitlab-ci.yml - Advanced version
image:
  name: hashicorp/terraform:1.7.0
  entrypoint: [""]

variables:
  TF_IN_AUTOMATION: "true"
  TF_DIR: "infrastructure"

stages:
  - validate
  - plan
  - apply

before_script:
  - |
    cat > ~/.terraformrc << EOF
    credentials "app.terraform.io" {
      token = "$TF_API_TOKEN"
    }
    EOF

# Validate Terraform configuration
validate:
  stage: validate
  script:
    - cd $TF_DIR
    - terraform init -input=false
    - terraform fmt -check -recursive
    - terraform validate -no-color
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      changes:
        - $TF_DIR/**/*
    - if: '$CI_COMMIT_BRANCH == "main"'
      changes:
        - $TF_DIR/**/*

# Run plan and post results to merge request
plan:
  stage: plan
  script:
    - cd $TF_DIR
    - terraform init -input=false
    - |
      terraform plan -no-color -input=false 2>&1 | tee /tmp/plan_output.txt
      PLAN_EXIT_CODE=${PIPESTATUS[0]}
    - |
      # Post plan output as MR comment (if this is a merge request)
      if [ "$CI_PIPELINE_SOURCE" = "merge_request_event" ]; then
        # Install curl if not present
        apk add --no-cache curl jq

        # Truncate long plans
        PLAN_OUTPUT=$(head -c 50000 /tmp/plan_output.txt)

        # Create the comment
        COMMENT_BODY=$(jq -n --arg body "### Terraform Plan Output

      \`\`\`
      $PLAN_OUTPUT
      \`\`\`

      *Pipeline: $CI_PIPELINE_URL*" '{body: $body}')

        curl --request POST \
          --header "PRIVATE-TOKEN: $GITLAB_API_TOKEN" \
          --header "Content-Type: application/json" \
          --data "$COMMENT_BODY" \
          "$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes"
      fi
    - exit $PLAN_EXIT_CODE
  artifacts:
    paths:
      - $TF_DIR/plan_output.txt
    expire_in: 7 days
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      changes:
        - $TF_DIR/**/*
    - if: '$CI_COMMIT_BRANCH == "main"'
      changes:
        - $TF_DIR/**/*

# Apply changes after merge to main
apply:
  stage: apply
  script:
    - cd $TF_DIR
    - terraform init -input=false
    - terraform apply -auto-approve -input=false -no-color
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      changes:
        - $TF_DIR/**/*
  environment:
    name: production
    url: https://app.terraform.io/app/your-org/workspaces/app-production
```

## Multi-Environment Pipeline

Deploy to staging first, then production:

```yaml
# .gitlab-ci.yml - Multi-environment
image:
  name: hashicorp/terraform:1.7.0
  entrypoint: [""]

variables:
  TF_IN_AUTOMATION: "true"

stages:
  - validate
  - plan-staging
  - apply-staging
  - plan-production
  - apply-production

before_script:
  - |
    cat > ~/.terraformrc << EOF
    credentials "app.terraform.io" {
      token = "$TF_API_TOKEN"
    }
    EOF

.terraform_init: &terraform_init
  script:
    - cd infrastructure
    - terraform init -input=false

validate:
  stage: validate
  script:
    - cd infrastructure
    - terraform init -input=false
    - terraform validate
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'

plan-staging:
  stage: plan-staging
  variables:
    TF_WORKSPACE: "app-staging"
  script:
    - cd infrastructure
    - terraform init -input=false
    - terraform plan -no-color -input=false
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'

apply-staging:
  stage: apply-staging
  variables:
    TF_WORKSPACE: "app-staging"
  script:
    - cd infrastructure
    - terraform init -input=false
    - terraform apply -auto-approve -input=false
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  environment:
    name: staging

plan-production:
  stage: plan-production
  variables:
    TF_WORKSPACE: "app-production"
  script:
    - cd infrastructure
    - terraform init -input=false
    - terraform plan -no-color -input=false
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  needs:
    - apply-staging

apply-production:
  stage: apply-production
  variables:
    TF_WORKSPACE: "app-production"
  script:
    - cd infrastructure
    - terraform init -input=false
    - terraform apply -auto-approve -input=false
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  when: manual  # Manual gate for production
  environment:
    name: production
  needs:
    - plan-production
```

## Using GitLab's Terraform Integration

GitLab has built-in Terraform support with its managed state. However, when using HCP Terraform, you use GitLab's CI/CD features while HCP Terraform handles state:

```yaml
# Using GitLab's Terraform template as a base
include:
  - template: Terraform.gitlab-ci.yml

variables:
  TF_ROOT: infrastructure
  TF_STATE_NAME: default

# Override the template stages to use HCP Terraform
init:
  extends: .terraform:init
  before_script:
    - |
      cat > ~/.terraformrc << EOF
      credentials "app.terraform.io" {
        token = "$TF_API_TOKEN"
      }
      EOF
```

## Security Considerations

### Protected Branches and Variables

Only allow applies from protected branches:

```yaml
apply:
  stage: apply
  rules:
    # Only apply from the main branch
    - if: '$CI_COMMIT_BRANCH == "main"'
  resource_group: production  # Prevents concurrent applies
```

### Separate Tokens Per Environment

Use different tokens with different permission levels:

```yaml
variables:
  # Staging token has write access to staging workspace
  TF_API_TOKEN_STAGING: $TFC_TOKEN_STAGING
  # Production token has write access to production workspace
  TF_API_TOKEN_PRODUCTION: $TFC_TOKEN_PRODUCTION

apply-staging:
  variables:
    TF_API_TOKEN: $TF_API_TOKEN_STAGING

apply-production:
  variables:
    TF_API_TOKEN: $TF_API_TOKEN_PRODUCTION
```

### Resource Groups

Prevent concurrent pipeline runs from conflicting:

```yaml
apply:
  resource_group: terraform-production
  # Only one job with this resource_group can run at a time
```

## Handling Monorepo Structures

If you have multiple Terraform configurations in one repo:

```yaml
# Use rules to trigger only when specific directories change
plan-networking:
  stage: plan
  variables:
    TF_WORKSPACE: "networking-production"
  script:
    - cd infrastructure/networking
    - terraform init -input=false
    - terraform plan -no-color
  rules:
    - changes:
        - infrastructure/networking/**/*

plan-compute:
  stage: plan
  variables:
    TF_WORKSPACE: "compute-production"
  script:
    - cd infrastructure/compute
    - terraform init -input=false
    - terraform plan -no-color
  rules:
    - changes:
        - infrastructure/compute/**/*
```

## Troubleshooting

**"Error: Backend initialization required"**: Make sure the `before_script` runs before the `script` section. The credentials file must exist before `terraform init`.

**Pipeline hanging**: Remote execution streams logs back to the CLI. If the HCP Terraform run is waiting for approval, the GitLab job will wait too. Enable auto-apply for CI-driven workspaces or use the `-auto-approve` flag.

**Cache not working**: The Terraform provider cache path may differ between images. Set `TF_PLUGIN_CACHE_DIR` explicitly and cache that directory.

**Rate limiting**: If you have many pipelines running concurrently, you may hit HCP Terraform API rate limits. Use `resource_group` to serialize pipeline runs.

## Summary

GitLab CI integrates cleanly with HCP Terraform through the CLI-driven workflow. Set up your credentials as masked CI/CD variables, run plans on merge requests to preview changes, and gate production applies behind manual triggers. The multi-environment pattern with staging before production is a solid default for most teams. Use resource groups to prevent concurrent runs and protected variables to limit who can trigger production deploys.

For other CI/CD integrations, see our guides on [HCP Terraform with GitHub Actions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-hcp-terraform-with-github-actions/view) and [HCP Terraform with Bitbucket](https://oneuptime.com/blog/post/2026-02-23-how-to-use-hcp-terraform-with-bitbucket/view).
