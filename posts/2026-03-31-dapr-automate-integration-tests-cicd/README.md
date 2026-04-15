# How to Automate Dapr Integration Tests in CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, CI/CD, GitHub Action, Automation

Description: Automate Dapr integration tests in CI/CD pipelines using GitHub Actions with Docker-based test environments, parallel test execution, and artifact reporting.

---

Running Dapr integration tests manually is fine during development, but automating them in CI/CD ensures that every pull request is validated against real Dapr sidecars and backends. This post covers setting up a GitHub Actions workflow that runs Dapr integration tests reliably.

## Pipeline Structure

A well-structured Dapr integration test pipeline:
1. Builds application images
2. Starts Dapr sidecar and dependency containers
3. Waits for services to be healthy
4. Runs integration tests
5. Collects test results and logs
6. Tears down containers

## GitHub Actions Workflow

```yaml
# .github/workflows/integration-tests.yml
name: Dapr Integration Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 3s
          --health-timeout 3s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build application image
        run: docker build -t my-app:ci .

      - name: Start Dapr sidecar
        run: |
          docker run -d \
            --name daprd \
            --network host \
            -v ${{ github.workspace }}/tests/components:/components \
            daprio/daprd:1.14.0 \
            ./daprd \
            --app-id ci-test-app \
            --dapr-http-port 3500 \
            --components-path /components \
            --log-level error

      - name: Start application
        run: |
          docker run -d \
            --name test-app \
            --network host \
            -e DAPR_HTTP_PORT=3500 \
            my-app:ci

      - name: Wait for Dapr to be ready
        run: |
          for i in $(seq 1 30); do
            if curl -s -o /dev/null -w "%{http_code}" http://localhost:3500/v1.0/healthz | grep -q "204"; then
              echo "Dapr ready"
              exit 0
            fi
            sleep 2
          done
          echo "Dapr failed to start"
          docker logs daprd
          exit 1

      - name: Run integration tests
        run: go test ./tests/integration/... -v -timeout 120s -json > test-results.json

      - name: Parse test results
        if: always()
        run: |
          cat test-results.json | jq -r 'select(.Action=="fail") | .Test' | head -20

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: test-results.json

      - name: Collect container logs on failure
        if: failure()
        run: |
          docker logs daprd > dapr-logs.txt 2>&1
          docker logs test-app > app-logs.txt 2>&1

      - name: Upload failure logs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: failure-logs
          path: "*.txt"
```

## Parallel Test Execution

For large test suites, split tests across parallel jobs:

```yaml
strategy:
  matrix:
    test-suite: [state, pubsub, actors, bindings]

steps:
  - name: Run ${{ matrix.test-suite }} tests
    run: go test ./tests/integration/${{ matrix.test-suite }}/... -v -timeout 120s
```

## Caching Dapr Images

Speed up the pipeline by caching the Dapr Docker image between runs:

```yaml
- name: Cache Dapr image
  uses: actions/cache@v4
  with:
    path: /tmp/dapr-image
    key: dapr-image-1.14.0

- name: Load or pull Dapr image
  run: |
    if [ -f /tmp/dapr-image/daprd.tar ]; then
      docker load -i /tmp/dapr-image/daprd.tar
    else
      docker pull daprio/daprd:1.14.0
      mkdir -p /tmp/dapr-image
      docker save daprio/daprd:1.14.0 -o /tmp/dapr-image/daprd.tar
    fi
```

## Reporting Test Results

Use a test reporting action for better visibility:

```yaml
- name: Publish test results
  uses: dorny/test-reporter@v1
  if: always()
  with:
    name: Integration Tests
    path: test-results.json
    reporter: golang-json
```

## Summary

Automating Dapr integration tests in GitHub Actions requires careful orchestration of sidecar startup, health checks, and test execution. Collecting logs on failure and uploading test results as artifacts makes it easy to diagnose flaky tests and build failures without re-running the pipeline manually.
