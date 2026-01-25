# How to Set Up Matrix Jobs in GitLab CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab, CI/CD, Matrix, Parallel, Testing, Build Automation

Description: Learn how to use matrix jobs in GitLab CI to run parallel tests across multiple versions, platforms, and configurations. This guide covers parallel:matrix syntax and advanced patterns.

---

Matrix jobs in GitLab CI allow you to run the same job multiple times with different variable combinations. This is invaluable for testing across multiple Node.js versions, database versions, operating systems, or any other configuration matrix. This guide shows you how to leverage matrix jobs effectively.

## Understanding Matrix Jobs

Matrix jobs expand a single job definition into multiple parallel jobs:

```mermaid
flowchart TB
    MJ[Matrix Job Definition]
    MJ --> J1[Job: Node 16, Ubuntu]
    MJ --> J2[Job: Node 18, Ubuntu]
    MJ --> J3[Job: Node 20, Ubuntu]
    MJ --> J4[Job: Node 16, Alpine]
    MJ --> J5[Job: Node 18, Alpine]
    MJ --> J6[Job: Node 20, Alpine]
```

## Basic Matrix Syntax

Use `parallel:matrix` to define variable combinations:

```yaml
test:
  image: node:${NODE_VERSION}
  parallel:
    matrix:
      - NODE_VERSION: ["16", "18", "20"]
  script:
    - node --version
    - npm ci
    - npm test
```

This creates three jobs:
- `test: [NODE_VERSION: 16]`
- `test: [NODE_VERSION: 18]`
- `test: [NODE_VERSION: 20]`

## Multi-Dimensional Matrix

Combine multiple variables:

```yaml
test:
  image: ${DATABASE}:${DB_VERSION}
  parallel:
    matrix:
      - DATABASE: ["postgres"]
        DB_VERSION: ["13", "14", "15"]
      - DATABASE: ["mysql"]
        DB_VERSION: ["5.7", "8.0"]
  script:
    - echo "Testing with $DATABASE $DB_VERSION"
    - npm test
```

This creates 5 jobs for all combinations.

## Practical Examples

### Testing Multiple Node.js Versions

```yaml
variables:
  npm_config_cache: "$CI_PROJECT_DIR/.npm"

.node_test:
  cache:
    key: node-${NODE_VERSION}
    paths:
      - .npm/
      - node_modules/

test:
  extends: .node_test
  image: node:${NODE_VERSION}-alpine
  parallel:
    matrix:
      - NODE_VERSION: ["16", "18", "20", "21"]
  script:
    - node --version
    - npm ci --cache .npm
    - npm test
```

### Cross-Platform Testing

```yaml
test:
  parallel:
    matrix:
      - RUNNER: ["linux"]
        IMAGE: ["ubuntu:22.04"]
      - RUNNER: ["linux"]
        IMAGE: ["debian:12"]
      - RUNNER: ["linux"]
        IMAGE: ["alpine:3.18"]
  tags:
    - ${RUNNER}
  image: ${IMAGE}
  script:
    - uname -a
    - ./run-tests.sh
```

### Database Compatibility Testing

```yaml
stages:
  - test

test:
  stage: test
  image: node:18-alpine
  services:
    - name: ${DATABASE_IMAGE}
      alias: database
  parallel:
    matrix:
      - DATABASE_IMAGE: ["postgres:13-alpine"]
        DATABASE_URL: "postgresql://postgres:password@database:5432/test"
      - DATABASE_IMAGE: ["postgres:14-alpine"]
        DATABASE_URL: "postgresql://postgres:password@database:5432/test"
      - DATABASE_IMAGE: ["postgres:15-alpine"]
        DATABASE_URL: "postgresql://postgres:password@database:5432/test"
      - DATABASE_IMAGE: ["mysql:8.0"]
        DATABASE_URL: "mysql://root:password@database:3306/test"
  variables:
    POSTGRES_PASSWORD: password
    POSTGRES_DB: test
    MYSQL_ROOT_PASSWORD: password
    MYSQL_DATABASE: test
  script:
    - npm ci
    - npm run db:migrate
    - npm test
```

### Browser Testing Matrix

```yaml
test_browsers:
  image: mcr.microsoft.com/playwright:v1.40.0
  parallel:
    matrix:
      - BROWSER: ["chromium", "firefox", "webkit"]
        VIEWPORT: ["desktop", "mobile"]
  script:
    - npm ci
    - npx playwright test --project=${BROWSER}-${VIEWPORT}
  artifacts:
    when: always
    paths:
      - test-results/
    reports:
      junit: test-results/junit.xml
```

## Combining Matrix with Other Features

### Matrix with Rules

```yaml
test:
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20"]
        TEST_TYPE: ["unit", "integration"]
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run test:${TEST_TYPE}
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"
```

### Matrix with Needs

```yaml
stages:
  - build
  - test

build:
  stage: build
  parallel:
    matrix:
      - ARCH: ["amd64", "arm64"]
  script:
    - docker build --platform linux/${ARCH} -t myapp:${ARCH} .
  artifacts:
    paths:
      - build-${ARCH}/

test:
  stage: test
  parallel:
    matrix:
      - ARCH: ["amd64", "arm64"]
  needs:
    - job: build
      parallel:
        matrix:
          - ARCH: ${ARCH}
  script:
    - ./test-${ARCH}.sh
```

### Matrix with Artifacts

```yaml
build:
  parallel:
    matrix:
      - OS: ["linux", "macos", "windows"]
        ARCH: ["amd64", "arm64"]
  script:
    - ./build.sh ${OS} ${ARCH}
  artifacts:
    name: "${CI_JOB_NAME}-${OS}-${ARCH}"
    paths:
      - dist/${OS}-${ARCH}/
```

## Limiting Matrix Expansion

### Exclude Specific Combinations

While GitLab does not have native exclude syntax, use rules:

```yaml
test:
  parallel:
    matrix:
      - OS: ["linux", "macos", "windows"]
        ARCH: ["amd64", "arm64"]
  rules:
    # Exclude windows-arm64 combination
    - if: $OS == "windows" && $ARCH == "arm64"
      when: never
    - when: always
  script:
    - echo "Testing $OS $ARCH"
```

### Include Only Specific Combinations

```yaml
test:
  parallel:
    matrix:
      # Explicitly list only valid combinations
      - OS: ["linux"]
        ARCH: ["amd64", "arm64"]
      - OS: ["macos"]
        ARCH: ["amd64", "arm64"]
      - OS: ["windows"]
        ARCH: ["amd64"]  # No arm64 for windows
  script:
    - echo "Testing $OS $ARCH"
```

## Dynamic Matrix Generation

Generate matrix values dynamically:

```yaml
stages:
  - prepare
  - test

generate_matrix:
  stage: prepare
  script:
    - |
      # Get all supported Node versions from package.json
      VERSIONS=$(cat package.json | jq -r '.engines.node' | tr ',' '\n' | xargs)
      echo "NODE_VERSIONS=$VERSIONS" >> matrix.env
  artifacts:
    reports:
      dotenv: matrix.env

test:
  stage: test
  needs: [generate_matrix]
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20"]  # Fallback, can be overridden
  image: node:${NODE_VERSION}
  script:
    - npm test
```

## Performance Optimization

### Reducing Matrix Size for MRs

```yaml
test:
  parallel:
    matrix:
      - NODE_VERSION: ["16", "18", "20"]
  rules:
    # Full matrix on main
    - if: $CI_COMMIT_BRANCH == "main"
    # Reduced matrix on MRs
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      variables:
        NODE_VERSION: "20"  # Only latest version

test_full_matrix:
  parallel:
    matrix:
      - NODE_VERSION: ["16", "18", "20"]
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  script:
    - npm test
```

### Fail Fast Strategy

```yaml
test:
  parallel:
    matrix:
      - NODE_VERSION: ["16", "18", "20"]
  interruptible: true
  script:
    - npm test
  allow_failure:
    exit_codes:
      - 137  # OOM killed
```

## Complete Example: Full-Stack Testing Matrix

```yaml
variables:
  npm_config_cache: "$CI_PROJECT_DIR/.npm"

stages:
  - build
  - test
  - integration

# Build for multiple platforms
build:
  stage: build
  image: docker:24.0
  services:
    - docker:24.0-dind
  parallel:
    matrix:
      - PLATFORM: ["linux/amd64", "linux/arm64"]
  script:
    - docker build --platform ${PLATFORM} -t myapp:${CI_COMMIT_SHA}-${PLATFORM//\//-} .
    - docker push myapp:${CI_COMMIT_SHA}-${PLATFORM//\//-}
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# Unit tests across Node versions
unit_tests:
  stage: test
  image: node:${NODE_VERSION}-alpine
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "21"]
  cache:
    key: npm-${NODE_VERSION}
    paths:
      - .npm/
  script:
    - npm ci --cache .npm
    - npm run test:unit
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

# Integration tests with different databases
integration_tests:
  stage: integration
  image: node:20-alpine
  services:
    - name: ${DB_IMAGE}
      alias: db
    - name: redis:7-alpine
      alias: redis
  parallel:
    matrix:
      - DB_TYPE: ["postgres"]
        DB_IMAGE: ["postgres:14-alpine", "postgres:15-alpine"]
        DB_URL: "postgresql://test:test@db:5432/test"
      - DB_TYPE: ["mysql"]
        DB_IMAGE: ["mysql:8.0"]
        DB_URL: "mysql://root:test@db:3306/test"
  variables:
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    POSTGRES_DB: test
    MYSQL_ROOT_PASSWORD: test
    MYSQL_DATABASE: test
    DATABASE_URL: ${DB_URL}
  before_script:
    - npm ci
    - |
      echo "Waiting for database..."
      for i in $(seq 1 30); do
        if npm run db:check 2>/dev/null; then
          echo "Database is ready"
          break
        fi
        echo "Waiting... ($i/30)"
        sleep 2
      done
  script:
    - npm run db:migrate
    - npm run test:integration
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"

# E2E tests with different browsers
e2e_tests:
  stage: integration
  image: mcr.microsoft.com/playwright:v1.40.0
  parallel:
    matrix:
      - BROWSER: ["chromium", "firefox"]
        DEVICE: ["Desktop Chrome", "iPhone 13"]
  script:
    - npm ci
    - npx playwright test --project="${BROWSER}" --grep "@${DEVICE}"
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

## Best Practices

1. **Start small**: Begin with essential combinations, expand as needed
2. **Use meaningful names**: Variable names should clearly indicate their purpose
3. **Cache per matrix value**: Use matrix variables in cache keys
4. **Consider CI minutes**: Large matrices consume resources quickly
5. **Use rules to limit**: Run full matrix only when necessary
6. **Document combinations**: Comment why specific combinations are tested

## Troubleshooting

### Jobs Not Running

Check that matrix syntax is correct:

```yaml
# Correct
parallel:
  matrix:
    - VAR1: ["a", "b"]

# Incorrect - missing list
parallel:
  matrix:
    - VAR1: "a"
```

### Variables Not Expanding

Ensure variables are used correctly:

```yaml
test:
  image: node:${NODE_VERSION}  # Correct
  # image: node:$NODE_VERSION   # Also works
  parallel:
    matrix:
      - NODE_VERSION: ["18"]
```

## Conclusion

Matrix jobs are a powerful feature for comprehensive testing across multiple configurations. They help ensure your application works reliably across different environments, versions, and platforms. Use them strategically to balance thorough testing with CI/CD efficiency.

Key takeaways:
- Use `parallel:matrix` for multi-dimensional testing
- Combine with rules for conditional execution
- Optimize with caching per matrix value
- Limit matrix size for faster feedback on MRs
