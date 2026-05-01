# How to Set Up Environment Promotion Pipelines with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Environment Promotion, CI/CD, Infrastructure as Code, DevOps, Pipeline

Description: Learn how to build environment promotion pipelines that progressively deploy OpenTofu changes through dev, staging, and production with automated gates and approval steps.

## Introduction

Environment promotion pipelines ensure infrastructure changes are validated in lower environments before reaching production. The pattern mirrors application deployment: dev → staging → prod, with automated tests and human approval gates at each transition.

## Pipeline Architecture

```mermaid
graph LR
    MAIN[Push to main] --> DEV[Plan + Apply Dev]
    DEV --> TEST[Automated Tests]
    TEST --> STAGING[Plan + Apply Staging]
    STAGING --> APPROVE[Human Approval]
    APPROVE --> PROD[Plan + Apply Prod]
```

## GitHub Actions: Multi-Environment Pipeline

```yaml
# .github/workflows/promote.yml

name: Infrastructure Promotion

on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    environment: dev
    defaults:
      run:
        working-directory: environments/dev
    steps:
      - uses: actions/checkout@v6
      - uses: opentofu/setup-opentofu@v2
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ vars.AWS_DEV_ROLE_ARN }}
          aws-region: us-east-1
      - run: tofu init -lockfile=readonly
      - run: tofu apply -auto-approve -no-color

  test-dev:
    needs: deploy-dev
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - name: Run infrastructure tests
        run: |
          # Test endpoints, connectivity, and health checks
          curl -f https://dev.myapp.example.com/health
          python tests/infrastructure_test.py --env=dev

  deploy-staging:
    needs: test-dev
    runs-on: ubuntu-latest
    environment: staging
    defaults:
      run:
        working-directory: environments/staging
    steps:
      - uses: actions/checkout@v6
      - uses: opentofu/setup-opentofu@v2
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ vars.AWS_STAGING_ROLE_ARN }}
          aws-region: us-east-1
      - run: tofu init -lockfile=readonly
      - run: tofu apply -auto-approve -no-color

  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    # GitHub environment with required reviewers = manual approval gate
    environment: production
    defaults:
      run:
        working-directory: environments/prod
    steps:
      - uses: actions/checkout@v6
      - uses: opentofu/setup-opentofu@v2
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ vars.AWS_PROD_ROLE_ARN }}
          aws-region: us-east-1
      - run: tofu init -lockfile=readonly
      - run: tofu apply -auto-approve -no-color
```

## Environment-Specific Variable Files

```hcl
# environments/dev/terraform.tfvars
instance_type     = "t3.micro"
min_capacity      = 1
max_capacity      = 2
rds_instance_class = "db.t3.micro"

# environments/prod/terraform.tfvars
instance_type      = "m5.large"
min_capacity       = 3
max_capacity       = 10
rds_instance_class = "db.r5.large"
```

## Promotion Gates: What to Check

After each environment deployment, validate:

```bash
# Smoke tests - basic connectivity
curl -f "https://${ENVIRONMENT}.myapp.example.com/health"

# Infrastructure tests using terratest or native tooling
# Check that resources have the expected configuration
aws rds describe-db-instances \
  --db-instance-identifier "${ENVIRONMENT}-postgres" \
  --query "DBInstances[0].DBInstanceStatus" \
  --output text | grep -q "available"
```

## Conclusion

Environment promotion pipelines bring the discipline of application release management to infrastructure. By requiring changes to pass through dev and staging before reaching production - with automated tests and human approval gates - you dramatically reduce the risk of infrastructure changes breaking production. The GitHub Environments feature provides a simple mechanism to require human approval before the production deployment step.
