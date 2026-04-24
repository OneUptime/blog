# How to View Authentication Logs in Portainer Business

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Business Edition, Authentication, Audit Log, Security, Compliance

Description: Learn how to view and analyze authentication logs in Portainer Business Edition to track login attempts, identify unauthorized access, and meet audit compliance requirements.

---

Portainer Business Edition logs authentication actions such as successful and failed logins. These logs are essential for security auditing and identifying repeated failed authentication attempts or compromised accounts.

## Accessing Authentication Logs

1. Log in to Portainer with an admin account.
2. From the menu, expand **Logs** and select **Authentication**.
3. Use the date range filter and search to narrow the results.

## What Is Logged

| Event | Logged Data |
|---|---|
| Successful login | Date/time, origin IP address, context, user, result |
| Failed login | Date/time, origin IP address, context, user, result |
| Logout | Date/time, origin IP address, context, user, result |

## Filtering Authentication Logs

```bash
# Via API - get authentication logs

TOKEN="your_access_token_here"

curl -k -H "X-API-Key: $TOKEN" \
  "https://localhost:9443/api/useractivity/authlogs?limit=100&offset=0" | \
  jq '.[] | {
    user: .username,
    ip: .origin,
    context: (if .context == 1 then "internal" elif .context == 2 then "ldap" elif .context == 3 then "oauth" else "unknown" end),
    result: (if .type == 1 then "success" elif .type == 2 then "failure" elif .type == 3 then "logout" else "unknown" end),
    time: .timestamp
  }'
```

## Detecting Brute Force Attacks

Look for rapid repeated failures from the same IP:

```bash
# Find IPs with multiple failed logins in the last hour
AFTER=$(date -u -d "1 hour ago" +%s)

curl -k -H "X-API-Key: $TOKEN" \
  "https://localhost:9443/api/useractivity/authlogs?after=$AFTER&limit=1000" | \
  jq -r '.[] | select(.type == 2) | .origin' | sort | uniq -c | sort -rn | head -20

# IPs with repeated failures in a short window are suspicious
```

## Planning Log Retention

1. Portainer's authentication log UI supports viewing, filtering, and exporting logs as CSV.
2. Portainer's official documentation does not describe a retention setting for the authentication log screen.
3. For longer retention or centralized analysis, stream authentication and activity logs to an external SIEM using Portainer's `--syslog-address` and related CLI flags when starting the Portainer container.

## Exporting for SIEM

Export authentication logs regularly for external analysis:

```bash
# Export last 30 days of auth logs to CSV
FROM=$(date -u -d "30 days ago" +%s)
TO=$(date -u +%s)

curl -k -H "X-API-Key: $TOKEN" \
  "https://localhost:9443/api/useractivity/authlogs.csv?after=$FROM&before=$TO&limit=10000" \
  -o auth-logs.csv
```

## Real-time Monitoring with OneUptime

Configure OneUptime to periodically query the Portainer API. Create an API monitor that calls `/api/useractivity/authlogs` and uses a response-body check or JavaScript expression to alert when repeated failed authentication events (`type` = `2`) appear in the returned results.
