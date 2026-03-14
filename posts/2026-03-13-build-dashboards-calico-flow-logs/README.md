# How to Build Dashboards for Calico Flow Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Observability

Description: Build Grafana and Kibana dashboards for Calico flow logs to visualize traffic patterns, identify top talkers, and track denied traffic rates for network security monitoring.

---

## Introduction

Flow log dashboards transform raw connection data into actionable network visibility. Key dashboards for Calico flow logs include: traffic volume by namespace (capacity planning), top denied sources (security monitoring), connection graph by service (dependency mapping), and denied traffic rate over time (policy change impact detection).

## Key Commands

```bash
# View flow logs directly from a calico-node pod
CALICO_POD=$(kubectl get pods -n calico-system -l k8s-app=calico-node   -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n calico-system "${CALICO_POD}" -c calico-node --   tail -20 /var/log/calico/flowlogs/flows.log 2>/dev/null

# Filter for denied flows
kubectl exec -n calico-system "${CALICO_POD}" -c calico-node --   grep "deny\|Deny" /var/log/calico/flowlogs/flows.log | tail -10

# Check flow log configuration
kubectl get felixconfiguration default -o yaml |   grep -i "flowLog"
```

## Flow Log Format

```
# Example flow log entry (abbreviated):
# StartTime | EndTime | SrcIP | DstIP | Proto | SrcPort | DstPort | 
# Packets | Bytes | Action | SrcNamespace | SrcPod | DstNamespace | DstSvc

# Allowed flow example:
# 2026-03-13T10:00:00 | 192.168.1.5 | 192.168.2.10 | TCP | 54321 | 8080 | 
# 12 pkts | 1500 bytes | Allow | default | frontend-abc | production | backend

# Denied flow example:
# 2026-03-13T10:00:05 | 192.168.1.5 | 192.168.3.1 | TCP | 54322 | 5432 |
# 1 pkt | 60 bytes | Deny | default | frontend-abc | database | postgres
```

## Architecture

```mermaid
flowchart LR
    A[Connections] --> B[Felix captures flow metadata]
    B --> C[/var/log/calico/flowlogs/]
    C --> D[Fluent Bit DaemonSet]
    D --> E[Elasticsearch / Loki]
    E --> F[Grafana / Kibana dashboards]
    E --> G[Alerting rules]
```

## Conclusion

Calico flow logs provide the connection-level detail that no other Calico diagnostic can offer. The most valuable operational use case is denied traffic analysis — flow logs show exactly which connections are being blocked, by which policy, enabling rapid policy debugging. Validate the flow log pipeline periodically by generating known test connections and verifying they appear with the correct attributes in your aggregation system.
