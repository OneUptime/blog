# How to Audit Talos API Access Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Audit Logging, Security, API, Kubernetes

Description: A practical guide to auditing Talos API access logs for security monitoring, compliance, and troubleshooting in your Kubernetes infrastructure.

---

Every interaction with a Talos Linux node goes through the Talos API. There is no SSH, no shell, no alternative path. This means that auditing the Talos API access logs gives you a complete picture of every administrative action taken on your nodes. This guide covers how to access, configure, and analyze these logs for security monitoring and compliance purposes.

## Understanding the Talos API

The Talos API is a gRPC-based interface that handles all node management operations. Every time you run a `talosctl` command, it translates into one or more gRPC calls to the Talos API server running on the target node. The API uses mutual TLS (mTLS) for authentication, which means both the client and server must present valid certificates.

Key operations that go through the API include:

- Configuration changes (apply-config)
- Node lifecycle operations (reboot, shutdown, upgrade, reset)
- Information retrieval (logs, dmesg, services, stats)
- Cluster management (etcd operations, bootstrap)
- File access (read operations)

## Accessing API Logs

Talos logs API access as part of its system logging. You can view these logs directly using talosctl:

```bash
# View the Talos API daemon logs (apid)
talosctl logs apid --nodes <node-ip>

# Follow the logs in real time
talosctl logs apid --nodes <node-ip> --follow

# View logs with timestamps
talosctl logs apid --nodes <node-ip> --tail 100
```

The API daemon (apid) logs each incoming request, including the method called, the source IP address, and the authentication result.

## Configuring Log Forwarding

For production environments, you want to ship these logs to a central logging system. Talos supports log forwarding through its machine configuration:

```yaml
# machine-config-logging.yaml
# Forward all system logs including API access logs
machine:
  logging:
    destinations:
      - endpoint: "udp://syslog.example.com:514"
        format: json_lines
      - endpoint: "tcp://logstash.example.com:5044"
        format: json_lines
```

Apply the logging configuration:

```bash
# Apply logging configuration to forward API logs
talosctl apply-config --nodes <node-ip> \
  --config-patch @machine-config-logging.yaml
```

For more sophisticated setups, you can deploy a log collector on the cluster that collects from each node:

```yaml
# fluentbit-daemonset.yaml
# Deploy Fluent Bit to collect and forward Talos logs
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      tolerations:
        - operator: Exists
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:latest
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
          env:
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
```

## Parsing API Access Logs

Talos API logs follow a structured format. Here is how to parse and analyze them:

```bash
# Extract API method calls from the logs
talosctl logs apid --nodes <node-ip> --tail 500 | \
  grep "method" | sort | uniq -c | sort -rn

# Look for configuration changes (high-security events)
talosctl logs apid --nodes <node-ip> | grep -i "applyconfig\|machineconfig"

# Find reboot and shutdown operations
talosctl logs apid --nodes <node-ip> | grep -i "reboot\|shutdown\|reset"

# Identify unique source IPs accessing the API
talosctl logs apid --nodes <node-ip> | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" | sort -u
```

## Building an Audit Dashboard

For ongoing monitoring, create a dashboard in your preferred observability tool. Here is an example using Prometheus and Grafana with the logs shipped through Loki:

```yaml
# promtail-config.yaml
# Configure Promtail to collect Talos API logs for Loki
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki.monitoring:3100/loki/api/v1/push

scrape_configs:
  - job_name: talos-api
    static_configs:
      - targets:
          - localhost
        labels:
          job: talos-api
          __path__: /var/log/apid.log
    pipeline_stages:
      - json:
          expressions:
            method: method
            caller: caller
            level: level
            timestamp: ts
      - labels:
          method:
          level:
```

In Grafana, create panels for:

1. **API calls per minute** - to detect unusual activity spikes
2. **Configuration changes over time** - to track who changed what and when
3. **Failed authentication attempts** - to detect potential attacks
4. **Unique callers per day** - to baseline normal admin activity

## Kubernetes API Audit Logging

In addition to Talos API logs, you should also configure Kubernetes API audit logging. This captures all interactions with the Kubernetes API server:

```yaml
# audit-policy.yaml
# Kubernetes API server audit policy
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all requests to the metadata level at minimum
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]
  # Log pod creation and deletion
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["pods"]
    verbs: ["create", "delete"]
  # Log all changes to RBAC
  - level: RequestResponse
    resources:
      - group: "rbac.authorization.k8s.io"
  # Default: log at metadata level
  - level: Metadata
```

Configure the audit policy in your Talos machine configuration:

```yaml
# machine-config-audit.yaml
# Enable Kubernetes API audit logging
cluster:
  apiServer:
    extraArgs:
      audit-policy-file: /etc/kubernetes/audit-policy.yaml
      audit-log-path: /var/log/kubernetes/audit.log
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
      audit-log-maxsize: "100"
    extraVolumes:
      - hostPath: /etc/kubernetes/audit-policy.yaml
        mountPath: /etc/kubernetes/audit-policy.yaml
        readOnly: true
      - hostPath: /var/log/kubernetes
        mountPath: /var/log/kubernetes
```

## Detecting Suspicious Activity

With your logs flowing, set up alerts for suspicious patterns:

```yaml
# alerting-rules.yaml
# Prometheus alerting rules for Talos API security events
groups:
  - name: talos-api-security
    rules:
      - alert: UnusualAPIActivity
        expr: |
          rate(talos_api_requests_total[5m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Unusual Talos API activity detected"

      - alert: ConfigChangeDetected
        expr: |
          increase(talos_api_config_changes_total[1h]) > 0
        labels:
          severity: info
        annotations:
          summary: "Talos configuration change detected"

      - alert: MultipleRebootsDetected
        expr: |
          increase(talos_api_reboots_total[1h]) > 2
        labels:
          severity: critical
        annotations:
          summary: "Multiple node reboots in short period"
```

## Correlating Talos API and Kubernetes Events

For a complete audit trail, correlate Talos API logs with Kubernetes events. When someone applies a new Talos configuration, it often results in node-level changes that appear as Kubernetes events:

```bash
# View Kubernetes events related to nodes
kubectl get events --field-selector involvedObject.kind=Node --sort-by=.lastTimestamp

# Correlate with Talos API logs around the same time
talosctl logs apid --nodes <node-ip> --since "2024-01-15T10:00:00Z"
```

## Access Control for the Talos API

Part of a good audit strategy is having well-defined access control. Talos supports role-based access through its certificate system:

```bash
# Generate a talosconfig with limited permissions
talosctl gen config my-cluster https://endpoint:6443 \
  --roles os:reader

# The roles determine what API methods are available:
# os:admin   - Full access to all Talos API methods
# os:reader  - Read-only access (logs, status, etc.)
# os:etcd:backup - Access to etcd backup operations
```

By generating separate configurations for different teams or automation systems, you can track who performed what actions by examining which certificate was used for each API call.

## Retention and Compliance

For compliance purposes, you need to define and implement a log retention policy:

```yaml
# elasticsearch-ilm-policy.json
# Index lifecycle management for Talos audit logs
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50gb",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

Many compliance frameworks require specific retention periods:
- **SOC 2** - Typically 1 year
- **PCI DSS** - 1 year, with 3 months immediately available
- **HIPAA** - 6 years
- **GDPR** - As long as necessary for the stated purpose

## Conclusion

Auditing Talos API access logs is straightforward because the API is the only management interface. Every administrative action goes through a single, authenticated, logged channel. By forwarding these logs to a central system, setting up alerting for suspicious patterns, and combining Talos API logs with Kubernetes audit logs, you build a comprehensive audit trail that satisfies compliance requirements and helps you detect security incidents early. The key is to set up this logging infrastructure from day one rather than trying to add it after an incident.
