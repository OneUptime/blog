# How to Run Multiple Commands in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Exec, Shell Scripting

Description: Learn how to run multiple commands inside a Podman container using shell chaining, scripts, and here documents for complex container operations.

---

> Chaining multiple commands in a container lets you perform complex operations in a single exec call without opening an interactive shell.

Running a single command inside a container is straightforward, but real-world scenarios often require executing a sequence of commands together. Whether you need to update packages and install tools, or run a series of diagnostic checks, this guide covers all the techniques for running multiple commands in Podman containers.

---

## Using Shell -c with Command Chaining

The most common approach is to invoke a shell and pass multiple commands with `-c`:

```bash
# Start a test container

podman run -d --name my-app nginx:latest

# Chain commands with && (run next only if previous succeeds)
podman exec my-app /bin/bash -c "echo 'Step 1: Check disk' && df -h && echo 'Step 2: Check memory' && (free -m 2>/dev/null || cat /proc/meminfo | head -3)"

# Chain commands with ; (run all regardless of success)
podman exec my-app /bin/bash -c "date; hostname; whoami; uptime"

# Chain commands with || (run next only if previous fails)
podman exec my-app /bin/bash -c "cat /nonexistent 2>/dev/null || echo 'File not found, using default'"
```

## Using Here Documents

For longer command sequences, use a here document:

```bash
# Run a multi-line script
podman exec -i my-app /bin/bash << 'EOF'
echo "=== System Information ==="
echo "Hostname: $(hostname)"
echo "Date: $(date)"
echo ""
echo "=== Disk Usage ==="
df -h
echo ""
echo "=== Memory ==="
free -m 2>/dev/null || cat /proc/meminfo | head -3
echo ""
echo "=== Network ==="
ip addr show 2>/dev/null | grep inet || echo "ip command not available"
EOF
```

## Using Semicolons for Sequential Execution

Semicolons run each command regardless of whether the previous one succeeded:

```bash
# Run several diagnostic commands
podman exec my-app /bin/bash -c "
    echo 'Checking processes...';
    if command -v ps > /dev/null 2>&1; then ps aux | head -10; else echo 'ps command not available'; fi;
    echo 'Checking ports...';
    ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || echo 'ss/netstat commands not available';
    echo 'Checking logs...';
    tail -5 /var/log/nginx/error.log 2>/dev/null;
    echo 'Done.'
"
```

## Using && for Dependent Commands

Use `&&` when each command depends on the previous one succeeding:

```bash
# Install packages: update, then install, then verify
podman exec --user root my-app /bin/bash -c "
    apt-get update -qq &&
    apt-get install -y -qq curl jq procps iproute2 &&
    curl --version &&
    jq --version &&
    echo 'All tools installed successfully'
"
```

## Using Pipes Between Commands

Pipe the output of one command into another:

```bash
# Find the largest files in the container
podman exec my-app /bin/bash -c "find / -type f -size +1M 2>/dev/null | head -10 | xargs ls -lh 2>/dev/null"

# Count running processes by user
podman exec my-app /bin/bash -c "ps aux | awk '{print \$1}' | sort | uniq -c | sort -rn"

# Check for specific content in config files
podman exec my-app /bin/bash -c "grep -r 'server_name' /etc/nginx/ 2>/dev/null | head -5"
```

## Conditional Command Execution

Build conditional logic into your command chains:

```bash
# Check and respond to conditions
podman exec my-app /bin/bash -c '
    if [ -f /etc/nginx/nginx.conf ]; then
        echo "Nginx config found"
        nginx -t 2>&1
    else
        echo "No nginx config found"
    fi
'

# Check multiple conditions
podman exec my-app /bin/bash -c '
    echo "Checking services..."
    if command -v nginx > /dev/null 2>&1; then
        echo "  nginx: installed ($(nginx -v 2>&1))"
    fi
    if command -v curl > /dev/null 2>&1; then
        echo "  curl: installed"
    else
        echo "  curl: NOT installed"
    fi
'
```

## Copying and Executing a Script

For complex operations, copy a script into the container and run it:

```bash
# Create a local script
cat > /tmp/health-check.sh << 'SCRIPT'
#!/bin/bash
echo "=== Health Check Report ==="
echo "Time: $(date)"
echo "Host: $(hostname)"
echo ""

# Check disk
DISK_USAGE=$(df / | tail -1 | awk '{print $5}')
echo "Disk usage: $DISK_USAGE"

# Check if nginx is responding
if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200"; then
    echo "Nginx: HEALTHY"
else
    echo "Nginx: UNHEALTHY"
fi

echo "=== End Report ==="
SCRIPT

# Copy the script to the container
podman cp /tmp/health-check.sh my-app:/tmp/health-check.sh

# Make it executable and run it
podman exec my-app /bin/bash -c "chmod +x /tmp/health-check.sh && /tmp/health-check.sh"
```

## Looping Inside Containers

Run loops for repetitive operations:

```bash
# Check multiple endpoints
podman exec my-app /bin/bash -c '
    for path in / /index.html /favicon.ico /nonexistent; do
        status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80${path})
        echo "GET ${path} -> ${status}"
    done
'

# Process multiple files
podman exec my-app /bin/bash -c '
    for logfile in /var/log/nginx/*.log; do
        lines=$(wc -l < "$logfile" 2>/dev/null)
        echo "$logfile: $lines lines"
    done
'
```

## Cleanup

```bash
podman stop my-app && podman rm my-app
rm -f /tmp/health-check.sh
```

## Summary

Running multiple commands in a Podman container can be achieved through shell chaining with `&&`, `;`, or `||`, here documents for multi-line scripts, and by copying scripts into the container. Choose the approach based on complexity: chaining for simple sequences, here documents for moderate complexity, and script files for complex operations.
