# How to Set Up Slack Alert Notifications from RHEL Using Webhooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Slack, Webhooks, Alerting, Monitoring

Description: Send system alerts from RHEL servers to Slack channels using incoming webhooks for real-time notification of critical events.

---

Slack incoming webhooks provide a simple way to send notifications from RHEL servers to your team's Slack channels. No agent installation is required, just curl and a webhook URL.

## Setting Up the Slack Webhook

First, create an incoming webhook in Slack:

1. Go to your Slack workspace settings and create a new app
2. Enable "Incoming Webhooks" for the app
3. Add a webhook to your desired channel
4. Copy the webhook URL

## Basic Alert Script

```bash
#!/bin/bash
# /usr/local/bin/slack-alert.sh
# Send a formatted message to Slack

WEBHOOK_URL="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"

send_slack() {
    local severity="$1"
    local message="$2"

    # Set color based on severity
    case "$severity" in
        critical) COLOR="#FF0000" ;;
        warning)  COLOR="#FFA500" ;;
        info)     COLOR="#36A64F" ;;
        *)        COLOR="#808080" ;;
    esac

    curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"attachments\": [{
          \"color\": \"$COLOR\",
          \"title\": \"Alert from $(hostname)\",
          \"text\": \"$message\",
          \"fields\": [
            {\"title\": \"Host\", \"value\": \"$(hostname)\", \"short\": true},
            {\"title\": \"Time\", \"value\": \"$(date '+%Y-%m-%d %H:%M:%S')\", \"short\": true}
          ]
        }]
      }"
}

# Usage
send_slack "$1" "$2"
```

## Disk Space Monitoring with Slack

```bash
#!/bin/bash
# /usr/local/bin/check-disk-slack.sh

WEBHOOK_URL="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
WARNING_THRESHOLD=80
CRITICAL_THRESHOLD=90

df -h --output=target,pcent | tail -n +2 | while read mount usage; do
    PERCENT=${usage%\%}

    if [ "$PERCENT" -gt "$CRITICAL_THRESHOLD" ]; then
        curl -s -X POST "$WEBHOOK_URL" \
          -H "Content-Type: application/json" \
          -d "{\"text\": \":red_circle: *CRITICAL* - Disk usage on \`$(hostname)\`: \`$mount\` at *${PERCENT}%*\"}"
    elif [ "$PERCENT" -gt "$WARNING_THRESHOLD" ]; then
        curl -s -X POST "$WEBHOOK_URL" \
          -H "Content-Type: application/json" \
          -d "{\"text\": \":warning: *WARNING* - Disk usage on \`$(hostname)\`: \`$mount\` at *${PERCENT}%*\"}"
    fi
done
```

## Service Down Alerts

```bash
#!/bin/bash
# /usr/local/bin/check-services-slack.sh

WEBHOOK_URL="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
SERVICES="httpd postgresql sshd firewalld"

for svc in $SERVICES; do
    if ! systemctl is-active --quiet "$svc"; then
        curl -s -X POST "$WEBHOOK_URL" \
          -H "Content-Type: application/json" \
          -d "{\"text\": \":x: *SERVICE DOWN* on \`$(hostname)\`: \`$svc\` is not running\"}"
    fi
done
```

## Integrating with systemd Service Failures

Trigger a Slack alert whenever any systemd service fails:

```bash
# Create a systemd service that sends Slack alerts on failure
sudo tee /etc/systemd/system/slack-notify@.service << 'EOF'
[Unit]
Description=Send Slack notification for %i failure

[Service]
Type=oneshot
ExecStart=/usr/local/bin/slack-alert.sh critical "Service %i has failed on %H"
EOF

# Add OnFailure to a service you want to monitor
sudo mkdir -p /etc/systemd/system/httpd.service.d/
sudo tee /etc/systemd/system/httpd.service.d/slack-notify.conf << 'EOF'
[Unit]
OnFailure=slack-notify@httpd.service
EOF

sudo systemctl daemon-reload
```

## Schedule Regular Checks

```bash
# Add monitoring checks to cron
sudo tee /etc/cron.d/slack-monitoring << 'EOF'
*/5 * * * * root /usr/local/bin/check-disk-slack.sh 2>/dev/null
*/2 * * * * root /usr/local/bin/check-services-slack.sh 2>/dev/null
EOF
```

Keep your webhook URL in a separate config file with restricted permissions rather than hardcoding it in scripts.
