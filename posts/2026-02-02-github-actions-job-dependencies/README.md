# How to Handle Job Dependencies in GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, CI/CD, DevOps, Automation, Workflows, Job Dependencies, Parallel Jobs

Description: Learn how to orchestrate complex CI/CD pipelines using job dependencies in GitHub Actions. Master the needs keyword, conditional execution, output sharing between jobs, and advanced patterns for building efficient workflows.

---

> Your GitHub Actions workflow runs all jobs in parallel by default. That sounds fast until your deploy job starts before your tests finish. Job dependencies give you control over execution order, letting you build pipelines where each step runs only after its prerequisites succeed.

Managing job dependencies is essential for building reliable CI/CD pipelines. Whether you're deploying microservices, running integration tests after unit tests, or coordinating complex build matrices, understanding how to connect jobs is crucial.

---

## Understanding Job Execution Order

By default, GitHub Actions runs all jobs in parallel. Consider the following workflow:

```yaml
# .github/workflows/parallel-example.yml
# Without dependencies, all jobs start simultaneously
name: Parallel Jobs Example

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Building..."

  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Testing..."

  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying..."
```

All three jobs start at the same time. For independent tasks, parallel execution is great. But most pipelines need a specific order: build before test, test before deploy.

---

## The needs Keyword

The `needs` keyword creates dependencies between jobs. A job with `needs` waits for the specified jobs to complete successfully before starting.

A single dependency ensures one job completes before another begins:

```yaml
# .github/workflows/sequential.yml
# Jobs run in sequence using the needs keyword
name: Sequential Pipeline

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build application
        run: |
          echo "Compiling source code..."
          npm ci
          npm run build

  test:
    # Wait for build to complete successfully before running tests
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          npm ci
          npm test

  deploy:
    # Wait for test to complete successfully before deploying
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: echo "Deploying application..."
```

The execution flow looks like: build -> test -> deploy

---

## Multiple Dependencies

A job can depend on multiple jobs. Specify dependencies as an array when you need a job to wait for several prerequisites:

```yaml
# .github/workflows/multiple-deps.yml
# Job depends on multiple prerequisite jobs completing
name: Multiple Dependencies

on: push

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:unit

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:integration

  # Deploy only after ALL checks pass
  deploy:
    needs: [lint, unit-tests, integration-tests]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy application
        run: echo "All checks passed, deploying..."
```

In the diagram below, lint, unit-tests, and integration-tests run in parallel. Deploy waits for all three to finish successfully:

```mermaid
graph LR
    A[lint] --> D[deploy]
    B[unit-tests] --> D
    C[integration-tests] --> D
```

---

## Complex Dependency Graphs

Real-world pipelines often have complex dependency relationships. You can model sophisticated workflows by combining single and multiple dependencies:

```yaml
# .github/workflows/complex-pipeline.yml
# Complex pipeline with build stages, parallel tests, and staged deployments
name: Complex Pipeline

on:
  push:
    branches: [main]

jobs:
  # Stage 1: Build artifacts
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: |
          npm ci
          npm run build
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  # Stage 2: Run tests in parallel (all depend on build)
  unit-tests:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: npm run test:unit

  e2e-tests:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: npm run test:e2e

  security-scan:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit

  # Stage 3: Deploy to staging (after all tests pass)
  deploy-staging:
    needs: [unit-tests, e2e-tests, security-scan]
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: echo "Deploying to staging..."

  # Stage 4: Deploy to production (after staging succeeds)
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: echo "Deploying to production..."
```

The full dependency graph for the pipeline above:

```mermaid
graph TD
    A[build] --> B[unit-tests]
    A --> C[e2e-tests]
    A --> D[security-scan]
    B --> E[deploy-staging]
    C --> E
    D --> E
    E --> F[deploy-production]
```

---

## Conditional Dependencies with if

Sometimes you want a job to run even if its dependencies fail. The `if` keyword combined with status check functions gives you fine-grained control:

```yaml
# .github/workflows/conditional-deps.yml
# Jobs with conditional execution based on dependency status
name: Conditional Dependencies

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  # Always notify, regardless of success or failure
  notify:
    needs: [build, test]
    # Run even if previous jobs failed
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Send notification
        run: |
          if [ "${{ needs.build.result }}" == "success" ] && [ "${{ needs.test.result }}" == "success" ]; then
            echo "Pipeline succeeded!"
          else
            echo "Pipeline failed!"
          fi

  # Only run cleanup if something failed
  cleanup-on-failure:
    needs: [build, test]
    # Run only if any previous job failed
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - run: echo "Cleaning up after failure..."

  # Deploy only if all tests passed
  deploy:
    needs: [build, test]
    # Run only if all previous jobs succeeded (default behavior made explicit)
    if: success()
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying..."
```

### Status Check Functions

| Function | Description |
|----------|-------------|
| `success()` | Returns true if all previous jobs succeeded (default) |
| `failure()` | Returns true if any previous job failed |
| `always()` | Always returns true, job runs regardless of status |
| `cancelled()` | Returns true if the workflow was cancelled |

---

## Sharing Data Between Dependent Jobs

Jobs run on separate runners, so you cannot directly access files from another job. Use outputs or artifacts to share data:

### Method 1: Job Outputs

Job outputs work well for small pieces of data like version numbers, flags, or short strings:

```yaml
# .github/workflows/job-outputs.yml
# Passing data between jobs using outputs
name: Job Outputs Example

on: push

jobs:
  # First job determines the version to deploy
  determine-version:
    runs-on: ubuntu-latest
    # Define outputs that other jobs can reference
    outputs:
      version: ${{ steps.version.outputs.version }}
      should_deploy: ${{ steps.check.outputs.deploy }}
    steps:
      - uses: actions/checkout@v4

      # Generate version from git describe
      - name: Get version
        id: version
        run: |
          VERSION=$(git describe --tags --always)
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      # Decide if we should deploy
      - name: Check deployment criteria
        id: check
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "deploy=true" >> $GITHUB_OUTPUT
          else
            echo "deploy=false" >> $GITHUB_OUTPUT
          fi

  build:
    needs: determine-version
    runs-on: ubuntu-latest
    steps:
      # Access the output from the previous job
      - name: Build with version
        run: |
          echo "Building version: ${{ needs.determine-version.outputs.version }}"

  deploy:
    needs: [determine-version, build]
    # Only deploy if the check passed
    if: needs.determine-version.outputs.should_deploy == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy version
        run: |
          echo "Deploying ${{ needs.determine-version.outputs.version }}"
```

### Method 2: Artifacts

Artifacts work for larger files like build outputs, test reports, or compiled binaries:

```yaml
# .github/workflows/artifacts.yml
# Passing build artifacts between jobs
name: Artifacts Example

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: |
          mkdir -p dist
          npm ci
          npm run build

      # Upload the build output as an artifact
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: app-build
          path: dist/
          # Keep artifact for 1 day (default is 90 days)
          retention-days: 1

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Download the build artifact from the previous job
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: app-build
          path: dist/

      - name: Run tests against build
        run: npm run test:dist

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: app-build
          path: dist/

      - name: Deploy
        run: |
          echo "Deploying contents of dist/"
          ls -la dist/
```

---

## Matrix Builds with Dependencies

Matrix builds let you test across multiple configurations. You can set up dependencies that wait for all matrix combinations or specific ones:

```yaml
# .github/workflows/matrix-deps.yml
# Matrix build with dependent jobs waiting for all combinations
name: Matrix with Dependencies

on: push

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      # Run all matrix combinations even if one fails
      fail-fast: false
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test

  # Waits for ALL matrix combinations to complete
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: echo "All matrix tests passed, deploying..."
```

The deploy job automatically waits for all 6 matrix combinations (3 Node versions x 2 OS) to complete.

---

## Reusable Workflows as Dependencies

When using reusable workflows, treat them like regular jobs in your dependency graph:

```yaml
# .github/workflows/main.yml
# Using reusable workflows with job dependencies
name: Main Pipeline

on: push

jobs:
  build:
    uses: ./.github/workflows/build.yml
    with:
      environment: production
    secrets: inherit

  test:
    # Depend on reusable workflow just like a regular job
    needs: build
    uses: ./.github/workflows/test.yml
    secrets: inherit

  deploy:
    needs: test
    uses: ./.github/workflows/deploy.yml
    with:
      environment: production
    secrets: inherit
```

---

## Practical Example: Full CI/CD Pipeline

Here is a complete real-world pipeline for a Node.js application with proper job dependencies:

```yaml
# .github/workflows/ci-cd.yml
# Complete CI/CD pipeline with proper dependency management
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  # Stage 1: Code quality checks (run in parallel)
  lint:
    name: Lint Code
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck

  # Stage 2: Build (after code quality checks pass)
  build:
    name: Build Application
    needs: [lint, typecheck]
    runs-on: ubuntu-latest
    outputs:
      build_id: ${{ steps.build.outputs.build_id }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci

      - name: Build
        id: build
        run: |
          npm run build
          BUILD_ID="${{ github.sha }}-$(date +%s)"
          echo "build_id=$BUILD_ID" >> $GITHUB_OUTPUT

      - name: Upload build
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ github.sha }}
          path: dist/
          retention-days: 7

  # Stage 3: Testing (parallel, all depend on build)
  unit-tests:
    name: Unit Tests
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-unit
          path: coverage/

  integration-tests:
    name: Integration Tests
    needs: build
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test

  e2e-tests:
    name: E2E Tests
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - uses: actions/download-artifact@v4
        with:
          name: build-${{ github.sha }}
          path: dist/

      - run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - run: npm run test:e2e

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-results
          path: test-results/

  # Stage 4: Security scanning (parallel with tests)
  security-scan:
    name: Security Scan
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high

  # Stage 5: Deploy to staging (after all tests and scans pass)
  deploy-staging:
    name: Deploy to Staging
    needs: [unit-tests, integration-tests, e2e-tests, security-scan]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-${{ github.sha }}
          path: dist/

      - name: Deploy to staging
        run: |
          echo "Deploying build ${{ needs.build.outputs.build_id }} to staging"
          # Add your deployment commands here

  # Stage 6: Deploy to production (after staging, main branch only)
  deploy-production:
    name: Deploy to Production
    needs: [unit-tests, integration-tests, e2e-tests, security-scan]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-${{ github.sha }}
          path: dist/

      - name: Deploy to production
        run: |
          echo "Deploying build ${{ needs.build.outputs.build_id }} to production"
          # Add your deployment commands here

  # Always run: Notification job
  notify:
    name: Send Notification
    needs: [deploy-staging, deploy-production]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Notify on Slack
        run: |
          if [ "${{ needs.deploy-staging.result }}" == "success" ] || [ "${{ needs.deploy-production.result }}" == "success" ]; then
            echo "Deployment succeeded!"
          elif [ "${{ needs.deploy-staging.result }}" == "skipped" ] && [ "${{ needs.deploy-production.result }}" == "skipped" ]; then
            echo "No deployment triggered"
          else
            echo "Deployment failed!"
          fi
```

The complete pipeline flow:

```mermaid
graph TD
    A[lint] --> C[build]
    B[typecheck] --> C
    C --> D[unit-tests]
    C --> E[integration-tests]
    C --> F[e2e-tests]
    C --> G[security-scan]
    D --> H[deploy-staging]
    E --> H
    F --> H
    G --> H
    D --> I[deploy-production]
    E --> I
    F --> I
    G --> I
    H --> J[notify]
    I --> J
```

---

## Best Practices

### 1. Keep Dependency Chains Short

Long chains increase total pipeline time. Parallelize where possible:

```yaml
# Slower: serial execution
jobs:
  a: ...
  b:
    needs: a
  c:
    needs: b
  d:
    needs: c

# Faster: parallel where possible
jobs:
  a: ...
  b: ...    # Run a and b in parallel
  c:
    needs: [a, b]
```

### 2. Use fail-fast Strategically

For matrix builds, decide whether to stop on first failure or run all combinations:

```yaml
strategy:
  # Stop all jobs if one fails (faster feedback)
  fail-fast: true

  # Or run all jobs regardless (complete picture)
  fail-fast: false
```

### 3. Minimize Artifact Size

Large artifacts slow down uploads and downloads:

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: build
    path: |
      dist/
      !dist/**/*.map    # Exclude source maps
    retention-days: 1   # Short retention for intermediate artifacts
```

### 4. Use Outputs for Small Data

Prefer outputs over artifacts for simple values:

```yaml
# Good: version string as output
outputs:
  version: ${{ steps.ver.outputs.version }}

# Avoid: creating an artifact just for a version file
```

### 5. Handle Failures Gracefully

Include cleanup and notification jobs that run regardless of status:

```yaml
cleanup:
  needs: [build, test, deploy]
  if: always()
  steps:
    - run: echo "Cleaning up temporary resources..."
```

---

## Troubleshooting Common Issues

### Job Skipped Unexpectedly

Check the dependency chain. A skipped job means a required job failed or was skipped:

```yaml
# If 'build' fails, both 'test' and 'deploy' are skipped
deploy:
  needs: [build, test]  # Will skip if either fails
```

### Circular Dependencies

GitHub Actions does not allow circular dependencies:

```yaml
# ERROR: Circular dependency
jobs:
  a:
    needs: b
  b:
    needs: a
```

### Output Not Available

Ensure the job defining the output is in the needs list:

```yaml
deploy:
  needs: build  # Must include this to access build outputs
  steps:
    - run: echo "${{ needs.build.outputs.version }}"
```

---

## Conclusion

Job dependencies transform GitHub Actions from simple parallel job runners into powerful orchestration tools. Key takeaways:

- Use `needs` to create explicit dependencies between jobs
- Combine `if` with status functions for conditional execution
- Share data via outputs (small values) or artifacts (files)
- Keep dependency chains short and parallelize where possible
- Always include notification and cleanup jobs with `if: always()`

With proper job dependencies, you can build CI/CD pipelines that are both fast and reliable.

---

*Need visibility into your CI/CD pipelines? [OneUptime](https://oneuptime.com) provides monitoring and alerting for your deployment workflows, helping you catch failures before they impact users.*

**Related Reading:**
- [How to Configure Docker for CI/CD](https://oneuptime.com/blog/post/2026-02-02-docker-cicd/view)
- [How to Handle Docker Image Tagging](https://oneuptime.com/blog/post/2026-02-02-docker-image-tagging/view)
