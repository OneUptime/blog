# How to Run Uptime Kuma in Docker for Status Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Uptime Kuma, Monitoring, Status Page, Observability, DevOps

Description: Deploy Uptime Kuma in Docker to monitor your services and create beautiful public status pages for your users.

---

Uptime Kuma is a self-hosted monitoring tool that tracks the availability of your websites, APIs, and services. Think of it as a self-hosted alternative to services like Pingdom or StatusCake. It provides a clean web interface for configuring monitors, viewing uptime history, and publishing public status pages. The project is open source, actively maintained, and runs well in Docker with minimal resources.

This guide covers deploying Uptime Kuma in Docker, configuring various monitor types, setting up notifications, and creating a public status page for your users.

## Why Self-Host Your Monitoring

Third-party monitoring services charge per monitor and per check frequency. When you self-host with Uptime Kuma, you get unlimited monitors at whatever check interval you want. Your monitoring data stays on your infrastructure, and you have full control over retention and alerting. The trade-off is that you need to maintain the monitoring server itself, but Docker makes that straightforward.

## Quick Start with Docker Run

The fastest way to get Uptime Kuma running is a single Docker command.

```bash
# Run Uptime Kuma with a persistent volume for data
docker run -d \
  --name uptime-kuma \
  --restart unless-stopped \
  -p 3001:3001 \
  -v uptime-kuma-data:/app/data \
  louislam/uptime-kuma:1
```

Open `http://localhost:3001` in your browser. On the first visit, you will create an admin account. After that, you can start adding monitors immediately.

## Docker Compose Setup

For a more complete deployment with reverse proxy and automatic HTTPS, use Docker Compose.

```yaml
# docker-compose.yml - Uptime Kuma with Nginx reverse proxy
version: "3.8"

services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    restart: unless-stopped
    volumes:
      - uptime-kuma-data:/app/data
      # Mount Docker socket if you want to monitor Docker containers directly
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - "3001:3001"
    environment:
      # Set the timezone for accurate timestamps
      - TZ=UTC
    healthcheck:
      test: ["CMD", "node", "/app/extra/healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - monitoring

  # Nginx reverse proxy for HTTPS termination
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - uptime-kuma
    networks:
      - monitoring

volumes:
  uptime-kuma-data:

networks:
  monitoring:
    driver: bridge
```

Create the `nginx.conf` for the reverse proxy.

```nginx
# nginx.conf - Reverse proxy for Uptime Kuma
# WebSocket support is required for the real-time dashboard

server {
    listen 80;
    server_name status.example.com;

    location / {
        proxy_pass http://uptime-kuma:3001;
        proxy_http_version 1.1;

        # WebSocket headers - required for the live dashboard
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Starting the Stack

```bash
# Start Uptime Kuma and Nginx
docker compose up -d

# Check that the health check passes
docker compose ps
```

## Configuring Monitors

Uptime Kuma supports many monitor types. Here are the most commonly used ones.

**HTTP/HTTPS Monitor** - Checks a URL and verifies the response status code. You can set expected status codes, check for specific content in the response body, and configure accepted certificate expiry thresholds.

**TCP Port Monitor** - Verifies that a specific port on a host is accepting connections. Useful for databases, message queues, and other non-HTTP services.

**Ping Monitor** - Sends ICMP ping packets to check basic network reachability. Good for monitoring network infrastructure.

**Docker Container Monitor** - When you mount the Docker socket, Uptime Kuma can directly check whether a container is running. This catches cases where a container is up but the service inside has crashed.

**DNS Monitor** - Verifies that a DNS record resolves correctly. Useful for catching DNS propagation issues or unauthorized changes.

**Push Monitor** - Works in reverse. Instead of Uptime Kuma reaching out, your service pushes a heartbeat to Uptime Kuma at regular intervals. If the heartbeat stops, Uptime Kuma raises an alert. This is perfect for cron jobs and batch processes.

## Setting Up Monitors via the API

While the web UI is convenient for manual setup, you can also script monitor creation. Uptime Kuma does not have a REST API by default, but you can use the Socket.IO API programmatically.

For bulk setup, consider using the `uptime-kuma-api` Python package.

```bash
# Install the Python API client
pip install uptime-kuma-api
```

```python
# setup_monitors.py - Script to create monitors in bulk
from uptime_kuma_api import UptimeKumaApi

api = UptimeKumaApi("http://localhost:3001")
api.login("admin", "your-password")

# Define monitors to create
monitors = [
    {
        "name": "Production API",
        "type": "http",
        "url": "https://api.example.com/health",
        "interval": 60,
        "maxretries": 3,
    },
    {
        "name": "Database",
        "type": "port",
        "hostname": "db.example.com",
        "port": 5432,
        "interval": 60,
    },
    {
        "name": "Redis Cache",
        "type": "port",
        "hostname": "redis.example.com",
        "port": 6379,
        "interval": 30,
    },
]

# Create each monitor
for monitor in monitors:
    result = api.add_monitor(**monitor)
    print(f"Created monitor: {monitor['name']} (ID: {result['monitorID']})")

api.disconnect()
```

## Configuring Notifications

Uptime Kuma integrates with many notification services. You can configure notifications through the web UI under Settings > Notifications. Supported channels include Slack, Discord, Telegram, PagerDuty, email (SMTP), Microsoft Teams, and many more.

For Slack notifications, you need a webhook URL. Create one in your Slack workspace under Apps > Incoming Webhooks, then add it in Uptime Kuma.

## Creating a Public Status Page

One of Uptime Kuma's best features is the built-in status page. Navigate to Status Pages in the sidebar and create a new page. You can group monitors into categories, add a custom logo and description, and share the URL with your users.

The status page automatically shows current status, uptime percentages, and incident history. It updates in real time via WebSocket, so users see changes without refreshing.

## Backup and Restore

Uptime Kuma stores everything in a SQLite database inside the data volume. Back it up regularly.

```bash
# Create a backup of the Uptime Kuma database
docker compose exec uptime-kuma \
  cp /app/data/kuma.db /app/data/kuma-backup-$(date +%Y%m%d).db

# Or copy it to your host
docker cp uptime-kuma:/app/data/kuma.db ./kuma-backup.db
```

To restore, stop the container, replace the `kuma.db` file in the volume, and start it again.

## Resource Usage

Uptime Kuma is lightweight. With 50 monitors checking every 60 seconds, it uses roughly 80MB of RAM and negligible CPU. The SQLite database grows slowly, typically staying under 100MB even after months of data. For larger deployments with hundreds of monitors, you might see memory usage climb to 200-300MB.

## Cleanup

```bash
# Remove the stack and all data
docker compose down -v
```

## Conclusion

Uptime Kuma is a capable, easy-to-deploy monitoring tool that covers the most common availability checking scenarios. Its Docker deployment is trivial, and the web interface makes configuration accessible to team members who are not comfortable with YAML files. For teams that need more advanced monitoring capabilities including distributed tracing, custom metrics, and incident management, consider pairing Uptime Kuma with a full observability platform like [OneUptime](https://oneuptime.com).
