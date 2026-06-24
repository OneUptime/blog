# How to Use MongoDB with Fluentd for Log Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Fluentd, Logging, Log Collection, DevOps

Description: Learn how to configure Fluentd to collect application logs and forward them to MongoDB as structured documents using the fluent-plugin-mongodb output plugin.

---

## Overview

Fluentd is a popular open-source log collector that unifies log data from multiple sources. By using the `fluent-plugin-mongo` output plugin, you can forward logs from any source (application files, syslog, Docker containers) directly into MongoDB collections.

## Installing Fluentd and the MongoDB Plugin

```bash
# Install Fluentd (td-agent on Debian/Ubuntu)
curl -fsSL https://toolbelt.treasuredata.com/sh/install-ubuntu-focal-td-agent4.sh | sh

# Install the MongoDB output plugin
td-agent-gem install fluent-plugin-mongo
```

## Basic Fluentd Configuration

Create or edit `/etc/td-agent/td-agent.conf`:

```text
# Source: tail application log file
<source>
  @type tail
  path /var/log/myapp/app.log
  pos_file /var/log/td-agent/myapp.log.pos
  tag myapp.logs
  format json
  time_key timestamp
  time_format %Y-%m-%dT%H:%M:%S%z
</source>

# Output: write to MongoDB
<match myapp.logs>
  @type mongo
  host localhost
  port 27017
  database logs
  collection app_logs

  # Authentication
  user fluentd
  password secret

  # Buffering
  <buffer>
    @type file
    path /var/log/td-agent/buffer/mongo
    flush_interval 10s
    chunk_limit_size 8m
    retry_max_times 5
  </buffer>
</match>
```

## Connecting to MongoDB Atlas

For Atlas, use the connection URI format:

```text
<match myapp.logs>
  @type mongo
  connection_string "mongodb+srv://fluentd:password@cluster0.example.mongodb.net/?retryWrites=true"
  database logs
  collection app_logs

  <buffer>
    @type file
    path /var/log/td-agent/buffer/mongo-atlas
    flush_interval 30s
    chunk_limit_size 16m
  </buffer>
</match>
```

## Collecting Docker Container Logs

```text
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

<filter docker.**>
  @type record_transformer
  <record>
    container_name ${tag_parts[1]}
    collected_at ${time}
  </record>
</filter>

<match docker.**>
  @type mongo
  connection_string "#{ENV['MONGODB_URI']}"
  database logs
  collection container_logs

  <buffer tag>
    @type file
    path /var/log/td-agent/buffer/docker-mongo
    flush_interval 15s
  </buffer>
</match>
```

Run your Docker containers with the Fluentd logging driver:

```bash
docker run --log-driver=fluentd \
  --log-opt fluentd-address=localhost:24224 \
  --log-opt tag=docker.myapp \
  myapp:latest
```

## Adding Indexes After Initial Setup

Once Fluentd is writing logs to MongoDB, create indexes for query performance:

```javascript
use logs
db.app_logs.createIndex({ "time": -1 })
db.app_logs.createIndex({ "level": 1, "time": -1 })
db.app_logs.createIndex({ "time": 1 }, { expireAfterSeconds: 2592000 })
```

Note: Fluentd's mongo plugin uses `time` as the default timestamp field name.

## Verifying Ingestion

```javascript
db.app_logs.find().sort({ time: -1 }).limit(5).pretty()
db.app_logs.countDocuments({ level: "error" })
```

## Best Practices

- Use file-based buffering (`@type file`) rather than memory buffering to avoid data loss during Fluentd restarts.
- Set `flush_interval` between 10-30 seconds to batch inserts rather than writing one document per log line.
- Use the `capped: true` option in the plugin configuration if you want a fixed-size rolling log collection.
- Rotate Fluentd buffer files using `td-agent`'s built-in log rotation to avoid disk fill.

## Summary

Fluentd with the `fluent-plugin-mongo` output plugin provides a reliable pipeline for collecting logs from files, Docker containers, and other sources into MongoDB. Configure buffering to batch inserts and add TTL indexes to manage log retention automatically.
