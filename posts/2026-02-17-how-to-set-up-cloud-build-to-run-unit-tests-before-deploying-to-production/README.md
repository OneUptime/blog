# How to Set Up Cloud Build to Run Unit Tests Before Deploying to Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Unit Testing, CI/CD, Test Automation, Deployment Safety

Description: Learn how to configure Cloud Build pipelines that run unit tests before deploying, ensuring broken code never reaches your production environment.

---

The most valuable thing a CI/CD pipeline can do is prevent broken code from reaching production. Running unit tests as part of your Cloud Build pipeline is the first line of defense - if tests fail, the deployment does not happen. In this post, I will walk through how to structure your Cloud Build pipeline to run tests effectively and only deploy when everything passes.

## The Basic Pattern

The concept is simple: test first, deploy second. If the test step exits with a non-zero status, Cloud Build stops the pipeline and the deployment step never runs.

```yaml
# The fundamental test-before-deploy pattern
steps:
  # Step 1: Install dependencies
  - name: 'node:20'
    id: 'install'
    args: ['npm', 'ci']

  # Step 2: Run tests - if this fails, the build stops here
  - name: 'node:20'
    id: 'test'
    args: ['npm', 'test']

  # Step 3: Deploy - only runs if tests pass
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy'
    args:
      - 'gcloud'
      - 'run'
      - 'deploy'
      - 'my-app'
      - '--source'
      - '.'
      - '--region'
      - 'us-central1'
```

This works because Cloud Build treats any step that exits with a non-zero code as a failure and aborts the remaining steps. Most test frameworks exit with code 1 when tests fail, which is exactly what we want.

## Setting Up Tests for Different Languages

### Node.js

```yaml
# Node.js test pipeline
steps:
  - name: 'node:20'
    id: 'install'
    args: ['npm', 'ci']

  # Run Jest, Mocha, Vitest, or whatever your test runner is
  - name: 'node:20'
    id: 'test'
    args: ['npm', 'test']
    env:
      - 'CI=true'
      - 'NODE_ENV=test'
```

The `CI=true` environment variable tells many test runners (like Jest) to run in CI mode - non-interactive, with stricter output formatting.

### Python

```yaml
# Python test pipeline
steps:
  - name: 'python:3.12'
    id: 'install'
    entrypoint: 'pip'
    args: ['install', '-r', 'requirements.txt', '-r', 'requirements-dev.txt']

  - name: 'python:3.12'
    id: 'test'
    entrypoint: 'python'
    args: ['-m', 'pytest', 'tests/', '-v', '--tb=short']
```

### Go

```yaml
# Go test pipeline
steps:
  - name: 'golang:1.22'
    id: 'test'
    args: ['go', 'test', '-v', '-race', './...']
    env:
      - 'CGO_ENABLED=1'
```

Go does not need a separate install step - `go test` handles dependency resolution automatically.

### Java/Maven

```yaml
# Java test pipeline with Maven
steps:
  - name: 'maven:3.9-eclipse-temurin-21'
    id: 'test'
    args: ['mvn', 'test', '-B']
```

The `-B` flag runs Maven in batch (non-interactive) mode, which is important for CI environments.

## Adding Linting Before Tests

Linting catches style issues and potential bugs before tests even run. Since linting is usually faster than testing, it makes sense to run it first:

```yaml
# Lint, then test, then deploy
steps:
  - name: 'node:20'
    id: 'install'
    args: ['npm', 'ci']

  # Lint runs first - catches syntax and style issues quickly
  - name: 'node:20'
    id: 'lint'
    args: ['npm', 'run', 'lint']

  # Tests run after lint passes
  - name: 'node:20'
    id: 'test'
    args: ['npm', 'test']

  # Deploy only if both lint and test pass
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA', '.']

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
```

Or run them in parallel for faster feedback:

```yaml
# Run lint and test in parallel for faster builds
steps:
  - name: 'node:20'
    id: 'install'
    args: ['npm', 'ci']

  - name: 'node:20'
    id: 'lint'
    waitFor: ['install']
    args: ['npm', 'run', 'lint']

  - name: 'node:20'
    id: 'test'
    waitFor: ['install']
    args: ['npm', 'test']

  - name: 'gcr.io/cloud-builders/docker'
    id: 'build'
    waitFor: ['lint', 'test']
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA', '.']
```

## Running Tests with a Database

Many unit tests need a database. You can spin up a database container within Cloud Build using Docker:

```yaml
# Run tests with a PostgreSQL database
steps:
  # Start a PostgreSQL container
  - name: 'gcr.io/cloud-builders/docker'
    id: 'start-db'
    args:
      - 'run'
      - '-d'
      - '--name'
      - 'test-db'
      - '--network'
      - 'cloudbuild'
      - '-e'
      - 'POSTGRES_PASSWORD=testpass'
      - '-e'
      - 'POSTGRES_DB=testdb'
      - 'postgres:16'

  # Wait for the database to be ready
  - name: 'postgres:16'
    id: 'wait-for-db'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Wait until PostgreSQL accepts connections
        for i in {1..30}; do
          if pg_isready -h test-db -U postgres 2>/dev/null; then
            echo "Database is ready"
            exit 0
          fi
          echo "Waiting for database... (attempt $$i)"
          sleep 1
        done
        echo "Database did not become ready in time"
        exit 1

  # Install dependencies
  - name: 'node:20'
    id: 'install'
    waitFor: ['-']
    args: ['npm', 'ci']

  # Run tests against the database
  - name: 'node:20'
    id: 'test'
    waitFor: ['install', 'wait-for-db']
    env:
      - 'DATABASE_URL=postgresql://postgres:testpass@test-db:5432/testdb'
      - 'NODE_ENV=test'
    args: ['npm', 'test']

options:
  # Required for Docker networking between containers
  pool: {}
```

Note: The `--network cloudbuild` flag puts the database container on the same Docker network that Cloud Build step containers use, allowing them to communicate by container name.

## Generating Test Reports

Cloud Build does not natively display test reports, but you can store them for later review:

```yaml
# Generate and store test reports
steps:
  - name: 'node:20'
    id: 'install'
    args: ['npm', 'ci']

  - name: 'node:20'
    id: 'test'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Run tests and generate a JUnit XML report
        npm test -- --reporter=junit --reporter-options="mochaFile=/workspace/test-results.xml"
        TEST_EXIT_CODE=$$?

        # Upload the report to GCS regardless of test result
        exit $$TEST_EXIT_CODE

  # Upload test results to GCS (runs even if tests fail? No - we need a different approach)
  # Instead, handle this in the test step itself
  - name: 'node:20'
    id: 'test-with-report'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Run tests and capture the exit code
        npm test -- --reporter=junit --output=/workspace/test-results.xml || true
        TEST_RESULT=$$?

        # Always upload the report
        echo "Test results generated at /workspace/test-results.xml"

        # Fail the step if tests failed
        exit $$TEST_RESULT
```

To store test reports in GCS:

```yaml
  - name: 'gcr.io/cloud-builders/gsutil'
    id: 'upload-report'
    args:
      - 'cp'
      - '/workspace/test-results.xml'
      - 'gs://my-test-reports/$BUILD_ID/test-results.xml'
```

## Code Coverage

Add code coverage reporting to your test step:

```yaml
# Run tests with code coverage
steps:
  - name: 'node:20'
    id: 'install'
    args: ['npm', 'ci']

  - name: 'node:20'
    id: 'test-with-coverage'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Run tests with coverage enabled
        npx jest --coverage --coverageReporters="text" --coverageReporters="lcov"

        # Print coverage summary
        echo "Coverage report generated"

        # Optionally enforce a minimum coverage threshold
        # Jest will exit with code 1 if coverage is below threshold
        # Configure in jest.config.js: coverageThreshold: { global: { branches: 80 } }
```

## Environment-Specific Test Configuration

Use substitution variables to adjust test behavior per environment:

```yaml
# Adjust test configuration based on environment
steps:
  - name: 'node:20'
    id: 'install'
    args: ['npm', 'ci']

  - name: 'node:20'
    id: 'test'
    env:
      - 'NODE_ENV=test'
      - 'TEST_TIMEOUT=$_TEST_TIMEOUT'
    args: ['npm', 'test']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy'
    args:
      - 'gcloud'
      - 'run'
      - 'deploy'
      - 'my-app-$_ENV'
      - '--image'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '--region'
      - 'us-central1'

substitutions:
  _ENV: 'dev'
  _TEST_TIMEOUT: '5000'
```

## Handling Flaky Tests

Flaky tests - tests that sometimes pass and sometimes fail without code changes - are the bane of CI/CD pipelines. Here are some strategies:

### Retry Failed Tests

Some test runners support retries:

```yaml
# Retry failed tests up to 3 times (Jest)
  - name: 'node:20'
    id: 'test'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Run tests with retry for flaky tests
        npx jest --forceExit --detectOpenHandles
```

For pytest:

```yaml
# Retry failed tests (pytest)
  - name: 'python:3.12'
    id: 'test'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install pytest-rerunfailures
        python -m pytest tests/ --reruns 3 --reruns-delay 2
```

### Separate Stable and Flaky Tests

Run stable tests as a gate, and flaky tests as non-blocking:

```yaml
# Run stable tests as a gate
  - name: 'node:20'
    id: 'stable-tests'
    args: ['npx', 'jest', '--testPathPattern=stable']

# Run flaky tests but do not block deployment
  - name: 'node:20'
    id: 'flaky-tests'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        npx jest --testPathPattern=flaky || echo "Some flaky tests failed (non-blocking)"
```

## Complete Production Pipeline

Here is a complete pipeline that lint-checks, tests, builds, and deploys:

```yaml
# Complete test-before-deploy production pipeline
steps:
  # Install dependencies
  - name: 'node:20'
    id: 'install'
    args: ['npm', 'ci']

  # Lint and test in parallel
  - name: 'node:20'
    id: 'lint'
    waitFor: ['install']
    args: ['npm', 'run', 'lint']

  - name: 'node:20'
    id: 'test'
    waitFor: ['install']
    env: ['CI=true', 'NODE_ENV=test']
    args: ['npm', 'test']

  # Type check (for TypeScript projects)
  - name: 'node:20'
    id: 'typecheck'
    waitFor: ['install']
    args: ['npx', 'tsc', '--noEmit']

  # Build the Docker image only if all checks pass
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build'
    waitFor: ['lint', 'test', 'typecheck']
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '.'

  # Push the image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy'
    args:
      - 'gcloud'
      - 'run'
      - 'deploy'
      - 'my-app'
      - '--image'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '--region'
      - 'us-central1'

timeout: 1200s
options:
  machineType: 'E2_HIGHCPU_8'
```

## Wrapping Up

Running tests before deployment is the most fundamental practice in CI/CD. Cloud Build makes this straightforward - put your test step before your deploy step, and if tests fail, the deployment never happens. Start with the basic sequential pattern, add parallel execution for faster feedback, and layer on code coverage and reporting as your testing practices mature. The goal is simple: never deploy code that fails tests. Everything else is optimization.
