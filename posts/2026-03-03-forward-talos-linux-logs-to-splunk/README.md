# How to Forward Talos Linux Logs to Splunk

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Logging, Splunk, Observability, Security, SIEM

Description: Learn how to forward Talos Linux system logs to Splunk for enterprise log management, security monitoring, and compliance

---

Splunk is the leading enterprise platform for security information and event management (SIEM), log analysis, and operational intelligence. Many organizations, especially in regulated industries, use Splunk as their primary log management system. If your organization runs Splunk, integrating your Talos Linux cluster logs into it provides a unified view of your infrastructure and helps meet compliance requirements.

## Why Splunk for Talos Linux Logs

Splunk brings unique capabilities that are particularly valuable for enterprise Kubernetes deployments:

- Enterprise-grade security monitoring and threat detection
- Compliance reporting for frameworks like PCI-DSS, HIPAA, and SOC 2
- Advanced search processing language (SPL) for complex log analysis
- Machine learning and anomaly detection capabilities
- Integration with existing enterprise security workflows
- Role-based access control for log data
- Prebuilt apps and dashboards for Kubernetes monitoring

## Architecture Overview

The recommended architecture for forwarding Talos Linux logs to Splunk uses a log collector as an intermediary:

```text
Talos Linux Nodes --> Log Collector (Vector/Fluentd) --> Splunk HEC --> Splunk Indexers
```

Splunk's HTTP Event Collector (HEC) is the modern way to ingest data into Splunk. The log collector receives JSON logs from Talos and forwards them to Splunk via HEC.

## Setting Up Splunk HEC

Before configuring the Talos side, set up an HEC token in Splunk:

1. In Splunk Web, go to Settings, then Data Inputs, then HTTP Event Collector
2. Click "New Token"
3. Give it a name like "talos-linux-logs"
4. Select the target index (create one called "talos" if it does not exist)
5. Set the source type to "_json"
6. Save and note the generated token

You can also create the token via the Splunk REST API:

```bash
# Create an HEC token via API
curl -k -u admin:password \
  https://splunk.example.com:8089/servicesNS/admin/splunk_httpinput/data/inputs/http \
  -d name=talos-linux-logs \
  -d index=talos \
  -d sourcetype=_json \
  -d useACK=false
```

## Setting Up Vector as a Bridge

Vector is an excellent choice for forwarding Talos logs to Splunk because it has native Splunk HEC support:

```toml
# vector.toml - Forward Talos logs to Splunk

# Receive Talos logs via TCP
[sources.talos_logs]
type = "socket"
address = "0.0.0.0:5514"
mode = "tcp"
decoding.codec = "json"

# Transform the logs for Splunk
[transforms.prepare_for_splunk]
type = "remap"
inputs = ["talos_logs"]
source = '''
  # Map Talos fields to Splunk-friendly names
  .service = del(."talos-service") ?? "unknown"
  .level = del(."talos-level") ?? "info"
  .timestamp = del(."talos-time") ?? now()
  .source = "talos-linux"

  # Set Splunk metadata
  .host = del(."talos-node") ?? "unknown"
'''

# Send to Splunk HEC
[sinks.splunk]
type = "splunk_hec_logs"
inputs = ["prepare_for_splunk"]
endpoint = "https://splunk-hec.example.com:8088"
default_token = "${SPLUNK_HEC_TOKEN}"
host_key = "host"
index = "talos"
source = "talos-linux"
sourcetype = "_json"
compression = "gzip"

# TLS configuration if using self-signed certificates
[sinks.splunk.tls]
verify_certificate = true
```

## Deploying Vector in Kubernetes

Deploy Vector as a Kubernetes Deployment to receive and forward Talos logs:

```yaml
# vector-splunk-deployment.yaml
apiVersion: v1
kind: Secret
metadata:
  name: splunk-hec-token
  namespace: logging
type: Opaque
data:
  token: <base64-encoded-HEC-token>
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: vector-splunk-config
  namespace: logging
data:
  vector.toml: |
    [sources.talos_logs]
    type = "socket"
    address = "0.0.0.0:5514"
    mode = "tcp"
    decoding.codec = "json"

    [transforms.prepare_for_splunk]
    type = "remap"
    inputs = ["talos_logs"]
    source = '''
      .service = del(."talos-service") ?? "unknown"
      .level = del(."talos-level") ?? "info"
      .source = "talos-linux"
    '''

    [sinks.splunk]
    type = "splunk_hec_logs"
    inputs = ["prepare_for_splunk"]
    endpoint = "https://splunk-hec.example.com:8088"
    default_token = "${SPLUNK_HEC_TOKEN}"
    index = "talos"
    source = "talos-linux"
    sourcetype = "_json"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vector-splunk
  namespace: logging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vector-splunk
  template:
    metadata:
      labels:
        app: vector-splunk
    spec:
      containers:
      - name: vector
        image: timberio/vector:latest-alpine
        ports:
        - containerPort: 5514
          protocol: TCP
        env:
        - name: SPLUNK_HEC_TOKEN
          valueFrom:
            secretKeyRef:
              name: splunk-hec-token
              key: token
        volumeMounts:
        - name: config
          mountPath: /etc/vector
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
      volumes:
      - name: config
        configMap:
          name: vector-splunk-config
---
apiVersion: v1
kind: Service
metadata:
  name: vector-splunk
  namespace: logging
spec:
  selector:
    app: vector-splunk
  ports:
  - port: 5514
    targetPort: 5514
    protocol: TCP
```

## Using Fluentd as an Alternative

If your organization prefers Fluentd, here is a configuration for forwarding to Splunk:

```xml
<!-- fluentd.conf -->
<source>
  @type tcp
  tag talos
  port 5514
  <parse>
    @type json
  </parse>
</source>

<filter talos>
  @type record_transformer
  <record>
    source talos-linux
    index talos
  </record>
</filter>

<match talos>
  @type splunk_hec
  hec_host splunk-hec.example.com
  hec_port 8088
  hec_token "#{ENV['SPLUNK_HEC_TOKEN']}"
  index talos
  source talos-linux
  sourcetype _json
  <buffer>
    @type memory
    flush_interval 5s
    chunk_limit_size 1m
    retry_max_interval 30s
  </buffer>
</match>
```

## Configuring Talos Linux

Point your Talos nodes at the Vector or Fluentd instance:

```yaml
# Machine configuration for Splunk integration
machine:
  logging:
    destinations:
      - endpoint: "tcp://vector-splunk.logging.svc:5514/"
        format: json_lines
```

Apply to all nodes:

```bash
#!/bin/bash
# setup-splunk-logging.sh

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"

for node in $NODES; do
  echo "Configuring Splunk log forwarding on $node..."
  talosctl patch machineconfig --nodes "$node" \
    --patch "[{
      \"op\": \"add\",
      \"path\": \"/machine/logging\",
      \"value\": {
        \"destinations\": [{
          \"endpoint\": \"tcp://vector-splunk.logging.svc:5514/\",
          \"format\": \"json_lines\"
        }]
      }
    }]"
done
```

## Searching Talos Logs in Splunk

Once logs are flowing into Splunk, use SPL (Search Processing Language) to analyze them:

```spl
# All Talos logs
index=talos source="talos-linux"

# Errors only
index=talos source="talos-linux" level="error"

# Logs from a specific service
index=talos source="talos-linux" service="etcd"

# Logs from a specific node
index=talos source="talos-linux" host="192.168.1.10"

# Error count by service over time
index=talos source="talos-linux" level="error"
| timechart count by service

# Top error messages
index=talos source="talos-linux" level="error"
| top msg limit=20

# Service restarts
index=talos source="talos-linux" "service started" OR "service stopped"
| timechart count by service

# etcd leader changes
index=talos source="talos-linux" service="etcd" "leader changed"
```

## Creating Splunk Dashboards

Build a comprehensive Talos Linux dashboard in Splunk:

### Log Volume Panel

```spl
index=talos source="talos-linux"
| timechart span=5m count by service
```

### Error Rate Panel

```spl
index=talos source="talos-linux" level="error"
| timechart span=5m count as errors
```

### Node Health Overview

```spl
index=talos source="talos-linux"
| stats latest(_time) as last_seen count by host
| eval status=if(now()-last_seen < 300, "active", "stale")
```

### Service Status Panel

```spl
index=talos source="talos-linux" "service" ("started" OR "stopped" OR "failed")
| table _time host service msg
| sort - _time
```

## Setting Up Splunk Alerts

Configure alerts for critical Talos events:

```spl
# Alert: High error rate
index=talos source="talos-linux" level="error"
| stats count as error_count by host
| where error_count > 50

# Alert: etcd errors
index=talos source="talos-linux" service="etcd" level="error"

# Alert: Service not reporting
index=talos source="talos-linux"
| stats latest(_time) as last_seen by host
| eval minutes_since_last = (now() - last_seen) / 60
| where minutes_since_last > 10

# Alert: Kubelet restarts
index=talos source="talos-linux" service="kubelet" "started"
| timechart span=1h count as restarts
| where restarts > 3
```

## Compliance and Security Use Cases

### Audit Trail

```spl
# Track all configuration changes
index=talos source="talos-linux" "config" ("applied" OR "changed" OR "updated")
| table _time host msg
```

### Security Monitoring

```spl
# Monitor for unusual activity
index=talos source="talos-linux" level="error" OR level="warning"
| stats count by service host level
| sort - count

# Detect potential security events
index=talos source="talos-linux" "unauthorized" OR "denied" OR "forbidden" OR "certificate"
| table _time host service msg
```

### Compliance Reporting

```spl
# Generate a compliance report showing log collection coverage
index=talos source="talos-linux"
| stats dc(host) as reporting_nodes earliest(_time) as first_log latest(_time) as last_log
| eval coverage_start=strftime(first_log, "%Y-%m-%d %H:%M")
| eval coverage_end=strftime(last_log, "%Y-%m-%d %H:%M")
```

## Managing Data Volume and Costs

Splunk licensing is based on data volume, so managing log volume is important:

```toml
# Vector configuration with filtering to reduce volume
[transforms.filter_noise]
type = "filter"
inputs = ["prepare_for_splunk"]
condition = '''
  # Drop debug-level logs
  .level != "debug" &&
  # Drop routine health check logs
  !contains(string!(.msg), "health check passed")
'''

[sinks.splunk]
type = "splunk_hec_logs"
inputs = ["filter_noise"]
# ... rest of config
```

You can also use Splunk's data model acceleration and summary indexing to reduce search costs on frequently queried data.

## Verifying the Pipeline

After setup, verify logs are arriving in Splunk:

```bash
# Generate test logs
talosctl service kubelet restart --nodes 192.168.1.20

# Check in Splunk (wait a few seconds)
# Run this search: index=talos source="talos-linux" earliest=-5m
```

You can also check the HEC health:

```bash
# Check HEC health endpoint
curl -k https://splunk-hec.example.com:8088/services/collector/health
```

## Best Practices

- Use Splunk HEC (HTTP Event Collector) for ingesting Talos logs rather than traditional syslog.
- Create a dedicated Splunk index for Talos logs to manage retention and access separately.
- Use Vector or Fluentd as a bridge between Talos and Splunk for reliable delivery and transformation.
- Filter out low-value logs before sending to Splunk to manage licensing costs.
- Create saved searches and dashboards for common troubleshooting scenarios.
- Set up alerts for critical events like etcd errors, service failures, and nodes going silent.
- Use Splunk RBAC to control who can access Talos infrastructure logs.
- Implement proper retention policies based on your compliance requirements.
- Monitor the HEC token health and the log collection pipeline itself.
- Tag logs with environment labels (production, staging, dev) for multi-cluster setups.

Forwarding Talos Linux logs to Splunk integrates your Kubernetes infrastructure into your organization's existing security and observability ecosystem. This gives your security, operations, and compliance teams the unified visibility they need.
