# How to Integrate RHEL 9 System Alerts with Microsoft Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Microsoft Teams

Description: Step-by-step guide on integrate rhel 9 system alerts with microsoft teams with practical examples and commands.

---

Integrating RHEL 9 alerts with Microsoft Teams keeps your operations team informed through their collaboration platform.

## Create a Teams Webhook

1. In Microsoft Teams, go to the target channel
2. Click "..." then "Manage channel"
3. Select "Edit" under Connectors and add "Incoming Webhook"
4. Name it, select "Create", and copy the webhook URL

## Create the Alert Script

```bash
sudo mkdir -p /opt/scripts
sudo tee /opt/scripts/teams-alert.sh <<'SCRIPT'
#!/bin/bash
WEBHOOK_URL="https://xxxxx.webhook.office.com/xxxxxxxxx"
HOSTNAME=$(hostname)
MESSAGE="$1"
SEVERITY="${2:-warning}"

if [ "$SEVERITY" = "critical" ]; then
  COLOR="FF0000"
else
  COLOR="FFA500"
fi

PAYLOAD=$(python3 - "$HOSTNAME" "$MESSAGE" "$SEVERITY" "$COLOR" "$(date -Is)" <<'PY'
import json
import sys

hostname, message, severity, color, timestamp = sys.argv[1:]

print(json.dumps({
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": color,
    "summary": f"RHEL 9 Alert - {hostname}",
    "title": f"RHEL 9 Alert - {hostname}",
    "text": message,
    "sections": [{
        "facts": [
            {"name": "Host", "value": hostname},
            {"name": "Severity", "value": severity},
            {"name": "Time", "value": timestamp}
        ]
    }]
}))
PY
)

curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
SCRIPT
sudo chmod +x /opt/scripts/teams-alert.sh
```

## Set Up Monitoring Alerts

```bash
# CPU alert

sudo tee /etc/cron.d/teams-cpu-alert <<EOF
*/5 * * * * root CPU=\$(top -bn1 | awk -F'[, ]+' '/Cpu\(s\):/ {print int(100 - \$8)}'); [ \$CPU -gt 90 ] && /opt/scripts/teams-alert.sh "CPU usage at \${CPU}\%" critical
EOF
```

## Test

```bash
/opt/scripts/teams-alert.sh "Test alert from RHEL 9" info
```

## Conclusion

Microsoft Teams webhook integration provides instant alert delivery to your operations channel. Customize alert scripts for disk, CPU, memory, and service monitoring on RHEL 9.
