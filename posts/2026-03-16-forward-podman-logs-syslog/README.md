# How to Forward Podman Container Logs to syslog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging, Syslog

Description: Learn how to forward Podman container logs to a syslog server for centralized log management, using journald integration and direct syslog forwarding approaches.

---

> Forwarding container logs to syslog centralizes your logging infrastructure and integrates containers with existing enterprise log management systems.

Many organizations already have syslog-based logging infrastructure in place. Forwarding Podman container logs to syslog allows containers to fit into existing log pipelines without requiring new tooling. This guide covers multiple approaches to get container logs into syslog.

---

## Approach 1: journald to syslog

The simplest method uses Podman's journald log driver, then forwards from the journal to syslog.

```bash
# Step 1: Run the container with the journald driver

podman run -d \
  --log-driver journald \
  --log-opt tag="myapp" \
  --name web \
  nginx:latest

# Step 2: Verify logs appear in the journal
journalctl CONTAINER_NAME=web -n 5 --no-pager

# Step 3: Configure rsyslog to read from journald
# Edit /etc/rsyslog.conf or create /etc/rsyslog.d/podman.conf
sudo tee /etc/rsyslog.d/podman.conf << 'EOF'
# Load the imjournal module (usually already loaded)
module(load="imjournal")

# Forward container logs to a file
if $programname == 'myapp' then /var/log/containers/myapp.log
& stop

# Or forward to a remote syslog server
# if $programname == 'myapp' then @@syslog-server.example.com:514
# & stop
EOF

# Step 4: Restart rsyslog
sudo mkdir -p /var/log/containers
sudo systemctl restart rsyslog

# Step 5: Verify logs arrive
tail -f /var/log/containers/myapp.log
```

## Approach 2: Direct syslog Forwarding with logger

Use a shell pipeline to pipe container logs directly to syslog.

```bash
# Forward logs to local syslog using logger
podman logs -f my-container 2>&1 | logger -t my-container -p local0.info &

# Forward to a remote syslog server using logger
podman logs -f my-container 2>&1 | logger -t my-container -n syslog-server.example.com -P 514 &

# Forward with proper facility and severity
podman logs -f my-container 2>&1 | logger -t my-container -p local0.info &

# Forward stderr as errors
podman logs -f my-container 1>/dev/null 2> >(logger -t my-container -p local0.err) &
```

## Approach 3: Configure rsyslog to Watch Log Files

Point rsyslog directly at Podman's log files for containers using the `k8s-file` log driver.

```bash
# Run the container with a file-based log driver
podman run -d \
  --log-driver k8s-file \
  --name my-container \
  nginx:latest

# Find the container log file path
podman inspect --format '{{.HostConfig.LogConfig.Path}}' my-container

# Create an rsyslog config to watch the log file
sudo tee /etc/rsyslog.d/podman-files.conf << 'EOF'
module(load="imfile")

# Watch the log file path reported by podman inspect
input(type="imfile"
  File="/var/lib/containers/storage/overlay-containers/*/userdata/ctr.log"
  Tag="podman"
  Severity="info"
  Facility="local0")

# Forward to remote syslog
local0.* @@syslog-server.example.com:514
EOF

sudo systemctl restart rsyslog
```

## Configure syslog Forwarding with Tags

Use tags to identify different containers in syslog.

```bash
# Run containers with descriptive tags
podman run -d \
  --log-driver journald \
  --log-opt tag="web-frontend" \
  --name web \
  nginx:latest

podman run -d \
  --log-driver journald \
  --log-opt tag="api-backend" \
  --name api \
  my-api:latest

# Configure rsyslog to route based on tags
sudo tee /etc/rsyslog.d/podman-routing.conf << 'EOF'
# Route by tag to separate log files
if $programname == 'web-frontend' then /var/log/containers/web.log
& stop

if $programname == 'api-backend' then /var/log/containers/api.log
& stop

# Catch-all for other containers
if $programname startswith 'podman' then /var/log/containers/other.log
& stop
EOF

sudo mkdir -p /var/log/containers
sudo systemctl restart rsyslog
```

## Forward to a Remote syslog Server

```bash
# Configure rsyslog for remote forwarding
sudo tee /etc/rsyslog.d/remote-forward.conf << 'EOF'
# Forward all logs via TCP (@@) - more reliable
# *.* @@syslog-server.example.com:514

# Or forward all logs via UDP (@) - lower overhead
# *.* @syslog-server.example.com:514

# Forward only container logs
if $programname startswith 'podman' or $syslogtag contains 'container' then {
  action(type="omfwd"
    target="syslog-server.example.com"
    port="514"
    protocol="tcp"
    queue.type="LinkedList"
    queue.filename="fwdRule1"
    queue.maxDiskSpace="1g"
    queue.saveOnShutdown="on"
    action.resumeRetryCount="-1")
}
EOF

sudo systemctl restart rsyslog
```

## Create a Log Forwarding Script

```bash
#!/bin/bash
# syslog-forward.sh - Forward Podman container logs to syslog
# Usage: ./syslog-forward.sh <container-name> [syslog-host] [facility]

CONTAINER="$1"
SYSLOG_HOST="${2:-localhost}"
FACILITY="${3:-local0}"

if [ -z "$CONTAINER" ]; then
  echo "Usage: $0 <container-name> [syslog-host] [facility]"
  exit 1
fi

echo "Forwarding logs from $CONTAINER to $SYSLOG_HOST ($FACILITY)"

# Follow container logs and forward to syslog
podman logs -f --timestamps "$CONTAINER" 2>&1 | while IFS= read -r line; do
  if echo "$line" | grep -qi error; then
    logger -t "$CONTAINER" -p "${FACILITY}.err" -n "$SYSLOG_HOST" "$line"
  elif echo "$line" | grep -qi warn; then
    logger -t "$CONTAINER" -p "${FACILITY}.warning" -n "$SYSLOG_HOST" "$line"
  else
    logger -t "$CONTAINER" -p "${FACILITY}.info" -n "$SYSLOG_HOST" "$line"
  fi
done
```

## Test syslog Integration

```bash
# Generate test logs
podman run -d \
  --log-driver journald \
  --log-opt tag="syslog-test" \
  --name syslog-test \
  alpine sh -c 'while true; do echo "Test log at $(date)"; sleep 5; done'

# Verify in local syslog
tail -f /var/log/syslog | grep syslog-test
# or
tail -f /var/log/messages | grep syslog-test

# Verify in journald
journalctl CONTAINER_NAME=syslog-test -f

# Clean up
podman rm -f syslog-test
```

## Summary

Forwarding Podman container logs to syslog can be accomplished through three main approaches: using the journald log driver with rsyslog forwarding, piping logs through `logger`, or configuring rsyslog to watch Podman log files directly. The journald approach is the most robust and provides structured metadata. Use tags to differentiate containers in syslog and configure routing rules to separate logs by service.
