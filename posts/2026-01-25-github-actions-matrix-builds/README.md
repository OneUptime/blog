# How to Implement Matrix Builds in GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Matrix Builds, CI/CD, Testing, Cross-Platform, Automation

Description: Master matrix builds in GitHub Actions to test across multiple operating systems, language versions, and configurations simultaneously. Learn strategies for efficient parallel testing and how to handle complex matrix scenarios.

---

Matrix builds let you run the same job across multiple configurations in parallel. Instead of writing separate jobs for Node.js 18, 19, and 20, you define a matrix and GitHub Actions creates a job for each combination automatically. This guide shows you how to use matrices effectively for cross-platform and multi-version testing.

## Basic Matrix Syntax

A matrix defines variables that GitHub Actions expands into multiple jobs:

```yaml
# .github/workflows/test-matrix.yml
name: Test Matrix

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    # Define the matrix
    strategy:
      matrix:
        node-version: [18, 19, 20]

    steps:
      - uses: actions/checkout@v4

      # Use the current matrix value
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install and test
        run: |
          npm ci
          npm test
```

This creates three parallel jobs, one for each Node.js version. Each job receives its version through `matrix.node-version`.

## Multi-Dimensional Matrices

Combine multiple dimensions to test all combinations:

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20]
        # This creates 6 jobs: 3 OS x 2 Node versions

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }} on ${{ matrix.os }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
```

The matrix expansion creates all combinations:
- ubuntu-latest + Node 18
- ubuntu-latest + Node 20
- windows-latest + Node 18
- windows-latest + Node 20
- macos-latest + Node 18
- macos-latest + Node 20

## Including and Excluding Combinations

Fine-tune your matrix with `include` and `exclude`:

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20]

        # Remove specific combinations
        exclude:
          # Skip Node 18 on macOS to save runner minutes
          - os: macos-latest
            node-version: 18

        # Add specific combinations with extra variables
        include:
          # Test Node 21 only on Ubuntu
          - os: ubuntu-latest
            node-version: 21
            experimental: true

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Run tests
        run: npm test
        # Allow experimental builds to fail
        continue-on-error: ${{ matrix.experimental == true }}
```

The `include` directive adds new combinations and can introduce new variables. The `exclude` directive removes specific combinations from the generated matrix.

## Handling Matrix Failures

Control how failures affect other matrix jobs:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      # Do not cancel other jobs if one fails
      fail-fast: false

      # Limit parallel jobs (default is all at once)
      max-parallel: 3

      matrix:
        version: [16, 18, 20]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.version }}

      - name: Run tests
        run: npm test
```

By default, `fail-fast` is true, meaning all matrix jobs cancel if any job fails. Setting it to `false` lets all jobs complete, which is useful for seeing the full picture of compatibility.

## Dynamic Matrices

Generate matrix values dynamically from a previous job:

```yaml
jobs:
  # First job: determine what to test
  setup:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}

    steps:
      - uses: actions/checkout@v4

      # Generate matrix based on changed files or other logic
      - name: Determine matrix
        id: set-matrix
        run: |
          # Example: read versions from a config file
          if [ -f ".node-versions" ]; then
            VERSIONS=$(cat .node-versions | jq -R -s -c 'split("\n") | map(select(. != ""))')
          else
            VERSIONS='["18", "20"]'
          fi
          echo "matrix={\"node-version\":$VERSIONS}" >> $GITHUB_OUTPUT

  # Second job: use the dynamic matrix
  test:
    needs: setup
    runs-on: ubuntu-latest

    strategy:
      matrix: ${{ fromJson(needs.setup.outputs.matrix) }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Run tests
        run: npm test
```

The `fromJson` function converts the JSON string back into an object that GitHub Actions can use as a matrix.

## Matrix with Complex Objects

Include complex configuration per matrix entry:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        environment:
          - name: staging
            url: https://staging.example.com
            aws_region: us-east-1
          - name: production
            url: https://example.com
            aws_region: us-west-2

    environment:
      name: ${{ matrix.environment.name }}
      url: ${{ matrix.environment.url }}

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-region: ${{ matrix.environment.aws_region }}
          role-to-assume: arn:aws:iam::123456789:role/deploy-role

      - name: Deploy to ${{ matrix.environment.name }}
        run: |
          echo "Deploying to ${{ matrix.environment.url }}"
          echo "Using region ${{ matrix.environment.aws_region }}"
```

## Testing Database Versions

Test against multiple database versions using services:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        postgres-version: [13, 14, 15, 16]

    # Define database service
    services:
      postgres:
        image: postgres:${{ matrix.postgres-version }}
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run database tests
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb
        run: |
          npm ci
          npm run test:db
```

## Browser Testing Matrix

Test across browsers using matrix builds:

```yaml
jobs:
  e2e:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        browser: [chromium, firefox, webkit]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Run E2E tests
        run: npx playwright test --project=${{ matrix.browser }}

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
```

## Conditional Steps Based on Matrix Values

Run different steps depending on matrix context:

```yaml
jobs:
  build:
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]

    steps:
      - uses: actions/checkout@v4

      # Linux-specific setup
      - name: Install Linux dependencies
        if: runner.os == 'Linux'
        run: sudo apt-get update && sudo apt-get install -y libgtk-3-dev

      # macOS-specific setup
      - name: Install macOS dependencies
        if: runner.os == 'macOS'
        run: brew install pkg-config

      # Windows-specific setup
      - name: Install Windows dependencies
        if: runner.os == 'Windows'
        run: choco install visualstudio2022buildtools

      # Cross-platform build
      - name: Build
        run: npm run build

      # Upload platform-specific artifacts
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.os }}
          path: dist/
```

## Reusing Matrix Results

Aggregate results from matrix jobs:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        shard: [1, 2, 3, 4]

    steps:
      - uses: actions/checkout@v4

      - name: Run tests (shard ${{ matrix.shard }}/4)
        run: npm test -- --shard=${{ matrix.shard }}/4

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.shard }}
          path: coverage/

  # Merge coverage from all shards
  coverage:
    needs: test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Download all coverage reports
        uses: actions/download-artifact@v4
        with:
          pattern: coverage-*
          merge-multiple: true
          path: coverage/

      - name: Merge and report coverage
        run: |
          npm ci
          npx nyc merge coverage/ merged-coverage.json
          npx nyc report --reporter=text --reporter=html
```

## Performance Tips

Optimize matrix builds for faster feedback:

```yaml
jobs:
  # Quick feedback: run lint and type check first
  quick-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint && npm run typecheck

  # Full matrix only after quick checks pass
  test:
    needs: quick-check
    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: true
      matrix:
        os: [ubuntu-latest, windows-latest]
        node-version: [18, 20]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - run: npm ci
      - run: npm test
```

Running quick checks first provides faster feedback and avoids wasting runner minutes on a full matrix when basic issues exist.

---

Matrix builds make it practical to test across dozens of configurations without maintaining duplicate workflow code. Start with the versions and platforms your users need, then expand coverage as your project matures. The combination of `include`, `exclude`, and dynamic matrices gives you precise control over what gets tested.
