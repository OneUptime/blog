# How to Wait for a Docker Container to Exit and Get Its Exit Code

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, Exit Code, Docker Wait, Scripting, DevOps, CI/CD

Description: Learn how to wait for Docker containers to finish executing and capture their exit codes for use in scripts, CI pipelines, and automation.

---

Docker containers run processes that eventually exit. When you orchestrate containers in scripts, CI pipelines, or automation workflows, you need to know when a container finishes and whether it succeeded or failed. The exit code tells you that. A zero means success. Anything else means something went wrong.

This guide covers every practical way to wait for containers and capture their exit codes.

## Using docker wait

The `docker wait` command blocks until a container stops, then prints its exit code.

```bash
# Start a container in the background
docker run -d --name my-task ubuntu:22.04 bash -c "sleep 5 && echo 'Done' && exit 0"

# Wait for it to finish and get the exit code
EXIT_CODE=$(docker wait my-task)
echo "Container exited with code: $EXIT_CODE"
```

The command blocks your terminal (or script) until the container exits. Then it prints the numeric exit code.

## Common Exit Codes

Exit codes follow Unix conventions:

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success |
| 1 | General application error |
| 2 | Misuse of shell command |
| 126 | Command not executable |
| 127 | Command not found |
| 137 | Killed by SIGKILL (OOM or docker kill) |
| 139 | Segmentation fault |
| 143 | Killed by SIGTERM (docker stop) |

## Using docker wait in Scripts

Build scripts that react to container exit codes.

```bash
#!/bin/bash
# run-task.sh - Run a container task and handle the result
# Usage: ./run-task.sh

echo "Starting data processing task..."
docker run -d --name data-processor myapp-processor:latest

# Wait for completion
EXIT_CODE=$(docker wait data-processor)

# Collect logs regardless of exit code
docker logs data-processor > task-output.log 2>&1

# React based on exit code
if [ "$EXIT_CODE" -eq 0 ]; then
    echo "Task completed successfully"
    # Trigger the next step in your pipeline
elif [ "$EXIT_CODE" -eq 137 ]; then
    echo "Task was killed (possibly OOM). Check memory limits."
else
    echo "Task failed with exit code $EXIT_CODE"
    echo "Check task-output.log for details"
fi

# Cleanup
docker rm data-processor
```

## Waiting for Multiple Containers

`docker wait` accepts multiple container names or IDs.

```bash
# Start multiple tasks
docker run -d --name task-1 myapp:latest process --chunk=1
docker run -d --name task-2 myapp:latest process --chunk=2
docker run -d --name task-3 myapp:latest process --chunk=3

# Wait for all of them (outputs exit codes in order)
docker wait task-1 task-2 task-3
```

The output is one exit code per line:

```
0
0
1
```

To capture and process all exit codes:

```bash
#!/bin/bash
# parallel-tasks.sh - Run parallel tasks and check all exit codes

TASKS=("task-1" "task-2" "task-3")

# Start all tasks
for task in "${TASKS[@]}"; do
    docker run -d --name "$task" myapp:latest process --chunk="${task##*-}"
done

# Wait for all tasks and collect exit codes
ALL_PASSED=true
for task in "${TASKS[@]}"; do
    EXIT_CODE=$(docker wait "$task")
    if [ "$EXIT_CODE" -ne 0 ]; then
        echo "FAILED: $task exited with code $EXIT_CODE"
        docker logs "$task"
        ALL_PASSED=false
    else
        echo "PASSED: $task"
    fi
done

# Cleanup
for task in "${TASKS[@]}"; do
    docker rm "$task"
done

if [ "$ALL_PASSED" = true ]; then
    echo "All tasks completed successfully"
    exit 0
else
    echo "Some tasks failed"
    exit 1
fi
```

## Using docker inspect for Exit Codes

If the container has already stopped, use `docker inspect` to retrieve its exit code without waiting.

```bash
# Get the exit code of a stopped container
docker inspect --format '{{.State.ExitCode}}' my-container

# Get more details about the container's final state
docker inspect --format 'Status: {{.State.Status}}, ExitCode: {{.State.ExitCode}}, Error: {{.State.Error}}' my-container
```

You can also check if a container finished and why:

```bash
# Get the full state information
docker inspect --format '{{json .State}}' my-container | jq .
```

This returns detailed state information:

```json
{
  "Status": "exited",
  "Running": false,
  "Paused": false,
  "Restarting": false,
  "OOMKilled": false,
  "Dead": false,
  "Pid": 0,
  "ExitCode": 0,
  "Error": "",
  "StartedAt": "2026-02-08T14:30:00.000000000Z",
  "FinishedAt": "2026-02-08T14:30:05.000000000Z"
}
```

The `OOMKilled` field is particularly useful. When true, it means the container exceeded its memory limit.

## Waiting with a Timeout

`docker wait` blocks indefinitely. If you need a timeout, wrap it in a background process.

```bash
#!/bin/bash
# wait-with-timeout.sh - Wait for a container with a timeout
# Usage: ./wait-with-timeout.sh container-name timeout-seconds

CONTAINER=$1
TIMEOUT=$2

# Run docker wait in the background
docker wait "$CONTAINER" &
WAIT_PID=$!

# Start a timer
sleep "$TIMEOUT" &
SLEEP_PID=$!

# Wait for whichever finishes first
wait -n $WAIT_PID $SLEEP_PID 2>/dev/null
FINISHED=$?

# Check if the container finished or the timeout triggered
if kill -0 $WAIT_PID 2>/dev/null; then
    # docker wait is still running, meaning the timeout hit first
    echo "Timeout after ${TIMEOUT} seconds. Container still running."
    kill $WAIT_PID 2>/dev/null
    docker stop "$CONTAINER"
    EXIT_CODE=124  # Convention for timeout
else
    # Container finished before timeout
    kill $SLEEP_PID 2>/dev/null
    EXIT_CODE=$(docker inspect --format '{{.State.ExitCode}}' "$CONTAINER")
    echo "Container exited with code $EXIT_CODE"
fi

wait 2>/dev/null
exit $EXIT_CODE
```

Usage:

```bash
# Wait up to 60 seconds for the container to finish
./wait-with-timeout.sh my-task 60
```

## CI/CD Pipeline Integration

In CI pipelines, exit codes determine whether a step passes or fails.

```bash
#!/bin/bash
# ci-test.sh - Run tests in a container and propagate the exit code

# Build the test image
docker build -t myapp-test -f Dockerfile.test .

# Run tests
docker run --name test-run myapp-test npm test

# The exit code from docker run matches the container's exit code
TEST_EXIT=$?

# Collect test results
docker cp test-run:/app/test-results ./test-results

# Cleanup
docker rm test-run

# Exit with the same code so CI knows the result
exit $TEST_EXIT
```

Note that `docker run` (without `-d`) already returns the container's exit code. You only need `docker wait` when using detached mode.

```bash
# docker run in foreground mode returns the container's exit code directly
docker run myapp:latest ./run-tests.sh
echo "Exit code: $?"
```

## Polling Approach

As an alternative to `docker wait`, poll the container status.

```bash
#!/bin/bash
# poll-container.sh - Poll a container's status until it finishes
# Usage: ./poll-container.sh container-name poll-interval-seconds

CONTAINER=$1
INTERVAL=${2:-5}

echo "Waiting for $CONTAINER to finish (polling every ${INTERVAL}s)..."

while true; do
    STATUS=$(docker inspect --format '{{.State.Status}}' "$CONTAINER" 2>/dev/null)

    case "$STATUS" in
        running)
            echo "  Still running..."
            sleep "$INTERVAL"
            ;;
        exited|dead)
            EXIT_CODE=$(docker inspect --format '{{.State.ExitCode}}' "$CONTAINER")
            echo "Container finished with exit code $EXIT_CODE"
            exit "$EXIT_CODE"
            ;;
        "")
            echo "Container not found"
            exit 1
            ;;
        *)
            echo "Container status: $STATUS"
            sleep "$INTERVAL"
            ;;
    esac
done
```

The polling approach lets you add progress reporting, health checks, or other logic between status checks.

## Docker Compose Exit Codes

When using Docker Compose, the `--exit-code-from` flag lets you wait for a specific service and use its exit code.

```yaml
# docker-compose.test.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: test
    healthcheck:
      test: ["CMD", "pg_isready"]
      interval: 5s
      timeout: 5s
      retries: 5

  test:
    image: myapp-test:latest
    depends_on:
      db:
        condition: service_healthy
    command: npm test
```

```bash
# Run the test suite and exit with the test container's exit code
docker compose -f docker-compose.test.yml up --exit-code-from test --abort-on-container-exit
EXIT_CODE=$?

# Cleanup
docker compose -f docker-compose.test.yml down

echo "Tests exited with code: $EXIT_CODE"
exit $EXIT_CODE
```

The `--abort-on-container-exit` flag stops all services when any container exits. Combined with `--exit-code-from`, it creates a clean test workflow.

## Handling OOM Kills

When a container exceeds its memory limit, Docker kills it with exit code 137. Detect this specifically.

```bash
# Check if a container was OOM killed
OOM=$(docker inspect --format '{{.State.OOMKilled}}' my-container)
EXIT_CODE=$(docker inspect --format '{{.State.ExitCode}}' my-container)

if [ "$OOM" = "true" ]; then
    echo "Container was killed due to out-of-memory condition"
    echo "Consider increasing the memory limit"
elif [ "$EXIT_CODE" -eq 137 ]; then
    echo "Container was killed by SIGKILL (might be docker kill or OOM)"
elif [ "$EXIT_CODE" -eq 143 ]; then
    echo "Container was stopped gracefully (SIGTERM)"
fi
```

## Conclusion

Capturing Docker container exit codes is fundamental to automation. Use `docker wait` for detached containers that you need to block on. Use `docker run` (without `-d`) when you want the exit code returned directly. Use `docker inspect` to check exit codes of already-stopped containers. In CI pipelines, combine these with `--exit-code-from` in Docker Compose for clean test orchestration. Always check for OOM kills separately since exit code 137 can have multiple causes. Proper exit code handling turns Docker containers into reliable building blocks for automated workflows.
