# How to Configure GitHub Actions for Monorepos

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Monorepo, CI/CD, DevOps, Automation, Continuous Integration

Description: A comprehensive guide to configuring GitHub Actions for monorepo projects. Learn path filtering, matrix builds, caching strategies, and workflow optimization techniques to build efficient CI/CD pipelines for multi-package repositories.

---

Managing continuous integration for a monorepo presents unique challenges that standard CI configurations struggle to handle. When your repository contains multiple applications, shared libraries, and microservices, running all tests and builds on every commit wastes time and resources. GitHub Actions provides powerful features specifically designed to tackle monorepo workflows efficiently.

## Understanding Monorepo CI Challenges

A monorepo (monolithic repository) consolidates multiple projects into a single version-controlled repository. While the approach offers benefits like simplified dependency management and atomic commits across projects, CI/CD pipelines require special consideration.

```mermaid
flowchart TB
    subgraph Monorepo["Monorepo Structure"]
        A[apps/web]
        B[apps/api]
        C[apps/mobile]
        D[packages/shared-ui]
        E[packages/utils]
        F[packages/config]
    end

    subgraph Challenges["CI Challenges"]
        G[Build Everything on Every Commit?]
        H[Slow Feedback Loops]
        I[Wasted Compute Resources]
        J[Complex Dependencies]
    end

    Monorepo --> Challenges
```

| Challenge | Impact | Solution |
|-----------|--------|----------|
| Full builds on every change | Long CI times, wasted resources | Path filtering |
| Dependency tracking | Missed builds when shared code changes | Dependency-aware triggers |
| Test isolation | Tests interfering with each other | Matrix builds |
| Cache invalidation | Slow builds from scratch | Smart caching strategies |

## Basic Project Structure

Before diving into configuration, here is a typical monorepo structure that we will reference throughout the examples.

```
my-monorepo/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── web.yml
│       ├── api.yml
│       └── shared.yml
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   └── src/
│   ├── api/
│   │   ├── package.json
│   │   └── src/
│   └── mobile/
│       ├── package.json
│       └── src/
├── packages/
│   ├── shared-ui/
│   │   ├── package.json
│   │   └── src/
│   ├── utils/
│   │   ├── package.json
│   │   └── src/
│   └── config/
│       ├── package.json
│       └── src/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Path Filtering with on.push.paths

GitHub Actions supports path-based triggers that only run workflows when specific files change. Leveraging path filters dramatically reduces unnecessary CI runs.

The following workflow configuration triggers only when files in the web application directory change.

```yaml
# .github/workflows/web.yml
name: Web App CI

# Trigger workflow on pushes to main branch
# Only run when files in apps/web or packages/shared-ui change
on:
  push:
    branches:
      - main
    paths:
      # Include the web application directory
      - 'apps/web/**'
      # Include shared UI package since web depends on it
      - 'packages/shared-ui/**'
      # Include shared utilities
      - 'packages/utils/**'
      # Include the workflow file itself
      - '.github/workflows/web.yml'
  pull_request:
    branches:
      - main
    paths:
      - 'apps/web/**'
      - 'packages/shared-ui/**'
      - 'packages/utils/**'

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      # Checkout the repository
      - name: Checkout code
        uses: actions/checkout@v4

      # Setup Node.js environment
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Install dependencies for the entire monorepo
      - name: Install dependencies
        run: npm ci

      # Build only the web application and its dependencies
      - name: Build web app
        run: npm run build --workspace=apps/web

      # Run tests for the web application
      - name: Test web app
        run: npm run test --workspace=apps/web
```

## Multiple Workflow Strategy

For larger monorepos, maintaining separate workflow files for each application provides better organization and independent control.

```mermaid
flowchart LR
    subgraph Triggers["Code Changes"]
        A[apps/web/*]
        B[apps/api/*]
        C[packages/shared-ui/*]
    end

    subgraph Workflows["Workflow Files"]
        D[web.yml]
        E[api.yml]
        F[shared.yml]
    end

    A --> D
    B --> E
    C --> F
    C --> D
    C --> E
```

Here is a workflow for the API application with its own path filters and configuration.

```yaml
# .github/workflows/api.yml
name: API CI

on:
  push:
    branches:
      - main
    paths:
      # API application source files
      - 'apps/api/**'
      # Shared utilities dependency
      - 'packages/utils/**'
      # Shared configuration
      - 'packages/config/**'
      # Workflow definition
      - '.github/workflows/api.yml'
  pull_request:
    branches:
      - main
    paths:
      - 'apps/api/**'
      - 'packages/utils/**'
      - 'packages/config/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Run linting only on the API package
      - name: Lint API
        run: npm run lint --workspace=apps/api

  test:
    runs-on: ubuntu-latest
    # Run tests only after linting passes
    needs: lint

    # Define test database service for integration tests
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        # Health check to ensure database is ready
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
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Run unit and integration tests
      - name: Run tests
        run: npm run test --workspace=apps/api
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb

  build:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Build the API application
      - name: Build API
        run: npm run build --workspace=apps/api

      # Upload build artifacts for deployment
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: api-build
          path: apps/api/dist/
          retention-days: 7
```

## Matrix Builds for Multiple Packages

When you need to test multiple packages with the same configuration, matrix builds reduce duplication and run tests in parallel.

The following workflow tests all packages in parallel using a matrix strategy.

```yaml
# .github/workflows/packages.yml
name: Packages CI

on:
  push:
    branches:
      - main
    paths:
      - 'packages/**'
      - '.github/workflows/packages.yml'
  pull_request:
    branches:
      - main
    paths:
      - 'packages/**'

jobs:
  test-packages:
    runs-on: ubuntu-latest

    # Define matrix to test multiple packages in parallel
    strategy:
      # Continue testing other packages even if one fails
      fail-fast: false
      matrix:
        # List all packages to test
        package:
          - shared-ui
          - utils
          - config
        # Test on multiple Node.js versions
        node-version:
          - '18'
          - '20'

    steps:
      - uses: actions/checkout@v4

      # Use Node.js version from matrix
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Test the specific package from matrix
      - name: Test ${{ matrix.package }}
        run: npm run test --workspace=packages/${{ matrix.package }}

      # Build the package
      - name: Build ${{ matrix.package }}
        run: npm run build --workspace=packages/${{ matrix.package }}
```

## Detecting Changed Packages Dynamically

For maximum efficiency, detect which packages actually changed and run CI only for those. Several approaches exist for dynamic change detection.

### Using dorny/paths-filter Action

The paths-filter action provides granular control over change detection with output variables you can use in subsequent jobs.

```yaml
# .github/workflows/ci.yml
name: Monorepo CI

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  # First job detects which packages changed
  changes:
    runs-on: ubuntu-latest
    # Output variables for use in other jobs
    outputs:
      web: ${{ steps.filter.outputs.web }}
      api: ${{ steps.filter.outputs.api }}
      shared-ui: ${{ steps.filter.outputs.shared-ui }}
      packages: ${{ steps.filter.outputs.packages }}

    steps:
      - uses: actions/checkout@v4

      # Detect changes using path filters
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - 'apps/web/**'
              - 'packages/shared-ui/**'
              - 'packages/utils/**'
            api:
              - 'apps/api/**'
              - 'packages/utils/**'
              - 'packages/config/**'
            shared-ui:
              - 'packages/shared-ui/**'
            packages:
              - 'packages/**'

  # Web job runs only when web-related files changed
  web:
    needs: changes
    # Conditional execution based on change detection
    if: ${{ needs.changes.outputs.web == 'true' }}
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build and test web
        run: |
          npm run build --workspace=apps/web
          npm run test --workspace=apps/web

  # API job runs only when API-related files changed
  api:
    needs: changes
    if: ${{ needs.changes.outputs.api == 'true' }}
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build and test API
        run: |
          npm run build --workspace=apps/api
          npm run test --workspace=apps/api

  # Shared UI job with downstream notifications
  shared-ui:
    needs: changes
    if: ${{ needs.changes.outputs.shared-ui == 'true' }}
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build and test shared-ui
        run: |
          npm run build --workspace=packages/shared-ui
          npm run test --workspace=packages/shared-ui
```

## Caching Strategies for Monorepos

Proper caching significantly speeds up monorepo builds. Different package managers and build tools require different caching approaches.

```mermaid
flowchart TB
    subgraph Cache["Cache Layers"]
        A[npm/pnpm/yarn Cache]
        B[Build Cache - Turbo/Nx]
        C[Docker Layer Cache]
        D[Test Cache]
    end

    subgraph Benefits["Benefits"]
        E[Faster Installs]
        F[Skip Unchanged Builds]
        G[Reuse Image Layers]
        H[Skip Unchanged Tests]
    end

    A --> E
    B --> F
    C --> G
    D --> H
```

### npm Workspace Caching

Built-in caching with setup-node works well for npm workspaces.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # setup-node automatically caches based on package-lock.json
      - name: Setup Node.js with cache
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          # Automatically caches node_modules based on lock file
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
```

### pnpm Caching

pnpm requires explicit cache configuration for optimal performance.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Install pnpm first
      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 8

      # Get pnpm store directory for cache key
      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      # Cache pnpm store
      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          # Cache key includes lock file hash
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install
```

### Turborepo Build Caching

Turborepo provides sophisticated caching for monorepo builds. Remote caching enables cache sharing across CI runs.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Enable Turborepo remote caching
      # Requires TURBO_TOKEN and TURBO_TEAM secrets
      - name: Build with Turborepo
        run: npx turbo run build
        env:
          # Remote cache authentication
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
          # Enable remote caching
          TURBO_REMOTE_ONLY: true
```

### Local Turbo Cache

For repositories without remote caching, local cache storage still provides benefits within a single workflow run.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Cache Turborepo local cache directory
      - name: Cache Turbo build
        uses: actions/cache@v4
        with:
          path: .turbo
          # Cache key includes source file hashes
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-

      - name: Install dependencies
        run: npm ci

      # Turbo will use local cache from previous runs
      - name: Build all packages
        run: npx turbo run build
```

## Reusable Workflows for Consistency

Reusable workflows eliminate duplication across multiple application workflows. Define common CI steps once and reference them from application-specific workflows.

### Define Reusable Workflow

Create a workflow that other workflows can call with parameters.

```yaml
# .github/workflows/reusable-node-ci.yml
name: Reusable Node.js CI

# Mark as callable from other workflows
on:
  workflow_call:
    # Define input parameters
    inputs:
      working-directory:
        description: 'Directory containing the package'
        required: true
        type: string
      node-version:
        description: 'Node.js version to use'
        required: false
        type: string
        default: '20'
      run-e2e:
        description: 'Whether to run E2E tests'
        required: false
        type: boolean
        default: false
    # Define secrets that can be passed
    secrets:
      NPM_TOKEN:
        required: false

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint
        working-directory: ${{ inputs.working-directory }}

  test:
    runs-on: ubuntu-latest
    needs: lint

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test
        working-directory: ${{ inputs.working-directory }}

      # Conditionally run E2E tests
      - name: Run E2E tests
        if: ${{ inputs.run-e2e }}
        run: npm run test:e2e
        working-directory: ${{ inputs.working-directory }}

  build:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build package
        run: npm run build
        working-directory: ${{ inputs.working-directory }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ inputs.working-directory }}
          path: ${{ inputs.working-directory }}/dist/
```

### Call Reusable Workflow

Application workflows become much simpler when using reusable workflows.

```yaml
# .github/workflows/web.yml
name: Web App CI

on:
  push:
    branches:
      - main
    paths:
      - 'apps/web/**'
      - 'packages/shared-ui/**'
  pull_request:
    branches:
      - main
    paths:
      - 'apps/web/**'
      - 'packages/shared-ui/**'

jobs:
  ci:
    # Call the reusable workflow
    uses: ./.github/workflows/reusable-node-ci.yml
    with:
      working-directory: apps/web
      node-version: '20'
      run-e2e: true
    # Pass secrets to reusable workflow
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Composite Actions for Common Steps

For smaller chunks of reusable logic, composite actions provide flexibility within job definitions.

### Create Composite Action

Define a composite action for setting up the monorepo environment.

```yaml
# .github/actions/setup-monorepo/action.yml
name: 'Setup Monorepo'
description: 'Setup Node.js environment with caching for monorepo'

inputs:
  node-version:
    description: 'Node.js version'
    required: false
    default: '20'
  package-manager:
    description: 'Package manager to use (npm, pnpm, yarn)'
    required: false
    default: 'npm'

runs:
  # Composite action type
  using: 'composite'
  steps:
    # Install pnpm if specified
    - name: Install pnpm
      if: ${{ inputs.package-manager == 'pnpm' }}
      uses: pnpm/action-setup@v3
      with:
        version: 8

    # Setup Node.js with automatic caching
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: ${{ inputs.package-manager }}

    # Install dependencies based on package manager
    - name: Install dependencies (npm)
      if: ${{ inputs.package-manager == 'npm' }}
      shell: bash
      run: npm ci

    - name: Install dependencies (pnpm)
      if: ${{ inputs.package-manager == 'pnpm' }}
      shell: bash
      run: pnpm install --frozen-lockfile

    - name: Install dependencies (yarn)
      if: ${{ inputs.package-manager == 'yarn' }}
      shell: bash
      run: yarn install --frozen-lockfile
```

### Use Composite Action

Simplify workflow files by using the composite action.

```yaml
# .github/workflows/api.yml
name: API CI

on:
  push:
    branches:
      - main
    paths:
      - 'apps/api/**'

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Use composite action for setup
      - name: Setup monorepo
        uses: ./.github/actions/setup-monorepo
        with:
          node-version: '20'
          package-manager: 'pnpm'

      # Focus on application-specific steps
      - name: Build API
        run: pnpm run build --filter=api

      - name: Test API
        run: pnpm run test --filter=api
```

## Deployment Workflows

Monorepo deployments require careful coordination to deploy only changed applications.

```mermaid
flowchart TB
    subgraph Trigger["Deployment Trigger"]
        A[Push to Main]
    end

    subgraph Detect["Change Detection"]
        B{What Changed?}
    end

    subgraph Deploy["Parallel Deployments"]
        C[Deploy Web]
        D[Deploy API]
        E[Deploy Mobile]
    end

    subgraph Environments["Environments"]
        F[Staging]
        G[Production]
    end

    A --> B
    B -->|Web changed| C
    B -->|API changed| D
    B -->|Mobile changed| E
    C --> F
    D --> F
    E --> F
    F -->|Manual approval| G
```

### Environment-Based Deployment

Deploy different applications to their respective environments with approval gates.

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  # Detect what needs deployment
  changes:
    runs-on: ubuntu-latest
    outputs:
      web: ${{ steps.filter.outputs.web }}
      api: ${{ steps.filter.outputs.api }}

    steps:
      - uses: actions/checkout@v4

      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - 'apps/web/**'
              - 'packages/shared-ui/**'
            api:
              - 'apps/api/**'
              - 'packages/utils/**'

  # Deploy web to staging
  deploy-web-staging:
    needs: changes
    if: ${{ needs.changes.outputs.web == 'true' }}
    runs-on: ubuntu-latest
    # Use staging environment with its secrets
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for staging
        run: npm run build --workspace=apps/web
        env:
          NODE_ENV: staging
          API_URL: ${{ vars.STAGING_API_URL }}

      # Deploy to staging infrastructure
      - name: Deploy to staging
        run: |
          echo "Deploying web to staging..."
          # Add actual deployment commands here

  # Deploy API to staging
  deploy-api-staging:
    needs: changes
    if: ${{ needs.changes.outputs.api == 'true' }}
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build API
        run: npm run build --workspace=apps/api

      - name: Deploy API to staging
        run: |
          echo "Deploying API to staging..."
          # Add actual deployment commands here

  # Production deployment with manual approval
  deploy-web-production:
    needs: deploy-web-staging
    runs-on: ubuntu-latest
    # Production environment requires manual approval
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for production
        run: npm run build --workspace=apps/web
        env:
          NODE_ENV: production
          API_URL: ${{ vars.PRODUCTION_API_URL }}

      - name: Deploy to production
        run: |
          echo "Deploying web to production..."
          # Add actual deployment commands here

  deploy-api-production:
    needs: deploy-api-staging
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build API
        run: npm run build --workspace=apps/api

      - name: Deploy API to production
        run: |
          echo "Deploying API to production..."
          # Add actual deployment commands here
```

## Testing Strategy for Monorepos

Efficient test execution requires understanding package dependencies and running tests at the appropriate scope.

### Dependency-Aware Testing

Run tests for packages affected by changes, including downstream dependents.

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  pull_request:
    branches:
      - main

jobs:
  # Determine test scope based on changes
  determine-scope:
    runs-on: ubuntu-latest
    outputs:
      affected: ${{ steps.affected.outputs.packages }}

    steps:
      - uses: actions/checkout@v4
        with:
          # Fetch full history for accurate diff
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Use turbo or nx to find affected packages
      - name: Find affected packages
        id: affected
        run: |
          # Get list of affected packages
          AFFECTED=$(npx turbo run build --dry-run=json | jq -r '.packages | join(",")')
          echo "packages=$AFFECTED" >> $GITHUB_OUTPUT

  # Run unit tests for affected packages
  unit-tests:
    needs: determine-scope
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Run tests only for affected packages
      - name: Run unit tests
        run: npx turbo run test --filter='...[${{ github.event.pull_request.base.sha }}]'

  # Run integration tests when core packages change
  integration-tests:
    needs: determine-scope
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
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

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npx turbo run test:integration --filter='...[${{ github.event.pull_request.base.sha }}]'
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
```

## Workflow Visualization

Understanding how workflows interact helps debug issues and optimize performance.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant CI as CI Runner
    participant Cache as Cache Service
    participant Deploy as Deployment

    Dev->>GH: Push to main (apps/web change)
    GH->>CI: Trigger web.yml workflow
    CI->>CI: Run change detection
    CI->>Cache: Check for cached dependencies
    Cache-->>CI: Return cached node_modules
    CI->>CI: Build web app
    CI->>CI: Run tests
    CI->>Deploy: Deploy to staging
    Deploy-->>GH: Staging deployment complete
    GH->>Dev: Notify: Ready for review
    Dev->>GH: Approve production deploy
    GH->>CI: Trigger production deployment
    CI->>Deploy: Deploy to production
    Deploy-->>GH: Production deployment complete
```

## Best Practices Summary

### Path Filtering

- Include dependent packages in path filters
- Add workflow files to their own path filters
- Use negative patterns to exclude test fixtures and documentation

### Caching

- Cache package manager stores, not node_modules directly
- Use file hashes in cache keys for proper invalidation
- Consider remote caching with Turborepo for cross-PR cache hits

### Workflow Organization

- Separate workflows per application for independent control
- Use reusable workflows for common patterns
- Create composite actions for setup steps

### Testing

- Run affected tests only using dependency analysis
- Parallelize tests across packages with matrix builds
- Maintain separate unit and integration test jobs

### Deployment

- Use environment protection rules for production
- Deploy only changed applications
- Implement automatic rollback on failure

---

Configuring GitHub Actions for monorepos requires balancing efficiency with reliability. Path filtering prevents unnecessary CI runs, while caching strategies keep build times low. Reusable workflows and composite actions reduce duplication across application-specific configurations. Combined with dependency-aware testing and staged deployments, these patterns enable fast, reliable CI/CD pipelines that scale with your monorepo's growth.
