# How to Run Datadog Agent in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Datadog, Monitoring, APM, Observability, DevOps, Metrics

Description: Learn how to deploy the Datadog Agent in Docker to collect metrics, traces, and logs from your containerized applications.

---

Datadog is one of the most widely used cloud monitoring platforms. Its agent collects metrics, traces, and logs from your infrastructure and ships them to the Datadog SaaS platform for analysis, alerting, and visualization. Running the Datadog Agent in Docker is the standard approach for containerized environments. The agent auto-discovers other containers, collects their metrics, and can even instrument applications for distributed tracing.

This guide covers deploying the Datadog Agent in Docker, configuring it for container monitoring, enabling APM tracing, collecting logs, and setting up integrations with common services.

## Prerequisites

You need a Datadog account and an API key. If you do not have one, Datadog offers a free trial. You also need Docker and Docker Compose installed on your system.

```bash
# Store your Datadog API key as an environment variable
export DD_API_KEY="your-datadog-api-key-here"

# Verify Docker is running
docker --version
```

## Quick Start with Docker Run

The simplest way to run the Datadog Agent is with a single Docker command.

```bash
# Run the Datadog Agent with container and host monitoring
docker run -d \
  --name datadog-agent \
  --cgroupns host \
  --pid host \
  -e DD_API_KEY=${DD_API_KEY} \
  -e DD_SITE="datadoghq.com" \
  -e DD_APM_ENABLED=true \
  -e DD_LOGS_ENABLED=true \
  -e DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL=true \
  -e DD_CONTAINER_EXCLUDE="name:datadog-agent" \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /proc/:/host/proc/:ro \
  -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro \
  -v /var/lib/docker/containers:/var/lib/docker/containers:ro \
  -p 8126:8126 \
  gcr.io/datadoghq/agent:7
```

Within a few minutes, your host should appear in the Datadog infrastructure list at `app.datadoghq.com`.

## Docker Compose Setup

For a more complete deployment, use Docker Compose with sample services.

```yaml
# docker-compose.yml - Datadog Agent with sample applications
version: "3.8"

services:
  # Datadog Agent - collects metrics, traces, and logs
  datadog-agent:
    image: gcr.io/datadoghq/agent:7
    container_name: datadog-agent
    pid: host
    environment:
      # Required: Your Datadog API key
      - DD_API_KEY=${DD_API_KEY}
      # Datadog site (datadoghq.com for US, datadoghq.eu for EU)
      - DD_SITE=datadoghq.com
      # Enable APM for distributed tracing
      - DD_APM_ENABLED=true
      - DD_APM_NON_LOCAL_TRAFFIC=true
      # Enable log collection from all containers
      - DD_LOGS_ENABLED=true
      - DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL=true
      # Enable live process monitoring
      - DD_PROCESS_AGENT_ENABLED=true
      # Set tags for this host
      - DD_TAGS=env:docker-local team:engineering
      # Exclude the agent's own logs to reduce noise
      - DD_CONTAINER_EXCLUDE="name:datadog-agent"
      # Enable DogStatsD for custom metrics
      - DD_DOGSTATSD_NON_LOCAL_TRAFFIC=true
    volumes:
      # Docker socket for container discovery
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Host proc and cgroup for system metrics
      - /proc/:/host/proc/:ro
      - /sys/fs/cgroup/:/host/sys/fs/cgroup:ro
      # Container logs access
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      # Custom check configurations
      - ./conf.d:/etc/datadog-agent/conf.d
    ports:
      - "8126:8126"   # APM trace intake
      - "8125:8125/udp"  # DogStatsD for custom metrics
    networks:
      - monitored

  # Sample Python Flask app with Datadog tracing
  flask-app:
    build:
      context: .
      dockerfile: Dockerfile.flask
    environment:
      # Tell ddtrace where to send traces
      - DD_AGENT_HOST=datadog-agent
      - DD_TRACE_AGENT_PORT=8126
      - DD_SERVICE=flask-app
      - DD_ENV=docker-local
      - DD_VERSION=1.0.0
    ports:
      - "5000:5000"
    labels:
      # Datadog autodiscovery labels
      com.datadoghq.ad.logs: '[{"source":"python","service":"flask-app"}]'
    depends_on:
      - datadog-agent
    networks:
      - monitored

  # Redis for the Flask app with Datadog integration
  redis:
    image: redis:7-alpine
    labels:
      # Autodiscovery configuration for the Redis integration
      com.datadoghq.ad.check_names: '["redisdb"]'
      com.datadoghq.ad.init_configs: '[{}]'
      com.datadoghq.ad.instances: '[{"host":"%%host%%","port":"6379"}]'
      com.datadoghq.ad.logs: '[{"source":"redis","service":"redis"}]'
    networks:
      - monitored

  # Nginx with Datadog integration
  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx-status.conf:/etc/nginx/conf.d/status.conf
    labels:
      # Autodiscovery for Nginx metrics
      com.datadoghq.ad.check_names: '["nginx"]'
      com.datadoghq.ad.init_configs: '[{}]'
      com.datadoghq.ad.instances: '[{"nginx_status_url":"http://%%host%%:80/nginx_status"}]'
      com.datadoghq.ad.logs: '[{"source":"nginx","service":"nginx"}]'
    networks:
      - monitored

networks:
  monitored:
    driver: bridge
```

Create the Nginx status configuration.

```nginx
# nginx-status.conf - Enable the stub_status module for Datadog
server {
    listen 80;

    location /nginx_status {
        stub_status on;
        # Only allow the Datadog agent to access this endpoint
        allow all;
    }
}
```

## Auto-Discovery with Labels

Datadog's autodiscovery feature is the key to monitoring in Docker. Instead of manually configuring each integration, you add labels to your containers and the agent picks them up automatically. The `%%host%%` and `%%port%%` template variables get replaced with the container's actual IP and port.

Here are more autodiscovery label examples for common services.

```yaml
# PostgreSQL autodiscovery labels
postgres:
  image: postgres:16-alpine
  labels:
    com.datadoghq.ad.check_names: '["postgres"]'
    com.datadoghq.ad.init_configs: '[{}]'
    com.datadoghq.ad.instances: '[{"host":"%%host%%","port":5432,"username":"datadog","password":"datadog_password","dbname":"postgres"}]'

# MongoDB autodiscovery labels
mongo:
  image: mongo:7
  labels:
    com.datadoghq.ad.check_names: '["mongo"]'
    com.datadoghq.ad.init_configs: '[{}]'
    com.datadoghq.ad.instances: '[{"hosts":["%%host%%:27017"]}]'
```

## Sending Custom Metrics

Use DogStatsD to send custom metrics from your application to the Datadog Agent.

```python
# custom_metrics.py - Send custom metrics via DogStatsD
from datadog import initialize, statsd

# Point DogStatsD at the agent container
initialize(statsd_host="datadog-agent", statsd_port=8125)

# Increment a counter
statsd.increment("myapp.page.views", tags=["page:home", "env:docker-local"])

# Record a gauge value
statsd.gauge("myapp.queue.size", 42, tags=["queue:orders"])

# Time a function
with statsd.timed("myapp.request.duration", tags=["endpoint:/api/users"]):
    # Your code here
    pass
```

## Verifying the Agent

Check that the agent is running correctly and collecting data.

```bash
# Check the agent status
docker exec datadog-agent agent status | head -50

# Check which integrations are running
docker exec datadog-agent agent configcheck

# Verify connectivity to Datadog
docker exec datadog-agent agent diagnose --include connectivity
```

## Resource Considerations

The Datadog Agent typically uses 256-512MB of RAM and about 10% of a CPU core. With APM and log collection enabled, memory usage can climb higher. Set resource limits in your Compose file to prevent the agent from consuming too many resources.

```yaml
datadog-agent:
  deploy:
    resources:
      limits:
        memory: 512M
      reservations:
        memory: 256M
```

## Cleanup

```bash
# Stop and remove all containers and data
docker compose down -v
```

## Conclusion

The Datadog Agent in Docker provides comprehensive monitoring for containerized environments. Autodiscovery eliminates most manual configuration, and the combination of metrics, traces, and logs in one agent simplifies your observability stack. The main consideration is cost, since Datadog charges per host and per feature. For teams looking for an open-source alternative with similar capabilities, [OneUptime](https://oneuptime.com) provides monitoring, alerting, and incident management without per-host pricing.
