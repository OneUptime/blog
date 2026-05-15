# How to Integrate RHEL System Alerts with Microsoft Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Microsoft Teams, Alerting, Webhook, Monitoring

Description: Send RHEL system alerts to Microsoft Teams channels using incoming webhooks for real-time team notifications.

---

Microsoft Teams incoming webhooks allow you to send alert notifications from RHEL servers directly to a Teams channel. This is useful for teams that use Teams as their primary communication tool.

## Setting Up the Teams Webhook

1. In Microsoft Teams, go to the channel where you want alerts
2. Click the three dots menu and select "Workflows"
3. Choose the "Send webhook alerts to a channel" template
4. Save the workflow and copy the webhook URL

## Basic Alert Function

Create a reusable function for sending Teams messages:

```bash
#!/bin/bash
# /usr/local/bin/teams-alert.sh

# Send alert messages to Microsoft Teams

CONFIG_FILE="/etc/teams-alert.conf"

if [ -r "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

: "${WEBHOOK_URL:?Set WEBHOOK_URL in /etc/teams-alert.conf}"

send_teams_alert() {
    local title="$1"
    local message="$2"
    local color="$3"  # hex color without #
    local payload

    payload=$(TITLE="$title" MESSAGE="$message" COLOR="${color:-FF0000}" HOST="$(hostname)" TIME="$(date '+%Y-%m-%d %H:%M:%S')" python3 - << 'PY'
import json
import os

print(json.dumps({
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": os.environ["COLOR"],
    "summary": os.environ["TITLE"],
    "sections": [{
        "activityTitle": os.environ["TITLE"],
        "facts": [
            {"name": "Host", "value": os.environ["HOST"]},
            {"name": "Time", "value": os.environ["TIME"]},
            {"name": "Details", "value": os.environ["MESSAGE"]}
        ],
        "markdown": True
    }]
}))
PY
)

    curl -fsS -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "$payload"
}

# If called directly with arguments
if [ $# -ge 2 ]; then
    send_teams_alert "$1" "$2" "$3"
fi
```

## Disk Space Monitoring

```bash
#!/bin/bash
# /usr/local/bin/check-disk-teams.sh
source /usr/local/bin/teams-alert.sh

THRESHOLD=90

df -h --output=target,pcent | tail -n +2 | while read mount usage; do
    PERCENT=${usage%\%}
    if [ "$PERCENT" -gt "$THRESHOLD" ]; then
        send_teams_alert \
          "Disk Space Critical" \
          "Mount point $mount is at ${PERCENT}% on $(hostname)" \
          "FF0000"
    fi
done
```

## Service Failure Alerts

```bash
#!/bin/bash
# /usr/local/bin/check-services-teams.sh
source /usr/local/bin/teams-alert.sh

SERVICES="httpd postgresql sshd firewalld chronyd"

for svc in $SERVICES; do
    if ! systemctl is-active --quiet "$svc"; then
        send_teams_alert \
          "Service Down: $svc" \
          "The $svc service is not running on $(hostname). Check immediately." \
          "FF0000"
    fi
done
```

## High Load Alert

```bash
#!/bin/bash
# /usr/local/bin/check-load-teams.sh
source /usr/local/bin/teams-alert.sh

CPU_COUNT=$(nproc)
LOAD=$(awk '{print $1}' /proc/loadavg)

if awk -v load="$LOAD" -v cpu_count="$CPU_COUNT" 'BEGIN { exit !(load > cpu_count) }'; then
    send_teams_alert \
      "High CPU Load" \
      "Load average is $LOAD (threshold: $CPU_COUNT cores) on $(hostname)" \
      "FFA500"
fi
```

## Scheduling the Checks

```bash
# Store the Teams webhook URL outside the shared script
sudo install -m 600 /dev/null /etc/teams-alert.conf
echo 'WEBHOOK_URL="https://YOUR_WORKFLOW_OR_WEBHOOK_URL"' | sudo tee /etc/teams-alert.conf >/dev/null

# Set up cron jobs for all monitoring scripts
sudo tee /etc/cron.d/teams-monitoring << 'EOF'
*/5 * * * * root /usr/local/bin/check-disk-teams.sh 2>/dev/null
*/2 * * * * root /usr/local/bin/check-services-teams.sh 2>/dev/null
*/5 * * * * root /usr/local/bin/check-load-teams.sh 2>/dev/null
EOF

# Set proper permissions on the scripts
sudo chmod 750 /usr/local/bin/teams-alert.sh
sudo chmod 750 /usr/local/bin/check-*-teams.sh
```

Storing the webhook URL in a separate config file with restricted permissions keeps it out of scripts that might be shared or version-controlled.
