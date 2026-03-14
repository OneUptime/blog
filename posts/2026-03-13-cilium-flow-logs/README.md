# Cilium Flow Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Flow Logs, Hubble, Security

Description: Configure Cilium Hubble flow log export to persistent storage or SIEM systems to enable security auditing, compliance reporting, and forensic investigation of network activity.

---

## Introduction

Network flow logs are a fundamental requirement for security compliance, forensic investigation, and audit trail requirements in regulated industries. In cloud environments, providers offer VPC flow logs that record all network traffic at the subnet level. In Kubernetes, Cilium's Hubble flow logs provide the same capability with far richer context: every flow record includes the Kubernetes pod name, namespace, labels, service name, protocol details, and policy verdict, not just source and destination IPs.

Hubble flow logs can be exported in multiple formats: to files on each node for integration with log shipping agents, to a SIEM system via Fluentd or Fluentbit, or directly to object storage like S3 via the Hubble export feature. For security auditing purposes, the policy verdict field is particularly valuable — it creates an audit trail of every connection that was allowed or denied, with the specific policy rule that made the decision.

This guide covers configuring Hubble flow log export, shipping logs to a centralized system, and building queries for security auditing.

## Prerequisites

- Cilium with Hubble relay enabled
- Log shipping infrastructure (Fluentbit, Logstash, or similar)
- Storage backend (Elasticsearch, Loki, S3, or similar)
- `kubectl` installed

## Step 1: Enable Hubble Flow Log Export to File

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set hubble.export.static.enabled=true \
  --set hubble.export.static.filePath=/var/run/cilium/hubble/events.log \
  --set hubble.export.static.fieldMask=""
```

Verify log file is being written:

```bash
kubectl exec -n kube-system cilium-xxxxx -- \
  tail -f /var/run/cilium/hubble/events.log
```

## Step 2: Configure Hubble Flow Filtering for Export

Export only security-relevant events (drops and L7 events):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:
  hubble-export-allowlist: |
    {"verdict":["DROPPED","ERROR"]}
  hubble-export-denylist: |
    {"source_pod":["kube-system/.*"]}
```

## Step 3: Ship Flow Logs with Fluentbit

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentbit-config
  namespace: kube-system
data:
  fluent-bit.conf: |
    [INPUT]
        Name tail
        Path /var/run/cilium/hubble/events.log
        Parser json
        Tag cilium.flows

    [FILTER]
        Name record_modifier
        Match cilium.flows
        Record cluster my-cluster

    [OUTPUT]
        Name es
        Match cilium.flows
        Host elasticsearch.monitoring
        Port 9200
        Index cilium-flows
        Type _doc
```

## Step 4: Query Flow Logs for Security Auditing

In Elasticsearch/Kibana or Loki, query for security events:

```bash
# Elasticsearch query for policy drops
GET cilium-flows/_search
{
  "query": {
    "term": { "verdict": "DROPPED" }
  },
  "sort": [{ "@timestamp": "desc" }]
}

# Loki query for all drops from production namespace
{job="cilium-flows"} | json | verdict="DROPPED" | source_namespace="production"
```

## Step 5: Configure Dynamic Export with Filters

```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumNetworkPolicy
metadata:
  name: hubble-export-config
spec: {}

# Use hubble CLI for dynamic filtering
hubble observe \
  --verdict DROPPED \
  --output json \
  | tee /var/log/cilium-drops.json
```

## Flow Log Pipeline

```mermaid
flowchart LR
    A[eBPF Network Events] --> B[Hubble Agent\nper node]
    B -->|Flow records| C[/var/run/cilium/\nhubble/events.log]
    C -->|Tail| D[Fluentbit/Fluentd]
    D -->|Ship| E[Elasticsearch\nor Loki]
    E --> F[Kibana/Grafana\nSecurity Dashboard]
    E --> G[SIEM System]
```

## Conclusion

Hubble flow logs give you a comprehensive, Kubernetes-aware audit trail of all network activity in your cluster. The combination of pod identity, policy verdict, and protocol details in each flow record makes these logs far more useful for security auditing than traditional VPC flow logs which only show IP addresses. Configure export filtering to capture all DROPPED verdicts as the minimum security audit requirement, and add L7 HTTP flow logging for applications that handle sensitive data. Ship logs to your SIEM or SIEM-compatible storage for long-term retention and compliance reporting.
