# How to Collect Kubernetes Logs with Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Kubernetes, Log Collection, Promtail, Pod Logs, Cloud Native, Observability

Description: A comprehensive guide to collecting Kubernetes logs with Grafana Loki, covering pod logs, system logs, audit logs, and event collection with production-ready configurations.

---

Kubernetes generates logs from multiple sources including container applications, system components, and audit systems. Grafana Loki provides an efficient solution for aggregating and querying these logs. This guide covers comprehensive Kubernetes log collection strategies using Loki.

## Prerequisites

Before starting, ensure you have:

- Kubernetes cluster (1.21+) running
- Helm 3.x installed
- kubectl configured with cluster access
- Basic understanding of Kubernetes logging architecture

## Understanding Kubernetes Log Sources

### Log Types in Kubernetes

| Log Type | Source | Location | Use Case |
|----------|--------|----------|----------|
| Container Logs | Application output | /var/log/containers/ | Application debugging |
| Pod Logs | kubectl logs | Container runtime | Real-time debugging |
| Node Logs | kubelet, container runtime | /var/log/ | System issues |
| Control Plane Logs | API server, scheduler | /var/log/ or journald | Cluster operations |
| Audit Logs | API server | Configurable | Security, compliance |
| Event Logs | Kubernetes events | etcd | State changes |

## Deploying the Loki Stack

### Using Helm

```bash
# Add Grafana Helm repository
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Loki Stack
helm install loki grafana/loki-stack \
  --namespace loki \
  --create-namespace \
  --set grafana.enabled=true \
  --set prometheus.enabled=false \
  --set loki.persistence.enabled=true \
  --set loki.persistence.size=50Gi
```

### Custom Values for Production

Create `loki-stack-values.yaml`:

```yaml
loki:
  enabled: true
  persistence:
    enabled: true
    size: 100Gi
    storageClassName: fast-ssd
  config:
    auth_enabled: false
    server:
      http_listen_port: 3100
    common:
      path_prefix: /loki
      replication_factor: 1
    schema_config:
      configs:
        - from: 2024-01-01
          store: tsdb
          object_store: filesystem
          schema: v13
          index:
            prefix: loki_index_
            period: 24h
    limits_config:
      reject_old_samples: true
      reject_old_samples_max_age: 168h
      ingestion_rate_mb: 32
      ingestion_burst_size_mb: 64
      max_streams_per_user: 50000
    table_manager:
      retention_deletes_enabled: true
      retention_period: 720h
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi

promtail:
  enabled: true
  config:
    clients:
      - url: http://loki:3100/loki/api/v1/push
    snippets:
      scrapeConfigs: |
        # Kubernetes pods
        - job_name: kubernetes-pods
          kubernetes_sd_configs:
            - role: pod
          pipeline_stages:
            - cri: {}
            - json:
                expressions:
                  level: level
                  msg: msg
            - labels:
                level:
          relabel_configs:
            - source_labels:
                - __meta_kubernetes_pod_controller_name
              regex: ([0-9a-z-.]+?)(-[0-9a-f]{8,10})?
              action: replace
              target_label: __tmp_controller_name
            - source_labels:
                - __meta_kubernetes_pod_label_app_kubernetes_io_name
                - __meta_kubernetes_pod_label_app
                - __tmp_controller_name
                - __meta_kubernetes_pod_name
              regex: ^;*([^;]+)(;.*)?$
              action: replace
              target_label: app
            - action: replace
              source_labels:
                - __meta_kubernetes_pod_node_name
              target_label: node_name
            - action: replace
              source_labels:
                - __meta_kubernetes_namespace
              target_label: namespace
            - action: replace
              source_labels:
                - __meta_kubernetes_pod_name
              target_label: pod
            - action: replace
              source_labels:
                - __meta_kubernetes_pod_container_name
              target_label: container
            - action: replace
              replacement: /var/log/pods/*$1/*.log
              separator: /
              source_labels:
                - __meta_kubernetes_pod_uid
                - __meta_kubernetes_pod_container_name
              target_label: __path__

grafana:
  enabled: true
  persistence:
    enabled: true
    size: 10Gi
  adminPassword: "admin"
  datasources:
    datasources.yaml:
      apiVersion: 1
      datasources:
        - name: Loki
          type: loki
          url: http://loki:3100
          isDefault: true
```

Install with custom values:

```bash
helm install loki grafana/loki-stack \
  --namespace loki \
  --create-namespace \
  -f loki-stack-values.yaml
```

## Promtail Configuration for Kubernetes

### Complete Promtail ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-config
  namespace: loki
data:
  promtail.yaml: |
    server:
      http_listen_port: 9080
      grpc_listen_port: 0

    positions:
      filename: /run/promtail/positions.yaml

    clients:
      - url: http://loki:3100/loki/api/v1/push
        tenant_id: default
        external_labels:
          cluster: production

    scrape_configs:
      # Container logs from pods
      - job_name: kubernetes-pods
        kubernetes_sd_configs:
          - role: pod
        pipeline_stages:
          - cri: {}
          - multiline:
              firstline: '^\d{4}-\d{2}-\d{2}|^\[|^{'
              max_wait_time: 3s
          - json:
              expressions:
                level: level
                msg: msg
                time: time
                timestamp: timestamp
          - labels:
              level:
          - timestamp:
              source: time
              format: RFC3339Nano
          - output:
              source: msg
        relabel_configs:
          # Drop certain pods
          - source_labels:
              - __meta_kubernetes_pod_label_app
            regex: (promtail|loki)
            action: drop
          # Pod controller name
          - source_labels:
              - __meta_kubernetes_pod_controller_name
            regex: ([0-9a-z-.]+?)(-[0-9a-f]{8,10})?
            action: replace
            target_label: controller
          # App name from labels
          - source_labels:
              - __meta_kubernetes_pod_label_app_kubernetes_io_name
              - __meta_kubernetes_pod_label_app
            regex: ^;*([^;]+).*$
            action: replace
            target_label: app
          # Component
          - source_labels:
              - __meta_kubernetes_pod_label_app_kubernetes_io_component
              - __meta_kubernetes_pod_label_component
            regex: ^;*([^;]+).*$
            action: replace
            target_label: component
          # Instance
          - source_labels:
              - __meta_kubernetes_pod_label_app_kubernetes_io_instance
            action: replace
            target_label: instance
          # Namespace
          - source_labels:
              - __meta_kubernetes_namespace
            action: replace
            target_label: namespace
          # Pod name
          - source_labels:
              - __meta_kubernetes_pod_name
            action: replace
            target_label: pod
          # Container name
          - source_labels:
              - __meta_kubernetes_pod_container_name
            action: replace
            target_label: container
          # Node name
          - source_labels:
              - __meta_kubernetes_pod_node_name
            action: replace
            target_label: node
          # Job label
          - action: replace
            replacement: kubernetes-pods
            target_label: job
          # File path
          - action: replace
            replacement: /var/log/pods/*$1/*.log
            separator: /
            source_labels:
              - __meta_kubernetes_pod_uid
              - __meta_kubernetes_pod_container_name
            target_label: __path__

      # Kubernetes events
      - job_name: kubernetes-events
        kubernetes_sd_configs:
          - role: endpoints
            namespaces:
              names:
                - default
        relabel_configs:
          - source_labels:
              - __meta_kubernetes_service_label_component
            regex: eventrouter
            action: keep
          - action: replace
            replacement: kubernetes-events
            target_label: job

      # System logs via journal
      - job_name: journal
        journal:
          max_age: 12h
          labels:
            job: systemd-journal
        relabel_configs:
          - source_labels: ['__journal__systemd_unit']
            target_label: 'unit'
          - source_labels: ['__journal__hostname']
            target_label: 'hostname'
          - source_labels: ['__journal_syslog_identifier']
            target_label: 'syslog_identifier'
          - source_labels: ['__journal_priority_keyword']
            target_label: 'level'

      # Kubelet logs
      - job_name: kubelet
        static_configs:
          - targets:
              - localhost
            labels:
              job: kubelet
              __path__: /var/log/kubelet.log

      # Kube-apiserver audit logs
      - job_name: kubernetes-audit
        static_configs:
          - targets:
              - localhost
            labels:
              job: kubernetes-audit
              __path__: /var/log/kubernetes/audit/*.log
        pipeline_stages:
          - json:
              expressions:
                level: level
                verb: verb
                user: user.username
                resource: objectRef.resource
                namespace: objectRef.namespace
                name: objectRef.name
          - labels:
              level:
              verb:
              user:
              resource:
```

### Promtail DaemonSet

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
  namespace: loki
  labels:
    app: promtail
spec:
  selector:
    matchLabels:
      app: promtail
  updateStrategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: promtail
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9080"
    spec:
      serviceAccountName: promtail
      containers:
        - name: promtail
          image: grafana/promtail:2.9.4
          args:
            - -config.file=/etc/promtail/promtail.yaml
            - -client.external-labels=node=$(NODE_NAME)
          env:
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
          ports:
            - name: http-metrics
              containerPort: 9080
              protocol: TCP
          securityContext:
            readOnlyRootFilesystem: true
            runAsGroup: 0
            runAsUser: 0
          volumeMounts:
            - name: config
              mountPath: /etc/promtail
            - name: run
              mountPath: /run/promtail
            - name: containers
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: pods
              mountPath: /var/log/pods
              readOnly: true
            - name: journal
              mountPath: /var/log/journal
              readOnly: true
            - name: machine-id
              mountPath: /etc/machine-id
              readOnly: true
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
          readinessProbe:
            httpGet:
              path: /ready
              port: http-metrics
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /ready
              port: http-metrics
            initialDelaySeconds: 10
            periodSeconds: 10
      tolerations:
        - key: node-role.kubernetes.io/master
          operator: Exists
          effect: NoSchedule
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      volumes:
        - name: config
          configMap:
            name: promtail-config
        - name: run
          hostPath:
            path: /run/promtail
        - name: containers
          hostPath:
            path: /var/lib/docker/containers
        - name: pods
          hostPath:
            path: /var/log/pods
        - name: journal
          hostPath:
            path: /var/log/journal
        - name: machine-id
          hostPath:
            path: /etc/machine-id
```

### RBAC for Promtail

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: promtail
  namespace: loki
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: promtail
rules:
  - apiGroups: [""]
    resources:
      - nodes
      - nodes/proxy
      - services
      - endpoints
      - pods
    verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: promtail
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: promtail
subjects:
  - kind: ServiceAccount
    name: promtail
    namespace: loki
```

## Collecting Kubernetes Events

### Event Router Deployment

Deploy the event router to convert Kubernetes events to logs:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: eventrouter
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: eventrouter
rules:
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: eventrouter
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: eventrouter
subjects:
  - kind: ServiceAccount
    name: eventrouter
    namespace: kube-system
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: eventrouter-cm
  namespace: kube-system
data:
  config.json: |
    {
      "sink": "stdout"
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eventrouter
  namespace: kube-system
  labels:
    component: eventrouter
spec:
  replicas: 1
  selector:
    matchLabels:
      component: eventrouter
  template:
    metadata:
      labels:
        component: eventrouter
    spec:
      serviceAccountName: eventrouter
      containers:
        - name: eventrouter
          image: gcr.io/heptio-images/eventrouter:v0.3
          volumeMounts:
            - name: config
              mountPath: /etc/eventrouter
          resources:
            requests:
              cpu: 10m
              memory: 32Mi
            limits:
              cpu: 100m
              memory: 64Mi
      volumes:
        - name: config
          configMap:
            name: eventrouter-cm
```

## Collecting Audit Logs

### Enable Kubernetes Audit Logging

Configure the API server with audit policy:

```yaml
# /etc/kubernetes/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Don't log read-only requests to certain resources
  - level: None
    users: ["system:kube-proxy"]
    verbs: ["watch"]
    resources:
      - group: ""
        resources: ["endpoints", "services", "services/status"]

  # Don't log authenticated requests to certain endpoints
  - level: None
    userGroups: ["system:authenticated"]
    nonResourceURLs:
      - "/api*"
      - "/version"
      - "/healthz*"
      - "/readyz*"
      - "/livez*"

  # Log pod changes
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["pods", "pods/log", "pods/status"]

  # Log secret access at metadata level
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]

  # Log all other resources at request level
  - level: Request
    resources:
      - group: ""
      - group: "apps"
      - group: "batch"

  # Default catch-all
  - level: Metadata
```

API server configuration flags:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
    - --audit-log-path=/var/log/kubernetes/audit/audit.log
    - --audit-log-maxage=30
    - --audit-log-maxbackup=10
    - --audit-log-maxsize=100
```

### Promtail Configuration for Audit Logs

```yaml
scrape_configs:
  - job_name: kubernetes-audit
    static_configs:
      - targets:
          - localhost
        labels:
          job: kubernetes-audit
          __path__: /var/log/kubernetes/audit/*.log
    pipeline_stages:
      - json:
          expressions:
            auditID: auditID
            level: level
            stage: stage
            verb: verb
            user: user.username
            userGroups: user.groups
            sourceIP: sourceIPs[0]
            userAgent: userAgent
            resource: objectRef.resource
            namespace: objectRef.namespace
            name: objectRef.name
            apiVersion: objectRef.apiVersion
            responseCode: responseStatus.code
      - labels:
          level:
          verb:
          user:
          resource:
          namespace:
          responseCode:
      - timestamp:
          source: requestReceivedTimestamp
          format: RFC3339Nano
```

## LogQL Queries for Kubernetes

### Basic Queries

```logql
# All logs from a namespace
{namespace="production"}

# Logs from a specific pod
{namespace="production", pod="api-server-abc123"}

# Logs from all pods of an app
{namespace="production", app="api-server"}

# Container-specific logs
{namespace="production", container="nginx"}
```

### Filtering and Parsing

```logql
# Error logs only
{namespace="production"} |= "error"

# JSON log parsing
{namespace="production"} | json | level="error"

# Parse and filter by HTTP status
{namespace="production", app="nginx"}
  | pattern `<_> - - [<_>] "<method> <path> <_>" <status> <_>`
  | status >= 500

# Exclude health checks
{namespace="production"} != "healthcheck" != "/health"
```

### Aggregations

```logql
# Error rate by app
sum(rate({namespace="production"} |= "error" [5m])) by (app)

# Log volume by namespace
sum(rate({job="kubernetes-pods"}[1h])) by (namespace)

# Top 10 pods by log volume
topk(10, sum(rate({namespace="production"}[5m])) by (pod))

# Count by log level
sum(count_over_time({namespace="production"} | json [1h])) by (level)
```

### Event Queries

```logql
# All Kubernetes events
{job="kubernetes-events"}

# Warning events
{job="kubernetes-events"} |= "Warning"

# Events for a specific namespace
{job="kubernetes-events"} | json | involvedObject_namespace="production"

# Pod scheduling failures
{job="kubernetes-events"} |= "FailedScheduling"
```

### Audit Log Queries

```logql
# All audit logs
{job="kubernetes-audit"}

# Secret access
{job="kubernetes-audit"} | json | resource="secrets"

# Failed requests
{job="kubernetes-audit"} | json | responseCode >= 400

# Admin actions
{job="kubernetes-audit"} | json | user="admin"

# Delete operations
{job="kubernetes-audit"} | json | verb="delete"
```

## Grafana Dashboards

### Kubernetes Logs Dashboard Variables

```yaml
# Namespace variable
label_values({job="kubernetes-pods"}, namespace)

# App variable
label_values({namespace="$namespace"}, app)

# Pod variable
label_values({namespace="$namespace", app="$app"}, pod)

# Container variable
label_values({namespace="$namespace", pod="$pod"}, container)
```

### Dashboard Panel Queries

```logql
# Log stream panel
{namespace="$namespace", app="$app", pod=~"$pod", container=~"$container"}
  | json
  | line_format "{{.level}} - {{.msg}}"

# Error count over time
sum(count_over_time({namespace="$namespace", app="$app"} |= "error" [$__interval])) by (pod)

# Log levels distribution
sum(count_over_time({namespace="$namespace"} | json [$__range])) by (level)
```

## Troubleshooting

### Verify Promtail is Running

```bash
kubectl get pods -n loki -l app=promtail
kubectl logs -n loki -l app=promtail --tail=50
```

### Check Promtail Targets

```bash
kubectl port-forward -n loki svc/promtail 9080:9080
curl http://localhost:9080/targets
```

### Verify Logs are Being Collected

```bash
# Check Loki metrics
kubectl port-forward -n loki svc/loki 3100:3100
curl http://localhost:3100/metrics | grep loki_distributor_lines_received
```

### Common Issues

**Missing Logs**:
- Verify Promtail has correct RBAC permissions
- Check file paths in scrape config
- Verify container runtime log format (CRI vs Docker)

**High Cardinality**:
- Reduce labels extracted from pod metadata
- Use relabel_configs to drop high-cardinality labels

**Memory Issues**:
- Increase Promtail memory limits
- Add rate limiting in pipeline stages
- Filter out verbose logs

## Conclusion

Collecting Kubernetes logs with Loki requires understanding multiple log sources and appropriate collection strategies. Key takeaways:

- Use Promtail as a DaemonSet for comprehensive log collection
- Configure appropriate relabel rules for Kubernetes metadata
- Collect events using an event router
- Enable audit logging for security and compliance
- Use LogQL effectively for querying Kubernetes logs
- Monitor the log collection pipeline for issues

With proper configuration, Loki provides a scalable and cost-effective solution for Kubernetes log management.
