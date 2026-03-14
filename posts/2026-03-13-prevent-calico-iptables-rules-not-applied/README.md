# How to Prevent Calico iptables Rules Not Being Applied

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, iptables, Felix, Prevention

Description: Prevent Calico iptables rules from failing to apply by ensuring Felix prerequisites are met, using the correct iptables backend, and monitoring for iptables programming failures.

---

## Introduction

Preventing Calico iptables rule failures requires ensuring that every node meets Felix's prerequisites before calico-node is deployed, and that the iptables backend is correctly configured for the kernel version. Unlike many Kubernetes issues that can be fixed in-place, iptables backend mismatches often require a node reboot or kernel module load - making prevention through correct initial configuration more valuable than reactive fixes.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` CLI configured
- Node-level access for kernel module verification

## Step 1: Validate Node Prerequisites Before Joining

Check every node for Felix prerequisites before adding it to the cluster.

```bash
#!/bin/bash
# validate-node-felix-prereqs.sh
# Run on each node before joining it to the Calico cluster

echo "=== Felix Prerequisites Check ==="

# Check kernel version (minimum 3.10 for Calico, 4.14+ for eBPF)
KERNEL=$(uname -r)
echo "Kernel version: ${KERNEL}"

# Check required kernel modules
MODULES=("xt_conntrack" "ip_tables" "ip6_tables" "iptable_filter" "iptable_nat")
for MOD in "${MODULES[@]}"; do
  if lsmod | grep -q "^${MOD}" || modinfo "${MOD}" > /dev/null 2>&1; then
    echo "OK: Kernel module ${MOD} available"
  else
    echo "WARN: Kernel module ${MOD} not loaded - loading..."
    modprobe "${MOD}" 2>/dev/null || echo "FAIL: Could not load ${MOD}"
  fi
done

# Check iptables binary is available
if command -v iptables > /dev/null 2>&1; then
  echo "OK: iptables binary found: $(iptables --version)"
else
  echo "FAIL: iptables binary not found"
fi

# Check nftables is available (for NFT backend)
if command -v nft > /dev/null 2>&1; then
  echo "OK: nft binary found: $(nft --version)"
else
  echo "INFO: nft binary not found (only needed for NFT backend)"
fi
```

## Step 2: Configure FelixConfiguration for the Correct iptables Backend

Use the `Auto` backend to let Felix choose the correct backend for the node's kernel version.

```bash
# Set iptables backend to Auto (Felix detects the best option)
calicoctl patch felixconfiguration default \
  --patch '{"spec": {"iptablesBackend": "Auto"}}'

# Verify the setting
calicoctl get felixconfiguration default \
  -o jsonpath='{.spec.iptablesBackend}'

# For environments where all nodes use legacy iptables (no nftables)
# Use explicit Legacy backend for consistency
calicoctl patch felixconfiguration default \
  --patch '{"spec": {"iptablesBackend": "Legacy"}}'
```

## Step 3: Ensure calico-node Has Required Privileges

Felix needs host network and privileged access to program iptables. Verify these are not restricted.

```bash
# Check that calico-node DaemonSet has the required security context
kubectl get daemonset calico-node -n calico-system \
  -o jsonpath='{.spec.template.spec.containers[0].securityContext}' | jq .

# Required fields:
# privileged: true (or specific capabilities for iptables access)
# hostNetwork: true
# hostPID: false (not required)

# Verify no PodSecurityPolicy or PodSecurityAdmission is blocking privileges
kubectl get podsecuritypolicies 2>/dev/null | grep calico
kubectl get namespace calico-system -o yaml | grep "pod-security"
```

## Step 4: Set Up Proactive Monitoring for iptables Errors

Configure alerts before problems occur, not after.

```bash
# Enable Felix metrics for iptables monitoring
calicoctl patch felixconfiguration default \
  --patch '{"spec": {"prometheusMetricsEnabled": true}}'

# Create the alert (see monitor post for full PrometheusRule)
kubectl apply -f - <<'EOF'
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-iptables-prevention
  namespace: monitoring
spec:
  groups:
    - name: calico.iptables.prevention
      rules:
        - alert: CalicoIptablesRestoreErrorRate
          expr: rate(felix_iptables_restore_errors_total[5m]) > 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Calico iptables errors on {{ $labels.instance }}"
            description: "Felix is failing to apply iptables rules. Network policy is not being enforced."
EOF
```

## Step 5: Include iptables Validation in Node Provisioning

Add iptables and kernel module checks to your node provisioning scripts (cloud-init, Ansible, Terraform).

```yaml
# cloud-init snippet for Calico-ready nodes
# Add to your cloud-init or Ansible node provisioning
runcmd:
  # Load required kernel modules
  - modprobe ip_tables
  - modprobe ip6_tables
  - modprobe xt_conntrack
  - modprobe iptable_filter
  - modprobe iptable_nat

  # Make modules persistent across reboots
  - echo -e "ip_tables\nip6_tables\nxt_conntrack\niptable_filter\niptable_nat" >> /etc/modules

  # Install iptables if not present
  - apt-get install -y iptables 2>/dev/null || yum install -y iptables 2>/dev/null
```

## Best Practices

- Use `iptablesBackend: Auto` in FelixConfiguration to handle nodes with different kernel versions automatically
- Include Felix prerequisite validation in your node provisioning pipeline before nodes are added to Kubernetes
- Set `system-node-critical` priority class on the calico-node DaemonSet to prevent eviction
- Monitor `felix_iptables_restore_errors_total` and alert immediately on any increase
- Test iptables rule application after every kernel update on existing nodes

## Conclusion

Preventing Calico iptables rule application failures requires ensuring every node has the required kernel modules loaded, using the correct iptables backend for the kernel version, and setting up proactive monitoring for iptables error metrics. Including Felix prerequisite validation in your node provisioning pipeline catches the most common causes before nodes are added to the cluster.
