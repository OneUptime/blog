# How to Configure Opsgenie Alerting from RHEL 9 Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Opsgenie

Description: Step-by-step guide on configure opsgenie alerting from rhel 9 servers with practical examples and commands.

---

Opsgenie provides alert management and on-call scheduling. This guide covers integrating RHEL 9 system alerts with Opsgenie.

## Create an API Integration in Opsgenie

1. Go to Settings then Integrations
2. Add a new "API" integration
3. Copy the API key

## Create the Alert Script

```bash
sudo tee /opt/scripts/opsgenie-alert.sh <<'SCRIPT'
#!/bin/bash
API_KEY="your-opsgenie-api-key"
MESSAGE="$1"
PRIORITY="${2:-P3}"
HOSTNAME=$(hostname)

curl -s -X POST "https://api.opsgenie.com/v2/alerts" \
  -H "Content-Type: application/json" \
  -H "Authorization: GenieKey $API_KEY" \
  -d "{
    "message": "$MESSAGE",
    "alias": "$(echo $MESSAGE | md5sum | cut -d' ' -f1)",
    "description": "Alert from $HOSTNAME at $(date)",
    "priority": "$PRIORITY",
    "source": "$HOSTNAME",
    "tags": ["rhel9", "production"],
    "entity": "$HOSTNAME"
  }"
SCRIPT
sudo chmod +x /opt/scripts/opsgenie-alert.sh
```

## Configure Alerts

```bash
# Service monitoring
sudo tee /etc/cron.d/opsgenie-service-alert <<EOF
* * * * * root systemctl is-active httpd > /dev/null 2>&1 || /opt/scripts/opsgenie-alert.sh "httpd is down on \$(hostname)" P1
EOF

# Disk space monitoring
sudo tee /etc/cron.d/opsgenie-disk-alert <<EOF
*/10 * * * * root [ \$(df / --output=pcent | tail -1 | tr -d " %") -gt 90 ] && /opt/scripts/opsgenie-alert.sh "Disk usage critical on \$(hostname)" P2
EOF
```

## Auto-Close Resolved Alerts

```bash
sudo tee /opt/scripts/opsgenie-close.sh <<'SCRIPT'
#!/bin/bash
API_KEY="your-opsgenie-api-key"
ALIAS="$1"

curl -s -X POST "https://api.opsgenie.com/v2/alerts/$ALIAS/close?identifierType=alias" \
  -H "Content-Type: application/json" \
  -H "Authorization: GenieKey $API_KEY" \
  -d '{"note": "Auto-closed: service recovered"}'
SCRIPT
sudo chmod +x /opt/scripts/opsgenie-close.sh
```

## Conclusion

Opsgenie integration with RHEL 9 provides alert management with on-call routing and escalation. Use deduplication aliases to prevent alert storms and auto-close scripts for resolved issues.

