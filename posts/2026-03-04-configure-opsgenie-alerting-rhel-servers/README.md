# How to Configure Opsgenie Alerting from RHEL Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, OpsGenie, Alerting, Monitoring, Linux

Description: Set up Opsgenie alerting from RHEL servers using the Opsgenie API to create and manage incidents for system issues.

---

Opsgenie (now part of Atlassian) is an incident management platform that handles alerting, on-call schedules, and escalations. You can send alerts from RHEL servers directly to Opsgenie using its REST API.

## Setting Up the API Integration

Create an API integration in Opsgenie:

1. Go to Settings > Integrations in Opsgenie
2. Add a new "API" integration
3. Copy the API key

## Basic Alert Script

```bash
#!/bin/bash
# /usr/local/bin/opsgenie-alert.sh
# Send alerts to Opsgenie from RHEL

OPSGENIE_API_KEY="YOUR_API_KEY"
OPSGENIE_URL="https://api.opsgenie.com/v2/alerts"

create_alert() {
    local message="$1"
    local description="$2"
    local priority="$3"  # P1-P5
    local alias="$4"     # Dedup key

    curl -s -X POST "$OPSGENIE_URL" \
      -H "Content-Type: application/json" \
      -H "Authorization: GenieKey $OPSGENIE_API_KEY" \
      -d "{
        \"message\": \"$message\",
        \"alias\": \"${alias:-$(hostname)-alert}\",
        \"description\": \"$description\",
        \"priority\": \"${priority:-P3}\",
        \"source\": \"$(hostname)\",
        \"tags\": [\"rhel\", \"$(hostname)\"],
        \"details\": {
          \"hostname\": \"$(hostname)\",
          \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
          \"uptime\": \"$(uptime -p)\"
        }
      }"
}

close_alert() {
    local alias="$1"

    curl -s -X POST "$OPSGENIE_URL/$alias/close?identifierType=alias" \
      -H "Content-Type: application/json" \
      -H "Authorization: GenieKey $OPSGENIE_API_KEY" \
      -d "{
        \"note\": \"Automatically closed - condition resolved on $(hostname)\"
      }"
}

# Export functions for use in other scripts
export -f create_alert close_alert
export OPSGENIE_API_KEY OPSGENIE_URL
```

## Disk Space Monitoring

```bash
#!/bin/bash
# /usr/local/bin/check-disk-opsgenie.sh
source /usr/local/bin/opsgenie-alert.sh

CRITICAL=90
WARNING=80

df -h --output=target,pcent | tail -n +2 | while read mount usage; do
    PERCENT=${usage%\%}
    ALIAS="disk-$(hostname)-$(echo $mount | tr '/' '-')"

    if [ "$PERCENT" -gt "$CRITICAL" ]; then
        create_alert \
          "Critical: Disk ${PERCENT}% on $(hostname):$mount" \
          "Filesystem $mount has reached ${PERCENT}% usage. Immediate action required." \
          "P1" \
          "$ALIAS"
    elif [ "$PERCENT" -gt "$WARNING" ]; then
        create_alert \
          "Warning: Disk ${PERCENT}% on $(hostname):$mount" \
          "Filesystem $mount has reached ${PERCENT}% usage." \
          "P3" \
          "$ALIAS"
    else
        # Auto-close if usage is back to normal
        close_alert "$ALIAS" 2>/dev/null
    fi
done
```

## Service Health Monitoring

```bash
#!/bin/bash
# /usr/local/bin/check-services-opsgenie.sh
source /usr/local/bin/opsgenie-alert.sh

SERVICES="httpd postgresql sshd"

for svc in $SERVICES; do
    ALIAS="service-$(hostname)-${svc}"

    if ! systemctl is-active --quiet "$svc"; then
        create_alert \
          "Service $svc down on $(hostname)" \
          "The $svc service has stopped. Last log: $(journalctl -u $svc -n 1 --no-pager 2>/dev/null)" \
          "P2" \
          "$ALIAS"
    else
        close_alert "$ALIAS" 2>/dev/null
    fi
done
```

## Memory Pressure Alert

```bash
#!/bin/bash
# /usr/local/bin/check-memory-opsgenie.sh
source /usr/local/bin/opsgenie-alert.sh

MEM_PERCENT=$(free | awk '/Mem:/{printf "%.0f", $3/$2 * 100}')
ALIAS="memory-$(hostname)"

if [ "$MEM_PERCENT" -gt 90 ]; then
    create_alert \
      "High memory usage on $(hostname): ${MEM_PERCENT}%" \
      "Memory utilization is at ${MEM_PERCENT}%. Top processes: $(ps aux --sort=-%mem | head -4 | tail -3)" \
      "P2" \
      "$ALIAS"
else
    close_alert "$ALIAS" 2>/dev/null
fi
```

## Schedule the Checks

```bash
sudo tee /etc/cron.d/opsgenie-checks << 'EOF'
*/5 * * * * root /usr/local/bin/check-disk-opsgenie.sh 2>/dev/null
*/2 * * * * root /usr/local/bin/check-services-opsgenie.sh 2>/dev/null
*/5 * * * * root /usr/local/bin/check-memory-opsgenie.sh 2>/dev/null
EOF
```

The auto-close feature ensures that alerts are automatically resolved in Opsgenie when the condition clears, reducing alert noise.
