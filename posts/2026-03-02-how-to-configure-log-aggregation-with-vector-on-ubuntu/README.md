# How to Configure Log Aggregation with Vector on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, DevOps, Monitoring, Linux

Description: Learn how to install and configure Vector on Ubuntu for high-performance log aggregation, transformation, and routing to multiple destinations including files, Elasticsearch, and S3.

---

Vector is a high-performance observability data pipeline tool from Datadog. It collects logs (and metrics) from various sources, transforms them, and routes them to one or more destinations. It's written in Rust, which makes it fast and memory-efficient - suitable for both lightweight edge deployments and high-throughput aggregation.

The configuration model is based on "components" chained together: sources feed into transforms, which feed into sinks. You can build complex pipelines with routing logic, parsing, sampling, and deduplication.

## Installing Vector

```bash
# Install Vector using the official installation script
curl -1sLf 'https://repositories.timber.io/public/vector/cfg/setup/bash.deb.sh' | \
    sudo -E bash

sudo apt update
sudo apt install vector

# Verify installation
vector --version

# Check the default configuration location
ls /etc/vector/
```

Alternatively, for a more controlled installation:

```bash
# Download the .deb package directly
curl -LO https://packages.timber.io/vector/0.39.0/vector-0.39.0-amd64.deb
sudo dpkg -i vector-0.39.0-amd64.deb

# Start and enable the service
sudo systemctl enable --now vector
systemctl status vector
```

## Understanding Vector's Configuration

Vector uses TOML (or YAML) for configuration. The structure is:

```
[sources.<name>]     - where data comes from
[transforms.<name>]  - how to process data
[sinks.<name>]       - where data goes
```

Each component has a `type` field and component-specific options. Transforms and sinks have `inputs` fields specifying which components feed into them.

The default configuration file is at `/etc/vector/vector.yaml` or `/etc/vector/vector.toml`.

## Basic Example: System Logs to File

A simple configuration that collects system journal logs and writes them to a file:

```bash
sudo tee /etc/vector/vector.toml << 'EOF'
# Data directory for Vector's internal state
data_dir = "/var/lib/vector"

# =============================================================
# SOURCES
# =============================================================

# Collect from systemd journal
[sources.journal]
type = "journald"
include_units = []  # Empty = all units

# Collect from syslog
[sources.syslog_input]
type = "syslog"
address = "0.0.0.0:514"
mode = "udp"

# Collect from a log file
[sources.nginx_logs]
type = "file"
include = ["/var/log/nginx/*.log"]
# Start from the end of file (don't re-read old logs on restart)
read_from = "end"

# =============================================================
# TRANSFORMS
# =============================================================

# Parse nginx access log format into structured fields
[transforms.parse_nginx]
type = "remap"
inputs = ["nginx_logs"]
source = '''
# Parse the nginx combined log format using a VRL pattern
. = parse_nginx_log!(string!(.message), "combined")
'''

# Add a hostname field to all journal entries
[transforms.enrich_journal]
type = "remap"
inputs = ["journal"]
source = '''
.hostname = get_hostname!()
.pipeline = "journal"
'''

# Route logs based on content
[transforms.router]
type = "route"
inputs = ["enrich_journal", "syslog_input"]
route.errors = '.message contains "error" || .message contains "ERROR"'
route.warnings = '.message contains "warn" || .message contains "WARN"'

# =============================================================
# SINKS
# =============================================================

# Write all nginx logs to a file
[sinks.nginx_file]
type = "file"
inputs = ["parse_nginx"]
path = "/var/log/vector/nginx-%Y-%m-%d.log"
encoding.codec = "json"

# Write errors to a separate file for quick access
[sinks.error_file]
type = "file"
inputs = ["router.errors"]
path = "/var/log/vector/errors-%Y-%m-%d.log"
encoding.codec = "json"

# Write everything to another file
[sinks.all_logs]
type = "file"
inputs = ["enrich_journal", "parse_nginx", "syslog_input"]
path = "/var/log/vector/all-%Y-%m-%d.log"
encoding.codec = "json"
EOF
```

Create the output directory:

```bash
sudo mkdir -p /var/log/vector
sudo chown vector:vector /var/log/vector
```

Validate and restart:

```bash
# Validate the configuration
vector validate /etc/vector/vector.toml

# Apply the new configuration
sudo systemctl restart vector

# Watch logs
journalctl -u vector -f
```

## Shipping Logs to Elasticsearch or OpenSearch

```toml
[sinks.elasticsearch]
type = "elasticsearch"
inputs = ["enrich_journal", "parse_nginx"]

# OpenSearch endpoint (compatible with Elasticsearch API)
endpoints = ["https://opensearch.example.com:9200"]

# Index name pattern
index = "logs-%Y.%m.%d"

# Authentication
auth.strategy = "basic"
auth.user = "vector"
auth.password = "your-password"

# TLS settings (if using self-signed certs)
# tls.verify_certificate = false

# Compression for better throughput
compression = "gzip"

# Batch settings
batch.max_events = 1000
batch.timeout_secs = 5
```

## Shipping Logs to Loki (Grafana Stack)

```toml
[sinks.loki]
type = "loki"
inputs = ["enrich_journal", "parse_nginx"]

endpoint = "http://loki.example.com:3100"

# Labels added to all log streams
labels.source = "vector"
labels.host = "{{ host }}"
labels.service = "{{ .unit }}"

encoding.codec = "json"
```

## Sending to Multiple Destinations

Vector makes it easy to send the same data to multiple sinks:

```toml
# Both Elasticsearch and S3
[sinks.elasticsearch]
type = "elasticsearch"
inputs = ["parsed_logs"]
endpoints = ["https://es.example.com:9200"]
index = "logs-%Y.%m.%d"

[sinks.s3_archive]
type = "aws_s3"
inputs = ["parsed_logs"]
bucket = "my-log-archive"
region = "us-east-1"
key_prefix = "logs/%Y/%m/%d/"
compression = "gzip"
encoding.codec = "json"

# Batch configuration for S3 (write hourly files)
batch.timeout_secs = 3600
```

## Advanced Transformations with VRL

Vector's Remap Language (VRL) is a purpose-built language for log transformation:

```toml
[transforms.enrich_and_parse]
type = "remap"
inputs = ["nginx_logs"]
source = '''
# Parse structured JSON logs
. = parse_json!(.message)

# Add derived fields
.environment = get_env_var!("ENVIRONMENT")
.hostname = get_hostname!()

# Normalize status code categories
.status_category = if .status >= 500 {
    "server_error"
} else if .status >= 400 {
    "client_error"
} else if .status >= 300 {
    "redirect"
} else {
    "success"
}

# Parse the IP for geolocation (if mmdb is available)
# .geo = get_enrichment_table_record!("geoip", {"ip": .client_ip})

# Remove sensitive fields
del(.authorization_header)
del(.cookie)

# Convert response_time from string to float
.response_time_ms = float!(parse_regex!(.response_time, r'^(?P<time>[0-9.]+)').time) * 1000
'''
```

## Log Sampling for High-Volume Pipelines

When you have too much log data for downstream storage, use sampling:

```toml
[transforms.sample_debug_logs]
type = "sample"
inputs = ["all_logs"]

# Keep 10% of DEBUG messages, 100% of everything else
rate = 10
key_field = "level"
exclude.source = 'string!(.level) == "ERROR" || string!(.level) == "WARN"'
```

## Using Vector as an Aggregator

On a central aggregation server that receives logs from multiple agents:

```toml
# Aggregator config: receives from Vector agents on other servers
[sources.vector_agents]
type = "vector"
address = "0.0.0.0:6000"

[transforms.add_received_at]
type = "remap"
inputs = ["vector_agents"]
source = '.received_at = now()'

[sinks.final_storage]
type = "elasticsearch"
inputs = ["add_received_at"]
endpoints = ["http://elasticsearch:9200"]
index = "aggregated-logs-%Y.%m.%d"
```

On each agent server, send to the aggregator:

```toml
[sinks.aggregator]
type = "vector"
inputs = ["local_sources"]
address = "aggregator.example.com:6000"
compression = "gzip"
```

## Monitoring Vector Itself

Vector exposes its own metrics:

```toml
# Expose Vector's internal metrics via Prometheus
[sources.internal_metrics]
type = "internal_metrics"

[sinks.prometheus_exporter]
type = "prometheus_exporter"
inputs = ["internal_metrics"]
address = "0.0.0.0:9598"
```

```bash
# Check Vector's metrics
curl -s http://localhost:9598/metrics | grep vector_

# View internal logs
vector top  # Interactive TUI for real-time monitoring
```

## Practical Systemd Journal Collection

For a production server sending all systemd journal logs to a central store:

```toml
# /etc/vector/vector.toml on each server
data_dir = "/var/lib/vector"

[sources.journal]
type = "journald"
# Exclude noisy units
exclude_units = ["kubelet.service", "containerd.service"]
since_now = false  # Pick up from where we left off on restart

[transforms.add_host]
type = "remap"
inputs = ["journal"]
source = '''
.host = get_hostname!()
.datacenter = "us-east-1"
.environment = "production"
'''

[sinks.central_aggregator]
type = "vector"
inputs = ["add_host"]
address = "log-aggregator.example.com:6000"

# Buffer events locally if aggregator is unreachable
[sinks.central_aggregator.buffer]
type = "disk"
max_size = 268435488  # 256 MB
when_full = "block"
```

## Troubleshooting

```bash
# Validate configuration
vector validate

# Run in debug mode to see event flow
vector --config /etc/vector/vector.toml --verbose

# Check which sources are active and their event counts
vector top

# Test a transformation manually with sample input
echo '{"message":"test error message","level":"error"}' | \
    vector test --config /etc/vector/vector.toml

# Check the service logs
journalctl -u vector -f

# Common issues:
# - Permission denied: vector user needs read access to log files
# - Disk buffer full: reduce retention or increase buffer size
# - High CPU: add sampling for high-volume low-value logs
```

Vector is a well-designed tool for log pipelines. The VRL transformation language is expressive enough for complex use cases, and the Rust implementation means it handles high log volumes without becoming the bottleneck. Once you have Vector running on your servers, you have a reliable foundation for routing logs wherever you need them.
