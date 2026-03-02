# How to Set Up Metricbeat for System Metrics on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monitoring, Elasticsearch, Metricbeat, Observability

Description: A practical guide to installing and configuring Metricbeat on Ubuntu to collect system metrics and ship them to Elasticsearch or Logstash.

---

Metricbeat is a lightweight shipper from Elastic that collects system-level metrics - CPU usage, memory, disk I/O, network traffic, and more - and forwards them to Elasticsearch or Logstash. It is part of the Beats family and pairs naturally with Kibana for visualization.

This guide covers a full Metricbeat setup on Ubuntu, from installation through module configuration and dashboard setup.

## Prerequisites

- Ubuntu 20.04 or 22.04
- An Elasticsearch cluster (local or remote)
- Kibana (optional, for dashboards)
- sudo privileges

## Installing Metricbeat

Elastic provides a dedicated APT repository. Add it and install Metricbeat:

```bash
# Import the Elastic GPG key
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg

# Add the APT repository
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/elastic-8.x.list

# Update and install
sudo apt-get update && sudo apt-get install -y metricbeat
```

Verify the installation:

```bash
metricbeat version
```

## Configuring the Main Configuration File

The main config lives at `/etc/metricbeat/metricbeat.yml`. Open it and configure the output:

```yaml
# /etc/metricbeat/metricbeat.yml

# Output to Elasticsearch directly
output.elasticsearch:
  hosts: ["https://localhost:9200"]
  # Use API key or username/password
  username: "elastic"
  password: "your-password"
  # SSL settings if using TLS
  ssl.certificate_authorities: ["/etc/metricbeat/certs/ca.crt"]

# Kibana endpoint for dashboard setup
setup.kibana:
  host: "https://localhost:5601"
  username: "elastic"
  password: "your-password"
```

If you want to ship to Logstash instead:

```yaml
output.logstash:
  hosts: ["logstash-host:5044"]
```

Only one output can be active at a time - comment out the others.

## Enabling Modules

Metricbeat organizes collection via modules. The `system` module is the most common starting point.

```bash
# List available modules
metricbeat modules list

# Enable the system module
sudo metricbeat modules enable system

# Enable additional modules
sudo metricbeat modules enable docker
sudo metricbeat modules enable nginx
sudo metricbeat modules enable redis
```

### Configuring the System Module

The system module config is at `/etc/metricbeat/modules.d/system.yml`:

```yaml
# /etc/metricbeat/modules.d/system.yml
- module: system
  period: 10s  # Collection interval
  metricsets:
    - cpu
    - load
    - memory
    - network
    - process
    - process_summary
    - uptime
    - socket_summary
    - diskio
    - filesystem
    - fsstat

  # CPU stats configuration
  cpu.metrics: ["percentages", "normalized_percentages"]

  # Process filtering - collect stats for these processes
  process.include_top_n:
    by_cpu: 5       # Top 5 by CPU usage
    by_memory: 5    # Top 5 by memory usage

  # Filesystem: exclude virtual and special filesystems
  filesystem.ignore_types:
    - nfs
    - smbfs
    - autofs
    - tmpfs
    - devtmpfs
```

### Configuring the Docker Module

If you run Docker on this host, enable container metrics:

```yaml
# /etc/metricbeat/modules.d/docker.yml
- module: docker
  metricsets:
    - container
    - cpu
    - diskio
    - memory
    - network
  hosts: ["unix:///var/run/docker.sock"]
  period: 10s
  enabled: true
```

Add the `metricbeat` user to the docker group so it can access the socket:

```bash
sudo usermod -aG docker metricbeat
```

## Testing the Configuration

Before starting the service, validate your config:

```bash
# Test configuration syntax
sudo metricbeat test config

# Test connectivity to Elasticsearch
sudo metricbeat test output
```

## Loading Dashboards and Index Templates

Metricbeat ships with pre-built Kibana dashboards. Load them once:

```bash
# Load index template into Elasticsearch
sudo metricbeat setup --index-management

# Load pre-built Kibana dashboards
sudo metricbeat setup --dashboards

# Or do everything at once
sudo metricbeat setup -e
```

The `-e` flag logs to stdout, useful for debugging setup issues.

## Starting Metricbeat

```bash
# Enable and start the service
sudo systemctl enable metricbeat
sudo systemctl start metricbeat

# Check status
sudo systemctl status metricbeat

# View logs
sudo journalctl -u metricbeat -f
```

## Verifying Data in Elasticsearch

Check that data is flowing:

```bash
# Query Elasticsearch for recent metricbeat documents
curl -u elastic:your-password \
  "https://localhost:9200/metricbeat-*/_search?pretty&size=1"

# Check index size and doc count
curl -u elastic:your-password \
  "https://localhost:9200/_cat/indices/metricbeat-*?v&s=index"
```

## Tagging and Custom Fields

Add custom metadata to all events - useful for filtering in Kibana when you have multiple hosts:

```yaml
# In metricbeat.yml
fields:
  environment: production
  datacenter: us-east-1
  team: platform

# Make these fields top-level (not nested under 'fields')
fields_under_root: true

# Add tags
tags: ["ubuntu", "web-tier"]
```

## Reducing Cardinality and Resource Usage

On busy systems, Metricbeat can generate a large volume of data. Tune the collection:

```yaml
# Increase collection interval to reduce volume
- module: system
  period: 30s   # Collect every 30s instead of default 10s
  metricsets:
    - cpu
    - memory
    # Remove process-level collection if not needed
    # - process
```

You can also limit process collection to specific names:

```yaml
  processes: ['.*nginx.*', '.*postgres.*', '.*redis.*']
```

## Processor Pipelines

Use processors to enrich or filter events before shipping:

```yaml
# In metricbeat.yml
processors:
  # Add hostname as a field
  - add_host_metadata:
      when.not.contains.tags: forwarded

  # Drop events with low CPU usage to reduce noise
  - drop_event:
      when:
        range:
          system.cpu.total.pct:
            lt: 0.05

  # Rename a field
  - rename:
      fields:
        - from: "host.name"
          to: "hostname"
```

## Monitoring Metricbeat Itself

Enable internal metrics collection so you can monitor Metricbeat's own performance:

```yaml
# In metricbeat.yml
monitoring.enabled: true
monitoring.elasticsearch:
  hosts: ["https://localhost:9200"]
  username: "elastic"
  password: "your-password"
```

## Troubleshooting

**Metricbeat fails to connect to Elasticsearch:**
```bash
# Test output connectivity
sudo metricbeat test output -e

# Check TLS certificate issues
sudo metricbeat test output -e -v
```

**High CPU usage from Metricbeat itself:**
- Increase collection intervals
- Disable unused metricsets
- Limit process collection scope

**Missing data in Kibana:**
```bash
# Check if data is being indexed
curl -u elastic:password "https://localhost:9200/_cat/indices/metricbeat-*?v"

# Check for errors in Metricbeat logs
sudo journalctl -u metricbeat --since "10 minutes ago" | grep -i error
```

**Permission denied on /proc or /sys:**
```bash
# Metricbeat may need to run as root for some metricsets
# Or adjust the service to have the right capabilities
sudo systemctl edit metricbeat
# Add: AmbientCapabilities=CAP_SYS_PTRACE
```

## Wrapping Up

Metricbeat gives you comprehensive system visibility with minimal configuration. The module system means you can add coverage for new services - databases, web servers, message queues - by enabling the appropriate module rather than writing custom collectors. Combined with Elasticsearch and Kibana, it forms a solid foundation for infrastructure observability.

For production deployments, consider using Elastic Agent instead of individual Beats - it consolidates Metricbeat, Filebeat, and other agents under a single process with centralized Fleet management.
