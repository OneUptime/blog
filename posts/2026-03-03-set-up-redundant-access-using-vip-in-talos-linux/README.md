# How to Set Up Redundant Access Using VIP in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, VIP, Redundancy, High Availability, Kubernetes, Networking

Description: Learn how to build redundant access to your Talos Linux Kubernetes cluster using VIP combined with other high availability techniques for maximum uptime.

---

A single Virtual IP (VIP) gives you basic high availability for your Kubernetes API server in Talos Linux. But for production environments where downtime is not acceptable, you want more than basic. You want redundant access - multiple ways to reach your cluster so that no single failure takes everything down.

This guide covers how to combine VIP with other techniques to build truly redundant access to your Talos Linux cluster.

## The Problem with VIP Alone

While VIP is great for most scenarios, it has limitations:

- It only works within a single Layer 2 broadcast domain
- During failover (3-12 seconds), the API server is unreachable
- If all control plane nodes go down, the VIP goes down too
- A network issue on the VIP's subnet makes the entire cluster unreachable

Redundant access means having backup paths to reach your cluster even when the primary path fails.

## Architecture Overview

A redundant access setup typically includes multiple layers:

```
                     External Clients
                     /              \
              [Primary Path]    [Backup Path]
                  VIP             DNS/LB
              192.168.1.100      backup-api.example.com
                  |                   |
         +-------+-------+    +------+------+
         |       |       |    |      |      |
        CP1     CP2     CP3  CP1    CP2    CP3
```

Clients primarily use the VIP. If the VIP is unreachable, they fall back to the backup path.

## Layer 1: VIP as Primary Access

Start with the standard VIP setup on all control plane nodes:

```yaml
# Control plane node configuration with VIP
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
        vip:
          ip: 192.168.1.100
```

```bash
# Verify VIP is working
curl -sk https://192.168.1.100:6443/healthz
```

This is your primary access path. Most of the time, clients will use this address.

## Layer 2: DNS Round-Robin as Backup

Set up DNS records pointing to all control plane nodes directly:

```
# DNS records for backup access
k8s-api.example.com    A    192.168.1.10
k8s-api.example.com    A    192.168.1.11
k8s-api.example.com    A    192.168.1.12
```

If the VIP is unreachable, clients can connect to `k8s-api.example.com` which will resolve to one of the individual control plane nodes:

```bash
# Test DNS round-robin access
curl -sk https://k8s-api.example.com:6443/healthz
```

For better DNS failover, use a DNS service that supports health checks and removes unhealthy records automatically.

## Layer 3: Multiple Kubeconfig Contexts

Configure your kubeconfig with both the VIP and individual node addresses:

```yaml
# kubeconfig with multiple access methods
apiVersion: v1
kind: Config
clusters:
  - cluster:
      certificate-authority-data: <base64-ca>
      server: https://192.168.1.100:6443    # Primary: VIP
    name: production-vip
  - cluster:
      certificate-authority-data: <base64-ca>
      server: https://192.168.1.10:6443     # Backup: direct to CP1
    name: production-direct-cp1
  - cluster:
      certificate-authority-data: <base64-ca>
      server: https://192.168.1.11:6443     # Backup: direct to CP2
    name: production-direct-cp2
contexts:
  - context:
      cluster: production-vip
      user: admin
    name: production
  - context:
      cluster: production-direct-cp1
      user: admin
    name: production-cp1
  - context:
      cluster: production-direct-cp2
      user: admin
    name: production-cp2
current-context: production
users:
  - name: admin
    user:
      client-certificate-data: <base64-cert>
      client-key-data: <base64-key>
```

Switch contexts when the VIP is down:

```bash
# Normal operation - use VIP
kubectl --context=production get nodes

# VIP down - connect directly to a control plane node
kubectl --context=production-cp1 get nodes
```

## Layer 4: KubePrism (Talos Linux Built-in)

Talos Linux v1.6 introduced KubePrism, an internal load balancer that runs on every node. KubePrism listens on a local port and distributes API server requests across all control plane nodes.

```yaml
# Enable KubePrism
machine:
  features:
    kubePrism:
      enabled: true
      port: 7445
```

KubePrism provides redundancy for internal cluster communication. The kubelet on each node connects to the local KubePrism endpoint (127.0.0.1:7445) instead of the VIP. KubePrism then load balances across all control plane nodes.

This means that even if the VIP is temporarily unreachable, pods can still communicate with the API server through KubePrism:

```bash
# Verify KubePrism is running
talosctl -n <node-ip> get kubeprismlbstatus

# Check KubePrism endpoints
talosctl -n <node-ip> get kubeprismlbstatus -o yaml
```

## Layer 5: Secondary VIP on a Different Interface

If your nodes have multiple network interfaces, you can configure a secondary VIP on a different interface for additional redundancy:

```yaml
# Dual VIP on different interfaces
machine:
  network:
    interfaces:
      # Primary interface with VIP
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
        vip:
          ip: 192.168.1.100
      # Secondary interface with backup VIP
      - interface: eth1
        addresses:
          - 10.0.1.10/24
        vip:
          ip: 10.0.1.100
```

This protects against a switch failure on one network. If the switch serving eth0 goes down, clients can still reach the cluster through eth1's VIP.

## Layer 6: Automated Client Failover

Build failover logic into your client applications:

```bash
#!/bin/bash
# kubectl-redundant.sh - kubectl with automatic failover

VIP="192.168.1.100"
BACKUP_NODES=("192.168.1.10" "192.168.1.11" "192.168.1.12")

# Try VIP first
if curl -sk --connect-timeout 3 "https://${VIP}:6443/healthz" 2>/dev/null | grep -q "ok"; then
    kubectl --server="https://${VIP}:6443" "$@"
    exit $?
fi

echo "VIP not responding, trying direct node access..." >&2

# Try each control plane node
for node in "${BACKUP_NODES[@]}"; do
    if curl -sk --connect-timeout 3 "https://${node}:6443/healthz" 2>/dev/null | grep -q "ok"; then
        echo "Connected to $node" >&2
        kubectl --server="https://${node}:6443" "$@"
        exit $?
    fi
done

echo "ERROR: No control plane node is reachable" >&2
exit 1
```

## Layer 7: External Monitoring and Alerts

Set up external monitoring that checks all access paths:

```yaml
# Monitoring checks
checks:
  # Check 1: VIP health
  - name: "K8s API via VIP"
    url: "https://192.168.1.100:6443/healthz"
    interval: 30s
    alert_after: 2_failures

  # Check 2: Direct node health
  - name: "K8s API via CP1"
    url: "https://192.168.1.10:6443/healthz"
    interval: 60s
    alert_after: 3_failures

  - name: "K8s API via CP2"
    url: "https://192.168.1.11:6443/healthz"
    interval: 60s
    alert_after: 3_failures

  - name: "K8s API via CP3"
    url: "https://192.168.1.12:6443/healthz"
    interval: 60s
    alert_after: 3_failures

  # Check 3: DNS backup
  - name: "K8s API via DNS"
    url: "https://k8s-api.example.com:6443/healthz"
    interval: 60s
    alert_after: 3_failures
```

## Putting It All Together

Here is a complete redundant access configuration for a production Talos Linux cluster:

```yaml
# Control plane machine config with full redundancy
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
        vip:
          ip: 192.168.1.100    # Primary VIP
  features:
    kubePrism:
      enabled: true             # Internal LB for node-local access
      port: 7445
```

Access priority for external clients:
1. VIP (192.168.1.100) - primary, fastest failover
2. DNS round-robin (k8s-api.example.com) - backup, handles VIP subnet failure
3. Direct node IP - last resort, manual failover

Access for internal cluster components (kubelet, etc.):
1. KubePrism (127.0.0.1:7445) - always available, local to each node
2. Falls back to individual control plane nodes automatically

## Testing Redundant Access

Test each access path independently:

```bash
# Test 1: VIP access
curl -sk https://192.168.1.100:6443/healthz && echo "VIP: OK"

# Test 2: DNS access
curl -sk https://k8s-api.example.com:6443/healthz && echo "DNS: OK"

# Test 3: Direct node access
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  curl -sk "https://${node}:6443/healthz" && echo "Node $node: OK"
done

# Test 4: KubePrism (from inside a pod)
kubectl run test-prism --rm -it --image=curlimages/curl -- \
  curl -sk https://127.0.0.1:7445/healthz
```

Test failover scenarios:

```bash
# Scenario 1: VIP owner goes down
# Action: Reboot VIP owner, verify VIP moves
# Expected: 3-12 second interruption, then recovery via VIP

# Scenario 2: Entire VIP subnet has issues
# Action: Block traffic on eth0 on all nodes
# Expected: DNS backup path still works via alternate network

# Scenario 3: Two control plane nodes down
# Action: Stop 2 of 3 CP nodes
# Expected: Cluster is degraded but accessible through surviving node
```

## Common Mistakes to Avoid

1. **Only configuring VIP without testing failover**: Always test that the VIP actually fails over correctly.

2. **Not having a backup access method**: VIP alone is not enough for critical production environments. Always have at least one backup path.

3. **Forgetting to update all references**: When setting up redundant access, make sure monitoring, CI/CD, and other tools know about all access paths.

4. **Not documenting the access hierarchy**: Write down which path is primary, which is backup, and how to switch between them. Include this in your runbook.

5. **Ignoring KubePrism**: KubePrism is free and built into Talos - enable it. It protects internal cluster communication from VIP issues.

## Conclusion

Redundant access to your Talos Linux cluster is about layering multiple access methods so that no single failure takes down your ability to manage the cluster. Start with VIP as your primary access method, add DNS round-robin as a backup, enable KubePrism for internal traffic, and configure your tools with multiple fallback options. The goal is not to prevent every possible failure - it is to make sure you always have a way to reach your cluster, no matter what breaks. Test each layer independently and as part of failure scenarios, and document the failover procedures so your whole team knows what to do when things go wrong.
