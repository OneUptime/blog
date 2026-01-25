# How to Build Testing Workflows with GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Testing, CI/CD, Unit Tests, Integration Tests, E2E Testing, DevOps

Description: Build comprehensive testing workflows in GitHub Actions that run unit tests, integration tests, and end-to-end tests efficiently with parallel execution, caching, and smart test splitting.

---

Good testing workflows catch bugs before they reach production while giving developers fast feedback. This guide shows you how to structure testing in GitHub Actions for speed and reliability.

## Testing Workflow Architecture

A comprehensive testing pipeline runs different test types at appropriate stages:

```mermaid
flowchart LR
    A[Push/PR] --> B[Lint]
    B --> C[Unit Tests]
    C --> D[Integration Tests]
    D --> E[E2E Tests]
    E --> F[Report Results]
```

## Basic Testing Workflow

Start with a workflow that runs your test suite on every push and pull request:

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'  # Cache npm dependencies

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
```

## Parallel Test Execution

Run different test types in parallel to reduce total pipeline time:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --testPathPattern="unit"

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --testPathPattern="integration"
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379
```

## Matrix Testing Across Versions

Test across multiple Node.js versions and operating systems:

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false  # Continue testing other versions if one fails
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [18, 20, 22]
        exclude:
          # Skip unnecessary combinations
          - os: macos-latest
            node-version: 18
    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - run: npm ci
      - run: npm test
```

## Test Splitting for Faster Feedback

Split large test suites across multiple runners:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      # Jest supports sharding natively
      - name: Run tests (shard ${{ matrix.shard }}/4)
        run: npm test -- --shard=${{ matrix.shard }}/4

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: test-results-${{ matrix.shard }}
          path: junit.xml

  merge-results:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          pattern: test-results-*
          merge-multiple: true

      - name: Merge test results
        run: |
          # Combine JUnit XML files or process as needed
          cat test-results-*/junit.xml
```

## End-to-End Testing with Playwright

Run browser tests with Playwright:

```yaml
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test
        env:
          BASE_URL: http://localhost:3000

      - name: Upload test report
        uses: actions/upload-artifact@v4
        if: always()  # Upload even on failure
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

      - name: Upload screenshots on failure
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: screenshots
          path: test-results/
```

For parallel Playwright execution:

```yaml
jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps ${{ matrix.browser }}
      - run: npx playwright test --project=${{ matrix.browser }}
```

## Python Testing with pytest

Configure pytest with coverage and parallel execution:

```yaml
jobs:
  test-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov pytest-xdist

      # Run tests in parallel with coverage
      - name: Run tests
        run: |
          pytest \
            -n auto \
            --cov=src \
            --cov-report=xml \
            --cov-report=html \
            --junitxml=junit.xml

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: coverage.xml
          fail_ci_if_error: true
```

## Test Services with Docker Compose

For complex integration tests requiring multiple services:

```yaml
jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start services
        run: |
          docker compose -f docker-compose.test.yml up -d
          # Wait for services to be ready
          ./scripts/wait-for-services.sh

      - name: Run integration tests
        run: |
          docker compose -f docker-compose.test.yml exec -T app npm test

      - name: Collect logs on failure
        if: failure()
        run: |
          docker compose -f docker-compose.test.yml logs > docker-logs.txt

      - name: Upload logs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: docker-logs
          path: docker-logs.txt

      - name: Cleanup
        if: always()
        run: docker compose -f docker-compose.test.yml down -v
```

## Flaky Test Detection

Track and report flaky tests:

```yaml
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

      # Run tests multiple times to detect flakiness
      - name: Run tests with retry
        run: |
          for i in 1 2 3; do
            npm test -- --json --outputFile=results-$i.json || true
          done

      - name: Analyze flakiness
        run: |
          node scripts/detect-flaky-tests.js results-*.json

      - name: Report flaky tests
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const flaky = JSON.parse(fs.readFileSync('flaky-tests.json'));
            if (flaky.length > 0) {
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: 'Flaky tests detected',
                body: `The following tests showed inconsistent results:\n${flaky.map(t => `- ${t}`).join('\n')}`,
                labels: ['flaky-test']
              });
            }
```

## Test Result Reporting

Generate and publish test reports:

```yaml
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

      - name: Run tests with JUnit reporter
        run: npm test -- --reporters=default --reporters=jest-junit
        continue-on-error: true

      - name: Publish test report
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Jest Tests
          path: junit.xml
          reporter: jest-junit

      - name: Add coverage comment to PR
        uses: MishaKav/jest-coverage-comment@main
        if: github.event_name == 'pull_request'
        with:
          coverage-summary-path: coverage/coverage-summary.json
```

## Caching Test Dependencies

Optimize test runs with aggressive caching:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Cache Playwright browsers
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      # Cache test snapshots
      - name: Cache test snapshots
        uses: actions/cache@v4
        with:
          path: __snapshots__
          key: snapshots-${{ github.ref }}
          restore-keys: |
            snapshots-refs/heads/main

      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test
```

## Best Practices

1. **Run fast tests first** - Lint and type checks should run before unit tests. Fail fast.

2. **Parallelize aggressively** - Split tests across multiple jobs and use test sharding.

3. **Cache everything** - Dependencies, browsers, build artifacts. Every cache hit saves time.

4. **Use service containers** - Built-in support for PostgreSQL, Redis, and other services.

5. **Upload artifacts on failure** - Screenshots, logs, and reports help debug failures.

6. **Set timeouts** - Prevent hung tests from blocking your pipeline.

7. **Track flakiness** - Flaky tests erode trust in CI. Detect and fix them.

A well-designed testing workflow gives you confidence in every deployment while keeping developer feedback fast.
