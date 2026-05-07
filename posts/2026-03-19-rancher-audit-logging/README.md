# How to Set Up Audit Logging in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging, Audit Logging

Description: Configure Kubernetes API server audit logging in Rancher for security compliance, access tracking, and forensic analysis.

Audit logging records all requests made to the Kubernetes API server, providing a chronological record of activities in your cluster. This is essential for security compliance, access tracking, and forensic analysis. This guide covers configuring audit logging at both the Kubernetes and Rancher levels.

## Prerequisites

- Rancher v2.6 or later.
- Cluster admin permissions.
- Understanding of Kubernetes API server configuration (for downstream cluster audit logging).

## Understanding Audit Log Levels

Kubernetes supports four audit levels:

- **None**: Do not log this event.
- **Metadata**: Log request metadata (user, timestamp, resource, verb) but not request or response bodies.
- **Request**: Log metadata and request body but not response body.
- **RequestResponse**: Log metadata, request body, and response body.

Higher levels capture more data but generate significantly more log volume.

## Step 1: Configure Rancher Server Audit Logging

Rancher itself generates audit logs for all API operations through the Rancher management server.

### Enable Rancher Audit Logging

When installing or upgrading Rancher via Helm, enable audit logging:

```bash
helm upgrade rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set auditLog.enabled=true \
  --set auditLog.level=2 \
  --set auditLog.destination=hostPath \
  --set auditLog.hostPath=/var/log/rancher/audit \
  --set auditLog.maxAge=30 \
  --set auditLog.maxBackup=10 \
  --set auditLog.maxSize=100
```

Audit log levels for Rancher:
- **0**: Log request and response metadata.
- **1**: Log metadata plus request and response headers.
- **2**: Log metadata, headers, and request body.
- **3**: Log metadata, headers, request body, and response body.

### Configure Audit Log Output

Send audit logs to a sidecar container:

```bash
helm upgrade rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set auditLog.enabled=true \
  --set auditLog.level=2 \
  --set auditLog.destination=sidecar
```

This runs a sidecar container that outputs audit logs to stdout, which can be collected by the logging stack.

## Step 2: Configure Kubernetes API Server Audit Logging

### For RKE Clusters

RKE1 reached end of life on July 31, 2025, and Rancher 2.12 and later no longer support provisioning or managing downstream RKE1 clusters, so this configuration only applies to older Rancher environments with existing RKE1 clusters.

Edit the cluster configuration in Rancher to enable API server audit logging:

```yaml
services:
  kube-api:
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
            # Log authentication events at RequestResponse level
            - level: RequestResponse
              resources:
                - group: "authentication.k8s.io"
                  resources: ["tokenreviews"]

            # Log authorization events
            - level: RequestResponse
              resources:
                - group: "authorization.k8s.io"
                  resources: ["subjectaccessreviews"]

            # Log changes to core resources
            - level: Request
              verbs: ["create", "update", "patch", "delete"]
              resources:
                - group: ""
                  resources: ["pods", "services", "configmaps", "secrets", "serviceaccounts"]
                - group: "apps"
                  resources: ["deployments", "statefulsets", "daemonsets"]
                - group: "rbac.authorization.k8s.io"
                  resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]

            # Log all changes to namespaces
            - level: RequestResponse
              verbs: ["create", "delete"]
              resources:
                - group: ""
                  resources: ["namespaces"]

            # Skip logging for health checks and system endpoints
            - level: None
              nonResourceURLs:
                - /healthz*
                - /readyz*
                - /livez*
                - /version
                - /swagger*

            # Log read-only access at metadata level
            - level: Metadata
              verbs: ["get", "list", "watch"]
```

### For RKE2 Clusters

In Rancher-provisioned RKE2 clusters, set the audit policy in the cluster spec with `machineSelectorConfig` so the policy is delivered only to control plane nodes:

```yaml
apiVersion: provisioning.cattle.io/v1
kind: Cluster
spec:
  rkeConfig:
    machineSelectorConfig:
      - config:
          audit-policy-file: |
            apiVersion: audit.k8s.io/v1
            kind: Policy
            rules:
              - level: RequestResponse
                resources:
                  - group: ""
                    resources: ["secrets", "configmaps"]
                verbs: ["create", "update", "patch", "delete"]

              - level: Request
                resources:
                  - group: "apps"
                    resources: ["deployments", "statefulsets", "daemonsets"]
                  - group: "batch"
                    resources: ["jobs", "cronjobs"]
                verbs: ["create", "update", "patch", "delete"]

              - level: Metadata
                resources:
                  - group: ""
                    resources: ["pods", "services"]

              - level: None
                users: ["system:kube-proxy"]

              - level: None
                nonResourceURLs:
                  - /healthz*
                  - /readyz*
        machineLabelSelector:
          matchLabels:
            rke.cattle.io/control-plane-role: 'true'
```

RKE2 already sets the audit log path and rotation arguments by default. If you need a custom policy file location or a custom audit log path, use `machineSelectorFiles` and `machineGlobalConfig` to pass the required `kube-apiserver-arg` values.

## Step 3: Collect Audit Logs with the Logging Stack

### Create a ClusterOutput for Audit Logs

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: audit-log-output
  namespace: cattle-logging-system
spec:
  elasticsearch:
    host: elasticsearch.logging.svc.cluster.local
    port: 9200
    scheme: https
    user: elastic
    password:
      valueFrom:
        secretKeyRef:
          name: es-credentials
          key: password
    index_name: kubernetes-audit
    buffer:
      type: file
      path: /buffers/audit
      chunk_limit_size: 8MB
      flush_interval: 5s
      retry_forever: true
```

### Create a ClusterFlow for Audit Logs

For file-based Kubernetes audit logs, first expose the audit log file through a `HostTailer`, then route that stream with a `ClusterFlow`. Set the `path` to the audit log path configured on your cluster, such as `/var/log/kube-audit/audit-log.json` on RKE or `/var/lib/rancher/rke2/server/logs/audit.log` on RKE2.

```yaml
apiVersion: logging-extensions.banzaicloud.io/v1alpha1
kind: HostTailer
metadata:
  name: kube-audit-hosttailer
  namespace: cattle-logging-system
spec:
  fileTailers:
    - name: kube-audit
      path: /var/log/kube-audit/audit-log.json
      disabled: false
---
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: audit-logs
  namespace: cattle-logging-system
spec:
  match:
    - select:
        labels:
          app.kubernetes.io/name: kube-audit-hosttailer
        container_names:
          - kube-audit
  filters:
    - parser:
        parse:
          type: json
        key_name: log
        reserve_data: true
        remove_key_name_field: true

    - record_transformer:
        records:
          - log_type: "audit"
            cluster: "production"

  globalOutputRefs:
    - audit-log-output
```

## Step 4: Configure Rancher Audit Log Collection

If using the sidecar audit log destination, collect Rancher audit logs:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: rancher-audit-logs
  namespace: cattle-logging-system
spec:
  match:
    - select:
        namespaces:
          - cattle-system
        labels:
          app: rancher
        container_names:
          - rancher-audit-log
  globalOutputRefs:
    - audit-log-output
```

## Step 5: Create Audit Log Alerts

Use API server request metrics to alert on suspicious activity and correlate it with your audit logs:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: audit-alerts
  namespace: cattle-monitoring-system
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: audit-security-alerts
      rules:
        - alert: UnauthorizedAPIAccess
          expr: |
            sum(increase(apiserver_request_total{code=~"401|403"}[5m])) > 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Multiple unauthorized API access attempts detected"
            description: "{{ $value }} unauthorized API requests in the last 5 minutes."

        - alert: SecretAccessAnomaly
          expr: |
            sum(increase(apiserver_request_total{resource="secrets"}[5m])) > 100
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Unusual secret access pattern detected"
```

## Step 6: Query Audit Logs

Example queries for audit log analysis:

### Find All Secret Access Events

```json
{
  "query": {
    "bool": {
      "must": [
        {"match": {"objectRef.resource": "secrets"}},
        {"range": {"@timestamp": {"gte": "now-24h"}}}
      ]
    }
  }
}
```

### Find Failed Authentication Attempts

```json
{
  "query": {
    "bool": {
      "must": [
        {"match": {"responseStatus.code": 401}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  }
}
```

### Find Cluster Role Binding Changes

```json
{
  "query": {
    "bool": {
      "must": [
        {"match": {"objectRef.resource": "clusterrolebindings"}},
        {"terms": {"verb": ["create", "update", "delete"]}}
      ]
    }
  }
}
```

## Step 7: Audit Log Retention

Configure separate retention for audit logs since they often have compliance requirements:

- Security compliance may require 1-7 years of audit log retention.
- Store audit logs in a separate index with different retention policies.
- Consider archiving audit logs to cold storage (S3, GCS) for long-term retention.

## Summary

Audit logging in Rancher captures all API server activities for security compliance and forensic analysis. Configure audit policies to balance detail level with storage costs, collect audit logs through the logging stack with a dedicated output, and set up alerts for suspicious activities. Maintain separate retention policies for audit logs to meet compliance requirements.
