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

kubectl get configmap cilium-config -n kube-system -o yaml | grep -E "cni-chaining|cni-exclusive|cni-conf"

# Verify the CNI configuration on a node
kubectl debug node/<node-name> -it --image=ubuntu -- \
  cat /host/etc/cni/net.d/05-cilium.conflist

# The conflist should contain aws-cni before cilium in the plugins list
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

# Check the AWS VPC CNI IP pool on the node
AWS_NODE_POD=$(kubectl get pod -n kube-system -l k8s-app=aws-node \
  --field-selector spec.nodeName=<node-name> -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n kube-system -c aws-node ${AWS_NODE_POD} -- \
  curl -s http://localhost:61679/v1/enis

kubectl exec -n kube-system -c aws-node ${AWS_NODE_POD} -- \
  curl -s http://localhost:61678/metrics | grep awscni_assigned_ip_addresses
```

## Step 4: Troubleshoot Network Policy Enforcement

Debug cases where Cilium network policies are not enforced as expected.

```bash
# Check Cilium endpoint status for a pod
CILIUM_POD=$(kubectl get pod -n kube-system -l k8s-app=cilium \
  --field-selector spec.nodeName=<node-name> -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n kube-system ${CILIUM_POD} -- cilium-dbg endpoint list

# Inspect policy enforcement for a specific endpoint
kubectl exec -n kube-system ${CILIUM_POD} -- \
  cilium-dbg endpoint get <endpoint-id>

# Check for dropped packets due to policy
kubectl exec -n kube-system ${CILIUM_POD} -- \
  cilium-dbg monitor --type drop
```

## Step 5: Validate Chained CNI Plugin Order

Ensure the CNI plugin chain is ordered correctly.

```bash
# Verify CNI plugin configuration file ordering
kubectl debug node/<node-name> -it --image=ubuntu -- \
  ls -la /host/etc/cni/net.d/

# The kubelet selects the first valid CNI config file by lexicographic order
# In the active conflist, aws-cni should come before cilium in the plugins list
# Check conflist plugin chain order
kubectl debug node/<node-name> -it --image=ubuntu -- \
  cat /host/etc/cni/net.d/05-cilium.conflist | python3 -m json.tool
```

## Best Practices

- Always validate Cilium version compatibility with your EKS version before upgrading
- Monitor AWS VPC CNI IP address pool utilization to prevent IP exhaustion
- Use `cilium status` to quickly assess the health of the Cilium installation
- Enable Cilium's Hubble observability to trace traffic and identify policy issues
- Keep the CNI configuration files in a consistent state across all nodes

## Conclusion

Troubleshooting Cilium chained with AWS VPC CNI requires systematic inspection of both the IP allocation path and the policy enforcement path. By checking configuration files, agent logs, endpoint states, and using Cilium's built-in diagnostic tools, you can resolve connectivity and policy issues in this complex but powerful configuration.
