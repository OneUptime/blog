# How to Set Up Kubernetes Audit Logging with Structured Output for Production Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Audit Logging, Compliance, Security

Description: Configure comprehensive Kubernetes audit logging with structured output that meets compliance requirements, enabling security investigations and regulatory audits through detailed API activity tracking.

---

Kubernetes audit logs record every API request made to the cluster, providing the visibility needed for security investigations, compliance audits, and understanding who changed what and when. Without proper audit logging, you lack the evidence needed to investigate security incidents or demonstrate compliance with regulations like SOC 2, HIPAA, or PCI DSS.

The challenge is configuring audit policies that capture relevant events without overwhelming storage and analysis systems with excessive logs. A well-designed audit policy records security-relevant events in structured formats that enable efficient analysis while filtering noise that provides little value.

Implementing effective audit logging requires defining what to log, configuring structured output formats, integrating with log aggregation systems, and establishing retention policies that meet compliance requirements.

## Understanding Kubernetes Audit Levels

Kubernetes provides four audit levels that control how much information gets logged:

- None: Do not log this event
- Metadata: Log request metadata (user, timestamp, resource) but not request or response bodies
- Request: Log metadata and request body but not response body
- RequestResponse: Log metadata, request body, and response body

Configure audit policy to apply appropriate levels to different resource types:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log all authentication events with full details
- level: RequestResponse
  verbs: ["create"]
  resources:
  - group: ""
    resources: ["serviceaccounts/token"]

# Log secret access at metadata level (avoid logging secret values)
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets"]

# Log pod creation and deletion with request details
- level: Request
  verbs: ["create", "update", "delete"]
  resources:
  - group: ""
    resources: ["pods"]

# Log RBAC changes with full details
- level: RequestResponse
  verbs: ["create", "update", "patch", "delete"]
  resources:
  - group: "rbac.authorization.k8s.io"
    resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]

# Don't log read-only URLs
- level: None
  nonResourceURLs:
  - "/healthz*"
  - "/version"
  - "/swagger*"

# Don't log watch events (too verbose)
- level: None
  verbs: ["watch"]

# Log everything else at metadata level
- level: Metadata
```

This policy captures security-relevant events while avoiding excessive logging of routine operations.

## Configuring Structured JSON Output

Configure audit logging to output structured JSON for easy parsing and analysis:

Create audit policy file on control plane nodes:

```bash
# /etc/kubernetes/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
omitStages:
  - "RequestReceived"
rules:
- level: RequestResponse
  verbs: ["create", "update", "patch", "delete"]
  resources:
  - group: ""
    resources: ["configmaps", "secrets"]
  - group: "apps"
    resources: ["deployments", "statefulsets", "daemonsets"]
  - group: "rbac.authorization.k8s.io"
    resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]

- level: Metadata
  omitStages:
  - "RequestReceived"
```

Configure kube-apiserver to use the policy:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
    - --audit-log-path=/var/log/kubernetes/audit.log
    - --audit-log-format=json
    - --audit-log-maxage=30
    - --audit-log-maxbackup=10
    - --audit-log-maxsize=100
    volumeMounts:
    - name: audit-policy
      mountPath: /etc/kubernetes/audit-policy.yaml
      readOnly: true
    - name: audit-logs
      mountPath: /var/log/kubernetes
  volumes:
  - name: audit-policy
    hostPath:
      path: /etc/kubernetes/audit-policy.yaml
      type: File
  - name: audit-logs
    hostPath:
      path: /var/log/kubernetes
      type: DirectoryOrCreate
```

## Forwarding Audit Logs to Centralized Systems

Send audit logs to centralized logging systems for analysis and long-term retention:

Using Fluentd to forward logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: kube-system
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/kubernetes/audit.log
      pos_file /var/log/kubernetes/audit.log.pos
      tag kubernetes.audit
      <parse>
        @type json
        time_key timestamp
        time_format %Y-%m-%dT%H:%M:%S.%N%:z
      </parse>
    </source>

    <filter kubernetes.audit>
      @type record_transformer
      <record>
        cluster_name "#{ENV['CLUSTER_NAME']}"
        environment "#{ENV['ENVIRONMENT']}"
      </record>
    </filter>

    <match kubernetes.audit>
      @type elasticsearch
      host elasticsearch.monitoring.svc.cluster.local
      port 9200
      logstash_format true
      logstash_prefix kubernetes-audit
      include_tag_key true
      tag_key @log_name
      <buffer>
        @type file
        path /var/log/fluentd-buffer/kubernetes-audit
        flush_interval 10s
        retry_max_interval 30
        flush_thread_count 2
      </buffer>
    </match>
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-audit
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: fluentd-audit
  template:
    metadata:
      labels:
        app: fluentd-audit
    spec:
      serviceAccountName: fluentd
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch
        env:
        - name: CLUSTER_NAME
          value: "production-cluster"
        - name: ENVIRONMENT
          value: "production"
        volumeMounts:
        - name: audit-logs
          mountPath: /var/log/kubernetes
        - name: fluentd-config
          mountPath: /fluentd/etc/fluent.conf
          subPath: fluent.conf
      volumes:
      - name: audit-logs
        hostPath:
          path: /var/log/kubernetes
      - name: fluentd-config
        configMap:
          name: fluentd-config
```

## Analyzing Audit Logs for Security Events

Query audit logs to investigate security events:

```bash
# Find all failed authentication attempts
kubectl logs -n kube-system kube-apiserver-xxx | \
  jq 'select(.verb=="create" and .responseStatus.code==401)'

# Find all secret access
kubectl logs -n kube-system kube-apiserver-xxx | \
  jq 'select(.objectRef.resource=="secrets")'

# Find unauthorized access attempts
kubectl logs -n kube-system kube-apiserver-xxx | \
  jq 'select(.responseStatus.code==403)'

# Find RBAC changes
kubectl logs -n kube-system kube-apiserver-xxx | \
  jq 'select(.objectRef.apiGroup=="rbac.authorization.k8s.io")'
```

Using Elasticsearch for analysis:

```json
{
  "query": {
    "bool": {
      "must": [
        { "term": { "verb": "delete" }},
        { "term": { "objectRef.resource": "pods" }},
        { "range": { "@timestamp": { "gte": "now-1h" }}}
      ]
    }
  }
}
```

## Creating Compliance Reports

Generate reports for compliance audits:

```bash
#!/bin/bash
# generate-compliance-report.sh

START_DATE=$1
END_DATE=$2

echo "Kubernetes Audit Report: $START_DATE to $END_DATE"
echo "================================================"

# Count total API requests
echo "Total API Requests:"
kubectl logs -n kube-system kube-apiserver-xxx --since-time=$START_DATE | \
  jq -s 'length'

# Failed authentication attempts
echo "Failed Authentications:"
kubectl logs -n kube-system kube-apiserver-xxx --since-time=$START_DATE | \
  jq 'select(.responseStatus.code==401)' | jq -s 'length'

# Unauthorized access attempts
echo "Unauthorized Access Attempts:"
kubectl logs -n kube-system kube-apiserver-xxx --since-time=$START_DATE | \
  jq 'select(.responseStatus.code==403)' | jq -s 'length'

# RBAC changes
echo "RBAC Modifications:"
kubectl logs -n kube-system kube-apiserver-xxx --since-time=$START_DATE | \
  jq 'select(.objectRef.apiGroup=="rbac.authorization.k8s.io")' | \
  jq -s 'group_by(.verb) | map({verb: .[0].verb, count: length})'

# Secret access
echo "Secret Access Events:"
kubectl logs -n kube-system kube-apiserver-xxx --since-time=$START_DATE | \
  jq 'select(.objectRef.resource=="secrets")' | jq -s 'length'
```

## Monitoring Audit Log Health

Ensure audit logging remains functional:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
data:
  audit-alerts.yaml: |
    groups:
    - name: audit-logging
      rules:
      - alert: AuditLogNotWriting
        expr: |
          time() - kube_audit_log_last_write_timestamp_seconds > 300
        labels:
          severity: critical
        annotations:
          summary: "Audit logs have not been written for 5 minutes"

      - alert: AuditLogDiskFull
        expr: |
          node_filesystem_avail_bytes{mountpoint="/var/log/kubernetes"} /
          node_filesystem_size_bytes{mountpoint="/var/log/kubernetes"} < 0.1
        labels:
          severity: warning
        annotations:
          summary: "Audit log disk usage >90%"
```

Kubernetes audit logging provides the visibility required for security operations and compliance. By configuring comprehensive audit policies, outputting structured logs, forwarding to centralized systems, and implementing retention policies, you build the audit trail needed to investigate incidents and demonstrate compliance with regulatory requirements.
