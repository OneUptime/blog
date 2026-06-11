# How to Create GitLab CI Matrix Jobs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: GitLab, CI/CD, Testing, Automation

Description: Create GitLab CI matrix jobs using parallel:matrix for testing across multiple versions, platforms, and configurations efficiently.

---

Matrix jobs in GitLab CI let you run the same job multiple times with different variable combinations. Instead of copying and pasting job definitions for each Node.js version or database type, you define the job once and let GitLab generate all the variations automatically.

This guide covers everything you need to know about `parallel:matrix` in GitLab CI, from basic syntax to advanced patterns for real-world testing scenarios.

## What Are Matrix Jobs?

Matrix jobs allow you to define a single job template that GitLab expands into multiple parallel jobs. Each job runs with a unique combination of variables you specify. This is useful for:

- Testing your application against multiple runtime versions (Node.js 18, 20, 22)
- Running tests on different operating systems (Linux, macOS, Windows)
- Validating compatibility with various database backends (PostgreSQL, MySQL, MongoDB)
- Testing multiple browser and device combinations

Without matrix jobs, you would need to duplicate your job configuration for each combination. With matrix jobs, you define the template once and specify the variable combinations.

## Basic Syntax

The `parallel:matrix` keyword accepts an array of variable definitions. GitLab creates a job for each unique combination of these variables.

Here is a simple example that tests a Node.js application against three different versions:

```yaml
# .gitlab-ci.yml

# Basic matrix job that runs tests against Node.js 18, 20, and 22

test:
  stage: test
  image: node:${NODE_VERSION}
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
  script:
    - npm ci
    - npm test
```

This configuration generates three jobs:
- `test: [18]`
- `test: [20]`
- `test: [22]`

Each job runs independently and in parallel (subject to your runner availability).

## Multiple Variables

You can define multiple variables in your matrix. GitLab creates jobs for every combination of values.

The following example tests against multiple Node.js versions and package managers:

```yaml
# .gitlab-ci.yml
# Matrix with two variables creates jobs for all combinations
# 3 Node versions x 2 package managers = 6 total jobs

test:
  stage: test
  image: node:${NODE_VERSION}
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
        PACKAGE_MANAGER: ["npm", "yarn"]
  script:
    - |
      if [ "$PACKAGE_MANAGER" = "yarn" ]; then
        yarn install --frozen-lockfile
        yarn test
      else
        npm ci
        npm test
      fi
```

This generates six jobs:
- `test: [18, npm]`
- `test: [18, yarn]`
- `test: [20, npm]`
- `test: [20, yarn]`
- `test: [22, npm]`
- `test: [22, yarn]`

## Job Naming

GitLab automatically names matrix jobs using the variable values. The naming follows this pattern:

```text
job_name: [value1, value2, ...]
```

The base job name comes from the job key in your `.gitlab-ci.yml`, and GitLab appends the matrix values to that name.

The table below shows how different matrix configurations affect job names:

| Configuration | Generated Job Names |
|--------------|---------------------|
| `NODE_VERSION: ["18", "20"]` | `test: [18]`, `test: [20]` |
| `NODE_VERSION: ["18"]`, `DB: ["postgres"]` | `test: [18, postgres]` |
| Multiple variables | Values appear in definition order |

For clearer job names in the GitLab UI, use descriptive variable values:

```yaml
# .gitlab-ci.yml
# Using descriptive values improves readability in the pipeline UI

test:
  stage: test
  parallel:
    matrix:
      - NODE_IMAGE: ["node:18", "node:20", "node:22"]
  image: ${NODE_IMAGE}
  script:
    - npm ci
    - npm test
```

## Multiple Matrix Entries

You can define multiple entries in the matrix array. Each entry is expanded independently, then all results are combined.

This is useful when different variable combinations require different values for other variables:

```yaml
# .gitlab-ci.yml
# Multiple matrix entries let you define non-rectangular combinations
# Entry 1: Node.js versions with their compatible npm versions
# Entry 2: Deno versions (different runtime entirely)

test:
  stage: test
  parallel:
    matrix:
      # Node.js combinations
      - RUNTIME: ["node"]
        VERSION: ["18", "20", "22"]
        PACKAGE_MANAGER: ["npm", "yarn"]
      # Deno combinations (no package manager needed)
      - RUNTIME: ["deno"]
        VERSION: ["1.40", "1.41"]
        PACKAGE_MANAGER: ["none"]
  script:
    - |
      case "$RUNTIME" in
        node)
          if [ "$PACKAGE_MANAGER" = "yarn" ]; then
            yarn install && yarn test
          else
            npm ci && npm test
          fi
          ;;
        deno)
          deno test
          ;;
      esac
```

This creates 8 jobs: 6 for Node.js (3 versions x 2 package managers) and 2 for Deno.

## Combining Matrix with Rules

You can combine `parallel:matrix` with `rules` to conditionally run matrix jobs. This is useful for running the full matrix only on certain branches or events.

The following example runs all matrix combinations on the main branch but only the highest Node.js version in this matrix on feature branches:

```yaml
# .gitlab-ci.yml
# Full matrix on main, reduced matrix on feature branches
# This saves CI minutes while still validating compatibility on main

.test_template:
  stage: test
  script:
    - npm ci
    - npm test

# Full matrix for main branch
test:full:
  extends: .test_template
  image: node:${NODE_VERSION}
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# Single version for feature branches
test:quick:
  extends: .test_template
  image: node:22
  rules:
    - if: $CI_COMMIT_BRANCH != "main"
```

You can also use rules within matrix jobs to filter specific combinations:

```yaml
# .gitlab-ci.yml
# Using rules to skip certain matrix combinations
# Skip yarn tests on Node 18 (hypothetical compatibility issue)

test:
  stage: test
  image: node:${NODE_VERSION}
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
        PACKAGE_MANAGER: ["npm", "yarn"]
  rules:
    # Skip yarn on Node 18
    - if: $NODE_VERSION == "18" && $PACKAGE_MANAGER == "yarn"
      when: never
    # Run all other combinations
    - when: on_success
  script:
    - |
      if [ "$PACKAGE_MANAGER" = "yarn" ]; then
        yarn install --frozen-lockfile && yarn test
      else
        npm ci && npm test
      fi
```

## Excluding Combinations

When you need to exclude specific combinations from your matrix, you have several options.

### Method 1: Multiple Matrix Entries

Instead of excluding, define only the combinations you want:

```yaml
# .gitlab-ci.yml
# Define explicit combinations instead of excluding
# This approach is clearer and easier to maintain

test:
  stage: test
  parallel:
    matrix:
      # Node 18 only with npm
      - NODE_VERSION: ["18"]
        PACKAGE_MANAGER: ["npm"]
      # Node 20 and 22 with both package managers
      - NODE_VERSION: ["20", "22"]
        PACKAGE_MANAGER: ["npm", "yarn"]
  image: node:${NODE_VERSION}
  script:
    - |
      if [ "$PACKAGE_MANAGER" = "yarn" ]; then
        yarn install --frozen-lockfile && yarn test
      else
        npm ci && npm test
      fi
```

### Method 2: Rules-Based Exclusion

Use rules to skip specific combinations at runtime:

```yaml
# .gitlab-ci.yml
# Exclude combinations using rules
# Jobs are created but skipped based on variable values

test:
  stage: test
  image: node:${NODE_VERSION}
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
        DATABASE: ["postgres", "mysql", "sqlite"]
  rules:
    # SQLite not supported on Node 18 in this example
    - if: $NODE_VERSION == "18" && $DATABASE == "sqlite"
      when: never
    # MySQL tests only on Node 20+
    - if: $NODE_VERSION == "18" && $DATABASE == "mysql"
      when: never
    - when: on_success
  script:
    - npm ci
    - npm test
```

### Method 3: Script-Level Skipping

Handle exclusions in your script for more complex logic:

```yaml
# .gitlab-ci.yml
# Skip combinations in the script itself
# Useful for dynamic exclusion logic

test:
  stage: test
  image: node:${NODE_VERSION}
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
        DATABASE: ["postgres", "mysql", "sqlite"]
  script:
    - |
      # Define excluded combinations
      if [ "$NODE_VERSION" = "18" ] && [ "$DATABASE" = "sqlite" ]; then
        echo "Skipping: SQLite not supported on Node 18"
        exit 0
      fi

      npm ci
      npm test
```

## Practical Use Cases

### Multi-Version Testing

Testing your application against multiple runtime versions ensures compatibility:

```yaml
# .gitlab-ci.yml
# Test a Python application against multiple Python versions and OS

stages:
  - test
  - build

# Python version matrix
test:python:
  stage: test
  parallel:
    matrix:
      - PYTHON_VERSION: ["3.9", "3.10", "3.11", "3.12"]
  image: python:${PYTHON_VERSION}-slim
  before_script:
    - pip install --upgrade pip
    - pip install -r requirements.txt
    - pip install pytest pytest-cov
  script:
    - pytest --cov=src --cov-report=xml:coverage.xml tests/
  coverage: '/TOTAL.+ ([0-9]{1,3}%)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml
```

### Database Compatibility Testing

Test your application against multiple database backends:

```yaml
# .gitlab-ci.yml
# Test against PostgreSQL, MySQL, and SQLite

variables:
  POSTGRES_DB: test_db
  POSTGRES_USER: test_user
  POSTGRES_PASSWORD: test_password
  MYSQL_DATABASE: test_db
  MYSQL_ROOT_PASSWORD: test_password

test:database:
  stage: test
  image: node:20
  parallel:
    matrix:
      - DATABASE: ["postgres"]
        DB_IMAGE: ["postgres:14", "postgres:15", "postgres:16"]
      - DATABASE: ["mysql"]
        DB_IMAGE: ["mysql:8.0", "mysql:8.1"]
  services:
    - name: ${DB_IMAGE}
      alias: database
  before_script:
    - npm ci
  script:
    - |
      case "$DATABASE" in
        postgres)
          export DATABASE_URL="postgresql://test_user:test_password@database:5432/test_db"
          ;;
        mysql)
          export DATABASE_URL="mysql://root:test_password@database:3306/test_db"
          ;;
      esac
      npm run test:integration

test:sqlite:
  stage: test
  image: node:20
  before_script:
    - npm ci
  script:
    - export DATABASE_URL="sqlite:./test.db"
    - npm run test:integration
```

### Cross-Platform Testing

Test on multiple operating systems using tagged runners:

```yaml
# .gitlab-ci.yml
# Cross-platform testing using runner tags
# Requires runners configured for each platform

test:platform:
  stage: test
  parallel:
    matrix:
      - PLATFORM: ["linux"]
        RUNNER_TAG: ["linux-runner"]
      - PLATFORM: ["macos"]
        RUNNER_TAG: ["macos-runner"]
      - PLATFORM: ["windows"]
        RUNNER_TAG: ["windows-runner"]
  tags:
    - ${RUNNER_TAG}
  script:
    - |
      echo "Running tests on $PLATFORM"
      npm ci
      npm test
```

### Browser Testing Matrix

Test frontend applications across multiple browsers:

```yaml
# .gitlab-ci.yml
# E2E testing across multiple browsers using Playwright

test:e2e:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-jammy
  parallel:
    matrix:
      - BROWSER: ["chromium", "firefox", "webkit"]
        VIEWPORT: ["desktop", "mobile"]
  variables:
    VIEWPORT_WIDTH: ""
    VIEWPORT_HEIGHT: ""
  before_script:
    - npm ci
    - |
      if [ "$VIEWPORT" = "mobile" ]; then
        export VIEWPORT_WIDTH=375
        export VIEWPORT_HEIGHT=667
      else
        export VIEWPORT_WIDTH=1920
        export VIEWPORT_HEIGHT=1080
      fi
  script:
    - npx playwright test --project=$BROWSER
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 7 days
```

### Microservices Testing

Test multiple services in a monorepo:

```yaml
# .gitlab-ci.yml
# Test multiple services in a monorepo with their dependencies

test:services:
  stage: test
  image: node:20
  parallel:
    matrix:
      - SERVICE: ["api", "auth", "payments", "notifications"]
  rules:
    # Only test services that changed
    - changes:
        - services/${SERVICE}/**/*
        - packages/shared/**/*
  before_script:
    - cd services/${SERVICE}
    - npm ci
  script:
    - npm test
  artifacts:
    reports:
      junit: services/${SERVICE}/junit.xml
```

## Advanced Patterns

### Dynamic Matrix Generation

Generate matrix values dynamically using a parent-child pipeline:

```yaml
# .gitlab-ci.yml
# Parent pipeline that generates child pipeline with dynamic matrix

stages:
  - prepare
  - test

generate-matrix:
  stage: prepare
  image: alpine:latest
  script:
    - |
      # Generate matrix based on changed files or other logic
      cat > child-pipeline.yml << 'EOF'
      test:
        stage: test
        parallel:
          matrix:
            - VERSION: ["18", "20", "22"]
        image: node:${VERSION}
        script:
          - npm ci
          - npm test
      EOF
  artifacts:
    paths:
      - child-pipeline.yml

run-tests:
  stage: test
  trigger:
    include:
      - artifact: child-pipeline.yml
        job: generate-matrix
    strategy: depend
```

### Matrix with Artifacts

Pass artifacts between matrix jobs and downstream jobs:

```yaml
# .gitlab-ci.yml
# Matrix jobs that produce artifacts consumed by later stages

stages:
  - build
  - test
  - deploy

build:
  stage: build
  image: node:${NODE_VERSION}
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
  script:
    - npm ci
    - npm run build
    - mkdir -p dist/${NODE_VERSION}
    - cp -r build/* dist/${NODE_VERSION}/
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

test:
  stage: test
  image: node:${NODE_VERSION}
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
  needs:
    - job: build
      parallel:
        matrix:
          - NODE_VERSION: ['$[[ matrix.NODE_VERSION ]]']
      artifacts: true
  script:
    - npm ci
    - npm test -- --coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

# Aggregate results from all matrix jobs
report:
  stage: deploy
  image: alpine:latest
  needs:
    - job: build
      artifacts: true
    - job: test
      artifacts: true
  script:
    - echo "All matrix jobs completed successfully"
    - ls -la dist/
```

### Combining Matrix with Parallel

You cannot set both numeric `parallel` and `parallel:matrix` on the same job. To split a large test suite for each matrix combination, add a shard variable as another matrix dimension:

```yaml
# .gitlab-ci.yml
# Add a shard dimension for splitting large test suites
# 3 Node versions x 3 shards = 9 total jobs

test:
  stage: test
  image: node:${NODE_VERSION}
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
        SHARD: ["0", "1", "2"]
  variables:
    TEST_SHARDS: "3"
  script:
    - npm ci
    # Split tests across parallel jobs
    - |
      TOTAL_TESTS=$(find tests -name "*.test.js" | wc -l)
      TESTS_PER_SHARD=$((TOTAL_TESTS / TEST_SHARDS + 1))
      START=$((SHARD * TESTS_PER_SHARD))

      find tests -name "*.test.js" | \
        sort | \
        tail -n +$((START + 1)) | \
        head -n $TESTS_PER_SHARD | \
        xargs -r npm test --
```

### Retry Configuration for Flaky Matrix Jobs

Configure retries for matrix jobs that may have transient failures:

```yaml
# .gitlab-ci.yml
# Retry configuration for matrix jobs with network dependencies

test:integration:
  stage: test
  image: node:${NODE_VERSION}
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
        DATABASE: ["postgres", "mysql"]
  services:
    - name: ${DATABASE}:latest
      alias: db
  retry:
    max: 2
    when:
      - runner_system_failure
      - stuck_or_timeout_failure
      - script_failure
  script:
    - npm ci
    - npm run test:integration
  timeout: 30 minutes
```

## Best Practices

### Keep Matrix Size Manageable

Large matrices can consume significant CI resources. Consider these guidelines:

| Matrix Size | Recommendation |
|-------------|----------------|
| 1-10 jobs | Safe for most projects |
| 10-25 jobs | Consider running full matrix only on main |
| 25-50 jobs | Use rules to limit matrix on feature branches |
| 50+ jobs | Split into multiple pipelines or use scheduled runs |

### Use Meaningful Variable Names

Choose variable names that clearly indicate their purpose:

```yaml
# Good: Clear and descriptive
parallel:
  matrix:
    - PYTHON_VERSION: ["3.10", "3.11", "3.12"]
      DATABASE_ENGINE: ["postgresql", "mysql"]

# Avoid: Unclear abbreviations
parallel:
  matrix:
    - PV: ["3.10", "3.11", "3.12"]
      DB: ["pg", "my"]
```

### Document Your Matrix

Add comments explaining why specific combinations are included or excluded:

```yaml
# .gitlab-ci.yml
# Matrix configuration for our supported platforms
# - Node 18: EOL in April 2025, kept here only if you still support it
# - Node 20: EOL in April 2026
# - Node 22: LTS until April 2027
#
# We test both npm and yarn as customers use both

test:
  stage: test
  image: node:${NODE_VERSION}
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
        PACKAGE_MANAGER: ["npm", "yarn"]
  script:
    - |
      if [ "$PACKAGE_MANAGER" = "yarn" ]; then
        yarn install --frozen-lockfile && yarn test
      else
        npm ci && npm test
      fi
```

### Fail Fast Configuration

Configure your pipeline to fail fast when a matrix job fails:

```yaml
# .gitlab-ci.yml
# Cancel the rest of the pipeline as soon as one job fails

workflow:
  auto_cancel:
    on_job_failure: all

test:
  stage: test
  image: node:${NODE_VERSION}
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
  script:
    - npm ci
    - npm test
```

## Troubleshooting

### Common Issues

**Job names too long**: GitLab job names must be 255 characters or fewer, and names used with `needs` must be 128 characters or fewer. Use shorter variable values or fewer variables.

```yaml
# Instead of long descriptive values
- ENVIRONMENT: ["development", "staging", "production"]

# Use shorter values and expand in script
- ENV: ["dev", "stg", "prod"]
```

**Matrix not expanding**: Ensure your `parallel:matrix` syntax is correct. The matrix must be an array of objects.

```yaml
# Correct
parallel:
  matrix:
    - VAR1: ["a", "b"]
      VAR2: ["x", "y"]

# Incorrect (missing array notation)
parallel:
  matrix:
    VAR1: ["a", "b"]
```

**Variables not substituting**: Matrix variables are available as CI/CD variables. Use `${VAR}` in most places or `$VAR` in scripts.

```yaml
# In image, use ${VAR}
image: node:${NODE_VERSION}

# In scripts, both work
script:
  - echo "Version: ${NODE_VERSION}"
  - echo "Version: $NODE_VERSION"
```

### Debugging Matrix Jobs

Add debugging output to understand what values each job receives:

```yaml
test:
  stage: test
  image: node:${NODE_VERSION}
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
        DATABASE: ["postgres", "mysql"]
  script:
    - echo "=== Matrix Job Configuration ==="
    - echo "NODE_VERSION: ${NODE_VERSION}"
    - echo "DATABASE: ${DATABASE}"
    - echo "CI_JOB_NAME: ${CI_JOB_NAME}"
    - echo "==============================="
    - npm ci
    - npm test
```

## Summary

Matrix jobs in GitLab CI provide a powerful way to test your application across multiple configurations without duplicating job definitions. Key points to remember:

1. Use `parallel:matrix` to define variable combinations
2. Multiple variables create jobs for all combinations (cartesian product)
3. Multiple matrix entries let you define non-rectangular combinations
4. Combine with rules to conditionally run matrix jobs
5. Exclude combinations using multiple entries, rules, or script logic
6. Keep matrix size manageable to avoid resource exhaustion
7. Use meaningful variable names and document your configuration

Start with a small matrix and expand as needed. Monitor your CI resource usage and adjust the matrix configuration to balance test coverage with pipeline performance.
