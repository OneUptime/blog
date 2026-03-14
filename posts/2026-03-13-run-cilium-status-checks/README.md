# Run Cilium Status Checks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, kubernetes, monitoring, status, health, troubleshooting

Description: Learn how to run and interpret Cilium status checks using the cilium CLI and kubectl, covering agent health, eBPF map status, endpoint status, and common indicators of configuration problems. This guide helps operators quickly assess the health of their Cilium deployment.

---

## Introduction

Operational confidence in your Cilium deployment requires more than checking that pods are running. Cilium agents can appear healthy while internally having issues with eBPF map loading, IPsec configuration, Hubble relay connectivity, or endpoint programming. The `cilium status` command and related diagnostics provide a deep view into the actual health of the CNI stack.

Understanding what a healthy Cilium status looks like — and what warning signs to watch for — is essential for on-call engineers and platform teams managing Cilium in production. This guide walks through every major status check, explains what each component reports, and provides commands for drilling into specific areas.

## Prerequisites

- Cilium installed on the cluster
- `cilium` CLI installed locally
- `kubectl` configured for the target cluster
- Access to run `kubectl exec` on Cilium pods

## Step 1: Run the Top-Level Status Check

Get a summary of all Cilium components.
```bash
# Run the top-level Cilium status check
cilium status

# Wait for all components to be OK (useful after install/upgrade)
cilium status --wait

# Get more detailed output including resource versions
cilium status --verbose
```

A healthy output looks like:
```
    /¯¯\
 /¯¯\__/¯¯\    Cilium:             OK
 \__/¯¯\__/    Operator:           OK
 /¯¯\__/¯¯\    Envoy DaemonSet:    OK
 \__/¯¯\__/    Hubble Relay:       OK
    \__/        ClusterMesh:        disabled

Deployment             cilium-operator    Desired: 2, Ready: 2/2, Available: 2/2
DaemonSet              cilium             Desired: 3, Ready: 3/3, Available: 3/3
```

## Step 2: Check Endpoint Status

Verify that Cilium has programmed network policies for all pods.
```bash
# List all endpoints managed by Cilium
cilium endpoint list

# Check a specific endpoint's policy status
cilium endpoint get <endpoint-id>

# Check for endpoints stuck in "not-ok" state
cilium endpoint list | grep -v "ready"
```

## Step 3: Inspect eBPF Map Status

Validate that eBPF maps are loaded and not near capacity.
```bash
# Check eBPF map sizes and utilization
cilium bpf map list

# Check the connection tracking table size
cilium bpf ct list global | head -20

# View loaded eBPF programs
cilium bpf prog list
```

## Step 4: Verify Network Policy Enforcement

Confirm that network policies are compiled and enforced.
```bash
# List all network policies known to Cilium
cilium policy get

# Check if a specific policy is being enforced
cilium policy get --name <policy-name> -n <namespace>

# Monitor real-time policy verdicts
cilium monitor --type policy-verdict
```

## Step 5: Check Individual Agent Health via kubectl

Access per-node Cilium agent health for detailed diagnostics.
```bash
# Check Cilium agent logs on a specific node
kubectl logs -n kube-system ds/cilium -c cilium-agent | tail -50

# Run the cilium-health command inside a Cilium pod
kubectl exec -n kube-system ds/cilium -- cilium-health status

# Check node connectivity from the agent's perspective
kubectl exec -n kube-system ds/cilium -- cilium node list
```

## Step 6: Review Hubble Status (if Enabled)

Check the Hubble observability plane health.
```bash
# Check Hubble relay status
cilium hubble port-forward &
hubble status

# View recent flows through Hubble
hubble observe --last 100

# Check for dropped flows
hubble observe --verdict DROPPED --last 50
```

## Best Practices

- Add `cilium status --wait` to cluster provisioning automation as a readiness gate
- Monitor endpoint count via Prometheus — unexpected drops indicate CNI issues
- Set up alerts for any Cilium component reporting a non-OK status
- Run `cilium status` before and after any network policy change to confirm no regressions
- Check `cilium bpf map list` when experiencing connection issues — near-full maps cause drops
- Use `cilium monitor` during incident investigations to trace specific flows

## Conclusion

Regular Cilium status checks are a critical part of operating a healthy Kubernetes networking stack. The `cilium status`, `cilium endpoint list`, and `cilium bpf map list` commands together give you a comprehensive picture of the CNI's health. Build these checks into your operational runbooks, monitoring dashboards, and incident response procedures to detect and diagnose Cilium issues quickly.
