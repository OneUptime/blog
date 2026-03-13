# How to Use DaemonSets for Log Collection Agents on Every Node

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Logging, Fluentd, Log Aggregation

Description: Learn how to deploy log collection agents using Kubernetes DaemonSets to gather logs from every node and container, implementing centralized logging for observability.

---

Centralized logging is essential for troubleshooting and monitoring Kubernetes clusters. Log collection agents deployed as DaemonSets ensure every node forwards logs to your aggregation system. This guide demonstrates deploying various log collectors using DaemonSets to capture container logs, system logs, and application logs from across your cluster.

## Understanding DaemonSet Log Collection Architecture

Log collectors need access to container log files, which reside on each node's filesystem. DaemonSets guarantee one collector pod per node, ensuring comprehensive log coverage even as nodes scale. Collectors mount host directories containing logs, parse them, enrich with metadata, and forward to centralized storage.

The typical flow involves the container runtime writing logs to /var/log/containers, the log collector reading these files, parsing formats, adding Kubernetes metadata like pod name and namespace, and shipping to backends like Elasticsearch, Loki, or cloud logging services.

## Deploying Fluentd as DaemonSet

Fluentd is a popular log collector. Deploy it to collect all container logs:

```yaml
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
  resources:
  - namespaces
  - pods
  - pods/logs
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
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: logging
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      read_from_head true
      <parse>
        @type json
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    <filter kubernetes.**>
      @type kubernetes_metadata
      @id filter_kube_metadata
      kubernetes_url "#{ENV['FLUENT_FILTER_KUBERNETES_URL'] || 'https://' + ENV.fetch('KUBERNETES_SERVICE_HOST') + ':' + ENV.fetch('KUBERNETES_SERVICE_PORT') + '/api'}"
      verify_ssl "#{ENV['KUBERNETES_VERIFY_SSL'] || true}"
      ca_file "#{ENV['KUBERNETES_CA_FILE']}"
    </filter>

    <match kubernetes.**>
      @type elasticsearch
      @id out_es
      host "#{ENV['FLUENT_ELASTICSEARCH_HOST']}"
      port "#{ENV['FLUENT_ELASTICSEARCH_PORT']}"
      scheme "#{ENV['FLUENT_ELASTICSEARCH_SCHEME'] || 'http'}"
      ssl_verify "#{ENV['FLUENT_ELASTICSEARCH_SSL_VERIFY'] || 'true'}"
      logstash_format true
      logstash_prefix kubernetes
      <buffer>
        @type file
        path /var/log/fluentd-buffers/kubernetes.system.buffer
        flush_mode interval
        retry_type exponential_backoff
        flush_thread_count 2
        flush_interval 5s
        retry_forever
        retry_max_interval 30
        chunk_limit_size 2M
        queue_limit_length 8
        overflow_action block
      </buffer>
    </match>
---
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
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      - key: node-role.kubernetes.io/control-plane
        effect: NoSchedule
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1.16-debian-elasticsearch7-1
        env:
        - name: FLUENT_ELASTICSEARCH_HOST
          value: "elasticsearch.logging.svc.cluster.local"
        - name: FLUENT_ELASTICSEARCH_PORT
          value: "9200"
        - name: FLUENT_ELASTICSEARCH_SCHEME
          value: "http"
        - name: FLUENT_UID
          value: "0"
        resources:
          limits:
            memory: 512Mi
            cpu: 500m
          requests:
            cpu: 100m
            memory: 200Mi
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: config
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
      - name: config
        configMap:
          name: fluentd-config
```

## Deploying Filebeat for Elastic Stack

Filebeat is a lightweight shipper for Elasticsearch:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: logging
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: container
      paths:
        - /var/log/containers/*.log
      processors:
      - add_kubernetes_metadata:
          host: ${NODE_NAME}
          matchers:
          - logs_path:
              logs_path: "/var/log/containers/"

    processors:
    - add_cloud_metadata:
    - add_host_metadata:

    output.elasticsearch:
      hosts: ['${ELASTICSEARCH_HOST:elasticsearch}:${ELASTICSEARCH_PORT:9200}']
      username: ${ELASTICSEARCH_USERNAME}
      password: ${ELASTICSEARCH_PASSWORD}

    setup.kibana:
      host: '${KIBANA_HOST:kibana}:${KIBANA_PORT:5601}'
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: logging
spec:
  selector:
    matchLabels:
      app: filebeat
  template:
    metadata:
      labels:
        app: filebeat
    spec:
      serviceAccountName: filebeat
      terminationGracePeriodSeconds: 30
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: filebeat
        image: docker.elastic.co/beats/filebeat:8.11.0
        args: [
          "-c", "/etc/filebeat.yml",
          "-e",
        ]
        env:
        - name: ELASTICSEARCH_HOST
          value: elasticsearch.logging.svc.cluster.local
        - name: ELASTICSEARCH_PORT
          value: "9200"
        - name: ELASTICSEARCH_USERNAME
          value: elastic
        - name: ELASTICSEARCH_PASSWORD
          valueFrom:
            secretKeyRef:
              name: elasticsearch-credentials
              key: password
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        securityContext:
          runAsUser: 0
        resources:
          limits:
            memory: 200Mi
            cpu: 200m
          requests:
            cpu: 100m
            memory: 100Mi
        volumeMounts:
        - name: config
          mountPath: /etc/filebeat.yml
          readOnly: true
          subPath: filebeat.yml
        - name: data
          mountPath: /usr/share/filebeat/data
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: varlog
          mountPath: /var/log
          readOnly: true
      volumes:
      - name: config
        configMap:
          defaultMode: 0640
          name: filebeat-config
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: varlog
        hostPath:
          path: /var/log
      - name: data
        hostPath:
          path: /var/lib/filebeat-data
          type: DirectoryOrCreate
      tolerations:
      - effect: NoSchedule
        operator: Exists
```

## Deploying Promtail for Loki

Promtail ships logs to Grafana Loki:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-config
  namespace: logging
data:
  promtail.yaml: |
    server:
      http_listen_port: 9080
      grpc_listen_port: 0

    positions:
      filename: /tmp/positions.yaml

    clients:
      - url: http://loki.logging.svc.cluster.local:3100/loki/api/v1/push

    scrape_configs:
      - job_name: kubernetes-pods
        kubernetes_sd_configs:
          - role: pod
        pipeline_stages:
          - cri: {}
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
          - source_labels:
              - __meta_kubernetes_pod_label_app_kubernetes_io_component
              - __meta_kubernetes_pod_label_component
            regex: ^;*([^;]+)(;.*)?$
            action: replace
            target_label: component
          - action: replace
            source_labels:
            - __meta_kubernetes_pod_node_name
            target_label: node_name
          - action: replace
            source_labels:
            - __meta_kubernetes_namespace
            target_label: namespace
          - action: replace
            replacement: $1
            separator: /
            source_labels:
            - namespace
            - app
            target_label: job
          - action: replace
            source_labels:
            - __meta_kubernetes_pod_name
            target_label: pod
          - action: replace
            source_labels:
            - __meta_kubernetes_pod_container_name
            target_label: container
          - replacement: /var/log/pods/*$1/*.log
            separator: /
            source_labels:
            - __meta_kubernetes_pod_uid
            - __meta_kubernetes_pod_container_name
            target_label: __path__
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
  namespace: logging
spec:
  selector:
    matchLabels:
      app: promtail
  template:
    metadata:
      labels:
        app: promtail
    spec:
      serviceAccountName: promtail
      containers:
      - name: promtail
        image: grafana/promtail:2.9.0
        args:
        - -config.file=/etc/promtail/promtail.yaml
        volumeMounts:
        - name: config
          mountPath: /etc/promtail
        - name: run
          mountPath: /run/promtail
        - name: pods
          mountPath: /var/log/pods
          readOnly: true
        - name: containers
          mountPath: /var/lib/docker/containers
          readOnly: true
        env:
        - name: HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        resources:
          limits:
            memory: 128Mi
            cpu: 200m
          requests:
            cpu: 50m
            memory: 64Mi
      volumes:
      - name: config
        configMap:
          name: promtail-config
      - name: run
        hostPath:
          path: /run/promtail
      - name: pods
        hostPath:
          path: /var/log/pods
      - name: containers
        hostPath:
          path: /var/lib/docker/containers
      tolerations:
      - effect: NoSchedule
        operator: Exists
```

## Implementing Log Filtering and Parsing

Add filtering to reduce noise and costs:

```yaml
# Fluentd filter configuration
<filter kubernetes.**>
  @type grep
  <exclude>
    key log
    pattern /healthcheck/
  </exclude>
  <exclude>
    key $.kubernetes.namespace_name
    pattern /^kube-system$/
  </exclude>
</filter>

<filter kubernetes.**>
  @type parser
  key_name log
  reserve_data true
  <parse>
    @type json
  </parse>
</filter>

<filter kubernetes.**>
  @type record_transformer
  <record>
    cluster_name ${ENV['CLUSTER_NAME']}
    region ${ENV['REGION']}
  </record>
</filter>
```

## Handling Multi-Line Logs

Configure parsers for multi-line logs like stack traces:

```yaml
# Filebeat multiline configuration
filebeat.inputs:
- type: container
  paths:
    - /var/log/containers/*.log
  multiline.type: pattern
  multiline.pattern: '^[[:space:]]+(at|\.\.\.)[[:space:]]+\b|^Caused by:'
  multiline.negate: false
  multiline.match: after
```

For Java stack traces in Fluentd:

```yaml
<source>
  @type tail
  path /var/log/containers/*java*.log
  pos_file /var/log/fluentd-java.log.pos
  tag kubernetes.java.*
  <parse>
    @type multiline
    format_firstline /^\d{4}-\d{2}-\d{2}/
    format1 /^(?<time>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.\d{3}) (?<level>[^\s]+) (?<message>.*)/
  </parse>
</source>
```

## Optimizing Log Collection Performance

Implement buffering and batching for efficiency:

```yaml
# Fluentd buffer configuration
<match kubernetes.**>
  @type elasticsearch
  <buffer>
    @type file
    path /var/log/fluentd-buffers/kubernetes.buffer
    flush_mode interval
    flush_interval 5s
    flush_thread_count 2
    chunk_limit_size 5M
    queue_limit_length 32
    retry_type exponential_backoff
    retry_wait 1s
    retry_max_interval 60s
    retry_timeout 1h
    overflow_action block
  </buffer>
</match>
```

Set appropriate resource limits:

```yaml
resources:
  limits:
    memory: 512Mi
    cpu: 500m
  requests:
    memory: 200Mi
    cpu: 100m
```

## Monitoring Log Collection

Track collector health with Prometheus:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: log-collector-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: log-collection
      rules:
      - alert: LogCollectorDown
        expr: up{job="fluentd"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Log collector down on {{ $labels.instance }}"

      - alert: LogCollectorBufferFull
        expr: fluentd_output_status_buffer_queue_length / fluentd_output_status_buffer_queue_limit > 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Log collector buffer nearly full"

      - alert: HighLogDropRate
        expr: rate(fluentd_output_status_num_errors[5m]) > 10
        labels:
          severity: critical
        annotations:
          summary: "High log drop rate detected"
```

## Best Practices

Filter logs before shipping to reduce costs. Exclude health checks, debug logs from non-production namespaces, and other noise.

Use persistent buffers to prevent log loss during collector restarts or backend unavailability.

Implement proper resource limits. Undersized collectors drop logs under load. Oversized collectors waste node capacity.

Parse logs near the source. Extracting fields early enables better filtering and reduces data transfer.

Monitor collector performance. Track buffer usage, error rates, and throughput to identify issues before log loss occurs.

## Conclusion

DaemonSets provide the ideal deployment model for log collection agents in Kubernetes. By ensuring every node runs a collector, you maintain comprehensive log coverage across your infrastructure. Whether using Fluentd, Filebeat, Promtail, or custom collectors, the DaemonSet pattern guarantees logs flow from all nodes to your centralized logging system, enabling effective troubleshooting and observability.

Implement robust log collection with DaemonSets to gain full visibility into your cluster operations.
