# How to Monitor ContainerCreating After Uninstalling Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting

Description: Monitor for pods stuck in ContainerCreating during or after Calico CNI removal using pod phase metrics and CNI health checks.

---

## Introduction

During Calico CNI removal, monitoring ContainerCreating pod counts provides real-time visibility into whether pod sandbox and network setup is functioning. A rising ContainerCreating count can indicate that new pods are not able to get network configuration - a strong signal to investigate the CNI layer.

Setting up monitoring before the migration begins ensures you have a dashboard and alerts ready when the removal happens. This is especially important for automated migrations where the removal is scripted and may proceed faster than manual oversight can track.

## Symptoms

- ContainerCreating pod count rising during or after CNI removal
- Alert fires on pod startup or network setup failures
- Nodes report NetworkUnavailable=true in node conditions

## Root Causes

- Calico removed before a replacement CNI is ready
- Missing or stale CNI configuration on nodes
- Kubelet reports the runtime network as not ready

## Diagnosis Steps

```bash
# Real-time ContainerCreating count

kubectl get pods --all-namespaces | grep ContainerCreating | wc -l
```

## Solution

**Step 1: Alert on ContainerCreating pods**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pod-containercreating-alerts
  namespace: monitoring
spec:
  groups:
  - name: pod.scheduling
    rules:
    - alert: PodsStuckContainerCreating
      expr: |
        sum by (namespace) (kube_pod_container_status_waiting_reason{reason="ContainerCreating"} == 1) > 5
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Multiple pods stuck in ContainerCreating in {{ $labels.namespace }}"
        description: "{{ $value }} containers waiting with reason ContainerCreating - possible CNI failure"
    - alert: NodeCNINotReady
      expr: |
        kube_node_status_condition{condition="NetworkUnavailable",status="true"} == 1
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Node {{ $labels.node }} reports network unavailable"
```

**Step 2: Watch migration progress**

```bash
# During CNI migration - watch ContainerCreating in real-time
watch -n5 "kubectl get pods --all-namespaces | grep -E 'ContainerCreating|Pending' | head -20"
```

**Step 3: Monitor node CNI readiness**

```bash
# Check node conditions for network availability
kubectl get nodes -o json | jq '.items[] | {name: .metadata.name, conditions: [.status.conditions[] | select(.type=="NetworkUnavailable")]}'
```

```mermaid
flowchart LR
    A[CNI migration starts] --> B[Watch: ContainerCreating count]
    B --> C{Count rising?}
    C -- Yes --> D[Alert: CNI failure]
    D --> E[Check /etc/cni/net.d/ on nodes]
    C -- No --> F[Migration progressing normally]
    G[Node conditions] --> H{NetworkUnavailable=true?}
    H -- Yes --> D
```

## Prevention

- Set up monitoring before starting CNI migration
- Establish baseline ContainerCreating count to detect regression
- Alert on any node reporting NetworkUnavailable condition

## Conclusion

Monitoring ContainerCreating after Calico removal requires tracking container waiting reasons and node network condition status. Alerts on ContainerCreating counts and NetworkUnavailable node conditions provide fast detection of possible CNI failures during migration.
