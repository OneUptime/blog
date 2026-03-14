# Diagnosing FailedCreatePodSandBox Errors in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Troubleshooting, Pod Sandbox

Description: Step-by-step diagnostic procedures for identifying the root cause of FailedCreatePodSandBox errors in Kubernetes clusters running Calico.

---

## Introduction

FailedCreatePodSandBox errors occur when the container runtime cannot set up a pod's network namespace. After installing Calico, this typically means the Calico CNI plugin is not properly installed or configured on one or more nodes.

This guide provides a systematic approach to diagnosing FailedCreatePodSandBox errors. Rather than guessing at solutions, you will methodically narrow down the root cause using Calico and Kubernetes diagnostic commands.

Accurate diagnosis is the most important step in resolving any Calico networking issue. Skipping straight to fixes without understanding the cause often leads to recurring problems or introduces new issues.

## Prerequisites

- A Kubernetes cluster running Calico where FailedCreatePodSandBox errors are occurring
- `kubectl` with cluster-admin privileges
- `calicoctl` installed
- Access to node logs (directly or via `kubectl debug`)

## Step 1: Confirm the Error

Start by confirming the exact error and its scope:

```bash
# Check calico-node pod logs for relevant errors
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node --tail=100 | grep -i "error\|fail\|warn"

# Check recent events across the cluster
kubectl get events -A --sort-by='.lastTimestamp' | grep -i "calico\|cni\|network" | tail -20

# View Calico IPPool configuration
calicoctl get ippools -o yaml
```

Document the exact error message, which pods or nodes are affected, and when the error first appeared.

## Step 2: Deep Investigation

Dig deeper into the root cause:

```bash
# Check the Calico system pod status
kubectl get pods -n calico-system -o wide

# Verify IPAM state
calicoctl ipam show

# Check Felix configuration
calicoctl get felixconfiguration default -o yaml

# Look at calico-node logs on specific nodes
kubectl logs -n calico-system <calico-node-pod> -c calico-node --tail=200
```

## Step 3: Node-Level Analysis

Narrow down to specific nodes:

```bash
# Check which nodes have issues
kubectl get nodes -o wide

# Test connectivity from a debug pod
kubectl run debug-net --image=busybox --rm -it --restart=Never -- ping -c 3 <target-ip>

# Check calico-node status per node
calicoctl node status
```

## Step 4: Collect a Diagnostic Bundle

For complex issues, collect a full diagnostic bundle:

```bash
# Collect Calico diagnostic information
calicoctl node diag

# Collect cluster-wide Calico state
calicoctl get nodes -o yaml > calico-nodes.yaml
calicoctl get ippools -o yaml > calico-ippools.yaml
calicoctl get felixconfiguration -o yaml > calico-felix.yaml
```

## Verification

After identifying the root cause, verify your diagnosis before proceeding to fixes:

```bash
# Confirm the identified cause matches the symptoms
kubectl get events -A --sort-by='.lastTimestamp' | grep -i "error\|warning" | tail -20

# Verify Calico system health
kubectl get pods -n calico-system
calicoctl node status
```

## Troubleshooting

**Cannot access calico-node pods for diagnostics:**
- Use `kubectl debug node/<name>` to get a shell on the node directly.
- Check if the calico-system namespace exists: `kubectl get ns calico-system`.

**calicoctl commands failing:**
- Ensure calicoctl version matches your Calico version: `calicoctl version`.
- Set the correct datastore type: `export DATASTORE_TYPE=kubernetes`.

**Inconsistent behavior across diagnostic runs:**
- The issue may be intermittent. Run diagnostics multiple times and compare results.
- Check for recent deployments or scaling events that may be triggering the error.


## Advanced Configuration Options

Beyond the basic manifest shown above, there are several advanced configuration patterns worth understanding for production deployments.

### Using Labels for Targeted Configuration

Labels on Calico resources enable you to build flexible configurations that apply differently across your cluster. For example, you can use node labels to control which nodes are affected by specific resources:

```bash
# Label nodes for targeted configuration
kubectl label node worker-1 calico-config=high-performance
kubectl label node worker-2 calico-config=standard

# Verify labels are applied
kubectl get nodes --show-labels | grep calico-config
```

### Version Control and GitOps Integration

Store your Calico resource manifests alongside your application configurations in Git. This enables change tracking, peer review, and automated deployment:

```bash
# Example directory structure for Calico resources
# calico-resources/
#   base/
#     ippool.yaml
#     felixconfiguration.yaml
#   overlays/
#     production/
#       kustomization.yaml
#     staging/
#       kustomization.yaml
```

When using GitOps tools like Flux or Argo CD, ensure your Calico CRDs are applied before the custom resources. Set appropriate sync waves or dependencies to prevent ordering issues.

### Resource Naming Conventions

Adopt a consistent naming convention for your Calico resources:

- Use descriptive names that indicate the resource's purpose (e.g., `production-pod-pool` instead of `pool-1`)
- Include environment or cluster identifiers for multi-cluster setups
- Avoid special characters; use lowercase letters, numbers, and hyphens only

Following these conventions makes it easier to manage resources at scale and reduces the risk of accidental modifications to the wrong resource.

## Conclusion

Systematic diagnosis of FailedCreatePodSandBox errors requires checking the error scope, investigating the relevant Calico and Kubernetes components, and collecting enough data to identify the root cause confidently. With the cause identified, you can proceed to apply a targeted fix rather than applying broad changes that may introduce new issues.
