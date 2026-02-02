# How to Use Matrix Builds in GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, CI/CD, Matrix Builds, Automation, DevOps

Description: Learn how to use matrix builds in GitHub Actions to test your code across multiple versions, operating systems, and configurations in parallel.

---

Testing your code against a single configuration is never enough. Your users run different Node versions, different operating systems, and different database versions. Matrix builds let you test all combinations in parallel without writing duplicate workflow files.

## What Are Matrix Builds?

A matrix build runs the same job multiple times with different variable combinations. Instead of writing five separate jobs for Node 16, 18, 20, 21, and 22, you define a matrix and GitHub Actions spawns parallel jobs automatically.

```mermaid
flowchart LR
    A[Push Event] --> B[Matrix Strategy]
    B --> C1[Node 18 / Ubuntu]
    B --> C2[Node 20 / Ubuntu]
    B --> C3[Node 22 / Ubuntu]
    B --> C4[Node 18 / Windows]
    B --> C5[Node 20 / Windows]
    B --> C6[Node 22 / Windows]
    C1 --> D[Results Summary]
    C2 --> D
    C3 --> D
    C4 --> D
    C5 --> D
    C6 --> D
```

## Basic Matrix Syntax

This workflow tests your code against three Node.js versions. Each version runs as a separate parallel job, so you get faster feedback.

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    # Define the matrix strategy for parallel testing
    strategy:
      matrix:
        # Test against these three Node.js versions
        node-version: [18, 20, 22]

    steps:
      # Check out the repository code
      - uses: actions/checkout@v4

      # Set up the Node.js version from the matrix
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      # Install dependencies and run tests
      - run: npm ci
      - run: npm test
```

## Multi-Dimensional Matrix

You can combine multiple variables. This example tests across both Node versions and operating systems, creating 9 parallel jobs (3 versions x 3 OSes).

```yaml
jobs:
  test:
    # The OS itself comes from the matrix
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        # Three operating systems
        os: [ubuntu-latest, windows-latest, macos-latest]
        # Three Node.js versions
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      # Windows uses different shell syntax, but npm works the same
      - run: npm ci
      - run: npm test
```

| OS | Node 18 | Node 20 | Node 22 |
|----|---------|---------|---------|
| Ubuntu | Job 1 | Job 2 | Job 3 |
| Windows | Job 4 | Job 5 | Job 6 |
| macOS | Job 7 | Job 8 | Job 9 |

## Excluding Specific Combinations

Sometimes certain combinations don't make sense or aren't supported. Use `exclude` to skip them.

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [18, 20, 22]
    # Skip these specific combinations
    exclude:
      # Node 18 on Windows has known issues with our native deps
      - os: windows-latest
        node-version: 18
      # macOS runners are expensive, only test latest Node
      - os: macos-latest
        node-version: 18
      - os: macos-latest
        node-version: 20
```

This reduces 9 jobs down to 6, saving runner minutes.

## Including Extra Combinations

Use `include` to add specific combinations with additional variables that don't fit the standard matrix pattern.

```yaml
strategy:
  matrix:
    os: [ubuntu-latest]
    node-version: [18, 20, 22]
    # Add specific combinations with extra configuration
    include:
      # Test the experimental Node version only on Ubuntu
      - os: ubuntu-latest
        node-version: 23
        experimental: true
      # Windows needs a specific npm config
      - os: windows-latest
        node-version: 22
        npm-config: "--legacy-peer-deps"

steps:
  - uses: actions/checkout@v4

  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}

  # Use the npm-config if defined, otherwise empty string
  - run: npm ci ${{ matrix.npm-config }}
  - run: npm test
```

## Fail-Fast Behavior

By default, GitHub Actions cancels all matrix jobs if one fails. This saves compute but can hide multiple issues. Control this with `fail-fast`.

```yaml
strategy:
  # Set to false to run all combinations even if some fail
  fail-fast: false
  matrix:
    node-version: [18, 20, 22]
```

When `fail-fast: true` (the default):
- Job 1 (Node 18) fails
- Jobs 2 and 3 get cancelled immediately
- You only see one failure

When `fail-fast: false`:
- Job 1 (Node 18) fails
- Jobs 2 and 3 continue running
- You see all failures at once

## Limiting Parallel Jobs

Large matrices can spawn many jobs. Use `max-parallel` to limit concurrent runners and avoid hitting rate limits or overwhelming shared resources.

```yaml
strategy:
  # Only run 3 jobs at a time, even though matrix has 9 combinations
  max-parallel: 3
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [18, 20, 22]
```

This is useful when:
- Your tests hit a shared database or API
- You're on a limited GitHub Actions plan
- Tests compete for limited external resources

## Dynamic Matrix from JSON

Generate matrix values dynamically from a previous job. This is powerful for monorepos or when the list of things to test changes.

```yaml
jobs:
  # First job determines what to test
  setup:
    runs-on: ubuntu-latest
    outputs:
      # Pass the matrix as a JSON string to the next job
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4

      # Generate the matrix based on changed files or config
      - id: set-matrix
        run: |
          # This could read from a config file or detect changed packages
          echo 'matrix={"package":["api","web","worker"],"node":[20,22]}' >> $GITHUB_OUTPUT

  # Second job uses the dynamic matrix
  test:
    needs: setup
    runs-on: ubuntu-latest
    strategy:
      # Parse the JSON string into a matrix
      matrix: ${{ fromJSON(needs.setup.outputs.matrix) }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}

      # Test the specific package from the matrix
      - run: npm test --workspace=${{ matrix.package }}
```

## Real-World Example: Testing a Library

Here's a complete workflow for testing a library across multiple environments with proper caching and reporting.

```yaml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      # Run all combinations to see the full picture
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest]
        node-version: [18, 20, 22]
        # Test with both npm and pnpm
        package-manager: [npm, pnpm]
        exclude:
          # pnpm on Windows is slower, skip older Node
          - os: windows-latest
            package-manager: pnpm
            node-version: 18

    steps:
      - uses: actions/checkout@v4

      # Set up Node with caching for the selected package manager
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: ${{ matrix.package-manager }}

      # Install pnpm if that's the selected package manager
      - if: matrix.package-manager == 'pnpm'
        run: npm install -g pnpm

      # Install dependencies using the selected package manager
      - name: Install dependencies
        run: |
          if [ "${{ matrix.package-manager }}" == "pnpm" ]; then
            pnpm install --frozen-lockfile
          else
            npm ci
          fi
        shell: bash

      # Run the test suite
      - name: Run tests
        run: |
          if [ "${{ matrix.package-manager }}" == "pnpm" ]; then
            pnpm test
          else
            npm test
          fi
        shell: bash

      # Upload coverage only from one combination to avoid duplicates
      - if: matrix.os == 'ubuntu-latest' && matrix.node-version == 22 && matrix.package-manager == 'npm'
        uses: codecov/codecov-action@v4
```

## Matrix with Services

Combine matrix builds with service containers to test against multiple database versions.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        # Test against different Postgres versions
        postgres-version: [14, 15, 16]

    # Define a Postgres service container
    services:
      postgres:
        image: postgres:${{ matrix.postgres-version }}
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        # Wait for Postgres to be ready before running tests
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
          node-version: 22

      - run: npm ci

      # Run tests with the database connection string
      - run: npm test
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb
```

## Debugging Matrix Jobs

When a matrix job fails, the logs show which combination failed. You can also add debug output.

```yaml
steps:
  # Print the current matrix values for debugging
  - name: Debug matrix values
    run: |
      echo "OS: ${{ matrix.os }}"
      echo "Node: ${{ matrix.node-version }}"
      echo "Runner: ${{ runner.os }}"
```

To re-run only failed matrix jobs:
1. Go to the workflow run
2. Click "Re-run jobs"
3. Select "Re-run failed jobs"

## Best Practices

1. **Start small**: Begin with 2-3 combinations, then expand as needed
2. **Use fail-fast wisely**: Disable it for PR checks, enable it for long-running tests
3. **Cache dependencies**: Each matrix job downloads dependencies separately
4. **Watch your minutes**: A 3x3 matrix runs 9 times as many minutes as a single job
5. **Use exclude over include**: It's easier to exclude edge cases than enumerate all valid combinations
6. **Test the matrix locally**: Use `act` to run GitHub Actions locally before pushing

---

Matrix builds turn one workflow into many parallel test runs. Your code gets tested across Node versions, operating systems, and database versions without maintaining duplicate YAML. Start with a simple matrix and expand it as you discover edge cases.

*Need to monitor those CI/CD pipelines and get alerted when builds fail across your matrix combinations? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your entire software delivery pipeline, from code push to production deployment.*
