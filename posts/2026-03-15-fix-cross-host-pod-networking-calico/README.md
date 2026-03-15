# How to Fix Cross-Host Pod Networking Failures with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, BGP, VXLAN, IP-in-IP, Cross-Host, Troubleshooting

Description: Targeted fixes for cross-host pod networking failures in Kubernetes clusters using Calico, organized by root cause.

---

## Introduction

Cross-host pod networking failures in Calico prevent pods on different nodes from communicating, breaking distributed applications and service meshes. Once the root cause has been identified through diagnosis, applying the correct fix is critical to restoring cluster-wide connectivity.

The most common causes include broken BGP peering, missing routes, blocked encapsulation protocols in cloud security groups, misconfigured IP pools, and tunnel interface failures. Each requires a specific remediation approach.

This guide provides fixes for each common root cause, along with verification steps to confirm that cross-host connectivity is fully restored.

## Prerequisites

- Kubernetes cluster (v1.24+) with Calico v3.25+
- `kubectl` and `calicoctl` CLI tools
- SSH access to cluster nodes with root privileges
- Completed diagnosis identifying the root cause
- Cloud provider console access if running in a cloud environment

## Fixing Broken BGP Peering

When `calicoctl node status` shows peers in a non-Established state:

```bash
# Restart calico-node on the affected node to re-establish BGP
kubectl delete pod <calico-node-pod> -n calico-system

# If using node-to-node mesh, verify it is enabled
calicoctl get bgpConfiguration default -o yaml
# If missing, create the default configuration
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  nodeToNodeMeshEnabled: true
  asNumber: 64512
EOF

# Verify peering is re-established
sudo calicoctl node status
```

If BGP peers are configured manually, fix the peer configuration:

```bash
# List and inspect BGP peers
calicoctl get bgpPeer -o yaml

# Fix incorrect peer address or AS number
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: peer-to-node-b
spec:
  peerIP: <correct-node-b-ip>
  asNumber: 64512
EOF
```

## Fixing Cloud Security Group Rules

Cloud providers often block the protocols Calico needs for encapsulation.

```bash
# For IP-in-IP (protocol 4), open it in security groups
# AWS example using CLI
aws ec2 authorize-security-group-ingress \
  --group-id <sg-id> \
  --ip-permissions IpProtocol=4,FromPort=-1,ToPort=-1,IpRanges='[{CidrIp=<node-cidr>}]'

# For VXLAN (UDP 4789)
aws ec2 authorize-security-group-ingress \
  --group-id <sg-id> \
  --ip-permissions IpProtocol=udp,FromPort=4789,ToPort=4789,IpRanges='[{CidrIp=<node-cidr>}]'

# For BGP (TCP 179)
aws ec2 authorize-security-group-ingress \
  --group-id <sg-id> \
  --ip-permissions IpProtocol=tcp,FromPort=179,ToPort=179,IpRanges='[{CidrIp=<node-cidr>}]'
```

## Switching Encapsulation Mode

If IP-in-IP is blocked and cannot be unblocked, switch to VXLAN:

```bash
# Update the IP pool to use VXLAN instead of IP-in-IP
calicoctl get ippool default-ipv4-ippool -o yaml > ippool.yaml
```

Edit the file to change the encapsulation:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  ipipMode: Never
  vxlanMode: Always
  natOutgoing: true
  blockSize: 26
```

```bash
# Apply the updated IP pool
calicoctl apply -f ippool.yaml

# Restart calico-node to pick up the change
kubectl rollout restart daemonset/calico-node -n calico-system
kubectl rollout status daemonset/calico-node -n calico-system
```

## Fixing MTU Configuration

MTU mismatches cause packet fragmentation or drops in cross-host traffic.

```bash
# Check current MTU values
ip link show eth0 | grep mtu      # Node interface
ip link show tunl0 | grep mtu     # IP-in-IP tunnel
ip link show vxlan.calico | grep mtu  # VXLAN tunnel

# Calculate correct MTU:
# IP-in-IP: node_mtu - 20 (e.g., 1500 - 20 = 1480)
# VXLAN: node_mtu - 50 (e.g., 1500 - 50 = 1450)

# Set MTU via Calico FelixConfiguration
calicoctl patch felixconfiguration default --patch \
  '{"spec":{"mtu": 1450}}'

# Restart calico-node to apply
kubectl rollout restart daemonset/calico-node -n calico-system
```

## Fixing IP Pool CIDR Conflicts

If the pod CIDR overlaps with the node network:

```bash
# Check for overlap
echo "Node network:"
ip route | grep -v cali | grep -v bird
echo "Pod CIDR:"
calicoctl get ippool -o custom-columns=CIDR

# Create a new non-overlapping IP pool
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: new-pod-network
spec:
  cidr: 10.244.0.0/16
  ipipMode: Always
  natOutgoing: true
  blockSize: 26
EOF

# Disable the old pool (prevents new allocations)
calicoctl patch ippool default-ipv4-ippool --patch \
  '{"spec":{"disabled": true}}'

# Pods must be recreated to get IPs from the new pool
kubectl rollout restart deployment --all -n <namespace>
```

## Fixing Tunnel Interface Issues

```bash
# If tunl0 or vxlan.calico is DOWN, restart calico-node
kubectl delete pod <calico-node-pod> -n calico-system

# If tunnel interface is missing entirely, check the IP pool mode
calicoctl get ippool -o wide
# Ensure ipipMode or vxlanMode is set to Always or CrossSubnet

# Verify after restart
ip link show tunl0 2>/dev/null || ip link show vxlan.calico 2>/dev/null
```

## Fixing Host Endpoint Policy Blocks

```bash
# Check for host endpoint policies blocking traffic
calicoctl get hostendpoint -o yaml
calicoctl get globalnetworkpolicy -o yaml | grep -A10 "selector.*host"

# If host endpoints are configured, ensure traffic is allowed
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-pod-traffic-between-hosts
spec:
  order: 100
  selector: all()
  ingress:
  - action: Allow
    protocol: 4
  - action: Allow
    protocol: UDP
    destination:
      ports:
      - 4789
  egress:
  - action: Allow
    protocol: 4
  - action: Allow
    protocol: UDP
    destination:
      ports:
      - 4789
  types:
  - Ingress
  - Egress
EOF
```

## Verification

```bash
# Test cross-host pod connectivity
kubectl exec <pod-on-node-A> -- ping -c 5 <pod-ip-on-node-B>

# Verify BGP peering
sudo calicoctl node status

# Verify routes exist
ip route | grep <remote-pod-cidr>

# Run a comprehensive connectivity test
kubectl run nettest --image=nicolaka/netshoot --rm -it -- \
  bash -c 'for ip in <pod-ip-1> <pod-ip-2> <pod-ip-3>; do
    ping -c 1 -W 2 $ip > /dev/null 2>&1 && echo "$ip: OK" || echo "$ip: FAIL"
  done'
```

## Troubleshooting

- **BGP peering flaps**: Check for network instability between nodes or resource exhaustion on the calico-node pods.
- **VXLAN switch causes pod restarts**: Existing pods keep their old tunnel config. Rolling restart of workloads is required.
- **New IP pool not used**: Existing pods retain their old IPs. Only new pods get IPs from the new pool.
- **MTU change not applied**: Verify FelixConfiguration is updated and calico-node pods have restarted on all nodes.

## Conclusion

Fixing cross-host pod networking failures in Calico requires matching the fix to the root cause. BGP peering issues need peer reconfiguration, cloud security group restrictions need protocol-specific rules, encapsulation problems may require switching from IP-in-IP to VXLAN, and MTU mismatches need coordinated configuration changes. Always verify cross-host connectivity from multiple node pairs after applying a fix to ensure full cluster-wide resolution.
