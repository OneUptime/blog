# Validation Summary: How to Identify Image Update Indicators in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Docker CLI
- Docker Compose / Compose Specification
- Watchtower
- Bash
- Slack incoming webhooks

## Sources Consulted
- Portainer: How to enable/disable image Up-to-date indicator - https://docs.portainer.io/faqs/troubleshooting/how-to-enable-disable-image-up-to-date-indicator
- Portainer: How does the image update notification icon work? - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-does-the-image-update-notification-icon-work
- Portainer: Containers - https://docs.portainer.io/2.33-lts/user/docker/containers
- Portainer: Stacks - https://docs.portainer.io/user/docker/stacks
- Portainer: Docker Standalone Setup - https://docs.portainer.io/2.33-lts/user/docker/host/setup
- Portainer: Docker Swarm Setup - https://docs.portainer.io/2.33-lts/user/docker/swarm/setup
- Portainer: How do automatic updates for stacks/applications work? - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Docker Docs: docker image pull - https://docs.docker.com/reference/cli/docker/image/pull/
- Docker Docs: docker image inspect - https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker Docs: docker buildx imagetools inspect - https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Watchtower: Arguments - https://containrrr.dev/watchtower/arguments/
- Watchtower: Notifications - https://containrrr.dev/watchtower/notifications/

## Issues Found
- The post described the image indicator as a global Portainer **Settings** option with a configurable check frequency. I corrected this to the documented per-environment **Setup** toggle and removed the unsupported frequency step.
- The post described the indicator as a cloud icon or upgrade arrow and said the **Images** view shows similar indicators. I corrected this to the documented **Images up to date** column behavior for containers, stacks, and services: green tick, orange cross, or grey hyphen.
- The manual Docker example referred to an image digest but used `{{.Id}}`, which is the image ID, and it used `docker pull --quiet` while depending on status text. I changed the example to use `docker image inspect` for the local image ID and removed `--quiet`.
- The automated shell script labeled the before/after values as local versus registry IDs. I corrected the script to use `docker image inspect`, simplified the loop, and labeled the values accurately as before and after the pull.
- The Watchtower Compose example omitted `WATCHTOWER_NOTIFICATIONS=slack`, which is required for Slack notifications, and used the obsolete top-level Compose `version` element. I added the notification setting, clarified the cron schedule comment, and removed the obsolete field.
- The Portainer auto-update section implied the feature applied generically to all stacks and referenced **Force re-pull image**. I corrected this to stacks deployed from Git and the documented **Re-pull image** option.
- The digest-based update script compared a local repo digest to the manifest config digest returned by `docker manifest inspect`, which are different objects. I replaced it with a registry manifest digest lookup using `docker buildx imagetools inspect` and kept the comparison aligned.

## Review Notes
- Portainer documents the image up-to-date indicator as a Portainer Business Edition feature.
- Pull-based and digest-based checks assume the image tag exists in a reachable registry. Locally built images or images without repo digests may not be checkable with these examples.
