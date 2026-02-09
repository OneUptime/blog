# How to implement Vault audit logging on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, Audit Logging, Kubernetes, Compliance, Security Monitoring

Description: Learn how to configure comprehensive Vault audit logging in Kubernetes for security monitoring, compliance, and forensic analysis of secret access patterns.

---

Audit logs are critical for security compliance, incident investigation, and understanding secret access patterns. Vault's audit logging captures every request and response, providing a complete trail of who accessed what and when. This guide shows you how to implement production-grade audit logging for Vault on Kubernetes.

## Understanding Vault Audit Logs

Vault audit devices log every authenticated request and response before returning to the client. Multiple audit devices can run simultaneously, and Vault only responds after all enabled audit devices successfully log the event. This ensures no operation goes unaudited.

Audit logs contain request details including path, operation, parameters, and response data including success/failure status, returned values (secrets are hashed), and authentication information like token metadata and policies.

## Enabling File-Based Audit Logging

Configure file audit logging with persistence:

```bash
# Enable file audit device
kubectl -n vault exec -it vault-0 -- vault audit enable file \
  file_path=/vault/logs/audit.log \
  log_raw=false \
  mode=0600

# Verify audit device is enabled
kubectl -n vault exec vault-0 -- vault audit list
```

Configure persistent storage for audit logs:

```yaml
# vault-audit-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: vault-audit-logs
  namespace: vault
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: standard
```

Update Vault StatefulSet to mount audit volume:

```yaml
# In Helm values
server:
  auditStorage:
    enabled: true
    size: 50Gi
    storageClass: standard
    accessMode: ReadWriteOnce
```

## Understanding Audit Log Format

Examine audit log structure:

```bash
# View recent audit logs
kubectl -n vault exec vault-0 -- tail /vault/logs/audit.log | jq

# Example log entry
{
  "time": "2024-02-09T10:15:30.123456789Z",
  "type": "response",
  "auth": {
    "client_token": "hmac-sha256:abc123...",
    "accessor": "hmac-sha256:def456...",
    "display_name": "kubernetes-default-app-sa",
    "policies": ["default", "app-policy"],
    "token_policies": ["default", "app-policy"],
    "metadata": {
      "role": "app",
      "service_account_name": "app-sa",
      "service_account_namespace": "default"
    },
    "entity_id": "entity-uuid",
    "token_type": "service"
  },
  "request": {
    "id": "request-uuid",
    "operation": "read",
    "mount_type": "kv",
    "client_token": "hmac-sha256:abc123...",
    "client_token_accessor": "hmac-sha256:def456...",
    "namespace": {
      "id": "root"
    },
    "path": "secret/data/app/config",
    "remote_address": "10.244.1.5"
  },
  "response": {
    "mount_type": "kv",
    "data": {
      "data": {
        "api_key": "hmac-sha256:secret-hash",
        "database_url": "hmac-sha256:secret-hash"
      },
      "metadata": {
        "created_time": "2024-02-09T08:00:00Z",
        "version": 1
      }
    }
  }
}
```

## Configuring Syslog Audit Backend

Send audit logs to syslog for centralized logging:

```bash
# Enable syslog audit device
kubectl -n vault exec vault-0 -- vault audit enable syslog \
  tag="vault-audit" \
  facility="AUTH"

# Logs sent to local syslog daemon
# Configure syslog to forward to log aggregation system
```

## Streaming to Elasticsearch

Send audit logs to Elasticsearch using Fluentd:

```yaml
# fluentd-vault-audit.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-vault-audit
  namespace: vault
data:
  fluent.conf: |
    <source>
      @type tail
      path /vault/logs/audit.log
      pos_file /var/log/vault-audit.pos
      tag vault.audit
      <parse>
        @type json
        time_key time
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    <filter vault.audit>
      @type record_transformer
      <record>
        cluster_name "#{ENV['CLUSTER_NAME']}"
        namespace "#{ENV['VAULT_NAMESPACE']}"
      </record>
    </filter>

    <match vault.audit>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      logstash_format true
      logstash_prefix vault-audit
      include_tag_key true
      type_name audit_log
    </match>
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-vault-audit
  namespace: vault
spec:
  selector:
    matchLabels:
      app: fluentd-vault-audit
  template:
    metadata:
      labels:
        app: fluentd-vault-audit
    spec:
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch
        env:
        - name: CLUSTER_NAME
          value: "production"
        - name: VAULT_NAMESPACE
          value: "vault"
        volumeMounts:
        - name: vault-audit-logs
          mountPath: /vault/logs
          readOnly: true
        - name: fluentd-config
          mountPath: /fluentd/etc/fluent.conf
          subPath: fluent.conf
      volumes:
      - name: vault-audit-logs
        persistentVolumeClaim:
          claimName: vault-audit-logs
      - name: fluentd-config
        configMap:
          name: fluentd-vault-audit
```

## Analyzing Audit Logs

Query audit logs for insights:

```bash
# Find all failed authentication attempts
kubectl -n vault exec vault-0 -- cat /vault/logs/audit.log | \
  jq 'select(.error != null and .request.path | contains("auth")) |
      {time: .time, path: .request.path, error: .error, remote_address: .request.remote_address}'

# Track secret access by user
kubectl -n vault exec vault-0 -- cat /vault/logs/audit.log | \
  jq -r 'select(.request.operation == "read" and (.request.path | contains("secret"))) |
      "\(.time) \(.auth.display_name) \(.request.path)"' | \
  sort | uniq -c

# Find policy violations
kubectl -n vault exec vault-0 -- cat /vault/logs/audit.log | \
  jq 'select(.error | contains("permission denied")) |
      {time: .time, user: .auth.display_name, path: .request.path, policies: .auth.policies}'

# Count operations by type
kubectl -n vault exec vault-0 -- cat /vault/logs/audit.log | \
  jq -r '.request.operation' | sort | uniq -c | sort -rn

# Track database credential generation
kubectl -n vault exec vault-0 -- cat /vault/logs/audit.log | \
  jq 'select(.request.path | contains("database/creds")) |
      {time: .time, user: .auth.display_name, role: .request.path}'
```

## Creating Audit Analysis Tools

Build automated analysis scripts:

```python
#!/usr/bin/env python3
# analyze-vault-audit.py

import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta

def analyze_audit_logs(log_file):
    stats = {
        'total_requests': 0,
        'failed_requests': 0,
        'by_user': defaultdict(int),
        'by_path': defaultdict(int),
        'by_operation': defaultdict(int),
        'policy_violations': [],
    }

    with open(log_file) as f:
        for line in f:
            try:
                log = json.loads(line)

                if log.get('type') != 'response':
                    continue

                stats['total_requests'] += 1

                # Track by user
                user = log.get('auth', {}).get('display_name', 'unknown')
                stats['by_user'][user] += 1

                # Track by path
                path = log.get('request', {}).get('path', 'unknown')
                stats['by_path'][path] += 1

                # Track by operation
                operation = log.get('request', {}).get('operation', 'unknown')
                stats['by_operation'][operation] += 1

                # Track failures
                if log.get('error'):
                    stats['failed_requests'] += 1

                    if 'permission denied' in log['error']:
                        stats['policy_violations'].append({
                            'time': log['time'],
                            'user': user,
                            'path': path,
                            'policies': log.get('auth', {}).get('policies', [])
                        })

            except json.JSONDecodeError:
                continue

    # Print report
    print("=== Vault Audit Log Analysis ===\n")
    print(f"Total Requests: {stats['total_requests']}")
    print(f"Failed Requests: {stats['failed_requests']}")
    print(f"Success Rate: {(1 - stats['failed_requests']/stats['total_requests'])*100:.2f}%\n")

    print("Top 10 Users:")
    for user, count in sorted(stats['by_user'].items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {user}: {count}")

    print("\nTop 10 Paths:")
    for path, count in sorted(stats['by_path'].items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {path}: {count}")

    print("\nOperations:")
    for operation, count in sorted(stats['by_operation'].items(), key=lambda x: x[1], reverse=True):
        print(f"  {operation}: {count}")

    print(f"\nPolicy Violations: {len(stats['policy_violations'])}")
    for violation in stats['policy_violations'][:5]:
        print(f"  {violation['time']} - {violation['user']} tried to access {violation['path']}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: analyze-vault-audit.py <audit-log-file>")
        sys.exit(1)

    analyze_audit_logs(sys.argv[1])
```

## Implementing Log Rotation

Rotate audit logs to manage size:

```yaml
# vault-logrotate-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-logrotate
  namespace: vault
data:
  logrotate.conf: |
    /vault/logs/audit.log {
      daily
      rotate 30
      compress
      delaycompress
      missingok
      notifempty
      create 0600 vault vault
      postrotate
        killall -HUP vault || true
      endscript
    }
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vault-logrotate
  namespace: vault
spec:
  schedule: "0 0 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: logrotate
            image: alpine:latest
            command:
            - sh
            - -c
            - |
              apk add --no-cache logrotate
              logrotate /etc/logrotate.conf
            volumeMounts:
            - name: vault-audit-logs
              mountPath: /vault/logs
            - name: logrotate-config
              mountPath: /etc/logrotate.conf
              subPath: logrotate.conf
          volumes:
          - name: vault-audit-logs
            persistentVolumeClaim:
              claimName: vault-audit-logs
          - name: logrotate-config
            configMap:
              name: vault-logrotate
          restartPolicy: OnFailure
```

## Monitoring Audit Log Health

Create alerting for audit issues:

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: vault-audit-alerts
  namespace: vault
spec:
  groups:
  - name: vault-audit
    interval: 30s
    rules:
    - alert: VaultAuditLogsFull
      expr: kubelet_volume_stats_used_bytes{persistentvolumeclaim="vault-audit-logs"} /
            kubelet_volume_stats_capacity_bytes{persistentvolumeclaim="vault-audit-logs"} > 0.85
      annotations:
        summary: "Vault audit logs volume is 85% full"

    - alert: VaultAuditDeviceDown
      expr: vault_core_audit_enabled == 0
      annotations:
        summary: "No Vault audit devices are enabled"

    - alert: HighVaultAuthFailureRate
      expr: rate(vault_audit_failures_total[5m]) > 10
      annotations:
        summary: "High rate of Vault authentication failures"
```

## Compliance Reporting

Generate compliance reports from audit logs:

```bash
#!/bin/bash
# generate-compliance-report.sh

START_DATE=$1
END_DATE=$2
OUTPUT_FILE="vault-compliance-report-$(date +%Y%m%d).json"

kubectl -n vault exec vault-0 -- cat /vault/logs/audit.log | \
  jq --arg start "$START_DATE" --arg end "$END_DATE" '
    select(.time >= $start and .time <= $end) |
    {
      timestamp: .time,
      user: .auth.display_name,
      operation: .request.operation,
      path: .request.path,
      success: (if .error then false else true end),
      source_ip: .request.remote_address
    }
  ' > "$OUTPUT_FILE"

echo "Compliance report generated: $OUTPUT_FILE"

# Generate summary
jq -s '
  {
    report_period: {
      start: $start,
      end: $end
    },
    total_operations: length,
    successful_operations: [.[] | select(.success == true)] | length,
    failed_operations: [.[] | select(.success == false)] | length,
    unique_users: [.[].user] | unique | length,
    operations_by_type: group_by(.operation) | map({operation: .[0].operation, count: length})
  }
' --arg start "$START_DATE" --arg end "$END_DATE" "$OUTPUT_FILE"
```

Vault audit logging provides comprehensive visibility into secret access. By implementing persistent logging, automated analysis, and monitoring, you ensure compliance requirements are met while maintaining the ability to investigate security incidents. Regular review of audit logs helps identify unusual patterns and potential security issues before they become problems.
