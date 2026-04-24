# Validation Summary: How to View and Manage Notifications in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Business Edition Alerting
- Docker
- Slack
- Microsoft Teams
- Webhooks

## Sources Consulted
- Portainer Notifications documentation: https://docs.portainer.io/admin/notifications
- Portainer Alerting documentation: https://docs.portainer.io/user/observability/alerting
- Portainer General settings documentation: https://docs.portainer.io/admin/settings/general
- Portainer CLI configuration documentation: https://docs.portainer.io/advanced/cli
- Official Portainer source for the notifications menu UI: https://github.com/portainer/portainer/blob/develop/app/react/components/PageHeader/NotificationsMenu.tsx
- Official Portainer source for notification storage and toast handling: https://github.com/portainer/portainer/blob/develop/app/react/portainer/notifications/notifications-store.ts
- Official Portainer source for notification generation: https://github.com/portainer/portainer/blob/develop/app/portainer/services/notifications.ts

## Issues Found
- The post described notifications as a system for runtime events with unread counts. I changed this to match Portainer's documented Notifications feature, which records UI popup notifications, shows the 50 most recent in the bell menu, and uses an indicator dot rather than an unread count.
- The post claimed notifications had `Info`, `Warning`, and `Error` types and included `Environment` and `Action` fields. I corrected this to the fields and types supported by the current Portainer UI and source: type, title, details, and time, with notification types generated as success, warning, and error.
- The post said clicking a notification marks it as read and mentioned a `Mark all as read` action. I removed this because Portainer does not implement a read/unread state for notifications.
- The post included an undocumented `DELETE /api/notifications` example. I removed it because this endpoint is not present in the official Portainer documentation or API/source tree.
- The post recommended `--compact-db` as an automated way to clear notifications. I corrected this because `--compact-db` compacts the Portainer database, while notifications are stored in the browser and must be managed through the UI.
- The Business Edition section pointed readers to `Settings > General > Notifications` and included a speculative webhook payload example. I rewrote this to the documented `Additional Functionality > Alerting` workflow and removed the unsupported payload example.

## Review Notes
The corrected content reflects Portainer documentation and source behavior current as of April 24, 2026, including the 2.39.1 documentation set. UI labels and feature placement may vary slightly on older Portainer releases.
