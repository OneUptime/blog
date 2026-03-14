# How to Use Command Cheatsheet

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: CLI

Description: A practical guide covering how to use command cheatsheet with step-by-step instructions and real-world examples for production Kubernetes clusters.

---

## Introduction

The Cilium CLI provides a comprehensive set of commands for managing, monitoring, and troubleshooting your Cilium deployment. Mastering these commands is essential for efficient day-to-day operations.

In this guide, we cover Cilium CLI command operations in a Kubernetes environment. Cilium leverages eBPF technology to provide high-performance networking, security, and observability for cloud-native workloads. The eBPF programs are loaded directly into the Linux kernel, enabling efficient packet processing without the overhead of traditional iptables-based networking stacks.

Whether you are running a small development cluster or a large production environment with thousands of pods, the techniques in this guide will help you maintain a reliable Cilium deployment. We provide step-by-step instructions with real commands and configuration examples that you can adapt to your environment.

## Prerequisites

- A running Kubernetes cluster (v1.21+) with Cilium installed (v1.14+)
- `kubectl` configured for cluster access
- `cilium` CLI installed (matching your Cilium version)
- Helm 3.x for configuration management
- Basic familiarity with Kubernetes networking concepts
- Access to cluster nodes for troubleshooting (recommended)
- Prometheus and Grafana for metrics visualization (recommended)

## Getting Started

Familiarize yourself with the tools and commands needed for Cilium CLI command operations.

```bash
# Verify Cilium is installed and accessible
cilium version

# Check the current deployment status
cilium status --verbose

# View the configuration
cilium config view | head -20
```

## Core Operations

### Working with Endpoints

```bash
# List all endpoints managed by Cilium
cilium endpoint list

# Get detailed information about a specific endpoint
cilium endpoint get <endpoint-id>

# Check endpoint labels and identity
cilium endpoint list -o json | jq '.[] | {id: .id, labels: .status.labels, identity: .status.identity.id}'
```

### Working with Identities

```bash
# List all security identities
cilium identity list

# Filter identities by label
cilium identity list -o json | jq '.[] | select(.labels | any(contains("app=")))'
```

### Working with Policies

```bash
# View all enforced policies
cilium policy get

# Check policy selectors and their matches
cilium policy selectors
```

## Practical Examples

### Example 1: Inspecting Service Load Balancing

```bash
# List all services managed by Cilium
cilium service list

# Check BPF load balancer entries
cilium bpf lb list | head -20

# Verify a specific service has correct backends
cilium service list -o json | jq '.[] | select(.spec.frontend_address.port == 80)'
```

### Example 2: Debugging Network Connectivity

```bash
# Run a targeted connectivity test
cilium connectivity test --single-node

# Check for dropped packets
cilium metrics list | grep drop

# Inspect BPF connection tracking table
cilium bpf ct list global | tail -20
```

### Example 3: Monitoring Agent Health

```bash
# Check overall health
cilium health status

# Monitor agent metrics
cilium metrics list | grep -E "process_cpu|process_resident_memory"

# Check for recent agent events
kubectl get events -n kube-system --sort-by='.lastTimestamp' | grep cilium | tail -10
```

```mermaid
flowchart TD
    A[Daily Operations] --> B[Health Checks]
    A --> C[Endpoint Management]
    A --> D[Policy Inspection]
    A --> E[Troubleshooting]
    B --> F[cilium status]
    C --> G[cilium endpoint list]
    D --> H[cilium policy get]
    E --> I[cilium connectivity test]
```


## Verification

After completing the steps above, run a comprehensive verification to confirm everything is working as expected.

```bash
# Check overall Cilium deployment health
cilium status --verbose

# Verify inter-node connectivity
cilium health status

# Confirm all Cilium pods are running and ready
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Verify the Cilium operator is healthy
kubectl get pods -n kube-system -l name=cilium-operator

# Check for recent error events
kubectl get events -n kube-system --sort-by='.lastTimestamp' | grep cilium | tail -10

# Run a connectivity test to validate the data plane
cilium connectivity test --single-node

# Verify endpoint count matches expected pod count
echo "Cilium endpoints: $(cilium endpoint list -o json 2>/dev/null | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 'N/A')"
```

## Troubleshooting

If you encounter issues during or after the steps in this guide, use the following troubleshooting procedures:

- **Cilium agent not starting**: Check resource limits and node capacity with `kubectl describe pod -n kube-system -l k8s-app=cilium`. Verify the BPF filesystem is mounted at `/sys/fs/bpf` and the kernel version is 4.19 or later. Check init container logs with `kubectl logs -n kube-system <pod> -c cilium-init`.

- **Connectivity failures**: Run `cilium connectivity test` and inspect the specific failing test case. Check for conflicting network policies with `cilium policy get`. Verify inter-node tunnel connectivity with `cilium bpf tunnel list`.

- **Configuration not applied**: Verify the Helm values or ConfigMap are correctly formatted. Run `kubectl rollout restart daemonset/cilium -n kube-system` and wait for the rollout to complete. Confirm with `cilium config view`.

- **High resource usage**: Review resource consumption with `kubectl top pods -n kube-system -l k8s-app=cilium`. Consider tuning label exclusion to reduce identity count. Increase agent memory limits if needed. Check `cilium metrics list | grep process_resident_memory`.

- **Endpoints stuck in regenerating state**: This usually indicates the agent is overloaded or encountering errors during BPF program compilation. Check agent logs with `kubectl logs -n kube-system -l k8s-app=cilium --tail=200 | grep -i error`.

- **Policy not being enforced**: Verify the policy selectors match the intended pods using `cilium endpoint list`. Confirm the policy is applied with `cilium policy get`. Check that the endpoint has the correct identity with `cilium endpoint get <id>`.

To collect a comprehensive diagnostic bundle for further analysis:

```bash
# Generate a Cilium sysdump containing all diagnostic information
# This collects logs, configs, BPF maps, and cluster state
cilium sysdump --output-filename cilium-diag-$(date +%Y%m%d)
```

## Conclusion

This guide covered Cilium CLI command operations with practical steps you can apply to your Kubernetes cluster. Regular monitoring, systematic validation, and proactive management are essential for maintaining a healthy Cilium deployment at any scale.

Key takeaways from this guide:

- Always assess the current state before making changes to your Cilium configuration
- Use Helm for configuration management to ensure consistency and reproducibility across environments
- Monitor Cilium metrics through Prometheus to detect issues before they impact workloads
- Test changes in a staging environment before applying them to production clusters
- Maintain runbooks documenting your Cilium configuration decisions and operational procedures
- Use `cilium sysdump` to collect comprehensive diagnostic data when investigating issues

As your cluster grows and evolves, revisit these configurations periodically and adjust them to match your current requirements. The Cilium community and documentation are excellent resources for staying current with best practices and new features.
