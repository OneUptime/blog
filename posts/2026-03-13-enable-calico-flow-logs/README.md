# How to Enable Calico Flow Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Observability

Description: Enable Calico flow logs to capture per-connection metadata including source pod, destination, bytes transferred, and policy decision for network observability and security audit use cases.

---

## Introduction

Calico flow logs capture metadata for every network connection passing through the Calico data plane: source and destination pod, namespace, bytes and packets transferred, and whether the connection was allowed or denied by network policy. This data is essential for network security auditing, capacity planning, and troubleshooting connectivity issues. Flow logs are available in open-source Calico via file-based logging and in Calico Enterprise/Cloud with additional aggregation and query capabilities.

## Prerequisites

- Calico installed (open-source, Enterprise, or Cloud)
- kubectl with cluster-admin access
- FelixConfiguration write access

## Step 1: Enable Flow Logs in FelixConfiguration

```yaml
# Enable flow logging via FelixConfiguration
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  # Enable flow log collection
  flowLogsFlushInterval: 15s        # Flush interval
  flowLogsFileEnabled: true         # Write to file (open-source)
  flowLogsFileMaxFiles: 5           # Number of rotated files to keep
  flowLogsFileMaxFileSizeMB: 100    # Max file size before rotation
  # Aggregation level: 0=per-flow, 1=per-pod, 2=per-namespace
  flowLogsFileAggregationKindForAllowed: 1
  flowLogsFileAggregationKindForDenied: 0  # Full detail for denies
```

```bash
# Apply the configuration
kubectl apply -f felixconfiguration-flow-logs.yaml

# Verify the change
kubectl get felixconfiguration default -o yaml | grep -i flow
```

## Step 2: Verify Flow Logs Are Being Written

```bash
# Check flow log files on a node
CALICO_POD=$(kubectl get pods -n calico-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n calico-system "${CALICO_POD}" -c calico-node -- \
  ls -la /var/log/calico/flowlogs/ 2>/dev/null

# View recent flow log entries
kubectl exec -n calico-system "${CALICO_POD}" -c calico-node -- \
  tail -5 /var/log/calico/flowlogs/flows.log 2>/dev/null
```

## Flow Log Architecture

```mermaid
flowchart LR
    A[Network connection] --> B[Felix intercepts]
    B --> C[Flow metadata captured]
    C --> D[File: /var/log/calico/flowlogs/]
    D --> E[Fluent Bit / Fluentd]
    E --> F[Elasticsearch / Loki]
    F --> G[Grafana / Kibana]
```

## Step 3: Ship Flow Logs to Centralized Storage

```yaml
# Fluent Bit configuration to collect Calico flow logs
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-calico-flows
  namespace: logging
data:
  calico-flows.conf: |
    [INPUT]
        Name    tail
        Path    /var/log/calico/flowlogs/*.log
        Tag     calico.flow.*
        DB      /var/log/fluent-bit-calico-flows.db

    [OUTPUT]
        Name    es
        Match   calico.flow.*
        Host    elasticsearch.logging.svc.cluster.local
        Index   calico-flows
```

## Conclusion

Enabling Calico flow logs requires a single FelixConfiguration change to activate file-based flow capture. The most important configuration decision is the aggregation level: per-flow (0) for full audit detail, per-pod (1) for security monitoring, or per-namespace (2) for capacity planning. Use different aggregation levels for allowed vs. denied traffic — full detail for denies to enable forensic analysis, aggregated for allows to manage log volume.
