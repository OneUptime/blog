# How to Run Checkmk in Docker for Infrastructure Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Checkmk, Infrastructure Monitoring, Nagios, DevOps, Observability

Description: Deploy Checkmk in Docker to monitor your servers, network devices, and services with auto-discovery and a powerful rule-based configuration.

---

Checkmk is an enterprise-grade infrastructure monitoring tool that evolved from Nagios. It solves many of Nagios's pain points: manual host configuration, lack of auto-discovery, and a dated interface. Checkmk automatically discovers services on monitored hosts, provides a modern web UI, and scales to thousands of hosts without the configuration nightmare that Nagios is famous for.

The Docker deployment makes Checkmk simple to try and practical to run in production. You get a fully functional monitoring server with a single container.

## Checkmk Editions

Checkmk comes in three editions. The Raw Edition is fully open source and based on Nagios Core. The Enterprise Edition adds a custom monitoring core with better performance, advanced dashboards, and reporting. The Cloud Edition adds cloud monitoring integrations. For this guide, we use the Raw Edition, which is free and covers most monitoring needs.

## Quick Start

Run Checkmk with a single Docker command.

```bash
# Run Checkmk Raw Edition with persistent data
docker run -d \
  --name checkmk \
  --restart unless-stopped \
  -p 8080:5000 \
  -p 8000:8000 \
  --tmpfs /opt/omd/sites/cmk/tmp:uid=1000,gid=1000 \
  -v checkmk-data:/omd/sites \
  checkmk/check-mk-raw:2.3.0-latest
```

After the container starts, retrieve the auto-generated admin password.

```bash
# Get the admin password
docker logs checkmk 2>&1 | grep "password"
```

Open `http://localhost:8080/cmk/check_mk/` in your browser and log in with user `cmkadmin` and the password from the logs.

## Docker Compose Setup

For a more complete deployment with persistent configuration and proper resource management, use Docker Compose.

```yaml
# docker-compose.yml - Checkmk monitoring server
version: "3.8"

services:
  checkmk:
    image: checkmk/check-mk-raw:2.3.0-latest
    container_name: checkmk
    restart: unless-stopped
    ports:
      - "8080:5000"    # Web interface
      - "8000:8000"    # Agent receiver
    tmpfs:
      - /opt/omd/sites/cmk/tmp:uid=1000,gid=1000
    volumes:
      # Persistent storage for monitoring data and configuration
      - checkmk-sites:/omd/sites
    environment:
      # Set the initial admin password (only used on first start)
      - CMK_PASSWORD=admin123
      # Set the site name
      - CMK_SITE_ID=cmk
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  # Sample hosts to monitor
  web-server:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - monitored

  redis:
    image: redis:7-alpine
    networks:
      - monitored

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_PASSWORD=postgres
    networks:
      - monitored

volumes:
  checkmk-sites:

networks:
  monitored:
    driver: bridge
```

```bash
# Start the stack
docker compose up -d

# Verify Checkmk is ready
docker compose logs checkmk | tail -5
```

## Adding Hosts to Monitor

Checkmk can monitor hosts using several methods: the Checkmk Agent installed on the target host, SNMP for network devices, or agent-less checks for HTTP, TCP, and ICMP.

### Installing the Checkmk Agent

For Linux hosts you want to monitor, download and install the Checkmk agent from the web interface. You can also get it directly from the API.

```bash
# Download the agent package from Checkmk
curl -o check-mk-agent.deb \
  "http://localhost:8080/cmk/check_mk/agents/check-mk-agent_2.3.0-1_all.deb"

# Install on a Debian/Ubuntu host
sudo dpkg -i check-mk-agent.deb
```

For monitoring Docker containers from within the Checkmk container itself, use the Checkmk REST API to add hosts.

```bash
# Add a host using the Checkmk REST API
curl -X POST "http://localhost:8080/cmk/check_mk/api/1.0/domain-types/host_config/collections/all" \
  -H "Authorization: Bearer cmkadmin admin123" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "host_name": "web-server",
    "folder": "/",
    "attributes": {
      "ipaddress": "172.20.0.2",
      "tag_agent": "cmk-agent"
    }
  }'
```

### Agent-Less Monitoring

For services you can not install an agent on, use active checks. These are configured through the web UI under Setup > Hosts > Host monitoring rules.

```bash
# Add a host with HTTP checks only (no agent)
curl -X POST "http://localhost:8080/cmk/check_mk/api/1.0/domain-types/host_config/collections/all" \
  -H "Authorization: Bearer cmkadmin admin123" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "host_name": "external-website",
    "folder": "/",
    "attributes": {
      "ipaddress": "93.184.216.34",
      "tag_agent": "no-agent"
    }
  }'
```

## Auto-Discovery

One of Checkmk's best features is automatic service discovery. After adding a host, Checkmk scans it and discovers all running services. Navigate to the host in the web UI and click "Run service discovery." Checkmk will find installed services like Apache, MySQL, PostgreSQL, disk partitions, network interfaces, and hundreds of other service types.

You can also trigger discovery via the API.

```bash
# Run service discovery on a host
curl -X POST "http://localhost:8080/cmk/check_mk/api/1.0/domain-types/service_discovery_run/actions/start/invoke" \
  -H "Authorization: Bearer cmkadmin admin123" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "host_name": "web-server",
    "mode": "fix_all"
  }'
```

## Activating Changes

Checkmk uses a two-phase configuration model. Changes you make in the web UI or API are staged first, then activated together. This prevents partial configurations from being applied.

```bash
# Activate pending changes
curl -X POST "http://localhost:8080/cmk/check_mk/api/1.0/domain-types/activation_run/actions/activate-changes/invoke" \
  -H "Authorization: Bearer cmkadmin admin123" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"force_foreign_changes": true}'
```

## Notification Configuration

Checkmk supports notifications through email, Slack, PagerDuty, Microsoft Teams, and custom scripts. Configure notification rules through Setup > Events > Notification configuration.

For Slack notifications, Checkmk includes a built-in Slack plugin. You need a webhook URL from your Slack workspace. Create a notification rule that matches the alerts you care about and point it at the Slack webhook.

## Monitoring Docker Containers

Checkmk has a specific plugin for Docker monitoring. Install it on the Docker host to monitor container health, resource usage, and status.

```bash
# On the Docker host, install the Docker monitoring plugin
# This file comes from the Checkmk agent plugins directory
curl -o /usr/lib/check_mk_agent/plugins/mk_docker.py \
  "http://localhost:8080/cmk/check_mk/agents/plugins/mk_docker.py"
chmod +x /usr/lib/check_mk_agent/plugins/mk_docker.py
```

After installing the plugin and running discovery, Checkmk will show individual checks for each Docker container, including CPU usage, memory usage, network I/O, and container status.

## Backup and Restore

Back up your Checkmk site regularly. The entire configuration lives in the omd/sites volume.

```bash
# Create a backup using Checkmk's built-in backup tool
docker exec checkmk omd backup /omd/sites/cmk/tmp/backup.tar.gz

# Copy the backup to your host
docker cp checkmk:/omd/sites/cmk/tmp/backup.tar.gz ./checkmk-backup.tar.gz
```

## Cleanup

```bash
docker compose down -v
```

## Conclusion

Checkmk delivers enterprise-grade infrastructure monitoring with a much better experience than raw Nagios. The Docker deployment gets you started quickly, and the auto-discovery feature dramatically reduces the time needed to bring hosts under monitoring. For teams that want to combine infrastructure monitoring with application performance monitoring, incident management, and status pages, [OneUptime](https://oneuptime.com) offers an integrated platform that covers the full observability spectrum.
