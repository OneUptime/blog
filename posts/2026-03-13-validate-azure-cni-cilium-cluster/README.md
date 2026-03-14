# Validate Azure CNI Cilium Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, eBPF

Description: Learn how to comprehensively validate a Kubernetes cluster using Azure CNI with Cilium, ensuring all components are correctly installed, configured, and communicating as expected.

---

## Introduction

When running Azure CNI with Cilium on a Kubernetes cluster, validation goes beyond simply checking that pods are running. You need to confirm that the CNI plugin is correctly configured, that Cilium's eBPF programs are loaded, and that inter-pod and pod-to-service communication works as expected across all nodes.

Azure CNI provides the IP address management and VNet integration layer, while Cilium takes responsibility for policy enforcement and the dataplane. A failure in either component can silently degrade cluster networking, making thorough validation a critical step after any provisioning or upgrade.

This guide provides a structured validation workflow covering Cilium agent health, node networking, endpoint status, and connectivity verification.

## Prerequisites

- Kubernetes cluster with Azure CNI and Cilium configured
- `kubectl` access with cluster-admin privileges
- `cilium` CLI installed (matching cluster Cilium version)
- Network access to the cluster API server

## Step 1: Verify Cilium Installation Health

Start with a high-level health check using the Cilium CLI.

```bash
# Get a summary of Cilium component status including agents and operator
cilium status

# Wait for all components to be ready before proceeding
cilium status --wait --wait-duration 5m
```

## Step 2: Inspect Node-Level Cilium Agents

Check that the Cilium DaemonSet has rolled out successfully to every node.

```bash
# Confirm the DaemonSet desired vs. ready counts match
kubectl -n kube-system get daemonset cilium

# Check for any pods in CrashLoopBackOff or Pending state
kubectl -n kube-system get pods -l k8s-app=cilium --field-selector='status.phase!=Running'

# View logs from a specific Cilium agent for troubleshooting
kubectl -n kube-system logs -l k8s-app=cilium --tail=50
```

## Step 3: Validate Endpoint Registration

Each pod should be registered as a Cilium endpoint with an assigned identity.

```bash
# List all Cilium endpoints in the cluster
kubectl get ciliumendpoints -A

# Check endpoint status details - look for "ready" policy enforcement state
kubectl get ciliumendpoints -A -o jsonpath=\
'{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.status.state}{"\n"}{end}'
```

## Step 4: Test Pod-to-Pod Connectivity

Run explicit connectivity checks between pods on different nodes.

```bash
# Deploy two test pods on separate nodes
kubectl run test-client --image=busybox --restart=Never -- sleep 3600
kubectl run test-server --image=nginx --restart=Never

# Get the test-server pod IP
SERVER_IP=$(kubectl get pod test-server -o jsonpath='{.status.podIP}')

# Test connectivity from client to server
kubectl exec test-client -- wget -qO- http://$SERVER_IP
```

## Step 5: Run Cilium Connectivity Test Suite

```bash
# Execute the full Cilium connectivity test suite
# This covers pod-to-pod, pod-to-service, DNS, and egress scenarios
cilium connectivity test

# Clean up test resources after validation
cilium connectivity test --cleanup-on-success
```

## Best Practices

- Validate cluster networking immediately after provisioning before deploying workloads
- Use `cilium monitor` to watch live packet events during connectivity tests
- Check `kubectl describe ciliumnodes` to confirm Azure subnet assignments per node
- Set up Hubble for continuous observability rather than one-time validation
- Automate connectivity tests in your CI/CD pipeline using `cilium connectivity test --junit-file`

## Conclusion

A complete validation of an Azure CNI Cilium cluster requires checking components at every layer: agent health, node configuration, endpoint registration, and live connectivity. Following this structured approach catches configuration issues early and gives you confidence that your cluster's networking is production-ready.
