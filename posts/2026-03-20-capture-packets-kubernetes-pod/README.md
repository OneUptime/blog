# How to Capture IPv4 Packets on a Kubernetes Pod Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, tcpdump, Pod Network, Container, Packet Capture

Description: Learn how to capture network packets on Kubernetes pod networks using tcpdump inside pods, ephemeral debug containers, or directly on the node's pod network interface for troubleshooting container...

## Kubernetes Network Capture Challenges

Kubernetes pods have isolated network namespaces. To capture pod traffic you have several options:
1. Run tcpdump inside the pod (if it has the binary)
2. Use an ephemeral debug container (Kubernetes 1.25+)
3. Capture on the host node's pod network interface (veth pair)
4. Use a DaemonSet-based capture tool

## Step 1: Capture Inside a Pod

```bash
# Check if tcpdump is available in the pod

kubectl exec -it my-pod -- which tcpdump

# If available, capture directly
kubectl exec -it my-pod -- tcpdump -i eth0 -n -w /tmp/capture.pcap

# Copy capture to local machine (requires tar in the container image)
kubectl cp my-pod:/tmp/capture.pcap /tmp/pod-capture.pcap
wireshark /tmp/pod-capture.pcap

# Real-time pipe to local Wireshark
kubectl exec -i my-pod -- tcpdump -i eth0 -n -w - | wireshark -k -i -
```

## Step 2: Use Ephemeral Debug Container (Kubernetes 1.25+)

```bash
# Add a debug container with network tools to a running pod
# Pods share a network namespace, so tcpdump sees the same pod interfaces

kubectl debug -it my-pod \
    --image=nicolaka/netshoot \
    --target=my-container

# Inside the debug container:
tcpdump -i eth0 -n -w /tmp/capture.pcap 'not port 22'

# nicolaka/netshoot includes: tcpdump, tshark, wireshark, curl, nmap, iperf3
```

```bash
# One-liner to stream capture from debug container to local Wireshark
kubectl debug my-pod \
    --attach=true \
    --quiet \
    --image=nicolaka/netshoot \
    --target=my-container \
    -- tcpdump -i eth0 -n -w - | wireshark -k -i -
```

## Step 3: Capture on Node via veth Interface

```bash
# Find which node the pod is running on and get one container runtime ID
kubectl get pod my-pod -o wide
# Note the NODE column

kubectl get pod my-pod -o jsonpath='{.status.containerStatuses[0].containerID}'
# Example output: containerd://7a8b9c...
```

```bash
# Capture on the pod's node-side veth interface
RUNTIME_ID=$(kubectl get pod my-pod -o jsonpath='{.status.containerStatuses[0].containerID}' | sed 's#.*://##')

ssh user@k8s-node-1 "RUNTIME_ID=$RUNTIME_ID bash -s" <<'EOF'
PID=$(sudo crictl inspect "$RUNTIME_ID" | jq -r '.info.pid')
HOST_IFINDEX=$(sudo nsenter -t "$PID" -n ip -o link show eth0 | sed -E 's/.*@if([0-9]+):.*/\1/')
VETH=$(ip -o link | awk -F': ' -v idx="$HOST_IFINDEX" '$1 == idx {print $2}' | cut -d@ -f1)
sudo tcpdump -i "$VETH" -n -w /tmp/pod-veth-capture.pcap
EOF
```

## Step 4: Use ksniff Plugin

```bash
# Install ksniff (kubectl plugin for pod packet capture)
kubectl krew install sniff

# Capture from a pod (streams to Wireshark automatically)
kubectl sniff my-pod -n default

# Capture with filter
kubectl sniff my-pod -f "port 8080" -n default

# Capture to file instead of Wireshark
kubectl sniff my-pod -o /tmp/pod-capture.pcap -n default
```

## Step 5: Deploy DaemonSet-based Capture

```yaml
# tcpdump-daemonset.yaml
# Deploys tcpdump on every node for network debugging
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: packet-capture
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: packet-capture
  template:
    metadata:
      labels:
        app: packet-capture
    spec:
      hostNetwork: true    # Use host network namespace
      containers:
      - name: tcpdump
        image: nicolaka/netshoot
        command: ["tcpdump", "-i", "any", "-n",
                  "-w", "/captures/$(NODE_NAME).pcap",
                  "not port 22"]
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: captures
          mountPath: /captures
        securityContext:
          capabilities:
            add: [NET_ADMIN, NET_RAW]
      volumes:
      - name: captures
        hostPath:
          path: /tmp/k8s-captures
          type: DirectoryOrCreate
```

```bash
kubectl apply -f tcpdump-daemonset.yaml

# Get captures from nodes
kubectl get pods -n kube-system -l app=packet-capture

# Copy capture file
kubectl cp kube-system/packet-capture-xxxxx:/captures/node-name.pcap /tmp/
```

## Step 6: Capture with nsenter on Node

```bash
# Find the node and get one container runtime ID for the pod
kubectl get pod my-pod -o wide
RUNTIME_ID=$(kubectl get pod my-pod -o jsonpath='{.status.containerStatuses[0].containerID}' | sed 's#.*://##')

# Capture in the pod's network namespace on the node
ssh user@k8s-worker-1 "RUNTIME_ID=$RUNTIME_ID bash -s" <<'EOF'
PID=$(sudo crictl inspect "$RUNTIME_ID" | jq -r '.info.pid')
sudo nsenter -t "$PID" -n tcpdump -i eth0 -n -w /tmp/pod-capture.pcap
EOF

# Or pipe to local Wireshark via SSH
ssh user@k8s-worker-1 "RUNTIME_ID=$RUNTIME_ID bash -s" <<'EOF' | wireshark -k -i -
PID=$(sudo crictl inspect "$RUNTIME_ID" | jq -r '.info.pid')
sudo nsenter -t "$PID" -n tcpdump -i eth0 -n -w -
EOF
```

## Step 7: Capture CNI-Specific Traffic

```bash
# Calico IP-in-IP overlay traffic
# On node
sudo tcpdump -i tunl0 -n -w /tmp/calico-ipip.pcap

# Calico VXLAN overlay traffic
sudo tcpdump -i vxlan.calico -n -w /tmp/calico-vxlan.pcap

# Flannel VXLAN backend
sudo tcpdump -i flannel.1 -n -w /tmp/flannel-overlay.pcap

# Calico BGP control-plane traffic on the node uplink (for example, eth0)
sudo tcpdump -i eth0 -n port 179 -w /tmp/calico-bgp.pcap

# Capture encapsulated traffic and inner packets
# Inner packets are visible after decapsulation in Wireshark
# Wireshark display filter: vxlan
```

## Conclusion

Kubernetes pod network capture has multiple approaches: run `tcpdump` directly inside pods, use `kubectl debug` with `nicolaka/netshoot` image for ephemeral debug containers, or install the `kubectl sniff` plugin for automatic Wireshark streaming. On the node level, identify the pod's veth pair and capture there, or use `nsenter -t [PID] -n` to enter the pod's network namespace. For cluster-wide capture, deploy a DaemonSet with `hostNetwork: true` and `NET_ADMIN` / `NET_RAW` capabilities.
