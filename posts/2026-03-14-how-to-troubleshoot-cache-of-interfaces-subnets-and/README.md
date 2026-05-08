# Troubleshooting Interface and Subnet Cache Issues in Cilium IPAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, IPAM, Troubleshooting, Cloud Networking

Description: How to diagnose and resolve caching issues with interfaces, subnets, and virtual networks in Cilium IPAM for cloud-provider deployments.

---

## Introduction

When Cilium IPAM caches become stale or incorrect in cloud environments, pods may fail to get IP addresses, allocate IPs from wrong subnets, or experience slow startup times. Cache issues are particularly tricky because the Cilium agent and operator may appear healthy while the underlying data they rely on is outdated.

Common cache problems include: stale interface lists after node scaling, missing subnet information after network changes, API authentication failures preventing cache updates, and race conditions during rapid node provisioning.

## Prerequisites

- Kubernetes cluster on a cloud provider with Cilium
- kubectl and Cilium CLI configured
- Access to cloud provider console for verification

## Diagnosing Cache Issues

```bash
# Check operator logs for cache-related errors

kubectl logs -n kube-system deployment/cilium-operator | \
  grep -iE "cache|resync|interface|subnet" | tail -30

# Check recent Cilium-managed CiliumNode updates
kubectl get ciliumnode <node-name> -o json | \
  jq '.metadata.managedFields[] |
    select(.manager | test("cilium"; "i")) |
    {manager, operation, time}'

# Compare CiliumNode data with actual cloud state
kubectl get ciliumnodes -o json | jq '.items[] | {
  name: .metadata.name,
  azureInterfaces: ((.status.azure.interfaces // []) | length),
  awsENIs: ((.status.eni.enis // {}) | length),
  availableIPs: ((.spec.ipam.pool // {}) | length),
  usedIPs: ((.status.ipam.used // {}) | length),
  operatorStatus: (.status.ipam["operator-status"] // {})
}'
```

```mermaid
graph TD
    A[IPAM Cache Issue] --> B{Operator Healthy?}
    B -->|No| C[Fix Operator First]
    B -->|Yes| D{API Credentials Valid?}
    D -->|No| E[Update Credentials]
    D -->|Yes| F{Cache Refreshing?}
    F -->|No| G[Restart Operator]
    F -->|Yes| H{Data Correct?}
    H -->|No| I[Check Cloud Config]
```

## Fixing Stale Interface Cache

```bash
# Force cache refresh by restarting operator
kubectl rollout restart deployment/cilium-operator -n kube-system

# Wait for reconciliation
kubectl rollout status deployment/cilium-operator -n kube-system

# Verify interface data is updated
kubectl get ciliumnodes -o json | jq '.items[] | {
  name: .metadata.name,
  azureInterfaces: ((.status.azure.interfaces // []) | length),
  awsENIs: ((.status.eni.enis // {}) | length),
  availableIPs: ((.spec.ipam.pool // {}) | length),
  operatorStatus: (.status.ipam["operator-status"] // {})
}'
```

## Fixing API Authentication Issues

```bash
# Check operator logs for auth errors
kubectl logs -n kube-system deployment/cilium-operator | \
  grep -iE "auth|credential|permission|forbidden" | tail -20

# Verify cloud credentials are mounted
kubectl get deployment cilium-operator -n kube-system -o json | \
  jq '.spec.template.spec.containers[].env[]? |
    select(.name | test("AZURE|AWS|GCP"))'

# For Azure, check managed identity
kubectl logs -n kube-system deployment/cilium-operator | \
  grep -i "identity" | tail -10
```

## Handling Subnet Discovery Problems

```bash
# Check AWS subnet selectors and fallback subnet IDs configured on CiliumNodes
kubectl get ciliumnodes -o json | jq '.items[] | {
  name: .metadata.name,
  subnetIDs: (.spec.eni["subnet-ids"] // []),
  subnetTags: (.spec.eni["subnet-tags"] // {}),
  nodeSubnetID: (.spec.eni["node-subnet-id"] // null)
}'

# For Azure, check the subnets reported on interface addresses
kubectl get ciliumnodes -o json | jq '[.items[].status.azure.interfaces[]?.addresses[]?.subnet] | unique'
```

## Verification

```bash
# After fixes, verify Cilium is healthy
cilium status --wait

# Verify IPAM state and test IP allocation
kubectl get ciliumnodes -o json | jq '.items[] | {
  name: .metadata.name,
  availableIPs: ((.spec.ipam.pool // {}) | length),
  usedIPs: ((.status.ipam.used // {}) | length),
  operatorStatus: (.status.ipam["operator-status"] // {})
}'

kubectl run cache-test --image=nginx:1.27 --restart=Never
kubectl get pod cache-test -o wide
kubectl delete pod cache-test

# Verify operator sync
kubectl logs -n kube-system deployment/cilium-operator --since=5m | \
  grep -c "resync"
```

## Troubleshooting

- **Cache never refreshes**: Check operator has network access to cloud API endpoints.
- **Partial interface data**: Some interfaces may be filtered. Check operator IPAM configuration.
- **Subnet shows zero available IPs**: Verify in cloud console. May need to expand subnet.
- **Cache refresh causes agent restart**: Check if operator updates trigger agent reconciliation.

## Conclusion

IPAM cache issues in cloud environments require checking the full chain from cloud API credentials to operator sync to CiliumNode data. Force a cache refresh by restarting the operator, verify credentials if syncs fail, and compare cached data with actual cloud state to identify discrepancies.
