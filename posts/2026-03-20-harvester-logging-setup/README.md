# How to Configure Harvester Logging - Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Logging, Kubernetes, FluentBit, Elasticsearch, Loki, SUSE Rancher

Description: Learn how to enable and configure Harvester's centralized logging system to collect VM audit logs, system logs, and Kubernetes component logs for compliance and troubleshooting.

---

Harvester's logging system collects logs from the underlying Kubernetes components and Harvester system components. Kubernetes audit logs can also be shipped to Elasticsearch, Loki, Splunk, or other backends.

---

## Step 1: Enable Logging in Harvester

In the Harvester UI:

1. Go to **Advanced > Addons**
2. Select the **rancher-logging** add-on
3. Click **⋮ > Enable**

The `rancher-logging` add-on is the supported way to enable centralized logging in Harvester.

---

## Step 2: Configure a Log Output to Elasticsearch

```yaml
# clusteroutput-elasticsearch.yaml

apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: harvester-elasticsearch
  namespace: cattle-logging-system
spec:
  elasticsearch:
    host: elasticsearch.logging.example.com
    port: 9200
    scheme: https
    index_name: harvester-logs
    user: elastic
    password:
      valueFrom:
        secretKeyRef:
          name: elastic-creds
          key: password
    buffer:
      flush_interval: 30s
      chunk_limit_size: 8MB
```

---

## Step 3: Configure a Flow for Harvester Logs

```yaml
# clusterflow-harvester.yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: harvester-system-logs
  namespace: cattle-logging-system
spec:
  filters:
    - record_transformer:
        records:
          - harvester_cluster: "harvester-prod"
          - environment: "production"
  match:
    - select: {}
  globalOutputRefs:
    - harvester-elasticsearch
```

---

## Step 4: Collect Kubernetes Audit Logs

Harvester routes Kubernetes audit logs through a dedicated `loggingRef`, so use a separate `ClusterOutput` and `ClusterFlow` for audit records:

```yaml
# harvester-audit-elasticsearch.yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: harvester-audit-elasticsearch
  namespace: cattle-logging-system
spec:
  elasticsearch:
    host: elasticsearch.logging.example.com
    port: 9200
    scheme: https
    index_name: harvester-audit-logs
    user: elastic
    password:
      valueFrom:
        secretKeyRef:
          name: elastic-creds
          key: password
    buffer:
      flush_interval: 30s
      chunk_limit_size: 8MB
  loggingRef: harvester-kube-audit-log-ref
---
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: harvester-audit-logs
  namespace: cattle-logging-system
spec:
  globalOutputRefs:
    - harvester-audit-elasticsearch
  loggingRef: harvester-kube-audit-log-ref
```

---

## Step 5: Configure Log Retention

If your Elasticsearch deployment uses an index template or data stream for Harvester logs, create the policy in Elasticsearch and apply it there.

```http
PUT /_ilm/policy/harvester-logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "10gb",
            "max_age": "7d"
          }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

---

## Option: Ship to Loki Instead of Elasticsearch

Replace the output reference in your `ClusterFlow` with `harvester-loki` and create this `ClusterOutput`:

```yaml
# clusteroutput-loki.yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: harvester-loki
  namespace: cattle-logging-system
spec:
  loki:
    url: http://loki.monitoring.svc.cluster.local:3100
    extra_labels:
      cluster: harvester-prod
    buffer:
      timekey: 1m
      timekey_wait: 30s
      timekey_use_utc: true
```

---

## Best Practices

- Enable Kubernetes audit logging for compliance and to track VM-related API actions.
- Ship logs to a system outside the Harvester cluster for disaster recovery coverage.
- Add the `harvester_cluster` label to all log records for easy filtering when aggregating multiple Harvester clusters.
- Set log retention based on your compliance requirements - many regulations require 90-365 days.
