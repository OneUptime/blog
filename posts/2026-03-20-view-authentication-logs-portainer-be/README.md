# How to Access Authentication Logs in Portainer Business Edition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Business Edition, Authentication, Security Logs, Compliance

Description: Learn how to access and analyze authentication logs in Portainer Business Edition to monitor login activity and detect unauthorized access attempts.

## Authentication Logs Overview

Portainer Business Edition records the following authentication events:

- Successful logins (with timestamp, origin, and username).
- Failed login attempts.
- Logout events.

## Accessing Authentication Logs

1. Log in to Portainer BE as an administrator.
2. In the left sidebar, expand **Logs**.
3. Click **Authentication**.
4. View the list of authentication events.

## What's Shown in the Log

Each entry shows:
- **Timestamp**: When the event occurred (Unix timestamp).
- **Username**: Who attempted to authenticate.
- **Authentication context**: Login method (internal, LDAP, or OAuth).
- **Type**: Authentication success, authentication failure, or logout.
- **Origin**: The source IP address the request came from.

## Filtering Authentication Logs

In the Portainer UI:
- Filter by **username** to track a specific user's login history.
- Filter by **status** to see only failures (for security review).
- Filter by **date range** for incident investigation.

## Retrieving Authentication Logs via API

The `GET /api/useractivity/authlogs` endpoint returns a JSON array of entries. Each entry has the shape `{id, timestamp, username, type, origin, context}` where `type` is an integer (`1` = success, `2` = failure, `3` = logout) and `context` is an integer (`1` = internal, `2` = LDAP, `3` = OAuth).

```bash
# Get all authentication logs

curl -s "https://portainer.mycompany.com/api/useractivity/authlogs" \
  -H "X-API-Key: ${ADMIN_API_KEY}" | \
  jq '[.[] | {
    time: .timestamp,
    user: .username,
    type: .type,
    ip: .origin
  }]'

# Get only failed attempts (type == 2)
curl -s "https://portainer.mycompany.com/api/useractivity/authlogs" \
  -H "X-API-Key: ${ADMIN_API_KEY}" | \
  jq '[.[] | select(.type == 2)]'
```

## Detecting Brute Force Attacks

```bash
#!/bin/bash
# Alert on accounts with multiple failed login attempts

THRESHOLD=5  # Alert if 5 or more failures recorded

curl -s "https://portainer.mycompany.com/api/useractivity/authlogs" \
  -H "X-API-Key: ${ADMIN_API_KEY}" | \
  jq --argjson threshold "$THRESHOLD" '
    [.[] | select(.type == 2)] |
    group_by(.username) |
    .[] |
    select(length >= $threshold) |
    {
      username: .[0].username,
      failures: length,
      first_attempt: .[0].timestamp,
      last_attempt: .[-1].timestamp,
      ips: [.[].origin] | unique
    }
  '
```

## Monitoring Authentication Events in Real-Time

```bash
# Stream Portainer logs and filter for auth events
docker logs -f portainer 2>&1 | \
  grep -E "login|logout|authenticated|failed" | \
  while read line; do
    echo "[$(date +%H:%M:%S)] $line"
    # Optionally send to Slack or PagerDuty
  done
```

## Exporting Authentication Logs for Retention

Portainer BE does not expose a UI-configurable retention period for authentication logs. For long-term retention, export the logs periodically:

- The UI offers a **CSV export** button on the Authentication logs page.
- Programmatically, call `GET /api/useractivity/authlogs.csv` for CSV, or `GET /api/useractivity/authlogs` for JSON. Both accept `before` and `after` query parameters (Unix timestamps) to scope the range.

## Integrating with SIEM

Forward authentication events to your Security Information and Event Management (SIEM) system. The snippet below pulls entries since the last export (Unix timestamp) and pushes them to Splunk via the HTTP Event Collector:

```bash
# Forward Portainer auth logs to Splunk via HTTP Event Collector
curl -s "https://portainer.mycompany.com/api/useractivity/authlogs?after=${LAST_EXPORT}" \
  -H "X-API-Key: ${ADMIN_API_KEY}" | \
  jq -c '.[]' | while read event; do
    curl -s -X POST "https://splunk.mycompany.com:8088/services/collector" \
      -H "Authorization: Splunk ${SPLUNK_HEC_TOKEN}" \
      -d "{\"sourcetype\": \"portainer:auth\", \"event\": ${event}}"
  done
```

Portainer BE 2.20+ also supports streaming logs directly to a SIEM over syslog (RFC 5424) via container startup flags. See the official [SIEM integration docs](https://docs.portainer.io/advanced/siem) for details.

## Conclusion

Authentication logs in Portainer Business Edition are a critical security asset. Review them regularly for suspicious patterns, integrate with your SIEM for automated alerting, and maintain sufficient retention for compliance requirements.
