# How to Store Terraform State in GitLab Managed State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitLab, State Management, CI/CD, Infrastructure as Code, DevOps

Description: Configure GitLab managed Terraform state as your remote backend with state locking, encryption, versioning, and proper CI/CD integration for team collaboration.

---

Every Terraform project needs a remote backend for state storage. The usual options are S3 with DynamoDB, Azure Blob Storage, or Google Cloud Storage. But if you are already using GitLab for your repositories and CI/CD, there is a simpler option built right in: GitLab managed Terraform state.

GitLab stores your state files encrypted, provides state locking, keeps a version history, and integrates seamlessly with GitLab CI/CD pipelines using the CI job token for authentication. No extra infrastructure to manage and no additional cloud accounts to configure.

## How GitLab Managed State Works

GitLab implements the Terraform HTTP backend protocol. Your Terraform configuration points to a GitLab API endpoint, and GitLab handles storage, locking, and versioning behind the scenes. State files are encrypted at rest with the same encryption GitLab uses for other sensitive data.

Each project can have multiple named states, which is useful for multi-environment setups where you need separate state files for dev, staging, and production.

## Setting Up the Backend

Configure the HTTP backend in your Terraform configuration:

```hcl
# backend.tf
# Configure GitLab managed Terraform state

terraform {
  backend "http" {
    # These values are typically passed via environment variables
    # or backend config files to avoid hardcoding project-specific URLs
  }
}
```

The actual backend configuration comes from environment variables in your CI/CD pipeline or from a backend config file. Here is how to set the variables:

```bash
# For local development, set these environment variables
export TF_HTTP_ADDRESS="https://gitlab.com/api/v4/projects/<PROJECT_ID>/terraform/state/<STATE_NAME>"
export TF_HTTP_LOCK_ADDRESS="https://gitlab.com/api/v4/projects/<PROJECT_ID>/terraform/state/<STATE_NAME>/lock"
export TF_HTTP_UNLOCK_ADDRESS="https://gitlab.com/api/v4/projects/<PROJECT_ID>/terraform/state/<STATE_NAME>/lock"
export TF_HTTP_USERNAME="your-gitlab-username"
export TF_HTTP_PASSWORD="your-gitlab-personal-access-token"
export TF_HTTP_LOCK_METHOD="POST"
export TF_HTTP_UNLOCK_METHOD="DELETE"
export TF_HTTP_RETRY_WAIT_MIN="5"
```

## CI/CD Pipeline Configuration

In GitLab CI, the job token provides automatic authentication. Here is a complete pipeline:

```yaml
# .gitlab-ci.yml
# Terraform pipeline using GitLab managed state

variables:
  TF_ROOT: ${CI_PROJECT_DIR}/terraform
  # State name - change per environment
  TF_STATE_NAME: default
  # Construct the state URLs from GitLab CI variables
  TF_ADDRESS: "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/terraform/state/${TF_STATE_NAME}"

image:
  name: hashicorp/terraform:1.7.5
  entrypoint: [""]

stages:
  - validate
  - plan
  - apply

# Cache Terraform plugins for faster runs
cache:
  key: terraform-providers
  paths:
    - ${TF_ROOT}/.terraform/providers

before_script:
  - cd ${TF_ROOT}
  - terraform init
    -backend-config="address=${TF_ADDRESS}"
    -backend-config="lock_address=${TF_ADDRESS}/lock"
    -backend-config="unlock_address=${TF_ADDRESS}/lock"
    -backend-config="username=gitlab-ci-token"
    -backend-config="password=${CI_JOB_TOKEN}"
    -backend-config="lock_method=POST"
    -backend-config="unlock_method=DELETE"
    -backend-config="retry_wait_min=5"

validate:
  stage: validate
  script:
    - terraform validate
    - terraform fmt -check
  rules:
    - if: $CI_MERGE_REQUEST_IID
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

plan:
  stage: plan
  script:
    - terraform plan -out=plan.cache
    - terraform show -json plan.cache > plan.json
  artifacts:
    paths:
      - ${TF_ROOT}/plan.cache
    reports:
      # This enables the plan visualization in merge requests
      terraform: ${TF_ROOT}/plan.json
    expire_in: 7 days
  rules:
    - if: $CI_MERGE_REQUEST_IID
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

apply:
  stage: apply
  script:
    - terraform apply -input=false plan.cache
  dependencies:
    - plan
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
  environment:
    name: production
```

The key detail is `CI_JOB_TOKEN` - GitLab automatically provides this token to every CI job, and it has the right permissions to read and write state for the project.

## Multiple State Files for Multiple Environments

Use different state names for each environment:

```yaml
variables:
  TF_ROOT: ${CI_PROJECT_DIR}/terraform

# Plan and apply for dev
plan:dev:
  stage: plan
  variables:
    TF_STATE_NAME: dev
    TF_ADDRESS: "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/terraform/state/dev"
  script:
    - cd ${TF_ROOT}
    - terraform init
      -backend-config="address=${TF_ADDRESS}"
      -backend-config="lock_address=${TF_ADDRESS}/lock"
      -backend-config="unlock_address=${TF_ADDRESS}/lock"
      -backend-config="username=gitlab-ci-token"
      -backend-config="password=${CI_JOB_TOKEN}"
      -backend-config="lock_method=POST"
      -backend-config="unlock_method=DELETE"
    - terraform plan -var-file="environments/dev.tfvars" -out=plan-dev.cache
  artifacts:
    paths:
      - ${TF_ROOT}/plan-dev.cache

apply:dev:
  stage: deploy-dev
  variables:
    TF_STATE_NAME: dev
    TF_ADDRESS: "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/terraform/state/dev"
  script:
    - cd ${TF_ROOT}
    - terraform init
      -backend-config="address=${TF_ADDRESS}"
      -backend-config="lock_address=${TF_ADDRESS}/lock"
      -backend-config="unlock_address=${TF_ADDRESS}/lock"
      -backend-config="username=gitlab-ci-token"
      -backend-config="password=${CI_JOB_TOKEN}"
      -backend-config="lock_method=POST"
      -backend-config="unlock_method=DELETE"
    - terraform apply -input=false plan-dev.cache
  dependencies:
    - plan:dev

# Repeat pattern for staging and production with different TF_STATE_NAME
```

## Plan Visualization in Merge Requests

When you output a Terraform plan as JSON to the `reports:terraform` artifact, GitLab displays the plan summary directly in the merge request. This shows which resources will be created, modified, or destroyed without opening the pipeline logs.

The setup is in the plan job:

```yaml
plan:
  script:
    - terraform plan -out=plan.cache
    # Generate JSON format for MR visualization
    - terraform show -json plan.cache > plan.json
  artifacts:
    reports:
      # GitLab reads this to show plan in MR
      terraform: ${TF_ROOT}/plan.json
```

After the pipeline runs, the merge request widget shows a summary like "2 to add, 1 to change, 0 to destroy."

## Viewing and Managing State

You can view your state files in the GitLab UI. Go to your project, then Infrastructure, then Terraform states. This page shows:

- All named states for the project
- The last updated timestamp
- Which pipeline last modified the state
- A link to download the state file

You can also manage state through the API:

```bash
# List all states for a project
curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
  "https://gitlab.com/api/v4/projects/${PROJECT_ID}/terraform/state"

# Get a specific state
curl --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
  "https://gitlab.com/api/v4/projects/${PROJECT_ID}/terraform/state/${STATE_NAME}"

# Delete a state (be very careful with this)
curl --request DELETE \
  --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
  "https://gitlab.com/api/v4/projects/${PROJECT_ID}/terraform/state/${STATE_NAME}"
```

## State Locking

GitLab managed state supports locking to prevent concurrent modifications. When a Terraform operation starts, it acquires a lock. If another operation tries to run while the lock is held, it will wait or fail.

The lock configuration is already part of the backend setup:

```bash
# These flags enable locking
-backend-config="lock_address=${TF_ADDRESS}/lock"
-backend-config="unlock_address=${TF_ADDRESS}/lock"
-backend-config="lock_method=POST"
-backend-config="unlock_method=DELETE"
```

If a lock gets stuck (for example, if a CI job was cancelled mid-operation), you can force-unlock it:

```bash
# Force unlock a stuck state
terraform force-unlock <LOCK_ID>
```

## Local Development with GitLab State

For local development, create a Personal Access Token with `api` scope and configure your environment:

```bash
# Create a script to set up local Terraform environment
# save as setup-terraform.sh

#!/bin/bash
# Configure Terraform to use GitLab managed state for local development

GITLAB_URL="https://gitlab.com"
PROJECT_ID="12345678"
STATE_NAME="${1:-default}"

export TF_HTTP_ADDRESS="${GITLAB_URL}/api/v4/projects/${PROJECT_ID}/terraform/state/${STATE_NAME}"
export TF_HTTP_LOCK_ADDRESS="${TF_HTTP_ADDRESS}/lock"
export TF_HTTP_UNLOCK_ADDRESS="${TF_HTTP_ADDRESS}/lock"
export TF_HTTP_USERNAME="your-username"
export TF_HTTP_PASSWORD="${GITLAB_TOKEN}"  # Set this in your shell profile
export TF_HTTP_LOCK_METHOD="POST"
export TF_HTTP_UNLOCK_METHOD="DELETE"

echo "Configured for state: ${STATE_NAME}"
terraform init -reconfigure
```

```bash
# Usage
source setup-terraform.sh production
terraform plan
```

## Migrating from S3 Backend

If you are moving from an S3 backend to GitLab managed state, follow these steps:

```bash
# Step 1: Pull the current state from S3
terraform state pull > terraform.tfstate.backup

# Step 2: Update your backend configuration to use HTTP
# Edit backend.tf to use the HTTP backend

# Step 3: Initialize with the new backend and migrate
terraform init -migrate-state

# Step 4: Verify the state was migrated
terraform plan
# Should show no changes if migration was successful
```

## Limitations to Be Aware Of

GitLab managed state has some limitations compared to dedicated backends:

- **Size limits**: State files larger than about 5 MB may see performance issues
- **No native state file encryption key management**: Encryption uses GitLab's internal keys, not customer-managed keys
- **Cross-project state access**: Accessing state from another project requires additional token configuration
- **Self-managed GitLab**: State storage depends on your GitLab instance's storage configuration

For large-scale deployments with dozens of state files, you might still want a dedicated backend like S3. But for most projects, GitLab managed state is simpler and works well.

## Conclusion

GitLab managed Terraform state removes the need to set up and maintain a separate state backend. If you are already using GitLab, it is the path of least resistance for state management. The CI job token handles authentication automatically, state locking prevents conflicts, and the merge request integration gives reviewers visibility into planned changes. Set up takes minutes instead of the hours it can take to configure an S3 backend with proper IAM policies and DynamoDB locking.

For using this with GitLab CI templates, see our guide on [GitLab CI Terraform templates](https://oneuptime.com/blog/post/2026-02-23-how-to-use-gitlab-ci-terraform-templates/view).
