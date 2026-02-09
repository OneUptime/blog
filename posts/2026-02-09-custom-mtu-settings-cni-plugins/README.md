# How to Configure Custom MTU Settings for CNI Plugins in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CNI, MTU, Networking, Performance

Description: Configure custom MTU (Maximum Transmission Unit) settings for Kubernetes CNI plugins to optimize network performance, avoid packet fragmentation, and resolve connectivity issues in various network environments.

---

MTU (Maximum Transmission Unit) defines the largest packet size that can be transmitted without fragmentation. Incorrect MTU settings cause packet drops, performance degradation, and mysterious connectivity failures in Kubernetes. Different network environments require different MTU configurations, and CNI plugins need proper configuration to match your infrastructure.

## Understanding MTU in Kubernetes

MTU matters at multiple layers:

- Physical network MTU (typically 1500 or 9000 for jumbo frames)
- Overlay network overhead (VXLAN adds 50 bytes, IPsec adds more)
- Pod network MTU (must account for encapsulation)
- Host network MTU

If pod MTU exceeds the physical network MTU minus encapsulation overhead, packets get fragmented or dropped, causing performance issues and connection failures.

## Determining the Correct MTU

Calculate the appropriate MTU for your pods:

```bash
# Check host interface MTU
ip link show eth0 | grep mtu

# Example output: mtu 1500

# For VXLAN overlay (Calico, Flannel VXLAN mode)
# Pod MTU = Host MTU - VXLAN overhead (50 bytes)
# Pod MTU = 1500 - 50 = 1450

# For IPsec encryption
# Pod MTU = Host MTU - VXLAN (50) - IPsec (38-46)
# Pod MTU = 1500 - 50 - 46 = 1404

# For cloud environments with existing tunnels (AWS VPC, GCP)
# Often need to reduce further: 1440 or less
```

## Configuring MTU for Calico

Calico supports multiple data planes with different MTU requirements.

### Calico VXLAN Mode

Edit the Calico configuration:

```bash
kubectl edit configmap calico-config -n kube-system
```

Add or modify MTU settings:

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: calico-config
  namespace: kube-system
data:
  veth_mtu: "1440"  # MTU for veth interfaces
  cni_network_config: |-
    {
      "name": "k8s-pod-network",
      "cniVersion": "0.3.1",
      "plugins": [
        {
          "type": "calico",
          "mtu": 1440,
          "ipam": {
            "type": "calico-ipam"
          }
        }
      ]
    }
```

For Calico with the operator:

```bash
kubectl edit installation default
```

Add MTU configuration:

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    mtu: 1440
    ipPools:
    - cidr: 10.244.0.0/16
      encapsulation: VXLAN
```

### Calico BGP Mode (No Encapsulation)

When using BGP without overlay, use full host MTU:

```yaml
spec:
  calicoNetwork:
    mtu: 1500  # Can use full host MTU
    ipPools:
    - cidr: 10.244.0.0/16
      encapsulation: None
```

Restart Calico pods:

```bash
kubectl rollout restart daemonset calico-node -n kube-system
```

## Configuring MTU for Cilium

Cilium automatically detects MTU but you can override it.

### Using Helm

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set tunnel=vxlan \
  --set mtu=1450
```

### Using cilium CLI

```bash
cilium config set mtu 1450
```

### For Cilium with Encryption

When using WireGuard or IPsec:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set encryption.enabled=true \
  --set encryption.type=wireguard \
  --set mtu=1420  # Reduced for WireGuard overhead
```

Verify MTU configuration:

```bash
kubectl exec -n kube-system cilium-xxxxx -- cilium status | grep MTU
```

## Configuring MTU for Flannel

Flannel MTU is set in the ConfigMap.

Edit Flannel configuration:

```bash
kubectl edit configmap kube-flannel-cfg -n kube-flannel
```

Modify the network configuration:

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: kube-flannel-cfg
  namespace: kube-flannel
data:
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "Backend": {
        "Type": "vxlan",
        "VNI": 1,
        "MTU": 1450
      }
    }
```

For host-gw backend (no encapsulation):

```yaml
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "Backend": {
        "Type": "host-gw",
        "MTU": 1500
      }
    }
```

Restart Flannel:

```bash
kubectl rollout restart daemonset kube-flannel-ds -n kube-flannel
```

## Configuring MTU for Weave Net

Weave Net MTU is set via environment variable:

```bash
kubectl edit daemonset weave-net -n kube-system
```

Add WEAVE_MTU environment variable:

```yaml
spec:
  template:
    spec:
      containers:
      - name: weave
        env:
        - name: WEAVE_MTU
          value: "1376"  # Weave adds 124 bytes overhead
```

For automatic MTU detection:

```yaml
        - name: WEAVE_MTU
          value: "auto"
```

## Cloud Provider Specific MTU Settings

### AWS EKS

AWS VPC CNI typically uses MTU 9001 for jumbo frames:

```bash
kubectl set env daemonset aws-node -n kube-system AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG=true
kubectl set env daemonset aws-node -n kube-system ENI_MTU=9001
```

For standard instances:

```bash
kubectl set env daemonset aws-node -n kube-system ENI_MTU=1500
```

### Google GKE

GKE handles MTU automatically but you can verify:

```bash
# On a node
gcloud compute instances describe <instance-name> --format="get(networkInterfaces[0].mtu)"
```

### Azure AKS

Azure CNI MTU configuration:

```bash
kubectl edit configmap azure-cni-config -n kube-system
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: azure-cni-config
  namespace: kube-system
data:
  cni-config: |
    {
      "cniVersion": "0.3.0",
      "name": "azure",
      "plugins": [
        {
          "type": "azure-vnet",
          "mtu": 1500
        }
      ]
    }
```

## Testing MTU Configuration

After changing MTU, verify it's applied correctly.

### Check Pod Interface MTU

```bash
# Create a test pod
kubectl run test-mtu --image=nicolaka/netshoot -it --rm -- bash

# Inside the pod, check MTU
ip link show eth0

# Should show: mtu 1450 (or your configured value)
```

### Test Path MTU Discovery

```bash
# Inside test pod
ping -M do -s 1422 8.8.8.8  # Should work with correct MTU
ping -M do -s 1500 8.8.8.8  # Should fail if MTU is 1450

# The -M do flag prevents fragmentation
# -s sets packet size
```

### Test Across Nodes

```bash
# Deploy pods on different nodes
kubectl run test-sender --image=nicolaka/netshoot -- sleep 3600
kubectl run test-receiver --image=nicolaka/netshoot -- sleep 3600

# Get receiver pod IP
RECEIVER_IP=$(kubectl get pod test-receiver -o jsonpath='{.status.podIP}')

# From sender, test MTU
kubectl exec test-sender -- ping -M do -s 1422 $RECEIVER_IP
```

## Troubleshooting MTU Issues

### Symptom: Connections Hang During Data Transfer

This classic MTU black hole occurs when initial TCP handshake succeeds but data transfer fails.

**Diagnosis:**

```bash
# Test with different packet sizes
kubectl exec test-pod -- curl -v http://service-name:8080
kubectl exec test-pod -- wget -O /dev/null http://service-name:8080

# Check for packet drops
kubectl exec test-pod -- netstat -s | grep -i fragment
```

**Solution:** Reduce MTU or enable PMTUD.

### Symptom: Some Services Work, Others Don't

Different services might have different packet size requirements.

**Diagnosis:**

```bash
# Capture traffic and check packet sizes
kubectl exec test-pod -- tcpdump -i eth0 -n -vv

# Look for:
# - DF (Don't Fragment) flag set
# - ICMP fragmentation needed messages
```

**Solution:** Set MTU to accommodate largest packet size needed.

### Symptom: High Latency or Packet Loss

Fragmentation causes performance degradation.

**Diagnosis:**

```bash
# Check fragmentation statistics on node
netstat -s | grep -i frag

# Example output showing fragmentation:
# 12345 fragments received ok
# 678 fragments failed
```

**Solution:** Adjust MTU to prevent fragmentation.

## Enabling Path MTU Discovery

Configure TCP PMTUD to automatically discover optimal MTU:

```bash
# On nodes, enable PMTUD
sudo sysctl -w net.ipv4.ip_no_pmtu_disc=0

# Make persistent
echo "net.ipv4.ip_no_pmtu_disc=0" | sudo tee -a /etc/sysctl.conf
```

For IPv6:

```bash
sudo sysctl -w net.ipv6.conf.all.disable_ipv6_pmtud=0
```

## MTU for Jumbo Frames

If your network supports jumbo frames (MTU 9000):

### Verify Network Support

```bash
# On each node
ip link set eth0 mtu 9000

# Test connectivity
ping -M do -s 8972 <peer-node-ip>
```

### Configure CNI for Jumbo Frames

Calico with jumbo frames:

```yaml
spec:
  calicoNetwork:
    mtu: 8950  # 9000 - VXLAN overhead
```

Cilium with jumbo frames:

```bash
helm upgrade cilium cilium/cilium \
  --set mtu=8950
```

## Automated MTU Detection

Some CNIs support automatic MTU detection.

### Cilium Auto-Detection

```bash
helm upgrade cilium cilium/cilium \
  --set autoDirectNodeRoutes=true \
  --set mtu=0  # 0 enables auto-detection
```

### Calico Auto-Detection

Calico automatically detects MTU in most scenarios. To verify:

```bash
kubectl exec -n kube-system calico-node-xxxxx -- calicoctl node status
```

## Best Practices

When configuring MTU:

- Always test in a development environment first
- Use MTU 10-50 bytes smaller than physical network for safety margin
- Account for all encapsulation layers (VXLAN, IPsec, tunnels)
- Test with large file transfers to verify configuration
- Monitor for fragmentation after changes
- Document your MTU calculations for future reference
- Use consistent MTU across all nodes in the cluster
- Consider cloud provider defaults before overriding
- Enable PMTUD for dynamic MTU discovery
- Plan for jumbo frames from the start if your network supports them

Proper MTU configuration is often overlooked but critical for reliable Kubernetes networking. Taking the time to calculate and configure MTU correctly prevents mysterious connection failures and performance issues down the line.
