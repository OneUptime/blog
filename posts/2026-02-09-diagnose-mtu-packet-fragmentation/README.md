# How to Diagnose MTU Issues Causing Packet Fragmentation in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Performance

Description: Identify and fix MTU misconfigurations causing packet fragmentation and performance degradation in Kubernetes clusters with practical diagnostic techniques.

---

Maximum Transmission Unit (MTU) problems are silent performance killers in Kubernetes clusters. When MTU is misconfigured, packets get fragmented or dropped, causing mysterious connection failures, slow data transfers, and intermittent timeouts. These issues are particularly hard to diagnose because they often manifest only under specific conditions, like when transferring large payloads.

Understanding how to identify MTU problems and fix them is critical for maintaining reliable network performance in Kubernetes. This guide shows you practical techniques to diagnose MTU issues and packet fragmentation.

## Understanding MTU in Kubernetes Networks

MTU defines the largest packet size that can be transmitted without fragmentation. The standard Ethernet MTU is 1500 bytes, but overlay networks used by Kubernetes CNI plugins often reduce this to accommodate encapsulation headers.

For example, VXLAN encapsulation adds 50 bytes of overhead, so the effective MTU for pod-to-pod communication becomes 1450 bytes. If your pods try to send 1500-byte packets over a VXLAN network with 1450 MTU, those packets must be fragmented or dropped.

The problem gets worse when Path MTU Discovery (PMTUD) fails. PMTUD relies on ICMP messages to discover the correct MTU along a network path. If firewalls block ICMP, pods cannot learn the correct MTU and continue sending oversized packets.

## Symptoms of MTU Problems

MTU issues manifest in specific patterns. Look for these symptoms:

Connections work fine for small requests but hang or timeout with large payloads. For example, API requests succeed, but file uploads fail.

Applications report broken pipe errors or connection resets when transferring data. SSH sessions connect successfully but freeze when pasting large text blocks.

Performance degrades severely for bulk data transfers. A database backup that should take minutes takes hours.

Intermittent connection failures that resolve on retry. The retry succeeds because it might use smaller packets or a different path.

## Checking Current MTU Settings

Start diagnosing MTU issues by checking the configured MTU on pod network interfaces:

```bash
# Check MTU inside a pod
kubectl exec -it my-app-pod -- ip link show

# Look for the mtu value in the output
# Example output:
# 3: eth0@if10: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 ...
```

Compare this with the node's network interface MTU:

```bash
# On the node (requires node access)
ip link show | grep mtu

# Check the CNI bridge MTU
ip link show cni0

# For Calico, check veth pairs
ip link show | grep -A1 cali
```

The pod MTU should match or be smaller than the node's physical interface MTU minus any encapsulation overhead.

## Testing for MTU Issues with Ping

Ping provides a simple way to test if packets of specific sizes can traverse the network:

```bash
# Test with maximum payload size (MTU minus IP/ICMP headers)
# For MTU 1500, test with 1472 bytes (1500 - 20 IP - 8 ICMP)
kubectl exec -it pod-a -- ping -M do -s 1472 pod-b-ip

# The -M do flag prevents fragmentation
# If this fails but smaller packets work, you have an MTU issue

# Test incrementally to find the maximum working packet size
kubectl exec -it pod-a -- ping -M do -s 1400 pod-b-ip
kubectl exec -it pod-a -- ping -M do -s 1450 pod-b-ip
kubectl exec -it pod-a -- ping -M do -s 1472 pod-b-ip

# For IPv6
kubectl exec -it pod-a -- ping6 -M do -s 1452 pod-b-ipv6
```

If large packets fail but small packets succeed, you have found your MTU ceiling. The working packet size plus 28 bytes (IP and ICMP headers) gives you the effective MTU.

## Using Tracepath to Discover MTU

Tracepath automatically discovers the Path MTU to a destination:

```bash
# Install tracepath in a debug pod
kubectl run tracepath-pod --rm -it --image=nicolaka/netshoot -- bash

# Inside the pod, run tracepath to test pod-to-pod MTU
tracepath pod-b-ip

# Example output showing MTU discovery:
# 1:  pod-a                                            0.045ms pmtu 1450
# 2:  10.244.1.1                                       0.234ms
# 3:  pod-b-ip                                         0.456ms reached

# The pmtu value shows the discovered path MTU
```

Tracepath sends packets of increasing sizes until it finds the maximum size that reaches the destination without fragmentation.

## Analyzing Packet Fragmentation with tcpdump

Capture and analyze network traffic to detect fragmentation:

```bash
# Run tcpdump in a debug container
kubectl debug -it pod/my-app-pod --image=nicolaka/netshoot

# Capture traffic and look for fragmented packets
tcpdump -i any -n 'ip[6:2] & 0x3fff != 0'

# This filter shows only fragmented IP packets
# You should see minimal or no output in a healthy network

# Capture and save for detailed analysis
tcpdump -i any -s 65535 -w /tmp/capture.pcap

# Analyze the capture file
tcpdump -r /tmp/capture.pcap | grep -i frag
```

If you see fragmented packets, it indicates MTU mismatches somewhere in the network path.

## Checking CNI Plugin MTU Configuration

Different CNI plugins configure MTU differently. Check your CNI configuration:

For Calico:

```bash
# Check Calico MTU settings
kubectl get cm -n kube-system calico-config -o yaml | grep mtu

# Check Calico node configuration
kubectl get installation default -o yaml | grep mtu

# Verify veth MTU
kubectl exec -n kube-system calico-node-xxx -- ip link show | grep mtu
```

For Cilium:

```bash
# Check Cilium MTU configuration
kubectl get cm -n kube-system cilium-config -o yaml | grep mtu

# Verify MTU on Cilium endpoints
kubectl exec -n kube-system cilium-xxx -- cilium endpoint list
```

For Flannel:

```bash
# Check Flannel configuration
kubectl get cm -n kube-system kube-flannel-cfg -o yaml

# Look for MTU settings in the network configuration
```

## Verifying PMTUD Functionality

Path MTU Discovery relies on ICMP "Packet Too Big" messages. Verify these messages can flow:

```bash
# Test if ICMP packets are being blocked
kubectl exec -it pod-a -- ping -M do -s 1500 pod-b-ip

# If you get "Frag needed and DF set" errors, PMTUD is working
# If packets silently fail, ICMP might be blocked

# Check iptables rules for ICMP filtering
kubectl exec -it pod-a -- iptables -L -n | grep -i icmp
```

If ICMP is blocked by NetworkPolicies or node firewalls, PMTUD cannot function properly.

## Testing Application-Level MTU Issues

Some applications have their own MTU sensitivity. Test with real application traffic:

```bash
# Use curl to transfer large files
kubectl exec -it pod-a -- curl -v http://pod-b-service/large-file

# For SSH connections (common MTU issue)
kubectl exec -it pod-a -- ssh -v user@pod-b-ip

# Test with different packet sizes using netcat
# In pod-b
kubectl exec -it pod-b -- nc -l 8080 > /dev/null

# In pod-a, send data
kubectl exec -it pod-a -- dd if=/dev/zero bs=2000 count=1000 | nc pod-b-ip 8080
```

If large transfers fail while small ones succeed, MTU is likely the culprit.

## Fixing MTU Issues

Once you identify MTU problems, fix them by adjusting your CNI plugin configuration.

For Calico, edit the Installation resource:

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    mtu: 1450  # Set appropriate MTU for your network
```

For Cilium, update the ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:
  mtu: "1450"
```

For Flannel, edit the kube-flannel ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-flannel-cfg
  namespace: kube-system
data:
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "Backend": {
        "Type": "vxlan",
        "MTU": 1450
      }
    }
```

After changing MTU settings, you typically need to restart pods for the new MTU to take effect.

## Automating MTU Detection

Set up automated MTU testing to catch issues early:

```yaml
# Create a DaemonSet to test MTU across nodes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: mtu-tester
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: mtu-tester
  template:
    metadata:
      labels:
        app: mtu-tester
    spec:
      hostNetwork: true
      containers:
      - name: tester
        image: nicolaka/netshoot
        command:
        - /bin/bash
        - -c
        - |
          while true; do
            # Test MTU to Kubernetes API server
            ping -M do -s 1400 -c 3 kubernetes.default.svc.cluster.local
            sleep 300
          done
```

Monitor the logs to detect MTU problems automatically.

## Handling Cloud Provider Specific MTU

Cloud providers have specific MTU requirements:

AWS uses 9001 MTU for enhanced networking, but overlay networks reduce this. Set pod MTU to 8951 for VXLAN on AWS.

GCP supports 1460 MTU on VPC networks. Set pod MTU to 1410 for VXLAN encapsulation.

Azure typically uses 1500 MTU. Set pod MTU to 1450 for overlay networks.

Always account for encapsulation overhead when setting MTU values.

## Conclusion

MTU issues cause frustrating network problems that appear and disappear unpredictably. By systematically checking MTU settings, testing with ping and tracepath, analyzing packet captures, and verifying PMTUD functionality, you can identify and fix these issues.

Remember to account for CNI plugin encapsulation overhead when setting MTU values. The correct MTU depends on your underlying network infrastructure and the encapsulation method your CNI plugin uses. Regular testing and monitoring help catch MTU misconfigurations before they impact production workloads.
