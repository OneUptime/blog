# How to View Service Logs in Portainer on Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Logging, Service, DevOps

Description: Learn how to view, filter, and aggregate logs from Docker Swarm services using Portainer's log viewer.

## Introduction

Viewing logs from Swarm services is different from standalone containers because log output comes from multiple replicas running on different nodes. Portainer aggregates these logs and presents them in a unified view, making it much easier to troubleshoot issues across distributed service replicas. This guide covers all methods for accessing and working with Swarm service logs in Portainer.

## Prerequisites

- Portainer installed on Docker Swarm
- At least one service with running tasks
- Admin access, or Operator access in Portainer Business Edition

## Step 1: Access Service Logs via Portainer

1. Navigate to **Services** in the Portainer sidebar
2. Select the service you want to inspect
3. Click **Service logs**

## Step 2: Understand the Log Viewer

The Portainer service log viewer shows the Docker logs for your service in a single view. When you need to isolate one replica, drill into an individual task as shown in Step 4.

## Step 3: Log Viewer Options

Configure the log display:

```text
Search / Filter search results - Find matching log lines and optionally show only matches
Date picker                    - Retrieve logs from a specific time range
Lines: [1000]                  - Limit the number of lines per log file (default 1000)
[x] Line numbers               - Show line numbers for each log line
[x] Timestamp                  - Show a timestamp before each line
[x] Wrap lines                 - Wrap long lines in the viewport
[x] Auto refresh               - Refresh the view automatically
Copy / Download / Full screen  - Export or expand the current log view
```

## Step 4: Filter Logs by Task (Replica)

To see logs from a specific replica:

1. From **Services**, click the down-arrow to the left of the service
2. Select the specific task to open that task's container details page
3. Open that container's logs

Or from the CLI on a Swarm manager node:

```bash
# Aggregate logs from all tasks in the service

docker service logs web-frontend

# Follow logs in real time
docker service logs -f web-frontend

# Show last 50 lines from all tasks
docker service logs --tail 50 web-frontend

# Show logs with timestamps
docker service logs --timestamps web-frontend

# List the service's tasks, then view logs for one task ID
docker service ps web-frontend
docker service logs <task-id>

# Show logs with raw format (without Docker's formatted prefixes)
docker service logs --raw web-frontend
```

## Step 5: Configure Log Drivers for Production

For production Swarm services, configure a centralized log backend when you need longer retention or cross-service search. Docker documents `docker service logs` for services using the `json-file` or `journald` logging driver, so once you switch to Fluentd or Loki you should query logs in that backend.

### JSON File with Rotation (Default)

```yaml
services:
  web:
    image: nginx:alpine
    logging:
      driver: json-file
      options:
        max-size: "10m"    # Rotate after 10MB
        max-file: "5"      # Keep 5 rotated files
```

### Fluentd Log Aggregation

```yaml
services:
  web:
    image: nginx:alpine
    logging:
      driver: fluentd
      options:
        fluentd-address: "fluentd:24224"
        tag: "swarm.{{.Name}}.{{.ID}}"    # Include service name and task ID
        fluentd-async: "true"             # Don't block if Fluentd is unavailable
```

### Loki Log Aggregation

Install the Loki Docker logging driver plugin on each Docker host before using `driver: loki`.

```yaml
services:
  web:
    image: nginx:alpine
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-external-labels: "job=swarm,container_name={{.Name}}"
```

## Step 6: Deploy a Centralized Logging Stack

For a working reference deployment of Loki + Grafana + Alloy, start from Grafana's official example stack:

```bash
mkdir loki-stack
cd loki-stack

wget https://raw.githubusercontent.com/grafana/loki/v3.7.0/examples/getting-started/docker-compose.yaml -O docker-compose.yaml
wget https://raw.githubusercontent.com/grafana/loki/v3.7.0/examples/getting-started/alloy-local-config.yaml -O alloy-local-config.yaml
wget https://raw.githubusercontent.com/grafana/loki/v3.7.0/examples/getting-started/loki-config.yaml -O loki-config.yaml

docker compose -f docker-compose.yaml up -d
```

## Log Analysis Tips

```bash
# Count error lines across all replicas
docker service logs web-frontend 2>&1 | grep -c "ERROR"

# Find the most recent errors
docker service logs --tail 1000 web-frontend 2>&1 | grep "ERROR" | tail -20

# Monitor a specific pattern in real time
docker service logs -f web-frontend 2>&1 | grep "5[0-9][0-9] "

# Export logs to a file for analysis
docker service logs --timestamps web-frontend > service-logs-$(date +%Y%m%d).log
```

## Conclusion

Portainer's unified log view for Swarm services saves significant time when debugging distributed applications. For development and small deployments, the built-in log viewer is sufficient. For production environments with multiple services, implement a centralized logging solution like Grafana Loki or ELK Stack to retain, search, and alert on logs across your entire Swarm cluster.
