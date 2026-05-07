# How to Run Tests in Podman Containers in CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, CI/CD, Testing, Automation

Description: Learn how to run unit tests, integration tests, and test suites inside Podman containers as part of your CI/CD pipeline.

---

> Running tests inside Podman containers ensures consistent, reproducible test environments across every CI run without depending on the host machine configuration.

Running tests inside containers guarantees that your test environment is identical every time, regardless of the CI host. Podman makes this easy with its Docker-compatible CLI and daemonless design. This guide covers patterns for running various types of tests inside Podman containers in CI, from simple unit tests to complex multi-service test setups.

---

## Running Unit Tests in a Container

The simplest pattern is to build your image and run tests inside it.

```bash
#!/bin/bash
# Run unit tests inside a Podman container

# The test command is defined in the Containerfile or passed as an argument

# Build the test image
podman build -t myapp:test .

# Run unit tests and capture the exit code
podman run --rm \
  --name unit-tests \
  myapp:test npm test
TEST_EXIT_CODE=$?

# The exit code from the container propagates to the CI system
# A non-zero exit code will fail the CI job
echo "Tests completed with exit code: $TEST_EXIT_CODE"
exit $TEST_EXIT_CODE
```

## Using a Dedicated Test Stage in the Containerfile

Create a multi-stage Containerfile with a dedicated test stage.

```dockerfile
# Containerfile with a dedicated test stage
# Stage 1: Build the application
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Test stage (includes dev dependencies)
FROM build AS test
# Install test dependencies
RUN npm ci --include=dev
# Default command runs the test suite
CMD ["npm", "test"]

# Stage 3: Production image (slim, no test deps)
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
CMD ["node", "dist/index.js"]
```

```bash
#!/bin/bash
# Build and run only the test stage
podman build --target test -t myapp:test .

# Run the unit tests
podman run --rm myapp:test

# If tests pass, build the production image
podman build --target production -t myapp:prod .
```

## Collecting Test Results and Coverage Reports

Extract test reports from containers for CI reporting.

```bash
#!/bin/bash
# Run tests and extract coverage and result files from the container

# Build the test image
podman build --target test -t myapp:test .

# Create a container (but do not start it) to run tests
podman create --name test-runner myapp:test npm run test:coverage

# Start the container and wait for it to finish
podman start -a test-runner
TEST_EXIT_CODE=$?

# Copy test results out of the container
mkdir -p ./test-results ./coverage

# Extract JUnit XML test results
podman cp test-runner:/app/test-results/junit.xml ./test-results/

# Extract code coverage report
podman cp test-runner:/app/coverage/ ./coverage/

# Clean up the container
podman rm test-runner

# Report the results
echo "Test results saved to ./test-results/"
echo "Coverage report saved to ./coverage/"

# Exit with the test exit code so CI reports correctly
exit $TEST_EXIT_CODE
```

## Running Tests with Environment Variables

Pass configuration and secrets to the test container via environment variables.

```bash
#!/bin/bash
# Run tests with environment-specific configuration
# Secrets are injected from CI environment variables

podman run --rm \
  --name integration-tests \
  -e NODE_ENV=test \
  -e DATABASE_URL="${TEST_DATABASE_URL}" \
  -e API_KEY="${TEST_API_KEY}" \
  -e LOG_LEVEL=debug \
  -e CI=true \
  myapp:test npm run test:integration

# Alternative: use an env file for many variables
cat > /tmp/test.env << 'EOF'
NODE_ENV=test
LOG_LEVEL=debug
CI=true
TIMEOUT=30000
EOF

podman run --rm \
  --env-file /tmp/test.env \
  -e DATABASE_URL="${TEST_DATABASE_URL}" \
  myapp:test npm run test:integration

# Clean up the env file
rm -f /tmp/test.env
```

## Running Tests with Mounted Volumes

Mount source code into containers for rapid iteration during testing.

```bash
#!/bin/bash
# Mount source code for test runs without rebuilding the image
# Useful for linting or static analysis where the image has the tools

# Run linting against mounted source code
podman run --rm \
  -v "$(pwd)/src:/app/src:ro,Z" \
  -v "$(pwd)/.eslintrc.js:/app/.eslintrc.js:ro,Z" \
  myapp:test npm run lint

# Run type checking against mounted source
podman run --rm \
  -v "$(pwd)/src:/app/src:ro,Z" \
  -v "$(pwd)/tsconfig.json:/app/tsconfig.json:ro,Z" \
  myapp:test npx tsc --noEmit
```

## Parallel Test Execution

Run multiple test suites in parallel using Podman containers.

```bash
#!/bin/bash
# Run multiple test suites in parallel using background processes

# Build the test image once
podman build --target test -t myapp:test .

# Start each test suite in the background
podman run --rm --name unit-tests myapp:test npm run test:unit &
PID_UNIT=$!

podman run --rm --name lint-check myapp:test npm run lint &
PID_LINT=$!

podman run --rm --name type-check myapp:test npx tsc --noEmit &
PID_TYPE=$!

# Wait for all test suites and collect exit codes
FAILED=0

wait $PID_UNIT
STATUS_UNIT=$?
echo "Unit tests: $([ $STATUS_UNIT -eq 0 ] && echo PASSED || echo FAILED)"
[ $STATUS_UNIT -eq 0 ] || FAILED=1

wait $PID_LINT
STATUS_LINT=$?
echo "Lint check: $([ $STATUS_LINT -eq 0 ] && echo PASSED || echo FAILED)"
[ $STATUS_LINT -eq 0 ] || FAILED=1

wait $PID_TYPE
STATUS_TYPE=$?
echo "Type check: $([ $STATUS_TYPE -eq 0 ] && echo PASSED || echo FAILED)"
[ $STATUS_TYPE -eq 0 ] || FAILED=1

# Exit with failure if any suite failed
exit $FAILED
```

## Summary

Running tests inside Podman containers in CI provides consistent, reproducible test environments that eliminate the "works on my machine" problem. You can use multi-stage Containerfiles to separate test and production images, extract test results and coverage reports for CI dashboards, inject configuration through environment variables, and run multiple test suites in parallel. The daemonless nature of Podman means tests start faster with less overhead, and rootless execution adds security to your CI environment.
