# How to Troubleshoot MTU Issues in Kubernetes Overlay Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, MTU, CNI, Overlay, Flannel, Calico, Networking, Troubleshooting

Description: Diagnose and fix MTU mismatches in Kubernetes overlay networks, including Flannel, Calico, and Weave, to resolve pod-to-pod connectivity failures and TCP stalls.

## Introduction

MTU misconfiguration is one of the most common and difficult-to-diagnose networking problems in Kubernetes. Pod network interfaces inherit MTU from the CNI plugin, which must account for overlay encapsulation overhead (VXLAN, IPIP, WireGuard). When pod MTU is too large, large TCP connections stall, curl requests hang, and DNS over TCP fails - while small packets and ping work fine. The symptoms match an MTU black hole.

## Diagnose MTU Issues in Pods

```bash
# Check pod interface MTU:

kubectl exec -n default <pod-name> -- ip link show eth0
# Look for: mtu XXXX
# Should be: physical-MTU minus overlay overhead

# Common correct values:
# Flannel VXLAN:   1450 (1500 - 50)
# Calico IPIP:     1480 (1500 - 20)
# Calico VXLAN:    1450 (1500 - 50)
# Weave:           1376 (1500 - 124)
# WireGuard:       1440 (1500 - 60)

# Test MTU within cluster (netshoot ships iputils ping with -M support):
kubectl run -it --rm mtu-test --image=nicolaka/netshoot --restart=Never -- \
  ping -M do -s 1422 -c 3 <other-pod-ip>
# 1422 + 28 = 1450 → tests VXLAN MTU

# Large ping failing = MTU issue:
kubectl run -it --rm mtu-test --image=nicolaka/netshoot --restart=Never -- \
  ping -M do -s 1472 -c 3 <other-pod-ip>
# This should FAIL if VXLAN overlay with 1450 pod MTU
```

## Check Node MTU vs Pod MTU

```bash
# Check node (host) interface MTU:
kubectl get nodes -o wide
kubectl debug node/<node-name> -it --image=ubuntu -- \
  ip link show eth0 | grep mtu

# Or via DaemonSet for all nodes:
cat << 'EOF' | kubectl apply -f -
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: mtu-checker
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: mtu-checker
  template:
    metadata:
      labels:
        app: mtu-checker
    spec:
      hostNetwork: true
      containers:
      - name: checker
        image: busybox
        command: ["sh", "-c", "ip link show; sleep 3600"]
        securityContext:
          privileged: true
EOF

kubectl -n kube-system logs -l app=mtu-checker | grep mtu
```

## Fix Flannel MTU

```bash
# Check current Flannel MTU config:
kubectl -n kube-system get configmap kube-flannel-cfg -o yaml | \
  grep -A 10 "net-conf"

# Edit to set correct MTU:
kubectl -n kube-system edit configmap kube-flannel-cfg

# In net-conf.json, add MTU:
# {
#   "Network": "10.244.0.0/16",
#   "Backend": {
#     "Type": "vxlan",
#     "MTU": 1450
#   }
# }

# Restart Flannel pods to apply:
kubectl -n kube-system rollout restart daemonset kube-flannel-ds

# Verify new MTU on pod interfaces:
kubectl exec <pod-name> -- ip link show eth0 | grep mtu
```

## Fix Calico MTU

```bash
# Check current Calico MTU:
kubectl get felixconfiguration default -o yaml | grep -i mtu

# Set MTU via FelixConfiguration:
kubectl patch felixconfiguration default --type merge \
  -p '{"spec":{"vxlanMTU":1450,"ipipMTU":1480}}'

# Or via Calico operator Installation resource:
kubectl patch installation default --type merge \
  -p '{"spec":{"calicoNetwork":{"mtu":1450}}}'

# Restart Calico nodes:
kubectl -n calico-system rollout restart daemonset calico-node

# Verify:
kubectl exec -n calico-system <calico-node-pod> -- \
  ip link show | grep "mtu"
```

## Detect MTU Mismatch with Packet Captures

```bash
# Run tcpdump on node to see oversized packets from pods:
kubectl debug node/<node-name> -it --image=ubuntu -- bash
# Inside:
tcpdump -i flannel.1 -n 'ip[6:2] & 0x3fff != 0'
# Shows fragmented packets in overlay

# Or capture on VXLAN UDP port:
tcpdump -i eth0 -n 'udp port 4789 and len > 1400'
# Large UDP = possible oversized VXLAN packets

# Check for TCP retransmissions (sign of MTU black hole):
tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-syn != 0'
# Many SYNs without data = TCP stall due to MTU

# Monitor fragmentation stats on nodes:
nstat | grep -E 'IpFrag|IpReasm'
```

## Apply MSS Clamping as Safety Net

```bash
# Apply MSS clamping on all overlay interfaces (node-level):
# Add to iptables on each node or via DaemonSet

cat << 'EOF' | kubectl apply -f -
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: mss-clamp
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: mss-clamp
  template:
    metadata:
      labels:
        app: mss-clamp
    spec:
      hostNetwork: true
      initContainers:
      - name: mss-clamp
        image: ubuntu
        securityContext:
          privileged: true
        command:
        - /bin/bash
        - -c
        - |
          iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
            -j TCPMSS --clamp-mss-to-pmtu
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9
EOF
```

## Conclusion

Kubernetes MTU issues manifest as intermittent TCP failures while small packets (ping, DNS over UDP) work fine. Check pod MTU with `kubectl exec <pod> -- ip link show eth0` and compare to the expected value for your CNI: Flannel VXLAN (1450), Calico IPIP (1480), Calico VXLAN (1450). Fix by updating the CNI ConfigMap or FelixConfiguration with the correct MTU value and restarting CNI pods. Add TCP MSS clamping as a safety net. Always test with `ping -M do` from inside a pod to verify large packets traverse the overlay correctly.
