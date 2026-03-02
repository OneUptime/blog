# How to Configure Log Shipping with Fluentd on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, Fluentd, Log Management, DevOps

Description: Set up Fluentd on Ubuntu to collect, parse, filter, and forward logs from multiple sources to destinations like Elasticsearch, S3, or remote syslog servers.

---

Fluentd is a unified log collector and shipper used widely in production environments. It sits between your log sources and your log storage systems, collecting logs from files, syslog, and application outputs, then routing and transforming them before forwarding to destinations like Elasticsearch, S3, Google Cloud Logging, or other services. Unlike simpler log forwarders, Fluentd handles structured logs natively and has a rich plugin ecosystem.

## Installing Fluentd

Ubuntu users should install Fluentd via the official package repository (td-agent or fluent-package):

```bash
# Install the official Fluentd package (fluent-package, formerly td-agent)
# Download and run the installation script
curl -fsSL https://toolbelt.treasuredata.com/sh/install-ubuntu-jammy-fluent-package5-lts.sh | sh

# For Ubuntu 22.04 (Jammy). For other versions, check:
# https://docs.fluentd.org/installation/install-by-deb

# Verify installation
fluentd --version
# or for td-agent:
# td-agent --version

# Start and enable the service
sudo systemctl enable fluentd
sudo systemctl start fluentd
sudo systemctl status fluentd
```

## Configuration File Structure

Fluentd's configuration uses a declarative syntax with four main directives:

- `<source>` - where logs come from
- `<filter>` - transform or enrich logs
- `<match>` - where logs go
- `<label>` - group related directives

```bash
# Main configuration file
sudo nano /etc/fluent/fluentd.conf
# or for td-agent:
# sudo nano /etc/td-agent/td-agent.conf
```

## Basic Configuration: Collecting System Logs

```bash
# /etc/fluent/fluentd.conf

# Collect from syslog (UDP port 5140 to avoid needing root)
<source>
  @type syslog
  port 5140
  bind 0.0.0.0
  tag system.syslog
  <transport udp>
  </transport>
  <parse>
    @type syslog
  </parse>
</source>

# Collect from a log file
<source>
  @type tail
  path /var/log/nginx/access.log
  pos_file /var/log/fluent/nginx-access.log.pos
  tag nginx.access
  <parse>
    @type nginx
  </parse>
</source>

# Collect from another file with custom format
<source>
  @type tail
  path /var/log/myapp/application.log
  pos_file /var/log/fluent/myapp.log.pos
  tag app.myapp
  <parse>
    @type multiline
    format_firstline /^\d{4}-\d{2}-\d{2}/
    format1 /^(?<time>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (?<level>\w+) (?<message>.*)/
    time_format %Y-%m-%d %H:%M:%S
  </parse>
</source>

# Write all collected logs to a file (for testing)
<match **>
  @type file
  path /var/log/fluent/test-output
  <buffer>
    flush_interval 10s
  </buffer>
</match>
```

## Reading from the systemd Journal

Fluentd can read directly from the systemd journal with the `in_systemd` plugin:

```bash
# Install the systemd input plugin
sudo fluent-gem install fluent-plugin-systemd
# or:
# sudo td-agent-gem install fluent-plugin-systemd
```

```bash
# Configuration to read from systemd journal
<source>
  @type systemd
  path /var/log/journal
  pos_file /var/log/fluent/journald.pos
  tag journal
  read_from_head false
  <storage>
    @type local
    persistent true
    path /var/log/fluent/journal_cursor.json
  </storage>
  <entry>
    fields_strip_underscores true
    fields_lowercase true
  </entry>
</source>
```

## Filtering and Transforming Logs

Filters transform log records before they reach destinations:

```bash
# Filter: add hostname field to all records
<filter **>
  @type record_transformer
  <record>
    hostname "#{Socket.gethostname}"
    environment production
    datacenter us-east-1
  </record>
</filter>

# Filter: parse nginx access logs and extract fields
<filter nginx.access>
  @type parser
  key_name message
  <parse>
    @type regexp
    expression /^(?<client>[^ ]*) (?<user>[^ ]*) (?<method>[A-Z]+) (?<path>[^ ]*) HTTP\/[0-9.]* (?<status>[0-9]+) (?<size>[0-9]+)/
  </parse>
</filter>

# Filter: drop debug messages
<filter **>
  @type grep
  <exclude>
    key level
    pattern /^debug$/i
  </exclude>
</filter>

# Filter: route based on severity
<filter app.**>
  @type grep
  <regexp>
    key level
    pattern /^(error|critical|warning)$/i
  </regexp>
</filter>
```

## Forwarding to Elasticsearch

One of the most common Fluentd use cases:

```bash
# Install Elasticsearch output plugin
sudo fluent-gem install fluent-plugin-elasticsearch
```

```bash
# Forward logs to Elasticsearch
<match **>
  @type elasticsearch
  host elasticsearch.example.com
  port 9200
  index_name fluentd-${tag}-%Y%m%d
  type_name _doc
  include_timestamp true

  # Authentication (if using X-Pack)
  user elastic
  password your-password
  scheme https
  ssl_verify true
  ca_file /etc/ssl/certs/ca-certificates.crt

  # Buffer for reliability
  <buffer tag,time>
    @type file
    path /var/log/fluent/es-buffer
    flush_mode interval
    flush_interval 5s
    chunk_limit_size 5MB
    queue_limit_length 32
    retry_forever true
    retry_max_interval 30
    total_limit_size 512MB
  </buffer>
</match>
```

## Forwarding to S3

For long-term log archival:

```bash
# Install S3 output plugin
sudo fluent-gem install fluent-plugin-s3
```

```bash
<match **>
  @type s3
  aws_key_id YOUR_ACCESS_KEY_ID
  aws_sec_key YOUR_SECRET_ACCESS_KEY
  s3_bucket your-log-bucket
  s3_region us-east-1

  # Organize by date and hostname
  path logs/%Y/%m/%d/${hostname}/
  s3_object_key_format %{path}%{time_slice}_%{index}.%{file_extension}

  time_slice_format %Y%m%d%H
  time_slice_wait 10m

  # Compress before uploading
  store_as gzip

  <buffer time>
    @type file
    path /var/log/fluent/s3-buffer
    timekey 1h
    timekey_wait 10m
    chunk_limit_size 256MB
  </buffer>
</match>
```

## Forwarding to Remote Syslog

Forward to a central syslog server:

```bash
# Install remote syslog plugin
sudo fluent-gem install fluent-plugin-remote_syslog
```

```bash
<match **>
  @type remote_syslog
  host syslog.example.com
  port 514
  protocol tcp
  hostname "#{Socket.gethostname}"
  severity info
  program fluentd

  <buffer>
    flush_interval 5s
  </buffer>
</match>
```

## Using Labels for Complex Routing

Labels allow organizing complex routing logic:

```bash
<source>
  @type tail
  path /var/log/nginx/access.log
  pos_file /var/log/fluent/nginx.pos
  tag nginx.access
  @label @NGINX
  <parse>
    @type nginx
  </parse>
</source>

<source>
  @type tail
  path /var/log/myapp/app.log
  pos_file /var/log/fluent/app.pos
  tag app.main
  @label @APP
  <parse>
    @type json
  </parse>
</source>

# Handle nginx logs
<label @NGINX>
  <filter nginx.access>
    @type record_transformer
    <record>
      service nginx
      log_type access
    </record>
  </filter>

  <match nginx.**>
    @type elasticsearch
    host elasticsearch.example.com
    port 9200
    index_name nginx-logs-%Y%m%d
    <buffer>
      flush_interval 10s
    </buffer>
  </match>
</label>

# Handle app logs
<label @APP>
  # Send errors to PagerDuty or alerting
  <match app.**>
    @type copy
    <store>
      @type elasticsearch
      host elasticsearch.example.com
      index_name app-logs-%Y%m%d
    </store>
    <store>
      @type file
      path /var/log/fluent/app-backup
    </store>
  </match>
</label>
```

## Configuring Buffers for Reliability

Buffers prevent log loss when the destination is unavailable:

```bash
<match **>
  @type elasticsearch
  host elasticsearch.example.com

  <buffer tag,time>
    # Store buffer on disk
    @type file
    path /var/log/fluent/buffer

    # Flush every 5 seconds
    flush_interval 5s
    flush_mode interval

    # Retry configuration
    retry_forever true          # Retry indefinitely (don't drop logs)
    retry_type periodic
    retry_wait 5s
    retry_max_interval 60s      # Max wait between retries: 60 seconds

    # Buffer size limits
    chunk_limit_size 8MB        # Max chunk size
    total_limit_size 512MB      # Max total buffer size
    queue_limit_length 64       # Max chunks in queue
  </buffer>
</match>
```

## Testing and Debugging

```bash
# Test configuration syntax
sudo fluentd --dry-run -c /etc/fluent/fluentd.conf

# Run with debug output
sudo fluentd -c /etc/fluent/fluentd.conf -vv

# Check service logs
sudo journalctl -u fluentd -f

# Test by sending a log entry manually
# Use the in_http plugin for testing:
curl -X POST -d 'json={"message":"test log entry","level":"info"}' \
    http://localhost:9880/app.test

# Verify output
tail -f /var/log/fluent/test-output.*.log
```

## Setting Up Log Directories

```bash
# Create directories and set permissions
sudo mkdir -p /var/log/fluent
sudo chown fluent:fluent /var/log/fluent   # or td-agent:td-agent

# Set up logrotate for fluentd's own logs
sudo nano /etc/logrotate.d/fluentd
```

```bash
/var/log/fluent/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        # Kill -HUP causes fluentd to reopen log files
        kill -HUP $(cat /var/run/fluent/fluentd.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
```

## Monitoring Fluentd

```bash
# Enable the monitoring agent in config
<source>
  @type monitor_agent
  bind 127.0.0.1
  port 24220
</source>

# Check metrics
curl http://localhost:24220/api/plugins.json | python3 -m json.tool

# Check buffer stats
curl http://localhost:24220/api/config.json | python3 -m json.tool

# Watch for buffer growth (indicates output issues)
watch -n 10 'ls -lh /var/log/fluent/buffer/'
```

Fluentd's strength is its flexibility - it can adapt to almost any log collection and routing scenario through its plugin system. Start with a simple configuration that covers your immediate needs, then layer in filters, transforms, and additional outputs as your logging infrastructure matures.
