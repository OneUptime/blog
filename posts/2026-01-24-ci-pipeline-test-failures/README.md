# How to Fix "CI Pipeline" Test Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, Testing, DevOps, GitHub Actions, GitLab CI, Jenkins, Debugging, Continuous Integration

Description: A practical guide to diagnosing and fixing test failures that occur in CI pipelines but pass locally, with solutions for common issues.

---

Few things are more frustrating than tests that pass on your machine but fail in CI. You have verified everything works locally, pushed your changes, and then watched the pipeline turn red. This guide covers the most common causes of CI-specific test failures and provides systematic approaches to fix them.

## The "Works on My Machine" Problem

```mermaid
flowchart TD
    A[Tests Pass Locally] --> B[Push to CI]
    B --> C{CI Result}
    C -->|Pass| D[Deploy]
    C -->|Fail| E{Why Different?}

    E --> F[Environment Differences]
    E --> G[Timing Issues]
    E --> H[Resource Constraints]
    E --> I[Missing Dependencies]
    E --> J[File System Differences]

    F --> K[Fix Environment]
    G --> L[Fix Race Conditions]
    H --> M[Optimize Resources]
    I --> N[Add Dependencies]
    J --> O[Fix Paths/Permissions]
```

## Issue 1: Environment Differences

The most common cause of CI failures is environment mismatch between your local machine and the CI runner.

### Diagnosing Environment Issues

Add diagnostic output to your CI pipeline to understand the environment.

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Environment diagnostics
        run: |
          echo "=== System Info ==="
          uname -a

          echo "=== Environment Variables ==="
          env | sort

          echo "=== Disk Space ==="
          df -h

          echo "=== Memory ==="
          free -m

          echo "=== Current Directory ==="
          pwd
          ls -la

          echo "=== Node Version ==="
          node --version || echo "Node not installed"

          echo "=== Python Version ==="
          python3 --version || echo "Python not installed"

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
```

### Fixing Node.js Version Mismatches

Lock your Node.js version to match your development environment.

```json
// package.json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

```yaml
# .nvmrc
20.11.0
```

```yaml
# CI configuration
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version-file: '.nvmrc'
```

### Fixing Python Version Issues

Use pyenv or explicit version pinning.

```yaml
# .python-version
3.11.7
```

```yaml
# CI workflow
- name: Set up Python
  uses: actions/setup-python@v5
  with:
    python-version-file: '.python-version'
```

## Issue 2: Timing and Race Conditions

Tests that depend on timing often fail in CI where resources are shared and performance varies.

### Identifying Timing Issues

Look for tests that use:
- `setTimeout` or `sleep` with fixed durations
- Date/time comparisons
- Parallel operations without proper synchronization

```javascript
// BAD: Fixed timeout that might be too short in CI
test('data loads within timeout', async () => {
  const start = Date.now();
  await loadData();
  const duration = Date.now() - start;

  // This 100ms limit might work locally but fail in slow CI
  expect(duration).toBeLessThan(100);
});

// GOOD: Use relative timing or remove timing assertions
test('data loads successfully', async () => {
  const data = await loadData();
  expect(data).toBeDefined();
  expect(data.items.length).toBeGreaterThan(0);
});
```

### Fixing Async Race Conditions

```javascript
// BAD: Race condition between parallel operations
test('processes items in order', async () => {
  const results = [];

  // These might complete in any order
  items.forEach(async (item) => {
    const result = await processItem(item);
    results.push(result);
  });

  // This assertion runs before the loop completes
  expect(results).toHaveLength(items.length);
});

// GOOD: Properly await parallel operations
test('processes items in order', async () => {
  const results = await Promise.all(
    items.map(item => processItem(item))
  );

  expect(results).toHaveLength(items.length);
});
```

### Using Retry Logic for Flaky External Dependencies

```javascript
// test-utils.js
async function retryAsync(fn, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  throw lastError;
}

// Usage in tests
test('connects to external service', async () => {
  const connection = await retryAsync(async () => {
    return await connectToService();
  });

  expect(connection.isConnected).toBe(true);
});
```

## Issue 3: File System Differences

File paths and permissions work differently across operating systems and CI environments.

### Path Separator Issues

```javascript
// BAD: Hardcoded path separators
const configPath = './config/settings.json';
const outputPath = 'dist\\bundle.js';

// GOOD: Use path module for cross-platform compatibility
const path = require('path');

const configPath = path.join('.', 'config', 'settings.json');
const outputPath = path.join('dist', 'bundle.js');
```

### Case Sensitivity

Linux (most CI runners) has case-sensitive file systems, while macOS and Windows do not by default.

```javascript
// This works on macOS but fails on Linux
import { MyComponent } from './components/mycomponent'; // File is MyComponent.js

// Fix: Match exact case
import { MyComponent } from './components/MyComponent';
```

Add a lint rule to catch this:

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'import/no-unresolved': 'error'
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        caseSensitive: true
      }
    }
  }
};
```

### Temporary File Handling

```python
# BAD: Assumes /tmp exists and is writable
def test_file_processing():
    with open('/tmp/test-file.txt', 'w') as f:
        f.write('test data')

    result = process_file('/tmp/test-file.txt')
    assert result == 'processed'

# GOOD: Use tempfile module
import tempfile
import os

def test_file_processing():
    # Creates a temp file in the appropriate location for the OS
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write('test data')
        temp_path = f.name

    try:
        result = process_file(temp_path)
        assert result == 'processed'
    finally:
        # Clean up
        os.unlink(temp_path)
```

## Issue 4: Resource Constraints

CI runners often have limited memory and CPU compared to development machines.

### Memory Issues

```yaml
# GitHub Actions - use larger runners for memory-intensive tests
jobs:
  test:
    runs-on: ubuntu-latest-4-cores  # 16GB RAM instead of 7GB
```

```javascript
// Jest configuration for memory-constrained environments
// jest.config.js
module.exports = {
  // Run tests sequentially to reduce memory usage
  maxWorkers: 1,

  // Limit concurrent test files
  maxConcurrency: 1,

  // Clear mocks between tests to free memory
  clearMocks: true,

  // Force garbage collection between test files
  workerIdleMemoryLimit: '512MB'
};
```

### Database Connection Limits

```python
# conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

@pytest.fixture(scope='session')
def db_engine():
    """Create engine with connection pooling appropriate for CI."""

    # Detect CI environment
    is_ci = os.environ.get('CI', 'false').lower() == 'true'

    # Use smaller pool in CI to avoid connection limits
    pool_size = 2 if is_ci else 5
    max_overflow = 3 if is_ci else 10

    engine = create_engine(
        os.environ['DATABASE_URL'],
        poolclass=QueuePool,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_timeout=30,
        pool_recycle=1800
    )

    yield engine

    engine.dispose()
```

## Issue 5: Missing Dependencies

Dependencies that exist on your machine might not be available in CI.

### System Dependencies

```yaml
# GitHub Actions
- name: Install system dependencies
  run: |
    sudo apt-get update
    sudo apt-get install -y \
      build-essential \
      libpq-dev \
      libffi-dev \
      graphviz \
      poppler-utils
```

### Browser Dependencies for E2E Tests

```yaml
# Playwright setup
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

# Or use the official action
- name: Install Playwright
  uses: microsoft/playwright-github-action@v1
```

### Caching Dependencies

Speed up CI by caching dependencies.

```yaml
# Node.js caching
- name: Cache node modules
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

# Python caching
- name: Cache pip packages
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-
```

## Issue 6: Service Dependencies

Tests that require databases, Redis, or other services need them running in CI.

### Docker Services in GitHub Actions

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
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

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
```

### Waiting for Services

```bash
#!/bin/bash
# wait-for-services.sh

# Wait for PostgreSQL
until pg_isready -h localhost -p 5432 -U test; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

# Wait for Redis
until redis-cli -h localhost -p 6379 ping; do
  echo "Waiting for Redis..."
  sleep 2
done

echo "All services are ready!"
```

## Debugging CI Failures

### Enable Debug Logging

```yaml
# GitHub Actions
- name: Run tests with debug output
  run: npm test -- --verbose
  env:
    DEBUG: '*'
    CI: true
```

### SSH into Failed CI Runner

For complex issues, you can SSH into the runner to investigate.

```yaml
# Add this step to debug failures
- name: Setup tmate session
  if: failure()
  uses: mxschmitt/action-tmate@v3
  timeout-minutes: 15
```

### Artifact Collection

Save logs and screenshots from failed runs.

```yaml
- name: Upload test artifacts
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: |
      test-results/
      screenshots/
      logs/
    retention-days: 7
```

## CI Test Failure Checklist

When debugging CI failures, check the following:

- Environment variables are set correctly in CI
- Correct language/runtime versions are specified
- All system dependencies are installed
- Services (database, Redis) are running and healthy
- File paths use cross-platform compatible formats
- No hardcoded timeouts that are too short for CI
- Tests do not rely on execution order
- Sufficient memory and CPU for the test suite
- Network access is available for external dependencies
- Caching is working and not serving stale dependencies

By systematically checking these areas, you can identify and fix most CI-specific test failures. The key is making your tests environment-agnostic and explicit about their dependencies.
