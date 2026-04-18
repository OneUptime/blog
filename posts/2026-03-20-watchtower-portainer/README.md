# How to Deploy Watchtower Alongside Portainer - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Watchtower, Automatic Updates, Docker, Container Management

Description: Learn how to deploy Watchtower as a Portainer stack to automatically update running containers when new images are published, with schedule control and notification support.

## What Is Watchtower?

Watchtower monitors your running containers and automatically updates them when a newer image is available in the registry. It pulls the new image, stops the old container, and starts a new one with the same configuration - all without manual intervention.

## When to Use Watchtower with Portainer

- Development and staging environments where latest images should auto-deploy
- Self-hosted services that should stay up to date (Portainer itself, monitoring tools)
- Edge devices where manual updates aren't practical

**Caution**: Don't use Watchtower on production databases or stateful services without testing the update process. Watchtower doesn't perform rolling updates.

## Deploy Watchtower as a Portainer Stack

In Portainer: **Stacks → Add Stack → watchtower**

```yaml
version: "3.8"

services:
  watchtower:
    image: containrrr/watchtower:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      # Check every 24 hours (86400 seconds)
      - WATCHTOWER_POLL_INTERVAL=86400
      # Remove old images after update
      - WATCHTOWER_CLEANUP=true
      # Send Slack notifications
      - WATCHTOWER_NOTIFICATIONS=slack
      - WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL=${SLACK_WEBHOOK_URL}
      - WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER=watchtower
      # Only update containers with this label
      - WATCHTOWER_LABEL_ENABLE=true
```

## Opting Containers Into Watchtower

With `WATCHTOWER_LABEL_ENABLE=true`, only containers with the `com.centurylinklabs.watchtower.enable=true` label are updated:

```yaml
services:
  myapp:
    image: myapp:latest
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
```

## Schedule-Based Updates (Cron)

Instead of polling every N seconds, use a cron schedule:

```yaml
environment:
  - WATCHTOWER_SCHEDULE=0 0 3 * * *    # 3 AM every day
```

Cron format: `Seconds Minutes Hours DayOfMonth Month DayOfWeek`

## Run Once Mode for Manual Updates

Test Watchtower behavior or trigger an immediate update:

```yaml
services:
  watchtower:
    image: containrrr/watchtower:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --run-once    # Check once, then exit
```

Deploy this one-off stack in Portainer, let it run, then remove it.

## Private Registry Authentication

For containers from private registries, mount a Docker `config.json` into the container. Watchtower looks for it at `/config.json` by default:

```yaml
services:
  watchtower:
    image: containrrr/watchtower:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      # Mount Docker credentials from host
      - /root/.docker/config.json:/config.json:ro
```

You can generate this file by running `docker login <registry>` on the host, or create it manually with base64-encoded credentials.

## Viewing Watchtower Logs

In Portainer: **Stacks → watchtower → watchtower service → Logs**

Successful update:

```text
level=info msg="Found new registry image for portainer/portainer-ce"
level=info msg="Updating container /portainer"
level=info msg="Pulled image portainer/portainer-ce:latest"
level=info msg="Recreated container /portainer"
```

## Conclusion

Watchtower as a Portainer stack is a zero-friction way to keep containers up to date. With label-based opt-in, you control exactly which containers Watchtower touches, and cron scheduling ensures updates happen during maintenance windows rather than at random times.
