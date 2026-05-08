# How to Debug a Crashing Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Debugging, Troubleshooting

Description: Learn systematic techniques to debug crashing Podman containers, from log analysis and inspection to overriding entrypoints and using filesystem recovery.

---

> A systematic debugging approach turns a crashing container from a mystery into a solvable problem.

When a container keeps crashing, it can be frustrating to diagnose. The container exits too fast for `podman exec`, and restarting it just repeats the crash. This guide provides a systematic approach to debugging crashing containers, from quick log checks to deep filesystem analysis.

---

## Step 1: Check Container Logs

The first place to look is always the container logs:

```bash
# Check the logs of the crashed container

podman logs my-crashing-app

# Get the last 50 lines
podman logs --tail 50 my-crashing-app

# Follow logs in real time if the container keeps restarting
podman logs -f my-crashing-app

# Show timestamps
podman logs --timestamps my-crashing-app
```

## Step 2: Check the Exit Code

The exit code tells you how the process terminated:

```bash
# Get the exit code
podman inspect my-crashing-app --format '{{.State.ExitCode}}'

# Common exit codes:
# 0   = Normal exit
# 1   = General error
# 126 = Command not executable
# 127 = Command not found
# 137 = Killed by SIGKILL (OOM or manual kill)
# 139 = Segmentation fault
# 143 = Killed by SIGTERM

# Get the full state information
podman inspect my-crashing-app --format '
Exit Code: {{.State.ExitCode}}
Error:     {{.State.Error}}
Started:   {{.State.StartedAt}}
Finished:  {{.State.FinishedAt}}
OOMKilled: {{.State.OOMKilled}}'
```

## Step 3: Check for OOM Kills

If the exit code is 137, the container might be running out of memory:

```bash
# Check if OOM killed
podman inspect my-crashing-app --format '{{.State.OOMKilled}}'

# Check the memory limit
podman inspect my-crashing-app --format '{{.HostConfig.Memory}}'

# Try running with more memory
podman run -d --name more-memory --memory 512m my-image:latest
```

## Step 4: Override the Entrypoint

Start the container with a shell instead of its normal command to investigate:

```bash
# Override entrypoint with a shell
podman run -it --entrypoint /bin/bash my-image:latest

# If bash is not available, try sh
podman run -it --entrypoint /bin/sh my-image:latest

# Once inside, you can:
# - Check if config files exist and are valid
# - Test the actual command manually
# - Check file permissions
# - Verify environment variables
```

## Step 5: Override the Command

Keep the entrypoint but change the command:

```bash
# Run with a different command when the image has no entrypoint
podman run -it my-image:latest /bin/bash

# Run the original command manually to see errors
podman run -it --entrypoint /bin/bash my-image:latest -c "
    echo 'Checking environment...'
    env | sort
    echo ''
    echo 'Checking config files...'
    ls -la /app/config/ 2>/dev/null || echo 'No config directory'
    echo ''
    echo 'Running the app manually...'
    # Replace with the actual command from the Dockerfile CMD
    # node /app/server.js
"
```

## Step 6: Inspect the Container Configuration

Check if the container is configured correctly:

```bash
# Check the full configuration
podman inspect my-crashing-app --format '
Image:      {{.Config.Image}}
Entrypoint: {{json .Config.Entrypoint}}
Cmd:        {{json .Config.Cmd}}
WorkingDir: {{.Config.WorkingDir}}
User:       {{.Config.User}}
Env:        {{json .Config.Env}}'

# Check volume mounts
podman inspect my-crashing-app --format '{{json .Mounts}}' | python3 -m json.tool

# Check port bindings
podman inspect my-crashing-app --format '{{json .HostConfig.PortBindings}}' | python3 -m json.tool
```

## Step 7: Extract Files from the Crashed Container

Get files out for analysis:

```bash
# Copy logs from the crashed container
podman cp my-crashing-app:/var/log/ /tmp/crash-logs/ 2>/dev/null

# Copy the application code to check for issues
podman cp my-crashing-app:/app/ /tmp/app-code/ 2>/dev/null

# Export the entire filesystem
podman export my-crashing-app > /tmp/crash-filesystem.tar

# Search for error-related files
tar tf /tmp/crash-filesystem.tar | grep -iE "(error|crash|core|dump)"
```

## Step 8: Check Filesystem Changes

See what changed since the image was built:

```bash
# View filesystem diff
podman diff my-crashing-app

# Look for modified config files
podman diff my-crashing-app | grep "^C" | grep -E "(conf|cfg|ini|yml|yaml|json)"

# Look for deleted files that might be needed
podman diff my-crashing-app | grep "^D"
```

## Step 9: Run with Verbose Logging

Many applications support verbose or debug modes:

```bash
# Run with debug environment variables
podman run -d --name debug-app \
    -e DEBUG=true \
    -e LOG_LEVEL=trace \
    -e VERBOSE=1 \
    -e NODE_DEBUG=* \
    my-image:latest

# Check the verbose output
podman logs debug-app
```

## Step 10: Check Dependencies and Connectivity

Test if the container can reach its dependencies:

```bash
# Run a debug container in the same user-defined network
podman run --rm -it --network my-app-network alpine /bin/sh -c "
    # Test DNS resolution
    nslookup database-host 2>/dev/null || echo 'DNS failed'

    # Test TCP connectivity
    nc -zv database-host 5432 2>&1 || echo 'Cannot reach database'

    # Test HTTP endpoints
    wget -q -O- http://api-service:8080/health 2>/dev/null || echo 'API unreachable'
"
```

## Step 11: Resource and Permission Issues

```bash
# Check if it is a permission issue
podman run --rm my-image:latest id
podman run --rm my-image:latest ls -la /app/

# Try running as root to eliminate permission issues
podman run -it --user root my-image:latest /bin/bash

# Check if required files are readable
podman run --rm my-image:latest test -r /app/config.yml && echo "readable" || echo "not readable"

# Check disk space
podman system df
```

## Step 12: Compare with a Working Version

If you have a version that works, compare them:

```bash
# Inspect the working container
podman inspect working-app --format '{{json .Config.Env}}' > /tmp/working-env.json

# Inspect the broken container
podman inspect my-crashing-app --format '{{json .Config.Env}}' > /tmp/broken-env.json

# Compare
diff /tmp/working-env.json /tmp/broken-env.json
```

## Quick Debugging Checklist

```bash
# Run this complete diagnostic on a crashed container
CONTAINER="my-crashing-app"

echo "=== Container Diagnostic Report ==="
echo "Container: $CONTAINER"
echo "Date: $(date)"
echo ""

echo "--- State ---"
podman inspect "$CONTAINER" --format 'Status: {{.State.Status}}
Exit Code: {{.State.ExitCode}}
OOM Killed: {{.State.OOMKilled}}
Error: {{.State.Error}}'

echo ""
echo "--- Last 20 Log Lines ---"
podman logs --tail 20 "$CONTAINER" 2>&1

echo ""
echo "--- Configuration ---"
podman inspect "$CONTAINER" --format 'Image: {{.Config.Image}}
Entrypoint: {{json .Config.Entrypoint}}
Cmd: {{json .Config.Cmd}}
User: {{.Config.User}}'

echo ""
echo "--- Filesystem Changes ---"
podman diff "$CONTAINER" 2>/dev/null | head -10

echo ""
echo "=== End Report ==="
```

## Cleanup

```bash
podman rm my-crashing-app debug-app more-memory 2>/dev/null
rm -rf /tmp/crash-logs /tmp/app-code /tmp/crash-filesystem.tar /tmp/working-env.json /tmp/broken-env.json
```

## Summary

Debugging a crashing Podman container follows a systematic approach: check logs first, examine the exit code, override the entrypoint to get a shell, inspect the configuration, and extract files for analysis. Key tools include `podman logs`, `podman inspect`, `podman cp`, `podman diff`, and running the container with an overridden entrypoint. Most crashes stem from missing configuration, permission issues, missing dependencies, or resource exhaustion.
