# How to Configure Audit Logging for Compliance in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security, Audit, Compliance

Description: Learn how to configure comprehensive audit logging in Rancher to meet compliance requirements and track all API activity.

Audit logging captures a detailed record of all API requests to your Kubernetes clusters and the Rancher management server. This data is essential for compliance with standards like SOC 2, PCI DSS, HIPAA, and ISO 27001. This guide covers configuring audit logs at both the Rancher and cluster levels.

## Prerequisites

- Rancher Manager v2.13 or later for the Rancher server examples below
- Admin access to Rancher
- kubectl access with cluster admin privileges
- A log aggregation system (EFK, Loki, Splunk, or similar)

## Step 1: Enable Rancher Server Audit Logging

Rancher has built-in audit logging for its own API. Enable it during installation or upgrade:

```bash
helm upgrade rancher rancher-latest/rancher \
  -n cattle-system \
  --set auditLog.enabled=true \
  --set auditLog.level=2 \
  --set auditLog.destination=sidecar
```

### Audit Log Levels

- **Level 0**: Log request and response metadata only.
- **Level 1**: Log metadata plus request and response headers.
- **Level 2**: Log metadata, headers, and request body.
- **Level 3**: Log metadata, headers, request body, and response body.

For compliance, level 2 is typically sufficient. Level 3 provides the most detail but generates significantly more data.

### Log Destinations

- **sidecar**: Logs go to a sidecar container that can be scraped by your log collector.
- **hostPath**: Logs are written to a path on the host node.

Rotation settings such as `maxAge`, `maxBackup`, and `maxSize` only apply when `auditLog.destination=hostPath`.

## Step 2: Access Rancher Audit Logs

### Sidecar Destination

View logs from the sidecar container:

```bash
kubectl -n cattle-system logs -f <rancher-pod-name> rancher-audit-log
```

### Host Path Destination

If using hostPath, configure the path:

```bash
helm upgrade rancher rancher-latest/rancher \
  -n cattle-system \
  --set auditLog.enabled=true \
  --set auditLog.level=2 \
  --set auditLog.destination=hostPath \
  --set auditLog.hostPath=/var/log/rancher/audit \
  --set auditLog.maxAge=30 \
  --set auditLog.maxBackup=10 \
  --set auditLog.maxSize=100
```

Access logs on the node:

```bash
ls -la /var/log/rancher/audit/
cat /var/log/rancher/audit/rancher-api-audit.log | jq .
```

## Step 3: Configure Kubernetes API Audit Logging

Configure audit logging on the Kubernetes API server for downstream clusters.

### Create an Audit Policy

Save as `audit-policy.yaml`:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log authentication review events at Metadata level (avoid logging bearer tokens)
  - level: Metadata
    resources:
    - group: "authentication.k8s.io"
      resources: ["tokenreviews"]

  # Log authorization events
  - level: Metadata
    resources:
    - group: "authorization.k8s.io"
      resources: ["subjectaccessreviews"]

  # Log secret access at Metadata level (avoid logging secret data)
  - level: Metadata
    resources:
    - group: ""
      resources: ["secrets"]

  # Log all write operations on core resources
  - level: RequestResponse
    verbs: ["create", "update", "patch", "delete"]
    resources:
    - group: ""
      resources: ["pods", "services", "configmaps", "namespaces", "serviceaccounts"]
    - group: "apps"
      resources: ["deployments", "statefulsets", "daemonsets"]
    - group: "rbac.authorization.k8s.io"
      resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]

  # Log Rancher-specific resources
  - level: Metadata
    resources:
    - group: "management.cattle.io"
    - group: "provisioning.cattle.io"

  # Catch-all: log metadata for everything else
  - level: Metadata
    omitStages:
    - RequestReceived
```

### Apply to RKE2 Clusters

For Rancher-provisioned RKE2 clusters, edit the cluster YAML in Rancher and set `audit-policy-file` in `machineGlobalConfig`:

```yaml
apiVersion: provisioning.cattle.io/v1
kind: Cluster
spec:
  rkeConfig:
    machineGlobalConfig:
      audit-policy-file: |
        apiVersion: audit.k8s.io/v1
        kind: Policy
        rules:
          - level: Metadata
            resources:
            - group: "authentication.k8s.io"
              resources: ["tokenreviews"]
          - level: Metadata
            resources:
            - group: "authorization.k8s.io"
              resources: ["subjectaccessreviews"]
          - level: Metadata
            resources:
            - group: ""
              resources: ["secrets"]
          - level: RequestResponse
            verbs: ["create", "update", "patch", "delete"]
            resources:
            - group: ""
              resources: ["pods", "services", "configmaps", "namespaces", "serviceaccounts"]
            - group: "apps"
              resources: ["deployments", "statefulsets", "daemonsets"]
            - group: "rbac.authorization.k8s.io"
              resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
          - level: Metadata
            resources:
            - group: "management.cattle.io"
            - group: "provisioning.cattle.io"
          - level: Metadata
            omitStages:
            - RequestReceived
```

Save the cluster YAML and let Rancher roll out the updated RKE2 server configuration.

### Apply to Legacy RKE1 Clusters via Rancher

If you still manage an RKE1 cluster, edit the cluster YAML in Rancher:

```yaml
rancher_kubernetes_engine_config:
  services:
    kube_api:
      audit_log:
        enabled: true
        configuration:
          max_age: 30
          max_backup: 10
          max_size: 100
          path: /var/log/kube-audit/audit-log.json
          format: json
          policy:
            apiVersion: audit.k8s.io/v1
            kind: Policy
            rules:
            - level: Metadata
              resources:
              - group: ""
                resources: ["secrets"]
            - level: RequestResponse
              verbs: ["create", "update", "patch", "delete"]
```

## Step 4: Ship Audit Logs to a Central System

### Using Fluentd

Deploy Fluentd to collect and forward audit logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: logging
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/lib/rancher/rke2/server/logs/audit.log
      pos_file /var/log/fluentd/audit.pos
      tag kubernetes.audit
      <parse>
        @type json
      </parse>
    </source>

    <match kubernetes.audit>
      @type elasticsearch
      host elasticsearch.logging.svc
      port 9200
      index_name kubernetes-audit
    </match>
```

### Using Rancher Logging

Rancher includes a built-in logging app:

1. Navigate to the cluster.
2. Go to **Apps**.
3. Install **Rancher Logging** (based on the Logging Operator).
4. Configure a ClusterOutput:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: audit-elasticsearch
  namespace: cattle-logging-system
spec:
  elasticsearch:
    host: elasticsearch.logging.svc
    port: 9200
    scheme: http
    index_name: rancher-audit
```

5. If Rancher server audit logs are going to the sidecar container, create a ClusterFlow to route them:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: audit-flow
  namespace: cattle-logging-system
spec:
  match:
  - select:
      namespaces:
      - cattle-system
      container_names:
      - rancher-audit-log
  globalOutputRefs:
  - audit-elasticsearch
```

## Step 5: Set Up Compliance Dashboards

Create Grafana dashboards for audit log analysis:

Key panels to include:
- API requests by user over time
- Failed authentication attempts
- Resource modifications (create/update/delete) by user
- Access to secrets and sensitive resources
- Requests from unknown or unauthorized sources
- Geographic distribution of API access (if applicable)

## Step 6: Configure Alerts for Suspicious Activity

The kube-apiserver exposes request metrics that can be used for basic alerting:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: audit-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: audit-security
    rules:
    - alert: ExcessiveUnauthorizedRequests
      expr: |
        sum(increase(apiserver_request_total{
          code=~"401|403"
        }[5m])) > 10
      labels:
        severity: warning
      annotations:
        summary: "More than 10 unauthorized or forbidden API requests in 5 minutes"
    - alert: SecretAccessSpike
      expr: |
        sum(increase(apiserver_request_total{
          resource="secrets"
        }[5m])) > 50
      labels:
        severity: warning
      annotations:
        summary: "Unusual volume of Secret API requests detected"
```

## Step 7: Implement Log Retention Policies

Define retention with your compliance team based on the standards that apply to you:

| Standard | Retention Guidance |
|----------|--------------------|
| SOC 2 | Defined by your control set and auditor |
| PCI DSS | At least 1 year, with 3 months immediately available |
| HIPAA | Based on state law and HIPAA documentation requirements |
| ISO 27001 | Defined by your ISMS and organization |

Configure retention in your log storage system:

```bash
# Elasticsearch ILM policy
curl -X PUT "http://elasticsearch:9200/_ilm/policy/audit-retention" \
  -H 'Content-Type: application/json' \
  -d '{
    "policy": {
      "phases": {
        "hot": {"actions": {"rollover": {"max_size": "50gb", "max_age": "30d"}}},
        "warm": {"min_age": "30d", "actions": {"forcemerge": {"max_num_segments": 1}}},
        "delete": {"min_age": "365d", "actions": {"delete": {}}}
      }
    }
  }'
```

## Step 8: Generate Compliance Reports

Create scripts to generate compliance reports from audit data:

```bash
#!/bin/bash
# Generate a compliance report for the last 30 days

echo "=== Compliance Audit Report ==="
echo "Period: $(date -d '30 days ago' +%Y-%m-%d) to $(date +%Y-%m-%d)"
echo ""

echo "=== User Activity Summary ==="
curl -s "http://elasticsearch:9200/kubernetes-audit/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "size": 0,
    "query": {"range": {"stageTimestamp": {"gte": "now-30d"}}},
    "aggs": {"users": {"terms": {"field": "user.username.keyword", "size": 100}}}
  }' | jq '.aggregations.users.buckets[] | "\(.key): \(.doc_count) events"'

echo ""
echo "=== Resource Modifications ==="
curl -s "http://elasticsearch:9200/kubernetes-audit/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "size": 0,
    "query": {
      "bool": {
        "must": [
          {"range": {"stageTimestamp": {"gte": "now-30d"}}},
          {"terms": {"verb.keyword": ["create", "update", "patch", "delete"]}}
        ]
      }
    },
    "aggs": {"resources": {"terms": {"field": "objectRef.resource.keyword", "size": 50}}}
  }' | jq '.aggregations.resources.buckets[] | "\(.key): \(.doc_count) modifications"'
```

## Conclusion

Comprehensive audit logging is a requirement for compliance and a critical security control for Rancher-managed Kubernetes environments. By enabling audit logging at both the Rancher server and Kubernetes API levels, shipping logs to a central system, and setting up dashboards and alerts, you create full visibility into who is doing what across your infrastructure. Match your log retention to your compliance requirements and generate regular reports to demonstrate ongoing compliance.
