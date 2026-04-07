# How to Set Up Centralized Logging for Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Logging, Observability, Kubernetes, Centralized Logging

Description: Set up centralized log collection for Rook-managed Ceph clusters using sidecar containers or DaemonSet-based log shippers to aggregate daemon logs in one place.

---

Ceph daemons running in Kubernetes pods write logs to stdout by default. Centralizing these logs into a log aggregation system makes it possible to search, correlate, and alert across all Ceph components from a single interface.

## Log Collection Architecture

Two common approaches for centralizing Ceph logs in Kubernetes:

1. **DaemonSet log shipper** (Fluentd, Fluent Bit, Promtail) - reads from node log directories
2. **Sidecar containers** - co-located with specific Ceph pods

## Collect Ceph Logs with Fluent Bit

Deploy Fluent Bit as a DaemonSet that reads Kubernetes pod logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Log_Level     info
        Daemon        off

    [INPUT]
        Name              tail
        Path              /var/log/containers/rook-ceph-*.log
        Parser            cri
        Tag               ceph.*
        Refresh_Interval  5

    [FILTER]
        Name  kubernetes
        Match ceph.*
        Kube_Tag_Prefix  ceph.var.log.containers.
        Merge_Log  On

    [OUTPUT]
        Name  es
        Match ceph.*
        Host  elasticsearch.logging.svc.cluster.local
        Port  9200
        Index ceph-logs
```

Apply the DaemonSet:

```bash
kubectl apply -f fluent-bit-ceph.yaml
```

## Direct Ceph Logs to stderr

Ensure Ceph daemons write logs to stderr so they are captured by the Kubernetes container logging infrastructure:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global log_to_file false

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global log_to_stderr true
```

## Deploy Promtail for Loki Integration

If using Grafana Loki, configure Promtail to scrape Ceph pod logs:

```yaml
scrape_configs:
- job_name: ceph
  kubernetes_sd_configs:
  - role: pod
    namespaces:
      names: [rook-ceph]
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_app]
    regex: rook-ceph-.*
    action: keep
  - source_labels: [__meta_kubernetes_pod_label_app]
    target_label: ceph_component
```

## Verify Log Collection

Search for recent Ceph logs in Elasticsearch:

```bash
curl -s "http://elasticsearch:9200/ceph-logs/_search?q=ceph_daemon:osd&size=5" | \
  python3 -m json.tool
```

Or query Loki using LogQL:

```bash
{job="ceph"} |= "slow request"
```

## Summary

Centralized logging for Ceph in Kubernetes is best achieved with a DaemonSet-based log shipper like Fluent Bit or Promtail that tails pod log files from the node. Configuring Ceph to log to stderr in a consistent format ensures logs are captured by the Kubernetes logging infrastructure and forwarded to your chosen aggregation backend.
