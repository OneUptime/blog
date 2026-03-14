# Fixing Required Software Issues in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Software, Installation

Description: How to install and configure required software for optimal Cilium performance testing.

---

## Introduction

Fixing software issues for Cilium performance testing involves installing missing components, upgrading outdated versions, and loading required kernel modules. Each fix addresses a specific dependency that affects test accuracy or capability.

The fixes are organized by layer: kernel modules and configuration, userspace tools, container images, and Cilium itself.

This guide provides the installation and configuration commands for each required software component.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI and `kubectl` access
- Node-level root access
- Prometheus monitoring (recommended)

## Installing Kernel Modules

```bash
# Load required modules
modprobe wireguard
modprobe br_netfilter
modprobe ip_tables
modprobe xt_conntrack

# Make persistent
cat > /etc/modules-load.d/cilium-perf.conf << MOD
wireguard
br_netfilter
ip_tables
xt_conntrack
MOD

# Mount BPF filesystem if not mounted
mount | grep bpf || mount -t bpf bpf /sys/fs/bpf
```

## Installing Benchmarking Tools

```bash
# Deploy iperf3 and netperf as persistent test pods
kubectl apply -f - <<YAML
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
---
apiVersion: v1
kind: Pod
metadata:
  name: bench-tools
  namespace: monitoring
spec:
  containers:
  - name: iperf3
    image: networkstatic/iperf3:latest
    command: ["sleep", "infinity"]
  - name: netperf
    image: cilium/netperf:latest
    command: ["sleep", "infinity"]
YAML
```

## Installing Node-Level Tools

```bash
# Install performance tools on nodes
# For Ubuntu/Debian
apt-get install -y linux-tools-$(uname -r) ethtool iproute2 bpftool

# For RHEL/CentOS
yum install -y perf ethtool iproute bpftool
```

## Upgrading Cilium CLI

```bash
# Install latest Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64
curl -L --fail --remote-name-all \
  https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz
tar xzvf cilium-linux-${CLI_ARCH}.tar.gz -C /usr/local/bin
cilium version
```

## Verification

```bash
# Run the validation checks above
# All items should show PASS
cilium status --verbose
```

## Troubleshooting

- **Validation fails on specific nodes**: Check if nodes were provisioned from different images.
- **Kernel module load fails**: Verify the module is available for your kernel version.
- **Cilium status unhealthy**: Check agent logs with `kubectl logs -n kube-system ds/cilium`.
- **Tools missing in containers**: Use an image that includes the required tools or mount from host.

## Implementing Changes Safely

When applying performance fixes to a production Cilium cluster, follow a staged rollout approach to minimize risk:

```bash
# Step 1: Test on a single node first
kubectl cordon node-test-1
kubectl drain node-test-1 --ignore-daemonsets --delete-emptydir-data

# Step 2: Apply configuration changes
helm upgrade cilium cilium/cilium --namespace kube-system \
  --reuse-values \
  <your-changes-here>

# Step 3: Wait for the Cilium agent on the test node to restart
kubectl rollout status ds/cilium -n kube-system --timeout=120s

# Step 4: Run a quick benchmark on the test node
kubectl uncordon node-test-1
# Deploy test pods on the node and verify performance

# Step 5: If successful, roll out to remaining nodes
# Cilium DaemonSet will handle the rolling update
```

### Change Tracking

Document every change you make along with its measured impact. Create a log entry for each modification:

```bash
cat >> /tmp/perf-changes.log << LOG
Date: $(date)
Change: <description of change>
Before: <metric before change>
After: <metric after change>
Impact: <percentage improvement or regression>
LOG
```

This change log is invaluable for understanding which optimizations provide the most benefit and for reverting changes if unexpected regressions occur. It also helps when you need to apply the same optimizations to other clusters.

### Rolling Back Changes

If a change causes unexpected behavior, roll back immediately:

```bash
# Rollback to previous Helm release
helm rollback cilium -n kube-system

# Verify the rollback was successful
cilium status --verbose
kubectl rollout status ds/cilium -n kube-system
```

## Post-Fix Validation Checklist

After applying any fix, run through this validation checklist to ensure the fix is complete and has not introduced regressions:

```bash
#!/bin/bash
# post-fix-checklist.sh

echo "=== Post-Fix Validation Checklist ==="

# 1. Cilium agent health
echo "1. Cilium agent health:"
cilium status | grep -E "OK|error|degraded"

# 2. No agent restarts
echo "2. Agent restart count:"
kubectl get pods -n kube-system -l k8s-app=cilium -o json | \
  jq '.items[].status.containerStatuses[].restartCount'

# 3. No new drops
echo "3. Recent drops:"
cilium monitor --type drop | timeout 5 head -5 || echo "No drops in 5 seconds"

# 4. Endpoint health
echo "4. Endpoint health:"
cilium endpoint list | grep -c "ready"
cilium endpoint list | grep -c "not-ready"

# 5. Performance benchmark
echo "5. Quick performance check:"
kubectl exec perf-client -- iperf3 -c perf-server.monitoring -t 10 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000' | \
  xargs -I{} echo "{} Gbps"

echo "=== Checklist Complete ==="
```

### Monitoring for Regression

After applying fixes, monitor closely for 24-48 hours:

```bash
# Watch Cilium events for any errors
kubectl get events -n kube-system --watch --field-selector involvedObject.kind=Pod

# Monitor agent CPU and memory
watch -n5 "kubectl top pods -n kube-system -l k8s-app=cilium"
```

Document the fix, its impact, and any follow-up actions needed in your team's runbook or wiki.

## Conclusion

Properly fixinging required software issues in cilium performance is essential for reliable Cilium performance testing. Each component plays a role in the accuracy and reproducibility of benchmark results.
