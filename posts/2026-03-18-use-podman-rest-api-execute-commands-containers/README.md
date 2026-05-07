# How to Use the Podman REST API to Execute Commands in Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, EXEC, Container, DevOps

Description: Learn how to execute commands inside running containers using the Podman REST API, including creating exec instances, attaching to output, and handling interactive sessions.

---

> Executing commands inside running containers is essential for debugging, maintenance, and automation. The Podman REST API provides a two-step exec mechanism that lets you run arbitrary commands in containers programmatically, without needing shell access to the host.

There are many situations where you need to run a command inside a running container: checking application state, running database migrations, inspecting file systems, or triggering maintenance tasks. The `podman exec` CLI command handles this interactively, but the REST API opens the door to automation and remote execution from any HTTP client.

The exec workflow in the Podman API involves two steps: first you create an exec instance with the command configuration, then you start that instance to execute the command and capture the output. This guide walks through the entire process.

---

## Prerequisites

Start the Podman API service. For a rootless setup, use the default user socket path; if you are running rootful Podman, use `/run/podman/podman.sock` instead:

```bash
export SOCKET="${XDG_RUNTIME_DIR}/podman/podman.sock"
podman system service --time=0 "unix://$SOCKET"
```

Make sure you have a running container to test with:

```bash
podman run -d --name test-container alpine:latest sleep 3600
```

## The Two-Step Exec Process

Unlike simpler API operations, executing a command in a container requires two API calls:

1. **Create** an exec instance with the command and configuration.
2. **Start** the exec instance to run the command and receive output.

This separation allows you to configure the execution environment before running the command.

## Step 1: Create an Exec Instance

Use the exec create endpoint to define the command and its options:

```bash
curl -s --unix-socket "$SOCKET" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "AttachStdout": true,
    "AttachStderr": true,
    "Tty": true,
    "Cmd": ["ls", "-la", "/"]
  }' \
  "http://localhost/v4.0.0/libpod/containers/test-container/exec"
```

The response returns an exec ID:

```json
{
  "Id": "a1b2c3d4e5f6..."
}
```

### Exec Create Options

The create request body supports the following fields:

| Field | Type | Description |
|-------|------|-------------|
| AttachStdin | boolean | Attach to stdin of the exec command |
| AttachStdout | boolean | Attach to stdout of the exec command |
| AttachStderr | boolean | Attach to stderr of the exec command |
| Cmd | array | Command to run as a string array |
| DetachKeys | string | Key sequence for detaching |
| Env | array | Environment variables in KEY=VALUE format |
| Privileged | boolean | Run the command with extended privileges |
| Tty | boolean | Allocate a pseudo-TTY |
| User | string | User to run the command as (e.g., "root" or "1000:1000") |
| WorkingDir | string | Working directory inside the container |

## Step 2: Start the Exec Instance

With the exec ID from the previous step, start the execution:

```bash
EXEC_ID="a1b2c3d4e5f6"

curl -s --unix-socket "$SOCKET" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"Detach": false}' \
  "http://localhost/v4.0.0/libpod/exec/$EXEC_ID/start"
```

Because this example creates the exec instance with `"Tty": true`, the response body can be printed directly. Without a TTY, Podman uses the same multiplexed stream format as the attach endpoint.

## Complete Example: Running a Command

Here is a complete script that creates and starts an exec instance:

```bash
#!/bin/bash

SOCKET="${XDG_RUNTIME_DIR}/podman/podman.sock"
API="http://localhost/v4.0.0/libpod"
CONTAINER="test-container"

# Step 1: Create exec instance

EXEC_RESPONSE=$(curl -s --unix-socket "$SOCKET" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "AttachStdout": true,
    "AttachStderr": true,
    "Tty": true,
    "Cmd": ["cat", "/etc/os-release"]
  }' \
  "$API/containers/$CONTAINER/exec")

EXEC_ID=$(echo "$EXEC_RESPONSE" | jq -r '.Id')

if [ "$EXEC_ID" = "null" ] || [ -z "$EXEC_ID" ]; then
  echo "Failed to create exec instance"
  echo "$EXEC_RESPONSE"
  exit 1
fi

echo "Exec ID: $EXEC_ID"

# Step 2: Start exec instance
echo "--- Command Output ---"
curl -s --unix-socket "$SOCKET" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"Detach": false}' \
  "$API/exec/$EXEC_ID/start"
echo ""
echo "--- End Output ---"
```

## Running Commands with Environment Variables

You can pass environment variables to the exec command:

```bash
curl -s --unix-socket "$SOCKET" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "AttachStdout": true,
    "AttachStderr": true,
    "Env": ["DATABASE_URL=postgres://localhost:5432/mydb", "DEBUG=true"],
    "Cmd": ["printenv"]
  }' \
  "http://localhost/v4.0.0/libpod/containers/test-container/exec"
```

## Running Commands as a Different User

To execute a command as a specific user inside the container:

```bash
curl -s --unix-socket "$SOCKET" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "AttachStdout": true,
    "AttachStderr": true,
    "User": "nobody",
    "Cmd": ["id"]
  }' \
  "http://localhost/v4.0.0/libpod/containers/test-container/exec"
```

## Setting a Working Directory

You can specify the working directory for the command:

```bash
curl -s --unix-socket "$SOCKET" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "AttachStdout": true,
    "AttachStderr": true,
    "WorkingDir": "/var/log",
    "Cmd": ["ls", "-la"]
  }' \
  "http://localhost/v4.0.0/libpod/containers/test-container/exec"
```

## Checking Exec Instance Status

After starting an exec instance, you can inspect its status:

```bash
curl -s --unix-socket "$SOCKET" \
  "http://localhost/v4.0.0/libpod/exec/$EXEC_ID/json" | jq .
```

The response includes the exit code, which tells you whether the command succeeded:

```json
{
  "ID": "a1b2c3d4e5f6...",
  "ContainerID": "xyz789...",
  "ExitCode": 0,
  "Running": false,
  "Pid": 0
}
```

## Detached Execution

For long-running commands, you can run them in detached mode:

```bash
# Create exec instance
EXEC_ID=$(curl -s --unix-socket "$SOCKET" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "AttachStdout": false,
    "AttachStderr": false,
    "Cmd": ["sh", "-c", "sleep 30 && echo done > /tmp/result.txt"]
  }' \
  "http://localhost/v4.0.0/libpod/containers/test-container/exec" | jq -r '.Id')

# Start in detached mode
curl -s --unix-socket "$SOCKET" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"Detach": true}' \
  "http://localhost/v4.0.0/libpod/exec/$EXEC_ID/start"

# Check status later
curl -s --unix-socket "$SOCKET" \
  "http://localhost/v4.0.0/libpod/exec/$EXEC_ID/json" | jq '{running: .Running, exit_code: .ExitCode}'
```

## Building a Remote Command Runner

Here is a more complete script that wraps the exec workflow into a reusable function:

```bash
#!/bin/bash

SOCKET="${XDG_RUNTIME_DIR}/podman/podman.sock"
API="http://localhost/v4.0.0/libpod"

exec_in_container() {
  local container="$1"
  shift
  local cmd_json=$(printf '%s\n' "$@" | jq -R . | jq -s .)

  # Create exec instance
  local exec_id
  exec_id=$(curl -s --unix-socket "$SOCKET" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"AttachStdout\": true,
      \"AttachStderr\": true,
      \"Tty\": true,
      \"Cmd\": $cmd_json
    }" \
    "$API/containers/$container/exec" | jq -r '.Id')

  if [ "$exec_id" = "null" ] || [ -z "$exec_id" ]; then
    echo "ERROR: Failed to create exec instance" >&2
    return 1
  fi

  # Start exec and capture output
  local output
  output=$(curl -s --unix-socket "$SOCKET" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"Detach": false}' \
    "$API/exec/$exec_id/start")

  # Get exit code
  local exit_code
  exit_code=$(curl -s --unix-socket "$SOCKET" \
    "$API/exec/$exec_id/json" | jq '.ExitCode')

  echo "$output"
  return "$exit_code"
}

# Usage examples
echo "=== OS Release ==="
exec_in_container "test-container" "cat" "/etc/os-release"

echo ""
echo "=== Disk Usage ==="
exec_in_container "test-container" "df" "-h"

echo ""
echo "=== Process List ==="
exec_in_container "test-container" "ps"
```

## Error Handling

Handle common errors gracefully:

- **404**: Container or exec session not found, depending on the endpoint.
- **409** when creating an exec instance: The container is paused.
- **409** when starting an exec instance: The container is not running.
- **500**: Internal error. Check the Podman service logs.

```bash
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --unix-socket "$SOCKET" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"AttachStdout": true, "Cmd": ["ls"]}' \
  "http://localhost/v4.0.0/libpod/containers/my-container/exec")

case $HTTP_CODE in
  201) echo "Exec instance created successfully" ;;
  404) echo "Container not found" ;;
  409) echo "Container is paused" ;;
  500) echo "Internal server error" ;;
  *)   echo "Unexpected status: $HTTP_CODE" ;;
esac
```

## Security Considerations

Executing commands in containers through an API introduces security concerns:

- Always validate and sanitize command inputs when building automated systems.
- Use the `User` field to run commands with least-privilege users rather than root.
- Restrict access to the Podman socket since anyone with socket access can execute arbitrary commands.
- Log all exec operations for audit purposes.
- Consider using read-only commands where possible to prevent unintended modifications.

## Conclusion

The Podman REST API exec functionality provides a powerful way to run commands inside containers programmatically. The two-step create-then-start workflow gives you fine-grained control over the execution environment, including user context, environment variables, and working directory. By wrapping these API calls into scripts and functions, you can build robust remote management tools, automated maintenance workflows, and integration testing frameworks that operate on your containerized applications.
