# How to Set Up FluentD for Dapr Log Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Fluentd, Logging, Kubernetes, Observability

Description: Configure FluentD as a DaemonSet to collect Dapr sidecar logs from all Kubernetes nodes and forward them to your log storage backend.

---

FluentD is a widely used log collector for Kubernetes that can aggregate Dapr sidecar logs from all nodes and forward them to Elasticsearch, Splunk, or other backends. This guide shows how to set up FluentD as a DaemonSet with Dapr-specific parsing rules.

## Architecture

FluentD runs as a DaemonSet - one pod per node. It reads container logs from the node filesystem at `/var/log/containers/`, parses JSON logs, and forwards them to your chosen backend.

## Step 1 - Create the FluentD ConfigMap

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
      path /var/log/containers/*daprd*.log
      pos_file /var/log/fluentd-dapr.log.pos
      tag dapr.*
      read_from_head true
      <parse>
        @type json
        time_key time
        time_type string
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    # Add Kubernetes metadata
    <filter dapr.**>
      @type kubernetes_metadata
    </filter>

    # Add Dapr-specific fields
    <filter dapr.**>
      @type record_transformer
      enable_ruby true
      <record>
        dapr_app_id ${record.dig("kubernetes", "annotations", "dapr.io/app-id") || "unknown"}
        log_source "dapr-sidecar"
      </record>
    </filter>

    # Forward to Elasticsearch
    <match dapr.**>
      @type elasticsearch
      host elasticsearch.logging
      port 9200
      logstash_format true
      logstash_prefix dapr
      <buffer>
        @type file
        path /var/log/fluentd-buffers/dapr
        flush_thread_count 2
        flush_interval 5s
        chunk_limit_size 2M
        queue_limit_length 32
        retry_max_interval 30
        retry_forever true
      </buffer>
    </match>
```

## Step 2 - Deploy FluentD as a DaemonSet

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: logging
spec:
  selector:
    matchLabels:
      name: fluentd
  template:
    metadata:
      labels:
        name: fluentd
    spec:
      serviceAccountName: fluentd
      tolerations:
      - key: node-role.kubernetes.io/control-plane
        effect: NoSchedule
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1.16-debian-elasticsearch7-1
        env:
        - name: FLUENT_ELASTICSEARCH_HOST
          value: "elasticsearch.logging"
        - name: FLUENT_ELASTICSEARCH_PORT
          value: "9200"
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
        - name: config
          mountPath: /fluentd/etc
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: config
        configMap:
          name: fluentd-config
```

```bash
kubectl apply -f fluentd-daemonset.yaml
```

## Step 3 - Create RBAC for FluentD

FluentD needs permission to read pod metadata:

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
  resources: [pods, namespaces]
  verbs: [get, list, watch]
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

## Step 4 - Verify Log Collection

```bash
# Check FluentD is running on all nodes
kubectl get pods -n logging -l name=fluentd

# Check FluentD logs for errors
kubectl logs -n logging daemonset/fluentd | tail -20

# Query Elasticsearch for Dapr logs
curl http://localhost:9200/dapr-*/_search \
  -H "Content-Type: application/json" \
  -d '{"query":{"match":{"dapr_app_id":"order-service"}},"size":10}' | jq .
```

## Summary

FluentD collects Dapr sidecar logs by watching `/var/log/containers/*daprd*.log` on each Kubernetes node. Enable JSON logging in Dapr (`dapr.io/log-as-json: "true"`) so FluentD can parse structured fields. Use the `kubernetes_metadata` filter to add pod labels including the Dapr app ID, enabling per-service log filtering in your backend.
