# How to Install Filebeat for Log Shipping on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Filebeat, Logging, Ubuntu, Elasticsearch, Logstash, DevOps, Observability, Log Shipping, Elastic Stack

Description: A comprehensive guide to installing, configuring, and optimizing Filebeat on Ubuntu for shipping logs to Elasticsearch, Logstash, Kafka, and other destinations.

---

Filebeat is the lightweight log shipper from Elastic that sits on your servers, watches log files, and forwards them to a central destination. Unlike heavier agents, Filebeat uses minimal resources while reliably delivering logs at scale. This guide covers everything from basic installation to production-grade configurations for Ubuntu systems.

## What is Filebeat and Why Use It

Filebeat belongs to the Beats family of lightweight data shippers from Elastic. It specializes in reading log files and forwarding them to outputs like Elasticsearch, Logstash, or Kafka. Key advantages include:

- **Lightweight footprint** - uses around 10-20MB of memory, making it suitable for resource-constrained environments
- **Backpressure handling** - automatically slows down when the destination cannot keep up
- **At-least-once delivery** - tracks file positions to ensure no log lines are lost during restarts
- **Modular architecture** - pre-built modules for common applications like Nginx, MySQL, and system logs
- **Native Elasticsearch integration** - supports index lifecycle management, ingest pipelines, and direct indexing

Common use cases include centralizing application logs, shipping container logs, forwarding system audit trails, and feeding log analytics pipelines.

---

## Prerequisites

Before installing Filebeat, ensure your Ubuntu system meets these requirements:

- Ubuntu 20.04 LTS, 22.04 LTS, or 24.04 LTS
- Root or sudo access
- At least 256MB free RAM (512MB recommended)
- Network connectivity to your output destination
- A destination ready to receive logs (Elasticsearch, Logstash, or Kafka)

Verify your Ubuntu version and available resources before proceeding.

```bash
# Check Ubuntu version
lsb_release -a

# Verify available memory
free -h

# Check disk space for log buffering
df -h /var/lib/filebeat
```

---

## Installing Filebeat from the Elastic Repository

The recommended installation method uses the official Elastic APT repository, which ensures you receive security updates and version compatibility.

First, import the Elastic GPG key and add the repository to your system.

```bash
# Import the Elastic GPG signing key
# This key verifies that packages are authentically from Elastic
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elastic-keyring.gpg

# Add the Elastic 8.x repository to APT sources
# Using signed-by ensures only packages signed with the Elastic key are trusted
echo "deb [signed-by=/usr/share/keyrings/elastic-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list

# Update package index and install Filebeat
sudo apt update && sudo apt install filebeat -y

# Verify installation
filebeat version
```

Enable Filebeat to start automatically on boot and start the service.

```bash
# Enable Filebeat to start on system boot
sudo systemctl enable filebeat

# Start the Filebeat service
sudo systemctl start filebeat

# Check service status
sudo systemctl status filebeat
```

---

## Basic Configuration Overview

Filebeat configuration lives in `/etc/filebeat/filebeat.yml`. The file follows YAML syntax and contains sections for inputs, outputs, processors, and general settings.

Here is a minimal configuration that reads a log file and sends to Elasticsearch.

```yaml
# /etc/filebeat/filebeat.yml
# Minimal Filebeat configuration for shipping application logs

# Inputs define where Filebeat reads data from
filebeat.inputs:
  # Log input type reads from files on disk
  - type: log
    enabled: true
    # Paths supports glob patterns for matching multiple files
    paths:
      - /var/log/myapp/*.log
    # Add custom fields to identify the source
    fields:
      app: myapp
      environment: production
    # Merge custom fields at root level instead of under 'fields' key
    fields_under_root: true

# Output configuration - where logs are sent
output.elasticsearch:
  hosts: ["https://elasticsearch.example.com:9200"]
  username: "filebeat_writer"
  password: "${ES_PASSWORD}"  # Use environment variable for secrets
  # Index name pattern with date for easier lifecycle management
  index: "filebeat-myapp-%{+yyyy.MM.dd}"

# Logging settings for Filebeat itself
logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0640
```

After modifying the configuration, always validate it before restarting.

```bash
# Test configuration syntax and connectivity
sudo filebeat test config -c /etc/filebeat/filebeat.yml

# Test output connectivity
sudo filebeat test output -c /etc/filebeat/filebeat.yml

# Restart Filebeat to apply changes
sudo systemctl restart filebeat
```

---

## Input Types and Configuration

Filebeat supports multiple input types for different log sources. Understanding each type helps you configure the right one for your use case.

### Log Input (File-Based)

The log input is the most common type, reading lines from files on disk.

```yaml
# Log input configuration with advanced options
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/nginx/access.log
      - /var/log/nginx/error.log
    # Exclude files matching these patterns
    exclude_files: ['\.gz$']
    # Only include lines matching this regex
    include_lines: ['^ERR', '^WARN']
    # Exclude lines matching this regex (processed after include_lines)
    exclude_lines: ['^DEBUG']
    # How often to check for new files matching the glob pattern
    scan_frequency: 10s
    # Close file handle after this duration of inactivity
    close_inactive: 5m
    # Ignore files that haven't been modified in this duration
    ignore_older: 24h
    # Start reading from beginning (head) or end (tail) of new files
    tail_files: false
    # Maximum bytes per log line (truncates longer lines)
    max_bytes: 10485760  # 10MB
    # Add tags for filtering in downstream systems
    tags: ["nginx", "webserver"]
```

### Container Input

For Docker and containerd environments, the container input understands container log formats.

```yaml
# Container input for Docker environments
filebeat.inputs:
  - type: container
    enabled: true
    paths:
      # Docker default log location
      - /var/lib/docker/containers/*/*.log
    # Parse container ID and extract metadata
    stream: all  # stdout, stderr, or all
    # Combine with Docker metadata processor
    processors:
      - add_docker_metadata:
          host: "unix:///var/run/docker.sock"
          # Match container ID from log path
          match_source_index: 4
```

### Syslog Input

Receive syslog messages directly over TCP or UDP, useful for network devices and legacy systems.

```yaml
# Syslog input listening on TCP and UDP
filebeat.inputs:
  # TCP syslog receiver
  - type: syslog
    enabled: true
    protocol.tcp:
      host: "0.0.0.0:5140"
      # Maximum connections
      max_connections: 100
    # Parse RFC3164 (BSD) or RFC5424 format
    format: auto
    tags: ["syslog", "network"]

  # UDP syslog receiver (separate input)
  - type: syslog
    enabled: true
    protocol.udp:
      host: "0.0.0.0:5141"
      # Read buffer size
      read_buffer: 16384
    format: rfc3164
    tags: ["syslog", "udp"]
```

### Filestream Input (Recommended for New Deployments)

The filestream input is the newer, more efficient replacement for the log input.

```yaml
# Filestream input - recommended over log input for new deployments
filebeat.inputs:
  - type: filestream
    enabled: true
    id: application-logs  # Unique ID required for filestream
    paths:
      - /var/log/app/*.log
    # Prospector controls file discovery
    prospector:
      scanner:
        check_interval: 10s
        # Fingerprint method for file identity (more reliable than path)
        fingerprint.enabled: true
    # File identity method
    file_identity.native: ~
    # Parsers for structured log formats
    parsers:
      - ndjson:
          target: ""  # Parse JSON at root level
          add_error_key: true
```

---

## Output Configuration

Filebeat supports multiple outputs. Configure only one output per Filebeat instance (except for file output which can run alongside others).

### Elasticsearch Output

Direct output to Elasticsearch is the most common configuration for Elastic Stack deployments.

```yaml
# Elasticsearch output with production settings
output.elasticsearch:
  # Multiple hosts for load balancing and failover
  hosts:
    - "https://es-node1.example.com:9200"
    - "https://es-node2.example.com:9200"
    - "https://es-node3.example.com:9200"
  # Authentication
  username: "filebeat_writer"
  password: "${ES_PASSWORD}"
  # Or use API key authentication (preferred for production)
  # api_key: "id:api_key_value"

  # Index settings
  index: "filebeat-%{[agent.version]}-%{+yyyy.MM.dd}"

  # Bulk indexing settings for throughput optimization
  bulk_max_size: 2048  # Max events per bulk request
  worker: 4  # Number of concurrent workers

  # Connection settings
  timeout: 90  # Seconds to wait for response
  max_retries: 3  # Retries before dropping events

  # TLS/SSL configuration
  ssl:
    enabled: true
    certificate_authorities: ["/etc/filebeat/ca.crt"]
    verification_mode: full
```

### Logstash Output

Send to Logstash for additional processing, parsing, or routing before Elasticsearch.

```yaml
# Logstash output with load balancing
output.logstash:
  # Multiple Logstash instances
  hosts:
    - "logstash1.example.com:5044"
    - "logstash2.example.com:5044"
  # Load balancing mode: round_robin, random, or hash
  loadbalance: true
  # Compression for network efficiency
  compression_level: 3  # 0-9, higher = more compression
  # Bulk settings
  bulk_max_size: 2048
  # Enable pipelining for better throughput
  pipelining: 2
  # TLS settings
  ssl:
    enabled: true
    certificate_authorities: ["/etc/filebeat/ca.crt"]
    certificate: "/etc/filebeat/filebeat.crt"
    key: "/etc/filebeat/filebeat.key"
```

### Kafka Output

Stream logs to Kafka topics for real-time processing pipelines.

```yaml
# Kafka output configuration
output.kafka:
  # Kafka broker addresses
  hosts:
    - "kafka1.example.com:9092"
    - "kafka2.example.com:9092"
    - "kafka3.example.com:9092"
  # Topic can be static or dynamic based on event fields
  topic: "logs-%{[fields.environment]}"
  # Partitioning strategy
  partition.round_robin:
    reachable_only: true
  # Kafka producer settings
  required_acks: 1  # 0=none, 1=leader, -1=all replicas
  compression: gzip  # none, gzip, snappy, lz4
  max_message_bytes: 1000000
  # Client identification
  client_id: filebeat-prod
  # SASL authentication
  username: "filebeat"
  password: "${KAFKA_PASSWORD}"
  sasl:
    mechanism: SCRAM-SHA-512
```

---

## Filebeat Modules

Modules provide pre-packaged configurations for common applications, including input definitions, parsing rules, and Elasticsearch index mappings.

List available modules and enable the ones you need.

```bash
# List all available modules
sudo filebeat modules list

# Enable specific modules
sudo filebeat modules enable system nginx mysql

# Disable a module
sudo filebeat modules disable apache
```

### System Module

Captures system logs including syslog and authentication events.

```yaml
# /etc/filebeat/modules.d/system.yml
- module: system
  syslog:
    enabled: true
    # Custom path if not using default /var/log/syslog
    var.paths: ["/var/log/syslog*"]
  auth:
    enabled: true
    # Custom path for auth logs
    var.paths: ["/var/log/auth.log*"]
```

### Nginx Module

Parses Nginx access and error logs with built-in grok patterns.

```yaml
# /etc/filebeat/modules.d/nginx.yml
- module: nginx
  access:
    enabled: true
    # Paths to access logs
    var.paths: ["/var/log/nginx/access.log*"]
  error:
    enabled: true
    var.paths: ["/var/log/nginx/error.log*"]
  ingress_controller:
    enabled: false
```

### MySQL Module

Captures MySQL error logs and slow query logs.

```yaml
# /etc/filebeat/modules.d/mysql.yml
- module: mysql
  error:
    enabled: true
    var.paths: ["/var/log/mysql/error.log*"]
  slowlog:
    enabled: true
    var.paths: ["/var/log/mysql/mysql-slow.log*"]
    # Remove SQL literals for grouping similar queries
    var.remove_literals: true
```

After enabling modules, set up the Elasticsearch index templates and dashboards.

```bash
# Load index templates, ILM policies, and Kibana dashboards
sudo filebeat setup -e

# Load only index templates
sudo filebeat setup --index-management

# Load only Kibana dashboards
sudo filebeat setup --dashboards
```

---

## Processors for Data Transformation

Processors modify events before sending them to the output. Use them to add metadata, filter events, parse fields, or redact sensitive data.

```yaml
# Processors configuration examples
processors:
  # Add hostname and other host metadata
  - add_host_metadata:
      when.not.contains.tags: forwarded
      cache.ttl: 5m

  # Add cloud provider metadata (AWS, GCP, Azure)
  - add_cloud_metadata: ~

  # Add Kubernetes metadata when running in K8s
  - add_kubernetes_metadata:
      host: ${NODE_NAME}
      matchers:
        - logs_path:
            logs_path: "/var/log/containers/"

  # Drop events matching a condition
  - drop_event:
      when:
        regexp:
          message: "^DEBUG"

  # Drop specific fields from events
  - drop_fields:
      fields: ["agent.ephemeral_id", "host.mac"]
      ignore_missing: true

  # Rename fields
  - rename:
      fields:
        - from: "message"
          to: "log.original"
      ignore_missing: true
      fail_on_error: false

  # Parse JSON from a field
  - decode_json_fields:
      fields: ["message"]
      target: ""
      process_array: false
      max_depth: 2
      overwrite_keys: true

  # Add custom fields conditionally
  - add_fields:
      when:
        contains:
          log.file.path: "/var/log/nginx/"
      target: ""
      fields:
        service.name: nginx
        service.type: webserver

  # Dissect parsing for structured text logs
  - dissect:
      tokenizer: "%{timestamp} %{level} [%{thread}] %{class} - %{message}"
      field: "message"
      target_prefix: "parsed"

  # Truncate long fields to save storage
  - truncate_fields:
      fields:
        - message
      max_characters: 10000
      fail_on_error: false
```

---

## Multiline Log Handling

Many applications write log entries that span multiple lines (stack traces, JSON blocks, etc.). Configure multiline patterns to merge these into single events.

```yaml
# Multiline configuration for Java stack traces
filebeat.inputs:
  - type: filestream
    id: java-app
    paths:
      - /var/log/java-app/*.log
    parsers:
      # Multiline parser configuration
      - multiline:
          type: pattern
          # Lines NOT starting with timestamp are continuations
          pattern: '^\d{4}-\d{2}-\d{2}'
          negate: true
          match: after
          # Maximum lines to merge into one event
          max_lines: 500
          # Timeout to flush partial multiline
          timeout: 5s
```

Common multiline patterns for different log formats.

```yaml
# Java/Log4j pattern - merge lines not starting with date
parsers:
  - multiline:
      type: pattern
      pattern: '^\d{4}-\d{2}-\d{2}'
      negate: true
      match: after

# Python traceback - merge lines starting with whitespace or "Traceback"
parsers:
  - multiline:
      type: pattern
      pattern: '^[[:space:]]+(File|Traceback|.*Error)'
      negate: false
      match: after

# JSON spanning multiple lines - merge until closing brace
parsers:
  - multiline:
      type: pattern
      pattern: '^\{'
      negate: true
      match: after
      max_lines: 100

# C# exception - merge lines not starting with date/timestamp
parsers:
  - multiline:
      type: pattern
      pattern: '^(\d{4}/\d{2}/\d{2}|\d{4}-\d{2}-\d{2})'
      negate: true
      match: after
```

---

## SSL/TLS Configuration

Secure communication between Filebeat and outputs is essential for production deployments.

### Elasticsearch with TLS

```yaml
# TLS configuration for Elasticsearch output
output.elasticsearch:
  hosts: ["https://elasticsearch.example.com:9200"]

  ssl:
    # Enable TLS
    enabled: true

    # Certificate authority to verify server certificate
    certificate_authorities:
      - /etc/filebeat/certs/ca.crt

    # Client certificate for mutual TLS (optional but recommended)
    certificate: /etc/filebeat/certs/filebeat.crt
    key: /etc/filebeat/certs/filebeat.key

    # Key passphrase if the key is encrypted
    # key_passphrase: "${SSL_KEY_PASSPHRASE}"

    # Verification mode: full, certificate, or none
    # full: verify certificate and hostname
    # certificate: verify certificate only
    # none: skip verification (not recommended for production)
    verification_mode: full

    # Supported TLS versions
    supported_protocols: [TLSv1.2, TLSv1.3]

    # Cipher suites (optional, uses secure defaults)
    cipher_suites:
      - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
      - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
```

### Logstash with Mutual TLS

```yaml
# Mutual TLS configuration for Logstash output
output.logstash:
  hosts: ["logstash.example.com:5044"]

  ssl:
    enabled: true
    # CA certificate to verify Logstash server
    certificate_authorities: ["/etc/filebeat/certs/ca.crt"]
    # Client certificate that Logstash will verify
    certificate: "/etc/filebeat/certs/filebeat.crt"
    key: "/etc/filebeat/certs/filebeat.key"
    verification_mode: full
```

Generate certificates using the Elasticsearch certutil or OpenSSL.

```bash
# Generate CA and certificates using elasticsearch-certutil
# Run this on a machine with Elasticsearch installed
/usr/share/elasticsearch/bin/elasticsearch-certutil ca --out ca.zip
/usr/share/elasticsearch/bin/elasticsearch-certutil cert --ca ca.zip --out certs.zip

# Or using OpenSSL for a self-signed CA
# Generate CA key and certificate
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt -subj "/CN=Filebeat CA"

# Generate Filebeat client certificate
openssl genrsa -out filebeat.key 2048
openssl req -new -key filebeat.key -out filebeat.csr -subj "/CN=filebeat"
openssl x509 -req -days 365 -in filebeat.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out filebeat.crt

# Set proper permissions
sudo chmod 600 /etc/filebeat/certs/*.key
sudo chown root:root /etc/filebeat/certs/*
```

---

## Monitoring Filebeat

Monitor Filebeat's health and performance to ensure reliable log delivery.

### Internal Metrics to Elasticsearch

```yaml
# Send Filebeat's own metrics to Elasticsearch
monitoring:
  enabled: true
  elasticsearch:
    hosts: ["https://monitoring-es.example.com:9200"]
    username: "monitoring_user"
    password: "${MONITORING_PASSWORD}"
    # Separate index for monitoring data
    metrics.index: ".monitoring-filebeat"
    state.index: ".monitoring-filebeat"
  # Collection interval
  period: 30s
```

### HTTP Metrics Endpoint

Enable the HTTP endpoint to expose metrics for Prometheus or other monitoring systems.

```yaml
# Enable HTTP endpoint for metrics
http:
  enabled: true
  host: "0.0.0.0"
  port: 5066
  # Named URL for specific metrics
  # /stats - runtime stats
  # /state - current state
```

Query the metrics endpoint to check Filebeat health.

```bash
# Check Filebeat stats
curl -s http://localhost:5066/stats | jq .

# Check specific metrics
curl -s http://localhost:5066/stats | jq '.filebeat.harvester'

# Check output metrics
curl -s http://localhost:5066/stats | jq '.libbeat.output'

# Prometheus metrics endpoint
curl -s http://localhost:5066/metrics
```

### Key Metrics to Monitor

- `filebeat.harvester.running` - number of active file harvesters
- `filebeat.harvester.open_files` - currently open file handles
- `libbeat.output.events.acked` - events successfully sent
- `libbeat.output.events.failed` - events that failed to send
- `libbeat.pipeline.events.published` - events entering the pipeline
- `registrar.writes.success` - successful registry updates

---

## Kubernetes Deployment

Deploy Filebeat as a DaemonSet to collect logs from all nodes in a Kubernetes cluster.

```yaml
# filebeat-kubernetes.yml
# DaemonSet deployment for Kubernetes log collection
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: logging
data:
  filebeat.yml: |
    filebeat.inputs:
      # Collect container logs from all pods
      - type: container
        paths:
          - /var/log/containers/*.log
        processors:
          - add_kubernetes_metadata:
              host: ${NODE_NAME}
              matchers:
                - logs_path:
                    logs_path: "/var/log/containers/"

    # Autodiscover pods with specific annotations
    filebeat.autodiscover:
      providers:
        - type: kubernetes
          node: ${NODE_NAME}
          hints.enabled: true
          hints.default_config:
            type: container
            paths:
              - /var/log/containers/*${data.kubernetes.container.id}.log

    output.elasticsearch:
      hosts: ['${ELASTICSEARCH_HOST:elasticsearch:9200}']
      username: ${ELASTICSEARCH_USERNAME}
      password: ${ELASTICSEARCH_PASSWORD}

    processors:
      - add_cloud_metadata: ~
      - add_host_metadata: ~
      - drop_fields:
          fields: ["host.mac", "host.ip"]

---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: logging
spec:
  selector:
    matchLabels:
      app: filebeat
  template:
    metadata:
      labels:
        app: filebeat
    spec:
      serviceAccountName: filebeat
      terminationGracePeriodSeconds: 30
      containers:
        - name: filebeat
          image: docker.elastic.co/beats/filebeat:8.12.0
          args: ["-c", "/etc/filebeat.yml", "-e"]
          env:
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: ELASTICSEARCH_HOST
              value: "elasticsearch.elastic.svc:9200"
            - name: ELASTICSEARCH_USERNAME
              valueFrom:
                secretKeyRef:
                  name: elasticsearch-credentials
                  key: username
            - name: ELASTICSEARCH_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: elasticsearch-credentials
                  key: password
          securityContext:
            runAsUser: 0
          resources:
            limits:
              memory: 200Mi
              cpu: 200m
            requests:
              memory: 100Mi
              cpu: 100m
          volumeMounts:
            - name: config
              mountPath: /etc/filebeat.yml
              subPath: filebeat.yml
              readOnly: true
            - name: data
              mountPath: /usr/share/filebeat/data
            - name: varlog
              mountPath: /var/log
              readOnly: true
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: filebeat-config
        - name: data
          hostPath:
            path: /var/lib/filebeat-data
            type: DirectoryOrCreate
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: filebeat
  namespace: logging

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: filebeat
rules:
  - apiGroups: [""]
    resources: ["namespaces", "pods", "nodes"]
    verbs: ["get", "watch", "list"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: filebeat
subjects:
  - kind: ServiceAccount
    name: filebeat
    namespace: logging
roleRef:
  kind: ClusterRole
  name: filebeat
  apiGroup: rbac.authorization.k8s.io
```

Deploy the Filebeat DaemonSet.

```bash
# Create the logging namespace
kubectl create namespace logging

# Create Elasticsearch credentials secret
kubectl create secret generic elasticsearch-credentials \
  --from-literal=username=filebeat \
  --from-literal=password=your-secure-password \
  -n logging

# Deploy Filebeat
kubectl apply -f filebeat-kubernetes.yml

# Verify deployment
kubectl get pods -n logging -l app=filebeat

# Check logs from a Filebeat pod
kubectl logs -n logging -l app=filebeat --tail=100
```

---

## Performance Tuning

Optimize Filebeat for high-throughput environments or resource-constrained systems.

### High-Throughput Configuration

```yaml
# Performance tuning for high-volume log shipping
# Increase queue size for burst handling
queue.mem:
  events: 8192  # Default is 3200
  flush.min_events: 2048  # Flush when this many events are queued
  flush.timeout: 5s  # Or after this timeout

# Output worker scaling
output.elasticsearch:
  hosts: ["https://es1:9200", "https://es2:9200", "https://es3:9200"]
  # Increase workers for parallel processing
  worker: 4  # Default is 1
  # Larger bulk size for efficiency
  bulk_max_size: 4096  # Default is 2048
  # Connection pool
  max_retries: 5
  timeout: 180

# Input tuning
filebeat.inputs:
  - type: filestream
    id: high-volume-logs
    paths:
      - /var/log/app/*.log
    # Larger read buffer
    harvester_buffer_size: 32768  # Default is 16384
    # Increase prospector frequency for fast-rotating files
    prospector.scanner.check_interval: 5s
```

### Resource-Constrained Configuration

```yaml
# Configuration for minimal resource usage
# Smaller memory queue
queue.mem:
  events: 1024
  flush.min_events: 512
  flush.timeout: 10s

# Single worker, smaller batches
output.elasticsearch:
  hosts: ["https://es:9200"]
  worker: 1
  bulk_max_size: 512

# Aggressive file closing
filebeat.inputs:
  - type: filestream
    id: minimal-logs
    paths:
      - /var/log/app/*.log
    # Close files quickly to reduce memory/handles
    close.on_state_change.inactive: 1m
    # Limit concurrent harvesters
    harvester_limit: 10
```

### Registry File Management

The registry file tracks read positions. On systems with many files, it can grow large.

```bash
# Check registry file size
ls -lh /var/lib/filebeat/registry/filebeat/

# Registry is stored in /var/lib/filebeat/registry/
# Clean up by removing entries for deleted files
# (Filebeat handles this automatically with clean_removed)
```

```yaml
# Registry cleanup settings
filebeat.registry:
  # How often to flush registry to disk
  flush: 10s

filebeat.inputs:
  - type: filestream
    id: app-logs
    paths:
      - /var/log/app/*.log
    # Clean registry entries for files removed from disk
    clean_removed: true
    # Remove registry entry when file is inactive
    clean_inactive: 72h
```

---

## Troubleshooting

Common issues and their solutions when running Filebeat on Ubuntu.

### Filebeat Not Starting

```bash
# Check systemd status for error messages
sudo systemctl status filebeat -l

# View recent logs
sudo journalctl -u filebeat -n 100 --no-pager

# Test configuration syntax
sudo filebeat test config -c /etc/filebeat/filebeat.yml -e

# Run Filebeat in foreground with debug logging
sudo filebeat -e -d "*" -c /etc/filebeat/filebeat.yml
```

### No Logs Being Shipped

```bash
# Verify file permissions
sudo -u root ls -la /var/log/app/

# Check if Filebeat can read the files
sudo -u root filebeat test config -c /etc/filebeat/filebeat.yml

# Verify glob patterns match files
sudo filebeat -e -c /etc/filebeat/filebeat.yml 2>&1 | grep -i "harvester"

# Check the registry for tracked files
sudo cat /var/lib/filebeat/registry/filebeat/log.json | jq .
```

### Connection Issues

```bash
# Test Elasticsearch connectivity
curl -u username:password https://elasticsearch:9200/_cluster/health

# Test Logstash connectivity
nc -zv logstash.example.com 5044

# Verify TLS certificates
openssl s_client -connect elasticsearch:9200 -CAfile /etc/filebeat/ca.crt

# Check Filebeat output connectivity
sudo filebeat test output -c /etc/filebeat/filebeat.yml
```

### High Memory Usage

```yaml
# Reduce memory usage by limiting queue and harvester count
queue.mem:
  events: 1024

filebeat.inputs:
  - type: filestream
    id: app-logs
    paths:
      - /var/log/app/*.log
    # Limit concurrent harvesters
    harvester_limit: 5
    # Close inactive files quickly
    close.on_state_change.inactive: 30s
```

### Duplicate Events

```yaml
# Ensure unique input IDs (required for filestream)
filebeat.inputs:
  - type: filestream
    id: unique-app-logs  # Must be unique across all inputs
    paths:
      - /var/log/app/*.log

# Clean registry when path patterns change
# Stop Filebeat, remove registry, restart
sudo systemctl stop filebeat
sudo rm -rf /var/lib/filebeat/registry
sudo systemctl start filebeat
```

### Useful Debug Commands

```bash
# Check Filebeat version and config path
filebeat version
filebeat export config

# List enabled modules
sudo filebeat modules list | grep -E "^Enabled"

# Export current configuration (with all defaults)
sudo filebeat export config -c /etc/filebeat/filebeat.yml

# Check Elasticsearch index template
curl -u user:pass https://es:9200/_index_template/filebeat

# Verify events are being published
sudo filebeat -e -d "publish" -c /etc/filebeat/filebeat.yml 2>&1 | head -100
```

---

## Summary

Filebeat provides a reliable, lightweight solution for shipping logs from Ubuntu systems to centralized logging infrastructure. Key takeaways:

- Install from the official Elastic repository for security updates
- Use filestream input for new deployments over the legacy log input
- Enable modules for common applications to get parsing and dashboards automatically
- Configure TLS for production deployments
- Use processors to enrich, filter, and transform events
- Monitor Filebeat itself using the HTTP metrics endpoint
- Tune queue size and workers based on throughput requirements

With proper configuration, Filebeat handles everything from a single server to thousands of nodes in Kubernetes clusters.

---

For comprehensive log monitoring and alerting, consider [OneUptime](https://oneuptime.com). OneUptime integrates with Elasticsearch and provides log aggregation, real-time alerting, incident management, and status pages in a single platform. Whether you are shipping logs with Filebeat to Elasticsearch or using OpenTelemetry, OneUptime helps you turn log data into actionable insights with automated anomaly detection and on-call routing.
