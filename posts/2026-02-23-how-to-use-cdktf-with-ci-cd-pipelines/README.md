# How to Use CDKTF with CI/CD Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, CI/CD, GitHub Actions, DevOps

Description: Learn how to integrate CDKTF with CI/CD pipelines using GitHub Actions, GitLab CI, and other platforms for automated infrastructure deployments.

---

Running CDKTF from your laptop works for development, but production infrastructure should be deployed through a CI/CD pipeline. Automated pipelines ensure consistency, provide audit trails, enable code reviews before deployment, and prevent "it works on my machine" problems. This guide shows how to set up CDKTF in CI/CD pipelines using GitHub Actions, GitLab CI, and general patterns that work with any platform.

## Why CI/CD for Infrastructure

Manual deployments are risky. Someone might forget to pull the latest code. Someone might have different environment variables set. Someone might accidentally deploy to production instead of staging. A CI/CD pipeline eliminates all of these risks by running the same commands, in the same environment, every time.

A good infrastructure CI/CD pipeline should:
- Run tests on every pull request
- Show a plan diff for review before merging
- Deploy automatically after merge to main
- Support manual approval for production deployments

## GitHub Actions Pipeline

Here is a complete GitHub Actions workflow for CDKTF:

```yaml
# .github/workflows/infrastructure.yml
name: Infrastructure Deployment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  # Terraform/CDKTF version
  CDKTF_VERSION: "0.20.0"
  NODE_VERSION: "20"
  # AWS credentials from GitHub secrets
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  AWS_DEFAULT_REGION: "us-east-1"

jobs:
  # Run tests on all PRs and pushes
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Synthesize configuration
        run: npx cdktf synth

  # Show plan on pull requests
  plan:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Install Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_wrapper: false

      - name: Run diff
        id: diff
        run: |
          npx cdktf diff --no-color 2>&1 | tee plan-output.txt

      - name: Post plan to PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('plan-output.txt', 'utf8');
            const body = `## Terraform Plan\n\`\`\`\n${plan.substring(0, 60000)}\n\`\`\``;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

  # Deploy on push to main
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Install Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_wrapper: false

      - name: Deploy infrastructure
        run: npx cdktf deploy --auto-approve '*'
```

## GitLab CI Pipeline

```yaml
# .gitlab-ci.yml
image: node:20

stages:
  - test
  - plan
  - deploy

variables:
  # Set AWS credentials in GitLab CI/CD variables
  AWS_DEFAULT_REGION: "us-east-1"

# Cache node_modules between jobs
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/

# Install dependencies before each stage
before_script:
  - npm ci
  - npm install -g terraform
  - npx cdktf --version

test:
  stage: test
  script:
    - npm test
    - npx cdktf synth

plan:
  stage: plan
  script:
    - npx cdktf diff
  only:
    - merge_requests

deploy_staging:
  stage: deploy
  script:
    - npx cdktf deploy staging --auto-approve
  only:
    - main
  environment:
    name: staging

deploy_production:
  stage: deploy
  script:
    - npx cdktf deploy production --auto-approve
  only:
    - main
  when: manual
  environment:
    name: production
```

## Multi-Environment Pipeline

For deploying to multiple environments with proper gates:

```yaml
# .github/workflows/multi-env.yml
name: Multi-Environment Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    environment: development
    env:
      DEPLOY_ENV: development
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm test
      - name: Deploy to development
        run: npx cdktf deploy dev-stack --auto-approve

  deploy-staging:
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment: staging
    env:
      DEPLOY_ENV: staging
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - name: Deploy to staging
        run: npx cdktf deploy staging-stack --auto-approve

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    # Requires manual approval through GitHub environments
    environment: production
    env:
      DEPLOY_ENV: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - name: Deploy to production
        run: npx cdktf deploy production-stack --auto-approve
```

## Managing Secrets in CI/CD

Never store credentials in your code or pipeline files. Use your CI/CD platform's secrets management:

### GitHub Actions Secrets

```yaml
# Reference secrets in your workflow
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  # For Azure
  ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
  ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
  ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
  ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
```

### Using OIDC for Keyless Authentication

A more secure approach is OIDC, which avoids storing long-lived credentials:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: us-east-1

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npx cdktf deploy --auto-approve '*'
```

## Handling Multi-Stack Dependencies in CI/CD

When stacks depend on each other, deploy them in order:

```yaml
jobs:
  deploy-network:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npx cdktf deploy network --auto-approve

  deploy-database:
    needs: deploy-network
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npx cdktf deploy database --auto-approve

  deploy-application:
    needs: [deploy-network, deploy-database]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npx cdktf deploy application --auto-approve
```

## Caching for Faster Pipelines

Speed up your pipeline with proper caching:

```yaml
steps:
  - uses: actions/cache@v4
    with:
      path: |
        node_modules/
        .gen/
      key: ${{ runner.os }}-cdktf-${{ hashFiles('package-lock.json', 'cdktf.json') }}
      restore-keys: |
        ${{ runner.os }}-cdktf-

  - run: npm ci
  - run: npx cdktf get  # Only generates if cache is stale
```

## Drift Detection Schedule

Run periodic drift detection to catch manual changes:

```yaml
name: Drift Detection
on:
  schedule:
    # Run every 6 hours
    - cron: "0 */6 * * *"

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci

      - name: Check for drift
        id: drift
        run: |
          npx cdktf diff --no-color 2>&1 | tee drift-output.txt
          if grep -q "No changes" drift-output.txt; then
            echo "drift=false" >> $GITHUB_OUTPUT
          else
            echo "drift=true" >> $GITHUB_OUTPUT
          fi

      - name: Notify on drift
        if: steps.drift.outputs.drift == 'true'
        run: |
          # Send notification via Slack, email, or PagerDuty
          echo "Infrastructure drift detected!"
```

## Best Practices

1. **Run tests on every PR**. Catch configuration errors before they are merged.

2. **Show plan output in PR comments**. Let reviewers see exactly what changes will be made.

3. **Require approval for production**. Use GitHub environments or GitLab's manual approval gates.

4. **Use OIDC authentication**. Avoid long-lived credentials in CI/CD.

5. **Cache dependencies**. Node modules and generated provider bindings should be cached.

6. **Run drift detection**. Schedule regular checks to catch manual changes.

7. **Keep pipeline logs**. They serve as an audit trail for infrastructure changes.

CI/CD pipelines are essential for mature infrastructure management. They enforce consistency, provide audit trails, and protect production from accidental changes. For more on CDKTF deployment strategies, see our guide on [deploying CDKTF applications](https://oneuptime.com/blog/post/2026-02-23-how-to-deploy-cdktf-applications/view).
