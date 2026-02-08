# How to Run Fluent Bit in Docker for Lightweight Log Forwarding

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Fluent Bit, Logging, Observability, Log Forwarding, DevOps

Description: Set up Fluent Bit in Docker to collect, parse, and forward container logs to multiple destinations efficiently.

---

Fluent Bit is a lightweight, high-performance log processor and forwarder. It was built from the ground up in C, consuming only a few megabytes of memory while processing thousands of log records per second. If you need to collect logs from Docker containers and ship them to Elasticsearch, Loki, S3, or any other destination, Fluent Bit is one of the best tools for the job.

This guide covers running Fluent Bit in Docker to collect container logs, parse structured fields out of them, and forward the results to multiple outputs.

## Why Fluent Bit Over Fluentd

Fluentd is the older, Ruby-based log forwarder in the same ecosystem. Fluent Bit is its smaller sibling, written in C. Fluent Bit uses roughly 450KB of memory at baseline compared to Fluentd's 40MB. For containerized environments where you run a log forwarder on every host, that difference adds up fast. Fluent Bit also has a simpler plugin API and handles backpressure well, which matters when downstream systems are slow.

## Prerequisites

You need Docker and Docker Compose installed. This guide also uses Elasticsearch and Kibana as the log destination, but Fluent Bit supports dozens of output plugins if you prefer something else.

```bash
# Verify Docker is available
docker --version
docker compose version
```

## Fluent Bit Configuration

Create a `fluent-bit.conf` file. This configuration reads Docker container logs from the file system, parses JSON fields, and sends the results to both Elasticsearch and stdout.

```ini
# fluent-bit.conf - Main Fluent Bit configuration

[SERVICE]
    # Flush logs every 1 second
    Flush        1
    # Set the log level for Fluent Bit's own logs
    Log_Level    info
    # Enable the built-in HTTP monitoring server
    HTTP_Server  On
    HTTP_Listen  0.0.0.0
    HTTP_Port    2020
    # Parse configuration file
    Parsers_File /fluent-bit/etc/parsers.conf

[INPUT]
    # Read logs from the Docker container log files on the host
    Name         forward
    Listen       0.0.0.0
    Port         24224
    Tag          docker.*

[FILTER]
    # Parse the log field as JSON if possible
    Name         parser
    Match        docker.*
    Key_Name     log
    Parser       docker_json
    Reserve_Data On

[FILTER]
    # Add the hostname to every record for identification
    Name         modify
    Match        *
    Add          hostname ${HOSTNAME}

[OUTPUT]
    # Send logs to Elasticsearch
    Name         es
    Match        *
    Host         elasticsearch
    Port         9200
    Index        fluent-bit
    Logstash_Format On
    Logstash_Prefix fluent-bit
    Suppress_Type_Name On
    # Retry on failure
    Retry_Limit  5

[OUTPUT]
    # Also print logs to stdout for debugging
    Name         stdout
    Match        *
    Format       json_lines
```

Create a custom parsers file called `parsers.conf` to handle JSON-formatted Docker logs.

```ini
# parsers.conf - Custom parsers for Fluent Bit

[PARSER]
    # Parse Docker JSON log format
    Name         docker_json
    Format       json
    Time_Key     time
    Time_Format  %Y-%m-%dT%H:%M:%S.%L
    Time_Keep    On

[PARSER]
    # Parse common log format (e.g., nginx access logs)
    Name         nginx_access
    Format       regex
    Regex        ^(?<remote>[^ ]*) - (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^"]*)" "(?<agent>[^"]*)")?$
    Time_Key     time
    Time_Format  %d/%b/%Y:%H:%M:%S %z
```

## Docker Compose Stack

Create the full stack with Fluent Bit, Elasticsearch, Kibana, and a sample nginx container whose logs Fluent Bit will collect.

```yaml
# docker-compose.yml - Fluent Bit log forwarding stack
version: "3.8"

services:
  # Fluent Bit - the log forwarder
  fluent-bit:
    image: fluent/fluent-bit:3.0
    volumes:
      - ./fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf
      - ./parsers.conf:/fluent-bit/etc/parsers.conf
    ports:
      - "2020:2020"   # Monitoring endpoint
      - "24224:24224"  # Forward input
    depends_on:
      - elasticsearch
    networks:
      - logging

  # Elasticsearch - log storage and search
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - es-data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    networks:
      - logging

  # Kibana - log visualization
  kibana:
    image: docker.elastic.co/kibana/kibana:8.13.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    networks:
      - logging

  # Sample nginx container that sends logs to Fluent Bit
  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    # Use the fluentd Docker log driver to send logs to Fluent Bit
    logging:
      driver: fluentd
      options:
        fluentd-address: "localhost:24224"
        tag: "docker.nginx"
    depends_on:
      - fluent-bit
    networks:
      - logging

  # Sample app that generates log lines
  log-generator:
    image: alpine:3.19
    command: >
      sh -c "while true; do
        echo '{\"level\":\"info\",\"msg\":\"processing request\",\"request_id\":\"'$$(cat /dev/urandom | tr -dc 'a-f0-9' | head -c 8)'\",\"duration_ms\":'$$(shuf -i 10-500 -n 1)'}';
        sleep 2;
      done"
    logging:
      driver: fluentd
      options:
        fluentd-address: "localhost:24224"
        tag: "docker.app"
    depends_on:
      - fluent-bit
    networks:
      - logging

volumes:
  es-data:

networks:
  logging:
    driver: bridge
```

## Starting the Stack

Launch the stack and generate some traffic.

```bash
# Start the logging stack
docker compose up -d

# Wait for Elasticsearch to become ready (takes about 30 seconds)
until curl -s http://localhost:9200/_cluster/health | grep -q '"status":"green\|yellow"'; do
  echo "Waiting for Elasticsearch..."
  sleep 5
done

# Generate some nginx access logs by hitting the web server
for i in $(seq 1 20); do
  curl -s http://localhost:8080 > /dev/null
done
```

## Verifying Log Delivery

Check that Fluent Bit is receiving and forwarding logs.

```bash
# Check Fluent Bit's built-in monitoring endpoint
curl -s http://localhost:2020/api/v1/metrics | python3 -m json.tool

# Check how many records Fluent Bit has processed
curl -s http://localhost:2020/api/v1/metrics/prometheus

# Verify logs arrived in Elasticsearch
curl -s 'http://localhost:9200/fluent-bit-*/_count' | python3 -m json.tool
```

The count endpoint should show an increasing number of documents as logs flow in from both nginx and the log generator.

## Handling Backpressure

When the destination is slow or temporarily unavailable, Fluent Bit can buffer logs to disk. Add a storage section to your configuration.

```ini
# Add to the [SERVICE] section for filesystem buffering
[SERVICE]
    storage.path              /fluent-bit/buffer/
    storage.sync              normal
    storage.checksum          off
    # Maximum buffer size on disk
    storage.max_chunks_up     128

[INPUT]
    Name         forward
    Listen       0.0.0.0
    Port         24224
    Tag          docker.*
    # Enable filesystem storage for this input
    storage.type filesystem
```

Mount a volume for the buffer directory in your Docker Compose file to persist buffers across restarts.

## Adding More Outputs

Fluent Bit can send the same log stream to multiple destinations simultaneously. Here is an example that adds Loki and S3 as additional outputs.

```ini
# Send logs to Grafana Loki
[OUTPUT]
    Name         loki
    Match        *
    Host         loki
    Port         3100
    Labels       job=fluent-bit

# Send logs to S3 for archival
[OUTPUT]
    Name         s3
    Match        *
    region       us-east-1
    bucket       my-log-archive
    total_file_size 50M
    upload_timeout 10m
    s3_key_format /logs/%Y/%m/%d/$TAG/%H_%M_%S.gz
    compression  gzip
```

## Performance Tuning

For high-throughput environments, adjust these settings. Increase the `Flush` interval to batch more records per write. Set `Workers` on output plugins to parallelize delivery. Use the `throttle` filter to rate-limit noisy sources. These tweaks can take Fluent Bit from handling a few thousand records per second to hundreds of thousands.

## Cleanup

Remove the stack and data when finished.

```bash
docker compose down -v
```

## Conclusion

Fluent Bit gives you a production-grade log forwarding pipeline in a tiny footprint. The Docker Compose setup in this guide shows how to collect container logs, parse structured fields, and deliver them to Elasticsearch with minimal configuration. From here, you can add more inputs, filters, and outputs to build the exact pipeline your infrastructure needs. If you want to monitor whether your logging pipeline itself is healthy, tools like [OneUptime](https://oneuptime.com) can alert you when Fluent Bit stops forwarding or falls behind.
