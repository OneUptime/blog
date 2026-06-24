# How to Audit User Activity in Portainer Business Edition - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Audit, Compliance, BE

Description: Learn how to access and analyze user activity audit logs in Portainer Business Edition to track who did what, when, and from where in your container infrastructure.

## Introduction

Portainer Business Edition includes activity logs for actions taken in Portainer, along with separate authentication logs for login-related events. This audit trail is essential for security investigations, compliance requirements (SOC2, PCI-DSS, HIPAA), and understanding what changed before an incident.

## Prerequisites

- Portainer Business Edition (BE)
- Admin access to Portainer
- Understanding of what events you want to audit

## What Gets Logged

Portainer BE provides two relevant audit views:

| Log | Details |
|-----|---------|
| Activity | A read-only log of all actions taken in Portainer. The UI shows the date and time, user, endpoint, and action for each entry. |
| Authentication | A read-only log of authentication events. The UI shows the date and time, origin IP address, context, user, and result for each entry. |

## Step 1: Access Activity Logs in the UI

1. Log into Portainer BE as an administrator.
2. Expand **Logs** in the left sidebar.
3. Click **Activity**.
4. The log view shows:
   - **Timestamp**: When the action occurred
   - **User**: Who performed the action
   - **Action**: What was done
   - **Endpoint**: Which environment the action targeted

If you need login, logout, or failed login events, open **Logs** > **Authentication** instead.

## Step 2: Filter Audit Logs

Apply filters to find specific events:

1. **Time range**: Filter to a specific date/time window
2. **User**: Show actions by a specific user
3. **Keyword search**: Search for actions using a keyword
4. **Environment**: Show activity in specific environments

```bash
# Access activity logs via Portainer API

API_KEY="your-api-key"
PORTAINER_URL="https://portainer.example.com"

# Get activity logs (response includes logs and totalCount)
curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/logs?limit=100&offset=0" | jq .

# Filter by username
curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/logs?limit=100&offset=0&username=admin" | jq '.logs'

# Filter by time range (Unix timestamps)
START_TIME=1711670400  # 2024-03-29 00:00:00 UTC
END_TIME=1711756800    # 2024-03-30 00:00:00 UTC

curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/logs?limit=100&offset=0&after=${START_TIME}&before=${END_TIME}" | jq '.logs'
```

## Step 3: Export Audit Logs

### Via the UI

1. In the Activity logs view, set the date range and any filters you need.
2. Click **Export as CSV**.
3. Download the file.

### Via the API

```bash
#!/bin/bash
# export-audit-logs.sh

PORTAINER_URL="https://portainer.example.com"
API_KEY="your-api-key"
OUTPUT_FILE="audit-logs-$(date +%Y%m%d).csv"

# Calculate last 30 days
END_TIME=$(date +%s)
START_TIME=$((END_TIME - 30 * 24 * 3600))

echo "Exporting activity logs from the last 30 days..."

curl -fsS -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/logs.csv?after=${START_TIME}&before=${END_TIME}&limit=1000000" \
  -o "$OUTPUT_FILE"

echo "Exported activity log CSV to $OUTPUT_FILE"
```

## Step 4: Audit Log Analysis

```bash
# Find all failed login attempts (authentication log type 2 = failure)
curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/authlogs?limit=1000&offset=0" | \
  jq '[.[] | select(.type == 2)] | length'

# List unique users for delete-related activity
curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/logs?keyword=delete&limit=100&offset=0" | \
  jq '[.logs[].username] | unique'

# Search for settings-related activity in the last 7 days
WEEK_AGO=$(( $(date +%s) - 7 * 24 * 3600 ))
curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/logs?after=${WEEK_AGO}&keyword=settings&limit=100&offset=0" | \
  jq '.logs'
```

## Step 5: Alert on Suspicious Activity

```bash
#!/bin/bash
# detect-suspicious-activity.sh - Run periodically

PORTAINER_URL="https://portainer.example.com"
API_KEY="your-api-key"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK"

# Get logs from the last hour
ONE_HOUR_AGO=$(( $(date +%s) - 3600 ))

AUTH_LOGS=$(curl -fsS -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/authlogs?after=${ONE_HOUR_AGO}&limit=1000&offset=0")

# Check for multiple failed logins (brute force indicator, type 2 = failure)
FAILED_LOGINS=$(printf '%s' "$AUTH_LOGS" | jq '[.[] | select(.type == 2)] | length')

if [ "$FAILED_LOGINS" -gt 10 ]; then
  MESSAGE="ALERT: $FAILED_LOGINS failed login attempts in the last hour on Portainer"
  curl -s -X POST "$SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$MESSAGE\"}"
fi

# Check for bursts of delete-related activity
DELETE_ACTIONS=$(curl -fsS -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/logs?after=${ONE_HOUR_AGO}&keyword=delete&limit=100&offset=0" | \
  jq '.totalCount')

if [ "$DELETE_ACTIONS" -gt 5 ]; then
  MESSAGE="ALERT: $DELETE_ACTIONS delete-related actions in the last hour on Portainer"
  curl -s -X POST "$SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$MESSAGE\"}"
fi
```

## Step 6: Ship Logs to a SIEM

Portainer 2.20 and later can stream authentication and activity logs to your SIEM in Syslog format. This is an experimental feature, and the Portainer CLI flags must be placed after the image name:

```bash
# Option 1: Stream logs directly to a Syslog/SIEM endpoint
docker run -d \
  -p 8000:8000 -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:sts \
  --syslog-address=siem.company.com \
  --syslog-port=514 \
  --syslog-protocol=tcp \
  --syslog-format=rfc5424 \
  --syslog-source-hostname=portainer-prod

# Option 2: Use TLS for the SIEM connection
docker run -d \
  -p 8000:8000 -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /opt/portainer/syslog-certs:/syslog/certs:ro \
  portainer/portainer-ee:sts \
  --syslog-address=siem.company.com \
  --syslog-port=6514 \
  --syslog-protocol=tcp+tls \
  --syslog-ca-cert=/syslog/certs/ca.pem \
  --syslog-cert=/syslog/certs/cert.pem \
  --syslog-key=/syslog/certs/key.pem
```

## Conclusion

Portainer BE's activity logs provide visibility into actions taken within your container management platform, while authentication logs capture login-related events. Use the UI for interactive investigation, the API for programmatic access and automated reporting, and Portainer's Syslog integration when you need to stream audit data to a SIEM.
