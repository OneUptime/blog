# How to Build Redis Monitoring with the ELK Stack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ELK Stack, Monitoring

Description: Learn how to ship Redis metrics and slow logs to the ELK stack (Elasticsearch, Logstash, Kibana) using Filebeat and create dashboards for Redis health monitoring.

---

The ELK stack (Elasticsearch, Logstash, Kibana) is a popular choice for log aggregation and visualization. By shipping Redis slow logs and INFO metrics to ELK, you can build dashboards that track memory usage, hit rates, latency, and command patterns over time.

## Architecture

```text
Redis --> Filebeat (redis module) --> Logstash --> Elasticsearch --> Kibana
```

## Start ELK with Docker Compose

```yaml
# docker-compose.yml
version: "3.8"
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ports:
      - "9200:9200"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.12.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  logstash:
    image: docker.elastic.co/logstash/logstash:8.12.0
    ports:
      - "5044:5044"
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    depends_on:
      - elasticsearch
```

```bash
docker-compose up -d
```

## Configure Filebeat Redis Module

```bash
# Install Filebeat
sudo apt install filebeat -y

# Enable Redis module
filebeat modules enable redis
```

```yaml
# /etc/filebeat/modules.d/redis.yml
- module: redis
  log:
    enabled: true
    var.paths: ["/var/log/redis/redis-server.log"]
  slowlog:
    enabled: true
    var.hosts: ["localhost:6379"]
    var.password: ""
```

```yaml
# /etc/filebeat/filebeat.yml
output.logstash:
  hosts: ["localhost:5044"]

setup.kibana:
  host: "localhost:5601"
```

```bash
# Load Kibana dashboards
filebeat setup --dashboards

sudo systemctl start filebeat
```

## Logstash Pipeline for Redis Metrics

```text
# logstash/pipeline/redis.conf
input {
  beats {
    port => 5044
  }
}

filter {
  if [event][module] == "redis" {
    if [event][dataset] == "redis.slowlog" {
      mutate {
        add_field => { "[@metadata][index]" => "redis-slowlog" }
      }
    } else {
      mutate {
        add_field => { "[@metadata][index]" => "redis-logs" }
      }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "%{[@metadata][index]}-%{+YYYY.MM.dd}"
  }
}
```

## Enable Redis Slow Log

```bash
# Log commands slower than 10ms (10000 microseconds)
redis-cli CONFIG SET slowlog-log-slower-than 10000
redis-cli CONFIG SET slowlog-max-len 256

# View slow log entries
redis-cli SLOWLOG GET 10
```

## Ship Redis INFO Metrics via Custom Python Script

```python
import redis
import json
import requests
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def ship_redis_metrics():
    info = r.info()
    doc = {
        "@timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "connected_clients": info["connected_clients"],
        "used_memory_mb": round(info["used_memory"] / 1024 / 1024, 2),
        "keyspace_hits": info["keyspace_hits"],
        "keyspace_misses": info["keyspace_misses"],
        "evicted_keys": info["evicted_keys"],
        "total_commands_processed": info["total_commands_processed"],
    }
    requests.post(
        "http://localhost:9200/redis-metrics/_doc",
        json=doc
    )

while True:
    ship_redis_metrics()
    time.sleep(60)
```

## Kibana Dashboard Queries

```text
# Query for high memory usage
GET redis-metrics/_search
{
  "query": {
    "range": {
      "used_memory_mb": { "gt": 400 }
    }
  }
}

# Slow log entries
GET redis-slowlog-*/_search
{
  "query": { "match_all": {} },
  "sort": [{ "redis.slowlog.duration.us": { "order": "desc" }}],
  "size": 20
}
```

## Summary

The ELK stack provides full-text search and visualization for Redis slow logs and metrics. Filebeat's Redis module handles slow log collection automatically. For continuous metrics, a Python script shipping Redis INFO data to Elasticsearch enables time-series dashboards in Kibana. Set slow log thresholds to 10ms to catch problematic commands without overwhelming the log.
