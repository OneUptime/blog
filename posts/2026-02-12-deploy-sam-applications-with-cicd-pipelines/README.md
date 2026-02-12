# How to Deploy SAM Applications with CI/CD Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SAM, CI/CD, Serverless, DevOps

Description: Learn how to set up continuous integration and deployment pipelines for AWS SAM applications using CodePipeline, GitHub Actions, and other tools.

---

Deploying serverless applications manually gets old fast. You run `sam build`, then `sam deploy`, wait around, and hope nothing breaks. It works fine for a side project, but the moment you have a team or multiple environments, you need something more reliable. That's where CI/CD pipelines come in.

AWS SAM (Serverless Application Model) already makes it easier to define and deploy serverless resources. Pairing it with a proper CI/CD pipeline means every code push can trigger automated builds, tests, and deployments - without anyone touching the command line.

## Why CI/CD Matters for SAM

SAM templates can grow complex. You might have Lambda functions, API Gateway endpoints, DynamoDB tables, SQS queues, and Step Functions all wired together. Deploying these by hand introduces risk. Someone might forget to run tests. Someone else might deploy to the wrong stage. CI/CD removes that human error factor.

Beyond reliability, pipelines give you audit trails. You can see exactly which commit triggered which deployment, who approved it, and when it went live. If something goes wrong, rolling back is straightforward.

## Option 1: SAM Pipelines (Built-in)

SAM has a built-in command for bootstrapping CI/CD pipelines. It supports AWS CodePipeline, GitHub Actions, GitLab CI/CD, and Bitbucket Pipelines.

Here's how to get started with the interactive setup:

```bash
# Initialize a CI/CD pipeline configuration for your SAM app
sam pipeline init --bootstrap
```

This walks you through a wizard that asks about your deployment stages (dev, staging, prod), your source control provider, and the AWS accounts involved. It creates the necessary IAM roles and artifacts buckets.

After the wizard completes, you'll have pipeline configuration files in your project. For GitHub Actions, you'll see something under `.github/workflows/`.

## Option 2: GitHub Actions

If you prefer to set things up yourself, GitHub Actions is a solid choice. Here's a workflow that builds, tests, and deploys a SAM application:

```yaml
# .github/workflows/sam-deploy.yml
name: SAM Deploy

on:
  push:
    branches:
      - main

env:
  AWS_REGION: us-east-1
  SAM_TEMPLATE: template.yaml

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      # Check out the repository code
      - uses: actions/checkout@v4

      # Set up Python for Lambda functions
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      # Install SAM CLI
      - uses: aws-actions/setup-sam@v2

      # Configure AWS credentials from GitHub secrets
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      # Build the SAM application
      - run: sam build --use-container

      # Run unit tests before deploying
      - run: |
          pip install -r tests/requirements.txt
          pytest tests/unit/

      # Deploy to the dev environment
      - run: |
          sam deploy \
            --no-confirm-changeset \
            --no-fail-on-empty-changeset \
            --stack-name my-app-dev \
            --resolve-s3 \
            --capabilities CAPABILITY_IAM \
            --parameter-overrides Stage=dev
```

A few things worth calling out. The `--use-container` flag on `sam build` ensures your Lambda functions are built in a Docker container matching the Lambda runtime. This prevents those annoying "works on my machine" problems. The `--no-confirm-changeset` flag skips the manual approval step since we want full automation.

## Option 3: AWS CodePipeline

For teams that are all-in on AWS, CodePipeline integrates natively with SAM. You can define the pipeline using CloudFormation or SAM itself.

Here's a simplified pipeline definition:

```yaml
# pipeline.yaml - CloudFormation template for the pipeline
Resources:
  Pipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      Name: sam-app-pipeline
      RoleArn: !GetAtt PipelineRole.Arn
      Stages:
        # Source stage pulls code from CodeCommit
        - Name: Source
          Actions:
            - Name: SourceAction
              ActionTypeId:
                Category: Source
                Owner: AWS
                Provider: CodeCommit
                Version: "1"
              Configuration:
                RepositoryName: my-sam-app
                BranchName: main
              OutputArtifacts:
                - Name: SourceOutput

        # Build stage compiles and packages the SAM app
        - Name: Build
          Actions:
            - Name: BuildAction
              ActionTypeId:
                Category: Build
                Owner: AWS
                Provider: CodeBuild
                Version: "1"
              Configuration:
                ProjectName: !Ref BuildProject
              InputArtifacts:
                - Name: SourceOutput
              OutputArtifacts:
                - Name: BuildOutput

        # Deploy stage pushes to CloudFormation
        - Name: Deploy
          Actions:
            - Name: DeployAction
              ActionTypeId:
                Category: Deploy
                Owner: AWS
                Provider: CloudFormation
                Version: "1"
              Configuration:
                ActionMode: CREATE_UPDATE
                StackName: my-sam-app-prod
                TemplatePath: BuildOutput::packaged.yaml
                Capabilities: CAPABILITY_IAM
              InputArtifacts:
                - Name: BuildOutput
```

The CodeBuild project handles the `sam build` and `sam package` steps. Here's the buildspec:

```yaml
# buildspec.yml - Tells CodeBuild what to do
version: 0.2
phases:
  install:
    runtime-versions:
      python: 3.12
  build:
    commands:
      - sam build
      - sam package --output-template-file packaged.yaml --s3-bucket $ARTIFACT_BUCKET
artifacts:
  files:
    - packaged.yaml
```

## Multi-Environment Deployments

Real-world pipelines usually deploy through multiple stages: dev, staging, then production. You'll want manual approval gates before production.

With GitHub Actions, you can use environments with protection rules:

```yaml
# Multi-stage deployment with approval gates
jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/setup-sam@v2
      - run: sam build --use-container
      - run: sam deploy --stack-name app-dev --parameter-overrides Stage=dev

  deploy-prod:
    needs: deploy-dev
    runs-on: ubuntu-latest
    # GitHub environment with required reviewers acts as approval gate
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/setup-sam@v2
      - run: sam build --use-container
      - run: sam deploy --stack-name app-prod --parameter-overrides Stage=prod
```

## Testing in the Pipeline

Don't skip tests. At minimum, include unit tests. Better yet, add integration tests that run against a deployed dev environment.

```python
# tests/integration/test_api.py
import requests

def test_api_returns_200():
    """Hit the deployed API and verify it responds."""
    api_url = "https://your-dev-api.execute-api.us-east-1.amazonaws.com/dev/health"
    response = requests.get(api_url)
    assert response.status_code == 200

def test_api_returns_expected_data():
    """Verify the API returns the expected structure."""
    api_url = "https://your-dev-api.execute-api.us-east-1.amazonaws.com/dev/items"
    response = requests.get(api_url)
    data = response.json()
    assert "items" in data
```

## Rollback Strategies

When things go wrong - and they will - you need a rollback plan. SAM deploys through CloudFormation, so you get automatic rollback on deployment failures. But what about logical errors that pass all checks?

One approach is canary deployments with Lambda aliases:

```yaml
# In your SAM template, enable gradual deployments
Globals:
  Function:
    AutoPublishAlias: live
    DeploymentPreference:
      # Route 10% of traffic to new version, then shift all traffic after 10 minutes
      Type: Linear10PercentEvery10Minutes
      Alarms:
        - !Ref AliasErrorMetricGreaterThanZeroAlarm
```

This shifts traffic gradually to the new version and rolls back automatically if CloudWatch alarms fire.

## Monitoring Your Pipeline

A pipeline you can't observe is a pipeline you can't trust. Set up notifications for pipeline failures. CloudWatch Events can trigger SNS notifications when a pipeline stage fails. For more comprehensive monitoring of your deployed applications, check out how to [monitor AWS Lambda functions](https://oneuptime.com/blog/post/monitor-aws-lambda-functions/view) effectively.

## Wrapping Up

CI/CD for SAM applications isn't optional once your project grows beyond a single developer. Whether you pick GitHub Actions, CodePipeline, or another tool, the pattern is the same: source, build, test, deploy. SAM's built-in `sam pipeline` command gets you started quickly, but don't hesitate to customize the pipeline as your needs evolve. The goal is to make deployments boring - predictable, reliable, and completely automated.
