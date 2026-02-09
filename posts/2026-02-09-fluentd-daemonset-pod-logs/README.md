# How to configure Fluentd DaemonSet for pod log collection in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fluentd, Kubernetes, DaemonSet, Logging, EFK Stack

Description: Learn how to deploy Fluentd as a DaemonSet on Kubernetes to collect pod logs from all nodes, parse container logs, and forward them to Elasticsearch for centralized log management.

---

Fluentd is a unified logging layer that collects, processes, and forwards logs from various sources. When deployed as a DaemonSet in Kubernetes, Fluentd runs on every node and automatically collects logs from all pods, making it an essential component of the EFK (Elasticsearch, Fluentd, Kibana) stack.

This guide shows you how to configure and deploy Fluentd as a DaemonSet to collect container logs from Kubernetes pods and forward them to Elasticsearch with proper parsing and enrichment.

## Understanding Fluentd architecture on Kubernetes

When deployed as a DaemonSet, Fluentd:
- Runs one pod per Kubernetes node
- Accesses container logs at `/var/log/containers/`
- Parses JSON-formatted container logs
- Enriches logs with Kubernetes metadata
- Forwards processed logs to Elasticsearch

The log collection flow: Container stdout/stderr → Docker/containerd → Node filesystem → Fluentd → Elasticsearch

## Creating Fluentd configuration

Start with a ConfigMap containing Fluentd configuration:

```yaml
# fluentd-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: logging
  labels:
    app: fluentd
data:
  fluent.conf: |
    # Input: Read container logs from node
    <source>
      @type tail
      @id in_tail_container_logs
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      read_from_head true
      <parse>
        @type json
        time_format %Y-%m-%dT%H:%M:%S.%NZ
        time_key time
        keep_time_key true
      </parse>
    </source>

    # Filter: Parse Kubernetes metadata
    <filter kubernetes.**>
      @type kubernetes_metadata
      @id filter_kube_metadata
      kubernetes_url "#{ENV['FLUENT_FILTER_KUBERNETES_URL'] || 'https://' + ENV.fetch('KUBERNETES_SERVICE_HOST') + ':' + ENV.fetch('KUBERNETES_SERVICE_PORT') + '/api'}"
      verify_ssl "#{ENV['KUBERNETES_VERIFY_SSL'] || true}"
      ca_file "#{ENV['KUBERNETES_CA_FILE']}"
      skip_labels "#{ENV['FLUENT_KUBERNETES_METADATA_SKIP_LABELS'] || 'false'}"
      skip_container_metadata "#{ENV['FLUENT_KUBERNETES_METADATA_SKIP_CONTAINER_METADATA'] || 'false'}"
      skip_master_url "#{ENV['FLUENT_KUBERNETES_METADATA_SKIP_MASTER_URL'] || 'false'}"
      skip_namespace_metadata "#{ENV['FLUENT_KUBERNETES_METADATA_SKIP_NAMESPACE_METADATA'] || 'false'}"
    </filter>

    # Filter: Parse container logs
    <filter kubernetes.**>
      @type parser
      key_name log
      reserve_data true
      remove_key_name_field true
      <parse>
        @type multi_format
        <pattern>
          format json
          time_key time
          keep_time_key true
        </pattern>
        <pattern>
          format none
        </pattern>
      </parse>
    </filter>

    # Filter: Remove unnecessary fields
    <filter kubernetes.**>
      @type record_transformer
      remove_keys $.docker.container_id
      <record>
        cluster_name "#{ENV['CLUSTER_NAME'] || 'kubernetes'}"
      </record>
    </filter>

    # Output: Forward to Elasticsearch
    <match kubernetes.**>
      @type elasticsearch
      @id out_es
      @log_level info
      include_tag_key true
      host "#{ENV['FLUENT_ELASTICSEARCH_HOST']}"
      port "#{ENV['FLUENT_ELASTICSEARCH_PORT']}"
      scheme "#{ENV['FLUENT_ELASTICSEARCH_SCHEME'] || 'https'}"
      ssl_verify "#{ENV['FLUENT_ELASTICSEARCH_SSL_VERIFY'] || 'true'}"
      ssl_version TLSv1_2
      user "#{ENV['FLUENT_ELASTICSEARCH_USER']}"
      password "#{ENV['FLUENT_ELASTICSEARCH_PASSWORD']}"
      logstash_format true
      logstash_prefix "#{ENV['FLUENT_ELASTICSEARCH_LOGSTASH_PREFIX'] || 'logstash'}"
      logstash_dateformat %Y.%m.%d
      include_timestamp true
      type_name _doc
      <buffer>
        @type file
        path /var/log/fluentd-buffers/kubernetes.system.buffer
        flush_mode interval
        retry_type exponential_backoff
        flush_thread_count 2
        flush_interval 5s
        retry_forever false
        retry_max_interval 30
        chunk_limit_size 2M
        queue_limit_length 32
        overflow_action block
      </buffer>
    </match>
```

Apply the ConfigMap:

```bash
kubectl apply -f fluentd-config.yaml
```

## Deploying Fluentd DaemonSet

Create the Fluentd DaemonSet:

```yaml
# fluentd-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: logging
  labels:
    app: fluentd
    component: logging
spec:
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
        component: logging
    spec:
      serviceAccountName: fluentd
      tolerations:
        # Allow Fluentd to run on all nodes including masters
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
        - key: node-role.kubernetes.io/master
          effect: NoSchedule
      containers:
        - name: fluentd
          image: fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch
          env:
            - name: FLUENT_ELASTICSEARCH_HOST
              value: "elasticsearch.logging.svc"
            - name: FLUENT_ELASTICSEARCH_PORT
              value: "9200"
            - name: FLUENT_ELASTICSEARCH_SCHEME
              value: "https"
            - name: FLUENT_ELASTICSEARCH_SSL_VERIFY
              value: "false"
            - name: FLUENT_ELASTICSEARCH_USER
              value: "elastic"
            - name: FLUENT_ELASTICSEARCH_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: elasticsearch-credentials
                  key: password
            - name: FLUENT_ELASTICSEARCH_LOGSTASH_PREFIX
              value: "kubernetes"
            - name: CLUSTER_NAME
              value: "production-cluster"
            - name: FLUENT_CONTAINER_TAIL_EXCLUDE_PATH
              value: /var/log/containers/fluentd*.log
            - name: FLUENT_UID
              value: "0"
          resources:
            requests:
              cpu: 100m
              memory: 200Mi
            limits:
              cpu: 500m
              memory: 500Mi
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: config-volume
              mountPath: /fluentd/etc/fluent.conf
              subPath: fluent.conf
      terminationGracePeriodSeconds: 30
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
        - name: config-volume
          configMap:
            name: fluentd-config
---
# fluentd-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: fluentd
  namespace: logging
---
# fluentd-clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: fluentd
rules:
  - apiGroups:
      - ""
    resources:
      - pods
      - namespaces
    verbs:
      - get
      - list
      - watch
---
# fluentd-clusterrolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: fluentd
roleRef:
  kind: ClusterRole
  name: fluentd
  apiGroup: rbac.authorization.k8s.io
subjects:
  - kind: ServiceAccount
    name: fluentd
    namespace: logging
```

Deploy the DaemonSet:

```bash
kubectl apply -f fluentd-daemonset.yaml
```

## Configuring log parsing for different formats

Handle multiple log formats with multi-line and custom parsers:

```yaml
# Enhanced fluent.conf for multiple formats
<source>
  @type tail
  path /var/log/containers/*.log
  pos_file /var/log/fluentd-containers.log.pos
  tag kubernetes.*
  read_from_head true
  <parse>
    @type multi_format
    # Docker JSON format
    <pattern>
      format json
      time_key time
      time_format %Y-%m-%dT%H:%M:%S.%NZ
    </pattern>
    # CRI format
    <pattern>
      format /^(?<time>.+) (?<stream>stdout|stderr) [^ ]* (?<log>.*)$/
      time_format %Y-%m-%dT%H:%M:%S.%N%:z
    </pattern>
  </parse>
</source>

# Parse application-specific logs
<filter kubernetes.var.log.containers.app-**.log>
  @type parser
  key_name log
  reserve_data true
  <parse>
    @type json
    time_key timestamp
    time_format %Y-%m-%d %H:%M:%S
  </parse>
</filter>

# Parse nginx access logs
<filter kubernetes.var.log.containers.nginx-**.log>
  @type parser
  key_name log
  reserve_data true
  <parse>
    @type nginx
  </parse>
</filter>

# Parse multi-line Java stack traces
<filter kubernetes.var.log.containers.java-app-**.log>
  @type concat
  key log
  stream_identity_key stream
  multiline_start_regexp /^\\d{4}-\\d{2}-\\d{2}/
  flush_interval 5s
</filter>
```

## Filtering logs by namespace and labels

Selectively collect logs based on Kubernetes metadata:

```yaml
# Only collect logs from specific namespaces
<filter kubernetes.**>
  @type grep
  <regexp>
    key $.kubernetes.namespace_name
    pattern /^(production|staging)$/
  </regexp>
</filter>

# Exclude system namespaces
<filter kubernetes.**>
  @type grep
  <exclude>
    key $.kubernetes.namespace_name
    pattern /^(kube-system|kube-public|kube-node-lease)$/
  </exclude>
</filter>

# Filter by pod labels
<filter kubernetes.**>
  @type grep
  <regexp>
    key $.kubernetes.labels.app
    pattern /^(web-app|api-server|worker)$/
  </regexp>
</filter>

# Exclude Fluentd's own logs
<filter kubernetes.**>
  @type grep
  <exclude>
    key $.kubernetes.labels.app
    pattern /^fluentd$/
  </exclude>
</filter>
```

## Implementing log enrichment

Add custom fields and metadata to logs:

```yaml
<filter kubernetes.**>
  @type record_transformer
  enable_ruby true
  <record>
    # Add environment identifier
    environment "#{ENV['ENVIRONMENT'] || 'production'}"

    # Add cluster information
    cluster_name "#{ENV['CLUSTER_NAME']}"
    cluster_region "#{ENV['CLUSTER_REGION']}"

    # Extract useful fields
    pod_name ${record["kubernetes"]["pod_name"]}
    namespace ${record["kubernetes"]["namespace_name"]}
    container_name ${record["kubernetes"]["container_name"]}
    node_name ${record["kubernetes"]["host"]}

    # Add timestamp in multiple formats
    timestamp ${time.strftime('%Y-%m-%d %H:%M:%S')}

    # Add log level if present
    level ${record.dig("log", "level") || "INFO"}
  </record>
</filter>

# Add custom labels based on namespace
<filter kubernetes.var.log.containers.**production**.log>
  @type record_transformer
  <record>
    tier production
    priority high
  </record>
</filter>
```

## Configuring buffer and retry settings

Optimize buffering for reliability and performance:

```yaml
<match kubernetes.**>
  @type elasticsearch
  host elasticsearch.logging.svc
  port 9200
  scheme https
  ssl_verify false
  user elastic
  password ${ELASTICSEARCH_PASSWORD}
  logstash_format true
  logstash_prefix kubernetes

  # Buffer configuration
  <buffer>
    @type file
    path /var/log/fluentd-buffers/kubernetes.buffer

    # Flush settings
    flush_mode interval
    flush_interval 5s
    flush_at_shutdown true

    # Retry settings
    retry_type exponential_backoff
    retry_wait 1s
    retry_max_interval 60s
    retry_timeout 1h
    retry_forever false

    # Buffer limits
    total_limit_size 1GB
    chunk_limit_size 8MB
    chunk_limit_records 1000

    # Queue settings
    queue_limit_length 256
    overflow_action drop_oldest_chunk

    # Performance tuning
    flush_thread_count 4
    compress gzip
  </buffer>

  # Slow flush log threshold
  slow_flush_log_threshold 40.0
</match>
```

## Handling high log volumes

Configure Fluentd for high-throughput environments:

```yaml
# Optimize systemd input for high volume
<source>
  @type systemd
  path /var/log/journal
  matches [{ "_SYSTEMD_UNIT": "docker.service" }]
  read_from_head true
  tag systemd.docker
  <storage>
    @type local
    persistent true
    path /var/log/fluentd-journald-docker.pos
  </storage>
  <entry>
    field_map {"MESSAGE": "log", "_PID": "pid", "_COMM": "command"}
    fields_strip_underscores true
  </entry>
</source>

# Increase worker processes
<system>
  workers 4
  root_dir /tmp/fluentd
</system>

# Use multiple output workers
<match kubernetes.**>
  @type elasticsearch
  @id out_es_high_throughput

  # Connection pooling
  reload_connections false
  reconnect_on_error true
  reload_on_failure true

  # Bulk settings
  request_timeout 15s

  <buffer>
    flush_thread_count 8
    flush_interval 1s
    chunk_limit_size 16MB
    queue_limit_length 512
  </buffer>
</match>
```

## Monitoring Fluentd performance

Add monitoring endpoints and metrics:

```yaml
# Add monitoring plugin
<source>
  @type monitor_agent
  bind 0.0.0.0
  port 24220
  include_config true
  include_retry true
</source>

# Expose Prometheus metrics
<source>
  @type prometheus
  bind 0.0.0.0
  port 24231
  metrics_path /metrics
</source>

<source>
  @type prometheus_output_monitor
  interval 10
</source>

# Add health check endpoint
<source>
  @type http
  bind 0.0.0.0
  port 9880
</source>
```

Add these ports to the DaemonSet:

```yaml
ports:
  - name: metrics
    containerPort: 24231
    protocol: TCP
  - name: monitor
    containerPort: 24220
    protocol: TCP
  - name: healthcheck
    containerPort: 9880
    protocol: TCP
```

## Debugging Fluentd issues

Common troubleshooting steps:

```bash
# Check Fluentd pods status
kubectl get pods -n logging -l app=fluentd

# View Fluentd logs
kubectl logs -n logging -l app=fluentd --tail=100

# Check specific node's Fluentd
kubectl logs -n logging fluentd-xxxxx

# Verify log collection
kubectl exec -it -n logging fluentd-xxxxx -- ls -la /var/log/containers/

# Check buffer directory
kubectl exec -it -n logging fluentd-xxxxx -- ls -la /var/log/fluentd-buffers/

# Test Elasticsearch connectivity
kubectl exec -it -n logging fluentd-xxxxx -- \
  curl -k -u elastic:password https://elasticsearch.logging.svc:9200/_cluster/health

# Check Fluentd metrics
kubectl port-forward -n logging fluentd-xxxxx 24231:24231
curl http://localhost:24231/metrics
```

## Best practices for Fluentd DaemonSet

1. **Set resource limits:** Prevent Fluentd from consuming excessive resources
2. **Configure proper buffering:** Balance memory usage with reliability
3. **Use file buffers:** More reliable than memory buffers for production
4. **Filter unnecessary logs:** Reduce storage costs and processing overhead
5. **Monitor buffer metrics:** Alert on buffer overflow or slow flush
6. **Use compression:** Reduce network bandwidth and storage usage
7. **Implement log rotation:** Prevent disk space exhaustion on nodes
8. **Test configuration changes:** Validate configs in staging first

## Conclusion

Deploying Fluentd as a DaemonSet provides comprehensive log collection across your Kubernetes cluster. By properly configuring log parsing, enrichment, buffering, and forwarding to Elasticsearch, you create a robust logging infrastructure that scales with your cluster. Combined with proper monitoring and resource management, Fluentd serves as a reliable foundation for centralized log aggregation and analysis in your EFK stack.
