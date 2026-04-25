# How to Configure Activity Logs in Portainer Business Edition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Business Edition, Activity Logs, Auditing, Compliance, Docker

Description: Learn how to configure and use activity logs in Portainer Business Edition to track user actions, container changes, and stack deployments for security auditing.

---

Portainer Business Edition includes authentication and activity logs that record sign-ins and actions such as who deployed a stack, who restarted a container, and who changed settings. This is essential for compliance and incident investigation.

## Prerequisites

- Portainer Business Edition with a valid license
- Admin access to Portainer

## Enabling Activity Logging

Portainer Business Edition exposes activity logs in the UI. Verify activity logging is working:

1. In the Portainer menu, expand **Logs** and select **Activity**.
2. Confirm recent actions appear in the log.
3. Use the date range, user, and environment filters as needed.

## What Gets Logged

| Action | Logged Data |
|---|---|
| Authentication events (login success/failure, logout) | Date and time, origin IP address, context, user, result |
| User activity events (for example stack deploy/update, container actions, settings changes) | Date and time, user, endpoint/context, action, inspectable payload |

## Viewing Activity Logs

In Portainer, expand **Logs** and select **Activity** for activity logs or **Authentication** for authentication events:

1. Select a date range.
2. Filter by user or environment, or search by keyword.
3. Export logs as CSV for external analysis.

## Streaming to an External System

For SIEM integration, Portainer can stream authentication and activity logs to syslog. This is an experimental feature configured with Portainer CLI flags, which must be specified after the image name:

```bash
# Start Portainer with syslog streaming enabled

docker run -d -p 8000:8000 -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:sts \
  --syslog-addr=syslog.mydomain.com \
  --syslog-port=514 \
  --syslog-source-hostname="my-portainer-instance"
```

## Querying Logs via API

```bash
# Query activity logs via the Portainer API using an existing access token
curl -H "X-API-Key: your_api_key_here" \
  "https://localhost:9443/api/useractivity/logs?limit=100&after=1709000000"
```

## Retention and Archiving

Portainer lets you export filtered logs for archiving:

1. In Portainer, open **Logs > Activity** or **Logs > Authentication**.
2. Filter to the desired date range.
3. Click **Export as CSV** or **Export to CSV** to archive the results.

For longer-term retention, Portainer also documents streaming authentication and activity logs to an external SIEM over syslog.
