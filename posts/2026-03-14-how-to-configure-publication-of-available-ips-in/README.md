# Configuring Available IP Publication in Cilium IPAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, IPAM, Networking, Configuration

Description: How to configure Cilium IPAM to publish available IP counts, enabling external systems and autoscalers to make informed scheduling decisions.

---

## Introduction

Cilium IPAM modes that track per-node IP pools can publish the number of available IP addresses per node, which is useful for cluster autoscalers and custom scheduling logic. When external systems know how many IPs are available on each node, they can make better decisions about where to schedule pods and when to scale the cluster.

IP availability publication works through the CiliumNode custom resource, where each node reports its current IP pool status. In CRD-backed and cloud-provider IPAM modes, available IPs are stored in fields such as `spec.ipam.pool` or `spec.ipam.available`, while allocated addresses are reported under `status.ipam.used`. This data is accessible via the Kubernetes API and can be consumed by monitoring systems, autoscalers, and custom controllers.

This guide covers configuring IP availability publication and integrating it with common cluster management tools.

## Prerequisites

- Kubernetes cluster with Cilium installed (v1.18+) using CRD-backed or cloud-provider IPAM
- kubectl and Helm v3 configured
- Optional: Cluster autoscaler or custom controller

## Enabling IP Availability Publication

IP availability data is published in CiliumNode resources by supported IPAM modes. Verify it is working:

```bash
# Check CiliumNode for IP availability data

kubectl get ciliumnodes -o json | jq '.items[] | {
  name: .metadata.name,
  total_pool: (.spec.ipam.pool // .spec.ipam.available // {} | length),
  used: (.status.ipam.used // {} | length)
}'
```

### Configuring the Operator for Publication

```yaml
# cilium-ip-publication.yaml
azure:
  enabled: true
ipam:
  mode: azure
  nodeSpec:
    ipamPreAllocate: 10
operator:
  replicas: 2
  prometheus:
    enabled: true
```

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  -f cilium-ip-publication.yaml
```

## Reading Published IP Data

```bash
# Get available IPs per node
kubectl get ciliumnodes -o json | jq -r '.items[] |
  "\(.metadata.name): available=\((.spec.ipam.pool // .spec.ipam.available // {} | length) - (.status.ipam.used // {} | length))"'

# Watch for changes in real time
kubectl get ciliumnodes -w
```

```mermaid
graph LR
    A[Cilium Agent] --> B[CiliumNode CR]
    B --> C[Available IP Count]
    C --> D[Cluster Autoscaler]
    C --> E[Custom Scheduler]
    C --> F[Monitoring System]
```

## Integration with Cluster Autoscaler

```bash
#!/bin/bash
# check-ip-capacity.sh - Use as pre-scale check

MIN_AVAILABLE=10
LOW_NODES=0

kubectl get ciliumnodes -o json | jq -r --argjson min "$MIN_AVAILABLE" '
  .items[] |
  ((.spec.ipam.pool // .spec.ipam.available // {} | length) - (.status.ipam.used // {} | length)) as $avail |
  if $avail < $min then
    "LOW: \(.metadata.name) has \($avail) IPs available"
  else empty end'
```

## Monitoring Published Data

For AWS, Azure, and Alibaba Cloud IPAM modes, Cilium operator exposes per-node IPAM metrics:

```promql
# Track available IPs per node
cilium_operator_ipam_available_ips

# Alert when nodes are running low
cilium_operator_ipam_available_ips < 10
```

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-ip-availability
  namespace: monitoring
spec:
  groups:
    - name: ip-availability
      rules:
        - alert: LowIPAvailability
          expr: cilium_operator_ipam_available_ips < 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Node {{ $labels.target_node }} has fewer than 10 IPs available"
```

## Verification

```bash
cilium status | grep IPAM
kubectl get ciliumnodes -o wide
kubectl run test-ip --image=nginx:1.27 --restart=Never
kubectl get pod test-ip -o wide
kubectl delete pod test-ip
```

## Troubleshooting

- **CiliumNode shows no pool data**: Check IPAM mode is configured. Verify operator is running.
- **Available count seems wrong**: Agent may be behind on reporting. Wait for next sync cycle.
- **Autoscaler not reading data**: Verify the autoscaler has RBAC to read CiliumNode resources.
- **Data not updating**: Restart the agent on the affected node.

## Conclusion

Publishing available IP counts through CiliumNode resources enables intelligent scheduling and capacity planning. Integrate this data with your cluster autoscaler and monitoring to prevent IP exhaustion and ensure smooth pod scheduling.
