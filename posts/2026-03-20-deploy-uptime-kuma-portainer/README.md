# How to Deploy Uptime Kuma via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Uptime Kuma, Monitoring, Docker, Self-Hosting, Status Page, Alerting

Description: Learn how to deploy Uptime Kuma, the self-hosted monitoring tool with status pages, via Portainer for monitoring your internal and external services.

---

Uptime Kuma provides beautiful status pages, multi-type monitoring (HTTP, TCP, DNS, ping), and flexible alerting via Slack, Telegram, email, and many more channels. It is one of the most popular self-hosted monitoring tools.

## Prerequisites

- Portainer running
- Access to a Portainer environment where you can deploy stacks

## Compose Stack

```yaml
services:
  uptime-kuma:
    image: louislam/uptime-kuma:2
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      # Persist the SQLite database and configuration
      - uptime_kuma_data:/app/data

volumes:
  uptime_kuma_data:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `uptime-kuma` and select **Web editor**.
3. Paste the compose file above and click **Deploy the stack**.

Open `http://<host>:3001` and create your admin account on first visit.

## Adding Monitors

In the Uptime Kuma UI click **Add New Monitor**:

| Type | Use Case | Example |
|------|----------|---------|
| HTTP(s) | Web apps and APIs | `https://myapp.example.com` |
| TCP Port | Non-HTTP services | `db-host:5432` |
| DNS | Name resolution | Verify `A` record for domain |
| Ping | Host availability | `192.168.1.1` |
| Docker Container | Local containers | Mount `/var/run/docker.sock:/var/run/docker.sock` first |

## Setting Up Notifications

Go to **Settings > Notifications** and add your preferred channel (Slack, Discord, Telegram, etc.). Then attach the notification channel to each monitor.

## Public Status Page

Uptime Kuma can generate a public status page to share with users:

1. Go to **Status Page > New Status Page**.
2. Add the monitors you want to display publicly.
3. Set a custom domain or use the built-in URL.

## Monitoring Uptime Kuma Itself

Since Uptime Kuma is your monitoring system, monitor it with an external service like OneUptime. Point OneUptime at `http://<host>:3001` and alert if Uptime Kuma itself goes down.
