# How to View Container Logs in Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Logging, Debugging

Description: Learn how to view, filter, and follow container logs in Podman Desktop for debugging and monitoring your applications.

---

> Container logs are your first line of defense when debugging issues, and Podman Desktop makes it easy to view, follow, and search through them in real time.

When running containers, inspecting logs is essential for debugging application errors, monitoring behavior, and understanding what is happening inside your containers. Podman Desktop provides a built-in log viewer with real-time streaming, and the CLI offers powerful filtering and formatting options. This post covers all the ways to view and work with container logs.

---

## Prerequisites

Ensure Podman Desktop is running and you have a container to inspect.

```bash
# Start a container that produces log output

podman run -d \
    --name my-web-server \
    -p 8080:80 \
    docker.io/library/nginx:alpine

# Generate some log entries by making requests
curl http://localhost:8080
curl http://localhost:8080/nonexistent
curl http://localhost:8080
```

## Viewing Logs in Podman Desktop

The graphical log viewer is the easiest way to see container output.

1. Click on "Containers" in the left sidebar
2. Find your container in the list
3. Click on the container name to open its details
4. Click on the "Logs" tab

The log viewer shows all stdout and stderr output from the container in real time. New log entries appear automatically as they are generated.

## Viewing Logs with the CLI

The `podman logs` command provides full access to container logs from the terminal.

```bash
# View all logs from a container
podman logs my-web-server

# View the last 20 lines of logs
podman logs --tail 20 my-web-server

# Follow logs in real time (like tail -f)
podman logs -f my-web-server

# Show timestamps with each log line
podman logs -t my-web-server

# Combine options: last 10 lines with timestamps, then follow
podman logs --tail 10 -t -f my-web-server
```

## Filtering Logs by Time

View logs from a specific time period.

```bash
# View logs since a specific timestamp
podman logs --since "2024-01-15T10:00:00" my-web-server

# View logs from the last 30 minutes
podman logs --since "30m" my-web-server

# View logs from the last 2 hours
podman logs --since "2h" my-web-server

# View logs until a specific time
podman logs --until "2024-01-15T11:00:00" my-web-server

# Combine since and until for a time window
podman logs --since "1h" --until "30m" my-web-server
```

## Searching Through Logs

Use shell tools to search and filter log output.

```bash
# Search for error messages
podman logs my-web-server 2>&1 | grep -i "error"

# Search for specific HTTP status codes
podman logs my-web-server 2>&1 | grep " 404 "

# Count occurrences of a pattern
podman logs my-web-server 2>&1 | grep -c " 200 "

# Search with context (3 lines before and after)
podman logs my-web-server 2>&1 | grep -C 3 "error"

# Filter for specific paths
podman logs my-web-server 2>&1 | grep "GET /api"
```

## Viewing Logs from Multiple Containers

Monitor logs from several containers at once.

```bash
# Start multiple containers for a demo stack
podman run -d --name web-frontend -p 8080:80 docker.io/library/nginx:alpine
podman run -d --name api-backend -p 3000:3000 docker.io/library/node:20-alpine \
    sh -c "while true; do echo 'API heartbeat'; sleep 5; done"
podman run -d --name cache-server docker.io/library/redis:7-alpine

# View logs from each container in separate terminals
# Terminal 1:
podman logs -f web-frontend

# Terminal 2:
podman logs -f api-backend

# Terminal 3:
podman logs -f cache-server

# Or combine logs from multiple containers
for container in web-frontend api-backend cache-server; do
    echo "=== $container ==="
    podman logs --tail 5 "$container"
    echo ""
done
```

## Saving Logs to a File

Export container logs for analysis or archival.

```bash
# Save all logs to a file
podman logs my-web-server > /tmp/web-server.log 2>&1

# Save with timestamps
podman logs -t my-web-server > /tmp/web-server-timestamped.log 2>&1

# Follow logs and append them to a file
podman logs -f my-web-server >> /tmp/web-server.log 2>&1 &

# Save only error output
podman logs my-web-server 2>/tmp/web-server-errors.log 1>/dev/null
```

## Monitoring Logs for Application Startup

Watch logs to confirm an application started correctly.

```bash
#!/bin/bash
# Start a container and wait for it to be ready

podman run -d --name my-app -p 8080:80 docker.io/library/nginx:alpine

echo "Waiting for application to start..."

# Follow logs and wait for a specific message
timeout 30 bash -c '
    podman logs -f my-app 2>&1 | while read line; do
        echo "$line"
        if echo "$line" | grep -q "start worker process"; then
            echo "Application started successfully!"
            exit 0
        fi
    done
'

if [ $? -eq 0 ]; then
    echo "Application is ready"
else
    echo "Timeout waiting for application to start"
    podman logs my-app
    exit 1
fi
```

## Understanding Log Drivers

Podman supports different logging drivers that affect how logs are stored.

```bash
# Check the current log driver
podman info --format '{{ .Host.LogDriver }}'

# Run a container with a specific log driver
podman run -d \
    --name logged-app \
    --log-driver journald \
    docker.io/library/nginx:alpine

# Podman can still retrieve logs from a journald-backed container
podman logs logged-app

# Run with the json-file compatibility alias for k8s-file
podman run -d \
    --name json-logged-app \
    --log-driver json-file \
    --log-opt max-size=10mb \
    docker.io/library/nginx:alpine
```

## Debugging with Logs in Podman Desktop

Podman Desktop's log viewer provides several features for debugging:

- **Real-time streaming**: Logs update automatically as new entries appear
- **Search**: Type a keyword in the log view's search box to find matching log entries
- **Open Logs shortcut**: Use the container overflow menu and choose **Open Logs** as an alternative to opening the full container details page

```bash
# Generate various log levels for debugging practice
podman run -d --name debug-app docker.io/library/alpine:latest \
    sh -c 'while true; do
        echo "[INFO] Application running normally"
        echo "[WARN] Memory usage high" >&2
        echo "[ERROR] Connection timeout" >&2
        sleep 3
    done'

# View in Podman Desktop or CLI
podman logs -f debug-app
```

## Summary

Viewing container logs is essential for debugging and monitoring. Podman Desktop provides a built-in log viewer accessible from any container's detail page, with real-time streaming and built-in keyword search. The `podman logs` CLI command offers powerful options including tail, follow, timestamps, and time-based filtering. You can search logs with grep, save them to files for analysis, and monitor multiple containers simultaneously. Understanding how to effectively use container logs is a fundamental skill for container-based development and operations.
