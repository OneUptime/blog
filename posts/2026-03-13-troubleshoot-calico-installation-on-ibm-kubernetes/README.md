# Troubleshoot Calico Installation on IBM Kubernetes Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, IBM Kubernetes Service

Description: A guide to diagnosing and resolving common issues when installing and running Calico on IBM Kubernetes Service (IKS) clusters.

---

## Introduction

IBM Kubernetes Service (IKS) uses Calico as its default CNI plugin, which means IKS clusters come with Calico pre-installed. However, issues can arise when upgrading Calico, applying custom Calico configurations, or when IBM's managed Calico installation conflicts with user-managed customizations.

Understanding the difference between IBM-managed Calico configuration and user-configurable settings is critical. IBM manages core Calico components, and some configurations that work in self-managed clusters may be overwritten or blocked in IKS.

This guide covers common Calico issues specific to IKS and provides targeted diagnostic steps.

## Prerequisites

- IBM Kubernetes Service cluster
- `ibmcloud` CLI with `ks` plugin installed
- `kubectl` configured for the IKS cluster
- `calicoctl` configured for the IKS datastore

## Step 1: Configure calicoctl for IKS

IKS requires specific configuration for calicoctl to access the Calico datastore.

```bash
# Download IKS-specific calicoctl configuration
ibmcloud ks cluster config --cluster <cluster-id> --admin --network

# Verify calicoctl can connect to the IKS datastore
calicoctl get nodes

# Check the Calico version installed by IKS
calicoctl version
```

## Step 2: Check Calico Component Status on IKS

Verify all Calico components are running correctly.

```bash
# Check Calico DaemonSet status
kubectl get daemonset -n kube-system calico-node

# Check for pods in CrashLoopBackOff or Error state
kubectl get pods -n kube-system -l k8s-app=calico-node

# Inspect logs for a failing pod
kubectl logs -n kube-system <calico-node-pod>

# Check Calico Typha (if deployed)
kubectl get pods -n kube-system -l k8s-app=calico-typha
```

## Step 3: Diagnose IP Address Conflicts on IKS

IKS uses Calico for IPAM; IP conflicts can cause pod scheduling failures.

```bash
# Check current IPAM utilization
calicoctl ipam show

# Look for IPAM errors in Calico node logs
kubectl logs -n kube-system <calico-node-pod> | grep -i "ipam\|ip alloc"

# Check for stale IPAM allocations from removed nodes
calicoctl ipam check

# Release leaked IP addresses
calicoctl ipam release --ip=<leaked-ip>
```

## Step 4: Resolve Conflicts with IBM-Managed Calico Configuration

Identify and avoid modifying IBM-managed Calico settings.

```bash
# Check which GlobalNetworkPolicies are IBM-managed
calicoctl get globalnetworkpolicy -o yaml | grep -E "name:|ibm"

# IBM adds management policies; do not delete these
# Check for conflicts between IBM policies and your custom policies
calicoctl get globalnetworkpolicy

# View IBM's default network policies
calicoctl get networkpolicy --all-namespaces | grep -i ibm
```

## Step 5: Validate Custom Network Policies on IKS

Test that user-defined network policies work alongside IBM's defaults.

```bash
# Apply a custom Calico network policy
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-internal
  namespace: default
spec:
  selector: app == 'my-app'
  ingress:
  - action: Allow
    source:
      selector: app == 'my-app'
  egress:
  - action: Allow
EOF

# Verify the policy is applied
calicoctl get networkpolicy -n default

# Test connectivity to confirm the policy works as expected
kubectl exec <pod-1> -- curl http://<pod-2-ip>
```

## Best Practices

- Never delete IBM-managed Calico resources (they have IBM-specific labels/annotations)
- Always use `ibmcloud ks` to configure `calicoctl` for IKS rather than manual configuration
- Test custom policies in a development IKS cluster before applying to production
- Open IBM support tickets for issues caused by IBM-managed Calico component failures
- Check IKS cluster update notes before upgrading-Calico updates are managed by IBM

## Conclusion

Calico on IBM Kubernetes Service is IBM-managed, which simplifies some aspects of operations but introduces constraints on customization. By understanding which components are IBM-managed, correctly configuring `calicoctl`, and validating custom policies carefully, you can effectively use and troubleshoot Calico on IKS.
