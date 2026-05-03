# How to Deploy Kibana via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kibana, Elasticsearch, Visualization, Docker

Description: Learn how to deploy Kibana via Portainer to visualize Elasticsearch data, create dashboards, and analyze logs and metrics through Kibana's web interface.

## Kibana via Portainer Stack

**Stacks → Add Stack → kibana**

```yaml
version: "3.8"

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - ELASTIC_PASSWORD=${ELASTIC_PASSWORD}
      - xpack.security.enabled=true
      - xpack.security.http.ssl.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -s -u elastic:${ELASTIC_PASSWORD} http://localhost:9200/_cluster/health | grep -q 'green\\|yellow'"]
      interval: 20s
      retries: 5

  kibana:
    image: docker.elastic.co/kibana/kibana:8.12.0
    restart: unless-stopped
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=kibana_system
      - ELASTICSEARCH_PASSWORD=${KIBANA_PASSWORD}
      - SERVER_PUBLICBASEURL=http://your-server:5601
    volumes:
      - kibana_data:/usr/share/kibana/data
    depends_on:
      elasticsearch:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:5601/api/status | grep -q 'available'"]
      interval: 30s
      retries: 10

volumes:
  elasticsearch_data:
  kibana_data:
```

## Environment Variables

```text
ELASTIC_PASSWORD = elastic-password
KIBANA_PASSWORD = kibana-system-password
```

## Set Kibana System User Password

```bash
# Run after Elasticsearch starts

docker exec elasticsearch curl -u elastic:${ELASTIC_PASSWORD} \
  -X POST "http://localhost:9200/_security/user/kibana_system/_password" \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"${KIBANA_PASSWORD}\"}"
```

## Accessing Kibana

Open `http://server:5601` in your browser.

Login with `elastic` user and the `ELASTIC_PASSWORD`.

## First Steps in Kibana

1. **Stack Management → Data Views → Create data view**
2. Enter: `logs-*` or `metrics-*` (depends on your data)
3. Select the time field: `@timestamp`
4. Go to **Discover** to explore your data

## Loading Sample Data

Kibana includes sample datasets for testing:

1. **Home → Try sample data**
2. Add **Sample web logs** or **Sample eCommerce orders**
3. Explore the pre-built dashboards

## Creating a Log Dashboard

1. **Visualize Library → Create visualization**
2. Type: Lens → Stacked Bar Chart
3. X-axis: `@timestamp` (date histogram, interval: 1 hour)
4. Y-axis: Count of records
5. Split by: `response.keyword` (HTTP status codes)
6. Save and add to a new Dashboard

## Securing Kibana Access

For production, put Kibana behind Nginx or Traefik. Remove the published port mapping so Kibana is only reachable from other containers on the same Docker network — keep `SERVER_HOST` at its default (`0.0.0.0`) so the reverse proxy container can reach it via the service name:

```yaml
kibana:
  # Remove the public port binding:
  # ports:
  #   - "5601:5601"
  expose:
    - "5601"
```

Add an Nginx proxy host in NPM pointing to `http://kibana:5601` on the shared Docker network.

## Conclusion

Kibana via Portainer provides a powerful data visualization and log analysis platform on top of Elasticsearch. The `depends_on` with `service_healthy` condition ensures Kibana doesn't start before Elasticsearch is ready - preventing the common "Kibana can't connect" issue during stack startup.
