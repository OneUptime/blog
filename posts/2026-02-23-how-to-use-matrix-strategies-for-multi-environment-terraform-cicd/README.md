# How to Use Matrix Strategies for Multi-Environment Terraform CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Matrix Strategy, GitHub Actions, Multi-Environment, DevOps

Description: Learn how to use CI/CD matrix strategies to efficiently manage Terraform deployments across multiple environments, regions, and cloud accounts with parallel and sequential execution.

---

When you manage Terraform across multiple environments, regions, or accounts, writing separate pipeline jobs for each combination quickly becomes unmanageable. Matrix strategies let you define your deployment targets as a list and have the CI/CD platform generate jobs for each one automatically. One pipeline definition handles dev, staging, and production across us-east-1, eu-west-1, and ap-southeast-1 without duplicating YAML.

## What Is a Matrix Strategy

A matrix strategy takes a set of variables and creates a job for every combination. If you have 3 environments and 3 regions, the matrix generates 9 jobs:

```text
dev     x us-east-1
dev     x eu-west-1
dev     x ap-southeast-1
staging x us-east-1
staging x eu-west-1
staging x ap-southeast-1
prod    x us-east-1
prod    x eu-west-1
prod    x ap-southeast-1
```

Each job runs with its own set of matrix variables, so you can parameterize everything from the Terraform workspace to the AWS account credentials.

## Basic Matrix in GitHub Actions

```yaml
# .github/workflows/terraform-matrix.yml
name: Terraform Multi-Environment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  plan:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, production]
      fail-fast: false  # Plan all environments even if one fails

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

      - name: Terraform Plan - ${{ matrix.environment }}
        run: |
          cd terraform
          terraform init -no-color \
            -backend-config="key=${{ matrix.environment }}/terraform.tfstate"
          terraform plan -no-color \
            -var-file="envs/${{ matrix.environment }}.tfvars" \
            -out="${{ matrix.environment }}.tfplan"

      - name: Upload plan artifact
        uses: actions/upload-artifact@v4
        with:
          name: plan-${{ matrix.environment }}
          path: terraform/${{ matrix.environment }}.tfplan
```

## Multi-Dimensional Matrix

Combine environments with regions:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, production]
        region: [us-east-1, eu-west-1]
        exclude:
          # Dev does not need EU deployment
          - environment: dev
            region: eu-west-1
      fail-fast: false

    steps:
      - uses: actions/checkout@v4

      - name: Deploy ${{ matrix.environment }} in ${{ matrix.region }}
        run: |
          cd terraform
          terraform init -no-color \
            -backend-config="key=${{ matrix.environment }}/${{ matrix.region }}/terraform.tfstate" \
            -backend-config="region=${{ matrix.region }}"

          terraform apply -no-color -auto-approve \
            -var-file="envs/${{ matrix.environment }}.tfvars" \
            -var="aws_region=${{ matrix.region }}"
```

This generates 5 jobs (3 environments x 2 regions, minus the dev/eu-west-1 exclusion).

## Matrix with Include for Custom Configuration

Use `include` to add environment-specific settings:

```yaml
jobs:
  deploy:
    strategy:
      matrix:
        include:
          - environment: dev
            aws_account: "111111111111"
            role_arn: arn:aws:iam::111111111111:role/terraform-cicd
            auto_approve: true
            terraform_dir: environments/dev

          - environment: staging
            aws_account: "222222222222"
            role_arn: arn:aws:iam::222222222222:role/terraform-cicd
            auto_approve: true
            terraform_dir: environments/staging

          - environment: production
            aws_account: "333333333333"
            role_arn: arn:aws:iam::333333333333:role/terraform-cicd
            auto_approve: false  # Requires manual approval
            terraform_dir: environments/production

    environment: ${{ matrix.environment }}

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials for ${{ matrix.environment }}
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ matrix.role_arn }}
          aws-region: us-east-1

      - name: Terraform Init
        run: |
          cd ${{ matrix.terraform_dir }}
          terraform init -no-color

      - name: Terraform Apply
        if: matrix.auto_approve == true
        run: |
          cd ${{ matrix.terraform_dir }}
          terraform apply -no-color -auto-approve

      - name: Terraform Apply (manual)
        if: matrix.auto_approve == false
        run: |
          cd ${{ matrix.terraform_dir }}
          terraform apply -no-color -auto-approve
          # The environment protection rule handles the approval gate
```

## Sequential Matrix Execution

By default, matrix jobs run in parallel. For ordered deployments (dev then staging then production), use separate jobs with dependencies:

```yaml
jobs:
  # Phase 1: Plan all environments in parallel
  plan:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, production]
      fail-fast: false

    steps:
      - uses: actions/checkout@v4
      - name: Plan ${{ matrix.environment }}
        run: |
          cd environments/${{ matrix.environment }}
          terraform init -no-color
          terraform plan -no-color -out=tfplan

      - uses: actions/upload-artifact@v4
        with:
          name: plan-${{ matrix.environment }}
          path: environments/${{ matrix.environment }}/tfplan

  # Phase 2: Apply dev (auto)
  apply-dev:
    needs: plan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: plan-dev
          path: environments/dev

      - name: Apply dev
        run: |
          cd environments/dev
          terraform init -no-color
          terraform apply -no-color -auto-approve tfplan

  # Phase 3: Apply staging (after dev succeeds)
  apply-staging:
    needs: apply-dev
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: plan-staging
          path: environments/staging

      - name: Apply staging
        run: |
          cd environments/staging
          terraform init -no-color
          terraform apply -no-color -auto-approve tfplan

  # Phase 4: Apply production (after staging succeeds, with approval)
  apply-production:
    needs: apply-staging
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: plan-production
          path: environments/production

      - name: Apply production
        run: |
          cd environments/production
          terraform init -no-color
          terraform apply -no-color -auto-approve tfplan
```

## Dynamic Matrix from Configuration File

Generate the matrix dynamically from a configuration file:

```json
{
  "environments": [
    {
      "name": "dev",
      "region": "us-east-1",
      "account_id": "111111111111",
      "terraform_dir": "environments/dev",
      "auto_apply": true
    },
    {
      "name": "staging",
      "region": "us-east-1",
      "account_id": "222222222222",
      "terraform_dir": "environments/staging",
      "auto_apply": true
    },
    {
      "name": "production-us",
      "region": "us-east-1",
      "account_id": "333333333333",
      "terraform_dir": "environments/production",
      "auto_apply": false
    },
    {
      "name": "production-eu",
      "region": "eu-west-1",
      "account_id": "333333333333",
      "terraform_dir": "environments/production",
      "auto_apply": false
    }
  ]
}
```

```yaml
jobs:
  generate-matrix:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}

    steps:
      - uses: actions/checkout@v4

      - name: Generate matrix from config
        id: set-matrix
        run: |
          # Read the config and format as a GitHub Actions matrix
          MATRIX=$(jq -c '{include: .environments}' deploy-config.json)
          echo "matrix=$MATRIX" >> $GITHUB_OUTPUT

  deploy:
    needs: generate-matrix
    runs-on: ubuntu-latest
    strategy:
      matrix: ${{ fromJson(needs.generate-matrix.outputs.matrix) }}
      fail-fast: false

    steps:
      - uses: actions/checkout@v4

      - name: Deploy ${{ matrix.name }}
        run: |
          echo "Deploying ${{ matrix.name }} in ${{ matrix.region }}"
          cd ${{ matrix.terraform_dir }}
          terraform init -no-color \
            -backend-config="key=${{ matrix.name }}/terraform.tfstate"
          terraform plan -no-color \
            -var="region=${{ matrix.region }}"
```

## GitLab CI Matrix

GitLab CI uses `parallel:matrix` for similar functionality:

```yaml
# .gitlab-ci.yml
stages:
  - plan
  - apply

plan:
  stage: plan
  image: hashicorp/terraform:1.7.0
  parallel:
    matrix:
      - ENVIRONMENT: [dev, staging, production]
        REGION: [us-east-1, eu-west-1]
  script:
    - cd environments/$ENVIRONMENT
    - terraform init -no-color -backend-config="key=${ENVIRONMENT}/${REGION}/terraform.tfstate"
    - terraform plan -no-color -var="region=$REGION" -out=tfplan
  artifacts:
    paths:
      - environments/$ENVIRONMENT/tfplan

apply:
  stage: apply
  image: hashicorp/terraform:1.7.0
  parallel:
    matrix:
      - ENVIRONMENT: dev
        REGION: [us-east-1, eu-west-1]
  script:
    - cd environments/$ENVIRONMENT
    - terraform init -no-color -backend-config="key=${ENVIRONMENT}/${REGION}/terraform.tfstate"
    - terraform apply -no-color -auto-approve tfplan
  dependencies:
    - plan
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

## Handling Matrix Failures

When one matrix job fails, you need visibility into which environment was affected:

```yaml
- name: Report matrix results
  if: always()
  uses: actions/github-script@v7
  with:
    script: |
      const status = '${{ job.status }}';
      const env = '${{ matrix.environment }}';
      const region = '${{ matrix.region }}';

      if (status === 'failure') {
        await github.rest.issues.create({
          owner: context.repo.owner,
          repo: context.repo.repo,
          title: `Terraform deployment failed: ${env} / ${region}`,
          body: `Deployment failed for environment **${env}** in region **${region}**.\n\nWorkflow run: ${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
          labels: ['deployment-failure', env]
        });
      }
```

## Optimizing Matrix Performance

```yaml
jobs:
  deploy:
    strategy:
      matrix:
        environment: [dev, staging, production]
      max-parallel: 2  # Limit concurrent deployments

    steps:
      # Cache Terraform providers across matrix jobs
      - name: Cache Terraform providers
        uses: actions/cache@v4
        with:
          path: ~/.terraform.d/plugin-cache
          key: terraform-providers-${{ hashFiles('**/.terraform.lock.hcl') }}

      - name: Setup provider cache
        run: |
          echo 'plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"' > ~/.terraformrc
          mkdir -p ~/.terraform.d/plugin-cache
```

## Summary

Matrix strategies transform verbose multi-environment pipeline configurations into concise, maintainable definitions. Define your environments as matrix variables, use `include` for environment-specific settings, and control execution order with job dependencies. Dynamic matrices generated from configuration files scale even better as you add environments or regions. The key is balancing parallel execution for speed with sequential dependencies where ordering matters.

For more on multi-environment patterns, see our guide on [handling Terraform CI/CD for multiple environments](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-cicd-for-multiple-environments/view).
