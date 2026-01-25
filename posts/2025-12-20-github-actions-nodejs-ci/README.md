# How to Set Up Node.js CI Pipeline with GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Node.js, CI/CD, Testing, npm, JavaScript, TypeScript

Description: Learn how to build a complete Node.js CI pipeline with GitHub Actions, including testing, linting, type checking, security audits, coverage reporting, and caching for fast, reliable builds.

---

A proper Node.js CI pipeline catches bugs, enforces code quality, and provides fast feedback on every commit. GitHub Actions makes it easy to set up comprehensive testing that runs automatically on push and pull request events.

## Basic Node.js CI Workflow

Start with the essentials - install dependencies and run tests:

```yaml
name: Node.js CI

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

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
```

The `npm ci` command provides clean, reproducible installs from your lockfile.

## Multi-Version Testing

Test across multiple Node.js versions:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - run: npm ci
      - run: npm test
```

```mermaid
graph TD
    A[Push Event] --> B[Matrix Strategy]
    B --> C[Node 18]
    B --> D[Node 20]
    B --> E[Node 22]
    C --> F[Install & Test]
    D --> G[Install & Test]
    E --> H[Install & Test]
    F --> I[All Pass?]
    G --> I
    H --> I
    I -->|Yes| J[Success]
    I -->|No| K[Failure]
```

## Complete CI Pipeline

Here's a comprehensive pipeline with all quality checks:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm test

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm audit --audit-level=high
```

## Code Coverage

Track test coverage and fail on regressions:

```yaml
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Run tests with coverage
        run: npm test -- --coverage --coverageReporters=json-summary --coverageReporters=text

      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          echo "Line coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage below 80% threshold"
            exit 1
          fi

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
```

## Database Integration Tests

Test with real databases using service containers:

```yaml
  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
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
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
        run: npm run test:integration
```

## Monorepo CI with Workspaces

For npm/yarn/pnpm workspaces:

```yaml
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        workspace: ['@myorg/api', '@myorg/web', '@myorg/shared']

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Test ${{ matrix.workspace }}
        run: npm test --workspace=${{ matrix.workspace }}
```

With change detection:

```yaml
  changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            api:
              - 'packages/api/**'
            web:
              - 'packages/web/**'
            shared:
              - 'packages/shared/**'

  test:
    needs: changes
    if: needs.changes.outputs.packages != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJson(needs.changes.outputs.packages) }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm test --workspace=${{ matrix.package }}
```

## E2E Testing with Playwright

Browser testing in CI:

```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

## Build and Type Check

Ensure the project builds successfully:

```yaml
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

## Optimized Caching

Cache node_modules for faster runs:

```yaml
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Cache node_modules
        id: cache
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

      - name: Install dependencies
        if: steps.cache.outputs.cache-hit != 'true'
        run: npm ci

      - run: npm test
```

## Dependency Updates

Automated dependency checking:

```yaml
  outdated:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Check for outdated dependencies
        run: npm outdated || true

      - name: Check for security vulnerabilities
        run: npm audit --audit-level=moderate
```

## PR Status Comments

Report results back to PRs:

```yaml
  test:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm test -- --coverage --json --outputFile=results.json

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('results.json', 'utf8'));
            const passed = results.numPassedTests;
            const failed = results.numFailedTests;
            const total = results.numTotalTests;

            const body = `## Test Results
            - Passed: ${passed}/${total}
            - Failed: ${failed}/${total}
            - Duration: ${(results.testResults[0]?.endTime - results.testResults[0]?.startTime) / 1000}s`;

            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body
            });
```

## Required Status Checks

Configure branch protection to require CI:

1. Go to Settings > Branches
2. Add rule for `main`
3. Enable "Require status checks to pass"
4. Select: `lint`, `typecheck`, `test`, `build`

```yaml
# Give jobs clear names for branch protection
jobs:
  lint:
    name: Lint
    # ...

  typecheck:
    name: Type Check
    # ...

  test:
    name: Unit Tests
    # ...

  build:
    name: Build
    # ...
```

---

A solid Node.js CI pipeline combines fast feedback with comprehensive checks. Run linting and type checking in parallel with tests, use matrix builds for multi-version support, and cache dependencies aggressively. The result is confidence that every merged PR meets your quality standards.
