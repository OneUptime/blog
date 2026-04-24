# Validation Summary: How to Upgrade Portainer Business Edition with In-App Updates

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Docker
- Docker Swarm
- Kubernetes
- Portainer backup, restore, and notification workflows

## Sources Consulted
- Portainer Documentation, "Updating Portainer" - https://docs.portainer.io/start/upgrade
- Portainer Documentation, "Updating on Docker Standalone" - https://docs.portainer.io/start/upgrade/docker
- Portainer Documentation, "General" - https://docs.portainer.io/admin/settings/general
- Portainer Documentation, "Notifications" - https://docs.portainer.io/admin/notifications
- Portainer Documentation, "How can I roll back to a previous version of Portainer?" - https://docs.portainer.io/faqs/troubleshooting/how-can-i-roll-back-to-a-previous-version-of-portainer
- Portainer Documentation, "Why can I not see an option to update the Portainer version within the UI?" - https://docs.portainer.io/faqs/troubleshooting/ui-and-features/why-can-i-not-see-an-option-to-update-the-portainer-version-within-the-ui
- Portainer Documentation, "Updating on Kubernetes" - https://docs.portainer.io/start/upgrade/kubernetes
- Portainer Documentation, "Lifecycle policy" - https://docs.portainer.io/start/lifecycle

## Issues Found
- The post used incorrect UI navigation for in-app updates. I changed it to the documented flow: the update notification appears in the bottom-left of the Portainer UI and the action is `Update now`.
- The post implied a generic in-app update path without the documented constraints. I added the official caveats that in-app updates are available for Business Edition from 2.19 onward and only offer LTS releases.
- The "Check for Updates" and notification-badge instructions were not supported by the current Portainer documentation. I replaced them with the documented update-notification behavior and the official troubleshooting caveat about update-service reachability.
- The backup section used an incorrect UI path and mixed UI navigation into a `bash` block. I corrected the UI path to `Settings → Back up Portainer → Download backup` and separated the CLI example into a valid shell block.
- The rollback section restored a date-derived tarball directly and pinned an outdated `2.19.0` image. I replaced it with the documented `portainer.db.bak` rollback flow and made the restart command require the exact previous version instead of hardcoding an obsolete release.
- The notifications section claimed Portainer can send email alerts for new-version availability via `Settings → Notifications`. Current Portainer documentation does not document such a feature, so I replaced it with the documented UI notification behavior and Notifications page details.
- The recommendations table overstated some deployment guidance, especially for production and CE. I adjusted those entries to match the broader official guidance around backups, prior testing, and deployment-specific manual upgrade methods.
- The post used an overly specific hostname example, `https://portainer:9443`, and an unverified downtime estimate. I changed the URL to the documented `https://your-server-address:9443` form and removed the unsupported 1-3 minute timing claim.

## Review Notes
- Portainer's current official docs on 2026-04-24 show that in-app updates are limited to LTS releases, while STS upgrades still require the manual path.
- Portainer also documents a separate beta feature for automatic patch updates under `Settings > General`; that feature is distinct from the manual in-app `Update now` flow covered by this post.
