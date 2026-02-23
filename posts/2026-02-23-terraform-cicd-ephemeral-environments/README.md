# How to Use Terraform CI/CD with Ephemeral Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Ephemeral Environments, Preview Environments, DevOps

Description: Create and manage short-lived preview environments with Terraform in CI/CD pipelines for pull request testing, demos, and integration testing with automatic cleanup.

---

Ephemeral environments are short-lived infrastructure stacks that get created for a specific purpose - testing a pull request, running integration tests, or demoing a feature - and then destroyed when no longer needed. They give developers production-like environments without the cost of keeping them running permanently.

Terraform is perfect for this because it can create and destroy entire environments declaratively. This post shows you how to wire it all together in a CI/CD pipeline.

## How Ephemeral Environments Work

The lifecycle is straightforward:

1. Developer opens a PR
2. CI pipeline creates a dedicated infrastructure stack for that PR
3. The application gets deployed to the ephemeral environment
4. Reviewers test the changes in an isolated environment
5. When the PR is merged or closed, the environment is destroyed

## Project Structure

Structure your Terraform to support dynamic naming:

```hcl
# environments/preview/variables.tf
variable "environment_name" {
  type        = string
  description = "Unique name for this ephemeral environment"
}

variable "ttl_hours" {
  type        = number
  description = "Time to live in hours before auto-cleanup"
  default     = 48
}

variable "base_domain" {
  type    = string
  default = "preview.myapp.com"
}

# environments/preview/main.tf
locals {
  # Sanitize environment name for use in resource names
  safe_name = replace(lower(var.environment_name), "/[^a-z0-9-]/", "-")
  fqdn      = "${local.safe_name}.${var.base_domain}"
  tags = {
    Environment = "preview"
    Name        = local.safe_name
    TTL         = var.ttl_hours
    CreatedAt   = timestamp()
    ManagedBy   = "terraform"
    Ephemeral   = "true"
  }
}

# Dedicated VPC for this environment (or use a shared one)
module "vpc" {
  source = "../../modules/vpc-minimal"

  name       = local.safe_name
  cidr_block = "10.${random_integer.cidr.result}.0.0/16"
  tags       = local.tags
}

resource "random_integer" "cidr" {
  min = 100
  max = 250
}

# Minimal compute for the preview environment
resource "aws_ecs_service" "app" {
  name            = local.safe_name
  cluster         = aws_ecs_cluster.preview.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1  # Single instance for previews

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.app.id]
  }
}

# DNS record for easy access
resource "aws_route53_record" "preview" {
  zone_id = data.aws_route53_zone.preview.zone_id
  name    = local.fqdn
  type    = "A"

  alias {
    name                   = aws_lb.preview.dns_name
    zone_id                = aws_lb.preview.zone_id
    evaluate_target_health = false
  }
}

# Output the URL for the PR comment
output "url" {
  value = "https://${local.fqdn}"
}

output "environment_name" {
  value = local.safe_name
}
```

## CI/CD Pipeline for Ephemeral Environments

```yaml
# .github/workflows/preview-environment.yml
name: Preview Environment
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

permissions:
  id-token: write
  contents: read
  pull-requests: write

env:
  ENV_NAME: "pr-${{ github.event.pull_request.number }}"

jobs:
  # Create or update the preview environment
  deploy:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    outputs:
      url: ${{ steps.apply.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_wrapper: false

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Init
        working-directory: environments/preview
        run: |
          terraform init \
            -backend-config="key=preview/${{ env.ENV_NAME }}/terraform.tfstate"

      - name: Terraform Apply
        id: apply
        working-directory: environments/preview
        run: |
          terraform apply -auto-approve \
            -var="environment_name=${{ env.ENV_NAME }}" \
            -var="ttl_hours=48" \
            -no-color

          URL=$(terraform output -raw url)
          echo "url=$URL" >> "$GITHUB_OUTPUT"

      # Post the environment URL to the PR
      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const body = `## Preview Environment Ready

            Your preview environment is deployed and available at:
            **${{ steps.apply.outputs.url }}**

            This environment will be automatically destroyed when the PR is closed or after 48 hours.

            | Detail | Value |
            |--------|-------|
            | Environment | \`${{ env.ENV_NAME }}\` |
            | Region | us-east-1 |
            | Status | Active |`;

            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const existing = comments.find(c => c.body.includes('Preview Environment'));

            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
                body: body
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: body
              });
            }

  # Run integration tests against the preview environment
  test:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Integration Tests
        run: |
          # Wait for environment to be healthy
          for i in $(seq 1 30); do
            STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${{ needs.deploy.outputs.url }}/health" || echo "000")
            if [ "$STATUS" = "200" ]; then
              echo "Environment is healthy"
              break
            fi
            echo "Waiting for environment... (attempt $i, status: $STATUS)"
            sleep 10
          done

          # Run tests
          npm run test:integration -- --base-url="${{ needs.deploy.outputs.url }}"

  # Destroy the environment when PR is closed
  destroy:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Destroy
        working-directory: environments/preview
        run: |
          terraform init \
            -backend-config="key=preview/${{ env.ENV_NAME }}/terraform.tfstate"

          terraform destroy -auto-approve \
            -var="environment_name=${{ env.ENV_NAME }}" \
            -no-color

      - name: Comment Destruction
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: '## Preview Environment Destroyed\n\nThe preview environment `${{ env.ENV_NAME }}` has been cleaned up.'
            });
```

## TTL-Based Auto-Cleanup

Environments that outlive their PRs (due to pipeline failures or skipped destruction) need a cleanup mechanism:

```yaml
# .github/workflows/cleanup-stale-environments.yml
name: Cleanup Stale Environments
on:
  schedule:
    - cron: '0 */4 * * *'  # Every 4 hours

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Find Stale Environments
        run: |
          # List all preview state files
          STATES=$(aws s3 ls s3://terraform-state/preview/ --recursive | awk '{print $4}')

          for STATE_KEY in $STATES; do
            ENV_NAME=$(echo "$STATE_KEY" | cut -d'/' -f2)

            # Check if the PR is still open
            PR_NUMBER=$(echo "$ENV_NAME" | sed 's/pr-//')
            PR_STATE=$(gh pr view "$PR_NUMBER" --json state -q '.state' 2>/dev/null || echo "UNKNOWN")

            if [ "$PR_STATE" = "CLOSED" ] || [ "$PR_STATE" = "MERGED" ] || [ "$PR_STATE" = "UNKNOWN" ]; then
              echo "Destroying stale environment: $ENV_NAME (PR state: $PR_STATE)"

              cd environments/preview
              terraform init -backend-config="key=preview/${ENV_NAME}/terraform.tfstate"
              terraform destroy -auto-approve -var="environment_name=${ENV_NAME}" || true
              cd ../..
            fi
          done
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Cost Control for Ephemeral Environments

Keep preview costs under control with smaller resource sizes and spending limits:

```hcl
# environments/preview/sizing.tf
locals {
  # Use minimal sizes for ephemeral environments
  sizing = {
    instance_type    = "t3.small"     # Not t3.xlarge
    db_instance_type = "db.t3.micro"  # Not db.r6g.large
    desired_count    = 1              # Not 3
    disk_size        = 20             # Not 100
  }
}

# Tag everything for cost tracking
resource "aws_resourcegroups_group" "preview" {
  name = "preview-${local.safe_name}"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [{
        Key    = "Environment"
        Values = ["preview"]
      }, {
        Key    = "Name"
        Values = [local.safe_name]
      }]
    })
  }
}
```

## Summary

Ephemeral environments with Terraform CI/CD involve:

1. Parameterized Terraform configs that accept dynamic environment names
2. Separate state files per environment using dynamic backend keys
3. Pipeline triggers on PR open (create), sync (update), and close (destroy)
4. Integration test jobs that run against the preview environment
5. TTL-based cleanup for environments that outlive their PRs
6. Cost controls with minimal resource sizing and spending alerts

Start simple with a single-service preview and expand to full-stack previews as the pattern proves itself. The payoff is significant: developers get fast, isolated testing environments without manual infrastructure setup. For managing the feature branch workflow around these environments, see [Terraform CI/CD with feature branch workflows](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-feature-branch-workflows/view).
