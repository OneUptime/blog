# How to Deploy Kibana via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Kibana, Elasticsearch, Visualization, Self-Hosted

Description: Deploy Kibana via Portainer to visualize Elasticsearch data with interactive dashboards, log analysis, and real-time monitoring capabilities.

## Introduction

Kibana is the visualization layer for the Elastic Stack, providing interactive charts, dashboards, and log exploration tools. Deploy it via Portainer alongside Elasticsearch for a complete search and visualization platform.

## Prerequisites

- Elasticsearch running on the same version as Kibana (`8.13.0` in this example; see Elasticsearch deployment guide)
- Portainer installed

## Deploy as a Stack

```yaml
version: "3.8"

services:
  kibana:
    image: docker.elastic.co/kibana/kibana:8.13.0
    container_name: kibana
    environment:
      # Elasticsearch connection
      - ELASTICSEARCH_HOSTS='["http://elasticsearch:9200"]'
      - ELASTICSEARCH_USERNAME=kibana_system
      - ELASTICSEARCH_PASSWORD=kibana_system_password
      # Server settings
      - SERVER_NAME=kibana
      - SERVER_HOST=0.0.0.0
      # Optional feature settings
      - XPACK_REPORTING_ENABLED=false
    volumes:
      - kibana_data:/usr/share/kibana/data
    ports:
      - "5601:5601"
    networks:
      - elastic-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS -u elastic:elastic_password http://localhost:5601/api/status | grep -q '\"overall\":{\"level\":\"available\"'"]
      interval: 30s
      timeout: 10s
      retries: 10
      start_period: 120s

networks:
  elastic-network:
    external: true   # Assumes Elasticsearch is in this network

volumes:
  kibana_data:
```

## Setting Up Kibana System User

After deploying Elasticsearch, set the kibana_system password:

```bash
curl -X POST "http://localhost:9200/_security/user/kibana_system/_password" \
  -u elastic:elastic_password \
  -H "Content-Type: application/json" \
  -d '{"password": "kibana_system_password"}'
```

## Creating Data Views

1. Access Kibana at `http://<host>:5601`
2. Log in with `elastic` / `elastic_password`
3. Navigate to **Stack Management > Data Views**
4. Click **Create data view**
5. Enter name and index pattern (e.g., `logs-*`)
6. Select `@timestamp` as the time field

## Creating a Dashboard

1. Navigate to **Dashboards > Create dashboard**
2. Click **Create visualization**
3. Choose visualization type (Bar chart, Line chart, Pie chart, etc.)
4. Select your data view and configure metrics
5. Save and add to dashboard

## Example: Log Analysis Setup

Import log data using Filebeat or directly via API:

```bash
# Send sample log to Elasticsearch

curl -X POST "http://localhost:9200/app-logs/_doc" \
  -u elastic:elastic_password \
  -H "Content-Type: application/json" \
  -d '{
    "@timestamp": "2026-03-20T10:00:00Z",
    "level": "ERROR",
    "service": "api-gateway",
    "message": "Connection timeout to backend service",
    "response_time_ms": 5000,
    "status_code": 503
  }'
```

## Securing Kibana Access

For internal use, protect with a reverse proxy and basic auth:

```yaml
services:
  kibana-proxy:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx-kibana.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/certs:ro
      - ./htpasswd:/etc/nginx/.htpasswd:ro
```

```nginx
# nginx-kibana.conf
server {
    listen 443 ssl;
    server_name kibana.example.com;

    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;

    auth_basic "Kibana Access";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://kibana:5601;
        proxy_set_header Authorization "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Conclusion

Kibana deployed via Portainer transforms Elasticsearch data into interactive visualizations and dashboards. The healthcheck only marks Kibana healthy when fully initialized, which helps prevent connection errors in dependent services. With data views and dashboard capabilities, you gain powerful log analysis and monitoring insights.
