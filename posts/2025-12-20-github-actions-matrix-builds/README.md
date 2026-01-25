# How to Set Up Matrix Builds in GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, CI/CD, Matrix Builds, Testing, DevOps, Automation

Description: Learn how to configure matrix builds in GitHub Actions to test your code across multiple versions, operating systems, and configurations simultaneously, reducing CI time while ensuring comprehensive coverage.

---

Matrix builds are one of GitHub Actions' most powerful features. They let you run the same job across multiple combinations of environments, versions, and configurations - all in parallel. Instead of writing separate jobs for Node 18, 20, and 22 testing, you define a single job with a matrix strategy.

## Why Use Matrix Builds?

Testing across multiple environments catches compatibility issues before they reach production. A library that works on Node 20 might break on Node 18. Code that runs on Ubuntu might fail on Windows. Matrix builds ensure comprehensive coverage without duplicating workflow code.

```mermaid
graph TD
    A[Push to Repository] --> B[Matrix Strategy]
    B --> C[Node 18 + Ubuntu]
    B --> D[Node 20 + Ubuntu]
    B --> E[Node 22 + Ubuntu]
    B --> F[Node 18 + Windows]
    B --> G[Node 20 + Windows]
    B --> H[Node 22 + Windows]
    C --> I[All Tests Pass]
    D --> I
    E --> I
    F --> I
    G --> I
    H --> I
```

## Basic Matrix Configuration

Here's a simple matrix that tests across three Node.js versions:

```yaml
name: Test Matrix

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - run: npm ci
      - run: npm test
```

The `matrix.node-version` variable contains the current value for each parallel job. GitHub Actions automatically creates three separate jobs from this single definition.

## Multi-Dimensional Matrices

Combine multiple dimensions to test every possible combination:

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20, 22]
        # This creates 9 jobs (3 OS x 3 Node versions)

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }} on ${{ matrix.os }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - run: npm ci
      - run: npm test
```

## Include and Exclude Specific Combinations

Sometimes you need specific combinations or want to skip certain ones. Use `include` and `exclude`:

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node-version: [18, 20, 22]
        exclude:
          # Skip Node 18 on Windows (not supported in our app)
          - os: windows-latest
            node-version: 18
        include:
          # Add specific test for legacy Node 16 on Ubuntu only
          - os: ubuntu-latest
            node-version: 16
            experimental: true

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - run: npm ci
      - run: npm test
        continue-on-error: ${{ matrix.experimental == true }}
```

The `include` directive adds new combinations, and you can attach custom properties like `experimental` to control behavior.

## Fail-Fast vs Complete Matrix

By default, GitHub Actions cancels all in-progress jobs when one fails. Override this with `fail-fast`:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false  # Continue running other jobs even if one fails
      matrix:
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

Set `fail-fast: false` when you want complete visibility into which environments pass or fail.

## Dynamic Matrix from JSON

Generate matrix values dynamically for complex scenarios:

```yaml
jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4

      - id: set-matrix
        run: |
          # Read versions from a JSON file or compute dynamically
          MATRIX=$(cat .github/test-matrix.json)
          echo "matrix=$MATRIX" >> $GITHUB_OUTPUT

  test:
    needs: setup
    runs-on: ubuntu-latest
    strategy:
      matrix: ${{ fromJson(needs.setup.outputs.matrix) }}
    steps:
      - uses: actions/checkout@v4
      - name: Test ${{ matrix.name }}
        run: echo "Testing ${{ matrix.name }} with ${{ matrix.config }}"
```

Your `.github/test-matrix.json` file:

```json
{
  "include": [
    {"name": "unit", "config": "jest.unit.config.js"},
    {"name": "integration", "config": "jest.integration.config.js"},
    {"name": "e2e", "config": "jest.e2e.config.js"}
  ]
}
```

## Database Testing Matrix

Test against multiple database versions:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        postgres-version: [13, 14, 15, 16]

    services:
      postgres:
        image: postgres:${{ matrix.postgres-version }}
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Run tests against PostgreSQL ${{ matrix.postgres-version }}
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        run: npm test
```

## Limiting Parallel Jobs

Control resource usage with `max-parallel`:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      max-parallel: 3  # Only 3 jobs run simultaneously
      matrix:
        shard: [1, 2, 3, 4, 5, 6]

    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test -- --shard=${{ matrix.shard }}/6
```

This is useful when you have limited self-hosted runner capacity or want to avoid overwhelming external services.

## Matrix with Reusable Workflows

Pass matrix values to reusable workflows:

```yaml
jobs:
  test:
    strategy:
      matrix:
        environment: [staging, production]
    uses: ./.github/workflows/deploy.yml
    with:
      environment: ${{ matrix.environment }}
    secrets: inherit
```

## Best Practices for Matrix Builds

1. **Start small**: Begin with essential combinations and expand as needed
2. **Use fail-fast wisely**: Disable it for thorough testing, enable it for fast feedback
3. **Cache dependencies**: Each matrix job benefits from caching
4. **Name your jobs clearly**: Use matrix values in job names for easy identification
5. **Consider costs**: More matrix combinations mean more billable minutes

```yaml
jobs:
  test:
    name: Test Node ${{ matrix.node }} on ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        node: [18, 20]
        os: [ubuntu-latest, windows-latest]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'  # Built-in caching

      - run: npm ci
      - run: npm test
```

## Monitoring Matrix Build Results

Track matrix build performance over time. Send results to your observability platform:

```yaml
      - name: Report metrics
        if: always()
        run: |
          curl -X POST https://oneuptime.com/api/webhook \
            -H "Content-Type: application/json" \
            -d '{
              "node_version": "${{ matrix.node-version }}",
              "os": "${{ matrix.os }}",
              "status": "${{ job.status }}",
              "duration": "${{ github.event.workflow_run.run_started_at }}"
            }'
```

---

Matrix builds transform a single job definition into comprehensive cross-environment testing. Use them to catch compatibility issues early, reduce workflow duplication, and ship with confidence that your code works everywhere it needs to.
