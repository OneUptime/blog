# How to Implement Centralized Log Collection from Kubernetes Pods Using OpenTelemetry DaemonSet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Log Collection, DaemonSet

Description: Deploy the OpenTelemetry Collector as a Kubernetes DaemonSet to collect logs from every pod on every node automatically.

Collecting logs from Kubernetes pods is one of those problems that sounds simple until you actually try to do it at scale. Pods come and go, each node has its own filesystem with container log files, and you need a reliable way to tail all of them without missing anything. The standard approach is to deploy a log collector as a DaemonSet so that one collector instance runs on every node and reads logs from the local filesystem.

OpenTelemetry Collector fits this role perfectly. This post walks through the full setup.

## Why a DaemonSet

In Kubernetes, container runtimes write pod logs to files on the node filesystem, typically under `/var/log/pods/`. A DaemonSet ensures that exactly one collector pod runs on each node in the cluster. That collector reads the local log files, enriches them with Kubernetes metadata (pod name, namespace, labels), and forwards them to a central backend.

The alternative is having each application push logs via OTLP, but that requires instrumenting every application. The DaemonSet approach works with zero application changes.

## Deploying the Collector

First, create a ConfigMap with the collector configuration:

```yaml
# otel-collector-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: monitoring
data:
  config.yaml: |
    receivers:
      # Filelog receiver reads container log files from the node
      filelog:
        include:
          - /var/log/pods/*/*/*.log
        exclude:
          # Skip the collector's own logs to avoid feedback loops
          - /var/log/pods/monitoring_otel-collector*/**
        start_at: end
        include_file_path: true
        include_file_name: false
        operators:
          # Parse the container runtime log format (CRI)
          - type: router
            id: get-format
            routes:
              - output: parser-containerd
                expr: 'body matches "^[^ Z]+ "'
              - output: parser-cri
                expr: 'body matches "^[^ Z]+Z"'
          - type: regex_parser
            id: parser-containerd
            regex: '^(?P<time>[^ Z]+) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*) ?(?P<log>.*)$'
            output: extract-metadata
            timestamp:
              parse_from: attributes.time
              layout: '%Y-%m-%dT%H:%M:%S.%LZ'
          - type: regex_parser
            id: parser-cri
            regex: '^(?P<time>[^ Z]+Z) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*) ?(?P<log>.*)$'
            output: extract-metadata
            timestamp:
              parse_from: attributes.time
              layout: '%Y-%m-%dT%H:%M:%S.%LZ'
          - type: move
            id: extract-metadata
            from: attributes.log
            to: body

    processors:
      # Enrich logs with Kubernetes metadata
      k8sattributes:
        auth_type: "serviceAccount"
        extract:
          metadata:
            - k8s.pod.name
            - k8s.namespace.name
            - k8s.deployment.name
            - k8s.node.name
            - k8s.container.name
          labels:
            - tag_name: app
              key: app
              from: pod
        pod_association:
          - sources:
              - from: resource_attribute
                name: k8s.pod.uid

      batch:
        timeout: 5s
        send_batch_size: 1024

    exporters:
      otlp:
        endpoint: "https://your-backend.example.com:4317"
        tls:
          insecure: false

    service:
      pipelines:
        logs:
          receivers: [filelog]
          processors: [k8sattributes, batch]
          exporters: [otlp]
```

Now create the DaemonSet:

```yaml
# otel-collector-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
  namespace: monitoring
  labels:
    app: otel-collector
spec:
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      serviceAccountName: otel-collector
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          args:
            - "--config=/etc/otelcol/config.yaml"
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          volumeMounts:
            - name: config
              mountPath: /etc/otelcol
            - name: varlogpods
              mountPath: /var/log/pods
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
        - name: varlogpods
          hostPath:
            path: /var/log/pods
```

## RBAC Setup

The `k8sattributes` processor needs permissions to query the Kubernetes API. Create a ServiceAccount, ClusterRole, and ClusterRoleBinding:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-collector
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector
rules:
  - apiGroups: [""]
    resources: ["pods", "namespaces", "nodes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-collector
subjects:
  - kind: ServiceAccount
    name: otel-collector
    namespace: monitoring
roleRef:
  kind: ClusterRole
  name: otel-collector
  apiGroup: rbac.authorization.k8s.io
```

## Handling Log Rotation

Kubernetes rotates container logs when they exceed a configured size (default is 10 MB). The filelog receiver handles this automatically by tracking file offsets in a checkpoint file. When a log file gets rotated, the receiver detects the new file and starts reading from the beginning, while finishing the old file.

To persist the checkpoint across collector restarts, mount a `hostPath` volume:

```yaml
# Add to the DaemonSet container spec
volumeMounts:
  - name: filelogreceiver
    mountPath: /var/lib/otelcol/file_storage
# Add to the DaemonSet volumes
volumes:
  - name: filelogreceiver
    hostPath:
      path: /var/lib/otelcol/file_storage
      type: DirectoryOrCreate
```

And update the filelog receiver config with a storage extension:

```yaml
extensions:
  file_storage:
    directory: /var/lib/otelcol/file_storage

receivers:
  filelog:
    storage: file_storage
    # ... rest of config
```

## Verifying the Deployment

Apply the manifests and check that collector pods are running on every node:

```bash
kubectl apply -f otel-collector-config.yaml
kubectl apply -f otel-collector-daemonset.yaml
kubectl -n monitoring get pods -l app=otel-collector -o wide
```

You should see one pod per node. Check the logs of a collector pod to confirm it is reading files:

```bash
kubectl -n monitoring logs -l app=otel-collector --tail=50
```

Look for lines indicating the filelog receiver started and is discovering log files.

## Wrapping Up

Running the OpenTelemetry Collector as a DaemonSet is the most reliable way to collect logs from Kubernetes pods. It requires no application changes, handles log rotation gracefully, and enriches every log line with Kubernetes metadata. Combined with the rest of the OpenTelemetry ecosystem, this gives you a solid foundation for centralized log management.
