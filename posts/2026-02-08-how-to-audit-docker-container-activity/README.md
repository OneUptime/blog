# How to Audit Docker Container Activity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, auditing, security, logging, monitoring, compliance, container activity

Description: Learn how to audit Docker container activity using Docker events, system logs, Falco, and custom scripts to maintain security visibility.

---

If you cannot answer the question "what happened inside that container last Tuesday at 3 AM," you have an auditing gap. Docker containers are ephemeral by nature, which makes tracking their activity challenging. Containers start, run workloads, and disappear. Without proper auditing, you lose visibility into who did what, when, and why.

This guide covers practical approaches to auditing Docker container activity, from built-in Docker tools to dedicated security monitoring with Falco.

## Docker Events: The Built-In Audit Stream

Docker ships with an event system that tracks container lifecycle actions. Every time a container starts, stops, gets killed, or changes state, Docker records it.

```bash
# Watch Docker events in real time
docker events

# Filter events for a specific container
docker events --filter container=my_app

# Filter by event type (container, image, volume, network)
docker events --filter type=container

# Get events from the last hour in JSON format for automated processing
docker events --since "1h" --format '{{json .}}'
```

The JSON output includes the actor, action, timestamp, and attributes:

```bash
# Stream container events as structured JSON for log ingestion
docker events --filter type=container --format '{{json .}}' | while read event; do
    echo "$event" >> /var/log/docker-audit.json
done
```

A typical event looks like this:

```json
{
  "status": "start",
  "id": "abc123def456",
  "from": "nginx:latest",
  "Type": "container",
  "Action": "start",
  "Actor": {
    "ID": "abc123def456",
    "Attributes": {
      "image": "nginx:latest",
      "name": "web_server"
    }
  },
  "time": 1707350400,
  "timeNano": 1707350400123456789
}
```

## Capturing Docker Daemon Logs

The Docker daemon logs record API calls and internal operations. Configure the daemon to increase log verbosity:

```json
{
  "log-level": "info",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  }
}
```

```bash
# View Docker daemon logs on systemd-based systems
journalctl -u docker.service --since "1 hour ago"

# Filter for specific operations
journalctl -u docker.service | grep -i "container create\|container start\|container kill"
```

## Linux Audit Framework (auditd)

For deeper auditing, use the Linux audit framework to monitor Docker-related system calls and file access.

```bash
# Add audit rules for Docker socket access
# This tracks every process that connects to the Docker daemon
sudo auditctl -w /var/run/docker.sock -k docker-socket -p rwxa

# Monitor Docker configuration changes
sudo auditctl -w /etc/docker/ -k docker-config -p wa

# Monitor container runtime directories
sudo auditctl -w /var/lib/docker/ -k docker-storage -p wa
```

Make these rules persistent by adding them to the audit rules file:

```bash
# /etc/audit/rules.d/docker.rules
# Audit rules for Docker daemon and container activity

# Track all access to the Docker socket
-w /var/run/docker.sock -k docker-socket -p rwxa

# Track Docker daemon configuration changes
-w /etc/docker/ -k docker-config -p wa

# Track Docker binary execution
-w /usr/bin/docker -k docker-cli -p x
-w /usr/bin/dockerd -k docker-daemon -p x

# Track container runtime state changes
-w /var/lib/docker/containers/ -k docker-containers -p wa
```

Search audit logs for Docker-related events:

```bash
# Find all Docker socket access in the last hour
ausearch -k docker-socket --start recent

# Find who ran Docker CLI commands
ausearch -k docker-cli --interpret

# Generate a summary report of Docker-related audit events
aureport -k | grep docker
```

## Runtime Security Monitoring with Falco

Falco is an open-source runtime security tool that detects anomalous container behavior. It monitors system calls and alerts when containers do things they should not.

Deploy Falco as a Docker container:

```yaml
# docker-compose.falco.yml
# Falco runtime security monitor for container activity auditing
version: "3.8"

services:
  falco:
    image: falcosecurity/falco:latest
    privileged: true
    volumes:
      # Falco needs access to the host kernel and container runtime
      - /var/run/docker.sock:/host/var/run/docker.sock
      - /dev:/host/dev
      - /proc:/host/proc:ro
      - /boot:/host/boot:ro
      - /lib/modules:/host/lib/modules:ro
      - /usr:/host/usr:ro
      - /etc:/host/etc:ro
      - /opt/falco/rules:/etc/falco/rules.d
    environment:
      - HOST_ROOT=/host
```

Create custom Falco rules for Docker auditing:

```yaml
# /opt/falco/rules/docker-audit.yaml
# Custom rules for detecting suspicious container activity

- rule: Container Shell Spawned
  desc: Detect when a shell is started inside a running container
  condition: >
    spawned_process and container and
    proc.name in (bash, sh, zsh, dash, ksh) and
    not proc.pname in (entrypoint.sh, docker-entrypoint, supervisord)
  output: >
    Shell spawned in container
    (user=%user.name container=%container.name
    shell=%proc.name parent=%proc.pname
    command=%proc.cmdline image=%container.image.repository)
  priority: WARNING
  tags: [container, shell, audit]

- rule: Sensitive File Read in Container
  desc: Detect when a container reads sensitive files
  condition: >
    open_read and container and
    (fd.name startswith /etc/shadow or
     fd.name startswith /etc/passwd or
     fd.name startswith /proc/1/environ)
  output: >
    Sensitive file read in container
    (user=%user.name file=%fd.name
    container=%container.name image=%container.image.repository)
  priority: ERROR
  tags: [container, filesystem, audit]

- rule: Outbound Connection from Container
  desc: Detect outbound network connections from containers
  condition: >
    outbound and container and
    not fd.sport in (80, 443, 5432, 6379, 3306)
  output: >
    Unexpected outbound connection from container
    (user=%user.name connection=%fd.name
    container=%container.name image=%container.image.repository)
  priority: NOTICE
  tags: [container, network, audit]
```

## Building a Custom Audit Logger

For situations where you need a tailored audit trail, build a custom Docker event logger:

```bash
#!/bin/bash
# docker-audit-logger.sh
# Custom audit logger that captures Docker events with enriched context

AUDIT_LOG="/var/log/docker-audit-detailed.jsonl"
WEBHOOK_URL="${ALERT_WEBHOOK:-}"

# Process Docker events as JSON and enrich with additional context
docker events --format '{{json .}}' | while read EVENT; do
    # Parse event details
    ACTION=$(echo "$EVENT" | jq -r '.Action')
    CONTAINER_ID=$(echo "$EVENT" | jq -r '.Actor.ID' | cut -c1-12)
    IMAGE=$(echo "$EVENT" | jq -r '.Actor.Attributes.image // "unknown"')
    NAME=$(echo "$EVENT" | jq -r '.Actor.Attributes.name // "unknown"')
    TIMESTAMP=$(echo "$EVENT" | jq -r '.time')

    # Build enriched audit record with human-readable timestamp
    AUDIT_RECORD=$(jq -n \
        --arg action "$ACTION" \
        --arg container "$CONTAINER_ID" \
        --arg image "$IMAGE" \
        --arg name "$NAME" \
        --arg ts "$(date -d @$TIMESTAMP '+%Y-%m-%d %H:%M:%S')" \
        --arg host "$(hostname)" \
        '{timestamp: $ts, host: $host, action: $action, container: $container, name: $name, image: $image}')

    # Write to audit log
    echo "$AUDIT_RECORD" >> "$AUDIT_LOG"

    # Alert on high-priority events
    case "$ACTION" in
        kill|die|oom|destroy)
            echo "[ALERT] $AUDIT_RECORD"
            if [ -n "$WEBHOOK_URL" ]; then
                curl -s -X POST "$WEBHOOK_URL" \
                    -H 'Content-type: application/json' \
                    -d "{\"text\": \"Docker Audit Alert: $ACTION on $NAME ($IMAGE)\"}"
            fi
            ;;
    esac
done
```

Run the logger as a systemd service:

```ini
# /etc/systemd/system/docker-audit.service
# Systemd service for the custom Docker audit logger

[Unit]
Description=Docker Container Audit Logger
After=docker.service
Requires=docker.service

[Service]
Type=simple
ExecStart=/opt/audit/docker-audit-logger.sh
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the audit service
sudo systemctl daemon-reload
sudo systemctl enable docker-audit
sudo systemctl start docker-audit
```

## Auditing Docker Exec Commands

`docker exec` is one of the most security-sensitive operations. Someone running `docker exec` can access any data inside a container. Track these operations specifically:

```bash
#!/bin/bash
# audit-exec.sh
# Monitors and logs all docker exec commands run against containers

# Use the Docker events API to filter exec-related events
docker events --filter event=exec_create --filter event=exec_start \
    --format '{{json .}}' | while read EVENT; do

    ACTION=$(echo "$EVENT" | jq -r '.Action')
    CONTAINER=$(echo "$EVENT" | jq -r '.Actor.Attributes.name // .Actor.ID')
    EXEC_CMD=$(echo "$EVENT" | jq -r '.Actor.Attributes.execID // "unknown"')

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] EXEC $ACTION on $CONTAINER (exec_id: $EXEC_CMD)" \
        >> /var/log/docker-exec-audit.log
done
```

## Generating Audit Reports

Compile audit data into periodic reports:

```bash
#!/bin/bash
# audit-report.sh
# Generates a daily audit summary from Docker audit logs

AUDIT_LOG="/var/log/docker-audit-detailed.jsonl"
REPORT_DATE="${1:-$(date +%Y-%m-%d)}"

echo "=== Docker Audit Report for $REPORT_DATE ==="
echo ""

# Count events by action type
echo "Event Summary:"
grep "$REPORT_DATE" "$AUDIT_LOG" | jq -r '.action' | sort | uniq -c | sort -rn

echo ""
echo "Container Lifecycle Events:"
grep "$REPORT_DATE" "$AUDIT_LOG" | \
    jq -r 'select(.action | test("create|start|stop|kill|die|destroy")) |
    "\(.timestamp) \(.action) \(.name) (\(.image))"'

echo ""
echo "Unique Images Used:"
grep "$REPORT_DATE" "$AUDIT_LOG" | jq -r '.image' | sort -u

echo ""
echo "Total Events: $(grep -c "$REPORT_DATE" "$AUDIT_LOG")"
```

## Shipping Audit Logs to a Central System

Forward Docker audit data to your centralized logging platform:

```yaml
# filebeat.yml
# Filebeat configuration for shipping Docker audit logs to Elasticsearch

filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/docker-audit-detailed.jsonl
    json.keys_under_root: true
    json.add_error_key: true
    fields:
      log_type: docker_audit

output.elasticsearch:
  hosts: ["https://elasticsearch.example.com:9200"]
  index: "docker-audit-%{+yyyy.MM.dd}"
  username: "filebeat"
  password: "${ES_PASSWORD}"
```

## Summary

Auditing Docker container activity requires a layered approach. Docker events give you lifecycle visibility. Linux auditd tracks system-level access to Docker resources. Falco monitors runtime behavior and detects anomalies. Custom loggers fill gaps with enriched context. Ship everything to a central logging system and generate regular reports. The key is to set up auditing before you need it, because after an incident is too late to start collecting evidence.
