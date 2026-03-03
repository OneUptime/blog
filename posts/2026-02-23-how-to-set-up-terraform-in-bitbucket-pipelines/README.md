# How to Set Up Terraform in Bitbucket Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Bitbucket Pipelines, CI/CD, Infrastructure as Code, DevOps, Atlassian

Description: Configure Terraform CI/CD pipelines in Bitbucket Pipelines with plan-apply workflows, manual approval steps, caching, and multi-environment deployment patterns.

---

Bitbucket Pipelines is the built-in CI/CD service for Bitbucket Cloud. If your team already uses Bitbucket for source control, keeping your Terraform pipelines there avoids adding another tool to your stack. Bitbucket Pipelines runs builds in Docker containers, supports manual trigger steps for approval gates, and integrates with deployment environments for tracking.

This post covers setting up Terraform in Bitbucket Pipelines from a basic plan-and-apply workflow to a multi-environment deployment pipeline with approvals.

## Basic Setup

Enable Bitbucket Pipelines in your repository settings, then create a `bitbucket-pipelines.yml` file in the root of your repository:

```yaml
# bitbucket-pipelines.yml
# Basic Terraform pipeline

image: hashicorp/terraform:1.7.5

pipelines:
  default:
    - step:
        name: Validate
        script:
          - cd terraform
          - terraform init -backend=false
          - terraform validate
          - terraform fmt -check

  branches:
    main:
      - step:
          name: Plan
          script:
            - cd terraform
            - terraform init -input=false
            - terraform plan -out=tfplan -input=false
            - terraform show -no-color tfplan > plan.txt
          artifacts:
            - terraform/tfplan
            - terraform/plan.txt

      - step:
          name: Apply
          trigger: manual
          deployment: production
          script:
            - cd terraform
            - terraform init -input=false
            - terraform apply -input=false tfplan
```

## Configuring Repository Variables

Store your cloud provider credentials as repository variables. Go to Repository Settings, then Repository variables:

```text
AWS_ACCESS_KEY_ID = AKIA...        (secured)
AWS_SECRET_ACCESS_KEY = ...        (secured)
AWS_DEFAULT_REGION = us-east-1
```

Mark sensitive values as "Secured" so they are masked in build logs and cannot be read back through the UI.

For different environments, use deployment variables. Go to Repository Settings, then Deployments, and add variables specific to each environment (test, staging, production).

## Multi-Environment Pipeline

Bitbucket Pipelines supports deployment environments with their own variables. Here is a pipeline that deploys through dev, staging, and production:

```yaml
# bitbucket-pipelines.yml
# Multi-environment Terraform pipeline

image: hashicorp/terraform:1.7.5

definitions:
  # Reusable step definitions
  steps:
    - step: &validate
        name: Validate Terraform
        script:
          - cd terraform
          - terraform init -backend=false
          - terraform validate
          - terraform fmt -check -diff

    - step: &plan-template
        name: Terraform Plan
        script:
          - cd terraform
          - terraform init
            -backend-config="environments/${ENVIRONMENT}/backend.hcl"
            -input=false
          - terraform plan
            -var-file="environments/${ENVIRONMENT}/terraform.tfvars"
            -out=tfplan
            -input=false
          - terraform show -no-color tfplan > plan.txt
        artifacts:
          - terraform/tfplan
          - terraform/plan.txt
          - terraform/.terraform/**
          - terraform/.terraform.lock.hcl

    - step: &apply-template
        name: Terraform Apply
        script:
          - cd terraform
          - terraform init
            -backend-config="environments/${ENVIRONMENT}/backend.hcl"
            -input=false
          - terraform apply -input=false tfplan

pipelines:
  # Pull request pipeline - validate and plan only
  pull-requests:
    '**':
      - step: *validate
      - step:
          <<: *plan-template
          name: Plan (dev)
          deployment: test

  # Main branch pipeline - full deployment
  branches:
    main:
      - step: *validate

      # Dev
      - step:
          <<: *plan-template
          name: Plan Dev
          deployment: test

      - step:
          <<: *apply-template
          name: Apply Dev
          deployment: test

      # Staging
      - step:
          <<: *plan-template
          name: Plan Staging
          deployment: staging

      - step:
          <<: *apply-template
          name: Apply Staging
          trigger: manual
          deployment: staging

      # Production
      - step:
          <<: *plan-template
          name: Plan Production
          deployment: production

      - step:
          <<: *apply-template
          name: Apply Production
          trigger: manual
          deployment: production
```

The `deployment` keyword links the step to a Bitbucket deployment environment, which provides environment-specific variables and deployment tracking.

## Deployment Environment Variables

Configure each deployment environment in Repository Settings under Deployments:

**test environment:**
```text
ENVIRONMENT = dev
AWS_ACCESS_KEY_ID = (dev account key)
AWS_SECRET_ACCESS_KEY = (dev account secret)
```

**staging environment:**
```text
ENVIRONMENT = staging
AWS_ACCESS_KEY_ID = (staging account key)
AWS_SECRET_ACCESS_KEY = (staging account secret)
```

**production environment:**
```text
ENVIRONMENT = production
AWS_ACCESS_KEY_ID = (production account key)
AWS_SECRET_ACCESS_KEY = (production account secret)
```

## Caching Terraform Providers

Bitbucket Pipelines supports caching to speed up builds:

```yaml
definitions:
  caches:
    terraform: terraform/.terraform/providers

image: hashicorp/terraform:1.7.5

pipelines:
  branches:
    main:
      - step:
          name: Plan
          caches:
            - terraform
          script:
            - cd terraform
            - terraform init -input=false
            - terraform plan -out=tfplan -input=false
          artifacts:
            - terraform/tfplan
```

The cache persists across builds, so providers are only downloaded when the lock file changes.

## Using a Custom Docker Image

If you need additional tools beyond what the Terraform image provides, build a custom image:

```dockerfile
# Dockerfile for Terraform pipeline
FROM hashicorp/terraform:1.7.5

# Install additional tools
RUN apk add --no-cache \
    bash \
    curl \
    jq \
    python3 \
    py3-pip

# Install AWS CLI
RUN pip3 install awscli

# Install tflint for linting
RUN wget -q https://github.com/terraform-linters/tflint/releases/download/v0.50.3/tflint_linux_amd64.zip && \
    unzip tflint_linux_amd64.zip && \
    mv tflint /usr/local/bin/ && \
    rm tflint_linux_amd64.zip
```

Push this image to a container registry and reference it in your pipeline:

```yaml
image: myregistry/terraform-pipeline:1.7.5

pipelines:
  branches:
    main:
      - step:
          name: Lint and Plan
          script:
            - cd terraform
            - tflint --init
            - tflint
            - terraform init -input=false
            - terraform plan -out=tfplan -input=false
```

## Parallel Plans for Multiple Configurations

If you have multiple Terraform configurations that are independent, run their plans in parallel:

```yaml
pipelines:
  branches:
    main:
      - parallel:
          - step:
              name: Plan Networking
              script:
                - cd terraform/networking
                - terraform init -input=false
                - terraform plan -out=tfplan -input=false
              artifacts:
                - terraform/networking/tfplan

          - step:
              name: Plan Compute
              script:
                - cd terraform/compute
                - terraform init -input=false
                - terraform plan -out=tfplan -input=false
              artifacts:
                - terraform/compute/tfplan

          - step:
              name: Plan Database
              script:
                - cd terraform/database
                - terraform init -input=false
                - terraform plan -out=tfplan -input=false
              artifacts:
                - terraform/database/tfplan

      # Sequential applies (networking must come before compute)
      - step:
          name: Apply Networking
          trigger: manual
          script:
            - cd terraform/networking
            - terraform init -input=false
            - terraform apply -input=false tfplan

      - step:
          name: Apply Compute
          trigger: manual
          script:
            - cd terraform/compute
            - terraform init -input=false
            - terraform apply -input=false tfplan
```

## Using Pipes

Bitbucket Pipes are pre-built integration steps. While there is no official Terraform pipe, you can use the AWS pipes for credential management:

```yaml
pipelines:
  branches:
    main:
      - step:
          name: Plan
          oidc: true
          script:
            # Use OIDC to assume an AWS role
            - export AWS_WEB_IDENTITY_TOKEN_FILE=$(mktemp)
            - echo $BITBUCKET_STEP_OIDC_TOKEN > $AWS_WEB_IDENTITY_TOKEN_FILE
            - export AWS_ROLE_ARN="arn:aws:iam::123456789012:role/bitbucket-terraform"
            - cd terraform
            - terraform init -input=false
            - terraform plan -out=tfplan -input=false
```

## Build Minute Optimization

Bitbucket Pipelines charges based on build minutes. Optimize your pipeline:

```yaml
# Only run on relevant file changes
pipelines:
  branches:
    main:
      - step:
          name: Check Changes
          script:
            - |
              # Check if Terraform files changed
              if git diff --name-only HEAD~1 | grep -q '\.tf$\|\.tfvars$'; then
                echo "Terraform files changed, proceeding"
              else
                echo "No Terraform changes, skipping"
                exit 0
              fi

      - step:
          name: Plan
          # Use a smaller size for plan steps
          size: 1x  # Default size
          script:
            - cd terraform
            - terraform init -input=false
            - terraform plan -out=tfplan -input=false

      - step:
          name: Apply
          trigger: manual
          size: 1x
          script:
            - cd terraform
            - terraform init -input=false
            - terraform apply -input=false tfplan
```

You can also use `condition` to skip steps based on file changes:

```yaml
pipelines:
  branches:
    main:
      - step:
          name: Plan
          condition:
            changesets:
              includePaths:
                - "terraform/**"
          script:
            - cd terraform
            - terraform init -input=false
            - terraform plan -out=tfplan -input=false
```

## Viewing Deployment History

Bitbucket tracks deployments linked to environments. Go to the Deployments tab in your repository to see:

- Which commit is deployed to each environment
- The deployment history with timestamps
- Whether the deployment succeeded or failed
- Who triggered manual deployments

This gives your team a clear view of what is running where without needing external tracking.

## Limitations and Workarounds

**No native approval with reviewers**: Bitbucket's `trigger: manual` allows anyone with write access to trigger the step. For stricter controls, use branch permissions to restrict who can push to main, which indirectly controls who can trigger deployments.

**Artifact size limits**: Bitbucket Pipelines limits artifacts to 1 GB per step. Large Terraform plans rarely hit this, but keep it in mind for configurations with many resources.

**Step timeout**: The default timeout is 120 minutes. For very large infrastructure changes, increase it:

```yaml
- step:
    name: Apply
    max-time: 180  # 3 hours
    script:
      - terraform apply -input=false tfplan
```

## Conclusion

Bitbucket Pipelines provides everything you need for Terraform CI/CD if you are already in the Atlassian ecosystem. The YAML configuration is straightforward, deployment environments handle secret scoping, and manual trigger steps serve as approval gates. The main strengths are the tight integration with Bitbucket's pull request workflow and deployment tracking. Set up your pipeline with environment-specific variables, use caching for fast provider downloads, and take advantage of parallel steps for independent Terraform configurations.

For more Terraform CI/CD options, check out our guide on [setting up Terraform in CircleCI](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-terraform-in-circleci/view).
