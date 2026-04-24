# How to Deploy the EFK Stack (Elasticsearch, Fluentd, Kibana) via Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, EFK Stack, Elasticsearch, Fluentd, Kibana, Logging

Description: Learn how to deploy the EFK logging stack (Elasticsearch, Fluentd, Kibana) via Portainer for centralized log aggregation and search.

---

The EFK stack (Elasticsearch, Fluentd, Kibana) is a popular log aggregation solution. Elasticsearch stores and indexes logs, Fluentd collects and routes them, and Kibana provides the search and visualization UI.

## Stack Definition

```yaml
version: "3.8"

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    environment:
      discovery.type: single-node
      bootstrap.memory_lock: "true"
      ES_JAVA_OPTS: "-Xms512m -Xmx512m"
      xpack.security.enabled: "false"   # Disable for dev; enable in production
      xpack.security.http.ssl.enabled: "false"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - efk_net
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:9200/_cluster/health | grep -v '\"status\":\"red\"'"]
      interval: 30s
      timeout: 10s
      retries: 5
    ulimits:
      memlock:
        soft: -1
        hard: -1

  fluentd:
    image: fluent/fluentd-kubernetes-daemonset:v1.16-debian-elasticsearch8-1
    environment:
      FLUENT_ELASTICSEARCH_HOST: elasticsearch
      FLUENT_ELASTICSEARCH_PORT: "9200"
      FLUENT_ELASTICSEARCH_SCHEME: "http"
      FLUENT_UID: "0"
    volumes:
      - /path/on/host/fluent.conf:/fluentd/etc/fluent.conf:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    ports:
      - "24224:24224"
      - "24224:24224/udp"
    networks:
      - efk_net
    depends_on:
      elasticsearch:
        condition: service_healthy

  kibana:
    image: docker.elastic.co/kibana/kibana:8.12.0
    environment:
      ELASTICSEARCH_HOSTS: '["http://elasticsearch:9200"]'
    ports:
      - "5601:5601"
    networks:
      - efk_net
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:

networks:
  efk_net:
    driver: bridge
```

## Fluentd Configuration

Create `fluent.conf` on the Docker host at `/path/on/host/fluent.conf` to collect Docker container logs:

```xml
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

<source>
  @type tail
  path /var/lib/docker/containers/*/*-json.log
  pos_file /var/log/fluentd-docker.pos
  path_key container_log_path
  tag docker.containers
  read_from_head true
  follow_inodes true
  <parse>
    @type json
    time_type string
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>

<filter docker.**>
  @type record_transformer
  enable_ruby true
  <record>
    container_id ${record["container_id"] || record["container_log_path"].split("/")[5]}
    log_source docker
  </record>
  remove_keys container_log_path
</filter>

<match docker.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix docker-logs
  include_timestamp true
  <buffer>
    @type file
    path /var/log/fluentd-buffers/docker.logs
    flush_mode interval
    flush_interval 5s
    chunk_limit_size 2M
    retry_max_interval 30
    retry_forever true
  </buffer>
</match>
```

## Configuring Application Containers to Use Fluentd

If you want application containers to send logs directly to Fluentd, configure them like this:

```yaml
services:
  api:
    image: my-api:latest
    logging:
      driver: fluentd
      options:
        fluentd-address: "localhost:24224"
        tag: "docker.my-app.api"
        fluentd-async: "true"
```

## Setting Up Kibana Data View

After deployment, configure Kibana:

1. Open `http://localhost:5601`.
2. Go to **Stack Management > Data Views**.
3. Create a data view: `docker-logs-*`.
4. Set the time field to `@timestamp`.
5. Go to **Discover** to search logs.

## Sample Kibana Queries

```text
# Find all ERROR logs

log: "ERROR"

# Find stderr logs
source: stderr OR stream: stderr

# Find recent logs
@timestamp > now-15m
```

## Production Elasticsearch Settings

For production, increase Elasticsearch resources. If you also enable Elastic security, update Kibana and Fluentd to use Elasticsearch credentials and HTTPS.

```yaml
  elasticsearch:
    environment:
      bootstrap.memory_lock: "true"
      ES_JAVA_OPTS: "-Xms2g -Xmx2g"
    deploy:
      resources:
        limits:
          memory: 4G
```

Also set the virtual memory limit on the host:

```bash
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```
