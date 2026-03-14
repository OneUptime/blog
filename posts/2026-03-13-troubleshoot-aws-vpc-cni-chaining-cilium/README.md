# Troubleshoot AWS VPC CNI Chaining with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, EKS, AWS, eBPF

Description: A troubleshooting guide for diagnosing and resolving common issues when running Cilium in chained mode with the AWS VPC CNI plugin on EKS.

---

## Introduction

Cilium can run in "chained" mode alongside the AWS VPC CNI plugin on EKS, where AWS VPC CNI handles IP address allocation and Cilium provides eBPF-based network policy enforcement and observability. This architecture preserves native VPC networking while adding Cilium's security and visibility capabilities.

However, the chained configuration introduces additional complexity that can lead to subtle connectivity issues, policy enforcement failures, and dataplane conflicts. Troubleshooting these issues requires understanding both the AWS VPC CNI and Cilium data paths and how they interact.

This guide covers the most common issues encountered with AWS VPC CNI + Cilium chaining and provides diagnostic steps and resolutions for each.

## Prerequisites

- EKS cluster with AWS VPC CNI installed
- Cilium installed in chained mode
- `kubectl` with cluster admin access
- `cilium` CLI installed
- AWS CLI configured with appropriate permissions

## Step 1: Verify Cilium Chaining Mode Configuration

Confirm that Cilium is correctly configured for AWS VPC CNI chaining.

```bash
# Check Cilium's ConfigMap for chaining mode settings
kubectl get configmap cilium-config -n kube-system -o yaml | grep -E "chain|cni-conf"

# Verify the CNI configuration on a node
kubectl debug node/<node-name> -it --image=ubuntu -- \
  cat /etc/cni/net.d/05-cilium.conflist

# The conflist should reference aws-cni as the chained plugin
```

## Step 2: Check Cilium Agent Health

Inspect the Cilium agent pods for error messages.

```bash
# Check all Cilium pods are running
kubectl get pods -n kube-system -l k8s-app=cilium

# Look for error messages in Cilium agent logs
kubectl logs -n kube-system <cilium-pod> | grep -E "ERROR|WARN|chaining"

# Run the Cilium connectivity test
cilium connectivity test
```

## Step 3: Diagnose IP Address Allocation Issues

Investigate problems where pods fail to get IP addresses.

```bash
# Check for IP allocation errors in AWS VPC CNI logs
kubectl logs -n kube-system -l k8s-app=aws-node | grep -E "ERROR|WARN|ipamd"

# Verify that Cilium is not conflicting with AWS VPC CNI IPAM
kubectl get configmap cilium-config -n kube-system -o yaml | grep ipam

# Check the number of available IPs on the node
kubectl describe node <node-name> | grep -A5 "Allocatable"
```

## Step 4: Troubleshoot Network Policy Enforcement

Debug cases where Cilium network policies are not enforced as expected.

```bash
# Check Cilium endpoint status for a pod
CILIUM_POD=$(kubectl get pod -n kube-system -l k8s-app=cilium \
  --field-selector spec.nodeName=<node-name> -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n kube-system ${CILIUM_POD} -- cilium endpoint list

# Inspect policy enforcement for a specific endpoint
kubectl exec -n kube-system ${CILIUM_POD} -- \
  cilium endpoint get <endpoint-id>

# Check for dropped packets due to policy
kubectl exec -n kube-system ${CILIUM_POD} -- \
  cilium monitor --type drop
```

## Step 5: Validate Chained CNI Plugin Order

Ensure the CNI plugin chain is ordered correctly.

```bash
# Verify CNI plugin configuration file ordering
kubectl debug node/<node-name> -it --image=ubuntu -- \
  ls -la /etc/cni/net.d/

# The file with the lowest number should be processed first
# For AWS VPC CNI chaining: aws-cni should come before cilium
# Check conflist plugin chain order
kubectl debug node/<node-name> -it --image=ubuntu -- \
  cat /etc/cni/net.d/05-cilium.conflist | python3 -m json.tool
```

## Best Practices

- Always validate Cilium version compatibility with your EKS version before upgrading
- Monitor AWS VPC CNI IP address pool utilization to prevent IP exhaustion
- Use `cilium status` to quickly assess the health of the Cilium installation
- Enable Cilium's Hubble observability to trace traffic and identify policy issues
- Keep the CNI configuration files in a consistent state across all nodes

## Conclusion

Troubleshooting Cilium chained with AWS VPC CNI requires systematic inspection of both the IP allocation path and the policy enforcement path. By checking configuration files, agent logs, endpoint states, and using Cilium's built-in diagnostic tools, you can resolve connectivity and policy issues in this complex but powerful configuration.
