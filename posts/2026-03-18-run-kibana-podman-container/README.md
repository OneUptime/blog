# How to Run Kibana in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kibana, Elasticsearch, Visualization, ELK Stack

Description: Learn how to run Kibana in a Podman container and connect it to Elasticsearch for log visualization and data exploration.

---

> Kibana in Podman provides an intuitive data visualization dashboard connected to Elasticsearch, with the option to run everything in rootless containers.

Kibana is the visualization layer of the Elastic Stack, providing a browser-based interface for exploring, analyzing, and visualizing data stored in Elasticsearch. Running it in a Podman container alongside Elasticsearch gives you a complete search and analytics platform with minimal setup. This guide covers launching Kibana, connecting it to Elasticsearch, and configuring it for your environment.

---

## Pulling the Kibana Image

Download the official Kibana image matching your Elasticsearch version.

```bash
# Pull Kibana 8.x (must match your Elasticsearch version)

podman pull docker.elastic.co/kibana/kibana:8.12.0

# Verify the image
podman images | grep kibana
```

## Setting Up Elasticsearch First

Kibana requires a running Elasticsearch instance. Create a pod to run both together.

```bash
# Create a pod with shared networking for Elasticsearch and Kibana
podman pod create \
  --name elk-pod \
  -p 9200:9200 \
  -p 5601:5601

# Run Elasticsearch inside the pod
podman run -d \
  --pod elk-pod \
  --name elk-elasticsearch \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
  docker.elastic.co/elasticsearch/elasticsearch:8.12.0

# Wait for Elasticsearch to be ready
sleep 15
curl -s http://localhost:9200 | head -5
```

## Running Kibana in the Pod

Start Kibana in the same pod so it can reach Elasticsearch on localhost.

```bash
# Run Kibana inside the pod, pointing to Elasticsearch
podman run -d \
  --pod elk-pod \
  --name elk-kibana \
  -e 'ELASTICSEARCH_HOSTS=["http://localhost:9200"]' \
  docker.elastic.co/kibana/kibana:8.12.0

# Wait for Kibana to initialize (takes about 30 seconds)
sleep 30

# Verify Kibana is running
curl -s http://localhost:5601/api/status | python3 -m json.tool | head -10
```

## Running Kibana as a Standalone Container

If Elasticsearch is running separately on the host, connect Kibana using Podman's host gateway name.

```bash
# Run Kibana connecting to an Elasticsearch instance on the host
podman run -d \
  --name kibana-standalone \
  -p 5602:5601 \
  -e 'ELASTICSEARCH_HOSTS=["http://host.containers.internal:9200"]' \
  docker.elastic.co/kibana/kibana:8.12.0

# Check the Kibana logs to verify the Elasticsearch connection
podman logs -f kibana-standalone 2>&1 | head -20
```

## Custom Kibana Configuration

Mount a custom kibana.yml for advanced settings.

```bash
# Create a config directory
mkdir -p ~/kibana-config

# Write a custom kibana.yml
cat > ~/kibana-config/kibana.yml <<'EOF'
# Server settings
server.port: 5601
server.host: "0.0.0.0"
server.name: "podman-kibana"

# Elasticsearch connection
elasticsearch.hosts: ["http://localhost:9200"]
elasticsearch.requestTimeout: 30000

# Logging
logging.root.level: info

# Disable telemetry
telemetry.enabled: false
telemetry.optIn: false

# Set default index pattern
# kibana.defaultAppId: "discover"
EOF

# Replace the earlier Kibana container before reusing port 5601 in the pod
podman rm -f elk-kibana

# Run Kibana with custom config inside the pod
podman run -d \
  --pod elk-pod \
  --name kibana-custom \
  -v ~/kibana-config/kibana.yml:/usr/share/kibana/config/kibana.yml:Z \
  docker.elastic.co/kibana/kibana:8.12.0
```

## Loading Sample Data into Elasticsearch

Index some data so you have something to visualize in Kibana.

```bash
# Create an index with sample log data
for i in $(seq 1 10); do
  curl -s -X POST "http://localhost:9200/app-logs/_doc" \
    -H 'Content-Type: application/json' \
    -d "{
      \"@timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"level\": \"$(echo -e 'info\nwarn\nerror' | shuf -n1)\",
      \"message\": \"Sample log entry number $i\",
      \"service\": \"$(echo -e 'api\nweb\nworker' | shuf -n1)\",
      \"response_time_ms\": $((RANDOM % 500))
    }"
done

# Verify the data was indexed
curl -s "http://localhost:9200/app-logs/_count" | python3 -m json.tool
```

## Accessing the Kibana Dashboard

Open Kibana in your browser and configure it.

```bash
# Kibana is available at:
echo "Open http://localhost:5601 in your browser"

# Check Kibana status via API
curl -s http://localhost:5601/api/status | python3 -m json.tool | head -15

# List available indices through the Elasticsearch API
curl -s "http://localhost:9200/_cat/indices?v"
```

## Managing the Containers

Common management operations for the Kibana and Elasticsearch pod.

```bash
# View Kibana logs
podman logs kibana-custom

# Restart Kibana without affecting Elasticsearch
podman restart kibana-custom

# Stop the entire pod (stops both Elasticsearch and Kibana)
podman pod stop elk-pod

# Start the pod again
podman pod start elk-pod

# Remove the pod and all containers in it
podman pod rm -f elk-pod

# Clean up standalone Kibana
podman rm -f kibana-standalone
```

## Summary

Running Kibana in a Podman container alongside Elasticsearch gives you a complete data visualization platform. Using Podman pods simplifies networking by letting Kibana and Elasticsearch communicate over localhost without additional network configuration. Custom configuration files let you tune server settings, disable telemetry, and adjust timeouts. Once connected, you can use Kibana's browser interface to create index patterns, build dashboards, and explore your data visually. Podman's rootless mode can keep the containers isolated without running the container engine as root.
