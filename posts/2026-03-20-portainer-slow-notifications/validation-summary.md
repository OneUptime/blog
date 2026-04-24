# Validation Summary: How to Fix Slow Notification Loading Affecting Bulk Operations - Notifications

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Portainer Community Edition
- Portainer Business Edition
- Portainer API
- Docker Engine API
- Docker CLI
- Docker Compose
- Portainer datastore

## Sources Consulted
- Portainer notifications documentation: https://docs.portainer.io/admin/notifications
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer API examples: https://docs.portainer.io/api/examples
- Portainer CLI flags documentation: https://docs.portainer.io/advanced/cli
- Portainer activity logs documentation: https://docs.portainer.io/admin/logs/activity
- Portainer FAQ on `useractivity.db`: https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/failed-logging-user-activity-error-in-portainer
- Portainer source for persisted notifications storage: https://github.com/portainer/portainer/blob/release/2.39/app/react/portainer/notifications/notifications-store.ts
- Portainer source for notifications UI behavior: https://github.com/portainer/portainer/blob/release/2.39/app/react/components/PageHeader/NotificationsMenu.tsx
- Portainer source for notification list view: https://github.com/portainer/portainer/blob/release/2.39/app/react/portainer/notifications/NotificationsView.tsx
- Portainer source for activity log retention hint: https://github.com/portainer/portainer/blob/release/2.39/app/react/portainer/logs/ActivityLogsView/FilterBar.tsx
- Docker `docker stop` reference: https://docs.docker.com/reference/cli/docker/container/stop/
- Docker Compose `restart` reference: https://docs.docker.com/reference/cli/docker/compose/restart/
- Docker Compose `pull` reference: https://docs.docker.com/reference/cli/docker/compose/pull/
- Docker Compose `up` reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Engine API container stop reference: https://docs.docker.com/reference/api/engine/version/v1.44/#tag/Container/operation/ContainerStop

## Issues Found
- Step 1 incorrectly used the `useractivity` API to count notifications. I replaced it with the supported Portainer UI workflow because notifications and activity logs are separate subsystems.
- Step 2 and Step 10 used an undocumented `/api/notifications` delete endpoint and implied that notifications can be purged server-side on a schedule. I removed those calls because current Portainer docs and source do not expose that API.
- Step 3 claimed Portainer has notification retention and max-count settings under App Settings. I removed that claim because current Portainer docs do not document such settings.
- Step 4 claimed notifications are stored in BoltDB and that a one-off `--compact-db` container run clears them. I corrected this to reflect that UI notifications are browser-persisted, while `--compact-db` is a general datastore compaction flag applied on startup.
- Step 5 conflated notifications with Business Edition activity logs and pointed to the wrong management path. I rewrote it to use the documented **Logs** -> **Activity** workflow and noted the current 7-day retention behavior.
- Step 8 was updated to use `X-API-Key`, which is the current Portainer-documented authentication method for normal API access, while keeping the Docker-proxy bulk-stop example intact.
- Step 9 would have started Portainer on a brand-new empty volume, which would discard existing Portainer data. I fixed the example to copy the existing `/data` contents before switching to faster storage.
- The introduction, description, and conclusion overstated the relationship between notification history and server-side Portainer performance. I narrowed those claims so the post now presents notification cleanup as one troubleshooting step rather than a documented server-side root cause.

## Review Notes
- Portainer's current documentation covers the Notifications UI, but some implementation details needed for validation, such as browser-persisted notification storage and the 7-day activity-log retention hint, are only explicit in the official source tree.
- The revised API example uses `https://localhost:9443` with `curl -k` for local self-signed setups. In production, trusting the Portainer certificate or CA is preferable.
