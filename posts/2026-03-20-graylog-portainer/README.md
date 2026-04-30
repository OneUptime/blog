# How to Deploy Graylog via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Graylog, Logging, Self-Hosted, Observability

Description: Deploy Graylog, the powerful centralized log management platform, as a Docker stack through Portainer for self-hosted log aggregation and analysis.

## Introduction

Graylog is an open-source log management platform that collects, indexes, and analyzes log data from any source. Combined with Portainer's stack management, you can deploy the entire Graylog ecosystem - including OpenSearch and MongoDB - with a single compose file.

## Prerequisites

- Portainer CE or BE installed
- Host with at least 4 GB RAM (8 GB recommended)
- Docker Engine 20.10+
- vm.max_map_count set to 262144 for OpenSearch

## Step 1: Prepare the Host

```bash
# Increase virtual memory for OpenSearch (required)

sudo sysctl -w vm.max_map_count=262144

# Make it permanent
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

# Create data directories
mkdir -p /opt/graylog/data/opensearch
mkdir -p /opt/graylog/data/mongodb
mkdir -p /opt/graylog/data/graylog

# Set proper ownership
chown -R 1000:1000 /opt/graylog/data/opensearch
```

## Step 2: Generate a Password Hash for Graylog

```bash
# Generate SHA-256 hash of your admin password
echo -n "YourSecurePassword" | sha256sum | awk '{print $1}'
# Save the output - you'll need it in the compose file

# Generate a secret string (min 16 characters)
tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 96; echo
# Save the output - you'll need it in the compose file

# Generate a strong OpenSearch admin password
tr -dc 'A-Za-z0-9_@#%^+=-' < /dev/urandom | head -c 32; echo
# Save the output - you'll need it in the compose file
```

## Step 3: Create the Stack in Portainer

Navigate to **Stacks** → **Add Stack** → **Web Editor** and paste the following:

```yaml
version: "3.8"

services:
  # MongoDB - Graylog's configuration store
  mongodb:
    image: mongo:6.0
    container_name: graylog-mongodb
    restart: unless-stopped
    volumes:
      - /opt/graylog/data/mongodb:/data/db
    networks:
      - graylog-net

  # OpenSearch - Graylog's search and indexing backend
  opensearch:
    image: opensearchproject/opensearch:2.15.0
    container_name: graylog-opensearch
    restart: unless-stopped
    environment:
      - cluster.name=graylog
      - node.name=opensearch
      - discovery.type=single-node
      - action.auto_create_index=false
      # Disable security for internal use (enable for production)
      - plugins.security.ssl.http.enabled=false
      - plugins.security.disabled=true
      # Required by OpenSearch 2.12+
      - OPENSEARCH_INITIAL_ADMIN_PASSWORD=yourstrongopensearchadminpasswordhere
      - bootstrap.memory_lock=true
      - "OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g"
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536
    volumes:
      - /opt/graylog/data/opensearch:/usr/share/opensearch/data
    networks:
      - graylog-net

  # Graylog - the log management application
  graylog:
    image: graylog/graylog:6.0
    container_name: graylog
    restart: unless-stopped
    depends_on:
      - mongodb
      - opensearch
    environment:
      # Must be at least 16 characters
      GRAYLOG_PASSWORD_SECRET: "replacethiswithyoursecretstring"
      # SHA-256 hash of your admin password
      GRAYLOG_ROOT_PASSWORD_SHA2: "yourgeneratedsha256hashhere"
      GRAYLOG_HTTP_EXTERNAL_URI: "http://your-host:9000/"
      GRAYLOG_ELASTICSEARCH_HOSTS: "http://opensearch:9200"
      GRAYLOG_MONGODB_URI: "mongodb://mongodb:27017/graylog"
    ports:
      # Graylog Web UI
      - "9000:9000"
      # Syslog UDP input (use a non-privileged port)
      - "5140:5140/udp"
      # GELF UDP input
      - "12201:12201/udp"
      # GELF TCP input
      - "12201:12201/tcp"
    volumes:
      - /opt/graylog/data/graylog:/usr/share/graylog/data
    networks:
      - graylog-net

networks:
  graylog-net:
    driver: bridge
```

## Step 4: Deploy the Stack

1. Name the stack `graylog`
2. Click **Deploy the stack**
3. Wait 2-3 minutes for all services to initialize

## Step 5: Access Graylog

1. Open `http://your-host:9000`
2. Log in with `admin` and your chosen password

## Step 6: Create an Input for Log Ingestion

1. Go to **System** → **Inputs**
2. Select **GELF UDP** from the dropdown
3. Click **Launch new input**
4. Configure the port (default 12201) and click **Save**

## Step 7: Send Logs from Docker Containers

Configure other Portainer-managed containers to send logs to Graylog:

```yaml
# Add to any container's logging config
logging:
  driver: gelf
  options:
    gelf-address: "udp://your-host:12201"
    tag: "myapp"
```

## Step 8: Create Dashboards and Alerts

1. Navigate to **Dashboards** → **Create Dashboard**
2. Add widgets for log counts, error rates, and custom queries
3. Set up alerts under **Alerts** → **Event Definitions**

## Conclusion

Graylog deployed via Portainer gives you enterprise-grade log management without the complexity of manual installation. With OpenSearch as the backend and MongoDB for configuration storage, this stack handles millions of log events per day while the Portainer UI keeps your deployment manageable.
