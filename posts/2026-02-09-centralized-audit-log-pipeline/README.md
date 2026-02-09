# How to Build a Centralized Audit Log Pipeline for Kubernetes API Server Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Audit Logging

Description: Learn how to configure and deploy a centralized audit logging pipeline to capture, store, and analyze Kubernetes API server events for security and compliance.

---

Kubernetes audit logs provide a chronological record of all API server activities, including who performed what action, when, and what the outcome was. These logs are essential for security monitoring, compliance auditing, and troubleshooting. However, audit logs are verbose and require a dedicated pipeline to collect, store, and analyze them effectively.

This guide walks you through building a production-ready centralized audit log pipeline for Kubernetes that captures all API server events and makes them searchable for security teams.

## Understanding Kubernetes Audit Logging

Kubernetes audit logging captures requests at different stages of their lifecycle:

- **RequestReceived**: The audit handler received the request
- **ResponseStarted**: Response headers have been sent, but the body is not yet complete
- **ResponseComplete**: Response body has been completed
- **Panic**: Events generated when a panic occurs

Each audit event includes details about the request, the requesting user, the resource being accessed, and the result.

## Configuring API Server Audit Policy

The audit policy defines which events to log and at what level. Create a comprehensive audit policy:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
omitStages:
  - "RequestReceived"
rules:
  # Log all requests at Metadata level by default
  - level: Metadata
    omitStages:
      - "RequestReceived"

  # Don't log read-only requests to certain resources
  - level: None
    resources:
      - group: ""
        resources: ["events", "nodes/status", "pods/status"]
    verbs: ["get", "list", "watch"]

  # Log resource changes at Request level (includes request body)
  - level: Request
    verbs: ["create", "update", "patch", "delete"]
    resources:
      - group: ""
        resources: ["secrets", "configmaps", "serviceaccounts"]
      - group: "rbac.authorization.k8s.io"
        resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]

  # Log authentication/authorization at Metadata level
  - level: Metadata
    resources:
      - group: "authentication.k8s.io"
      - group: "authorization.k8s.io"

  # Log pod exec/attach at Metadata level
  - level: Metadata
    resources:
      - group: ""
        resources: ["pods/exec", "pods/attach", "pods/portforward"]

  # Log sensitive resource access at RequestResponse level
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["secrets"]
    verbs: ["get", "list"]

  # Log all administrative actions
  - level: Request
    userGroups: ["system:masters"]

  # Capture denied requests
  - level: Request
    omitStages:
      - "RequestReceived"
    users: ["system:anonymous"]

  # Default catch-all for everything else
  - level: Metadata
```

This policy balances comprehensive logging with performance considerations by excluding verbose read operations on less sensitive resources.

## Configuring API Server for Audit Logging

Enable audit logging on your API server by modifying the API server configuration. For kubeadm-based clusters, edit the API server manifest:

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
    # ... other flags ...
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
    - --audit-log-path=/var/log/kubernetes/audit/audit.log
    - --audit-log-maxage=30
    - --audit-log-maxbackup=10
    - --audit-log-maxsize=100
    - --audit-log-format=json
    volumeMounts:
    - mountPath: /etc/kubernetes/audit-policy.yaml
      name: audit-policy
      readOnly: true
    - mountPath: /var/log/kubernetes/audit
      name: audit-logs
  volumes:
  - hostPath:
      path: /etc/kubernetes/audit-policy.yaml
      type: File
    name: audit-policy
  - hostPath:
      path: /var/log/kubernetes/audit
      type: DirectoryOrCreate
    name: audit-logs
```

The API server will now write audit logs to `/var/log/kubernetes/audit/audit.log` on the control plane node.

## Deploying Fluent Bit to Collect Audit Logs

Deploy Fluent Bit on control plane nodes to collect and forward audit logs. Create a dedicated DaemonSet with node selectors:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-audit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush           5
        Daemon          off
        Log_Level       info
        Parsers_File    parsers.conf

    [INPUT]
        Name              tail
        Path              /var/log/kubernetes/audit/audit.log
        Parser            json
        Tag               audit.k8s
        Refresh_Interval  5
        Mem_Buf_Limit     50MB
        Skip_Long_Lines   Off

    [FILTER]
        Name         modify
        Match        audit.*
        Add          cluster ${CLUSTER_NAME}
        Add          source k8s-audit

    [FILTER]
        Name         nest
        Match        audit.*
        Operation    lift
        Nested_under kubernetes

    [OUTPUT]
        Name            loki
        Match           audit.*
        Host            loki.logging.svc.cluster.local
        Port            3100
        Labels          job=audit, cluster=${CLUSTER_NAME}
        Label_keys      $verb,$user['username'],$objectRef['resource'],$objectRef['namespace']
        RemoveKeys      annotations,managedFields

    [OUTPUT]
        Name            s3
        Match           audit.*
        Bucket          kubernetes-audit-logs
        Region          us-east-1
        S3_key_format   /audit-logs/${CLUSTER_NAME}/%Y/%m/%d/%H/%M/%S-$UUID.json
        Total_file_size 50M
        Upload_timeout  1m
        Store_dir       /var/log/fluent-bit-buffer
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit-audit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit-audit
  template:
    metadata:
      labels:
        app: fluent-bit-audit
    spec:
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      tolerations:
      - key: node-role.kubernetes.io/control-plane
        effect: NoSchedule
      serviceAccountName: fluent-bit
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.2
        env:
        - name: CLUSTER_NAME
          value: "production-cluster"
        volumeMounts:
        - name: audit-logs
          mountPath: /var/log/kubernetes/audit
          readOnly: true
        - name: fluent-bit-config
          mountPath: /fluent-bit/etc/
        - name: buffer
          mountPath: /var/log/fluent-bit-buffer
        resources:
          limits:
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 100Mi
      volumes:
      - name: audit-logs
        hostPath:
          path: /var/log/kubernetes/audit
      - name: fluent-bit-config
        configMap:
          name: fluent-bit-audit-config
      - name: buffer
        emptyDir: {}
```

## Setting Up Loki for Audit Log Storage

Configure Loki with appropriate retention for audit logs. Audit logs need longer retention than application logs for compliance:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: logging
data:
  loki.yaml: |
    auth_enabled: false

    server:
      http_listen_port: 3100

    ingester:
      lifecycler:
        ring:
          kvstore:
            store: inmemory
          replication_factor: 1
      chunk_idle_period: 15m
      chunk_retain_period: 30s

    schema_config:
      configs:
      - from: 2024-01-01
        store: boltdb-shipper
        object_store: s3
        schema: v11
        index:
          prefix: audit_index_
          period: 24h

    storage_config:
      boltdb_shipper:
        active_index_directory: /loki/index
        cache_location: /loki/cache
        shared_store: s3
      aws:
        s3: s3://us-east-1/kubernetes-audit-loki
        s3forcepathstyle: true

    limits_config:
      enforce_metric_name: false
      reject_old_samples: true
      reject_old_samples_max_age: 168h
      ingestion_rate_mb: 50
      ingestion_burst_size_mb: 100

    chunk_store_config:
      max_look_back_period: 2160h  # 90 days

    table_manager:
      retention_deletes_enabled: true
      retention_period: 2160h  # 90 days for audit logs

    compactor:
      working_directory: /loki/compactor
      shared_store: s3
      compaction_interval: 10m
```

## Creating Audit Log Alerts

Define alerts for security-sensitive events using Loki's ruler:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-audit-rules
  namespace: logging
data:
  audit-rules.yaml: |
    groups:
      - name: kubernetes-audit
        interval: 1m
        rules:
          # Alert on unauthorized API access attempts
          - alert: UnauthorizedAPIAccess
            expr: |
              sum(rate({job="audit"}
                | json
                | responseStatus_code >= 401
                | responseStatus_code < 500 [5m])) by (user_username, verb, objectRef_resource) > 0
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "Unauthorized API access detected"
              description: "User {{ $labels.user_username }} attempted unauthorized {{ $labels.verb }} on {{ $labels.objectRef_resource }}"

          # Alert on secret access
          - alert: SecretAccessed
            expr: |
              sum(count_over_time({job="audit"}
                | json
                | objectRef_resource="secrets"
                | verb=~"get|list" [5m])) by (user_username, objectRef_namespace, objectRef_name) > 0
            labels:
              severity: info
            annotations:
              summary: "Secret accessed"
              description: "User {{ $labels.user_username }} accessed secret {{ $labels.objectRef_name }} in namespace {{ $labels.objectRef_namespace }}"

          # Alert on RBAC changes
          - alert: RBACModification
            expr: |
              sum(count_over_time({job="audit"}
                | json
                | objectRef_resource=~"roles|rolebindings|clusterroles|clusterrolebindings"
                | verb=~"create|update|patch|delete" [5m])) by (user_username, verb, objectRef_resource, objectRef_name) > 0
            labels:
              severity: warning
            annotations:
              summary: "RBAC resource modified"
              description: "User {{ $labels.user_username }} performed {{ $labels.verb }} on {{ $labels.objectRef_resource }}/{{ $labels.objectRef_name }}"

          # Alert on exec into pods
          - alert: PodExecDetected
            expr: |
              sum(count_over_time({job="audit"}
                | json
                | objectRef_resource="pods"
                | objectRef_subresource="exec" [5m])) by (user_username, objectRef_namespace, objectRef_name) > 0
            labels:
              severity: info
            annotations:
              summary: "Pod exec executed"
              description: "User {{ $labels.user_username }} executed command in pod {{ $labels.objectRef_name }} in namespace {{ $labels.objectRef_namespace }}"

          # Alert on service account token creation
          - alert: ServiceAccountTokenCreated
            expr: |
              sum(count_over_time({job="audit"}
                | json
                | objectRef_resource="serviceaccounts"
                | objectRef_subresource="token"
                | verb="create" [5m])) by (user_username, objectRef_namespace, objectRef_name) > 0
            labels:
              severity: warning
            annotations:
              summary: "Service account token created"
              description: "User {{ $labels.user_username }} created token for service account {{ $labels.objectRef_name }} in namespace {{ $labels.objectRef_namespace }}"
```

## Building Audit Log Dashboards

Create Grafana dashboards to visualize audit activity:

```logql
# Top users by API calls
topk(10,
  sum by (user_username) (
    rate({job="audit"} | json [5m])
  )
)

# Failed authentication attempts
sum by (user_username) (
  rate({job="audit"}
    | json
    | responseStatus_code >= 401
    | responseStatus_code < 500 [5m])
)

# Resource creation/deletion trends
sum by (verb, objectRef_resource) (
  rate({job="audit"}
    | json
    | verb=~"create|delete" [5m])
)

# Namespace activity heatmap
sum by (objectRef_namespace) (
  count_over_time({job="audit"} | json [1h])
)
```

## Long-Term Audit Log Archival

For compliance, archive audit logs to object storage with lifecycle policies:

```yaml
# S3 lifecycle policy for audit logs
{
  "Rules": [
    {
      "Id": "audit-log-lifecycle",
      "Status": "Enabled",
      "Prefix": "audit-logs/",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 365,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 2555
      }
    }
  ]
}
```

## Querying Audit Logs for Investigations

Example queries for common security investigations:

```logql
# Find all actions by a specific user
{job="audit"} | json | user_username="suspicious-user"

# Find all secret accesses in production namespace
{job="audit"}
  | json
  | objectRef_resource="secrets"
  | objectRef_namespace="production"

# Find failed authorization attempts
{job="audit"}
  | json
  | responseStatus_code >= 401
  | responseStatus_code < 500

# Find all pod deletions in the last hour
{job="audit"}
  | json
  | objectRef_resource="pods"
  | verb="delete"
```

## Conclusion

A centralized audit log pipeline is critical for Kubernetes security and compliance. This pipeline captures all API server activity, stores it durably, and makes it searchable for security teams. Regular review of audit logs and alerts helps detect security incidents early and provides the evidence needed for compliance audits. Remember to balance audit verbosity with performance impact, and always test your audit policy before deploying to production.
