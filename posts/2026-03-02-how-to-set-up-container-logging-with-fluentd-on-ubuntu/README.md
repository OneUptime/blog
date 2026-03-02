# How to Set Up Container Logging with Fluentd on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Docker, Logging, Fluentd, DevOps

Description: Set up Fluentd on Ubuntu to collect, parse, and route container logs from Docker to various destinations including Elasticsearch, S3, and log aggregation services.

---

Container logging is one of those things that seems straightforward until you're running dozens of containers and trying to correlate log entries across services. Docker's default json-file driver works fine for a single container, but it scales poorly. Fluentd fills this gap cleanly - it runs as a log aggregator, receives logs from Docker containers via the Fluentd logging driver, applies parsing and filtering rules, and forwards the output to wherever you need it.

This guide walks through installing Fluentd on Ubuntu, configuring Docker to send container logs to it, and setting up routing to common destinations.

## Architecture Overview

The basic setup looks like this:

```
Containers (Docker) --> Fluentd (collector) --> Destinations
                         - parse logs
                         - filter events
                         - add metadata
                         - route by tag
```

Docker containers use the `fluentd` logging driver, which sends log lines to Fluentd over a TCP connection (port 24224 by default). Fluentd receives these, applies any configured transforms, and outputs them to one or more destinations.

## Installing Fluentd (td-agent) on Ubuntu

Treasure Data maintains the `td-agent` package, which is the recommended stable distribution of Fluentd for production use.

```bash
# Install curl if not present
sudo apt update && sudo apt install -y curl

# Add the Fluentd repository and install td-agent
# This uses the official installation script
curl -fsSL https://toolbelt.treasuredata.com/sh/install-ubuntu-jammy-td-agent4.sh | sh

# Or for Ubuntu 20.04 (Focal):
# curl -fsSL https://toolbelt.treasuredata.com/sh/install-ubuntu-focal-td-agent4.sh | sh

# Verify installation
td-agent --version
```

Alternatively, install using the Fluent Package (newer packaging from Fluentd project):

```bash
# Install via Fluent Package repository
curl -fsSL https://packages.fluentd.org/pubkey.gpg | sudo gpg --dearmor -o /usr/share/keyrings/fluentd.gpg

echo "deb [signed-by=/usr/share/keyrings/fluentd.gpg] https://packages.fluentd.org/ubuntu/$(lsb_release -cs) stable contrib" | \
  sudo tee /etc/apt/sources.list.d/fluentd.list

sudo apt update
sudo apt install -y fluent-package

# Enable and start
sudo systemctl enable fluentd
sudo systemctl start fluentd
```

## Basic Fluentd Configuration

The main configuration file for td-agent is at `/etc/td-agent/td-agent.conf`. For fluent-package it's at `/etc/fluent/fluentd.conf`.

Start with a minimal configuration that accepts Docker logs and writes them to files:

```bash
sudo nano /etc/td-agent/td-agent.conf
```

```xml
## Basic Fluentd configuration for Docker container logging

## Input: Accept logs from Docker containers via Fluentd logging driver
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

## Filter: Parse JSON log entries from Docker containers
<filter docker.**>
  @type parser
  key_name log
  reserve_data true
  <parse>
    @type json
    # Fall back gracefully if log line is not JSON
    json_parser json
  </parse>
</filter>

## Filter: Add hostname to all events for identification in multi-host setups
<filter **>
  @type record_transformer
  <record>
    hostname "#{Socket.gethostname}"
    received_at ${time}
  </record>
</filter>

## Output: Write all container logs to files organized by container name
<match docker.**>
  @type file
  path /var/log/fluentd/containers/${tag}
  append true
  <format>
    @type json
  </format>
  <buffer tag,time>
    @type file
    path /var/log/fluentd/buffer/containers
    timekey 1d
    timekey_wait 10m
    flush_mode interval
    flush_interval 30s
  </buffer>
</match>

## Catch-all: Log anything not matched above
<match **>
  @type stdout
</match>
```

Create the log directories:

```bash
sudo mkdir -p /var/log/fluentd/containers
sudo mkdir -p /var/log/fluentd/buffer
sudo chown -R td-agent:td-agent /var/log/fluentd/

# Test the configuration
sudo td-agent --dry-run -c /etc/td-agent/td-agent.conf

# Restart Fluentd
sudo systemctl restart td-agent
sudo systemctl status td-agent
```

## Configuring Docker to Use Fluentd

Tell Docker to send container logs to Fluentd. You can do this globally (all containers) or per-container.

### Global Configuration (All Containers)

Edit the Docker daemon configuration:

```bash
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "fluentd",
  "log-opts": {
    "fluentd-address": "localhost:24224",
    "fluentd-async": "true",
    "fluentd-retry-wait": "1s",
    "fluentd-max-retries": "30",
    "tag": "docker.{{.Name}}"
  }
}
```

```bash
# Restart Docker to apply changes
sudo systemctl restart docker
```

Note: changing the logging driver affects only new containers. Existing containers keep their original logging configuration.

### Per-Container Configuration

For more control, specify the logging driver per container:

```bash
# Run a container with Fluentd logging
docker run -d \
  --name my-app \
  --log-driver=fluentd \
  --log-opt fluentd-address=localhost:24224 \
  --log-opt tag="docker.my-app" \
  --log-opt fluentd-async=true \
  nginx:latest

# Or in docker-compose.yml:
```

```yaml
# docker-compose.yml with Fluentd logging
version: "3.8"
services:
  webapp:
    image: nginx:latest
    logging:
      driver: fluentd
      options:
        fluentd-address: "localhost:24224"
        fluentd-async: "true"
        tag: "docker.{{.Name}}"

  api:
    image: myapp:latest
    logging:
      driver: fluentd
      options:
        fluentd-address: "localhost:24224"
        fluentd-async: "true"
        tag: "docker.{{.Name}}.{{.ID}}"
```

## Routing Logs to Different Destinations

Real power comes from routing logs to multiple destinations based on container tags or log content.

### Route to Elasticsearch

First install the Elasticsearch output plugin:

```bash
# Install elasticsearch plugin
sudo td-agent-gem install fluent-plugin-elasticsearch
```

Add an Elasticsearch output to your configuration:

```xml
## Send application logs to Elasticsearch
<match docker.webapp.**>
  @type elasticsearch
  host elasticsearch.example.com
  port 9200
  index_name fluentd-containers
  # Include date in index name for lifecycle management
  logstash_format true
  logstash_prefix docker-logs
  logstash_dateformat %Y.%m.%d

  <buffer>
    @type file
    path /var/log/fluentd/buffer/elasticsearch
    flush_mode interval
    flush_interval 10s
    # Retry on failures
    retry_type exponential_backoff
    retry_max_times 10
  </buffer>
</match>
```

### Route to Amazon S3

```bash
# Install S3 output plugin
sudo td-agent-gem install fluent-plugin-s3
```

```xml
## Archive all container logs to S3
<match docker.**>
  @type s3
  aws_key_id YOUR_AWS_KEY_ID
  aws_sec_key YOUR_AWS_SECRET_KEY
  s3_bucket your-log-bucket
  s3_region us-east-1
  path "docker-logs/%Y/%m/%d/"

  <format>
    @type json
  </format>

  <buffer tag,time>
    @type file
    path /var/log/fluentd/buffer/s3
    timekey 3600          # Group into 1-hour chunks
    timekey_wait 10m      # Wait 10 minutes before uploading
    chunk_limit_size 256m # Upload when chunk reaches 256MB
  </buffer>
</match>
```

### Split Logs by Level (Error vs Info)

```xml
## Separate error logs from info logs using grep filter
<match docker.**>
  @type copy

  ## Copy error logs to a dedicated error log file
  <store>
    @type file
    path /var/log/fluentd/errors/${tag}
    <filter>
      @type grep
      <regexp>
        key log
        pattern /\b(ERROR|FATAL|CRITICAL)\b/i
      </regexp>
    </filter>
  </store>

  ## Send all logs to stdout for debugging
  <store>
    @type stdout
  </store>
</match>
```

## Parsing Application Log Formats

Many applications write logs in specific formats that need parsing before they're useful.

### Parse Nginx Access Logs

```xml
## Parse Nginx access logs from a container tagged docker.nginx
<filter docker.nginx>
  @type parser
  key_name log
  reserve_data true
  <parse>
    @type nginx
  </parse>
</filter>
```

### Parse Custom Application Logs

```xml
## Parse a custom log format using regex
## Example log: [2024-01-15 10:30:45] ERROR app.service: Connection timeout
<filter docker.myapp>
  @type parser
  key_name log
  reserve_data true
  <parse>
    @type regexp
    expression /^\[(?<time>[^\]]+)\]\s+(?<level>\w+)\s+(?<logger>[^:]+):\s+(?<message>.*)$/
    time_format %Y-%m-%d %H:%M:%S
  </parse>
</filter>
```

## Monitoring Fluentd

Keep an eye on Fluentd's health with the built-in monitoring endpoint:

```xml
## Add monitoring endpoint to configuration
<source>
  @type monitor_agent
  bind 0.0.0.0
  port 24220
</source>
```

```bash
# Restart and check monitoring endpoint
sudo systemctl restart td-agent

# Query Fluentd's internal metrics
curl http://localhost:24220/api/plugins.json | python3 -m json.tool

# Check buffer usage, retry counts, etc.
curl http://localhost:24220/api/config.json
```

## Checking Fluentd Health

```bash
# Check service status
sudo systemctl status td-agent

# View Fluentd logs for errors
sudo journalctl -u td-agent -f

# Check the Fluentd log file
sudo tail -f /var/log/td-agent/td-agent.log

# Count log entries being received
curl -s http://localhost:24220/api/plugins.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for plugin in data.get('plugins', []):
    if plugin.get('type') == 'forward':
        print('Records received:', plugin.get('emit_count', 0))
"
```

## Summary

Fluentd gives you a reliable, configurable log pipeline for Docker containers on Ubuntu. The key components are: the `forward` input that receives logs from Docker's Fluentd logging driver, filter stages that parse and enrich log entries, and output plugins that route logs to their final destinations. Starting with file output and adding Elasticsearch or S3 routing as your needs grow is a common pattern that scales well from a handful of containers to hundreds.
