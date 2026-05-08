# How to Wait for a Container to Finish in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Lifecycle, Container Management

Description: Learn how to use podman wait to block until containers exit and capture their exit codes for use in scripts and CI/CD pipelines.

---

> The podman wait command blocks until a container exits, making it essential for scripting sequential workflows and capturing exit codes.

In automation and scripting, you often need to wait for a container to finish before proceeding to the next step. The `podman wait` command blocks until one or more containers stop, then returns their exit codes. This guide shows you how to use it effectively.

---

## Basic Usage

```bash
# Run a container in the background

podman run -d --name my-task docker.io/library/alpine:latest \
  sh -c 'echo "Working..."; sleep 5; echo "Done"'

# Wait for it to finish
EXIT_CODE=$(podman wait my-task)
echo "Container finished with exit code: $EXIT_CODE"
```

## Capturing the Exit Code

`podman wait` prints the container's exit code to stdout.

```bash
# Run a container that exits with code 0 (success)
podman run -d --name success-task docker.io/library/alpine:latest \
  sh -c 'exit 0'

EXIT_CODE=$(podman wait success-task)
echo "Exit code: $EXIT_CODE"

# Run a container that exits with code 1 (failure)
podman run -d --name fail-task docker.io/library/alpine:latest \
  sh -c 'exit 1'

EXIT_CODE=$(podman wait fail-task)
echo "Exit code: $EXIT_CODE"

# Clean up
podman rm success-task fail-task
```

## Waiting for Multiple Containers

Wait for several containers with one command. Podman waits on the listed containers consecutively and prints one exit code per line in the same order.

```bash
# Start multiple background tasks
podman run -d --name task-1 docker.io/library/alpine:latest sleep 3
podman run -d --name task-2 docker.io/library/alpine:latest sleep 5
podman run -d --name task-3 docker.io/library/alpine:latest sleep 7

# Wait for all of them
echo "Waiting for all tasks..."
podman wait task-1 task-2 task-3
echo "All tasks completed"

# Clean up
podman rm task-1 task-2 task-3
```

## Waiting with a Specific Condition

Podman wait supports the `--condition` flag to wait for specific container states.

```bash
# Wait for a container to stop (default behavior)
podman run -d --name my-task docker.io/library/alpine:latest sleep 5
podman wait --condition stopped my-task

# Wait for a container to enter the removing state
podman run -d --name removable docker.io/library/alpine:latest sleep 3
# In another terminal or script: podman rm removable
podman wait --condition removing removable &
sleep 5
podman rm removable
wait
```

Available conditions include:
- `configured` - Wait until the container is configured
- `created` - Wait until the container is created
- `stopped` - Wait until the container has stopped (default)
- `removing` - Wait until the container is being removed
- `exited` - Wait until the container has exited
- `initialized` - Wait until the container is initialized
- `paused` - Wait until the container is paused
- `running` - Wait until the container is running
- `stopping` - Wait until the container is stopping
- `healthy` - Wait until the container is healthy
- `unhealthy` - Wait until the container is unhealthy

For conditions other than `stopped` and `exited`, `podman wait` prints `-1` instead of the container process exit code.

## Using Wait in CI/CD Pipelines

```bash
#!/bin/bash
# ci-test.sh - Run tests and wait for results

IMAGE="docker.io/library/node:20-alpine"

echo "Starting test suite..."
podman run -d --name unit-tests \
  -v ./:/app:z -w /app \
  "$IMAGE" sh -c 'npm test 2>&1'

# Wait for tests to complete
EXIT_CODE=$(podman wait unit-tests)

# Collect output
echo "Test output:"
podman logs unit-tests

# Clean up
podman rm unit-tests

# Exit with the test exit code
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "Tests passed"
else
  echo "Tests failed with exit code $EXIT_CODE"
fi
exit "$EXIT_CODE"
```

## Sequential Task Execution

```bash
#!/bin/bash
# pipeline.sh - Run containers in sequence

# Step 1: Build
echo "Step 1: Building..."
podman run -d --name build-step \
  -v ./:/app:z -w /app \
  docker.io/library/alpine:latest \
  sh -c 'echo "Building project..."; sleep 3; echo "Build complete"'

BUILD_EXIT=$(podman wait build-step)
podman logs build-step

if [ "$BUILD_EXIT" -ne 0 ]; then
  echo "Build failed"
  podman rm build-step
  exit 1
fi

# Step 2: Test (only runs if build succeeded)
echo "Step 2: Testing..."
podman run -d --name test-step \
  -v ./:/app:z -w /app \
  docker.io/library/alpine:latest \
  sh -c 'echo "Running tests..."; sleep 2; echo "Tests passed"'

TEST_EXIT=$(podman wait test-step)
podman logs test-step

# Clean up
podman rm build-step test-step

if [ "$TEST_EXIT" -ne 0 ]; then
  echo "Tests failed"
  exit 1
fi

echo "Pipeline complete"
```

## Parallel Tasks with Individual Wait

```bash
#!/bin/bash
# parallel-tasks.sh - Run tasks in parallel, collect results

# Start parallel tasks
podman run -d --name lint docker.io/library/alpine:latest sh -c 'sleep 2; exit 0'
podman run -d --name test docker.io/library/alpine:latest sh -c 'sleep 4; exit 0'
podman run -d --name build docker.io/library/alpine:latest sh -c 'sleep 3; exit 0'

# Wait for each and collect exit codes
LINT_EXIT=$(podman wait lint)
echo "Lint: exit $LINT_EXIT"

TEST_EXIT=$(podman wait test)
echo "Test: exit $TEST_EXIT"

BUILD_EXIT=$(podman wait build)
echo "Build: exit $BUILD_EXIT"

# Clean up
podman rm lint test build

# Check if any failed
if [ "$LINT_EXIT" -ne 0 ] || [ "$TEST_EXIT" -ne 0 ] || [ "$BUILD_EXIT" -ne 0 ]; then
  echo "One or more tasks failed"
  exit 1
fi

echo "All tasks passed"
```

## Timeout Pattern with Wait

Podman wait does not have a built-in timeout, but you can implement one.

```bash
#!/bin/bash
# wait-with-timeout.sh

CONTAINER="long-task"
TIMEOUT=30

podman run -d --name "$CONTAINER" docker.io/library/alpine:latest sleep 60

# Wait with timeout using background process
podman wait "$CONTAINER" &
WAIT_PID=$!

# Set up timeout
sleep "$TIMEOUT" && kill $WAIT_PID 2>/dev/null && echo "Timeout reached" &
TIMEOUT_PID=$!

# Wait for whichever finishes first
wait $WAIT_PID 2>/dev/null
kill $TIMEOUT_PID 2>/dev/null

# Clean up
podman rm -f "$CONTAINER"
```

## Summary

The `podman wait` command is essential for scripting container workflows. It blocks until containers exit and returns their exit codes, enabling sequential pipelines, parallel task collection, and CI/CD integration. Use it to coordinate multi-container workflows and make decisions based on container exit statuses.
