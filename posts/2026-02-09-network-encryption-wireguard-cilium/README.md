# How to Configure Kubernetes Network Encryption with WireGuard in Cilium

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Security

Description: Learn how to enable transparent network encryption for Kubernetes pod-to-pod traffic using WireGuard integrated with Cilium CNI for enhanced security.

---

Network traffic between Kubernetes pods typically travels unencrypted across the cluster network, creating potential security risks when your cluster spans untrusted networks or requires compliance with data protection regulations. While service meshes can provide encryption, they add complexity and overhead. Cilium offers a simpler solution by integrating WireGuard directly into the CNI layer for transparent pod-to-pod encryption.

This guide will walk you through enabling WireGuard-based network encryption in Cilium to protect your inter-pod traffic at the kernel level with minimal performance impact.

## Why WireGuard with Cilium

WireGuard is a modern VPN protocol built into the Linux kernel that provides fast, secure tunneling with minimal configuration. Unlike traditional IPsec or OpenVPN, WireGuard uses state-of-the-art cryptography and has a tiny codebase that's easier to audit and maintain.

Cilium integrates WireGuard to create encrypted tunnels between nodes automatically. This means all pod-to-pod traffic crossing node boundaries gets encrypted transparently without requiring application changes or service mesh sidecars. The encryption happens at the network layer, so your applications don't need to know about it.

## Prerequisites

Before enabling WireGuard encryption, ensure your cluster meets these requirements:

```bash
# Check Linux kernel version (WireGuard is in-tree on Linux 5.6 and newer)

kubectl get nodes -o wide
# SSH to a node and check
uname -r  # 5.6+ includes WireGuard in-tree; older kernels need a supported WireGuard module

# Verify WireGuard kernel module is available
lsmod | grep wireguard

# If not loaded, load it
sudo modprobe wireguard

# Make it persistent across reboots
echo "wireguard" | sudo tee -a /etc/modules-load.d/wireguard.conf
```

Cilium added WireGuard transparent encryption in 1.10, but you should use a currently supported Cilium release. If you're using an older version or different CNI, you'll need to migrate first.

## Installing Cilium with WireGuard Support

If you're installing Cilium fresh, enable WireGuard during installation:

```bash
# Add Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with WireGuard encryption enabled
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set encryption.enabled=true \
  --set encryption.type=wireguard
```

If you use CNI chaining, such as AWS VPC CNI chaining, also set `cni.enableRouteMTUForCNIChaining=true` so Cilium adjusts pod MTU for encrypted traffic.

## Enabling WireGuard on Existing Cilium Installation

For existing Cilium installations, you can enable WireGuard encryption with a rolling update:

```bash
# Upgrade Cilium with WireGuard enabled
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set encryption.enabled=true \
  --set encryption.type=wireguard

# Watch the rollout
kubectl rollout status daemonset/cilium -n kube-system
```

The upgrade triggers a rolling restart of Cilium agents on each node. During this process, node-to-node communication briefly switches between encrypted and unencrypted as each node restarts.

## Verifying WireGuard Encryption

Check that WireGuard is active on your cluster nodes:

```bash
# Install Cilium CLI if not already installed
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz
sudo tar xzvfC cilium-linux-amd64.tar.gz /usr/local/bin
rm cilium-linux-amd64.tar.gz

# Check Cilium status including encryption
cilium status

# Verify WireGuard encryption is active
cilium encryption status
```

You should see output indicating WireGuard encryption is enabled. On each node, check the WireGuard interface:

```bash
# SSH to a node and check WireGuard interfaces
sudo wg show

# You should see something like:
# interface: cilium_wg0
#   public key: <key>
#   private key: (hidden)
#   listening port: 51871
#
# peer: <peer-public-key>
#   endpoint: <peer-ip>:51871
#   allowed ips: 10.0.1.42/32, 10.0.1.43/32
#   latest handshake: 30 seconds ago
#   transfer: 1.23 GiB received, 2.45 GiB sent
```

Each node establishes a WireGuard tunnel with every other node. The "latest handshake" shows when encrypted traffic last flowed between nodes.

## Testing Encrypted Traffic

Deploy test pods on different nodes and verify traffic is encrypted:

```yaml
# Create test deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: encryption-test
spec:
  replicas: 3
  selector:
    matchLabels:
      app: encryption-test
  template:
    metadata:
      labels:
        app: encryption-test
    spec:
      # Force pods onto different nodes
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: encryption-test
            topologyKey: kubernetes.io/hostname
      containers:
      - name: netshoot
        image: nicolaka/netshoot
        command: ["sleep", "infinity"]
```

Apply the deployment and test connectivity:

```bash
kubectl apply -f encryption-test.yaml

# Get pod IPs on different nodes
kubectl get pods -o wide

# Exec into one pod and ping another
kubectl exec -it encryption-test-xxxx -- ping <other-pod-ip>

# On the node, capture traffic on the WireGuard interface
sudo tcpdump -i cilium_wg0 -n

# You'll see the inner pod traffic on the WireGuard interface
```

Try capturing on the physical interface and you'll see encrypted UDP traffic on port 51871 instead of plain pod traffic.

## Monitoring Encryption Performance

WireGuard is designed for high performance, but encryption does add some overhead. Monitor the impact:

```bash
# Check CPU usage of Cilium agents
kubectl top pods -n kube-system -l k8s-app=cilium

# View Cilium encryption status from an agent pod
kubectl exec -n kube-system ds/cilium -- cilium-dbg encrypt status

# On nodes, check detailed WireGuard stats
sudo wg show all transfer
```

WireGuard is efficient, but the exact CPU and latency impact depends on node hardware, kernel, routing mode, and workload traffic patterns. Measure it in your own environment before and after enabling encryption.

## Configuring WireGuard Persistent Keepalive

By default, Cilium uses UDP port 51871 for WireGuard tunnels. If your nodes are behind NAT or stateful firewalls, configure WireGuard persistent keepalive:

```bash
# Set WireGuard persistent keepalive
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set encryption.wireguard.persistentKeepalive=25s
```

The persistent keepalive setting sends periodic packets to maintain NAT mappings and firewall state for connections that might otherwise timeout.

## Handling Node-to-Node Firewall Rules

Ensure your firewall allows WireGuard traffic between nodes:

```bash
# Allow UDP on WireGuard port (default 51871)
sudo iptables -A INPUT -p udp --dport 51871 -j ACCEPT
sudo iptables -A OUTPUT -p udp --dport 51871 -j ACCEPT

# Make rules persistent (Ubuntu/Debian)
sudo apt-get install iptables-persistent
sudo netfilter-persistent save

# For cloud providers, update security groups
# AWS example:
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol udp \
  --port 51871 \
  --source-group sg-xxxxx
```

Without proper firewall rules, WireGuard tunnels cannot establish and inter-node pod communication will fail.

## Rotating WireGuard Keys

Cilium automatically generates WireGuard keys for each node. To manually rotate keys for security compliance:

```bash
# Delete the Cilium pod on a node to regenerate keys
kubectl delete pod -n kube-system cilium-xxxx

# The new pod generates fresh keys automatically
# Peer relationships re-establish with new keys

# For full cluster rotation, rolling restart all Cilium pods
kubectl rollout restart daemonset/cilium -n kube-system
```

Key rotation happens transparently with brief connection interruptions as tunnels re-establish.

## Troubleshooting Encryption Issues

If pods cannot communicate after enabling encryption, check these common issues:

```bash
# Verify WireGuard module is loaded on all nodes
kubectl get nodes -o name | while read node; do
  echo "Checking $node"
  kubectl debug $node -it --image=ubuntu -- chroot /host lsmod | grep wireguard
done

# Check Cilium agent logs for errors
kubectl logs -n kube-system -l k8s-app=cilium --tail=100 | grep -i wireguard

# Verify Cilium encryption status
kubectl exec -n kube-system ds/cilium -- cilium-dbg status | grep Encryption

# Inspect WireGuard peers and handshakes from the Cilium agent
kubectl exec -n kube-system ds/cilium -- cilium-dbg debuginfo --output json | jq .encryption
```

Most issues stem from missing kernel modules or blocked firewall ports. Ensure all nodes run compatible kernel versions and have the WireGuard module available.

## Combining with Network Policies

WireGuard encryption works seamlessly with Cilium network policies. You can encrypt traffic while still enforcing access controls:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: secure-backend
spec:
  endpointSelector:
    matchLabels:
      app: backend
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
```

This policy allows only frontend pods to reach backend pods on port 8080, and all that traffic flows through encrypted WireGuard tunnels.

## Performance Considerations

WireGuard encryption in Cilium performs well, but consider these factors:

- Encryption happens in the kernel, avoiding userspace overhead
- WireGuard uses ChaCha20-Poly1305, which is designed to be fast in software on general-purpose CPUs
- CPU and latency impact vary by workload, node hardware, kernel, MTU, and routing mode
- High-throughput workloads may see more noticeable overhead
- Cilium benchmarks show WireGuard and IPsec trade off differently depending on throughput, request/response rate, MTU, and hardware acceleration

Benchmark your specific workloads before and after enabling encryption to quantify the impact.

## Conclusion

WireGuard encryption in Cilium provides transparent, high-performance network security for Kubernetes clusters. By encrypting pod-to-pod traffic at the CNI layer, you gain strong security guarantees without the complexity of service meshes or application-level encryption.

The integration is straightforward to enable and requires minimal ongoing management. Cilium handles key generation, tunnel establishment, and routing automatically. Combined with network policies and runtime security, WireGuard encryption forms a critical layer in your defense-in-depth strategy.

Enable WireGuard encryption when your cluster handles sensitive data, spans untrusted networks, or requires regulatory compliance. The minimal performance overhead is well worth the security benefits.
