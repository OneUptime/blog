# How to Troubleshoot WireGuard Connectivity on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, WireGuard, VPN, Troubleshooting, Networking

Description: A practical troubleshooting guide for diagnosing and fixing common WireGuard connectivity issues on Talos Linux clusters.

---

WireGuard on Talos Linux is generally reliable, but when something goes wrong, the silent nature of the protocol can make troubleshooting challenging. WireGuard does not produce verbose error messages. If a packet cannot be decrypted or a peer is unreachable, it simply drops the packet and moves on. This means you need a systematic approach to identify where the problem lies.

This post provides a step-by-step troubleshooting workflow for WireGuard connectivity issues on Talos Linux, covering the most common problems and their solutions.

## Step 1: Verify the WireGuard Interface Exists

The first thing to check is whether the WireGuard interface was created successfully. If there is a configuration error, Talos might not create the interface at all.

```bash
# Check if the wg0 interface exists
talosctl -n 192.168.1.1 get links

# Look for wg0 in the output
# If it is missing, the WireGuard configuration has an error

# Check the interface addresses
talosctl -n 192.168.1.1 get addresses

# You should see the WireGuard tunnel IP assigned to wg0
# Example: 10.10.0.1/24 on wg0
```

If the interface does not exist, review your Talos machine configuration for syntax errors. Common mistakes include incorrect YAML indentation, missing required fields, or an invalid private key format.

```bash
# Review the current machine configuration
talosctl -n 192.168.1.1 get machineconfig -o yaml | grep -A 30 wireguard
```

## Step 2: Check the WireGuard Peer Status

If the interface exists, check the peer status. This tells you whether the handshake with each peer has been established.

```bash
# Check WireGuard status
talosctl -n 192.168.1.1 read /proc/net/wireguard

# Key things to look for in the output:
# - peer: <public key> - confirms the peer is configured
# - endpoint: <ip:port> - shows the current known endpoint
# - latest handshake: <timestamp> - shows when the last successful handshake occurred
# - transfer: <rx> received, <tx> sent - shows data transfer statistics
# - allowed ips: <cidrs> - shows what traffic is routed to this peer
```

The most important field is `latest handshake`. If it shows a recent timestamp (within the last few minutes), the tunnel is working. If it shows no handshake at all, the peers have never successfully connected.

## Step 3: Diagnose No Handshake

If there is no handshake, the peers cannot reach each other. Work through these checks in order.

### Check Endpoint Reachability

The most common issue is that the endpoint address is not reachable. Verify that you can reach the peer's public IP on the WireGuard port.

```bash
# Check if the endpoint IP is reachable
talosctl -n 192.168.1.1 ping 203.0.113.10

# Note: Ping tests ICMP, but WireGuard uses UDP
# The endpoint might be reachable on ICMP but blocked on UDP
# or vice versa
```

### Check Firewall Rules

WireGuard uses UDP on the configured listen port (typically 51820). Both sides need to allow incoming UDP traffic on this port.

```bash
# On a Linux machine outside Talos, test UDP connectivity
nc -zuv 203.0.113.10 51820

# Common firewall issues:
# - Cloud security groups blocking UDP 51820
# - ISP blocking non-standard UDP ports
# - Host-based firewall rules
```

For cloud environments, check the security group or firewall rules:

```bash
# AWS: Check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxx

# GCP: Check firewall rules
gcloud compute firewall-rules list --filter="name~wireguard"
```

### Verify Public Keys Match

WireGuard silently drops packets if the public key does not match. This is one of the hardest issues to diagnose because there is no error message.

```bash
# On node 1, check the configured peer public key
talosctl -n 192.168.1.1 read /proc/net/wireguard | grep peer

# On node 2, check its own public key
# You need to derive it from the private key in the config
talosctl -n 192.168.1.2 get machineconfig -o yaml | grep privateKey
# Then derive the public key
echo "PRIVATE_KEY_FROM_CONFIG" | wg pubkey
```

The public key shown for node 2's peer on node 1 must match the public key derived from node 2's private key. If they do not match, one side has the wrong key configured.

## Step 4: Diagnose Handshake But No Traffic

If the handshake is successful but traffic does not flow, the issue is usually with the allowedIPs configuration or routing.

### Check AllowedIPs

The `allowedIPs` field serves as both an access control list and a routing table. Traffic is only accepted from a peer if the source IP matches one of the peer's allowedIPs. And traffic is only sent to a peer if the destination matches one of its allowedIPs.

```bash
# Check the allowedIPs for each peer
talosctl -n 192.168.1.1 read /proc/net/wireguard

# Verify that the remote peer's tunnel IP is in the allowedIPs
# For example, if you are trying to reach 10.10.0.2,
# the peer must have 10.10.0.2/32 (or a wider CIDR) in its allowedIPs
```

A common mistake is having overlapping allowedIPs between different peers. Each IP range should appear in only one peer's allowedIPs. If two peers claim the same range, WireGuard will route traffic to the peer that was configured last.

### Check Routing Tables

Even if WireGuard is working correctly, the system routing table needs to know to send traffic through the WireGuard interface.

```bash
# Check the routing table on the Talos node
talosctl -n 192.168.1.1 get routes

# Look for routes pointing to the wg0 interface
# Traffic to the peer's allowedIPs should be routed through wg0

# If routes are missing, the allowedIPs configuration might be wrong
# or you may need to add static routes in the Talos config
```

## Step 5: Diagnose Intermittent Connectivity

If the tunnel works sometimes but drops periodically, the issue is usually related to NAT, keepalive, or MTU.

### NAT and Keepalive Issues

If either peer is behind NAT and `persistentKeepalive` is not set, the NAT mapping will expire during periods of inactivity.

```yaml
# Fix: Enable persistent keepalive
machine:
  network:
    interfaces:
      - interface: wg0
        wireguard:
          peers:
            - publicKey: "PEER_KEY"
              endpoint: peer.example.com:51820
              allowedIPs:
                - 10.10.0.2/32
              # Add keepalive to maintain NAT mappings
              persistentKeepalive: 25
```

### MTU Issues

If large packets fail but small packets work, you have an MTU problem. WireGuard adds overhead to each packet, so the MTU on the WireGuard interface must be lower than the physical interface MTU.

```bash
# Check the MTU of the WireGuard interface
talosctl -n 192.168.1.1 get links | grep wg0

# The WireGuard MTU should be at least 80 bytes less than
# the physical interface MTU
# For a standard 1500-byte MTU: set wg0 to 1420

# Test with different packet sizes
talosctl -n 192.168.1.1 ping -s 1400 10.10.0.2
# If this fails but smaller sizes work, reduce the WireGuard MTU
```

Fix the MTU in the Talos configuration:

```yaml
machine:
  network:
    interfaces:
      - interface: wg0
        # Standard MTU for WireGuard over a 1500-byte link
        mtu: 1420
```

## Step 6: Check Talos Logs

Talos logs can provide clues about network configuration issues.

```bash
# Check for network-related messages in dmesg
talosctl -n 192.168.1.1 dmesg | grep -i wireguard

# Check the networkd logs for configuration errors
talosctl -n 192.168.1.1 logs networkd

# Look for any errors during config application
talosctl -n 192.168.1.1 logs machined | grep -i error
```

## Step 7: Verify Both Sides

WireGuard issues often look different from each side. Always check both peers when troubleshooting.

```bash
# Check status on both sides
echo "=== Node 1 ==="
talosctl -n 192.168.1.1 read /proc/net/wireguard

echo "=== Node 2 ==="
talosctl -n 192.168.1.2 read /proc/net/wireguard
```

Compare the output. If node 1 shows a recent handshake with node 2 but node 2 shows no handshake with node 1, there is a key mismatch or routing asymmetry.

## Common Issues Quick Reference

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No wg0 interface | Config syntax error | Check YAML and key format |
| No handshake | Firewall blocking UDP | Open UDP port 51820 |
| No handshake | Wrong public key | Verify keys match on both sides |
| Handshake but no traffic | Wrong allowedIPs | Check CIDR ranges match peer IPs |
| Intermittent drops | NAT timeout | Enable persistentKeepalive |
| Large packets fail | MTU too high | Set wg0 MTU to 1420 |
| One-way traffic | Asymmetric config | Check both peers have correct settings |

## Automated Health Check Script

For ongoing monitoring, you can run a health check that verifies WireGuard status across your cluster.

```bash
# Simple WireGuard health check for all nodes
NODES=("192.168.1.1" "192.168.1.2" "192.168.1.3")

for node in "${NODES[@]}"; do
  echo "Checking $node..."
  # Get the last handshake time for each peer
  talosctl -n "$node" read /proc/net/wireguard 2>/dev/null | \
    grep "latest handshake" | while read -r line; do
      echo "  $line"
    done
  echo ""
done
```

## Conclusion

Troubleshooting WireGuard on Talos Linux comes down to a methodical approach: verify the interface exists, check the handshake status, test reachability, validate keys and allowed IPs, and examine MTU and keepalive settings. Because WireGuard is intentionally quiet about errors, you need to check each component individually rather than relying on error messages. Once you identify the root cause, the fix is usually a small configuration change applied through talosctl. Keep this troubleshooting workflow handy for when things go wrong, and consider setting up automated health checks to catch problems before they affect your workloads.
