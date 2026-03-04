# How to Set Up Slack Alert Notifications from RHEL Using Webhooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Slack

Description: Step-by-step guide on set up slack alert notifications from RHEL using webhooks with practical examples and commands.

---

Slack webhook integration sends RHEL system alerts directly to your team's Slack channels.

## Create a Slack Webhook

1. Go to your Slack workspace settings
2. Navigate to Apps and search for "Incoming Webhooks"
3. Add to a channel and copy the webhook URL

## Create the Alert Script

```bash
sudo tee /opt/scripts/slack-alert.sh <<'SCRIPT'
#!/bin/bash
WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
HOSTNAME=$(hostname)
MESSAGE="$1"
SEVERITY="${2:-warning}"

if [ "$SEVERITY" = "critical" ]; then
  COLOR="#FF0000"
elif [ "$SEVERITY" = "warning" ]; then
  COLOR="#FFA500"
else
  COLOR="#36A64F"
fi

curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    "attachments": [{
      "color": "$COLOR",
      "title": "RHEL Alert - $HOSTNAME",
      "text": "$MESSAGE",
      "fields": [
        {"title": "Host", "value": "$HOSTNAME", "short": true},
        {"title": "Severity", "value": "$SEVERITY", "short": true},
        {"title": "Time", "value": "$(date)", "short": false}
      ]
    }]
  }"
SCRIPT
sudo chmod +x /opt/scripts/slack-alert.sh
```

## Configure System Alerts

```bash
# Disk space monitoring
sudo tee /etc/cron.d/slack-disk-alert <<EOF
*/15 * * * * root [ \$(df / --output=pcent | tail -1 | tr -d " %") -gt 85 ] && /opt/scripts/slack-alert.sh "Disk usage above 85% on root partition" warning
EOF

# Service monitoring
sudo tee /etc/cron.d/slack-service-alert <<EOF
* * * * * root systemctl is-active httpd > /dev/null 2>&1 || /opt/scripts/slack-alert.sh "httpd service is down" critical
EOF
```

## Test the Integration

```bash
/opt/scripts/slack-alert.sh "Test alert from RHEL server" info
```

## Conclusion

Slack webhook integration provides instant team notification for RHEL system alerts. Customize the alert script with additional metrics and thresholds for your environment.

