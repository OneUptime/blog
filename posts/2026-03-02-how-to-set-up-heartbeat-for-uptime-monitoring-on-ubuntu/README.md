# How to Set Up Heartbeat for Uptime Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monitoring, Heartbeat, Uptime, Elasticsearch

Description: A complete guide to installing and configuring Elastic Heartbeat on Ubuntu to monitor service availability using ICMP, TCP, and HTTP checks.

---

Heartbeat is the uptime monitoring member of the Elastic Beats family. It performs active checks against endpoints - pinging hosts, connecting to TCP ports, and making HTTP requests - and reports availability, response time, and health status to Elasticsearch. When paired with Kibana's Uptime app, you get a clear view of which services are up, which are down, and how response times trend over time.

## How Heartbeat Differs from Other Monitors

Heartbeat is a synthetic monitor - it actively reaches out to check endpoints, rather than passively collecting data that services emit. This means it catches failures even when no user traffic is hitting a service. The tradeoff is that you need to deploy Heartbeat somewhere with network access to the services you want to monitor.

## Prerequisites

- Ubuntu 20.04 or 22.04
- Elasticsearch 8.x (local or remote)
- Kibana (for the Uptime app and dashboards)
- Network access from the Heartbeat host to monitored services

## Installation

```bash
# Add the Elastic APT repository
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | \
  sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] \
  https://artifacts.elastic.co/packages/8.x/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/elastic-8.x.list

sudo apt-get update && sudo apt-get install -y heartbeat-elastic

# Verify installation
heartbeat version
```

Note: the package is `heartbeat-elastic`, not `heartbeat`, to avoid conflict with an older unrelated package.

## Main Configuration

Edit `/etc/heartbeat/heartbeat.yml` to set up Elasticsearch output:

```yaml
# /etc/heartbeat/heartbeat.yml

# Heartbeat identity
name: "heartbeat-monitor-01"
tags: [Ubuntu, Monitoring, Heartbeat, Uptime, Elasticsearch]

# Where to send data
output.elasticsearch:
  hosts: ["https://elasticsearch:9200"]
  username: "elastic"
  password: "your-password"
  ssl.certificate_authorities: ["/etc/heartbeat/certs/ca.crt"]

# Kibana for dashboard setup
setup.kibana:
  host: "https://kibana:5601"
  username: "elastic"
  password: "your-password"

# Configure heartbeat monitors inline or from separate files
heartbeat.config.monitors:
  path: /etc/heartbeat/monitors.d/*.yml
  reload.enabled: true    # Watch for config changes
  reload.period: 5s       # Check every 5 seconds
```

The `reload.enabled: true` setting allows you to add or modify monitors without restarting Heartbeat.

## Configuring Monitors

Monitors live in `/etc/heartbeat/monitors.d/`. Create separate files for logical groups of services.

### ICMP (Ping) Monitors

```yaml
# /etc/heartbeat/monitors.d/ping.yml
- type: icmp
  id: ping-gateways        # Unique identifier
  name: "Gateway Ping Checks"
  schedule: '@every 30s'   # Check every 30 seconds
  hosts:
    - "192.168.1.1"
    - "192.168.1.254"
    - "8.8.8.8"
  timeout: 5s
  wait: 1s   # Time between individual pings
```

ICMP monitoring requires Heartbeat to run as root or have `CAP_NET_RAW` capability. The systemd service handles this automatically.

### TCP Port Monitors

TCP monitors verify that a port is accepting connections:

```yaml
# /etc/heartbeat/monitors.d/tcp.yml
- type: tcp
  id: tcp-database
  name: "Database Port Checks"
  schedule: '@every 10s'
  hosts:
    - "db-primary:5432"    # PostgreSQL
    - "db-replica:5432"
    - "redis-cluster:6379" # Redis
    - "kafka-broker:9092"  # Kafka

  # Optional: send data and check response
  check.send: "PING\r\n"
  check.receive: "PONG"

  timeout: 3s
```

### HTTP Monitors

HTTP monitors are the most feature-rich option - they check status codes, response content, TLS certificate validity, and more:

```yaml
# /etc/heartbeat/monitors.d/http.yml

# Basic HTTP check
- type: http
  id: http-homepage
  name: "Website Homepage"
  schedule: '@every 60s'
  urls:
    - "https://example.com"
    - "https://www.example.com"
  check.response.status: [200]
  timeout: 10s

# API endpoint check
- type: http
  id: http-api-health
  name: "API Health Endpoint"
  schedule: '@every 30s'
  urls:
    - "https://api.example.com/health"
  check.response.status: [200]
  # Check that the response body contains specific text
  check.response.body:
    - "ok"
    - '"status":"healthy"'
  timeout: 5s

# POST request monitor
- type: http
  id: http-api-auth
  name: "API Authentication Check"
  schedule: '@every 5m'
  urls:
    - "https://api.example.com/v1/status"
  method: POST
  check.request.headers:
    Content-Type: "application/json"
    Authorization: "Bearer your-health-check-token"
  check.response.status: [200]
  timeout: 10s

# TLS certificate expiry monitoring
- type: http
  id: http-tls-check
  name: "TLS Certificate Monitoring"
  schedule: '@every 1h'
  urls:
    - "https://example.com"
    - "https://api.example.com"
  ssl.verification_mode: full
  # Alert if certificate expires within 30 days
  ssl.certificate_authorities: ["/etc/ssl/certs/ca-certificates.crt"]
  timeout: 10s
```

### Using Cron-style Schedules

Instead of `@every`, you can use cron syntax:

```yaml
# Check at 9 AM and 5 PM on weekdays
schedule: "0 9,17 * * 1-5"

# Check every hour
schedule: "@hourly"

# Check every 5 minutes
schedule: "@every 5m"
```

## Monitoring Internal Services

For services not exposed to the internet, deploy Heartbeat on a host inside your network. For containerized environments:

```yaml
# /etc/heartbeat/monitors.d/internal.yml
- type: http
  id: internal-jenkins
  name: "Jenkins CI"
  schedule: '@every 30s'
  urls:
    - "http://jenkins.internal:8080/login"
  check.response.status: [200]

- type: tcp
  id: internal-smtp
  name: "Mail Server SMTP"
  schedule: '@every 60s'
  hosts:
    - "mail.internal:25"
    - "mail.internal:587"
```

## Loading Templates and Dashboards

```bash
# Set up index templates and Kibana dashboards
sudo heartbeat setup -e

# This loads:
# - ILM policy
# - Index template
# - Kibana dashboards for the Uptime app
```

## Starting Heartbeat

```bash
sudo systemctl enable heartbeat-elastic
sudo systemctl start heartbeat-elastic

# Monitor logs
sudo journalctl -u heartbeat-elastic -f
```

## Verifying Monitoring Data

Check that Heartbeat is sending data:

```bash
# Look for recent heartbeat documents
curl -u elastic:password \
  "https://localhost:9200/heartbeat-*/_search?pretty&size=3&sort=@timestamp:desc"
```

In Kibana, navigate to **Observability > Uptime** to see the monitor dashboard.

## Setting Up Alerts

Configure Kibana alerting rules to notify when monitors fail:

1. Go to **Observability > Uptime > Alerts**
2. Create a **Monitor Status** alert
3. Set conditions: alert when a monitor is down for more than 2 consecutive checks
4. Configure notification actions (email, Slack, PagerDuty, etc.)

Alternatively, use the Elasticsearch Watcher API:

```json
PUT _watcher/watch/heartbeat-down-alert
{
  "trigger": {
    "schedule": { "interval": "1m" }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["heartbeat-*"],
        "body": {
          "query": {
            "bool": {
              "must": [
                {"term": {"monitor.status": "down"}},
                {"range": {"@timestamp": {"gte": "now-2m"}}}
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": { "ctx.payload.hits.total.value": { "gt": 0 } }
  },
  "actions": {
    "notify_slack": {
      "webhook": {
        "scheme": "https",
        "host": "hooks.slack.com",
        "path": "/services/YOUR/WEBHOOK/PATH",
        "method": "post",
        "body": "{\"text\": \"Service DOWN: {{ctx.payload.hits.hits.0._source.monitor.name}}\"}"
      }
    }
  }
}
```

## Troubleshooting

**ICMP checks fail with "operation not permitted":**
```bash
# Check if heartbeat has the required capability
sudo setcap cap_net_raw+eip /usr/share/heartbeat/heartbeat

# Or run via systemd which handles this automatically
sudo systemctl restart heartbeat-elastic
```

**HTTP monitors timeout:**
- Increase `timeout` value in the monitor config
- Check firewall rules on the Heartbeat host
- Verify DNS resolution: `dig api.example.com`

**Monitors not reloading after config change:**
```bash
# Verify reload is enabled in heartbeat.yml
# Check the monitor file for YAML syntax errors
heartbeat test config -c /etc/heartbeat/heartbeat.yml

# Manually reload
sudo kill -HUP $(pidof heartbeat)
```

**TLS certificate check fails:**
```bash
# Test SSL manually
openssl s_client -connect example.com:443 -brief

# Check if the CA cert is trusted
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt /path/to/cert.pem
```

## Organizing Monitors at Scale

When monitoring dozens or hundreds of endpoints, organize monitors logically:

```text
/etc/heartbeat/monitors.d/
  production-web.yml     # Production web servers
  production-api.yml     # Production APIs
  staging-web.yml        # Staging environment
  databases.yml          # All database ports
  certificates.yml       # TLS cert expiry checks
  third-party.yml        # External dependencies
```

Use consistent naming with the `id` and `name` fields so monitors are easy to identify in Kibana dashboards.

Heartbeat is particularly valuable in multi-region setups where you deploy a Heartbeat instance in each region and check services from multiple vantage points. This reveals regional outages and network path issues that a single monitoring point would miss.
