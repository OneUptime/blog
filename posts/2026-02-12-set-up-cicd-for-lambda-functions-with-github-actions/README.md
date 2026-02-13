# How to Set Up CI/CD for Lambda Functions with GitHub Actions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, GitHub Actions, CI/CD, DevOps

Description: Build a complete CI/CD pipeline for AWS Lambda functions using GitHub Actions with automated testing, packaging, deployment, and rollback capabilities.

---

Deploying Lambda functions by zipping files and uploading them through the console gets old fast. You need a proper CI/CD pipeline that tests your code, packages it, deploys it, and rolls back if something breaks. GitHub Actions is a natural choice - your code is already in GitHub, the workflow syntax is clean, and there's excellent support for AWS.

Let's build a production-ready CI/CD pipeline for Lambda functions step by step.

## Repository Structure

A typical Lambda project structure:

```
my-lambda-project/
  src/
    handler.js          # Lambda function code
    utils.js            # Helper modules
  tests/
    handler.test.js     # Unit tests
  package.json
  .github/
    workflows/
      deploy.yml        # CI/CD pipeline
```

## Basic Pipeline

Here's a complete GitHub Actions workflow that tests, packages, and deploys a Lambda function:

```yaml
# .github/workflows/deploy.yml
name: Deploy Lambda Function

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  id-token: write    # Required for OIDC authentication
  contents: read

env:
  FUNCTION_NAME: my-api-handler
  AWS_REGION: us-east-1

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  deploy:
    needs: test
    runs-on: ubuntu-latest
    # Only deploy on pushes to main, not on PRs
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Install production dependencies only
      - name: Install production dependencies
        run: npm ci --production

      # Configure AWS credentials using OIDC (recommended over access keys)
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy
          aws-region: ${{ env.AWS_REGION }}

      # Package the function
      - name: Create deployment package
        run: |
          zip -r function.zip src/ node_modules/ package.json

      # Deploy to Lambda
      - name: Deploy to Lambda
        run: |
          aws lambda update-function-code \
            --function-name ${{ env.FUNCTION_NAME }} \
            --zip-file fileb://function.zip \
            --publish

      # Wait for the update to complete
      - name: Wait for deployment
        run: |
          aws lambda wait function-updated \
            --function-name ${{ env.FUNCTION_NAME }}

      # Run a smoke test
      - name: Smoke test
        run: |
          RESPONSE=$(aws lambda invoke \
            --function-name ${{ env.FUNCTION_NAME }} \
            --payload '{"path": "/health", "httpMethod": "GET"}' \
            --cli-binary-format raw-in-base64-out \
            output.json)
          cat output.json
          STATUS=$(jq -r '.statusCode' output.json)
          if [ "$STATUS" != "200" ]; then
            echo "Smoke test failed with status $STATUS"
            exit 1
          fi
```

## Setting Up OIDC Authentication

Instead of storing AWS access keys in GitHub Secrets, use OIDC (OpenID Connect). This gives GitHub Actions temporary credentials without any long-lived secrets.

First, create the OIDC identity provider in AWS:

```bash
# Create the GitHub OIDC provider in your AWS account
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

Then create an IAM role for GitHub Actions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:your-org/your-repo:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

The role needs permission to update the Lambda function:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:PublishVersion",
        "lambda:GetFunction",
        "lambda:InvokeFunction",
        "lambda:UpdateAlias"
      ],
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:my-api-handler"
    }
  ]
}
```

## Pipeline with Staging and Production

For a more robust setup, deploy to staging first, run integration tests, then promote to production:

```yaml
# Multi-environment deployment pipeline
name: Deploy Pipeline

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci --production

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_STAGING }}
          aws-region: us-east-1

      - name: Package and deploy to staging
        run: |
          zip -r function.zip src/ node_modules/ package.json
          aws lambda update-function-code \
            --function-name my-api-handler-staging \
            --zip-file fileb://function.zip \
            --publish
          aws lambda wait function-updated \
            --function-name my-api-handler-staging

      - name: Run integration tests against staging
        run: |
          npm run test:integration
        env:
          API_URL: ${{ secrets.STAGING_API_URL }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval in GitHub
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci --production

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_PRODUCTION }}
          aws-region: us-east-1

      - name: Package and deploy to production
        run: |
          zip -r function.zip src/ node_modules/ package.json
          VERSION=$(aws lambda update-function-code \
            --function-name my-api-handler \
            --zip-file fileb://function.zip \
            --publish \
            --query 'Version' --output text)
          echo "Deployed version: $VERSION"
          echo "LAMBDA_VERSION=$VERSION" >> $GITHUB_ENV

      - name: Update production alias
        run: |
          aws lambda update-alias \
            --function-name my-api-handler \
            --name production \
            --function-version ${{ env.LAMBDA_VERSION }}
```

## Deploying with SAM or CDK

If you're using SAM or CDK, the deploy step changes but the pipeline structure stays the same:

```yaml
# SAM deployment step
- name: Deploy with SAM
  run: |
    sam build
    sam deploy \
      --stack-name my-lambda-stack \
      --capabilities CAPABILITY_IAM \
      --no-confirm-changeset \
      --no-fail-on-empty-changeset \
      --parameter-overrides "Environment=production"
```

```yaml
# CDK deployment step
- name: Deploy with CDK
  run: |
    npm run cdk -- deploy --require-approval never
```

## Automatic Rollback

If the smoke test fails after deployment, roll back to the previous version:

```yaml
# Deploy with automatic rollback on failure
- name: Deploy and verify
  id: deploy
  run: |
    # Save the current version before deploying
    PREV_VERSION=$(aws lambda get-alias \
      --function-name ${{ env.FUNCTION_NAME }} \
      --name production \
      --query 'FunctionVersion' --output text)
    echo "PREV_VERSION=$PREV_VERSION" >> $GITHUB_ENV

    # Deploy new version
    NEW_VERSION=$(aws lambda update-function-code \
      --function-name ${{ env.FUNCTION_NAME }} \
      --zip-file fileb://function.zip \
      --publish \
      --query 'Version' --output text)

    aws lambda update-alias \
      --function-name ${{ env.FUNCTION_NAME }} \
      --name production \
      --function-version $NEW_VERSION

    echo "Deployed version $NEW_VERSION (previous: $PREV_VERSION)"

- name: Smoke test
  id: smoke-test
  continue-on-error: true
  run: |
    # Run your smoke tests here
    curl -f "https://your-api.com/health" || exit 1

- name: Rollback on failure
  if: steps.smoke-test.outcome == 'failure'
  run: |
    echo "Smoke test failed! Rolling back to version ${{ env.PREV_VERSION }}"
    aws lambda update-alias \
      --function-name ${{ env.FUNCTION_NAME }} \
      --name production \
      --function-version ${{ env.PREV_VERSION }}
    exit 1
```

For more advanced deployment strategies, check out our guide on [implementing canary deployments for Lambda functions](https://oneuptime.com/blog/post/2026-02-12-implement-canary-deployments-for-lambda-functions/view).

## Pipeline for Python Lambda Functions

The same pattern works for Python functions with minor changes:

```yaml
# Python Lambda CI/CD pipeline
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: pytest tests/ -v --cov=src

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      # Install dependencies into a package directory
      - name: Package dependencies
        run: |
          pip install -r requirements.txt -t package/
          cp -r src/* package/
          cd package && zip -r ../function.zip .

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy
        run: |
          aws lambda update-function-code \
            --function-name my-python-function \
            --zip-file fileb://function.zip \
            --publish
```

## Wrapping Up

A solid CI/CD pipeline for Lambda functions automates the boring parts - testing, packaging, deploying - and adds safety nets like smoke tests and automatic rollbacks. GitHub Actions makes this straightforward with its YAML workflows and built-in AWS credential support via OIDC. Start with a simple pipeline that tests and deploys, then add staging environments, approval gates, and canary deployments as your confidence grows.
