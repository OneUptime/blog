# How to Set Up Alerts Based on Podman Container Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Monitoring, Alert, Notification, Event

Description: Learn how to set up automated alerts based on Podman container events to get notified about critical container state changes.

---

> Automated alerts transform passive event logging into active incident detection - you know about problems before your users do.

Monitoring container events is only half the equation. The other half is acting on them - specifically, getting notified when something goes wrong. By setting up alerts based on Podman events, you can detect container crashes, unexpected restarts, resource exhaustion, and other critical situations automatically. This guide walks you through building an alerting system on top of Podman events.

---

## Identifying Alert-Worthy Events

Not all events need alerts. Focus on events that indicate problems.

```bash
# Critical events that should trigger immediate alerts

# - died with non-zero exit code: Container process exited unexpectedly
# - died with exit code 137: Container may have been killed by OOM
# - kill: Container was forcefully killed

# Warning events that may need attention
# - stop: Container was stopped (may be intentional)
# - restart: Container was restarted (may indicate instability)

# Informational events for tracking
# - start, create, remove: Normal lifecycle operations
```

## Building a Basic Alert Script

```bash
#!/bin/bash
# basic-alerts.sh - Simple event-based alerting

ALERT_LOG="/tmp/podman-alerts.log"

echo "Starting Podman event alerting..."
echo "Alerts logged to: ${ALERT_LOG}"

podman events --format json | while IFS= read -r event; do
    status=$(echo "$event" | jq -r '.Status')
    name=$(echo "$event" | jq -r '.Name // "unknown"')
    event_type=$(echo "$event" | jq -r '.Type')
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$status" in
        died)
            exit_code=$(echo "$event" | jq -r '.ContainerExitCode // "unknown"')
            if [ "$exit_code" = "137" ]; then
                alert="CRITICAL: Container '${name}' died with exit code 137 - possible OOM kill"
                echo "[${timestamp}] ${alert}" | tee -a "$ALERT_LOG"
            elif [ "$exit_code" != "0" ]; then
                alert="CRITICAL: Container '${name}' died with exit code ${exit_code}"
                echo "[${timestamp}] ${alert}" | tee -a "$ALERT_LOG"
            fi
            ;;
        kill)
            alert="WARNING: Container '${name}' was killed"
            echo "[${timestamp}] ${alert}" | tee -a "$ALERT_LOG"
            ;;
    esac
done
```

## Email Alerts

Send email notifications for critical events.

```bash
#!/bin/bash
# email-alerts.sh - Send email alerts for critical Podman events

ALERT_EMAIL="${1:?Usage: $0 <email-address>}"
HOSTNAME=$(hostname)

send_alert_email() {
    local subject="$1"
    local body="$2"

    echo "$body" | mail -s "[Podman Alert] ${subject}" "$ALERT_EMAIL"
    echo "Email alert sent: ${subject}"
}

echo "Starting email alerts for Podman events..."
echo "Alert recipient: ${ALERT_EMAIL}"

podman events --format json \
    --filter event=died | \
while IFS= read -r event; do
    status=$(echo "$event" | jq -r '.Status')
    name=$(echo "$event" | jq -r '.Name // "unknown"')
    timestamp=$(echo "$event" | jq -r '.Time')
    exit_code=$(echo "$event" | jq -r '.ContainerExitCode // "N/A"')

    if [ "$exit_code" = "0" ]; then
        continue
    fi

    subject="Container ${name} - ${status} on ${HOSTNAME}"
    body="Container Alert Details:
Host: ${HOSTNAME}
Container: ${name}
Event: ${status}
Exit Code: ${exit_code}
Time: ${timestamp}

Full event data:
${event}"

    send_alert_email "$subject" "$body"
done
```

## Slack Webhook Alerts

Send alerts to a Slack channel via webhook.

```bash
#!/bin/bash
# slack-alerts.sh - Send Podman alerts to Slack
# Usage: ./slack-alerts.sh <slack-webhook-url>

SLACK_WEBHOOK="${1:?Usage: $0 <slack-webhook-url>}"
HOSTNAME=$(hostname)

send_slack_alert() {
    local color="$1"
    local title="$2"
    local message="$3"

    payload=$(jq -n \
        --arg color "$color" \
        --arg title "$title" \
        --arg text "$message" \
        --arg host "$HOSTNAME" \
        '{
            attachments: [{
                color: $color,
                title: $title,
                text: $text,
                footer: ("Podman on " + $host),
                ts: (now | floor)
            }]
        }')

    curl -s -X POST "$SLACK_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "$payload" > /dev/null
}

echo "Starting Slack alerts..."

podman events --format json | while IFS= read -r event; do
    status=$(echo "$event" | jq -r '.Status')
    name=$(echo "$event" | jq -r '.Name // "unknown"')

    case "$status" in
        died)
            exit_code=$(echo "$event" | jq -r '.ContainerExitCode // "unknown"')
            if [ "$exit_code" = "137" ]; then
                send_slack_alert "danger" \
                    "Possible OOM Kill: ${name}" \
                    "Container died with exit code 137"
            elif [ "$exit_code" != "0" ]; then
                send_slack_alert "danger" \
                    "Container Crashed: ${name}" \
                    "Exit code: ${exit_code}"
            fi
            ;;
        stop)
            send_slack_alert "warning" \
                "Container Stopped: ${name}" \
                "Container was stopped"
            ;;
    esac
done
```

## Restart Loop Detection

Detect containers that are stuck in a restart loop.

```bash
#!/bin/bash
# restart-loop-detector.sh - Detect containers restarting too frequently

MAX_RESTARTS=3
TIME_WINDOW=300  # 5 minutes in seconds

declare -A restart_times

echo "Monitoring for restart loops (max ${MAX_RESTARTS} restarts in ${TIME_WINDOW}s)..."

podman events --filter event=start --format json | while IFS= read -r event; do
    name=$(echo "$event" | jq -r '.Name // "unknown"')
    now=$(date +%s)

    # Get existing restart times for this container
    existing="${restart_times[$name]}"

    # Add current timestamp
    if [ -n "$existing" ]; then
        restart_times[$name]="${existing} ${now}"
    else
        restart_times[$name]="${now}"
    fi

    # Count recent restarts within the time window
    count=0
    new_times=""
    for ts in ${restart_times[$name]}; do
        if [ $((now - ts)) -lt $TIME_WINDOW ]; then
            count=$((count + 1))
            new_times="${new_times} ${ts}"
        fi
    done
    restart_times[$name]="$new_times"

    if [ "$count" -ge "$MAX_RESTARTS" ]; then
        echo "[$(date)] ALERT: Container '${name}' restarted ${count} times in ${TIME_WINDOW}s - possible restart loop!"
    fi
done
```

## Running Alerts as a Systemd Service

Make the alerting service persistent.

```bash
# Create systemd service for alerts
mkdir -p ~/.config/systemd/user/

cat > ~/.config/systemd/user/podman-alerts.service << 'EOF'
[Unit]
Description=Podman Container Event Alerts
After=default.target

[Service]
Type=simple
ExecStart=/usr/local/bin/podman-alerts.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF

# Enable and start
systemctl --user daemon-reload
systemctl --user enable podman-alerts.service
systemctl --user start podman-alerts.service

# View alert logs
journalctl --user -u podman-alerts.service -f
```

## Testing Alerts

Trigger test events to verify alerts work correctly.

```bash
#!/bin/bash
# test-alerts.sh - Generate events that should trigger alerts

echo "Testing died event with non-zero exit code..."
podman run --name alert-test-crash alpine sh -c "exit 1"
podman rm alert-test-crash

echo "Testing normal stop (should not alert or only warn)..."
podman run -d --name alert-test-stop alpine sleep 300
podman stop alert-test-stop
podman rm alert-test-stop

echo "Alert test complete. Check your alert destinations."
```

## Cleanup

```bash
# Remove test containers
podman rm -f alert-test-crash alert-test-stop 2>/dev/null

# Remove alert log
rm -f /tmp/podman-alerts.log
```

## Summary

Setting up alerts based on Podman container events ensures you are notified immediately when containers crash, run out of memory, or enter restart loops. Whether you send alerts via email, Slack webhooks, or custom scripts, the pattern is the same: filter the event stream for critical statuses, extract relevant details, and forward the alert. With a systemd service for reliability and restart loop detection for advanced scenarios, you can build a robust alerting system that keeps you informed about your container environment.
