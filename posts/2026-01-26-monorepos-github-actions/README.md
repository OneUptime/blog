# How to Handle Monorepos with GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Monorepo, CI/CD, Path Filters, Nx, Turborepo, DevOps

Description: Learn how to configure GitHub Actions for monorepos with path-based triggers, parallel package builds, shared workflows, and efficient caching strategies that scale.

---

Monorepos contain multiple projects in a single repository. Without proper configuration, every change triggers every CI job, wasting time and compute resources. This guide shows you how to build efficient GitHub Actions workflows for monorepos.

## Monorepo Structure

A typical monorepo might look like this:

```
my-monorepo/
  packages/
    api/
    web/
    shared/
    mobile/
  libs/
    utils/
    ui-components/
  tools/
    cli/
  package.json
  turbo.json
```

## Path-Based Workflow Triggers

Only run workflows when relevant files change:

```yaml
# .github/workflows/api.yml
name: API CI

on:
  push:
    branches: [main]
    paths:
      - 'packages/api/**'
      - 'libs/utils/**'         # API depends on utils
      - 'libs/shared/**'        # API depends on shared
      - 'package.json'          # Root dependencies changed
      - 'pnpm-lock.yaml'
      - '.github/workflows/api.yml'
  pull_request:
    paths:
      - 'packages/api/**'
      - 'libs/utils/**'
      - 'libs/shared/**'

jobs:
  build-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter api build
      - run: pnpm --filter api test
```

## Dynamic Change Detection

Use path filters to dynamically determine which packages changed:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.filter.outputs.api }}
      web: ${{ steps.filter.outputs.web }}
      mobile: ${{ steps.filter.outputs.mobile }}
      shared: ${{ steps.filter.outputs.shared }}
    steps:
      - uses: actions/checkout@v4

      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            api:
              - 'packages/api/**'
              - 'libs/utils/**'
            web:
              - 'packages/web/**'
              - 'libs/ui-components/**'
            mobile:
              - 'packages/mobile/**'
              - 'libs/ui-components/**'
            shared:
              - 'libs/**'

  build-api:
    needs: detect-changes
    if: needs.detect-changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm --filter api build
      - run: pnpm --filter api test

  build-web:
    needs: detect-changes
    if: needs.detect-changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm --filter web build
      - run: pnpm --filter web test

  build-mobile:
    needs: detect-changes
    if: needs.detect-changes.outputs.mobile == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm --filter mobile build
```

## Using Turborepo for Efficient Builds

Turborepo provides intelligent caching and task orchestration:

```yaml
name: CI with Turborepo

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # Needed for turbo to detect changes

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      # Cache Turborepo
      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-${{ github.sha }}
          restore-keys: |
            turbo-

      - run: pnpm install --frozen-lockfile

      # Turbo automatically determines affected packages
      - name: Build affected packages
        run: pnpm turbo run build --filter='...[origin/main]'

      - name: Test affected packages
        run: pnpm turbo run test --filter='...[origin/main]'

      - name: Lint affected packages
        run: pnpm turbo run lint --filter='...[origin/main]'
```

Configure Turborepo for your monorepo:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false
    }
  }
}
```

## Using Nx for Monorepo Orchestration

Nx provides similar capabilities with its affected command:

```yaml
name: CI with Nx

on:
  push:
    branches: [main]
  pull_request:

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for Nx affected

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Nx Cloud for distributed caching
      - name: Set up Nx Cloud
        run: npx nx-cloud start-ci-run

      - run: npm ci

      # Run affected commands
      - name: Build affected
        run: npx nx affected --target=build --base=origin/main

      - name: Test affected
        run: npx nx affected --target=test --base=origin/main --parallel=3

      - name: Lint affected
        run: npx nx affected --target=lint --base=origin/main --parallel=3

      - name: Stop Nx Cloud
        if: always()
        run: npx nx-cloud stop-all-agents
```

## Shared Workflows for Packages

Create reusable workflows that packages can call:

```yaml
# .github/workflows/package-ci.yml
name: Package CI

on:
  workflow_call:
    inputs:
      package-name:
        required: true
        type: string
      node-version:
        required: false
        type: string
        default: '20'

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm --filter ${{ inputs.package-name }} build

      - name: Test
        run: pnpm --filter ${{ inputs.package-name }} test

      - name: Lint
        run: pnpm --filter ${{ inputs.package-name }} lint
```

Call the shared workflow from package-specific workflows:

```yaml
# .github/workflows/api.yml
name: API CI

on:
  push:
    paths: ['packages/api/**']
  pull_request:
    paths: ['packages/api/**']

jobs:
  ci:
    uses: ./.github/workflows/package-ci.yml
    with:
      package-name: api
```

## Matrix Build for All Packages

Build all packages in parallel using a matrix:

```yaml
name: Build All Packages

on:
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * *'  # Nightly full build

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        package: [api, web, mobile, cli]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build ${{ matrix.package }}
        run: pnpm --filter ${{ matrix.package }}... build

      - name: Test ${{ matrix.package }}
        run: pnpm --filter ${{ matrix.package }} test

      - name: Upload build
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.package }}-dist
          path: packages/${{ matrix.package }}/dist
```

## Efficient Caching Strategy

Maximize cache hits across monorepo packages:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      # Cache built packages
      - name: Cache package builds
        uses: actions/cache@v4
        with:
          path: |
            packages/*/dist
            libs/*/dist
          key: builds-${{ hashFiles('packages/**/src/**', 'libs/**/src/**') }}
          restore-keys: |
            builds-

      # Cache test results
      - name: Cache test results
        uses: actions/cache@v4
        with:
          path: |
            packages/*/.jest-cache
            coverage
          key: tests-${{ github.sha }}
          restore-keys: |
            tests-

      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build test lint
```

## Dependency Graph Visualization

Generate and publish dependency graphs:

```yaml
jobs:
  dependency-graph:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install

      - name: Generate dependency graph
        run: |
          npx nx graph --file=dependency-graph.html

      - name: Upload graph
        uses: actions/upload-artifact@v4
        with:
          name: dependency-graph
          path: dependency-graph.html
```

## Best Practices

1. **Use path filters** - Only trigger builds for changed packages and their dependents.

2. **Leverage build tools** - Turborepo and Nx understand your dependency graph and optimize builds.

3. **Share workflows** - Create reusable workflows to avoid duplication across packages.

4. **Cache aggressively** - Cache dependencies, builds, and test results separately.

5. **Run affected only** - On PRs, only build and test what changed. Run full builds nightly.

6. **Keep dependencies explicit** - Maintain clear dependency relationships between packages.

7. **Use workspace protocols** - pnpm workspaces and npm workspaces simplify cross-package dependencies.

Monorepos require more CI configuration upfront, but the payoff is a unified development experience with efficient, targeted builds.
