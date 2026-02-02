# How to Configure GitHub Actions for Pull Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, CI/CD, Pull Requests, Automation, DevOps, Code Review, Testing, Continuous Integration

Description: A hands-on guide to configuring GitHub Actions workflows for pull requests. Learn how to automate testing, code quality checks, security scanning, and build verification on every PR.

---

> Pull requests are the heart of collaborative software development. GitHub Actions transforms them from simple code reviews into automated quality gates that catch issues before they reach your main branch.

Every engineering team deserves confidence that their PRs meet quality standards. GitHub Actions makes that possible by running automated checks on every pull request, ensuring tests pass, code quality remains high, and security vulnerabilities get flagged early.

---

## How GitHub Actions Works with Pull Requests

Understanding the workflow execution model helps you build effective CI pipelines.

```mermaid
flowchart TD
    A[Developer Opens PR] --> B{GitHub Actions Triggered}
    B --> C[Checkout Code]
    C --> D[Setup Environment]
    D --> E[Install Dependencies]
    E --> F[Run Linting]
    F --> G[Run Tests]
    G --> H[Build Application]
    H --> I{All Checks Pass?}
    I -->|Yes| J[PR Ready for Review]
    I -->|No| K[Block Merge]
    K --> L[Developer Fixes Issues]
    L --> A
```

---

## Basic PR Workflow Configuration

The following workflow configuration triggers on pull request events and runs essential checks. Place it in your repository at `.github/workflows/pr-checks.yml`.

```yaml
# .github/workflows/pr-checks.yml
# Workflow that runs on every pull request targeting main branch
name: Pull Request Checks

# Define when the workflow should run
# Triggers on PR open, synchronize (new commits), and reopen events
on:
  pull_request:
    branches:
      - main
      - master
    types:
      - opened
      - synchronize
      - reopened

# Set default permissions for security
permissions:
  contents: read
  pull-requests: write

jobs:
  # First job: Run the test suite
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    steps:
      # Check out the PR branch code
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          # Fetch full history for accurate blame and diff
          fetch-depth: 0

      # Set up Node.js environment (adjust for your language)
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          # Cache npm dependencies for faster builds
          cache: 'npm'

      # Install project dependencies
      - name: Install dependencies
        run: npm ci

      # Execute the test suite
      - name: Run tests
        run: npm test

      # Upload test results for visibility in PR
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: coverage/
```

---

## Running Multiple Jobs in Parallel

Speed up your PR checks by running independent jobs simultaneously. The diagram below shows how parallel execution works.

```mermaid
flowchart LR
    A[PR Opened] --> B[Lint Job]
    A --> C[Test Job]
    A --> D[Build Job]
    A --> E[Security Scan]
    B --> F{All Jobs Pass}
    C --> F
    D --> F
    E --> F
    F -->|Yes| G[Merge Allowed]
    F -->|No| H[Merge Blocked]
```

Configure parallel jobs by defining multiple top-level jobs in your workflow file.

```yaml
# .github/workflows/pr-parallel.yml
# Run multiple jobs in parallel for faster feedback
name: PR Parallel Checks

on:
  pull_request:
    branches: [main]

jobs:
  # Linting runs independently
  lint:
    name: Code Linting
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

      # Run ESLint for JavaScript/TypeScript
      - name: Run ESLint
        run: npm run lint

      # Check code formatting with Prettier
      - name: Check formatting
        run: npm run format:check

  # Unit tests run in parallel with linting
  test:
    name: Unit Tests
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

      - name: Run unit tests
        run: npm run test:unit

  # Integration tests also run in parallel
  integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    # Service containers for database dependencies
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        # Health checks ensure DB is ready
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

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
        run: npm run test:integration

  # Build verification runs in parallel
  build:
    name: Build Check
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

      - name: Build application
        run: npm run build

      # Save build artifacts for deployment preview
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
```

---

## Matrix Testing for Multiple Environments

When your application needs to support multiple Node.js versions, operating systems, or configurations, matrix builds provide comprehensive coverage.

```yaml
# .github/workflows/pr-matrix.yml
# Test across multiple Node.js versions and operating systems
name: Matrix Testing

on:
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test on Node ${{ matrix.node }} / ${{ matrix.os }}
    runs-on: ${{ matrix.os }}

    # Define the test matrix
    strategy:
      # Continue running other matrix jobs if one fails
      fail-fast: false
      matrix:
        # Test on multiple operating systems
        os: [ubuntu-latest, macos-latest, windows-latest]
        # Test on multiple Node.js versions
        node: [18, 20, 22]
        # Exclude specific combinations that are not supported
        exclude:
          - os: windows-latest
            node: 18

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
```

---

## Adding Code Coverage Requirements

Enforce minimum code coverage thresholds to maintain test quality over time.

```yaml
# .github/workflows/pr-coverage.yml
# Enforce code coverage thresholds and report coverage on PRs
name: Code Coverage

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  coverage:
    name: Coverage Report
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

      # Run tests with coverage reporting
      - name: Run tests with coverage
        run: npm run test:coverage

      # Post coverage report as PR comment
      - name: Coverage Report
        uses: davelosert/vitest-coverage-report-action@v2
        with:
          json-summary-path: coverage/coverage-summary.json
          json-final-path: coverage/coverage-final.json

      # Fail if coverage drops below threshold
      - name: Check coverage thresholds
        run: |
          # Extract coverage percentage from report
          COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
          THRESHOLD=80

          echo "Current coverage: $COVERAGE%"
          echo "Required threshold: $THRESHOLD%"

          # Compare using bc for floating point comparison
          if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
            echo "Coverage $COVERAGE% is below threshold $THRESHOLD%"
            exit 1
          fi
```

---

## Security Scanning on Pull Requests

Catching security vulnerabilities before merge protects your production environment. The following workflow integrates multiple security scanners.

```mermaid
flowchart TD
    A[PR Created] --> B[Security Workflow]
    B --> C[Dependency Audit]
    B --> D[Secret Scanning]
    B --> E[SAST Analysis]
    B --> F[Container Scan]
    C --> G{Vulnerabilities Found?}
    D --> G
    E --> G
    F --> G
    G -->|Yes| H[Block PR + Alert]
    G -->|No| I[Security Approved]
```

Configure security scanning with the workflow below.

```yaml
# .github/workflows/pr-security.yml
# Security scanning workflow for pull requests
name: Security Scan

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  security-events: write

jobs:
  # Scan dependencies for known vulnerabilities
  dependency-audit:
    name: Dependency Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      # npm audit checks for known vulnerabilities in dependencies
      - name: Run npm audit
        run: npm audit --audit-level=moderate

  # Check for accidentally committed secrets
  secret-scan:
    name: Secret Detection
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # Use Gitleaks to scan for secrets in code
      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # Static Application Security Testing
  sast:
    name: SAST Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # CodeQL analysis for security vulnerabilities
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:javascript"

  # Scan Docker images if present
  container-scan:
    name: Container Security
    runs-on: ubuntu-latest
    # Only run if Dockerfile exists
    if: hashFiles('Dockerfile') != ''
    steps:
      - uses: actions/checkout@v4

      # Build the Docker image
      - name: Build Docker image
        run: docker build -t pr-image:${{ github.sha }} .

      # Scan with Trivy for vulnerabilities
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'pr-image:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      # Upload results to GitHub Security tab
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

---

## Automated PR Labeling

Labels help organize and prioritize pull requests. Automate labeling based on file changes.

```yaml
# .github/workflows/pr-labeler.yml
# Automatically add labels to PRs based on changed files
name: PR Labeler

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  labeler:
    name: Add Labels
    runs-on: ubuntu-latest
    steps:
      # Use the official labeler action
      - uses: actions/labeler@v5
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

Create a configuration file to define label rules based on file patterns.

```yaml
# .github/labeler.yml
# Label configuration - maps file patterns to labels

# Frontend changes
frontend:
  - changed-files:
      - any-glob-to-any-file:
          - 'src/components/**'
          - 'src/pages/**'
          - '**/*.css'
          - '**/*.scss'

# Backend changes
backend:
  - changed-files:
      - any-glob-to-any-file:
          - 'src/api/**'
          - 'src/services/**'
          - 'src/models/**'

# Documentation updates
documentation:
  - changed-files:
      - any-glob-to-any-file:
          - '**/*.md'
          - 'docs/**'

# Test changes
tests:
  - changed-files:
      - any-glob-to-any-file:
          - '**/*.test.ts'
          - '**/*.spec.ts'
          - '__tests__/**'

# CI/CD configuration changes
ci-cd:
  - changed-files:
      - any-glob-to-any-file:
          - '.github/workflows/**'
          - 'Dockerfile'
          - 'docker-compose.yml'

# Dependencies updates
dependencies:
  - changed-files:
      - any-glob-to-any-file:
          - 'package.json'
          - 'package-lock.json'
          - 'yarn.lock'
```

---

## PR Comment Automation

Post automated comments on PRs with build results, deployment previews, or helpful information.

```yaml
# .github/workflows/pr-comment.yml
# Post automated comments with useful information
name: PR Comments

on:
  pull_request:
    types: [opened]

permissions:
  pull-requests: write

jobs:
  welcome:
    name: Welcome Comment
    runs-on: ubuntu-latest
    steps:
      # Add a welcome comment for first-time contributors
      - name: Check if first contribution
        id: check
        uses: actions/github-script@v7
        with:
          script: |
            const creator = context.payload.pull_request.user.login;
            const { data: pullRequests } = await github.rest.pulls.list({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'all',
              creator: creator
            });
            // First PR if only one exists (the current one)
            return pullRequests.length === 1;

      - name: Post welcome message
        if: steps.check.outputs.result == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## Welcome! 🎉

              Thanks for your first contribution to this repository!

              Here's what happens next:
              1. Our CI pipeline will run automated checks
              2. A maintainer will review your changes
              3. You may receive feedback or requests for changes
              4. Once approved, your PR will be merged

              Need help? Feel free to ask questions in this PR.`
            });

  # Post build information after checks complete
  build-info:
    name: Build Information
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install and build
        run: |
          npm ci
          npm run build

      # Calculate and post bundle size
      - name: Calculate bundle size
        id: size
        run: |
          SIZE=$(du -sh dist/ | cut -f1)
          echo "size=$SIZE" >> $GITHUB_OUTPUT

      - name: Post bundle size comment
        uses: actions/github-script@v7
        with:
          script: |
            const size = '${{ steps.size.outputs.size }}';
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## Build Results

              | Metric | Value |
              |--------|-------|
              | Bundle Size | ${size} |
              | Build Status | Success |
              | Commit | \`${{ github.sha }}\` |`
            });
```

---

## Conditional Workflow Execution

Run specific jobs only when certain files change, saving CI minutes and providing faster feedback.

```yaml
# .github/workflows/pr-conditional.yml
# Run jobs conditionally based on changed files
name: Conditional Checks

on:
  pull_request:
    branches: [main]

jobs:
  # Detect which parts of the codebase changed
  changes:
    name: Detect Changes
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.filter.outputs.frontend }}
      backend: ${{ steps.filter.outputs.backend }}
      docs: ${{ steps.filter.outputs.docs }}
    steps:
      - uses: actions/checkout@v4

      # Use paths-filter to detect changes
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            frontend:
              - 'src/components/**'
              - 'src/pages/**'
              - 'package.json'
            backend:
              - 'src/api/**'
              - 'src/services/**'
              - 'prisma/**'
            docs:
              - '**/*.md'
              - 'docs/**'

  # Only run frontend tests if frontend files changed
  frontend-tests:
    name: Frontend Tests
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
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

      - name: Run frontend tests
        run: npm run test:frontend

      - name: Run component tests
        run: npm run test:components

  # Only run backend tests if backend files changed
  backend-tests:
    name: Backend Tests
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run backend tests
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
        run: npm run test:backend

  # Only check docs if documentation changed
  docs-check:
    name: Documentation Check
    needs: changes
    if: needs.changes.outputs.docs == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Check for broken links in markdown
      - name: Check markdown links
        uses: gaurav-nelson/github-action-markdown-link-check@v1
        with:
          use-quiet-mode: 'yes'

      # Lint markdown files
      - name: Lint markdown
        uses: DavidAnson/markdownlint-cli2-action@v16
```

---

## Required Status Checks

Configure branch protection to require workflow checks before merging.

```mermaid
flowchart TD
    A[PR Created] --> B[Workflows Run]
    B --> C{Required Checks}
    C --> D[Test Job]
    C --> E[Lint Job]
    C --> F[Build Job]
    D --> G{All Required Pass?}
    E --> G
    F --> G
    G -->|Yes| H[Merge Button Enabled]
    G -->|No| I[Merge Button Disabled]
    H --> J[Maintainer Reviews]
    J --> K[PR Merged]
```

Configure required checks in your repository settings (Settings > Branches > Branch protection rules):

1. Enable "Require status checks to pass before merging"
2. Select the specific checks that must pass
3. Enable "Require branches to be up to date before merging"

---

## Caching for Faster Builds

Reduce build times by caching dependencies and build artifacts.

```yaml
# .github/workflows/pr-cached.yml
# Optimized workflow with comprehensive caching
name: Cached PR Checks

on:
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test with Cache
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js with cache
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          # Built-in npm caching
          cache: 'npm'

      # Cache Cypress binary separately
      - name: Cache Cypress binary
        uses: actions/cache@v4
        with:
          path: ~/.cache/Cypress
          key: cypress-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            cypress-${{ runner.os }}-

      # Cache build output for subsequent jobs
      - name: Cache build output
        uses: actions/cache@v4
        with:
          path: |
            .next/cache
            dist/
          key: build-${{ runner.os }}-${{ hashFiles('src/**') }}
          restore-keys: |
            build-${{ runner.os }}-

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run tests
        run: npm test
```

---

## Handling PR Events

Different PR events require different responses. Handle synchronize events (new commits) differently from opened events.

```yaml
# .github/workflows/pr-events.yml
# Handle different PR events appropriately
name: PR Event Handler

on:
  pull_request:
    types:
      - opened
      - synchronize
      - reopened
      - ready_for_review
      - converted_to_draft

jobs:
  # Run full checks when PR is opened or updated
  full-checks:
    name: Full CI Checks
    if: |
      github.event.action == 'opened' ||
      github.event.action == 'synchronize' ||
      github.event.action == 'reopened'
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

      - name: Run all checks
        run: |
          npm run lint
          npm run test
          npm run build

  # Notify reviewers when PR is ready for review
  notify-ready:
    name: Notify Reviewers
    if: github.event.action == 'ready_for_review'
    runs-on: ubuntu-latest
    steps:
      - name: Request reviewers
        uses: actions/github-script@v7
        with:
          script: |
            // Get CODEOWNERS or default reviewers
            const reviewers = ['maintainer1', 'maintainer2'];

            await github.rest.pulls.requestReviewers({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
              reviewers: reviewers
            });

  # Skip expensive checks for draft PRs
  draft-checks:
    name: Draft PR Checks
    if: github.event.pull_request.draft == true
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

      # Only run linting for draft PRs (skip expensive tests)
      - name: Run lint only
        run: npm run lint
```

---

## Complete PR Workflow Example

Here is a comprehensive workflow combining all best practices.

```yaml
# .github/workflows/pr-complete.yml
# Complete PR workflow with all checks and optimizations
name: Complete PR Pipeline

on:
  pull_request:
    branches: [main, develop]
    types: [opened, synchronize, reopened, ready_for_review]

# Cancel in-progress runs for the same PR
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write
  security-events: write

env:
  NODE_VERSION: '20'

jobs:
  # Detect changed files for conditional execution
  changes:
    name: Detect Changes
    runs-on: ubuntu-latest
    outputs:
      src: ${{ steps.filter.outputs.src }}
      tests: ${{ steps.filter.outputs.tests }}
      deps: ${{ steps.filter.outputs.deps }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            src:
              - 'src/**'
            tests:
              - '**/*.test.ts'
              - '**/*.spec.ts'
            deps:
              - 'package.json'
              - 'package-lock.json'

  # Code quality checks
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check formatting
        run: npm run format:check

      - name: Check types
        run: npm run typecheck

  # Unit tests with coverage
  test:
    name: Unit Tests
    needs: changes
    if: needs.changes.outputs.src == 'true' || needs.changes.outputs.tests == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  # Build verification
  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/
          retention-days: 7

  # Security scanning
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --audit-level=high

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3

  # Final status check that requires all jobs
  pr-status:
    name: PR Status
    needs: [quality, test, build, security]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Check job results
        run: |
          if [[ "${{ needs.quality.result }}" != "success" ]] ||
             [[ "${{ needs.build.result }}" != "success" ]] ||
             [[ "${{ needs.security.result }}" != "success" ]]; then
            echo "Required checks failed"
            exit 1
          fi

          # Test job might be skipped if no changes
          if [[ "${{ needs.test.result }}" == "failure" ]]; then
            echo "Tests failed"
            exit 1
          fi

          echo "All required checks passed"
```

---

## Troubleshooting Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Workflow not triggered | PR targets wrong branch | Check `branches` filter in workflow |
| Checks stuck pending | Missing permissions | Add required permissions block |
| Cache not working | Key mismatch | Verify cache key includes dependency lockfile hash |
| Parallel jobs slow | Resource contention | Use smaller runners or split tests |
| Tests flaky | Race conditions | Add retry logic or fix test isolation |

---

## Best Practices Summary

- **Use concurrency controls** to cancel outdated runs when new commits arrive
- **Run jobs in parallel** when they have no dependencies on each other
- **Cache dependencies** to speed up builds
- **Use conditional execution** to skip unnecessary checks
- **Set up branch protection** to require status checks
- **Add security scanning** to catch vulnerabilities early
- **Post informative comments** to help contributors understand results

---

## Conclusion

GitHub Actions transforms pull requests from simple code review requests into comprehensive quality gates. By configuring automated testing, linting, security scanning, and build verification, teams catch issues before they reach production.

Start with basic checks and gradually add more sophisticated workflows as your needs grow. The investment in CI automation pays off through faster reviews, fewer bugs in production, and more confident deployments.

---

*Want to monitor your CI/CD pipelines and get alerted when builds fail? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your development infrastructure, helping you maintain high availability and fast feedback loops.*

**Related Reading:**
- [How to Implement Infrastructure as Code Best Practices](https://oneuptime.com/blog/post/2026-02-02-infrastructure-as-code-best-practices/view)
