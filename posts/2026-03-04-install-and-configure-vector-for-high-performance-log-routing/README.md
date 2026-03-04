# How to Install and Configure Vector for High-Performance Log Routing on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Vector, Log Aggregation, Linux

Description: Learn how to install and Configure Vector for High-Performance Log Routing on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Vector is a high-performance observability data pipeline built in Rust. It collects, transforms, and routes logs and metrics with low resource usage and high throughput, making it suitable for high-volume logging environments.

## Prerequisites

- RHEL 9
- Root or sudo access

## Step 1: Install Vector

```bash
curl -1sLf 'https://repositories.timber.io/public/vector/cfg/setup/bash.rpm.sh' | sudo bash
sudo dnf install -y vector
```

## Step 2: Configure Vector

```bash
sudo vi /etc/vector/vector.yaml
```

```yaml
sources:
  syslog:
    type: journald
    current_boot_only: true

  files:
    type: file
    include:
      - /var/log/httpd/*.log
      - /var/log/nginx/*.log

transforms:
  parse_logs:
    type: remap
    inputs:
      - files
    source: |
      . = parse_apache_log!(.message, format: "combined")
      .hostname = get_hostname!()

sinks:
  elasticsearch:
    type: elasticsearch
    inputs:
      - parse_logs
      - syslog
    endpoints:
      - "http://elasticsearch.local:9200"
    index: "vector-%Y-%m-%d"
    bulk:
      action: index

  console:
    type: console
    inputs:
      - parse_logs
    encoding:
      codec: json
```

## Step 3: Start and Enable

```bash
sudo systemctl enable --now vector
sudo systemctl status vector
```

## Step 4: Validate Configuration

```bash
vector validate /etc/vector/vector.yaml
```

## Step 5: Monitor Vector

Vector exposes metrics on a built-in endpoint:

```yaml
api:
  enabled: true
  address: "0.0.0.0:8686"
```

```bash
vector top
```

## Step 6: Transform with VRL (Vector Remap Language)

```yaml
transforms:
  enrich:
    type: remap
    inputs:
      - syslog
    source: |
      .environment = "production"
      .processed_at = now()
      if contains(string!(.message), "error") {
        .severity = "error"
      }
```

## Conclusion

Vector provides a high-performance, memory-efficient log pipeline on RHEL 9. Its Rust implementation delivers excellent throughput with low resource usage, and VRL provides a powerful language for log transformation and enrichment.
