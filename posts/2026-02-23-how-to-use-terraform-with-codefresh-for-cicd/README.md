# How to Use Terraform with Codefresh for CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Codefresh, CI/CD, DevOps, Infrastructure as Code, GitOps, Automation

Description: Learn how to integrate Terraform with Codefresh CI/CD platform to automate infrastructure provisioning alongside application builds and deployments.

---

Codefresh is a CI/CD platform built specifically for Kubernetes and cloud-native applications, with strong GitOps capabilities through its ArgoCD integration. Integrating Terraform with Codefresh allows you to manage infrastructure provisioning as part of your continuous delivery pipelines, ensuring that infrastructure and application changes are deployed together in a coordinated fashion. This guide shows you how to set up this integration.

## Why Use Terraform with Codefresh?

Codefresh provides a Docker-native CI/CD platform that makes running Terraform straightforward since every step runs in a container. This means you get consistent Terraform versions across all pipeline runs, parallel execution of Terraform operations for different environments, built-in caching for Terraform providers and modules, and integration with Codefresh's GitOps capabilities for post-provisioning application deployment.

## Prerequisites

You need a Codefresh account, Terraform configurations stored in a Git repository, cloud provider credentials, and a Docker image with Terraform installed (or use the official HashiCorp image).

## Step 1: Basic Terraform Pipeline in Codefresh

Create a Codefresh pipeline that runs Terraform operations.

```yaml
# codefresh.yml
# Basic Terraform pipeline in Codefresh
version: '1.0'

stages:
  - 'Prepare'
  - 'Plan'
  - 'Approve'
  - 'Apply'

steps:
  # Clone the repository containing Terraform configurations
  clone:
    title: 'Clone Repository'
    type: git-clone
    stage: 'Prepare'
    repo: '${{CF_REPO_OWNER}}/${{CF_REPO_NAME}}'
    revision: '${{CF_REVISION}}'

  # Initialize Terraform
  terraform_init:
    title: 'Terraform Init'
    stage: 'Prepare'
    image: hashicorp/terraform:1.6
    working_directory: '${{clone}}/terraform'
    commands:
      # Initialize with the remote backend
      - terraform init
        -backend-config="bucket=${{TF_STATE_BUCKET}}"
        -backend-config="key=${{TF_STATE_KEY}}"
        -backend-config="region=${{AWS_REGION}}"
    environment:
      - AWS_ACCESS_KEY_ID=${{AWS_ACCESS_KEY_ID}}
      - AWS_SECRET_ACCESS_KEY=${{AWS_SECRET_ACCESS_KEY}}
      - AWS_DEFAULT_REGION=${{AWS_REGION}}

  # Run Terraform plan
  terraform_plan:
    title: 'Terraform Plan'
    stage: 'Plan'
    image: hashicorp/terraform:1.6
    working_directory: '${{clone}}/terraform'
    commands:
      # Generate a plan file for review
      - terraform plan -out=tfplan -no-color 2>&1 | tee plan-output.txt
      # Export plan summary as a pipeline annotation
      - |
        SUMMARY=$(terraform show -no-color tfplan | grep -E "Plan:|No changes")
        cf_export PLAN_SUMMARY="$SUMMARY"
    environment:
      - AWS_ACCESS_KEY_ID=${{AWS_ACCESS_KEY_ID}}
      - AWS_SECRET_ACCESS_KEY=${{AWS_SECRET_ACCESS_KEY}}
      - AWS_DEFAULT_REGION=${{AWS_REGION}}

  # Manual approval step before applying
  approve_changes:
    title: 'Approve Infrastructure Changes'
    stage: 'Approve'
    type: pending-approval
    timeout:
      duration: 2
      finalState: denied
    description: |
      Review the Terraform plan before applying.
      Plan Summary: ${{PLAN_SUMMARY}}

  # Apply the planned changes
  terraform_apply:
    title: 'Terraform Apply'
    stage: 'Apply'
    image: hashicorp/terraform:1.6
    working_directory: '${{clone}}/terraform'
    commands:
      - terraform apply -auto-approve tfplan
    environment:
      - AWS_ACCESS_KEY_ID=${{AWS_ACCESS_KEY_ID}}
      - AWS_SECRET_ACCESS_KEY=${{AWS_SECRET_ACCESS_KEY}}
      - AWS_DEFAULT_REGION=${{AWS_REGION}}
```

## Step 2: Multi-Environment Terraform Pipeline

Handle multiple environments with a single pipeline using Codefresh variables.

```yaml
# codefresh-multi-env.yml
# Multi-environment Terraform pipeline
version: '1.0'

stages:
  - 'Init'
  - 'Plan Staging'
  - 'Apply Staging'
  - 'Plan Production'
  - 'Approve Production'
  - 'Apply Production'

steps:
  clone:
    title: 'Clone Repository'
    type: git-clone
    stage: 'Init'
    repo: '${{CF_REPO_OWNER}}/${{CF_REPO_NAME}}'
    revision: '${{CF_REVISION}}'

  # Staging Terraform Plan
  staging_plan:
    title: 'Plan Staging Infrastructure'
    stage: 'Plan Staging'
    image: hashicorp/terraform:1.6
    working_directory: '${{clone}}/terraform'
    commands:
      - terraform init
        -backend-config="key=staging/terraform.tfstate"
      - terraform workspace select staging || terraform workspace new staging
      - terraform plan -var-file=environments/staging.tfvars -out=staging.tfplan
    environment:
      - AWS_ACCESS_KEY_ID=${{AWS_ACCESS_KEY_ID}}
      - AWS_SECRET_ACCESS_KEY=${{AWS_SECRET_ACCESS_KEY}}

  # Apply to Staging
  staging_apply:
    title: 'Apply Staging Infrastructure'
    stage: 'Apply Staging'
    image: hashicorp/terraform:1.6
    working_directory: '${{clone}}/terraform'
    commands:
      - terraform workspace select staging
      - terraform apply -auto-approve staging.tfplan
    environment:
      - AWS_ACCESS_KEY_ID=${{AWS_ACCESS_KEY_ID}}
      - AWS_SECRET_ACCESS_KEY=${{AWS_SECRET_ACCESS_KEY}}

  # Production Terraform Plan
  production_plan:
    title: 'Plan Production Infrastructure'
    stage: 'Plan Production'
    image: hashicorp/terraform:1.6
    working_directory: '${{clone}}/terraform'
    commands:
      - terraform init
        -backend-config="key=production/terraform.tfstate"
      - terraform workspace select production || terraform workspace new production
      - terraform plan -var-file=environments/production.tfvars -out=production.tfplan
    environment:
      - AWS_ACCESS_KEY_ID=${{AWS_ACCESS_KEY_ID}}
      - AWS_SECRET_ACCESS_KEY=${{AWS_SECRET_ACCESS_KEY}}

  # Approval gate for production
  approve_production:
    title: 'Approve Production Changes'
    stage: 'Approve Production'
    type: pending-approval
    timeout:
      duration: 24
      finalState: denied

  # Apply to Production
  production_apply:
    title: 'Apply Production Infrastructure'
    stage: 'Apply Production'
    image: hashicorp/terraform:1.6
    working_directory: '${{clone}}/terraform'
    commands:
      - terraform workspace select production
      - terraform apply -auto-approve production.tfplan
    environment:
      - AWS_ACCESS_KEY_ID=${{AWS_ACCESS_KEY_ID}}
      - AWS_SECRET_ACCESS_KEY=${{AWS_SECRET_ACCESS_KEY}}
```

## Step 3: Terraform with Codefresh GitOps

Combine Terraform infrastructure provisioning with Codefresh's GitOps capabilities.

```yaml
# codefresh-gitops.yml
# Terraform provisioning followed by GitOps deployment
version: '1.0'

stages:
  - 'Infrastructure'
  - 'Deploy Application'

steps:
  clone:
    title: 'Clone Repository'
    type: git-clone
    stage: 'Infrastructure'
    repo: '${{CF_REPO_OWNER}}/${{CF_REPO_NAME}}'
    revision: '${{CF_REVISION}}'

  # Provision infrastructure with Terraform
  terraform:
    title: 'Provision Infrastructure'
    stage: 'Infrastructure'
    image: hashicorp/terraform:1.6
    working_directory: '${{clone}}/terraform'
    commands:
      - terraform init
      - terraform apply -auto-approve
      # Export outputs for the GitOps stage
      - |
        CLUSTER_NAME=$(terraform output -raw cluster_name)
        CLUSTER_ENDPOINT=$(terraform output -raw cluster_endpoint)
        cf_export CLUSTER_NAME="$CLUSTER_NAME"
        cf_export CLUSTER_ENDPOINT="$CLUSTER_ENDPOINT"
    environment:
      - AWS_ACCESS_KEY_ID=${{AWS_ACCESS_KEY_ID}}
      - AWS_SECRET_ACCESS_KEY=${{AWS_SECRET_ACCESS_KEY}}

  # Sync ArgoCD application via Codefresh GitOps
  gitops_sync:
    title: 'Sync Application via GitOps'
    stage: 'Deploy Application'
    type: gitops-sync
    arguments:
      app_name: 'my-application'
      context: 'argo-cd'
      wait_healthy: true
      timeout: 300
```

## Step 4: Custom Terraform Step Type

Create a reusable Codefresh step type for Terraform operations.

```yaml
# terraform-step/step.yaml
# Custom Codefresh step type for Terraform
kind: step-type
version: '1.0'
metadata:
  name: terraform
  version: 1.0.0
  description: Run Terraform operations

spec:
  arguments: |
    {
      "definitions": {},
      "properties": {
        "ACTION": {
          "type": "string",
          "description": "Terraform action: init, plan, apply, destroy",
          "default": "plan"
        },
        "WORKING_DIR": {
          "type": "string",
          "description": "Working directory for Terraform",
          "default": "."
        },
        "VAR_FILE": {
          "type": "string",
          "description": "Path to tfvars file",
          "default": ""
        },
        "TF_VERSION": {
          "type": "string",
          "description": "Terraform version",
          "default": "1.6"
        }
      },
      "required": ["ACTION"]
    }

  steps:
    terraform_run:
      image: 'hashicorp/terraform:${{TF_VERSION}}'
      working_directory: '${{WORKING_DIR}}'
      commands:
        - |
          case "${{ACTION}}" in
            init)
              terraform init
              ;;
            plan)
              VAR_FILE_FLAG=""
              if [ -n "${{VAR_FILE}}" ]; then
                VAR_FILE_FLAG="-var-file=${{VAR_FILE}}"
              fi
              terraform plan $VAR_FILE_FLAG -out=tfplan
              ;;
            apply)
              terraform apply -auto-approve tfplan
              ;;
            destroy)
              terraform destroy -auto-approve
              ;;
          esac
```

Usage of the custom step:

```yaml
# Using the custom Terraform step type
version: '1.0'

steps:
  init:
    title: 'Terraform Init'
    type: terraform
    arguments:
      ACTION: init
      WORKING_DIR: '${{CF_VOLUME_PATH}}/terraform'

  plan:
    title: 'Terraform Plan'
    type: terraform
    arguments:
      ACTION: plan
      WORKING_DIR: '${{CF_VOLUME_PATH}}/terraform'
      VAR_FILE: environments/production.tfvars

  apply:
    title: 'Terraform Apply'
    type: terraform
    arguments:
      ACTION: apply
      WORKING_DIR: '${{CF_VOLUME_PATH}}/terraform'
```

## Step 5: Pipeline Triggers for Terraform Changes

Set up triggers that run the Terraform pipeline when infrastructure code changes.

```yaml
# codefresh-triggers.yml
# Pipeline with conditional triggers based on file changes
version: '1.0'

steps:
  clone:
    type: git-clone
    repo: '${{CF_REPO_OWNER}}/${{CF_REPO_NAME}}'
    revision: '${{CF_REVISION}}'

  # Check if Terraform files changed
  check_changes:
    title: 'Check for Terraform Changes'
    image: alpine/git
    commands:
      - |
        # Check if any Terraform files were modified
        CHANGED=$(git diff --name-only HEAD~1 | grep -c "\.tf$" || true)
        if [ "$CHANGED" -gt 0 ]; then
          cf_export TF_CHANGED=true
        else
          cf_export TF_CHANGED=false
        fi

  # Only run Terraform if files changed
  terraform_plan:
    title: 'Terraform Plan'
    image: hashicorp/terraform:1.6
    when:
      condition:
        all:
          tf_changed: '${{TF_CHANGED}} == true'
    commands:
      - terraform init
      - terraform plan -out=tfplan
```

## Best Practices

Use Codefresh's built-in caching to speed up Terraform init by caching the .terraform directory. Store Terraform state in a remote backend and never in the pipeline workspace. Use Codefresh pipeline variables for secrets and reference them with the `${{VARIABLE}}` syntax. Implement approval steps between plan and apply for production environments. Use the custom step type to standardize Terraform operations across teams. Leverage Codefresh's parallel execution to plan multiple environments simultaneously. Export Terraform outputs using cf_export to pass them to subsequent pipeline steps.

## Conclusion

Codefresh's Docker-native pipeline model makes it a natural fit for running Terraform. Every step runs in an isolated container, ensuring consistent environments. Combined with Codefresh's GitOps capabilities, you can create pipelines that provision infrastructure with Terraform and then deploy applications through ArgoCD, all in a single coordinated workflow. The key is to structure your pipeline with clear stages, proper approval gates, and good use of Codefresh's variable system for passing information between steps.
