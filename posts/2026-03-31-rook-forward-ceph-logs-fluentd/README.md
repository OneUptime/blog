# How to Forward Ceph Logs to Fluentd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Fluentd, Logging, Kubernetes, Log Forwarding

Description: Configure Fluentd to collect and forward Rook-managed Ceph daemon logs to any supported output backend including Elasticsearch, S3, or a custom HTTP endpoint.

---

Fluentd is a flexible log aggregator that can collect Ceph logs from Kubernetes pods and route them to multiple backends simultaneously. Its plugin ecosystem supports Elasticsearch, S3, Kafka, Splunk, and many other destinations.

## Deploy Fluentd as a DaemonSet

Create a Fluentd configuration for Ceph log collection:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-ceph-config
  namespace: rook-ceph
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/rook-ceph-*.log
      pos_file /var/log/fluentd-ceph.log.pos
      tag ceph.*
      read_from_head true
      <parse>
        @type json
        time_key time
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    <filter ceph.**>
      @type record_transformer
      <record>
        cluster_name "#{ENV['CEPH_CLUSTER_NAME']}"
        environment "#{ENV['ENVIRONMENT']}"
        hostname "#{Socket.gethostname}"
      </record>
    </filter>

    <match ceph.**>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      index_name ceph-logs
      include_timestamp true
      <buffer>
        @type file
        path /var/log/fluentd-buffers/ceph
        flush_mode interval
        flush_interval 30s
        chunk_limit_size 2M
        queue_limit_length 32
        retry_forever true
        retry_max_interval 30
      </buffer>
    </match>
```

Deploy the DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-ceph
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: fluentd-ceph
  template:
    metadata:
      labels:
        app: fluentd-ceph
    spec:
      serviceAccountName: fluentd
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1.16-debian-elasticsearch8-1
        env:
        - name: CEPH_CLUSTER_NAME
          value: "prod-ceph"
        - name: ENVIRONMENT
          value: "production"
        volumeMounts:
        - name: config
          mountPath: /fluentd/etc
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: config
        configMap:
          name: fluentd-ceph-config
      - name: varlog
        hostPath:
          path: /var/log
```

## Route Logs to Multiple Outputs

Use Fluentd's `copy` plugin to send logs to multiple destinations:

```yaml
<match ceph.**>
  @type copy
  <store>
    @type elasticsearch
    host elasticsearch.logging.svc.cluster.local
    port 9200
    index_name ceph-logs
  </store>
  <store>
    @type s3
    aws_key_id "#{ENV['AWS_ACCESS_KEY_ID']}"
    aws_sec_key "#{ENV['AWS_SECRET_ACCESS_KEY']}"
    s3_bucket ceph-logs-archive
    s3_region us-east-1
    path ceph/logs/
  </store>
</match>
```

## Verify Log Forwarding

Check Fluentd pod logs to confirm shipping is working:

```bash
kubectl -n rook-ceph logs -l app=fluentd-ceph --tail=50 | grep -E "error|warn|flush"
```

## Summary

Fluentd's plugin-based architecture makes it ideal for forwarding Ceph logs to multiple destinations from a single DaemonSet deployment. Using buffered outputs with retry logic ensures no log messages are lost during network interruptions or backend outages.
