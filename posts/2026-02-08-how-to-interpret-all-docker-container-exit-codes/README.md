# How to Interpret All Docker Container Exit Codes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, exit codes, troubleshooting, debugging, containers, signals, process management

Description: A complete reference guide to Docker container exit codes, explaining what each code means, how to diagnose the cause, and how to fix common failures.

---

When a Docker container stops, it leaves behind an exit code. That number tells you why the container stopped and whether something went wrong. An exit code of 0 means everything went fine. Anything else signals a problem. But what does 137 mean versus 139? Why did your container exit with 1 instead of 126? This guide breaks down every exit code you are likely to encounter, what causes it, and what to do about it.

## How to Check Exit Codes

Before diving into the codes themselves, here is how to find the exit code of a stopped container:

```bash
# Check the exit code of the last run
docker inspect my-container --format '{{.State.ExitCode}}'

# View exit codes for all stopped containers
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

# Check detailed state information
docker inspect my-container --format '{{json .State}}' | python3 -m json.tool
```

For Docker Compose services:

```bash
# Check exit codes for all services
docker compose ps -a
```

## Exit Code 0 - Success

The process completed successfully. This is the only exit code that means "everything is fine."

```bash
# Example: a container that runs and exits successfully
docker run alpine echo "Hello"
echo $?  # Output: 0
```

A container exiting with code 0 is not a problem unless you expected it to keep running. If a long-running service exits with 0, it means the application decided to stop on its own. Check the logs:

```bash
# Why did a long-running container exit cleanly?
docker logs my-container --tail 50
```

## Exit Code 1 - General Application Error

Exit code 1 is a catch-all for application errors. The process ran but encountered an error it could not recover from.

```bash
# Examples that produce exit code 1
docker run alpine sh -c "exit 1"
docker run node:18-alpine node -e "throw new Error('fail')"
```

Diagnosis:

```bash
# Check application logs for the actual error
docker logs my-container

# Check the last few lines of output
docker logs my-container --tail 100
```

Common causes: missing configuration files, failed database connections, syntax errors in interpreted languages, or any unhandled exception.

## Exit Code 2 - Shell Misuse

Exit code 2 typically indicates incorrect usage of a shell command, such as wrong arguments or missing required parameters.

```bash
# Example: incorrect argument to a command
docker run alpine ls --invalid-flag
# Exit code: 2
```

This also appears when a shell script has a syntax error:

```bash
# Bash syntax error
docker run alpine sh -c "if then fi"
# Exit code: 2
```

## Exit Code 126 - Command Not Executable

The command was found but could not be executed. This usually means a permissions problem.

```bash
# Example: file exists but is not executable
docker run alpine sh -c "echo 'test' > /tmp/script.sh && /tmp/script.sh"
# Exit code: 126
```

Fix by setting the execute permission:

```dockerfile
# Fix permissions in Dockerfile
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
```

## Exit Code 127 - Command Not Found

The command specified in CMD, ENTRYPOINT, or a RUN instruction does not exist in the container's PATH.

```bash
# Example: command does not exist
docker run alpine nonexistent-command
# Exit code: 127
```

Common causes:

```bash
# The binary is not installed
docker run alpine curl http://example.com  # curl is not in alpine by default

# Typo in the command
docker run node:18-alpine nodee server.js  # "nodee" instead of "node"

# Wrong PATH
docker run myimage /app/myapp  # myapp might be in a different location
```

Diagnose with:

```bash
# Find where a command is (or isn't)
docker run --entrypoint sh myimage -c "which mycommand || echo 'not found'"
docker run --entrypoint sh myimage -c "ls -la /app/"
```

## Exit Code 125 - Docker Daemon Error

This is not an application exit code. Docker itself failed to run the container. The container never started.

```bash
# Example: invalid docker run arguments
docker run --memory=invalid alpine
# Exit code: 125
```

This happens when Docker cannot create or start the container due to invalid options, missing images, or resource constraints.

## Exit Code 128 - Invalid Exit Code Argument

The application called `exit()` with an invalid argument.

```bash
# Example: exit with a non-numeric code
docker run alpine sh -c "exit abc"
# Exit code: 2 (shell interprets this as an error)
```

In practice, you rarely see exactly 128. Most codes in the 128+ range are signal-related.

## Signal-Related Exit Codes (128 + N)

When a process is killed by a signal, the exit code is 128 plus the signal number. Here are all the signal-related exit codes:

| Exit Code | Signal | Name | Meaning |
|-----------|--------|------|---------|
| 129 | 1 | SIGHUP | Hangup (terminal disconnected) |
| 130 | 2 | SIGINT | Interrupt (Ctrl+C) |
| 131 | 3 | SIGQUIT | Quit (core dump) |
| 132 | 4 | SIGILL | Illegal instruction |
| 133 | 5 | SIGTRAP | Trace/breakpoint trap |
| 134 | 6 | SIGABRT | Aborted (abort() called) |
| 135 | 7 | SIGBUS | Bus error |
| 136 | 8 | SIGFPE | Floating point exception |
| 137 | 9 | SIGKILL | Killed (cannot be caught) |
| 138 | 10 | SIGUSR1 | User-defined signal 1 |
| 139 | 11 | SIGSEGV | Segmentation fault |
| 140 | 12 | SIGUSR2 | User-defined signal 2 |
| 141 | 13 | SIGPIPE | Broken pipe |
| 142 | 14 | SIGALRM | Alarm clock |
| 143 | 15 | SIGTERM | Terminated (graceful) |

### Exit Code 130 - SIGINT (Ctrl+C)

The process received an interrupt signal, usually from pressing Ctrl+C.

```bash
# This is normal when you Ctrl+C a running container in foreground mode
docker run -it alpine sleep 100
# Press Ctrl+C
# Exit code: 130
```

### Exit Code 134 - SIGABRT

The process called `abort()` or an assertion failed. Common in C/C++ applications.

```bash
# Check for assertion failures in logs
docker logs my-container | grep -i "assert\|abort"
```

### Exit Code 137 - SIGKILL (OOM or Forced Kill)

The process was forcefully killed. Check for OOM:

```bash
# Check if OOM killed
docker inspect my-container --format '{{.State.OOMKilled}}'

# Check kernel logs
dmesg | grep -i "oom\|killed process"
```

### Exit Code 139 - SIGSEGV (Segfault)

Memory access violation. Often caused by architecture mismatches or library incompatibilities.

```bash
# Check architecture
docker inspect myimage --format '{{.Architecture}}'
uname -m
```

### Exit Code 143 - SIGTERM (Graceful Shutdown)

Normal result of `docker stop`. The process received SIGTERM and exited.

```bash
# This is expected after docker stop
docker stop my-container
docker inspect my-container --format '{{.State.ExitCode}}'
# Output: 143
```

## Application-Specific Exit Codes

Some applications use specific exit codes with defined meanings:

```bash
# Python exit codes
# 0: Success
# 1: General error
# 2: Command line usage error

# Node.js exit codes
# 0: Success
# 1: Uncaught fatal exception
# 3: Internal parsing error
# 9: Invalid argument
# 12: Invalid debug argument

# Nginx exit codes
# 0: Success
# 1: Configuration error
```

## Exit Codes Above 255

Docker containers use 8-bit exit codes (0-255). If an application tries to exit with a code above 255, it wraps around using modulo 256:

```bash
# Exit code 256 becomes 0
docker run alpine sh -c "exit 256"
echo $?  # Output: 0

# Exit code 257 becomes 1
docker run alpine sh -c "exit 257"
echo $?  # Output: 1
```

## Diagnostic Script

Use this script to quickly diagnose any container's exit code:

```bash
#!/bin/bash
# diagnose-exit.sh - Diagnose Docker container exit codes
CONTAINER=$1

if [ -z "$CONTAINER" ]; then
    echo "Usage: $0 <container-name-or-id>"
    exit 1
fi

EXIT_CODE=$(docker inspect "$CONTAINER" --format '{{.State.ExitCode}}' 2>/dev/null)
OOM_KILLED=$(docker inspect "$CONTAINER" --format '{{.State.OOMKilled}}' 2>/dev/null)

if [ -z "$EXIT_CODE" ]; then
    echo "Container not found: $CONTAINER"
    exit 1
fi

echo "Container: $CONTAINER"
echo "Exit Code: $EXIT_CODE"
echo "OOM Killed: $OOM_KILLED"
echo ""

case $EXIT_CODE in
    0)   echo "Status: Success - container exited normally" ;;
    1)   echo "Status: Application error - check logs with: docker logs $CONTAINER" ;;
    2)   echo "Status: Shell misuse or syntax error" ;;
    125) echo "Status: Docker daemon error - container failed to start" ;;
    126) echo "Status: Command not executable - check file permissions" ;;
    127) echo "Status: Command not found - check CMD/ENTRYPOINT in Dockerfile" ;;
    130) echo "Status: SIGINT - interrupted (Ctrl+C)" ;;
    134) echo "Status: SIGABRT - process aborted (assertion failure?)" ;;
    137) echo "Status: SIGKILL - forcefully killed (OOM? manual kill?)" ;;
    139) echo "Status: SIGSEGV - segmentation fault (architecture mismatch?)" ;;
    143) echo "Status: SIGTERM - gracefully terminated (normal docker stop)" ;;
    *)
        if [ "$EXIT_CODE" -gt 128 ] && [ "$EXIT_CODE" -lt 165 ]; then
            SIGNAL=$((EXIT_CODE - 128))
            echo "Status: Killed by signal $SIGNAL"
        else
            echo "Status: Application-specific exit code"
        fi
        ;;
esac

echo ""
echo "Last 10 log lines:"
docker logs "$CONTAINER" --tail 10 2>&1
```

```bash
# Make it executable and use it
chmod +x diagnose-exit.sh
./diagnose-exit.sh my-container
```

## Handling Exit Codes in Docker Compose

Configure restart behavior based on exit codes:

```yaml
# docker-compose.yml
services:
  app:
    image: myapp:latest
    # restart: "no"           - Never restart (default)
    # restart: always         - Always restart, regardless of exit code
    # restart: on-failure     - Restart only on non-zero exit codes
    # restart: unless-stopped - Restart unless manually stopped
    restart: on-failure
```

## Summary

Docker exit codes follow a simple pattern: 0 means success, 1-127 are application errors, and 128+ are signal-related (128 + signal number). The most common ones you will encounter are 0 (success), 1 (application error), 127 (command not found), 137 (killed/OOM), 139 (segfault), and 143 (graceful shutdown). When debugging, always check `docker logs` first for application-level errors, then `docker inspect` for the OOM flag, and `dmesg` for kernel-level events. Keep the diagnostic script handy for quick triage when containers stop unexpectedly.
