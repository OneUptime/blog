# How to View Service Logs with podman-compose logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Logging, Debugging

Description: Learn how to view and follow service logs with podman-compose logs for debugging and monitoring multi-container applications.

---

> podman-compose logs aggregates output from all services, making it easy to debug multi-container applications.

When running multiple services with podman-compose, viewing logs from all containers in one stream is essential for debugging. The `podman-compose logs` command aggregates stdout and stderr from all services, with options to filter by service name and follow logs in real time.

---

## Viewing All Logs

```bash
# Show logs from all services

podman-compose logs

# Output includes the service name as a prefix
# [web] | 172.16.0.1 - - [17/Mar/2026] "GET / HTTP/1.1" 200
# [db]  | 2026-03-17 LOG:  database system is ready
```

## Following Logs in Real Time

```bash
# Stream logs continuously (like tail -f)
podman-compose logs -f

# Press Ctrl+C to stop following
```

## Viewing Logs for a Specific Service

```bash
# Show logs from only the web service
podman-compose logs web

# Follow logs from only the db service
podman-compose logs -f db
```

## Limiting Log Output

```bash
# Show only the last 50 lines
podman-compose logs --tail 50

# Show last 20 lines per service and follow
podman-compose logs --tail 20 -f
```

## Timestamps

```bash
# Show timestamps with each log line
podman-compose logs -t

# Combine with follow and tail
podman-compose logs -t --tail 100 -f
```

## Logs from Multiple Services

```bash
# View logs from web and api services only
podman-compose logs web api

# Follow logs from selected services
podman-compose logs -f web api
```

## Debugging a Failing Service

```bash
# Check logs for a service that exited with an error
podman-compose ps
# Look for services with exit code != 0

# View the full logs for the failing service
podman-compose logs failing-service

# Check if the container exists
podman ps -a --filter name=project_failing-service
```

## Redirecting Logs to a File

```bash
# Save logs to a file for later analysis
podman-compose logs > app-logs.txt 2>&1

# Save logs with timestamps
podman-compose logs -t > app-logs-with-timestamps.txt 2>&1
```

## Using Podman Directly for Advanced Options

```bash
# For more log options, use podman logs directly
podman logs --since 1h project_web_1

# Show logs since a specific time
podman logs --since "2026-03-17T10:00:00" project_web_1
```

## Summary

Use `podman-compose logs` to view aggregated output from all services. Add `-f` to follow in real time, `--tail` to limit output, and specify service names to filter. For advanced filtering by time, use `podman logs` directly on the container.
