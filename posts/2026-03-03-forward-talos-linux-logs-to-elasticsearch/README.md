# How to Forward Talos Linux Logs to Elasticsearch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Logging, Elasticsearch, ELK Stack, Observability

Description: Learn how to forward Talos Linux system logs to Elasticsearch for full-text search and analysis using the ELK stack

---

Elasticsearch is the most widely adopted search and analytics engine for log data, and the ELK stack (Elasticsearch, Logstash, Kibana) has been the industry standard for centralized logging for years. If your organization already runs Elasticsearch or you need powerful full-text search capabilities for your logs, forwarding Talos Linux logs to Elasticsearch is a natural choice.

## Why Elasticsearch for Talos Linux Logs

Elasticsearch excels at full-text search, which makes it ideal for log analysis. Unlike simpler log storage solutions, Elasticsearch indexes every word in every log message, enabling you to search for any term across millions of log entries in milliseconds.

Key advantages for Talos Linux logging:

- Full-text search across all log data
- Kibana provides rich visualization and dashboarding
- Mature ecosystem with extensive tooling
- Handles the JSON format from Talos natively
- Advanced analytics and aggregation capabilities
- Integration with alerting systems

## Architecture Options

There are several ways to get Talos Linux logs into Elasticsearch:

### Option 1: Talos to Logstash to Elasticsearch

```
Talos Nodes --> Logstash --> Elasticsearch --> Kibana
```

### Option 2: Talos to Vector to Elasticsearch

```
Talos Nodes --> Vector --> Elasticsearch --> Kibana
```

### Option 3: Talos to Fluent Bit to Elasticsearch

```
Talos Nodes --> Fluent Bit --> Elasticsearch --> Kibana
```

We will cover each approach, starting with the most common.

## Setting Up with Logstash

Logstash is part of the ELK stack and is the traditional choice for ingesting logs into Elasticsearch.

### Logstash Configuration

Create a Logstash pipeline that accepts Talos JSON logs:

```ruby
# /etc/logstash/conf.d/talos.conf

# Input: Receive Talos logs via TCP
input {
  tcp {
    port => 5514
    codec => json_lines
    tags => ["talos"]
  }
}

# Filter: Parse and enrich Talos logs
filter {
  if "talos" in [tags] {
    # Rename Talos-specific fields
    mutate {
      rename => {
        "talos-service" => "talos_service"
        "talos-level" => "talos_level"
        "talos-time" => "talos_time"
      }
    }

    # Parse the timestamp
    date {
      match => [ "talos_time", "ISO8601" ]
      target => "@timestamp"
    }

    # Add a severity field for easier filtering
    if [talos_level] == "error" {
      mutate { add_field => { "severity" => "error" } }
    } else if [talos_level] == "warning" {
      mutate { add_field => { "severity" => "warning" } }
    } else {
      mutate { add_field => { "severity" => "info" } }
    }
  }
}

# Output: Send to Elasticsearch
output {
  if "talos" in [tags] {
    elasticsearch {
      hosts => ["http://elasticsearch:9200"]
      index => "talos-logs-%{+YYYY.MM.dd}"
      user => "elastic"
      password => "${ELASTIC_PASSWORD}"
    }
  }
}
```

### Deploy Logstash

If running Logstash in Kubernetes:

```yaml
# logstash-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logstash-talos
  namespace: logging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: logstash-talos
  template:
    metadata:
      labels:
        app: logstash-talos
    spec:
      containers:
      - name: logstash
        image: docker.elastic.co/logstash/logstash:8.12.0
        ports:
        - containerPort: 5514
          protocol: TCP
        volumeMounts:
        - name: pipeline
          mountPath: /usr/share/logstash/pipeline
        env:
        - name: ELASTIC_PASSWORD
          valueFrom:
            secretKeyRef:
              name: elasticsearch-credentials
              key: password
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
      volumes:
      - name: pipeline
        configMap:
          name: logstash-talos-pipeline
---
apiVersion: v1
kind: Service
metadata:
  name: logstash-talos
  namespace: logging
spec:
  selector:
    app: logstash-talos
  ports:
  - port: 5514
    targetPort: 5514
    protocol: TCP
```

## Setting Up with Vector

Vector is a lighter alternative to Logstash with lower resource usage:

```toml
# vector.toml

# Receive Talos logs
[sources.talos_logs]
type = "socket"
address = "0.0.0.0:5514"
mode = "tcp"
decoding.codec = "json"

# Transform and clean up fields
[transforms.parse_talos]
type = "remap"
inputs = ["talos_logs"]
source = '''
  .service = del(."talos-service") ?? "unknown"
  .level = del(."talos-level") ?? "info"
  .source_time = del(."talos-time") ?? now()
  .source = "talos"
'''

# Send to Elasticsearch
[sinks.elasticsearch]
type = "elasticsearch"
inputs = ["parse_talos"]
endpoints = ["http://elasticsearch:9200"]
bulk.index = "talos-logs-%Y.%m.%d"
auth.strategy = "basic"
auth.user = "elastic"
auth.password = "${ELASTIC_PASSWORD}"
```

## Configuring Talos Linux

Configure all Talos nodes to send logs to your log collector:

```yaml
# Machine configuration
machine:
  logging:
    destinations:
      - endpoint: "tcp://logstash-talos.logging.svc:5514/"
        format: json_lines
```

Apply to all nodes:

```bash
#!/bin/bash
# Apply log forwarding configuration

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"
LOG_ENDPOINT="tcp://logstash-talos.logging.svc:5514/"

for node in $NODES; do
  echo "Configuring $node..."
  talosctl patch machineconfig --nodes "$node" \
    --patch "[{
      \"op\": \"add\",
      \"path\": \"/machine/logging\",
      \"value\": {
        \"destinations\": [{
          \"endpoint\": \"$LOG_ENDPOINT\",
          \"format\": \"json_lines\"
        }]
      }
    }]"
done
```

## Creating Elasticsearch Index Templates

Set up an index template to ensure Talos logs are properly mapped:

```bash
# Create an index template for Talos logs
curl -X PUT "http://elasticsearch:9200/_index_template/talos-logs" \
  -H 'Content-Type: application/json' \
  -d '{
  "index_patterns": ["talos-logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "index.lifecycle.name": "talos-logs-policy",
      "index.lifecycle.rollover_alias": "talos-logs"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "msg": { "type": "text" },
        "talos_service": { "type": "keyword" },
        "talos_level": { "type": "keyword" },
        "host": { "type": "keyword" },
        "severity": { "type": "keyword" }
      }
    }
  }
}'
```

## Setting Up Index Lifecycle Management

Configure ILM to automatically manage index rotation and retention:

```bash
# Create an ILM policy for Talos logs
curl -X PUT "http://elasticsearch:9200/_ilm/policy/talos-logs-policy" \
  -H 'Content-Type: application/json' \
  -d '{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_primary_shard_size": "30GB",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}'
```

## Searching Talos Logs in Kibana

Once logs are in Elasticsearch, create a Kibana index pattern and start searching:

### Create Index Pattern

In Kibana, go to Stack Management and create an index pattern matching `talos-logs-*`.

### Useful Searches

```
# Find all errors
talos_level: "error"

# Find errors from a specific service
talos_level: "error" AND talos_service: "etcd"

# Find logs from a specific node
host.ip: "192.168.1.10"

# Search for specific text
msg: "connection refused"

# Combined search
talos_service: "kubelet" AND msg: "failed" AND NOT msg: "probe"
```

### Using KQL (Kibana Query Language)

```
# KQL queries for Talos logs
talos_service: "etcd" and talos_level: "error"
talos_service: "kubelet" and msg: "OOMKilled"
talos_level: "warning" and not talos_service: "containerd"
```

## Creating Kibana Dashboards

Build a dashboard for Talos Linux monitoring:

- **Log Volume Over Time**: A bar chart showing log volume by service
- **Error Rate**: A line chart tracking error count over time
- **Top Services by Log Volume**: A pie chart showing which services generate the most logs
- **Recent Errors**: A data table showing the most recent error messages
- **Logs by Node**: A heat map showing log distribution across nodes

## Setting Up Kibana Alerts

Configure alerts for critical Talos events:

```json
{
  "rule_type_id": "logs.alert.document.count",
  "name": "Talos Error Spike",
  "params": {
    "timeSize": 5,
    "timeUnit": "m",
    "count": {
      "value": 50,
      "comparator": "more than"
    },
    "criteria": [
      {
        "field": "talos_level",
        "comparator": "is",
        "value": "error"
      }
    ]
  },
  "actions": [
    {
      "group": "logs.threshold.fired",
      "id": "slack-notification",
      "params": {
        "message": "High error rate detected in Talos Linux logs: {{context.matchingDocuments}} errors in 5 minutes"
      }
    }
  ]
}
```

## Performance Tuning

For high-volume Talos logging, tune your Elasticsearch setup:

```yaml
# Elasticsearch tuning for log workloads
cluster:
  routing:
    allocation:
      disk:
        watermark:
          low: 85%
          high: 90%
          flood_stage: 95%

index:
  refresh_interval: 30s  # Reduce refresh frequency for better write performance
  translog:
    durability: async     # Async translog for better performance
    sync_interval: 5s
```

## Best Practices

- Use an intermediary (Logstash, Vector, or Fluent Bit) between Talos and Elasticsearch.
- Create proper index templates with the right field mappings before ingesting logs.
- Set up Index Lifecycle Management to handle rotation and retention automatically.
- Use keyword type for fields you filter on (service, level) and text type for searchable content.
- Size your Elasticsearch cluster based on your expected log volume and retention period.
- Create Kibana dashboards for at-a-glance visibility into Talos log data.
- Set up alerts for critical events like etcd errors and service failures.
- Monitor Elasticsearch cluster health alongside your Talos Linux cluster.
- Separate Talos system logs from Kubernetes application logs using different indices.

Forwarding Talos Linux logs to Elasticsearch gives you the full power of the ELK stack for log analysis. With proper index management and Kibana dashboards, you get deep visibility into your cluster's health and behavior.
