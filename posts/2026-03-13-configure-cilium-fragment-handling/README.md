# Configure Cilium Fragment Handling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Fragmentation, eBPF

Description: Learn how to configure Cilium's IP fragment handling and MTU settings to prevent packet loss and connectivity issues in environments where fragmentation occurs.

---

## Introduction

IP packet fragmentation occurs when a packet is larger than the MTU of a network path and must be split into smaller fragments for transmission. In Kubernetes environments, fragmentation can happen due to overlay network overhead, NIC-level MTU mismatches, or large payloads in UDP-based protocols.

Cilium's eBPF datapath handles packet fragmentation differently from the kernel's traditional IP stack. Understanding and correctly configuring Cilium's fragment tracking and MTU settings is important for preventing silent packet drops, connectivity failures, and performance degradation in fragmentation-prone environments.

This guide explains Cilium's fragment handling configuration options and how to diagnose and resolve fragmentation-related issues.

## Prerequisites

- Cilium installed and running
- Access to `cilium` CLI and `kubectl`
- Ability to capture network traffic for diagnostic purposes

## Step 1: Understand Cilium's Fragment Tracking

Review Cilium's current fragment handling configuration.

```bash
# Check if fragment tracking is enabled in the current Cilium config

cilium config view | grep -i fragment

# View current MTU settings
cilium config view | grep -i mtu

# Check the Cilium DaemonSet configuration
kubectl -n kube-system get daemonset cilium \
  -o jsonpath='{.spec.template.spec.containers[0].env}' | python3 -m json.tool | grep -i frag
```

## Step 2: Configure MTU to Minimize Fragmentation

Set the correct MTU to avoid fragmentation at the Cilium level.

```bash
# Install Cilium with explicit MTU configuration
# MTU should be set below the physical NIC MTU minus encapsulation overhead
# VXLAN overhead: 50 bytes; standard NIC MTU: 1500 bytes
# Recommended Cilium MTU with VXLAN: 1450

helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set MTU=1450

# Alternatively, configure via ConfigMap
kubectl -n kube-system patch configmap cilium-config \
  --patch '{"data": {"mtu": "1450"}}'

# Restart Cilium to apply MTU changes
kubectl -n kube-system rollout restart daemonset/cilium
```

## Step 3: Enable Fragment Tracking for UDP Policies

When applying network policies to UDP traffic, verify that fragment tracking is enabled so fragmented UDP packets are handled correctly.

```bash
# Enable IPv4 fragment tracking in Cilium configuration if it was disabled
# Cilium enables IPv4 fragment tracking by default in current releases
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set fragmentTracking=true \
  --set extraConfig.bpf-fragments-map-max=65536
```

```yaml
# fragment-tracking-config.yaml
# ConfigMap patch to enable fragment tracking
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:
  # Enable tracking of IP fragments for correct L4 policy enforcement
  enable-ipv4-fragment-tracking: "true"
  # Set the maximum number of fragmented datagrams to track
  # Cilium validates this value between 256 and 65536 entries
  bpf-fragments-map-max: "65536"
```

## Step 4: Diagnose Fragmentation Issues

Use Cilium and network tools to identify fragmentation problems.

```bash
# Check for fragment-related drops in Cilium's datapath events
kubectl -n kube-system exec ds/cilium -- cilium-dbg monitor --type drop | grep -i frag

# Use Hubble to observe flows with fragmentation indicators
hubble observe --follow --output json | jq 'select(.flow.l4.UDP != null)'

# Check kernel fragmentation statistics
cat /proc/net/snmp | grep -E "ReasmReqds|ReasmFails|FragFails"

# Test PMTU discovery to find the actual path MTU
tracepath -n <destination-ip>
```

## Step 5: Configure Path MTU Discovery

Enable proper PMTU (Path Maximum Transmission Unit) discovery to dynamically adjust packet sizes.

```bash
# Ensure PMTU discovery is enabled on all nodes
# Check current PMTU configuration
sudo sysctl net.ipv4.ip_no_pmtu_disc

# Enable PMTU discovery (value 0 = enabled)
sudo sysctl -w net.ipv4.ip_no_pmtu_disc=0

# Make it persistent
echo "net.ipv4.ip_no_pmtu_disc = 0" | sudo tee -a /etc/sysctl.d/99-cilium.conf
sudo sysctl --system

# Enable Cilium's PMTU handling for ICMP fragmentation-needed replies
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set pmtuDiscovery.enabled=true

# Verify Cilium PMTU configuration
cilium config view | grep -i pmtu
```

## Best Practices

- Always set Cilium's MTU explicitly based on your network topology rather than relying on auto-detection
- Enable fragment tracking when applying L4 policies to UDP-heavy workloads (DNS, video streaming, etc.)
- Test cross-node large packet transfers after any MTU configuration change: `ping -M do -s 1400 <pod-ip>`
- Monitor the `cilium_bpf_map_pressure` metrics for `cilium_ipv4_frag_datagrams` and `cilium_ipv6_frag_datagrams` - if the fragment maps fill up, fragments can be dropped
- Coordinate MTU settings with cloud provider networking documentation (each cloud has different encapsulation overhead)

## Conclusion

Cilium's fragment handling requires careful configuration in environments with encapsulation overhead or complex network paths. By setting appropriate MTU values, enabling fragment tracking for UDP policies, and ensuring PMTU discovery is functioning, you prevent the silent packet drops that fragmentation misconfigurations cause. Proper fragment handling configuration is especially important for databases, DNS, and real-time communication applications running in Kubernetes.
