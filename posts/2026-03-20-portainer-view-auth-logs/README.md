# How to View Authentication Logs in Portainer Business Edition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Authentication, Audit, BE

Description: Learn how to view and analyze authentication logs in Portainer Business Edition to monitor login activity, detect unauthorized access attempts, and maintain security visibility.

## Introduction

Authentication logs in Portainer Business Edition record authentication actions such as successful logins, failed logins, and logouts. Monitoring these logs helps detect brute force attacks, unauthorized access attempts, and anomalous login behavior. This guide covers accessing, analyzing, and exporting Portainer's authentication logs.

## Prerequisites

- Portainer Business Edition (BE)
- Admin access to Portainer
- An API access token if you want to use the API examples

## Step 1: Access Authentication Logs in the UI

1. Log into Portainer BE as an administrator.
2. Expand **Logs** in the left sidebar.
3. Click **Authentication**.

The logs display:
- **Time**: Exact date and time of the event
- **Origin**: Source IP address of the request
- **Context**: Authentication source (`Internal`, `LDAP`, or `OAuth`)
- **User**: Which account was used
- **Result**: Authentication success, authentication failure, or logout

## Step 2: Authentication Log Types

```text
type: 1 - Authentication success
type: 2 - Authentication failure
type: 3 - Logout

context: 1 - Internal authentication
context: 2 - LDAP authentication
context: 3 - OAuth authentication
```

## Step 3: View Logs via the API

```bash
PORTAINER_URL="https://portainer.example.com"
API_KEY="your-api-key"

# Get authentication logs

curl -sS -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/authlogs" | jq .

# Get up to 100 authentication events
curl -sS -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/authlogs?limit=100" | jq .

# Filter for failures only (type 2)
curl -sS -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/authlogs" | \
  jq '[.[] | select(.type == 2)]'

# Get failures from a specific IP
SUSPICIOUS_IP="203.0.113.42"
curl -sS -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/authlogs" | \
  jq --arg ip "$SUSPICIOUS_IP" '[.[] | select(.origin == $ip and .type == 2)]'
```

## Step 4: Detect Brute Force Attempts

```bash
#!/bin/bash
# detect-brute-force.sh

PORTAINER_URL="https://portainer.example.com"
API_KEY="your-api-key"
THRESHOLD=5  # Alert after 5 failures in 10 minutes
AFTER=$(date -u -d '10 minutes ago' +%s)

RECENT_FAILURES=$(curl -sS -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/authlogs?after=${AFTER}&limit=1000" | \
  jq '[.[] | select(.type == 2)]')

# Count failures per IP
echo "$RECENT_FAILURES" | jq -r '.[].origin' | sort | uniq -c | sort -rn | \
  while read -r COUNT IP; do
    if [ "$COUNT" -ge "$THRESHOLD" ]; then
      echo "BRUTE FORCE ALERT: IP $IP had $COUNT failed logins in the last 10 minutes"

      # Auto-block IP (if using UFW)
      # sudo ufw insert 1 deny from $IP to any comment "Auto-blocked: brute force"
    fi
  done
```

## Step 5: Detect Unusual Login Patterns

```bash
#!/bin/bash
# analyze-auth-patterns.sh

PORTAINER_URL="https://portainer.example.com"
API_KEY="your-api-key"

LOGS=$(curl -sS -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/useractivity/authlogs?limit=1000")

echo "=== Authentication Analysis ==="
echo ""

# Unique IPs accessing Portainer
echo "Unique source IPs:"
echo "$LOGS" | jq -r '.[].origin' | sort -u | while read -r IP; do
  COUNT=$(echo "$LOGS" | jq --arg ip "$IP" '[.[] | select(.origin == $ip)] | length')
  echo "  $IP: $COUNT requests"
done

echo ""
echo "Recent failures:"
echo "$LOGS" | jq -r '.[] | select(.type == 2) |
  "  \(.timestamp | strftime("%Y-%m-%d %H:%M:%S")) UTC | User: \(.username) | IP: \(.origin)"'

echo ""
echo "After-hours logins (outside 09:00-18:00 UTC):"
echo "$LOGS" | jq -r '.[] | select(.type == 1) |
  select((.timestamp | strftime("%H") | tonumber) < 9 or
         (.timestamp | strftime("%H") | tonumber) >= 18) |
  "  \(.timestamp | strftime("%Y-%m-%d %H:%M:%S")) UTC | User: \(.username) | IP: \(.origin)"'
```

## Step 6: Export Authentication Logs for Compliance

```bash
#!/bin/bash
# export-auth-logs-monthly.sh - For compliance reporting

PORTAINER_URL="https://portainer.example.com"
API_KEY="your-api-key"
CURRENT_MONTH_START=$(date -u +%Y-%m-01)
PERIOD=$(date -u -d "$CURRENT_MONTH_START -1 month" +%Y-%m)

# Calculate start and end of last month (UTC)
START=$(date -u -d "$CURRENT_MONTH_START -1 month" +%s)
END=$(date -u -d "$CURRENT_MONTH_START -1 second" +%s)

REPORT_FILE="auth-logs-${PERIOD}.json"
LIMIT=500
OFFSET=0
TMP_FILE=$(mktemp)

printf '[]\n' > "$TMP_FILE"

while :; do
  BATCH=$(curl -sS -H "X-API-Key: $API_KEY" \
    "${PORTAINER_URL}/api/useractivity/authlogs?after=${START}&before=${END}&limit=${LIMIT}&offset=${OFFSET}")

  COUNT=$(echo "$BATCH" | jq 'length')
  jq -s '.[0] + .[1]' "$TMP_FILE" <(echo "$BATCH") > "${TMP_FILE}.next"
  mv "${TMP_FILE}.next" "$TMP_FILE"

  if [ "$COUNT" -lt "$LIMIT" ]; then
    break
  fi

  OFFSET=$((OFFSET + LIMIT))
done

mv "$TMP_FILE" "$REPORT_FILE"

TOTAL=$(jq 'length' "$REPORT_FILE")
FAILURES=$(jq '[.[] | select(.type == 2)] | length' "$REPORT_FILE")
SUCCESSES=$(jq '[.[] | select(.type == 1)] | length' "$REPORT_FILE")

echo "Authentication Report: ${PERIOD}"
echo "  Total events:  $TOTAL"
echo "  Successes:     $SUCCESSES"
echo "  Failures:      $FAILURES"
echo "  Report saved:  $REPORT_FILE"
```

## Step 7: Plan for Long-Term Retention

Portainer user authentication logs have a maximum retention of 7 days.

For longer retention, export regularly to external storage or stream authentication and activity logs to an external SIEM provider in Syslog format:

```bash
# After generating the monthly report file
aws s3 cp "$REPORT_FILE" s3://your-compliance-bucket/portainer/auth-logs/
```

## Conclusion

Authentication logs in Portainer BE provide essential security visibility into who is accessing your container management platform and when. Monitor these logs regularly for brute force patterns, unusual login times, or access from unknown IPs. Export monthly for compliance reporting and configure alerts to notify your security team of suspicious activity in real time.
