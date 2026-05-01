# How to Audit User Activity in Portainer Business Edition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Business Edition, Audit Log, Security, Compliance

Description: Learn how to access and interpret user activity audit logs in Portainer Business Edition for compliance and security monitoring.

## What Are Portainer Audit Logs?

Portainer Business Edition includes authentication and activity logs that record:

- User login and logout events.
- Container start, stop, delete operations.
- Stack deployments and updates.
- Registry additions and modifications.
- User and team management changes.
- Environment configuration changes.

## Accessing Audit Logs in Portainer BE

1. Log in to Portainer as an administrator.
2. From the menu, expand **Logs** and select **Authentication** or **Activity**.
3. View the chronological log feed.

## What Each Log Entry Contains

Authentication log entries returned by the API contain fields like:

```json
{
  "id": 42,
  "timestamp": 1774017165,
  "username": "alice.smith",
  "origin": "203.0.113.10",
  "context": 1,
  "type": 1
}
```

Activity log entries include fields such as `action`, `context`, `timestamp`, `username`, and an inspectable `payload`.

## Filtering Audit Logs

Use the filter options in Portainer to narrow down logs by:

- **Username**: Track specific user actions.
- **Time range**: Focus on a specific period.
- **Search keyword**: Search for events or operations such as logins, start, stop, or deploy.
- **Environment**: Focus on a specific cluster.

## Exporting Audit Logs via API

```bash
# View authentication logs

curl -s "https://portainer.mycompany.com/api/useractivity/authlogs" \
  -H "X-API-Key: ${PORTAINER_API_KEY}" | jq '.'

# Filter activity logs by username
curl -s "https://portainer.mycompany.com/api/useractivity/logs?username=alice" \
  -H "X-API-Key: ${PORTAINER_API_KEY}" | jq '.'

# Export activity logs as CSV
curl -s "https://portainer.mycompany.com/api/useractivity/logs.csv" \
  -H "X-API-Key: ${PORTAINER_API_KEY}" \
  -o portainer-activity-$(date +%Y%m%d).csv
```

## Setting Up External Audit Log Forwarding

For long-term retention, Portainer 2.20 and later can stream authentication and activity logs to an external SIEM system in Syslog format:

```bash
# Stream Portainer auth and activity logs to syslog
docker run -d -p 8000:8000 -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:lts \
  --syslog-address=siem.mycompany.com \
  --syslog-port=514 \
  --syslog-protocol=udp \
  --syslog-source-hostname="portainer"
```

## Automating Compliance Reports

```bash
#!/bin/bash
# Generate weekly security report

PORTAINER_URL="https://portainer.mycompany.com"
API_KEY="${PORTAINER_API_KEY}"
ADMIN_USERNAME="${PORTAINER_ADMIN_USERNAME:-admin}"
WEEK_AGO=$(date -d "7 days ago" +%s 2>/dev/null || \
           date -v-7d +%s)

# Get recent actions by the admin user in the past week
ADMIN_ACTIONS=$(curl -s "${PORTAINER_URL}/api/useractivity/logs?after=${WEEK_AGO}&username=${ADMIN_USERNAME}&limit=1000" \
  -H "X-API-Key: ${API_KEY}")

# Count by action type
echo "=== Admin Actions This Week ==="
echo "$ADMIN_ACTIONS" | jq '[.logs[] | .action] | group_by(.) | .[] | {action: .[0], count: length}'

# Count failed login attempts (type 2 = failure)
echo "=== Failed Login Attempts ==="
curl -s "${PORTAINER_URL}/api/useractivity/authlogs?after=${WEEK_AGO}&limit=1000" \
  -H "X-API-Key: ${API_KEY}" | \
  jq '[.[] | select(.type == 2)] | length'
```

## Key Audit Events to Monitor

| Event | Security Concern |
|-------|-----------------|
| Multiple failed logins | Brute force attempt |
| New admin user created | Privilege escalation |
| Environment deleted | Accidental/malicious deletion |
| Registry credentials changed | Credential compromise |
| Security settings changed | Policy bypass attempt |

## Conclusion

Portainer Business Edition's audit logs provide the visibility needed for compliance (SOC 2, ISO 27001, PCI DSS) and security incident investigation. Set up regular log review processes and forward logs to your SIEM for long-term retention and automated alerting.
