# How to Write a CodeBuild buildspec.yml File

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodeBuild, CI/CD, YAML, DevOps

Description: A thorough guide to writing AWS CodeBuild buildspec.yml files, covering phases, environment variables, artifacts, caching, reports, and advanced patterns for real-world build configurations.

---

The buildspec.yml file is the heart of every CodeBuild project. It tells CodeBuild exactly what to do: which runtime to use, what commands to run, what artifacts to produce, and what to cache. Getting the buildspec right means fast, reliable builds. Getting it wrong means frustrating debugging sessions and wasted build minutes.

This guide covers every section of the buildspec with practical examples and patterns you'll actually use in production.

## Basic Structure

Every buildspec follows this structure:

```yaml
version: 0.2

env:
  # Environment variable configuration

phases:
  install:
    # Install dependencies
  pre_build:
    # Pre-build steps (linting, login)
  build:
    # Main build commands
  post_build:
    # Post-build steps (notifications, cleanup)

reports:
  # Test report configuration

artifacts:
  # Build output configuration

cache:
  # Cache configuration
```

The version must be `0.2`. Version `0.1` is deprecated and has a different structure.

## Environment Variables

You can define environment variables from multiple sources.

```yaml
version: 0.2

env:
  # Plain text variables
  variables:
    NODE_ENV: "production"
    BUILD_TYPE: "release"
    AWS_DEFAULT_REGION: "us-east-1"

  # Variables from AWS Systems Manager Parameter Store
  parameter-store:
    DB_HOST: "/myapp/production/db-host"
    API_KEY: "/myapp/production/api-key"

  # Variables from AWS Secrets Manager
  secrets-manager:
    DOCKER_HUB_TOKEN: "dockerhub-creds:token"
    DB_PASSWORD: "myapp/db:password"

  # Exported variables (available to subsequent build stages in a pipeline)
  exported-variables:
    - BUILD_VERSION
    - IMAGE_TAG

  # Git credential helper for private repos
  git-credential-helper: yes

  # Shell to use
  shell: bash
```

For the `secrets-manager` syntax, the format is `secret-id:json-key`. If your secret value is a JSON object like `{"username": "admin", "password": "secret"}`, you'd reference it as `my-secret:password`.

## Build Phases In Detail

Each phase runs sequentially. If any command in a phase fails (non-zero exit code), the build fails and skips remaining phases (unless you configure `on-failure`).

```yaml
version: 0.2

phases:
  install:
    # Specify runtime versions
    runtime-versions:
      nodejs: 20
      python: 3.12

    # What to do if this phase fails
    on-failure: ABORT  # ABORT (default) or CONTINUE

    commands:
      # Install system-level dependencies
      - echo "Installing system dependencies..."
      - yum install -y libpng-devel

      # Install application dependencies
      - echo "Installing npm packages..."
      - npm ci --prefer-offline

    finally:
      # Commands that run even if the phase fails
      - echo "Install phase finished"

  pre_build:
    commands:
      # Authentication steps
      - echo "Logging into ECR..."
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

      # Code quality checks
      - echo "Running linter..."
      - npm run lint

      # Set build version
      - export BUILD_VERSION=$(node -p "require('./package.json').version")-$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c1-7)
      - echo "Build version: $BUILD_VERSION"

  build:
    commands:
      # Run tests
      - echo "Running tests..."
      - npm test -- --ci --coverage --reporters=default --reporters=jest-junit

      # Build the application
      - echo "Building application..."
      - npm run build

      # Build Docker image if needed
      - echo "Building Docker image..."
      - docker build -t $ECR_REGISTRY/my-app:$BUILD_VERSION .
      - docker push $ECR_REGISTRY/my-app:$BUILD_VERSION

      # Export variables for later stages
      - export IMAGE_TAG=$BUILD_VERSION

  post_build:
    commands:
      - echo "Build completed successfully"
      - echo "Image: $ECR_REGISTRY/my-app:$BUILD_VERSION"
```

## Artifacts Configuration

Artifacts define what files CodeBuild uploads after the build.

```yaml
artifacts:
  # Upload multiple artifact sets
  files:
    - "dist/**/*"
    - "package.json"
    - "package-lock.json"
    - "Dockerfile"
    - "docker-compose.yml"

  # Base directory - relative paths are resolved from here
  base-directory: "."

  # Discard file paths and put everything in the root
  discard-paths: no

  # Name of the artifact (overrides project setting)
  name: "build-$(date +%Y%m%d)-$CODEBUILD_BUILD_NUMBER"

  # Secondary artifacts for multiple outputs
secondary-artifacts:
  test-reports:
    files:
      - "**/*"
    base-directory: "coverage"
    name: "test-coverage"

  deployment-package:
    files:
      - "dist/**/*"
      - "appspec.yml"
      - "scripts/**/*"
    name: "deploy-package"
```

## Caching for Faster Builds

Caching can dramatically reduce build times by preserving directories between builds.

```yaml
cache:
  paths:
    # Node.js
    - "node_modules/**/*"
    - ".npm/**/*"

    # Python
    - "/root/.cache/pip/**/*"

    # Go modules
    - "/go/pkg/mod/**/*"

    # Maven
    - "/root/.m2/**/*"

    # Gradle
    - "/root/.gradle/caches/**/*"
    - "/root/.gradle/wrapper/**/*"
```

You can also use local caching for even faster builds. This keeps the cache on the build host rather than uploading to S3.

```bash
# Configure local caching when creating the project
aws codebuild create-project \
  --name my-project \
  --cache '{
    "type": "LOCAL",
    "modes": ["LOCAL_DOCKER_LAYER_CACHE", "LOCAL_SOURCE_CACHE", "LOCAL_CUSTOM_CACHE"]
  }' \
  ...
```

## Test Reports

CodeBuild can parse test results and display them in the console. Supports JUnit XML, NUnit XML, Cucumber JSON, TestNG XML, and Visual Studio TRX.

```yaml
reports:
  # Unit test results
  unit-tests:
    files:
      - "junit.xml"
    base-directory: "test-results"
    file-format: "JUNITXML"
    discard-paths: yes

  # Code coverage
  code-coverage:
    files:
      - "clover.xml"
    base-directory: "coverage"
    file-format: "CLOVERXML"

  # Integration test results
  integration-tests:
    files:
      - "**/*.xml"
    base-directory: "integration-test-results"
    file-format: "JUNITXML"
```

## Real-World Buildspec Examples

### Full-Stack Application with Frontend and Backend

```yaml
version: 0.2

env:
  variables:
    NODE_ENV: "production"
  parameter-store:
    API_URL: "/myapp/api-url"

phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      # Install backend dependencies
      - cd backend && npm ci
      # Install frontend dependencies
      - cd ../frontend && npm ci
      - cd ..

  pre_build:
    commands:
      # Lint both projects
      - cd backend && npm run lint && cd ..
      - cd frontend && npm run lint && cd ..
      # Type check
      - cd backend && npm run typecheck && cd ..
      - cd frontend && npm run typecheck && cd ..

  build:
    commands:
      # Test backend
      - cd backend && npm test -- --ci && cd ..
      # Test frontend
      - cd frontend && npm test -- --ci && cd ..
      # Build backend
      - cd backend && npm run build && cd ..
      # Build frontend with API URL injected
      - cd frontend && REACT_APP_API_URL=$API_URL npm run build && cd ..

  post_build:
    commands:
      - echo "Full build completed"

artifacts:
  files:
    - "backend/dist/**/*"
    - "backend/package.json"
    - "frontend/build/**/*"
  secondary-artifacts:
    backend:
      files:
        - "dist/**/*"
        - "package.json"
        - "package-lock.json"
      base-directory: "backend"
    frontend:
      files:
        - "build/**/*"
      base-directory: "frontend"

cache:
  paths:
    - "backend/node_modules/**/*"
    - "frontend/node_modules/**/*"
```

### Multi-Stage Build with Conditional Logic

```yaml
version: 0.2

env:
  variables:
    RUN_E2E: "false"
  exported-variables:
    - BUILD_STATUS
    - DEPLOY_READY

phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - npm ci

  pre_build:
    commands:
      - |
        # Determine build type from branch
        if echo "$CODEBUILD_WEBHOOK_HEAD_REF" | grep -q "refs/heads/main"; then
          export BUILD_TYPE="release"
          export RUN_E2E="true"
        elif echo "$CODEBUILD_WEBHOOK_HEAD_REF" | grep -q "refs/heads/develop"; then
          export BUILD_TYPE="staging"
        else
          export BUILD_TYPE="feature"
        fi
        echo "Build type: $BUILD_TYPE"

  build:
    commands:
      # Always run unit tests
      - npm test -- --ci

      # Conditional e2e tests
      - |
        if [ "$RUN_E2E" = "true" ]; then
          echo "Running E2E tests..."
          npm run test:e2e
        else
          echo "Skipping E2E tests for non-main branch"
        fi

      # Build
      - npm run build

  post_build:
    commands:
      - |
        if [ "$CODEBUILD_BUILD_SUCCEEDING" = "1" ]; then
          export BUILD_STATUS="SUCCESS"
          export DEPLOY_READY="true"
        else
          export BUILD_STATUS="FAILED"
          export DEPLOY_READY="false"
        fi
```

## Debugging Tips

When builds fail, these techniques help you figure out why.

```yaml
phases:
  build:
    commands:
      # Print environment for debugging
      - env | sort

      # Print CodeBuild-specific variables
      - echo "Build ID: $CODEBUILD_BUILD_ID"
      - echo "Source Version: $CODEBUILD_RESOLVED_SOURCE_VERSION"
      - echo "Webhook Event: $CODEBUILD_WEBHOOK_EVENT"
      - echo "Webhook Branch: $CODEBUILD_WEBHOOK_HEAD_REF"

      # Print disk space
      - df -h

      # Print memory
      - free -m

      # Continue even if a command fails (for debugging)
      - npm test || true
```

## Common Gotchas

A few things that catch people repeatedly:

- **Each command runs in its own shell.** If you `cd` into a directory in one command, you're back in the root for the next. Use `&&` or multi-line commands with `|` to chain them.
- **Environment variables from `parameter-store` aren't available during `install`.** They're resolved after the install phase.
- **The build times out silently.** If your build hangs (maybe waiting for a database connection), it'll just time out with no helpful error. Set reasonable timeouts.
- **Cache paths must use `**/*` glob.** Just `node_modules/` won't work; you need `node_modules/**/*`.

For the full CodeBuild setup including project creation and source configuration, see our guide on [creating CodeBuild projects](https://oneuptime.com/blog/post/2026-02-12-create-aws-codebuild-projects/view).
