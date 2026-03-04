# How to Install and Configure Vector for High-Performance Log Routing on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Vector, Logging, Log Routing, Observability, Performance

Description: Learn how to install and configure Vector on RHEL as a high-performance, memory-safe log and metrics pipeline.

---

Vector is a high-performance observability data pipeline built in Rust. It collects, transforms, and routes logs and metrics with low resource overhead and built-in reliability features.

## Installing Vector

```bash
# Add the Vector repository
cat << 'REPO' | sudo tee /etc/yum.repos.d/timber-vector.repo
[timber-vector]
name=timber-vector
baseurl=https://repositories.timber.io/public/vector/rpm/el/9/$basearch
gpgcheck=0
enabled=1
REPO

# Install Vector
sudo dnf install -y vector

# Or install via script
curl --proto '=https' --tlsv1.2 -sSfL https://sh.vector.dev | bash -s -- -y
```

## Basic Configuration

```toml
# /etc/vector/vector.toml

# Collect syslog
[sources.syslog]
type = "file"
include = ["/var/log/messages", "/var/log/secure"]

# Collect journald logs
[sources.journald]
type = "journald"
current_boot_only = true

# Parse syslog format
[transforms.parse_syslog]
type = "remap"
inputs = ["syslog"]
source = '''
. = parse_syslog!(.message)
'''

# Add metadata
[transforms.enrich]
type = "remap"
inputs = ["parse_syslog", "journald"]
source = '''
.environment = "production"
.hostname = get_hostname!()
'''

# Output to console for testing
[sinks.console]
type = "console"
inputs = ["enrich"]
encoding.codec = "json"
```

## Forwarding to Elasticsearch

```toml
# /etc/vector/vector.toml

[sinks.elasticsearch]
type = "elasticsearch"
inputs = ["enrich"]
endpoints = ["http://elasticsearch:9200"]
bulk.index = "vector-%Y-%m-%d"

[sinks.elasticsearch.buffer]
type = "disk"
max_size = 1073741824  # 1GB
when_full = "block"
```

## Forwarding to S3

```toml
[sinks.s3]
type = "aws_s3"
inputs = ["enrich"]
bucket = "my-logs-bucket"
region = "us-east-1"
key_prefix = "logs/{{ hostname }}/%Y/%m/%d/"
encoding.codec = "json"
compression = "gzip"

[sinks.s3.batch]
max_bytes = 10485760  # 10MB
timeout_secs = 300
```

## Filtering and Routing

```toml
# Route logs by severity
[transforms.route]
type = "route"
inputs = ["enrich"]

[transforms.route.route]
errors = '.severity == "error" || .severity == "crit"'
warnings = '.severity == "warning"'

# Send errors to PagerDuty or alerting
[sinks.error_alerts]
type = "http"
inputs = ["route.errors"]
uri = "https://events.pagerduty.com/v2/enqueue"
encoding.codec = "json"
```

## Managing the Service

```bash
# Validate configuration
vector validate /etc/vector/vector.toml

# Start and enable
sudo systemctl enable --now vector

# Check status
sudo systemctl status vector

# View Vector's own metrics
vector top
```

Vector's VRL (Vector Remap Language) provides a powerful, type-safe way to transform log data. Unlike regex-based parsers, VRL catches errors at configuration validation time rather than at runtime.
