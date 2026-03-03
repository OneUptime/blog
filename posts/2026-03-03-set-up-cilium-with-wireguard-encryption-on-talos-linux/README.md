# How to Set Up Cilium with WireGuard Encryption on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cilium, WireGuard, Encryption, Network Security

Description: Step-by-step guide to enabling WireGuard-based transparent encryption for pod-to-pod traffic using Cilium on Talos Linux.

---

In a Kubernetes cluster, pod-to-pod traffic typically travels unencrypted across the network. If someone gains access to the underlying network infrastructure, they can sniff traffic between your services. For clusters running in shared data centers, multi-tenant environments, or anywhere with strict compliance requirements, encrypting this traffic is essential. Cilium on Talos Linux supports WireGuard-based transparent encryption that secures all pod traffic without any application changes.

## Why WireGuard

WireGuard is a modern VPN protocol that is fast, simple, and uses state-of-the-art cryptography. Compared to IPsec (the other encryption option Cilium supports), WireGuard has several advantages:

- Significantly less configuration complexity
- Better performance due to its lean protocol design
- Smaller attack surface with fewer moving parts
- Built into the Linux kernel since version 5.6

Talos Linux ships with WireGuard support in the kernel, making it a natural fit.

## Prerequisites

You need:

- A Talos Linux cluster (version 1.5 or newer recommended)
- Cilium installed as the CNI
- Helm configured for managing Cilium
- Talos Linux kernel with WireGuard module (included by default)

Verify WireGuard is available on your Talos nodes:

```bash
# Check if the WireGuard kernel module is loaded
talosctl -n 192.168.1.10 read /proc/modules | grep wireguard

# If empty, the module might need to be loaded
# Talos typically loads it on demand when Cilium requests it
```

## Enabling WireGuard Encryption

If Cilium is already installed, enable WireGuard through a Helm upgrade:

```bash
# Enable WireGuard encryption
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set encryption.enabled=true \
  --set encryption.type=wireguard
```

For a fresh Cilium installation with WireGuard from the start:

```bash
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true \
  --set securityContext.capabilities.ciliumAgent="{CHOWN,KILL,NET_ADMIN,NET_RAW,IPC_LOCK,SYS_ADMIN,SYS_RESOURCE,DAC_OVERRIDE,FOWNER,SETGID,SETUID}" \
  --set securityContext.capabilities.cleanCiliumState="{NET_ADMIN,SYS_ADMIN,SYS_RESOURCE}" \
  --set cgroup.autoMount.enabled=false \
  --set cgroup.hostRoot=/sys/fs/cgroup \
  --set k8sServiceHost=localhost \
  --set k8sServicePort=7445 \
  --set encryption.enabled=true \
  --set encryption.type=wireguard
```

Wait for all Cilium pods to restart with the new configuration:

```bash
# Watch the rollout
kubectl rollout status daemonset/cilium -n kube-system

# Verify all pods are running
kubectl get pods -n kube-system -l k8s-app=cilium
```

## Verifying Encryption

After enabling WireGuard, verify that encryption is active:

```bash
# Check Cilium encryption status
kubectl exec -n kube-system ds/cilium -- cilium status | grep Encryption

# Expected output:
# Encryption: Wireguard [NodeEncryption: Disabled, cilium_wg0 (Pubkey: xxxxx, Port 51871, Peers: 4)]
```

Check the WireGuard interface on each node:

```bash
# View WireGuard interface details through Cilium
kubectl exec -n kube-system ds/cilium -- cilium encrypt status

# This shows:
# - Public keys for each node
# - Number of peers
# - Traffic statistics
```

## Testing Encrypted Traffic

Create test pods and verify that traffic between them is encrypted:

```bash
# Create test pods on different nodes
kubectl run sender --image=busybox:1.36 --restart=Never -- sleep 3600
kubectl run receiver --image=nginx:alpine --restart=Never

# Wait for pods to be running
kubectl wait --for=condition=Ready pod/sender pod/receiver

# Get the receiver's IP
RECEIVER_IP=$(kubectl get pod receiver -o jsonpath='{.status.podIP}')

# Send traffic
kubectl exec sender -- wget -qO- http://$RECEIVER_IP

# Verify the traffic was encrypted by checking WireGuard stats
kubectl exec -n kube-system ds/cilium -- cilium encrypt status

# The transfer bytes should increase, confirming traffic goes through WireGuard
```

You can also verify encryption by looking at the raw network traffic. On Talos Linux, you cannot run tcpdump directly, but you can check through the Cilium agent:

```bash
# Check WireGuard peer connections and their stats
kubectl exec -n kube-system ds/cilium -- wg show cilium_wg0

# Output shows:
# interface: cilium_wg0
#   public key: xxxx
#   private key: (hidden)
#   listening port: 51871
#
# peer: yyyy
#   endpoint: 192.168.1.21:51871
#   allowed ips: 10.244.1.0/24
#   latest handshake: 12 seconds ago
#   transfer: 1.23 MiB received, 456 KiB sent
```

## Enabling Node-to-Node Encryption

By default, Cilium WireGuard encrypts pod-to-pod traffic. You can also enable node-to-node encryption, which covers traffic between nodes that does not originate from pods (like kubelet communication):

```bash
# Enable node encryption
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set encryption.enabled=true \
  --set encryption.type=wireguard \
  --set encryption.nodeEncryption=true
```

After upgrading:

```bash
# Verify node encryption is enabled
kubectl exec -n kube-system ds/cilium -- cilium status | grep NodeEncryption
# Expected: NodeEncryption: Enabled
```

## WireGuard with Hubble

WireGuard encryption works alongside Hubble observability. Hubble can still see and report on network flows even though the traffic is encrypted on the wire:

```bash
# Enable both WireGuard and Hubble
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set encryption.enabled=true \
  --set encryption.type=wireguard \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true
```

This is because Hubble captures flows at the eBPF layer before they hit the WireGuard tunnel.

## Performance Considerations

WireGuard adds some overhead to network traffic, but it is minimal compared to IPsec. In benchmarks, WireGuard typically reduces throughput by 5-15% depending on packet size and hardware.

To get the best performance:

```yaml
# Talos machine config for performance optimization
machine:
  sysctls:
    # Increase network buffer sizes for better WireGuard throughput
    net.core.rmem_max: "16777216"
    net.core.wmem_max: "16777216"
    net.core.rmem_default: "262144"
    net.core.wmem_default: "262144"
```

On nodes with many peers (large clusters), WireGuard key negotiation can add latency. Cilium manages key rotation automatically, but you should monitor for any handshake delays:

```bash
# Check handshake times for all peers
kubectl exec -n kube-system ds/cilium -- wg show cilium_wg0 latest-handshakes

# If any peer shows a very old handshake, there might be connectivity issues
```

## Key Rotation

Cilium handles WireGuard key rotation automatically. Keys are rotated periodically without any manual intervention. You can check the current keys:

```bash
# View the current public key for each node
kubectl exec -n kube-system ds/cilium -- cilium encrypt status

# Keys are stored in Kubernetes and managed by Cilium
# No manual key management is needed
```

## Troubleshooting

If encryption is not working:

```bash
# Check Cilium agent logs for WireGuard errors
kubectl logs -n kube-system -l k8s-app=cilium --tail=100 | grep -i "wireguard\|wg\|encrypt"

# Verify WireGuard interface exists
kubectl exec -n kube-system ds/cilium -- ip link show cilium_wg0

# Check if port 51871 (WireGuard default) is open between nodes
# Talos firewall should allow this, but verify if you have custom rules

# Check for kernel module issues
kubectl exec -n kube-system ds/cilium -- modinfo wireguard
```

Common issues:

- **WireGuard module not available** - Ensure Talos Linux version includes WireGuard support
- **Firewall blocking UDP port 51871** - WireGuard uses UDP, make sure it is not blocked
- **Key negotiation failures** - Check that all nodes can reach each other on the WireGuard port
- **Performance degradation** - Monitor with Hubble metrics and tune buffer sizes

## Summary

Enabling WireGuard encryption with Cilium on Talos Linux is straightforward - a single Helm flag turns it on. All pod-to-pod traffic is then transparently encrypted without any application changes. WireGuard's modern cryptography and efficient implementation keep the performance overhead minimal. Combined with Talos Linux's security-focused design, this gives you a cluster where data in transit is protected at the network level, meeting security and compliance requirements with minimal operational burden.
