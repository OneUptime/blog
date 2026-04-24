# How to Deploy Uptime Kuma via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Uptime Kuma, Monitoring, Self-Hosted, Docker, Uptime Monitoring, Status Page

Description: Learn how to deploy Uptime Kuma, the self-hosted uptime monitoring tool, via Portainer using Docker Compose. This guide covers persistent storage, notification integrations, reverse proxy setup...

---

## Introduction

Uptime Kuma is a self-hosted monitoring tool that provides real-time status tracking for your websites, APIs, and services. It supports HTTP/S, TCP, DNS, and ping monitors, and offers a clean dashboard with built-in notification integrations for Slack, Telegram, PagerDuty, Discord, and dozens more.

Deploying Uptime Kuma via Portainer gives you a visual way to manage the stack, inspect container logs, and update the service without touching the command line. This guide walks through a production-ready deployment with persistent storage, optional Traefik reverse proxy labels, and notification configuration.

## Prerequisites

Before starting, ensure you have:

- Docker Engine 20.10+ installed
- Portainer CE or BE running and accessible
- A domain name (optional but recommended for HTTPS access)
- Traefik v3 configured with a `websecure` entrypoint and a shared external Docker network such as `traefik-public` (optional, for reverse proxy)

## Step 1: Create the Docker Compose Stack

Log into Portainer, navigate to your environment, and click **Stacks > Add Stack**. Name the stack `uptime-kuma` and paste the following compose definition.

```yaml
version: "3.8"

services:
  uptime-kuma:
    image: louislam/uptime-kuma:2
    container_name: uptime-kuma
    restart: unless-stopped
    # Mount persistent data volume so monitor configs and history survive container restarts
    volumes:
      - uptime-kuma-data:/app/data
      # Mount Docker socket to enable Docker container monitoring (optional)
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      # Publish port 3001 for direct access; remove this if you only use Traefik
      - "3001:3001"
    environment:
      # Set timezone for accurate timestamps in notifications
      - TZ=UTC
    labels:
      # Traefik v3 labels - remove if not using Traefik
      - "traefik.enable=true"
      - "traefik.docker.network=traefik-public"
      - "traefik.http.routers.uptime-kuma.rule=Host(`status.example.com`)"
      - "traefik.http.routers.uptime-kuma.entrypoints=websecure"
      - "traefik.http.routers.uptime-kuma.tls.certresolver=letsencrypt"
      - "traefik.http.services.uptime-kuma.loadbalancer.server.port=3001"
    networks:
      - monitoring
      # Connect to Traefik's network if using reverse proxy
      - traefik-public

volumes:
  uptime-kuma-data:
    driver: local

networks:
  monitoring:
    driver: bridge
  traefik-public:
    external: true
```

If you are using Traefik, make sure the external `traefik-public` network already exists and your Traefik container is attached to it. If you are not using Traefik, remove the `labels` block and the `traefik-public` network reference.

## Step 2: Deploy the Stack

Click **Deploy the stack** in Portainer. The `louislam/uptime-kuma:2` image will be pulled and the container will start within a few seconds.

Navigate to `http://your-server-ip:3001` or your configured domain. You will be prompted to create an admin account on the first visit.

## Step 3: Add Your First Monitor

After logging in, click **Add New Monitor** and configure:

- **Monitor Type**: HTTP(S) for websites, TCP port for non-HTTP services, DNS for name resolution
- **Friendly Name**: A human-readable label
- **URL / Host**: The endpoint to monitor
- **Heartbeat Interval**: How often to check (default 60 seconds)
- **Retries**: Number of failures before marking as down (recommended: 3)

For an HTTP monitor checking a website:

```text
Monitor Type: HTTP(S)
Friendly Name: My Website
URL: https://example.com
Heartbeat Interval: 60
Retries: 3
Max Redirects: 10
Accepted Status Codes: 200-299
```

## Step 4: Configure Notifications

Uptime Kuma supports over 90 notification providers. To add Slack alerts:

1. Click **Settings > Notifications > Setup Notification**
2. Choose **Slack** as the notification type
3. Enter your **Webhook URL** from the Slack API dashboard
4. Set the **Username** and optionally a custom icon
5. Check **Apply on all existing monitors** if you want global alerts

For Discord, use a Discord webhook URL in the same workflow. Notifications fire when a monitor transitions between UP and DOWN states.

## Step 5: Set Up a Status Page

Uptime Kuma includes a built-in public status page. To create one:

1. Navigate to **Status Page > New Status Page**
2. Set a **URL slug** (e.g., `status`)
3. Add monitor groups and individual monitors to display
4. Enable or disable public access as needed

The status page is accessible at `http://your-server:3001/status/your-slug`.

## Step 6: Persistent Storage Verification

After adding monitors, verify the data volume is persisting correctly:

```bash
docker volume inspect uptime-kuma_uptime-kuma-data
```

The `Mountpoint` field shows the host path. Your monitor database (`kuma.db`) and other runtime data are stored here.

## Step 7: Updating Uptime Kuma

To update to the latest patch release in the v2 series, go to **Portainer > Stacks > uptime-kuma > Editor** and click **Update the stack**. If your Portainer version shows a **Re-pull image** or **Pull latest image** option, enable it so Portainer fetches the newest `louislam/uptime-kuma:2` image before redeploying the container. The named volume is preserved across redeployments.

For major version upgrades, check the Uptime Kuma release notes first as database migrations may be required.

## Docker Monitoring Integration

With the Docker socket mounted read-only (`/var/run/docker.sock:ro`), you can add **Docker Container** monitors in Uptime Kuma. These monitors check whether a specific container is running, allowing you to detect container crashes without an external HTTP endpoint.

To add a Docker container monitor:

- **Monitor Type**: Docker Container
- **Container Name / ID**: The exact container name as shown in `docker ps`

## Conclusion

Uptime Kuma deployed via Portainer provides a powerful, self-hosted alternative to commercial uptime monitoring services. The named Docker volume ensures your monitor configurations and historical data persist across updates. The built-in status page, 90+ notification integrations, and Docker container monitoring make it a comprehensive solution for home labs and production environments alike. With Traefik labels in place, your monitoring dashboard is accessible over HTTPS with automatic certificate management.
