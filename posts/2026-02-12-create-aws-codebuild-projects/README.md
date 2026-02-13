# How to Create AWS CodeBuild Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodeBuild, CI/CD, DevOps

Description: A practical guide to creating and configuring AWS CodeBuild projects for continuous integration, covering source providers, environment settings, build phases, and artifact handling.

---

AWS CodeBuild is a fully managed continuous integration service. You define a build project, point it at your source code, and CodeBuild spins up a container, runs your build commands, and produces artifacts. No Jenkins servers to maintain, no build agents to patch, no capacity planning.

CodeBuild works with CodeCommit, GitHub, Bitbucket, and S3 as source providers. It runs builds in Docker containers, so you can use AWS-managed images or bring your own. And because it's serverless, you only pay for the build minutes you use.

## Step 1: Create the IAM Service Role

CodeBuild needs a service role with permissions to pull source code, write logs, and store artifacts.

```bash
# Create the trust policy
cat > codebuild-trust.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "codebuild.amazonaws.com"
    },
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name CodeBuildServiceRole \
  --assume-role-policy-document file://codebuild-trust.json

# Attach basic permissions
cat > codebuild-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/codebuild/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:GetBucketAcl",
        "s3:GetBucketLocation",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::my-build-artifacts/*",
        "arn:aws:s3:::my-build-cache/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "codecommit:GitPull"
      ],
      "Resource": "arn:aws:codecommit:us-east-1:123456789012:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name CodeBuildServiceRole \
  --policy-name CodeBuildPermissions \
  --policy-document file://codebuild-policy.json
```

## Step 2: Create a Build Project

Here's a build project for a Node.js application with CodeCommit as the source.

```bash
# Create the build project
aws codebuild create-project \
  --name my-app-build \
  --description "Build and test the main application" \
  --source '{
    "type": "CODECOMMIT",
    "location": "https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application",
    "gitCloneDepth": 1,
    "buildspec": "buildspec.yml"
  }' \
  --source-version "refs/heads/main" \
  --environment '{
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/amazonlinux2-x86_64-standard:5.0",
    "computeType": "BUILD_GENERAL1_MEDIUM",
    "environmentVariables": [
      {
        "name": "NODE_ENV",
        "value": "test",
        "type": "PLAINTEXT"
      },
      {
        "name": "DB_PASSWORD",
        "value": "/myapp/db-password",
        "type": "PARAMETER_STORE"
      }
    ],
    "privilegedMode": false
  }' \
  --artifacts '{
    "type": "S3",
    "location": "my-build-artifacts",
    "path": "my-app",
    "packaging": "ZIP",
    "name": "build-output.zip"
  }' \
  --cache '{
    "type": "S3",
    "location": "my-build-cache/my-app"
  }' \
  --service-role "arn:aws:iam::123456789012:role/CodeBuildServiceRole" \
  --timeout-in-minutes 20 \
  --logs-config '{
    "cloudWatchLogs": {
      "status": "ENABLED",
      "groupName": "/aws/codebuild/my-app-build"
    }
  }' \
  --tags '[
    {"key": "Team", "value": "Backend"},
    {"key": "Application", "value": "my-app"}
  ]'
```

Let me break down the key settings:

- **computeType**: `BUILD_GENERAL1_SMALL` (4 GB RAM, 2 vCPU), `BUILD_GENERAL1_MEDIUM` (7 GB, 4 vCPU), or `BUILD_GENERAL1_LARGE` (15 GB, 8 vCPU)
- **image**: AWS-managed images come pre-loaded with common runtimes. The `standard:5.0` image includes Node.js, Python, Java, Go, and more.
- **privilegedMode**: Set to `true` only if you need to build Docker images
- **gitCloneDepth**: Set to 1 for faster clones (shallow clone)
- **environmentVariables**: Use `PARAMETER_STORE` or `SECRETS_MANAGER` for sensitive values

## Step 3: Write the Buildspec File

The buildspec defines your build commands. Create it in your repository root.

```yaml
# buildspec.yml
version: 0.2

env:
  variables:
    CI: "true"
  parameter-store:
    DB_HOST: "/myapp/db-host"

phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - echo "Installing dependencies..."
      - npm ci

  pre_build:
    commands:
      - echo "Running linters..."
      - npm run lint
      - echo "Running type checks..."
      - npm run typecheck

  build:
    commands:
      - echo "Running tests..."
      - npm test -- --coverage
      - echo "Building application..."
      - npm run build

  post_build:
    commands:
      - echo "Build completed at $(date)"
      - echo "Packaging artifacts..."

reports:
  test-results:
    files:
      - "junit.xml"
    base-directory: "test-results"
    file-format: "JUNITXML"
  coverage:
    files:
      - "coverage/clover.xml"
    file-format: "CLOVERXML"

artifacts:
  files:
    - "dist/**/*"
    - "package.json"
    - "package-lock.json"
  base-directory: "."

cache:
  paths:
    - "node_modules/**/*"
    - ".npm/**/*"
```

## Step 4: Start a Build

Trigger a build manually or programmatically.

```bash
# Start a build
aws codebuild start-build \
  --project-name my-app-build

# Start a build with overrides
aws codebuild start-build \
  --project-name my-app-build \
  --source-version "feature/new-login" \
  --environment-variables-override '[
    {"name": "NODE_ENV", "value": "staging", "type": "PLAINTEXT"}
  ]'

# Monitor the build
aws codebuild batch-get-builds \
  --ids "my-app-build:build-id-123" \
  --query 'builds[0].{Phase:currentPhase,Status:buildStatus,Duration:buildComplete}'
```

## Step 5: Set Up Build Triggers

Trigger builds automatically from CodeCommit pushes.

```bash
# Create a CloudWatch Events rule to trigger builds on push to main
aws events put-rule \
  --name codecommit-main-push \
  --event-pattern '{
    "source": ["aws.codecommit"],
    "detail-type": ["CodeCommit Repository State Change"],
    "detail": {
      "event": ["referenceCreated", "referenceUpdated"],
      "referenceType": ["branch"],
      "referenceName": ["main"]
    },
    "resources": ["arn:aws:codecommit:us-east-1:123456789012:my-application"]
  }'

# Add CodeBuild as the target
aws events put-targets \
  --rule codecommit-main-push \
  --targets '[{
    "Id": "codebuild-target",
    "Arn": "arn:aws:codebuild:us-east-1:123456789012:project/my-app-build",
    "RoleArn": "arn:aws:iam::123456789012:role/EventsCodeBuildRole"
  }]'
```

## Step 6: Create Projects for Different Languages

Here are project configurations for common language stacks.

### Python Project

```bash
aws codebuild create-project \
  --name python-api-build \
  --source '{
    "type": "CODECOMMIT",
    "location": "https://git-codecommit.us-east-1.amazonaws.com/v1/repos/python-api",
    "buildspec": "buildspec.yml"
  }' \
  --environment '{
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/amazonlinux2-x86_64-standard:5.0",
    "computeType": "BUILD_GENERAL1_SMALL"
  }' \
  --artifacts '{"type": "NO_ARTIFACTS"}' \
  --service-role "arn:aws:iam::123456789012:role/CodeBuildServiceRole"
```

Python buildspec:

```yaml
# buildspec.yml for Python
version: 0.2

phases:
  install:
    runtime-versions:
      python: 3.12
    commands:
      - pip install -r requirements.txt
      - pip install -r requirements-dev.txt

  pre_build:
    commands:
      - python -m flake8 src/
      - python -m mypy src/

  build:
    commands:
      - python -m pytest tests/ -v --junitxml=test-results/junit.xml --cov=src --cov-report=xml

reports:
  pytest-results:
    files:
      - "junit.xml"
    base-directory: "test-results"
    file-format: "JUNITXML"

cache:
  paths:
    - "/root/.cache/pip/**/*"
```

### Go Project

```yaml
# buildspec.yml for Go
version: 0.2

phases:
  install:
    runtime-versions:
      golang: 1.22
  pre_build:
    commands:
      - go vet ./...
      - golangci-lint run

  build:
    commands:
      - go test -v -race -coverprofile=coverage.out ./...
      - CGO_ENABLED=0 GOOS=linux go build -o bin/app ./cmd/server

artifacts:
  files:
    - bin/app
  base-directory: "."

cache:
  paths:
    - "/go/pkg/mod/**/*"
```

## Monitoring Build Health

Keep track of build success rates and durations.

```bash
# List recent builds for a project
aws codebuild list-builds-for-project \
  --project-name my-app-build \
  --sort-order DESCENDING

# Get build details
aws codebuild batch-get-builds \
  --ids "my-app-build:abc123" \
  --query 'builds[0].{Status:buildStatus,Duration:buildComplete,Phases:phases[*].{Name:phaseType,Status:phaseStatus,Duration:durationInSeconds}}'
```

For real-time build monitoring and alerting on failures, check out our guide on [CloudWatch alarms](https://oneuptime.com/blog/post/2026-02-12-set-up-cloudwatch-alarms-for-ec2-cpu-and-memory/view). You'll want to know about build failures before your deploy pipeline does.

CodeBuild's simplicity is its strength. Define a project, write a buildspec, and you've got CI. No servers, no plugins, no maintenance. For more details on writing buildspec files, see our [buildspec guide](https://oneuptime.com/blog/post/2026-02-12-write-codebuild-buildspec-yml/view).
