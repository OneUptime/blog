# How to Use HCP Terraform with Bitbucket

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Bitbucket, Bitbucket Pipelines, CI/CD, DevOps

Description: Learn how to integrate HCP Terraform with Bitbucket and Bitbucket Pipelines for automated Terraform planning and deployment workflows.

---

Bitbucket is widely used in enterprise environments, especially by teams already invested in the Atlassian ecosystem. Integrating Bitbucket with HCP Terraform lets you manage your Terraform workflows alongside your existing Jira and Confluence tools. There are two ways to do this: through HCP Terraform's native VCS integration with Bitbucket, or via Bitbucket Pipelines for a CI/CD-driven approach.

This guide covers both methods so you can pick the one that fits your workflow best.

## Option 1: Native VCS Integration

HCP Terraform has built-in support for Bitbucket Cloud and Bitbucket Server (Data Center). This gives you automatic speculative plans on pull requests and triggered runs on merges.

### Setting Up the VCS Connection

For Bitbucket Cloud:

1. In HCP Terraform, go to **Settings** > **Providers**
2. Click **Add a VCS Provider**
3. Select **Bitbucket Cloud**
4. You will need to create an OAuth consumer in Bitbucket:
   - Go to your Bitbucket workspace settings
   - Navigate to **OAuth consumers** > **Add consumer**
   - Name: HCP Terraform
   - Callback URL: `https://app.terraform.io/auth/bitbucket-cloud`
   - Permissions: Account (Read), Repositories (Read, Write), Pull Requests (Read, Write), Webhooks (Read and Write)
5. Copy the Key and Secret back to HCP Terraform
6. Click **Connect and Continue**

### Creating a VCS-Connected Workspace

```hcl
# Create a workspace connected to Bitbucket
resource "tfe_workspace" "app_infra" {
  name           = "app-infrastructure"
  organization   = "your-org"
  execution_mode = "remote"

  vcs_repo {
    identifier     = "your-bitbucket-workspace/infrastructure-repo"
    branch         = "main"
    oauth_token_id = data.tfe_oauth_client.bitbucket.oauth_token_id
  }

  working_directory = "terraform"
  auto_apply        = false
}
```

With this setup:
- Opening a pull request triggers a speculative plan
- Merging to the main branch triggers a full run
- Plan status is posted back as a build status on the PR

## Option 2: Bitbucket Pipelines

For more control over the CI/CD workflow, use Bitbucket Pipelines to drive HCP Terraform operations.

### Setting Up Repository Variables

1. Go to your Bitbucket repository
2. Navigate to **Repository settings** > **Repository variables**
3. Add the following variables:
   - `TF_API_TOKEN`: Your HCP Terraform team API token (mark as Secured)

### Basic Pipeline Configuration

```yaml
# bitbucket-pipelines.yml
image: hashicorp/terraform:1.7.0

definitions:
  steps:
    - step: &terraform-init
        name: Terraform Init
        script:
          # Create credentials file
          - |
            cat > ~/.terraformrc << EOF
            credentials "app.terraform.io" {
              token = "$TF_API_TOKEN"
            }
            EOF
          - cd infrastructure
          - terraform init -input=false

pipelines:
  pull-requests:
    '**':
      - step:
          name: Terraform Plan
          script:
            - |
              cat > ~/.terraformrc << EOF
              credentials "app.terraform.io" {
                token = "$TF_API_TOKEN"
              }
              EOF
            - cd infrastructure
            - terraform init -input=false
            - terraform fmt -check -recursive
            - terraform validate -no-color
            - terraform plan -no-color -input=false
          condition:
            changesets:
              includePaths:
                - "infrastructure/**"

  branches:
    main:
      - step:
          name: Terraform Plan
          script:
            - |
              cat > ~/.terraformrc << EOF
              credentials "app.terraform.io" {
                token = "$TF_API_TOKEN"
              }
              EOF
            - cd infrastructure
            - terraform init -input=false
            - terraform plan -no-color -input=false
          condition:
            changesets:
              includePaths:
                - "infrastructure/**"
      - step:
          name: Terraform Apply
          trigger: manual  # Require manual approval
          deployment: production
          script:
            - |
              cat > ~/.terraformrc << EOF
              credentials "app.terraform.io" {
                token = "$TF_API_TOKEN"
              }
              EOF
            - cd infrastructure
            - terraform init -input=false
            - terraform apply -auto-approve -input=false
          condition:
            changesets:
              includePaths:
                - "infrastructure/**"
```

### Multi-Environment Pipeline

```yaml
# bitbucket-pipelines.yml - Multi-environment
image: hashicorp/terraform:1.7.0

definitions:
  steps:
    - step: &setup-credentials
        script:
          - |
            cat > ~/.terraformrc << EOF
            credentials "app.terraform.io" {
              token = "$TF_API_TOKEN"
            }
            EOF

pipelines:
  branches:
    main:
      # Staging
      - step:
          name: Plan Staging
          script:
            - |
              cat > ~/.terraformrc << EOF
              credentials "app.terraform.io" {
                token = "$TF_API_TOKEN"
              }
              EOF
            - cd infrastructure
            - export TF_WORKSPACE="app-staging"
            - terraform init -input=false
            - terraform plan -no-color -input=false

      - step:
          name: Apply Staging
          deployment: staging
          script:
            - |
              cat > ~/.terraformrc << EOF
              credentials "app.terraform.io" {
                token = "$TF_API_TOKEN"
              }
              EOF
            - cd infrastructure
            - export TF_WORKSPACE="app-staging"
            - terraform init -input=false
            - terraform apply -auto-approve -input=false

      # Production
      - step:
          name: Plan Production
          script:
            - |
              cat > ~/.terraformrc << EOF
              credentials "app.terraform.io" {
                token = "$TF_API_TOKEN"
              }
              EOF
            - cd infrastructure
            - export TF_WORKSPACE="app-production"
            - terraform init -input=false
            - terraform plan -no-color -input=false

      - step:
          name: Apply Production
          trigger: manual
          deployment: production
          script:
            - |
              cat > ~/.terraformrc << EOF
              credentials "app.terraform.io" {
                token = "$TF_API_TOKEN"
              }
              EOF
            - cd infrastructure
            - export TF_WORKSPACE="app-production"
            - terraform init -input=false
            - terraform apply -auto-approve -input=false
```

### Terraform Configuration for Multiple Workspaces

```hcl
# infrastructure/main.tf
terraform {
  cloud {
    organization = "your-org"

    workspaces {
      tags = ["app-infrastructure"]
    }
  }

  required_version = ">= 1.5.0"
}
```

## Posting Plan Output as PR Comment

Bitbucket Pipelines can post comments on pull requests:

```yaml
# Pull request pipeline with comment
pull-requests:
  '**':
    - step:
        name: Terraform Plan with PR Comment
        script:
          - |
            cat > ~/.terraformrc << EOF
            credentials "app.terraform.io" {
              token = "$TF_API_TOKEN"
            }
            EOF
          - apk add --no-cache curl jq
          - cd infrastructure
          - terraform init -input=false
          - terraform plan -no-color -input=false 2>&1 | tee /tmp/plan.txt

          # Post plan as PR comment using Bitbucket API
          - |
            PLAN_OUTPUT=$(cat /tmp/plan.txt | head -c 30000)
            COMMENT_BODY=$(jq -n --arg content "## Terraform Plan

            \`\`\`
            $PLAN_OUTPUT
            \`\`\`

            *Pipeline: $BITBUCKET_BUILD_NUMBER*" '{"content": {"raw": $content}}')

            curl -s -X POST \
              -H "Content-Type: application/json" \
              -u "$BITBUCKET_USER:$BITBUCKET_APP_PASSWORD" \
              -d "$COMMENT_BODY" \
              "https://api.bitbucket.org/2.0/repositories/$BITBUCKET_REPO_FULL_NAME/pullrequests/$BITBUCKET_PR_ID/comments"
```

You will need to add `BITBUCKET_USER` and `BITBUCKET_APP_PASSWORD` as repository variables for the API authentication.

## Using Bitbucket Deployments

Bitbucket Pipelines has a built-in deployments feature that works well with infrastructure workflows:

```yaml
# Using deployment environments
- step:
    name: Deploy to Production
    deployment: production
    trigger: manual
    script:
      # ... terraform apply
```

Configure deployment environments in Bitbucket:

1. Go to **Repository settings** > **Deployments**
2. Add environments: Development, Staging, Production
3. For Production, you can enable **Required reviewers**
4. This adds an approval gate before the production apply step runs

## Caching Terraform Providers

Speed up pipeline runs by caching downloaded providers:

```yaml
definitions:
  caches:
    terraform: infrastructure/.terraform

pipelines:
  branches:
    main:
      - step:
          name: Terraform Apply
          caches:
            - terraform
          script:
            - |
              cat > ~/.terraformrc << EOF
              credentials "app.terraform.io" {
                token = "$TF_API_TOKEN"
              }
              EOF
            - cd infrastructure
            - terraform init -input=false
            - terraform apply -auto-approve -input=false
```

## Security Best Practices

### Secured Variables

Always mark API tokens as "Secured" in Bitbucket repository variables. This prevents them from being displayed in pipeline logs.

### Branch Restrictions

Only allow applies from the main branch:

```yaml
pipelines:
  branches:
    main:
      # Only main branch gets apply steps
      - step:
          name: Apply
          deployment: production
          trigger: manual
```

### Deployment Permissions

Use Bitbucket deployment environments with required reviewers to add approval gates before production applies.

### Separate Tokens

Use different HCP Terraform tokens for different environments:

```yaml
# Repository variables:
# TF_API_TOKEN_STAGING: Token with staging workspace access
# TF_API_TOKEN_PRODUCTION: Token with production workspace access

- step:
    name: Apply Staging
    script:
      - export TF_API_TOKEN=$TF_API_TOKEN_STAGING
      # ... rest of script
```

## Troubleshooting

**Pipeline fails with "credentials" error**: Make sure the `TF_API_TOKEN` variable is set and not empty. Check that the token has not expired.

**Plans hanging**: Remote execution streams logs. If the workspace is waiting for another run to complete, the pipeline will wait. Set appropriate timeouts in your pipeline configuration.

**"No matching workspaces" error**: When using tags in the `cloud` block, make sure the `TF_WORKSPACE` environment variable matches an existing workspace name.

**Bitbucket API rate limits**: If posting PR comments fails, you may be hitting Bitbucket API rate limits. Add retry logic or reduce comment frequency.

## Summary

Bitbucket integrates with HCP Terraform through either native VCS connections (for the simplest setup) or Bitbucket Pipelines (for full control). The Pipelines approach gives you more flexibility - you can add validation steps, post plan output as PR comments, and create multi-environment deployment pipelines with manual gates. Use secured repository variables for tokens, leverage Bitbucket deployment environments for approval workflows, and keep your production applies behind manual triggers.

For other CI/CD integrations, see our guides on [HCP Terraform with GitHub Actions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-hcp-terraform-with-github-actions/view) and [HCP Terraform with Azure DevOps](https://oneuptime.com/blog/post/2026-02-23-how-to-use-hcp-terraform-with-azure-devops/view).
