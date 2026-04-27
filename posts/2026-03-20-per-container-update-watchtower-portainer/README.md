# Per-Container Update Configuration with Watchtower and Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Watchtower, Docker, Container Updates, DevOps

Description: Learn how to configure per-container automatic update behavior using Watchtower labels in a Portainer-managed Docker environment.

## What is Watchtower?

Watchtower is a Docker container that monitors running containers and automatically updates them when a new image is available on the registry. It checks for image updates at a configurable interval and pulls and restarts containers with the new image.

When combined with Portainer, Watchtower gives you automated updates while retaining visibility and control through Portainer's web UI.

## Installing Watchtower with Portainer

In Portainer, navigate to **Stacks** and create a new stack with the following compose file:

```yaml
version: "3.8"

services:
  watchtower:
    image: containrrr/watchtower:latest
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_POLL_INTERVAL=300   # Check every 5 minutes
      - WATCHTOWER_CLEANUP=true        # Remove old images after update
      - WATCHTOWER_INCLUDE_STOPPED=false
      - WATCHTOWER_LABEL_ENABLE=true   # Only update labeled containers
```

Setting `WATCHTOWER_LABEL_ENABLE=true` is critical - it tells Watchtower to only update containers that have the `com.centurylinklabs.watchtower.enable=true` label.

## Enabling Updates on Specific Containers

Add the Watchtower label to containers you want to auto-update:

```yaml
services:
  my-app:
    image: myrepo/my-app:latest
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
```

Containers without this label will be ignored by Watchtower.

## Disabling Updates on Specific Containers

To explicitly exclude a container from updates (even without label-enable mode):

```yaml
services:
  my-database:
    image: postgres:16
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
```

## Per-Container Update Schedules

Watchtower supports per-container custom check intervals by running multiple Watchtower instances with different scopes. Each scoped instance can have its own poll interval and only manages containers carrying the matching scope label:

```yaml
services:
  frontend:
    image: myrepo/frontend:latest
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
      - "com.centurylinklabs.watchtower.scope=frontend-scope"

  watchtower-frontend:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --scope frontend-scope --interval 60
    labels:
      - "com.centurylinklabs.watchtower.scope=frontend-scope"
```

The `--interval` flag takes a value in seconds. If you need cron-style schedules instead, use `--schedule` (or `WATCHTOWER_SCHEDULE`) with a 6-field cron expression - note that `--interval` and `--schedule` are mutually exclusive.

## Monitor-Only Mode

Watchtower can monitor for updates without applying them - useful for Portainer-managed environments where you want notifications but manual control:

```yaml
services:
  my-app:
    image: myrepo/my-app:latest
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
      - "com.centurylinklabs.watchtower.monitor-only=true"
```

## Notifications for Updates

Configure Slack or email notifications:

```yaml
environment:
  - WATCHTOWER_NOTIFICATIONS=slack
  - WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
  - WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER=watchtower-server-1
```

## Viewing Update History in Portainer

After Watchtower applies an update:

1. Go to **Containers** in Portainer
2. Click the container name
3. Check the **Logs** tab to see restart events
4. The **Image** field will show the updated image digest

## Best Practices

1. **Use `WATCHTOWER_LABEL_ENABLE=true`** to opt-in specific containers rather than updating everything
2. **Enable `WATCHTOWER_CLEANUP=true`** to remove old images and save disk space
3. **Use monitor-only mode** for production databases and stateful services
4. **Set up notifications** so you know when updates are applied
5. **Test updates in staging** before enabling auto-updates in production

## Conclusion

Watchtower and Portainer complement each other well - Portainer provides visibility and manual control, while Watchtower handles automated image updates. Per-container labels give you precise control over which containers are updated automatically and which require manual intervention.
