# How to Use Workspaces with CI/CD Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, CI/CD, GitHub Actions, GitLab CI, Jenkins, Automation

Description: Learn how to integrate Terraform workspaces into CI/CD pipelines for automated, workspace-aware infrastructure deployments across GitHub Actions, GitLab CI, and Jenkins.

---

Running Terraform manually works for small projects, but as your team and infrastructure grow, you need automated pipelines. When workspaces are part of your workflow, the pipeline needs to know which workspace to operate in, which variables to load, and how to handle workspace lifecycle. This post covers workspace integration with the three most common CI/CD platforms.

## Core Pipeline Pattern

Regardless of the CI/CD platform, the pattern is the same:

1. Initialize Terraform and the backend
2. Select or create the target workspace
3. Load workspace-specific variables
4. Plan the changes
5. Apply (with approval gates for production)

```bash
# The universal pattern in pseudocode
terraform init
terraform workspace select -or-create $ENVIRONMENT
terraform plan -var-file="envs/${ENVIRONMENT}.tfvars" -out=tfplan
terraform apply tfplan
```

## GitHub Actions

### Basic Workspace Pipeline

```yaml
# .github/workflows/terraform.yml
name: Terraform Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - dev
          - staging
          - prod

permissions:
  id-token: write
  contents: read

jobs:
  plan:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}-plan
    outputs:
      workspace: ${{ steps.workspace.outputs.name }}
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Init
        run: terraform init -input=false

      - name: Select Workspace
        id: workspace
        run: |
          terraform workspace select -or-create ${{ github.event.inputs.environment }}
          echo "name=$(terraform workspace show)" >> "$GITHUB_OUTPUT"

      - name: Terraform Plan
        run: |
          WORKSPACE=$(terraform workspace show)
          terraform plan \
            -var-file="envs/${WORKSPACE}.tfvars" \
            -out=tfplan \
            -no-color 2>&1 | tee plan-output.txt

      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan-${{ github.event.inputs.environment }}
          path: |
            tfplan
            plan-output.txt

  apply:
    needs: plan
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: tfplan-${{ github.event.inputs.environment }}

      - name: Terraform Init
        run: terraform init -input=false

      - name: Select Workspace
        run: terraform workspace select ${{ github.event.inputs.environment }}

      - name: Terraform Apply
        run: terraform apply -auto-approve tfplan
```

### PR-Based Workspace Pipeline

This pipeline creates and destroys workspaces based on pull request lifecycle:

```yaml
# .github/workflows/pr-environment.yml
name: PR Environment

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]
    paths:
      - '**.tf'
      - 'envs/**'

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  deploy:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Set Workspace Name
        id: ws
        run: |
          WS="pr-${{ github.event.pull_request.number }}"
          echo "name=$WS" >> "$GITHUB_OUTPUT"

      - name: Init and Select Workspace
        run: |
          terraform init -input=false
          terraform workspace select -or-create ${{ steps.ws.outputs.name }}

      - name: Plan
        id: plan
        run: |
          terraform plan -var-file="envs/dev.tfvars" -no-color -out=tfplan 2>&1 | tee /tmp/plan.txt
        continue-on-error: true

      - name: Comment Plan on PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('/tmp/plan.txt', 'utf8');
            const truncated = plan.length > 60000 ? plan.substring(0, 60000) + '\n...(truncated)' : plan;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `### Terraform Plan for \`${{ steps.ws.outputs.name }}\`\n\`\`\`\n${truncated}\n\`\`\``
            });

      - name: Apply
        if: steps.plan.outcome == 'success'
        run: terraform apply -auto-approve tfplan

  cleanup:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Cleanup
        run: |
          WS="pr-${{ github.event.pull_request.number }}"
          terraform init -input=false

          if terraform workspace list | sed 's/^[ *]*//' | grep -qx "$WS"; then
            terraform workspace select "$WS"
            terraform destroy -auto-approve -var-file="envs/dev.tfvars"
            terraform workspace select default
            terraform workspace delete "$WS"
            echo "Cleaned up workspace: $WS"
          else
            echo "Workspace $WS not found, nothing to clean up"
          fi
```

## GitLab CI

```yaml
# .gitlab-ci.yml

stages:
  - validate
  - plan
  - apply
  - cleanup

variables:
  TF_IN_AUTOMATION: "true"

.terraform_init: &terraform_init
  - terraform init -input=false
  - terraform workspace select -or-create ${ENVIRONMENT}

validate:
  stage: validate
  image: hashicorp/terraform:1.7
  script:
    - terraform init -backend=false
    - terraform validate
  rules:
    - if: $CI_MERGE_REQUEST_ID

plan:dev:
  stage: plan
  image: hashicorp/terraform:1.7
  variables:
    ENVIRONMENT: dev
  script:
    - *terraform_init
    - terraform plan -var-file="envs/${ENVIRONMENT}.tfvars" -out=tfplan
  artifacts:
    paths:
      - tfplan
    expire_in: 1 hour
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

plan:staging:
  stage: plan
  image: hashicorp/terraform:1.7
  variables:
    ENVIRONMENT: staging
  script:
    - *terraform_init
    - terraform plan -var-file="envs/${ENVIRONMENT}.tfvars" -out=tfplan
  artifacts:
    paths:
      - tfplan
    expire_in: 1 hour
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

plan:prod:
  stage: plan
  image: hashicorp/terraform:1.7
  variables:
    ENVIRONMENT: prod
  script:
    - *terraform_init
    - terraform plan -var-file="envs/${ENVIRONMENT}.tfvars" -out=tfplan
  artifacts:
    paths:
      - tfplan
    expire_in: 1 hour
  rules:
    - if: $CI_COMMIT_TAG

apply:dev:
  stage: apply
  image: hashicorp/terraform:1.7
  variables:
    ENVIRONMENT: dev
  script:
    - *terraform_init
    - terraform apply -auto-approve tfplan
  dependencies:
    - plan:dev
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

apply:staging:
  stage: apply
  image: hashicorp/terraform:1.7
  variables:
    ENVIRONMENT: staging
  script:
    - *terraform_init
    - terraform apply -auto-approve tfplan
  dependencies:
    - plan:staging
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  when: manual

apply:prod:
  stage: apply
  image: hashicorp/terraform:1.7
  variables:
    ENVIRONMENT: prod
  script:
    - *terraform_init
    - terraform apply -auto-approve tfplan
  dependencies:
    - plan:prod
  environment:
    name: production
  rules:
    - if: $CI_COMMIT_TAG
  when: manual

# Feature branch environments
deploy:review:
  stage: apply
  image: hashicorp/terraform:1.7
  variables:
    ENVIRONMENT: "mr-${CI_MERGE_REQUEST_IID}"
  script:
    - *terraform_init
    - terraform apply -auto-approve -var-file="envs/dev.tfvars"
  environment:
    name: review/${CI_COMMIT_REF_SLUG}
    on_stop: cleanup:review
  rules:
    - if: $CI_MERGE_REQUEST_ID

cleanup:review:
  stage: cleanup
  image: hashicorp/terraform:1.7
  variables:
    ENVIRONMENT: "mr-${CI_MERGE_REQUEST_IID}"
    GIT_STRATEGY: clone
  script:
    - *terraform_init
    - terraform destroy -auto-approve -var-file="envs/dev.tfvars"
    - terraform workspace select default
    - terraform workspace delete "${ENVIRONMENT}"
  environment:
    name: review/${CI_COMMIT_REF_SLUG}
    action: stop
  rules:
    - if: $CI_MERGE_REQUEST_ID
      when: manual
```

## Jenkins

```groovy
// Jenkinsfile

pipeline {
  agent {
    docker {
      image 'hashicorp/terraform:1.7'
    }
  }

  parameters {
    choice(
      name: 'ENVIRONMENT',
      choices: ['dev', 'staging', 'prod'],
      description: 'Target environment workspace'
    )
    booleanParam(
      name: 'AUTO_APPROVE',
      defaultValue: false,
      description: 'Skip manual approval (never for prod)'
    )
  }

  environment {
    TF_IN_AUTOMATION = 'true'
    AWS_DEFAULT_REGION = 'us-east-1'
  }

  stages {
    stage('Init') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                          credentialsId: 'aws-terraform']]) {
          sh 'terraform init -input=false'
        }
      }
    }

    stage('Select Workspace') {
      steps {
        sh """
          terraform workspace select ${params.ENVIRONMENT} 2>/dev/null || \
          terraform workspace new ${params.ENVIRONMENT}
        """
        sh 'echo "Current workspace: $(terraform workspace show)"'
      }
    }

    stage('Plan') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                          credentialsId: 'aws-terraform']]) {
          sh """
            terraform plan \
              -var-file="envs/${params.ENVIRONMENT}.tfvars" \
              -out=tfplan \
              -no-color
          """
        }
      }
    }

    stage('Approval') {
      when {
        expression {
          return params.ENVIRONMENT == 'prod' || !params.AUTO_APPROVE
        }
      }
      steps {
        input message: "Apply plan to ${params.ENVIRONMENT}?",
              ok: 'Apply'
      }
    }

    stage('Apply') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                          credentialsId: 'aws-terraform']]) {
          sh 'terraform apply -auto-approve tfplan'
        }
      }
    }
  }

  post {
    failure {
      echo "Terraform deployment to ${params.ENVIRONMENT} failed!"
    }
    success {
      echo "Terraform deployment to ${params.ENVIRONMENT} succeeded!"
    }
    always {
      // Clean up plan file
      sh 'rm -f tfplan'
    }
  }
}
```

## Common Pipeline Challenges

### Concurrent Workspace Operations

Two pipeline runs targeting the same workspace can conflict. Use state locking (DynamoDB for S3, built-in for other backends) and pipeline-level concurrency controls:

```yaml
# GitHub Actions - limit concurrency per environment
concurrency:
  group: terraform-${{ github.event.inputs.environment }}
  cancel-in-progress: false
```

### Plan/Apply Drift

The plan artifact must be from the same commit that gets applied. If the branch moves between plan and apply, the plan might be stale:

```yaml
# Store the commit SHA with the plan
- name: Plan
  run: |
    echo "${{ github.sha }}" > plan-commit.txt
    terraform plan -out=tfplan

# Verify at apply time
- name: Verify Commit
  run: |
    PLAN_COMMIT=$(cat plan-commit.txt)
    if [ "$PLAN_COMMIT" != "${{ github.sha }}" ]; then
      echo "Plan was generated from a different commit. Re-run the pipeline."
      exit 1
    fi
```

### Handling Init Across Workspaces

`terraform init` needs to happen before workspace selection. The workspace itself might not exist yet. Always use the `-or-create` pattern or the try-select-then-create fallback.

## Pipeline Security

**Use OIDC for cloud authentication.** Avoid long-lived credentials. GitHub Actions and GitLab CI both support OIDC for assuming AWS roles.

**Different credentials per workspace.** Use separate IAM roles for prod vs non-prod:

```yaml
- name: Configure Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ github.event.inputs.environment == 'prod' && secrets.PROD_ROLE_ARN || secrets.DEV_ROLE_ARN }}
    aws-region: us-east-1
```

**Require approval for production.** Every CI/CD platform supports manual approval gates. Use them for production workspaces without exception.

## Conclusion

CI/CD pipelines and Terraform workspaces fit together naturally. The workspace determines the state, the variable file, and the approval requirements. Build your pipeline around the select-plan-approve-apply pattern, add concurrency controls and commit verification for safety, and use platform features like environments and approval gates to protect production. For an alternative approach that separates environments by directory instead of workspace, see our post on [migrating from workspaces to directory-based environments](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-from-workspaces-to-directory-based-environments/view).
