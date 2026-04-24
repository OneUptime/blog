# Validation Summary: How to Audit User Activity in Portainer Business Edition - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer HTTP API
- Bash
- `curl`
- `jq`
- Syslog / SIEM integration

## Sources Consulted
- [Portainer Logs](https://docs.portainer.io/admin/logs.md)
- [Portainer Activity Logs](https://docs.portainer.io/admin/logs/activity.md)
- [Portainer Authentication Logs](https://docs.portainer.io/admin/logs/authentication.md)
- [Accessing the Portainer API](https://docs.portainer.io/api/access.md)
- [Portainer API documentation](https://docs.portainer.io/api/docs.md)
- [Portainer BE OpenAPI spec 2.39.1](https://api-docs.portainer.io/versions/ee/2.39.1.yaml)
- [Stream auth and activity logs to an external provider](https://docs.portainer.io/advanced/siem.md)
- [Install Portainer BE with Docker on Linux](https://docs.portainer.io/start/install/server/docker/linux.md)

## Issues Found
- The post said activity logs were accessed from **Settings** and referred to **Activity logs** or **Audit logs**. I corrected this to the documented path: **Logs** > **Activity**.
- The introduction and "What Gets Logged" section mixed activity logs with authentication logs and included a category table that Portainer does not document on the activity log page. I replaced it with the two documented audit views and their actual UI fields.
- The original activity log field list included **IP Address**. I corrected this because Portainer documents IP address for **authentication logs**, while **activity logs** show **date and time, user, endpoint, and action**.
- The API examples used the wrong endpoint (`/api/useractivity`), wrong pagination parameter (`start`), wrong user filter (`userID`), and the wrong access-token header pattern for these examples. I updated them to the documented `/api/useractivity/logs` and `/api/useractivity/authlogs` endpoints, `offset`, `username`, and `X-API-Key`.
- The API export section used a broken pagination script that assumed the wrong response shape. I replaced it with a working export against the documented `/api/useractivity/logs.csv` endpoint.
- The analysis and alerting examples referenced nonexistent fields such as `.Type`, `.Action`, `.Username`, and `.Role`. I updated them to the documented lowercase fields and split authentication-log checks from activity-log checks.
- The SIEM section incorrectly used Docker's container log driver and the wrong BE image name (`portainer/portainer-be`). I replaced it with Portainer's documented Syslog integration, supported flags, correct `portainer/portainer-ee` image, and the required flag placement after the image name.

## Review Notes
- Portainer documents the activity log as a record of "all actions taken" but does not publish a canonical event-category matrix for stacks, containers, teams, registries, or settings on the activity log page. Future revisions should avoid promising category-level coverage unless a versioned Portainer source documents it explicitly.
- The Syslog/SIEM streaming feature is documented as experimental in the current Portainer documentation.
- The authentication log API uses numeric event types in the OpenAPI spec; the updated examples use the documented failure value (`type == 2`) for failed login checks.
