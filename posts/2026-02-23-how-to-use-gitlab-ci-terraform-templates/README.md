# How to Use GitLab CI Terraform Templates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitLab CI, CI/CD, Template, Infrastructure as Code, DevOps

Description: Use GitLab CI built-in Terraform templates and create custom reusable templates to standardize Terraform pipelines across multiple projects and teams.

---

GitLab previously provided official Terraform CI/CD templates that gave you a working pipeline out of the box. These templates were deprecated in GitLab 16.9 and removed in GitLab 18.0. If you are still on GitLab 17.x, or you copied the templates into your own project before upgrading, you can include a template and get plan, apply, and destroy stages with proper state management. But the real power comes from understanding how these templates work and how to customize them for your organization's needs.

This post covers both the legacy official GitLab Terraform templates and how to build your own reusable templates that standardize Terraform workflows across teams.

## The Official GitLab Terraform Template

On GitLab 17.x, GitLab maintained a Terraform template at `Terraform.gitlab-ci.yml`. Include it in your pipeline like this:

```yaml
# .gitlab-ci.yml

# Use GitLab's official Terraform template

include:
  - template: Terraform.gitlab-ci.yml

variables:
  TF_ROOT: ${CI_PROJECT_DIR}/terraform
  TF_STATE_NAME: default
```

This single include gives you a complete pipeline with these stages:

- **validate**: Runs `terraform validate`
- **build**: Runs `terraform plan` and saves the plan file
- **deploy**: Runs `terraform apply` using the saved plan (manual trigger)
- **cleanup**: Runs `terraform destroy` (manual trigger)

## Customizing the Official Template

The template uses variables to configure behavior. Here are the important ones:

```yaml
include:
  - template: Terraform.gitlab-ci.yml

variables:
  # Directory containing Terraform files
  TF_ROOT: ${CI_PROJECT_DIR}/infrastructure

  # Name of the state file in GitLab managed state
  TF_STATE_NAME: production

  # Additional flags for terraform init
  TF_INIT_FLAGS: "-backend-config=address=${TF_ADDRESS}"

  # Additional flags for terraform plan
  TF_CLI_ARGS_plan: "-var-file=production.tfvars"

# Image to use (defaults to the official Terraform image)
# Override this if you need additional tools
image:
  name: "registry.gitlab.com/gitlab-org/terraform-images/stable:latest"
```

## Overriding Template Jobs

You can override specific jobs from the template while keeping the rest:

```yaml
include:
  - template: Terraform.gitlab-ci.yml

variables:
  TF_ROOT: ${CI_PROJECT_DIR}/terraform

# Override the plan job to add custom behavior
build:
  extends: .terraform:build
  before_script:
    # Install custom providers or tools before running plan
    - apk add --no-cache jq curl
    - terraform --version
  rules:
    - if: $CI_MERGE_REQUEST_IID
    - if: $CI_COMMIT_BRANCH == "main"

# Override the apply job to restrict to main branch only
deploy:
  extends: .terraform:deploy
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
  environment:
    name: production
```

## The Terraform Latest Template

GitLab also provided a "latest" template that tracked newer features in GitLab 17.x:

```yaml
include:
  - template: Terraform/Base.latest.gitlab-ci.yml

stages:
  - validate
  - plan
  - apply

validate:
  extends: .terraform:validate

plan:
  extends: .terraform:build
  variables:
    TF_ROOT: ${CI_PROJECT_DIR}/terraform

apply:
  extends: .terraform:deploy
  variables:
    TF_ROOT: ${CI_PROJECT_DIR}/terraform
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
```

This template provides base job definitions that you extend, giving you more control over the pipeline structure.

## Building Custom Reusable Templates

For organizations with multiple Terraform projects, create your own template that standardizes the workflow. Store it in a central repository. These custom templates assume your Terraform configuration declares an HTTP backend, for example `terraform { backend "http" {} }`, so the GitLab-managed state variables can configure it during `terraform init`.

```yaml
# templates/terraform-pipeline.yml
# Custom Terraform pipeline template for the organization

# Default variables that all projects can override
variables:
  TF_VERSION: "1.7.5"
  TF_ROOT: ${CI_PROJECT_DIR}
  TF_STATE_NAME: default
  TF_ENVIRONMENT: default
  PLAN_FLAGS: ""
  APPLY_FLAGS: ""
  TF_ADDRESS: "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/terraform/state/${TF_STATE_NAME}"
  TF_HTTP_ADDRESS: "${TF_ADDRESS}"
  TF_HTTP_LOCK_ADDRESS: "${TF_ADDRESS}/lock"
  TF_HTTP_UNLOCK_ADDRESS: "${TF_ADDRESS}/lock"
  TF_HTTP_USERNAME: "gitlab-ci-token"
  TF_HTTP_PASSWORD: "${CI_JOB_TOKEN}"
  TF_HTTP_LOCK_METHOD: "POST"
  TF_HTTP_UNLOCK_METHOD: "DELETE"
  TF_HTTP_RETRY_WAIT_MIN: "5"

# Base image configuration
.terraform_base:
  image:
    name: "hashicorp/terraform:${TF_VERSION}"
    entrypoint: [""]
  before_script:
    - apk --no-cache add jq
    - cd ${TF_ROOT}
    - terraform --version
    - terraform init

stages:
  - validate
  - plan
  - apply

# Validate job
terraform:validate:
  extends: .terraform_base
  stage: validate
  script:
    - terraform fmt -check -recursive
    - terraform validate
  rules:
    - if: $CI_MERGE_REQUEST_IID
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# Plan job - runs on MRs and default branch
terraform:plan:
  extends: .terraform_base
  stage: plan
  script:
    - terraform plan -out=plan.cache ${PLAN_FLAGS}
    # Generate a human-readable plan for MR comments
    - terraform show -no-color plan.cache > plan.txt
    - >
      terraform show -json plan.cache |
      jq -r '([.resource_changes[]?.change.actions?] | flatten) | {"create": (map(select(. == "create")) | length), "update": (map(select(. == "update")) | length), "delete": (map(select(. == "delete")) | length)}' >
      plan.json
  artifacts:
    paths:
      - ${TF_ROOT}/plan.cache
      - ${TF_ROOT}/plan.txt
    reports:
      terraform: ${TF_ROOT}/plan.json
    expire_in: 7 days
  rules:
    - if: $CI_MERGE_REQUEST_IID
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# Apply job - only on default branch, manual trigger
terraform:apply:
  extends: .terraform_base
  stage: apply
  script:
    - terraform apply -input=false plan.cache ${APPLY_FLAGS}
  dependencies:
    - terraform:plan
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
  environment:
    name: $TF_ENVIRONMENT
```

## Using Your Custom Template

Projects include your template from the central repository:

```yaml
# .gitlab-ci.yml in a project that uses the template

include:
  - project: 'infrastructure/ci-templates'
    ref: 'v1.2.0'
    file: '/templates/terraform-pipeline.yml'

variables:
  TF_ROOT: ${CI_PROJECT_DIR}/terraform
  TF_VERSION: "1.7.5"
  TF_STATE_NAME: production
  PLAN_FLAGS: "-var-file=production.tfvars"
  TF_ENVIRONMENT: production
```

That is it. The project gets a full Terraform pipeline with validate, plan, and apply stages by including a single file.

## Multi-Environment Template

For projects that deploy to multiple environments, create a template with parallel environment support:

```yaml
# templates/terraform-multi-env.yml
# Multi-environment Terraform pipeline template

variables:
  TF_VERSION: "1.7.5"
  TF_ROOT: ${CI_PROJECT_DIR}/terraform
  TF_STATE_NAME: default
  TF_ADDRESS: "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/terraform/state/${TF_STATE_NAME}"
  TF_HTTP_ADDRESS: "${TF_ADDRESS}"
  TF_HTTP_LOCK_ADDRESS: "${TF_ADDRESS}/lock"
  TF_HTTP_UNLOCK_ADDRESS: "${TF_ADDRESS}/lock"
  TF_HTTP_USERNAME: "gitlab-ci-token"
  TF_HTTP_PASSWORD: "${CI_JOB_TOKEN}"
  TF_HTTP_LOCK_METHOD: "POST"
  TF_HTTP_UNLOCK_METHOD: "DELETE"

.terraform_env_base:
  image:
    name: "hashicorp/terraform:${TF_VERSION}"
    entrypoint: [""]
  before_script:
    - cd ${TF_ROOT}
    - terraform init

stages:
  - validate
  - plan
  - deploy-dev
  - deploy-staging
  - deploy-production

validate:
  extends: .terraform_env_base
  stage: validate
  script:
    - terraform validate

# Dev environment
plan:dev:
  extends: .terraform_env_base
  stage: plan
  variables:
    TF_STATE_NAME: dev
  script:
    - terraform plan -var-file="environments/dev.tfvars" -out=plan-dev.cache
  artifacts:
    paths:
      - ${TF_ROOT}/plan-dev.cache

apply:dev:
  extends: .terraform_env_base
  stage: deploy-dev
  variables:
    TF_STATE_NAME: dev
  script:
    - terraform apply -input=false plan-dev.cache
  needs:
    - job: plan:dev
      artifacts: true
  environment:
    name: dev
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# Staging environment
plan:staging:
  extends: .terraform_env_base
  stage: plan
  variables:
    TF_STATE_NAME: staging
  script:
    - terraform plan -var-file="environments/staging.tfvars" -out=plan-staging.cache
  artifacts:
    paths:
      - ${TF_ROOT}/plan-staging.cache

apply:staging:
  extends: .terraform_env_base
  stage: deploy-staging
  variables:
    TF_STATE_NAME: staging
  script:
    - terraform apply -input=false plan-staging.cache
  needs:
    - job: plan:staging
      artifacts: true
    - job: apply:dev
      artifacts: false
  environment:
    name: staging
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual

# Production environment
plan:production:
  extends: .terraform_env_base
  stage: plan
  variables:
    TF_STATE_NAME: production
  script:
    - terraform plan -var-file="environments/production.tfvars" -out=plan-prod.cache
  artifacts:
    paths:
      - ${TF_ROOT}/plan-prod.cache

apply:production:
  extends: .terraform_env_base
  stage: deploy-production
  variables:
    TF_STATE_NAME: production
  script:
    - terraform apply -input=false plan-prod.cache
  needs:
    - job: plan:production
      artifacts: true
    - job: apply:staging
      artifacts: false
  environment:
    name: production
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
```

## Versioning Templates

Version your templates using Git tags so that projects can pin to specific versions:

```yaml
# Pin to a specific version
include:
  - project: 'infrastructure/ci-templates'
    ref: 'v2.1.0'
    file: '/templates/terraform-pipeline.yml'

# Use latest from main (not recommended for production)
include:
  - project: 'infrastructure/ci-templates'
    ref: 'main'
    file: '/templates/terraform-pipeline.yml'
```

When you update a template, projects using a pinned version are not affected until they update the ref.

## Template Composition

Combine multiple templates for complex scenarios:

```yaml
include:
  # Base Terraform pipeline
  - project: 'infrastructure/ci-templates'
    ref: 'v2.0.0'
    file: '/templates/terraform-pipeline.yml'

  # Security scanning additions
  - project: 'infrastructure/ci-templates'
    ref: 'v2.0.0'
    file: '/templates/terraform-security.yml'

  # Notification integrations
  - project: 'infrastructure/ci-templates'
    ref: 'v1.0.0'
    file: '/templates/slack-notifications.yml'
```

## Conclusion

GitLab CI Terraform templates eliminate the need to write pipeline configurations from scratch for every project. On GitLab 17.x, you can start with the official template for simple setups. On GitLab 18.0 and later, or as your organization's needs grow, build custom templates instead. Store custom templates in a central repository, version them with Git tags, and standardize your Terraform workflows across every team. The upfront investment in building good templates pays off quickly when your twentieth project gets a fully functional Terraform pipeline by adding three lines to its `.gitlab-ci.yml`.

For state management with these templates, see our guide on [storing Terraform state in GitLab managed state](https://oneuptime.com/blog/post/2026-02-23-how-to-store-terraform-state-in-gitlab-managed-state/view).
