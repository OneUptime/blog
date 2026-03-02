# How to Configure Filebeat for Log Collection on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Filebeat, ELK Stack, Log Management, Monitoring

Description: Configure Filebeat on Ubuntu to collect and ship logs from files, system logs, and containers to Elasticsearch or Logstash for centralized log management.

---

Filebeat is a lightweight log shipper from Elastic. It's designed to run on every server you want to collect logs from, tailing log files and shipping events to Elasticsearch, Logstash, Kafka, or other destinations. The key advantage over a full Logstash agent is resource consumption - Filebeat uses very little CPU and memory, making it suitable for running on production application servers.

Filebeat handles back-pressure automatically - if Elasticsearch is slow or unavailable, Filebeat pauses its input and waits. It also tracks its position in each file using a registry, so it won't re-send events after a restart.

## Architecture

A typical setup has Filebeat on each server shipping to either:

1. **Directly to Elasticsearch**: Simpler, Filebeat handles basic parsing via modules. Good for standard log formats.
2. **To Logstash**: More powerful, Logstash handles complex transformations before indexing. Better when you need custom grok patterns or enrichment.

This guide covers both approaches.

## Prerequisites

- Ubuntu 22.04 or 24.04
- Elasticsearch 8.x running (or Logstash for the pipeline approach)
- Root or sudo access

## Installing Filebeat

```bash
# Add Elastic repository key and source (same as Elasticsearch)
curl -fsSL https://artifacts.elastic.co/GPG-KEY-elasticsearch | \
  sudo gpg --dearmor -o /usr/share/keyrings/elastic-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/elastic-archive-keyring.gpg] \
  https://artifacts.elastic.co/packages/8.x/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/elastic-8.x.list

sudo apt update
sudo apt install -y filebeat

# Enable the service (don't start yet - configure first)
sudo systemctl enable filebeat
```

## Basic Configuration

```bash
# Back up the default configuration
sudo cp /etc/filebeat/filebeat.yml /etc/filebeat/filebeat.yml.bak

sudo nano /etc/filebeat/filebeat.yml
```

```yaml
# /etc/filebeat/filebeat.yml

# ============================== Filebeat inputs ==============================
filebeat.inputs:

# Read from log files
- type: log
  id: nginx-access-logs
  enabled: true

  # Paths to monitor (supports glob patterns)
  paths:
    - /var/log/nginx/access.log
    - /var/log/nginx/error.log

  # Add fields to identify this data source
  fields:
    log_type: nginx
    server_name: web01
    environment: production
  fields_under_root: true  # Merge fields to the top level, not under a "fields" key

  # Multiline settings - for logs that span multiple lines
  # (uncomment for Java stack traces, etc.)
  # multiline.type: pattern
  # multiline.pattern: '^\d{4}-\d{2}-\d{2}'
  # multiline.negate: true
  # multiline.match: after

- type: log
  id: application-logs
  enabled: true
  paths:
    - /var/log/myapp/*.log
  # Parse JSON log files
  parsers:
    - ndjson:
        keys_under_root: true
        add_error_key: true
        overwrite_keys: true
  fields:
    log_type: application
  fields_under_root: true

# ============================== Filebeat modules ==============================
# Modules provide pre-built configurations for common services
filebeat.config.modules:
  path: ${path.config}/modules.d/*.yml
  reload.enabled: false

# ============================== Outputs ==============================
# Choose ONE output section

# Option 1: Direct to Elasticsearch
output.elasticsearch:
  # Array of Elasticsearch hosts
  hosts: ["https://elasticsearch-server:9200"]

  # Authentication
  username: "filebeat_writer"
  password: "your-filebeat-user-password"

  # SSL settings
  ssl.certificate_authorities:
    - /etc/filebeat/certs/ca.crt
  # Or if Elasticsearch is on the same host:
  # ssl.certificate_authorities: ["/etc/elasticsearch/certs/http_ca.crt"]

  # Index template settings
  # Filebeat creates these automatically
  index: "filebeat-%{[agent.version]}-%{+yyyy.MM.dd}"

# Option 2: Send to Logstash (comment out the elasticsearch output above)
# output.logstash:
#   hosts: ["logstash-server:5044"]
#   ssl.enabled: false  # Enable and configure certificates for production

# ============================== Kibana ==============================
# Used for setting up dashboards
setup.kibana:
  host: "https://kibana-server:5601"
  username: "elastic"
  password: "your-elastic-password"
  ssl.certificate_authorities: ["/etc/filebeat/certs/ca.crt"]

# ============================== General ==============================
# The name of the shipping host
# Defaults to the machine's hostname
name: "web01-filebeat"

# Logging
logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0640
```

## Setting Up a Filebeat User in Elasticsearch

Rather than using the `elastic` superuser, create a dedicated Filebeat user:

```bash
# On your Elasticsearch server, create the filebeat user
# (Run this from a machine with access to Elasticsearch)

curl --cacert /etc/elasticsearch/certs/http_ca.crt \
  -u elastic:your-elastic-password \
  -X POST https://localhost:9200/_security/user/filebeat_writer \
  -H "Content-Type: application/json" \
  -d '{
    "password": "your-filebeat-user-password",
    "roles": ["filebeat_writer"],
    "full_name": "Filebeat Writer"
  }'
```

## Using Filebeat Modules

Filebeat modules provide pre-built configurations for common log formats:

```bash
# List available modules
filebeat modules list

# Enable the nginx module
sudo filebeat modules enable nginx

# Enable the system module (for auth.log, syslog)
sudo filebeat modules enable system

# Enable the auditd module (for audit logs)
sudo filebeat modules enable auditd
```

Configure the Nginx module:

```bash
sudo nano /etc/filebeat/modules.d/nginx.yml
```

```yaml
# /etc/filebeat/modules.d/nginx.yml
- module: nginx
  access:
    enabled: true
    var.paths: ["/var/log/nginx/access.log*"]
  error:
    enabled: true
    var.paths: ["/var/log/nginx/error.log*"]
```

Configure the system module:

```bash
sudo nano /etc/filebeat/modules.d/system.yml
```

```yaml
# /etc/filebeat/modules.d/system.yml
- module: system
  syslog:
    enabled: true
    var.paths: ["/var/log/syslog*"]
  auth:
    enabled: true
    var.paths: ["/var/log/auth.log*"]
```

## Enrolling Filebeat with Elasticsearch (Simplified Setup)

Elasticsearch 8.x supports an enrollment token workflow that simplifies TLS setup:

```bash
# On the Elasticsearch server, generate an enrollment token for Beats
sudo /usr/share/elasticsearch/bin/elasticsearch-create-enrollment-token -s beats

# On the Filebeat server, use the enrollment token
sudo filebeat enroll https://elasticsearch-server:9200 ENROLLMENT_TOKEN

# This automatically configures SSL certificates and credentials
```

## Testing the Configuration

```bash
# Test the configuration file for syntax errors
sudo filebeat test config

# Test connectivity to the output
sudo filebeat test output

# Run Filebeat once in debug mode to see what it would ship
sudo filebeat -e -d "*" --once 2>&1 | head -100
```

## Starting Filebeat

```bash
# Set up index templates and dashboards in Kibana
sudo filebeat setup --dashboards

# Start Filebeat
sudo systemctl start filebeat
sudo systemctl status filebeat
```

## Monitoring Filebeat Itself

```bash
# Check Filebeat's internal metrics
sudo filebeat --strict.perms=false export config | grep -A5 monitoring

# View the log
sudo tail -f /var/log/filebeat/filebeat

# Check the registry to see which files are being tracked
sudo cat /var/lib/filebeat/registry/filebeat/log.json | python3 -m json.tool | head -50
```

## Docker Container Log Collection

To collect logs from Docker containers:

```yaml
# Add to filebeat.yml inputs section
- type: container
  id: docker-logs
  enabled: true
  paths:
    - /var/lib/docker/containers/*/*.log
  stream: all  # all, stdout, stderr

  # Add container metadata from Docker
  processors:
    - add_docker_metadata:
        host: "unix:///var/run/docker.sock"
```

Filebeat needs read access to Docker socket:

```bash
sudo usermod -aG docker filebeat
sudo systemctl restart filebeat
```

## Handling High Log Volumes

For high-volume environments, tune Filebeat's performance:

```yaml
# In filebeat.yml
filebeat.inputs:
- type: log
  paths: ["/var/log/myapp/*.log"]
  # How often to check for new files
  scan_frequency: 10s
  # How long to keep a file handle open after EOF
  close_inactive: 5m

# Increase the queue size to handle bursts
queue.mem:
  events: 4096
  flush.min_events: 512
  flush.timeout: 5s

# Use multiple workers for high-throughput Elasticsearch output
output.elasticsearch:
  worker: 4
  bulk_max_size: 500
```

Monitor your Filebeat agents with [OneUptime](https://oneuptime.com) to ensure they're running and actively shipping logs. A Filebeat agent that stops collecting logs silently can leave you without visibility into your systems at exactly the wrong moment.
