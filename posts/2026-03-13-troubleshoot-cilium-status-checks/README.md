# Troubleshoot Cilium Status Checks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Troubleshooting, Observability

Description: A practical guide to interpreting and resolving Cilium status check failures, covering agent health, endpoint sync issues, and common error conditions.

---

## Introduction

Cilium exposes a rich set of status checks through its CLI and API that provide detailed insight into agent health, policy enforcement state, and dataplane operations. Understanding how to read and act on these status outputs is essential for maintaining healthy cluster networking.

Status check failures in Cilium fall into several categories: agent startup failures, BPF map errors, kube-apiserver connectivity issues, and endpoint synchronization problems. Each has distinct symptoms in the status output and requires a different resolution path.

This guide walks through the most important status checks, explains what each field means, and provides actionable steps for resolving the most common failure conditions.

## Prerequisites

- `cilium` CLI installed and configured
- `kubectl` access to the cluster
- Cilium installed in the `kube-system` namespace

## Step 1: Interpret the Cilium Status Output

The `cilium status` command is the primary diagnostic entry point. Each component reported has a health indicator that narrows down the failure domain.

Run and parse the Cilium status output:

```bash
# Get a comprehensive status summary across all Cilium agents
cilium status --all-addresses --all-controllers --all-nodes --all-redirects

# Check status for a specific Cilium pod directly via exec
kubectl -n kube-system exec -it ds/cilium -- cilium status --verbose
```

Key fields to check:
- `KV-Store`: Should show `Ok` — failures here mean etcd/CRD connectivity issues
- `Kubernetes`: Should show `Ok` — failures indicate API server connectivity problems
- `BPF Maps`: Should show `Ok` — failures indicate filesystem or memory issues
- `Controller Status`: Shows count of failing controllers (should be 0)

## Step 2: Diagnose Controller Failures

Cilium uses internal controllers for reconciliation tasks. A high count of failing controllers indicates ongoing reconciliation loops that are degrading cluster state.

Identify and investigate failing controllers:

```bash
# List all controllers and their status
kubectl -n kube-system exec -it ds/cilium -- cilium status --all-controllers 2>&1 | grep -E "(FAIL|fail)"

# Get detailed controller status including failure counts and last error
kubectl -n kube-system exec -it ds/cilium -- cilium debuginfo | grep -A5 "controller"

# Watch controller status in real time to spot transient failures
watch -n 2 "kubectl -n kube-system exec ds/cilium -- cilium status 2>&1 | grep -i controller"
```

## Step 3: Check Endpoint Synchronization

Cilium endpoints represent individual pod network interfaces. Endpoints stuck in a non-ready state indicate policy compilation failures or identity resolution issues.

Inspect endpoint health across the cluster:

```bash
# List all endpoints and their state — look for endpoints not in "ready" state
kubectl -n kube-system exec -it ds/cilium -- cilium endpoint list

# Get detailed state for a specific endpoint (replace <endpoint-id> with actual ID)
kubectl -n kube-system exec -it ds/cilium -- cilium endpoint get <endpoint-id>

# Check for endpoints with policy errors
kubectl -n kube-system exec -it ds/cilium -- cilium endpoint list | grep -v ready
```

## Step 4: Review Cilium Agent Logs for Error Patterns

When status checks show failures, the agent logs provide the detailed error messages needed for resolution.

Extract and filter relevant error logs:

```bash
# Get recent error logs from all Cilium agents
kubectl -n kube-system logs -l k8s-app=cilium --tail=200 | grep -E "(level=error|level=warning|ERR)"

# Check for BPF-specific errors that indicate kernel compatibility issues
kubectl -n kube-system logs -l k8s-app=cilium --tail=200 | grep -i "bpf"

# Look for identity allocation failures that cause endpoint policy issues
kubectl -n kube-system logs -l k8s-app=cilium --tail=200 | grep -i "identity"
```

## Best Practices

- Set up alerts on `cilium_controllers_failing` Prometheus metric to catch controller failures early
- Run `cilium status --wait` after every Cilium upgrade before allowing new workloads to schedule
- Use `cilium debuginfo` and attach the output when filing Cilium GitHub issues
- Monitor the `cilium_endpoint_state` metric to track endpoint health trends over time
- Check the `cilium_k8s_client_api_calls_total` metric for API server throttling indicators

## Conclusion

Cilium's status check system provides detailed diagnostics across every major component of the network stack. By systematically checking agent status, controller health, endpoint state, and log patterns, you can quickly identify and resolve the root cause of most Cilium networking issues. Regular status monitoring as part of your observability practice prevents issues from silently accumulating into larger failures.
