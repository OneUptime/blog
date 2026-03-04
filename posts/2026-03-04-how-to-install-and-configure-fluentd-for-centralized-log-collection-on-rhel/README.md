# How to Install and Configure Fluentd for Centralized Log Collection on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Fluentd, Logging, Log Collection, Observability

Description: Learn how to install and configure Fluentd on RHEL to collect, parse, and forward logs from multiple sources to a centralized destination.

---

Fluentd is an open-source data collector that unifies log collection and consumption. It can ingest logs from files, syslog, and applications, then route them to destinations like Elasticsearch, S3, or other storage backends.

## Installing Fluentd (td-agent)

```bash
# Install the td-agent package (Fluentd distribution by Treasure Data)
curl -fsSL https://toolbelt.treasuredata.com/sh/install-redhat-fluent-package5-lts.sh | sh

# Start and enable the service
sudo systemctl enable --now fluentd
```

## Basic Configuration

```xml
<!-- /etc/fluent/fluentd.conf -->

<!-- Collect system logs -->
<source>
  @type tail
  path /var/log/messages
  pos_file /var/log/fluent/messages.pos
  tag system.messages
  <parse>
    @type syslog
  </parse>
</source>

<!-- Collect application logs -->
<source>
  @type tail
  path /var/log/myapp/*.log
  pos_file /var/log/fluent/myapp.pos
  tag app.myapp
  <parse>
    @type json
  </parse>
</source>

<!-- Accept logs over HTTP -->
<source>
  @type http
  port 9880
  bind 0.0.0.0
</source>

<!-- Output to stdout for testing -->
<match **>
  @type stdout
</match>
```

## Forwarding to Elasticsearch

```bash
# Install the Elasticsearch plugin
sudo fluent-gem install fluent-plugin-elasticsearch
```

```xml
<!-- /etc/fluent/fluentd.conf -->
<match **>
  @type elasticsearch
  host elasticsearch.example.com
  port 9200
  logstash_format true
  logstash_prefix fluentd
  <buffer>
    @type file
    path /var/log/fluent/buffer/elasticsearch
    flush_interval 10s
    chunk_limit_size 8MB
    retry_max_interval 30s
  </buffer>
</match>
```

## Filtering and Transforming Logs

```xml
<!-- Add hostname to all records -->
<filter **>
  @type record_transformer
  <record>
    hostname "#{Socket.gethostname}"
    environment production
  </record>
</filter>

<!-- Parse nested JSON fields -->
<filter app.**>
  @type parser
  key_name message
  reserve_data true
  <parse>
    @type json
  </parse>
</filter>
```

## Collecting systemd Journal Logs

```bash
sudo fluent-gem install fluent-plugin-systemd
```

```xml
<source>
  @type systemd
  tag systemd
  read_from_head false
  <storage>
    @type local
    path /var/log/fluent/systemd.pos
  </storage>
  <entry>
    fields_strip_underscores true
  </entry>
</source>
```

## System Tuning

```bash
# Increase the file descriptor limit for Fluentd
sudo mkdir -p /etc/systemd/system/fluentd.service.d
cat << 'OVERRIDE' | sudo tee /etc/systemd/system/fluentd.service.d/override.conf
[Service]
LimitNOFILE=65536
OVERRIDE

sudo systemctl daemon-reload
sudo systemctl restart fluentd
```

Use Fluentd's buffer configuration to prevent data loss during network outages. File-based buffers persist across restarts, while memory-based buffers are faster but can lose data if the process crashes.
