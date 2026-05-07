# How to Send Logs to Fluentd from Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging, Fluentd

Description: Configure Rancher to forward Kubernetes logs to an external Fluentd aggregator for centralized log processing.

While Rancher includes an internal Fluentd instance for log routing, many organizations run a dedicated external Fluentd aggregator for centralized log processing across multiple clusters. This guide covers configuring Rancher to forward logs to an external Fluentd instance using the forward protocol.

## Prerequisites

- Rancher v2.6 or later with the Logging chart installed.
- An external Fluentd aggregator accessible from the cluster.
- Cluster admin permissions.

## Step 1: Set Up an External Fluentd Aggregator

Configure your external Fluentd aggregator to accept forwarded logs:

```xml
# fluentd.conf on the aggregator

<source>
  @type forward
  port 24224
  bind 0.0.0.0

  <transport tls>
    cert_path /etc/fluentd/tls/server.crt
    private_key_path /etc/fluentd/tls/server.key
    ca_path /etc/fluentd/tls/ca.crt
  </transport>

  <security>
    shared_key your-shared-key
    self_hostname fluentd-aggregator
  </security>
</source>

<match kubernetes.**>
  @type elasticsearch
  host elasticsearch.example.com
  port 9200
  logstash_format true
  logstash_prefix kubernetes
</match>
```

## Step 2: Create Shared Key Secret

```bash
kubectl create secret generic fluentd-forward-secret \
  --namespace cattle-logging-system \
  --from-literal=shared-key='your-shared-key'
```

If using TLS with a custom CA, also create a CA certificate secret:

```bash
kubectl create secret generic fluentd-forward-tls \
  --namespace cattle-logging-system \
  --from-file=ca.crt=/path/to/ca.crt
```

## Step 3: Create a ClusterOutput for Fluentd Forward

### Basic Configuration

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: fluentd-forward-output
  namespace: cattle-logging-system
spec:
  forward:
    servers:
      - host: fluentd-aggregator.example.com
        port: 24224
    buffer:
      type: file
      path: /buffers/forward
      chunk_limit_size: 8MB
      total_limit_size: 2GB
      flush_interval: 5s
      flush_thread_count: 2
      retry_max_interval: 30s
      retry_forever: true
```

### With Authentication and TLS

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: fluentd-forward-secure
  namespace: cattle-logging-system
spec:
  forward:
    servers:
      - host: fluentd-aggregator.example.com
        port: 24224
        shared_key:
          valueFrom:
            secretKeyRef:
              name: fluentd-forward-secret
              key: shared-key
    transport: tls
    tls_cert_path:
      mountFrom:
        secretKeyRef:
          name: fluentd-forward-tls
          key: ca.crt
    tls_verify_hostname: true
    require_ack_response: true
    send_timeout: 60
    heartbeat_type: tcp
    buffer:
      type: file
      path: /buffers/forward-secure
      chunk_limit_size: 8MB
      total_limit_size: 5GB
      flush_interval: 5s
      retry_forever: true
```

## Step 4: Configure Multiple Fluentd Servers

For high availability, configure multiple aggregator servers:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: fluentd-forward-ha
  namespace: cattle-logging-system
spec:
  forward:
    servers:
      - host: fluentd-1.example.com
        port: 24224
        weight: 60
      - host: fluentd-2.example.com
        port: 24224
        weight: 40
      - host: fluentd-standby.example.com
        port: 24224
        standby: true
    heartbeat_type: tcp
    heartbeat_interval: 10
    require_ack_response: true
    buffer:
      type: file
      path: /buffers/forward-ha
      chunk_limit_size: 8MB
      flush_interval: 5s
      retry_forever: true
```

The `weight` parameter controls load balancing between primary servers. The `standby` server only receives traffic when primary servers are down.

## Step 5: Create a ClusterFlow

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: forward-all-logs
  namespace: cattle-logging-system
spec:
  filters:
    - record_transformer:
        records:
          - source_cluster: "production-us-east-1"
            environment: "production"

  globalOutputRefs:
    - fluentd-forward-output
```

## Step 6: Tag-Based Routing

Retag logs for routing on the aggregator side:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: tagged-logs
  namespace: cattle-logging-system
spec:
  filters:
    - tag_normaliser:
        format: "kubernetes.${namespace_name}.${pod_name}.${container_name}"

  globalOutputRefs:
    - fluentd-forward-output
```

On the aggregator, use tag-based matching:

```xml
<match kubernetes.production.**>
  @type elasticsearch
  index_name production-logs
</match>

<match kubernetes.staging.**>
  @type elasticsearch
  index_name staging-logs
</match>
```

## Step 7: Configure Compression

If your installed Logging chart version supports the `forward.compress` field, enable gzip compression for network efficiency:

```yaml
spec:
  forward:
    servers:
      - host: fluentd-aggregator.example.com
        port: 24224
    compress: gzip
    buffer:
      type: file
      path: /buffers/forward-compressed
      compress: gzip
      chunk_limit_size: 8MB
      flush_interval: 5s
      retry_forever: true
```

## Step 8: Deploy Fluentd Aggregator in Kubernetes

Create a ConfigMap from the `fluentd.conf` in Step 1 and deploy the aggregator inside the cluster:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: fluentd-aggregator
  namespace: logging
spec:
  serviceName: fluentd-aggregator
  replicas: 2
  selector:
    matchLabels:
      app: fluentd-aggregator
  template:
    metadata:
      labels:
        app: fluentd-aggregator
    spec:
      containers:
        - name: fluentd
          image: fluent/fluentd-aggregator:latest
          ports:
            - containerPort: 24224
              name: forward
          volumeMounts:
            - name: config
              mountPath: /fluentd/etc
            - name: buffer
              mountPath: /fluentd/buffer
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
      volumes:
        - name: config
          configMap:
            name: fluentd-aggregator-config
  volumeClaimTemplates:
    - metadata:
        name: buffer
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: fluentd-aggregator
  namespace: logging
spec:
  clusterIP: None
  selector:
    app: fluentd-aggregator
  ports:
    - port: 24224
      targetPort: 24224
      name: forward
```

## Step 9: Verify Log Forwarding

Check Fluentd output logs:

```bash
kubectl get pods -n cattle-logging-system
kubectl logs -n cattle-logging-system <fluentd-pod-name> -c fluentd | grep -i forward
```

On the aggregator side, check incoming log count:

```bash
# If the aggregator exposes Prometheus metrics
curl http://<aggregator-host>:24231/metrics | grep fluentd_input_status_num_records_total
```

## Troubleshooting

- **Connection refused**: Verify the aggregator is running and listening on the correct port.
- **Authentication error**: Check that shared keys match on both sides.
- **TLS handshake failure**: Verify certificates are correct and not expired.
- **High buffer usage**: The aggregator may be slow or unreachable. Check aggregator health.
- **Duplicate logs**: Use `require_ack_response: true` for at-least-once delivery, then check for downstream retries or replays.

## Summary

Forwarding logs to an external Fluentd aggregator from Rancher uses the Fluentd forward protocol through ClusterOutputs. Configure server addresses, authentication, TLS, and buffer settings for reliable log delivery. Use multiple servers with weights and standby nodes for high availability, and enable compression for network efficiency.
