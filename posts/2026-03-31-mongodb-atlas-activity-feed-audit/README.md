# How to Set Up Atlas Activity Feeds for Audit Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Audit, Activity Feed, Compliance

Description: Use MongoDB Atlas activity feeds to track who made changes to your organization and projects, and export audit events for compliance and security monitoring.

---

## Overview

MongoDB Atlas maintains an activity feed that records management-plane events such as user logins, cluster configuration changes, database user creation, and network access list modifications. The activity feed is essential for security auditing, compliance requirements, and incident investigation.

## Viewing Activity Feeds in the UI

Atlas provides activity feeds at both the organization and project levels.

```text
Organization Activity Feed:
  Organization Settings > Activity Feed
  - User login events
  - Project creation and deletion
  - API key creation and deletion
  - Billing changes

Project Activity Feed:
  Project Settings > Activity Feed
  - Cluster creates, updates, pauses, and resumes
  - Database user changes
  - IP access list modifications
  - Alert configuration changes
```

## Querying Activity Feeds via the Admin API

```bash
PUBLIC_KEY="your-public-key"
PRIVATE_KEY="your-private-key"
ORG_ID="your-org-id"
PROJECT_ID="your-project-id"

# Get org-level events from the last 24 hours
curl -s -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  --header "Accept: application/vnd.atlas.2023-01-01+json" \
  "https://cloud.mongodb.com/api/atlas/v2/orgs/${ORG_ID}/events?minDate=$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)&itemsPerPage=100" \
  | jq '.results[] | {type: .eventTypeName, user: .username, created: .created}'
```

```bash
# Get project-level events for a specific event type
curl -s -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  --header "Accept: application/vnd.atlas.2023-01-01+json" \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/events?eventType=USER_CREATED&itemsPerPage=50" \
  | jq '.results[]'
```

## Common Event Types to Monitor

```text
Authentication and Access:
  USER_LOGGED_IN, USER_LOGGED_OUT, USER_CREATED, USER_DELETED
  MFA_ENABLED, MFA_DISABLED
  API_KEY_CREATED, API_KEY_DELETED

Cluster Management:
  CLUSTER_CREATED, CLUSTER_DELETED
  CLUSTER_UPDATE_SUBMITTED, CLUSTER_READY
  CLUSTER_PAUSED, CLUSTER_RESUMED

Security Events:
  WHITELIST_CREATED, WHITELIST_DELETED
  DATABASE_USER_CREATED, DATABASE_USER_DELETED
  NETWORK_PERMISSION_ENTRY_ADDED, NETWORK_PERMISSION_ENTRY_REMOVED
```

## Streaming Audit Events to a SIEM

Export Atlas events to an external SIEM (Security Information and Event Management) system using a polling script.

```python
import requests
import json
import time
from datetime import datetime, timedelta, timezone
from requests.auth import HTTPDigestAuth

PUBLIC_KEY = "your-public-key"
PRIVATE_KEY = "your-private-key"
ORG_ID = "your-org-id"
BASE_URL = "https://cloud.mongodb.com/api/atlas/v2"

def fetch_events(since: datetime):
    params = {
        "minDate": since.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "itemsPerPage": 500
    }
    resp = requests.get(
        f"{BASE_URL}/orgs/{ORG_ID}/events",
        auth=HTTPDigestAuth(PUBLIC_KEY, PRIVATE_KEY),
        headers={"Accept": "application/vnd.atlas.2023-01-01+json"},
        params=params,
        timeout=30
    )
    resp.raise_for_status()
    return resp.json().get("results", [])

def send_to_siem(events):
    for event in events:
        # Replace with your SIEM ingestion endpoint
        print(json.dumps(event))

last_polled = datetime.now(timezone.utc) - timedelta(minutes=5)

while True:
    events = fetch_events(last_polled)
    if events:
        send_to_siem(events)
        print(f"Forwarded {len(events)} events")
    last_polled = datetime.now(timezone.utc)
    time.sleep(300)  # Poll every 5 minutes
```

## Enabling Advanced Auditing on Clusters

For data-plane audit logging (who ran which query), enable Advanced Auditing on M10+ clusters.

```bash
curl -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  --header "Content-Type: application/json" \
  --header "Accept: application/vnd.atlas.2023-01-01+json" \
  --request PATCH \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/auditing" \
  --data '{
    "enabled": true,
    "auditFilter": "{\"atype\": {\"$in\": [\"authenticate\", \"createCollection\", \"dropCollection\"]}}",
    "auditAuthorizationSuccess": false
  }'
```

## Summary

Atlas activity feeds capture management-plane events at both organization and project scopes. Query them via the Admin API to filter by event type and date range, forward events to a SIEM by polling the API on a schedule, and enable Advanced Auditing on clusters to capture data-plane operations. Regular review of activity feeds is a key control for detecting unauthorized access and meeting compliance requirements.
