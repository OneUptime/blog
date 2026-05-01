# How to Deploy Watchtower Alongside Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Watchtower, Docker, Automation, Container Updates, DevOps

Description: Learn how to deploy Watchtower as a Portainer stack to automatically update Docker containers when new image versions are published.

---

Watchtower monitors Docker containers and automatically pulls new images and restarts updated containers. Deploying it via Portainer stacks gives you automated container updates with configurable schedules and notification support.

---

## Deploy Watchtower via Portainer Stack

In Portainer: **Stacks** → **Add stack**:

```yaml
services:
  watchtower:
    image: containrrr/watchtower:latest
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_SCHEDULE=0 0 4 * * *  # 4 AM UTC daily
      - WATCHTOWER_CLEANUP=true           # Remove old images
      - WATCHTOWER_INCLUDE_STOPPED=false
      - WATCHTOWER_NOTIFICATIONS=slack
      - WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL=${SLACK_WEBHOOK}
      - WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER=watchtower
```

---

## Update Specific Containers Only

```yaml
environment:
  - WATCHTOWER_LABEL_ENABLE=true  # Only update containers with this label
```

Then label only the containers you want auto-updated:

```yaml
services:
  myapp:
    image: myorg/myapp:latest
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
```

---

## Exclude Containers from Updates

```yaml
services:
  critical-app:
    image: myorg/critical:v1.5.0
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
```

---

## Run a One-Time Update Check

```bash
docker run --rm   -v /var/run/docker.sock:/var/run/docker.sock   containrrr/watchtower   --run-once   --cleanup
```

---

## Notification Options

```yaml
environment:
  # Email
  - WATCHTOWER_NOTIFICATIONS=email
  - WATCHTOWER_NOTIFICATION_EMAIL_FROM=watchtower@example.com
  - WATCHTOWER_NOTIFICATION_EMAIL_TO=admin@example.com
  - WATCHTOWER_NOTIFICATION_EMAIL_SERVER=smtp.example.com

  # Or use gotify instead of the email settings above
  # - WATCHTOWER_NOTIFICATIONS=gotify
  # - WATCHTOWER_NOTIFICATION_GOTIFY_URL=https://gotify.example.com
  # - WATCHTOWER_NOTIFICATION_GOTIFY_TOKEN=${GOTIFY_TOKEN}
```

---

## Summary

Deploy Watchtower with access to the Docker socket and a 6-field cron schedule via `WATCHTOWER_SCHEDULE` (UTC unless you set `TZ`). Enable `WATCHTOWER_CLEANUP=true` to remove old images after updates. Use `WATCHTOWER_LABEL_ENABLE=true` to limit updates to explicitly opted-in containers. Configure Slack, email, or Gotify notifications to track what was updated and when.
