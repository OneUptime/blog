# How to Install and Configure Fluentd for Centralized Log Collection on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Fluentd, Log Aggregation, Linux

Description: Learn how to install and Configure Fluentd for Centralized Log Collection on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Fluentd is an open-source data collector that provides a unified logging layer. It collects logs from various sources, processes and transforms them, and forwards them to multiple destinations like Elasticsearch, S3, or Kafka.

## Prerequisites

- RHEL 9
- Root or sudo access

## Step 1: Install Fluentd (td-agent)

```bash
curl -fsSL https://toolbelt.treasuredata.com/sh/install-redhat-fluent-package5-lts.sh | sh
```

Or install as a Ruby gem:

```bash
sudo dnf install -y ruby ruby-devel gcc make
sudo gem install fluentd
```

## Step 2: Configure Fluentd

```bash
sudo vi /etc/fluent/fluentd.conf
```

```xml
<source>
  @type tail
  path /var/log/messages
  pos_file /var/log/fluent/messages.pos
  tag system.messages
  <parse>
    @type syslog
  </parse>
</source>

<source>
  @type tail
  path /var/log/httpd/access_log
  pos_file /var/log/fluent/httpd-access.pos
  tag httpd.access
  <parse>
    @type apache2
  </parse>
</source>

<match **>
  @type elasticsearch
  host elasticsearch.local
  port 9200
  index_name fluentd
  type_name _doc
  logstash_format true
  <buffer>
    @type file
    path /var/log/fluent/buffer
    flush_interval 5s
  </buffer>
</match>
```

## Step 3: Install Plugins

```bash
sudo fluent-gem install fluent-plugin-elasticsearch
sudo fluent-gem install fluent-plugin-kafka
```

## Step 4: Start and Enable

```bash
sudo systemctl enable --now fluentd
sudo systemctl status fluentd
```

## Step 5: Test Configuration

```bash
sudo fluentd --dry-run -c /etc/fluent/fluentd.conf
```

## Step 6: Add Filtering

```xml
<filter system.**>
  @type record_transformer
  <record>
    hostname "#{Socket.gethostname}"
    environment production
  </record>
</filter>
```

## Step 7: Monitor Fluentd

Enable the monitoring endpoint:

```xml
<source>
  @type monitor_agent
  bind 0.0.0.0
  port 24220
</source>
```

Access metrics at `http://localhost:24220/api/plugins.json`.

## Conclusion

Fluentd provides a flexible, plugin-based log collection and routing system on RHEL 9. Its extensive plugin ecosystem supports virtually any log source and destination, making it a cornerstone of centralized logging architectures.
