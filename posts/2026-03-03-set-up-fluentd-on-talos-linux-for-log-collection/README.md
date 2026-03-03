# How to Set Up Fluentd on Talos Linux for Log Collection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Fluentd, Log Collection, Kubernetes, Elasticsearch

Description: Complete guide to deploying and configuring Fluentd on Talos Linux for collecting and forwarding Kubernetes logs.

---

Fluentd is a widely adopted open source log collector that unifies data collection and consumption. It works particularly well in Kubernetes environments because of its rich plugin ecosystem and its ability to handle diverse log formats. On Talos Linux, Fluentd runs as a DaemonSet that collects container logs from every node and forwards them to your chosen backend - Elasticsearch, S3, CloudWatch, Loki, or dozens of other destinations.

This guide covers deploying Fluentd on a Talos Linux cluster, configuring it for the Talos filesystem layout, and setting up common log routing patterns.

## Why Fluentd on Talos Linux

Talos Linux's immutable design means you cannot install Fluentd as a system package. Instead, it runs as a Kubernetes DaemonSet that mounts host paths to access container log files. Fluentd reads the log files from `/var/log/pods/`, processes them according to your configuration, and ships them to your log storage backend.

Fluentd's advantages for Talos Linux include its mature Kubernetes metadata filter (which enriches logs with pod names, namespaces, and labels), its buffering system (which handles transient network issues without dropping logs), and its ability to parse multiple log formats in a single pipeline.

## Deploying Fluentd with Helm

The quickest way to deploy Fluentd is with the official Helm chart:

```bash
# Add the Fluentd Helm repository
helm repo add fluent https://fluent.github.io/helm-charts
helm repo update

# Create a logging namespace
kubectl create namespace logging

# Install Fluentd with basic configuration
helm install fluentd fluent/fluentd \
  --namespace logging \
  --set tolerations[0].operator=Exists \
  --set tolerations[0].effect=NoSchedule
```

For production use, create a custom values file:

```yaml
# fluentd-values.yaml
# Fluentd Helm values for Talos Linux
kind: DaemonSet

tolerations:
  - operator: Exists
    effect: NoSchedule

# Resource limits appropriate for most clusters
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

# Mount Talos Linux paths for log collection
volumes:
  - name: varlogpods
    hostPath:
      path: /var/log/pods
  - name: varlogcontainers
    hostPath:
      path: /var/log/containers
  - name: varlibdockercontainers
    hostPath:
      path: /var/log

volumeMounts:
  - name: varlogpods
    mountPath: /var/log/pods
    readOnly: true
  - name: varlogcontainers
    mountPath: /var/log/containers
    readOnly: true
  - name: varlibdockercontainers
    mountPath: /var/log
    readOnly: true

# Fluentd configuration
fileConfigs:
  01_sources.conf: |
    <source>
      @type tail
      @id in_tail_container_logs
      path /var/log/pods/**/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      read_from_head true
      <parse>
        @type cri
      </parse>
    </source>

  02_filters.conf: |
    <filter kubernetes.**>
      @type kubernetes_metadata
      @id filter_kube_metadata
      skip_labels false
      skip_container_metadata false
      skip_master_url true
      skip_namespace_metadata true
    </filter>

  03_outputs.conf: |
    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch.logging.svc
      port 9200
      logstash_format true
      logstash_prefix kubernetes
      include_tag_key true
      <buffer>
        @type file
        path /var/log/fluentd-buffers/kubernetes.buffer
        flush_mode interval
        flush_interval 10s
        retry_type exponential_backoff
        retry_wait 1s
        retry_max_interval 300s
        chunk_limit_size 5M
        total_limit_size 500M
        overflow_action drop_oldest_chunk
      </buffer>
    </match>
```

Install with the custom values:

```bash
helm install fluentd fluent/fluentd \
  --namespace logging \
  -f fluentd-values.yaml
```

## Manual Deployment with ConfigMap

If you prefer not to use Helm, deploy Fluentd manually:

```yaml
# fluentd-configmap.yaml
# Fluentd configuration for Talos Linux
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: logging
data:
  fluent.conf: |
    # Collect container logs from all pods
    <source>
      @type tail
      @id container_logs
      path /var/log/pods/**/*.log
      pos_file /var/log/fluentd/containers.log.pos
      tag kubernetes.*
      read_from_head true
      <parse>
        @type cri
        <parse>
          @type json
          time_key time
          time_format %Y-%m-%dT%H:%M:%S.%NZ
        </parse>
      </parse>
    </source>

    # Enrich with Kubernetes metadata
    <filter kubernetes.**>
      @type kubernetes_metadata
      @id kube_metadata
    </filter>

    # Remove unnecessary fields to reduce volume
    <filter kubernetes.**>
      @type record_transformer
      remove_keys $.kubernetes.pod_id,$.kubernetes.master_url,$.kubernetes.namespace_id
    </filter>

    # Route logs by namespace
    <match kubernetes.var.log.pods.kube-system_**>
      @type elasticsearch
      host elasticsearch.logging.svc
      port 9200
      index_name kube-system-logs
      <buffer>
        @type file
        path /var/log/fluentd-buffers/kube-system
        flush_interval 15s
      </buffer>
    </match>

    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch.logging.svc
      port 9200
      logstash_format true
      logstash_prefix app-logs
      <buffer>
        @type file
        path /var/log/fluentd-buffers/app-logs
        flush_interval 10s
        chunk_limit_size 5M
        total_limit_size 1G
      </buffer>
    </match>
```

Deploy the DaemonSet:

```yaml
# fluentd-daemonset.yaml
# Fluentd DaemonSet for Talos Linux
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: logging
  labels:
    app: fluentd
spec:
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
    spec:
      serviceAccountName: fluentd
      tolerations:
        - operator: Exists
          effect: NoSchedule
      containers:
        - name: fluentd
          image: fluent/fluentd-kubernetes-daemonset:v1.16-debian-elasticsearch8-1
          env:
            - name: K8S_NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          volumeMounts:
            - name: config
              mountPath: /fluentd/etc
            - name: varlogpods
              mountPath: /var/log/pods
              readOnly: true
            - name: varlogcontainers
              mountPath: /var/log/containers
              readOnly: true
            - name: buffer
              mountPath: /var/log/fluentd-buffers
      volumes:
        - name: config
          configMap:
            name: fluentd-config
        - name: varlogpods
          hostPath:
            path: /var/log/pods
        - name: varlogcontainers
          hostPath:
            path: /var/log/containers
        - name: buffer
          emptyDir: {}
```

Apply both resources:

```bash
kubectl apply -f fluentd-configmap.yaml
kubectl apply -f fluentd-daemonset.yaml
```

## RBAC for Fluentd

Fluentd needs Kubernetes API access to enrich logs with metadata:

```yaml
# fluentd-rbac.yaml
# RBAC for Fluentd Kubernetes metadata enrichment
apiVersion: v1
kind: ServiceAccount
metadata:
  name: fluentd
  namespace: logging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: fluentd
rules:
  - apiGroups: [""]
    resources: ["namespaces", "pods"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: fluentd
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: fluentd
subjects:
  - kind: ServiceAccount
    name: fluentd
    namespace: logging
```

## Forwarding to Different Backends

### Forwarding to Loki

```xml
<!-- Forward to Grafana Loki -->
<match kubernetes.**>
  @type loki
  url http://loki-gateway.logging.svc:80
  extra_labels {"source":"fluentd"}
  <label>
    namespace $.kubernetes.namespace_name
    pod $.kubernetes.pod_name
    container $.kubernetes.container_name
  </label>
  <buffer>
    @type file
    path /var/log/fluentd-buffers/loki
    flush_interval 10s
  </buffer>
</match>
```

### Forwarding to S3

```xml
<!-- Archive logs to S3 -->
<match kubernetes.**>
  @type s3
  aws_key_id YOUR_ACCESS_KEY
  aws_sec_key YOUR_SECRET_KEY
  s3_bucket my-log-bucket
  s3_region us-east-1
  path kubernetes-logs/
  <buffer time>
    @type file
    path /var/log/fluentd-buffers/s3
    timekey 3600
    timekey_wait 10m
    chunk_limit_size 256m
  </buffer>
</match>
```

## Collecting Talos Machine Logs with Fluentd

To also collect Talos machine-level logs, add a TCP input source that receives from the Talos logging destination:

```xml
<!-- Receive Talos machine logs -->
<source>
  @type tcp
  tag talos.machine
  port 5140
  bind 0.0.0.0
  <parse>
    @type json
  </parse>
</source>

<!-- Process and forward Talos machine logs -->
<match talos.**>
  @type elasticsearch
  host elasticsearch.logging.svc
  port 9200
  index_name talos-machine-logs
  <buffer>
    @type file
    path /var/log/fluentd-buffers/talos-machine
    flush_interval 15s
  </buffer>
</match>
```

Then configure Talos to send machine logs to Fluentd:

```yaml
# Point Talos machine logs to Fluentd
machine:
  logging:
    destinations:
      - endpoint: "tcp://fluentd.logging.svc:5140"
        format: json_lines
```

## Verifying the Setup

Confirm that Fluentd is collecting and forwarding logs:

```bash
# Check Fluentd pods are running on all nodes
kubectl get pods -n logging -l app=fluentd -o wide

# Check Fluentd logs for errors
kubectl logs -n logging -l app=fluentd --tail=30

# Look for specific issues
kubectl logs -n logging -l app=fluentd --tail=100 | grep -i "error\|warn\|retry"

# Verify buffer status (if using the monitor_agent plugin)
kubectl exec -n logging daemonset/fluentd -- curl -s localhost:24220/api/plugins.json | jq '.plugins[] | {id, buffer_queue_length, buffer_total_queued_size}'
```

## Performance Tuning

For high-throughput clusters, tune Fluentd's performance:

```xml
<!-- Performance-tuned buffer configuration -->
<buffer>
  @type file
  path /var/log/fluentd-buffers/output
  flush_mode interval
  flush_interval 5s
  flush_thread_count 4
  retry_type exponential_backoff
  retry_wait 1s
  retry_max_interval 60s
  retry_forever true
  chunk_limit_size 8M
  total_limit_size 2G
  overflow_action drop_oldest_chunk
  compress gzip
</buffer>
```

Fluentd on Talos Linux provides a robust, battle-tested log collection pipeline. Its plugin ecosystem and flexible configuration language let you handle virtually any log routing requirement, from simple forwarding to complex multi-destination routing with filtering and transformation at every step.
