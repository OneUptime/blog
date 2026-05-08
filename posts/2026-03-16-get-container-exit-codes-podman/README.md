# How to Get Container Exit Codes in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Management, Debugging

Description: Learn how to retrieve and interpret container exit codes in Podman for debugging failures and automating error handling in scripts.

---

> Exit codes tell you exactly how a container's process ended, making them essential for debugging failures and building reliable automation.

When a container stops, its main process returns an exit code that indicates whether it succeeded (0) or failed (non-zero). Understanding and capturing these exit codes is critical for debugging, CI/CD pipelines, and automation scripts. This guide covers every way to get and use exit codes in Podman.

---

## Understanding Exit Codes

Common exit codes:

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Misuse of shell command |
| 125 | Podman itself failed |
| 126 | Command cannot execute (permission issue) |
| 127 | Command not found |
| 128+N | Process killed by signal N in common shell conventions (e.g., 137 = SIGKILL, 143 = SIGTERM) |
| 137 | Container killed (SIGKILL / OOM killed) |
| 143 | Container terminated (SIGTERM) |
| 255 | Application-specific error or shell exit status such as `exit -1` |

## Getting Exit Code from podman run

The simplest way to get an exit code is from the `podman run` command itself.

```bash
# Successful container

podman run --rm docker.io/library/alpine:latest echo "Success"
echo "Exit code: $?"

# Failed container
podman run --rm docker.io/library/alpine:latest sh -c 'exit 1'
echo "Exit code: $?"

# Command not found
podman run --rm docker.io/library/alpine:latest nonexistent-command
echo "Exit code: $?"
```

## Getting Exit Code from podman inspect

For containers that have already exited, use `podman inspect`.

```bash
# Run a container that exits
podman run --name test-exit docker.io/library/alpine:latest sh -c 'exit 42'

# Get the exit code
podman inspect test-exit --format '{{.State.ExitCode}}'

# Get more details about the exit
podman inspect test-exit --format 'Status: {{.State.Status}} ExitCode: {{.State.ExitCode}} Error: {{.State.Error}}'

# Clean up
podman rm test-exit
```

## Getting Exit Code from podman wait

The `podman wait` command outputs the exit code when the container stops.

```bash
# Run a container in the background
podman run -d --name bg-task docker.io/library/alpine:latest sh -c 'sleep 3; exit 5'

# Wait and capture the exit code
EXIT_CODE=$(podman wait bg-task)
echo "Container exited with code: $EXIT_CODE"

# Clean up
podman rm bg-task
```

## Getting Exit Code from podman ps

```bash
# Show exit codes for all exited containers
podman ps -a --filter status=exited --format "table {{.Names}}\t{{.ExitCode}}\t{{.Status}}"
```

## Detecting OOM Kills

When a container is killed due to exceeding its memory limit, the exit code is 137.

```bash
# Run a container with a low memory limit
podman run --rm --name oom-test --memory 10m \
  docker.io/library/alpine:latest \
  sh -c 'x=$(head -c 100m /dev/zero | tr "\0" "x"); echo "$x" >/dev/null' 2>/dev/null
echo "Exit code: $?"

# Check if a container was OOM killed
podman inspect test-container --format '{{.State.OOMKilled}}' 2>/dev/null
```

## Exit Codes in CI/CD Pipelines

```bash
#!/bin/bash
# ci-test.sh - Run tests and handle exit codes

echo "Running unit tests..."
podman run --rm --name tests \
  -v ./:/app:z -w /app \
  docker.io/library/alpine:latest \
  sh -c 'echo "Running tests..."; exit 0'
TEST_EXIT=$?

echo "Running lint..."
podman run --rm --name lint \
  -v ./:/app:z -w /app \
  docker.io/library/alpine:latest \
  sh -c 'echo "Linting..."; exit 0'
LINT_EXIT=$?

echo ""
echo "Results:"
echo "  Tests: exit code $TEST_EXIT"
echo "  Lint:  exit code $LINT_EXIT"

if [ "$TEST_EXIT" -ne 0 ] || [ "$LINT_EXIT" -ne 0 ]; then
  echo "Pipeline FAILED"
  exit 1
fi

echo "Pipeline PASSED"
```

## Interpreting Signal-Based Exit Codes

Exit codes above 128 often indicate the process was killed by a signal.

```bash
#!/bin/bash
# interpret-exit.sh - Interpret container exit codes

CONTAINER=$1
EXIT_CODE=$(podman inspect "$CONTAINER" --format '{{.State.ExitCode}}' 2>/dev/null)

if [ -z "$EXIT_CODE" ]; then
  echo "Container '$CONTAINER' not found"
  exit 1
fi

echo "Container: $CONTAINER"
echo "Exit code: $EXIT_CODE"

case $EXIT_CODE in
  0)   echo "Interpretation: Success" ;;
  1)   echo "Interpretation: General error" ;;
  2)   echo "Interpretation: Shell misuse" ;;
  125) echo "Interpretation: Podman error" ;;
  126) echo "Interpretation: Permission denied or not executable" ;;
  127) echo "Interpretation: Command not found" ;;
  137) echo "Interpretation: Killed by SIGKILL (possibly OOM)" ;;
  143) echo "Interpretation: Terminated by SIGTERM" ;;
  *)
    if [ "$EXIT_CODE" -gt 128 ]; then
      SIGNAL=$((EXIT_CODE - 128))
      echo "Interpretation: Killed by signal $SIGNAL"
    else
      echo "Interpretation: Application-specific error"
    fi
    ;;
esac
```

## Monitoring Exit Codes

```bash
#!/bin/bash
# monitor-exits.sh - Monitor containers for non-zero exit codes

echo "Checking for failed containers..."

FAILED=0
for container in $(podman ps -a --filter status=exited --format "{{.Names}}"); do
  EXIT_CODE=$(podman inspect "$container" --format '{{.State.ExitCode}}')
  if [ "$EXIT_CODE" -ne 0 ]; then
    echo "FAILED: $container (exit code: $EXIT_CODE)"
    echo "  Last logs:"
    podman logs --tail 5 "$container" 2>&1 | sed 's/^/    /'
    echo ""
    FAILED=$((FAILED + 1))
  fi
done

if [ "$FAILED" -eq 0 ]; then
  echo "No failed containers found"
else
  echo "$FAILED container(s) exited with errors"
fi
```

## Exit Codes with podman start

When starting a previously created container, capture the exit code after it finishes.

```bash
# Create a container
podman create --name deferred docker.io/library/alpine:latest sh -c 'exit 3'

# Start it and get the exit code
podman start --attach deferred
echo "Exit code: $?"

# Or use podman wait
podman start deferred
EXIT_CODE=$(podman wait deferred)
echo "Exit code from wait: $EXIT_CODE"

# Clean up
podman rm deferred
```

## Batch Exit Code Report

```bash
#!/bin/bash
# exit-report.sh - Generate exit code report for all containers

echo "Exit Code Report - $(date)"
echo "=========================="
echo ""

printf "%-30s %-10s %-10s\n" "CONTAINER" "STATUS" "EXIT CODE"
printf "%-30s %-10s %-10s\n" "---------" "------" "---------"

podman ps -a --format "{{.Names}}\t{{.State}}\t{{.ExitCode}}" | \
  while IFS=$'\t' read -r name state code; do
    printf "%-30s %-10s %-10s\n" "$name" "$state" "$code"
  done

echo ""
echo "Summary:"
echo "  Success (0): $(podman ps -a --filter status=exited --format "{{.ExitCode}}" | grep -c "^0$")"
echo "  Failed (!=0): $(podman ps -a --filter status=exited --format "{{.ExitCode}}" | grep -cv "^0$")"
```

## Summary

Exit codes are fundamental to container debugging and automation. Capture them with `$?` after `podman run`, `podman inspect --format '{{.State.ExitCode}}'` for stopped containers, or `podman wait` for background containers. Exit code 0 means success, 1-124 are typically application errors, 125 means Podman itself failed, 126-127 are command invocation errors, and 128+N often indicates the process was killed by signal N. Use this information to build robust CI/CD pipelines and monitoring scripts.
