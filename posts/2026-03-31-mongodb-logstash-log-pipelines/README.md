# How to Use MongoDB with Logstash for Log Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Logstash, Logging, ELK Stack, Pipeline

Description: Learn how to configure Logstash to read from and write to MongoDB using the logstash-output-mongodb plugin for flexible log pipeline integration.

---

## Overview

Logstash is a powerful data pipeline tool that can ingest logs from many sources, transform them, and output them to multiple destinations including MongoDB. The `logstash-output-mongodb` plugin writes processed log events to MongoDB collections.

## Installing the MongoDB Output Plugin

```bash
/usr/share/logstash/bin/logstash-plugin install logstash-output-mongodb
```

Verify installation:

```bash
/usr/share/logstash/bin/logstash-plugin list | grep mongodb
```

## Basic Pipeline Configuration

Create `/etc/logstash/conf.d/app-logs-to-mongo.conf`:

```text
input {
  file {
    path => "/var/log/myapp/*.log"
    start_position => "beginning"
    codec => json
    tags => ["app-log"]
  }
}

filter {
  date {
    match => ["timestamp", "ISO8601"]
    target => "@timestamp"
  }

  mutate {
    rename => { "log_level" => "level" }
    add_field => { "pipeline" => "logstash-mongo" }
  }

  if [level] == "debug" {
    drop {}
  }
}

output {
  mongodb {
    uri => "${MONGODB_URI}"
    database => "logs"
    collection => "app_logs"
    isodate => true
  }
}
```

## Reading from Beats (Filebeat to Logstash to MongoDB)

```text
input {
  beats {
    port => 5044
  }
}

filter {
  grok {
    match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:log_message}" }
  }

  date {
    match => ["timestamp", "ISO8601"]
    target => "@timestamp"
  }

  mutate {
    remove_field => ["message", "agent", "ecs", "input"]
    rename => { "log_message" => "message" }
  }
}

output {
  mongodb {
    uri => "${MONGODB_URI}"
    database => "logs"
    collection => "%{[fields][service]}_logs"
    isodate => true
  }
}
```

This routes logs to different collections based on the `service` field from Filebeat.

## Reading from Kafka and Writing to MongoDB

```text
input {
  kafka {
    bootstrap_servers => "kafka:9092"
    topics => ["app-logs"]
    codec => json
    group_id => "logstash-mongo"
  }
}

filter {
  date {
    match => ["event_time", "UNIX_MS"]
    target => "@timestamp"
  }
}

output {
  mongodb {
    uri => "${MONGODB_URI}"
    database => "logs"
    collection => "kafka_logs"
    isodate => true
  }
}
```

## Using MongoDB as a Logstash Input

Logstash can also read from MongoDB using `logstash-input-mongodb`:

```bash
/usr/share/logstash/bin/logstash-plugin install logstash-input-mongodb
```

```text
input {
  mongodb {
    uri => "${MONGODB_URI}"
    placeholder_db_dir => "/opt/logstash/mongodb/"
    placeholder_db_name => "logstash_sqlite.db"
    collection => "source_events"
    batch_size => 500
  }
}
```

## Creating Post-Ingestion Indexes

```javascript
use logs
db.app_logs.createIndex({ "@timestamp": -1 })
db.app_logs.createIndex({ level: 1, "@timestamp": -1 })
db.app_logs.createIndex({ "fields.service": 1, "@timestamp": -1 })
db.app_logs.createIndex({ "@timestamp": 1 }, { expireAfterSeconds: 604800 })
```

## Best Practices

- Use the `isodate: true` option in the MongoDB output plugin so timestamps are stored as BSON Date objects rather than strings.
- Use dynamic collection naming (`collection => "%{service}_logs"`) to partition logs by service for easier management and independent TTL configuration.
- Set `pipeline.workers` in `logstash.yml` (or use the `-w` flag) to increase parallel write throughput for high-volume pipelines.
- Use Logstash dead letter queues (DLQ) to capture events that fail to write to MongoDB for reprocessing.

## Summary

Logstash provides a flexible pipeline for routing and transforming logs from files, Kafka, and Beats into MongoDB. Use the `logstash-output-mongodb` plugin with dynamic collection names and TTL indexes to build a scalable, self-managing log storage system.
