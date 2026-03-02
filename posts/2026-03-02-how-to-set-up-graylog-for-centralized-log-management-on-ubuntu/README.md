# How to Set Up Graylog for Centralized Log Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, Monitoring, Elasticsearch, DevOps

Description: Learn how to install and configure Graylog on Ubuntu with MongoDB and OpenSearch for centralized log management, search, alerting, and visualization across your infrastructure.

---

Graylog collects, indexes, and lets you search log messages from multiple sources in one place. Instead of SSH-ing into individual servers to check logs, you ship logs to Graylog and search across all of them from the web interface. You can set up alerts, create dashboards, and define pipelines to parse and enrich log data.

The stack consists of Graylog itself (the application), MongoDB (stores configuration and metadata), and OpenSearch or Elasticsearch (stores the actual log data and handles search). This guide uses Docker Compose to run all three components together.

## Prerequisites

- Ubuntu 20.04 or 22.04
- Docker and Docker Compose
- At least 8 GB RAM (4 GB minimum, 8 GB recommended for non-trivial log volumes)
- 20+ GB disk space for log storage

## Installing Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Install Compose plugin
sudo apt install docker-compose-plugin

docker --version
docker compose version
```

## System Prerequisites

OpenSearch requires elevated virtual memory settings:

```bash
# Increase virtual memory map count (required for OpenSearch/Elasticsearch)
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Verify
cat /proc/sys/vm/max_map_count
# Should output: 262144
```

## Creating the Docker Compose Configuration

```bash
sudo mkdir -p /opt/graylog
cd /opt/graylog
```

Create the environment file:

```bash
# Generate a password secret (64+ characters)
openssl rand -hex 32

# Generate SHA2 hash of your admin password
# Replace 'your-password' with your actual desired admin password
echo -n 'your-password' | sha256sum | awk '{print $1}'
```

Create `.env`:

```bash
sudo tee /opt/graylog/.env << 'EOF'
# Graylog password secret - generate with: openssl rand -hex 32
GRAYLOG_PASSWORD_SECRET=replace-with-openssl-rand-hex-32-output

# SHA2 hash of admin password - generate with: echo -n 'password' | sha256sum
GRAYLOG_ROOT_PASSWORD_SHA2=replace-with-sha256-hash-of-your-password

# Your server's external URL
GRAYLOG_HTTP_EXTERNAL_URI=https://logs.example.com/

# MongoDB version
MONGO_VERSION=6.0

# OpenSearch version
OPENSEARCH_VERSION=2.11.1

# Graylog version
GRAYLOG_VERSION=5.2
EOF
```

Create `docker-compose.yml`:

```bash
sudo tee /opt/graylog/docker-compose.yml << 'EOF'
version: '3'

services:
  mongodb:
    image: mongo:6.0
    container_name: graylog-mongo
    restart: always
    volumes:
      - mongo-data:/data/db
    networks:
      - graylog

  opensearch:
    image: opensearchproject/opensearch:2.11.1
    container_name: graylog-opensearch
    restart: always
    environment:
      - cluster.name=graylog
      - node.name=opensearch
      - discovery.type=single-node
      # Disable security for single-node Graylog setup
      - plugins.security.disabled=true
      - bootstrap.memory_lock=true
      - "OPENSEARCH_JAVA_OPTS=-Xms2g -Xmx2g"
      # Disable performance analyzer
      - OPENSEARCH_INITIAL_ADMIN_PASSWORD=TempPassword1!
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - opensearch-data:/usr/share/opensearch/data
    networks:
      - graylog

  graylog:
    image: graylog/graylog:5.2
    container_name: graylog
    restart: always
    environment:
      # Must match the generated secret in .env
      - GRAYLOG_PASSWORD_SECRET=${GRAYLOG_PASSWORD_SECRET}
      # SHA2 hash of admin password
      - GRAYLOG_ROOT_PASSWORD_SHA2=${GRAYLOG_ROOT_PASSWORD_SHA2}
      # Graylog's externally accessible URL
      - GRAYLOG_HTTP_EXTERNAL_URI=${GRAYLOG_HTTP_EXTERNAL_URI}
      # OpenSearch connection
      - GRAYLOG_ELASTICSEARCH_HOSTS=http://opensearch:9200
      # MongoDB connection
      - GRAYLOG_MONGODB_URI=mongodb://mongodb/graylog
      # Timezone
      - GRAYLOG_ROOT_TIMEZONE=UTC
      # Email settings (optional)
      # - GRAYLOG_TRANSPORT_EMAIL_ENABLED=true
      # - GRAYLOG_TRANSPORT_EMAIL_HOSTNAME=smtp.example.com
    ports:
      # Graylog web interface
      - "127.0.0.1:9000:9000"
      # Syslog UDP input
      - "514:514/udp"
      # Syslog TCP input
      - "514:514/tcp"
      # GELF UDP input (for structured logs from applications)
      - "12201:12201/udp"
      # GELF TCP input
      - "12201:12201/tcp"
      # Beats input (for Filebeat, etc.)
      - "5044:5044/tcp"
    volumes:
      - graylog-data:/usr/share/graylog/data
    networks:
      - graylog
    depends_on:
      - mongodb
      - opensearch

volumes:
  mongo-data:
  opensearch-data:
  graylog-data:

networks:
  graylog:
    driver: bridge
EOF
```

## Starting Graylog

```bash
cd /opt/graylog

# Start all services
docker compose up -d

# Monitor startup (OpenSearch takes 60-90 seconds, Graylog another 30-60)
docker compose logs -f

# Check that all services are running and healthy
docker compose ps
```

## Setting Up nginx as a Reverse Proxy

```bash
sudo apt install nginx certbot python3-certbot-nginx

sudo tee /etc/nginx/sites-available/graylog << 'EOF'
server {
    listen 80;
    server_name logs.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name logs.example.com;

    ssl_certificate /etc/letsencrypt/live/logs.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/logs.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/graylog /etc/nginx/sites-enabled/
sudo certbot --nginx -d logs.example.com
sudo nginx -t && sudo systemctl reload nginx
```

## Configuring Log Inputs

After logging in (`admin` / your-password at `https://logs.example.com`):

1. Go to System -> Inputs
2. Click "Launch new input"

Common inputs to configure:

**Syslog UDP** - for Linux servers sending rsyslog/syslog:
- Type: Syslog UDP
- Port: 514
- Bind address: 0.0.0.0
- Save and start

**GELF UDP** - for applications using GELF format (Docker, Logstash, etc.):
- Type: GELF UDP
- Port: 12201
- Bind address: 0.0.0.0

**Beats** - for Filebeat log shipping:
- Type: Beats
- Port: 5044
- Bind address: 0.0.0.0

## Sending Logs from Other Servers

### Using rsyslog

On Ubuntu servers you want to collect logs from:

```bash
# Configure rsyslog to forward to Graylog
sudo tee /etc/rsyslog.d/10-graylog.conf << 'EOF'
# Forward all logs to Graylog via UDP syslog
*.* @graylog.example.com:514;RSYSLOG_SyslogProtocol23Format

# Or forward via TCP (more reliable, but watch for connection issues)
*.* @@graylog.example.com:514
EOF

sudo systemctl restart rsyslog
```

### Using Filebeat

For shipping file-based logs:

```bash
# Install Filebeat on the client server
curl -fsSL https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elastic.gpg
echo "deb [signed-by=/usr/share/keyrings/elastic.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | \
    sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update && sudo apt install filebeat
```

Configure Filebeat:

```yaml
# /etc/filebeat/filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/nginx/access.log
      - /var/log/nginx/error.log
    fields:
      service: nginx
      host_type: webserver

  - type: log
    enabled: true
    paths:
      - /var/log/app/*.log
    fields:
      service: myapp

output.logstash:
  hosts: ["graylog.example.com:5044"]
```

```bash
sudo systemctl enable --now filebeat
```

## Setting Up Alerts

In Graylog, create event definitions:

1. Alerts -> Event Definitions -> Create Event Definition
2. Configure a filter (e.g., log messages containing "ERROR")
3. Set conditions (e.g., message count > 10 in last 5 minutes)
4. Configure notifications (email, Slack webhook, PagerDuty, etc.)

For Slack notifications, create a notification under Alerts -> Notifications, select "Slack Notification" and provide the webhook URL.

## Managing Log Retention

```bash
# Check OpenSearch disk usage
docker compose exec opensearch curl -s http://localhost:9200/_cat/indices?v | sort -k9 -h

# Configure index retention in Graylog
# System -> Indices -> Default index set -> Edit
# Set "Max number of indices" based on your storage capacity
```

## Backing Up Graylog Configuration

```bash
# Backup MongoDB (Graylog configuration and metadata)
docker compose exec -T mongodb mongodump --db graylog --archive | \
    gzip > /var/backups/graylog-config-$(date +%Y%m%d).gz

# Restore
gunzip -c /var/backups/graylog-config-20260301.gz | \
    docker compose exec -T mongodb mongorestore --archive --db graylog
```

## Troubleshooting

```bash
# Graylog fails to start
docker compose logs graylog | tail -50

# OpenSearch not healthy
docker compose logs opensearch | grep -E "ERROR|WARN" | tail -20

# Check if vm.max_map_count is set correctly
cat /proc/sys/vm/max_map_count  # Must be 262144

# Verify inputs are receiving data
# System -> Inputs -> Check the "Received messages" counter

# Check if messages are being processed
docker compose exec graylog curl -s http://localhost:9000/api/system/throughput

# Test syslog input manually
echo "<34>$(date '+%b %e %T') $(hostname) testapp: Test message" | \
    nc -u -w1 localhost 514
```

Graylog requires more infrastructure than simpler logging solutions, but the payoff is a production-grade centralized logging system with search, parsing, alerting, and dashboards. Once set up and running with log sources connected, it fundamentally changes how you troubleshoot issues across a fleet of servers.
