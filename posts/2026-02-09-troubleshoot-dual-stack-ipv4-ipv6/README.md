# How to troubleshoot dual-stack IPv4/IPv6 networking problems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Dual Stack, Network Troubleshooting, IPv4

Description: Master troubleshooting techniques for dual-stack IPv4/IPv6 networking issues in Kubernetes clusters, including connectivity and configuration problems.

---

Dual-stack networking allows Kubernetes clusters to support both IPv4 and IPv6 simultaneously, providing flexibility and future-proofing your infrastructure. However, dual-stack configurations introduce unique challenges. This guide covers practical troubleshooting techniques for resolving dual-stack networking issues.

## Understanding Dual-Stack Networking

In dual-stack mode, pods and services receive both IPv4 and IPv6 addresses. This allows gradual migration from IPv4 to IPv6 while maintaining backward compatibility. The CNI plugin, kube-proxy, and services must all support dual-stack for it to function properly.

## Verifying Dual-Stack Configuration

Before troubleshooting, confirm dual-stack is properly configured:

```bash
# Check cluster configuration
kubectl cluster-info dump | grep -i "service-cluster-ip-range\|cluster-cidr"

# Look for two CIDR ranges:
# --service-cluster-ip-range=10.96.0.0/12,fd00:1234::/112
# --cluster-cidr=10.244.0.0/16,fd00:5678::/48

# Check feature gate
kubectl get nodes -o yaml | grep -A 5 "kubeletConfigKey"
```

Verify your nodes support dual-stack:

```bash
# Check node addresses
kubectl get nodes -o custom-columns='NAME:.metadata.name,IPv4:.status.addresses[?(@.type=="InternalIP")].address,IPv6:.status.addresses[1].address'

# Check pod CIDR allocations
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\t"}{.spec.podCIDRs}{"\n"}{end}'
```

## Diagnosing Pod Connectivity Issues

### Check Pod IP Assignments

Pods should receive both IPv4 and IPv6 addresses:

```bash
# Inspect pod IPs
kubectl get pod my-pod -o jsonpath='{.status.podIPs}' | jq

# Output should show both address families:
# [
#   {"ip": "10.244.1.5"},
#   {"ip": "fd00:5678::5"}
# ]

# Check pod network interface
kubectl exec my-pod -- ip addr show eth0
```

If a pod only has one IP address, the CNI plugin might not be configured for dual-stack.

### Test Basic Connectivity

Deploy a debug pod to test connectivity:

```yaml
# debug-dualstack.yaml
apiVersion: v1
kind: Pod
metadata:
  name: dualstack-debug
spec:
  containers:
  - name: debug
    image: nicolaka/netshoot
    command: ['sleep', '3600']
```

```bash
kubectl apply -f debug-dualstack.yaml

# Test IPv4 connectivity
kubectl exec dualstack-debug -- ping -c 3 8.8.8.8

# Test IPv6 connectivity
kubectl exec dualstack-debug -- ping6 -c 3 2001:4860:4860::8888

# Check routing table
kubectl exec dualstack-debug -- ip -4 route
kubectl exec dualstack-debug -- ip -6 route
```

## Service Configuration Issues

Services must be configured to support dual-stack:

```yaml
# dualstack-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-dualstack-service
spec:
  ipFamilyPolicy: PreferDualStack  # or RequireDualStack
  ipFamilies:
  - IPv4
  - IPv6
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 8080
```

Check service IP family configuration:

```bash
# View service details
kubectl get svc my-dualstack-service -o yaml

# Check ClusterIPs
kubectl get svc my-dualstack-service -o jsonpath='{.spec.clusterIPs}'
# Should show: ["10.96.100.50", "fd00:1234::50"]

# Verify IP families
kubectl get svc my-dualstack-service -o jsonpath='{.spec.ipFamilies}'
# Should show: ["IPv4", "IPv6"]
```

### Testing Service Connectivity

```bash
# Get service IPs
SERVICE_IPV4=$(kubectl get svc my-dualstack-service -o jsonpath='{.spec.clusterIPs[0]}')
SERVICE_IPV6=$(kubectl get svc my-dualstack-service -o jsonpath='{.spec.clusterIPs[1]}')

# Test IPv4 service access
kubectl exec dualstack-debug -- curl http://$SERVICE_IPV4

# Test IPv6 service access (note brackets for IPv6 in URLs)
kubectl exec dualstack-debug -- curl http://[$SERVICE_IPV6]
```

## CNI Plugin Configuration

Different CNI plugins have varying dual-stack support. Here's how to troubleshoot common ones:

### Calico Dual-Stack

```bash
# Check Calico configuration
kubectl -n kube-system get cm calico-config -o yaml | grep -A 10 "ipam"

# Verify IP pools
kubectl get ippools -o yaml

# Check for both IPv4 and IPv6 pools
kubectl get ippools -o custom-columns='NAME:.metadata.name,CIDR:.spec.cidr'
```

Create IPv6 IP pool if missing:

```yaml
# ipv6-pool.yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: ipv6-pool
spec:
  cidr: fd00:5678::/48
  blockSize: 122
  ipipMode: Never
  natOutgoing: false
  nodeSelector: all()
```

### Cilium Dual-Stack

```bash
# Check Cilium configuration
kubectl -n kube-system get cm cilium-config -o yaml | grep -i ipv6

# Verify Cilium is routing both families
kubectl -n kube-system exec ds/cilium -- cilium status | grep -A 5 "IP Addresses"

# Check Cilium endpoints
kubectl -n kube-system exec ds/cilium -- cilium endpoint list
```

## DNS Resolution Issues

CoreDNS must handle both A and AAAA records:

```bash
# Test DNS resolution from a pod
kubectl exec dualstack-debug -- nslookup my-dualstack-service

# Should return both A and AAAA records:
# Name:   my-dualstack-service.default.svc.cluster.local
# Address: 10.96.100.50
# Address: fd00:1234::50

# Test external DNS
kubectl exec dualstack-debug -- nslookup google.com

# Check CoreDNS logs for errors
kubectl -n kube-system logs -l k8s-app=kube-dns --tail=50
```

If AAAA records are missing, check CoreDNS configuration:

```bash
kubectl -n kube-system get cm coredns -o yaml
```

## kube-proxy Dual-Stack Configuration

kube-proxy must handle both address families:

```bash
# Check kube-proxy configuration
kubectl -n kube-system get cm kube-proxy -o yaml | grep -i "cluster-cidr\|service-cluster-ip-range"

# View kube-proxy logs
kubectl -n kube-system logs -l k8s-app=kube-proxy --tail=100 | grep -i ipv6
```

For IPVS mode, verify virtual servers for both families:

```bash
# SSH to a node
# Check IPv4 virtual servers
sudo ipvsadm -L -n -t

# Check IPv6 virtual servers
sudo ipvsadm -L -n -t -6
```

## Node-Level Troubleshooting

### Check Kernel IPv6 Support

```bash
# On each node, verify IPv6 is enabled
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# Should return 0 (enabled)

# If disabled, enable it
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0

# Make permanent
echo "net.ipv6.conf.all.disable_ipv6 = 0" | sudo tee -a /etc/sysctl.conf
echo "net.ipv6.conf.default.disable_ipv6 = 0" | sudo tee -a /etc/sysctl.conf
```

### Verify Node Network Configuration

```bash
# Check node interfaces have IPv6 addresses
ip -6 addr show

# Test IPv6 connectivity between nodes
ping6 -c 3 <node-ipv6-address>

# Check IPv6 routing
ip -6 route show

# Verify IPv6 forwarding is enabled
cat /proc/sys/net/ipv6/conf/all/forwarding
# Should return 1
```

## LoadBalancer and External Access

For external access to dual-stack services:

```yaml
# loadbalancer-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: dualstack-lb
spec:
  type: LoadBalancer
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
  - IPv4
  - IPv6
  selector:
    app: myapp
  ports:
  - port: 80
```

Check LoadBalancer status:

```bash
# View external IPs
kubectl get svc dualstack-lb -o wide

# Test external access
curl http://<external-ipv4>
curl http://[<external-ipv6>]
```

For MetalLB with dual-stack:

```yaml
# metallb-l2-advertisement.yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: dualstack
spec:
  ipAddressPools:
  - ipv4-pool
  - ipv6-pool
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: ipv4-pool
spec:
  addresses:
  - 192.168.1.240-192.168.1.250
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: ipv6-pool
spec:
  addresses:
  - 2001:db8::240-2001:db8::250
```

## Common Issues and Solutions

### Issue 1: Pods Only Get IPv4 Addresses

```bash
# Check pod CIDR configuration
kubectl get nodes -o jsonpath='{.items[0].spec.podCIDRs}'

# If only one CIDR, cluster isn't configured for dual-stack
# Reconfigure API server with both CIDRs:
# --cluster-cidr=10.244.0.0/16,fd00:5678::/48
```

### Issue 2: IPv6 Connectivity Works, IPv4 Does Not

```bash
# Check IP family preference in service
kubectl get svc my-service -o jsonpath='{.spec.ipFamilies[0]}'

# If IPv6 is first, clients might prefer it
# Reorder IP families if needed:
kubectl patch svc my-service -p '{"spec":{"ipFamilies":["IPv4","IPv6"]}}'
```

### Issue 3: External IPv6 Traffic Cannot Reach Pods

```bash
# Verify IPv6 NAT rules
sudo ip6tables -t nat -L -n -v

# Check IPv6 masquerading
sudo ip6tables -t nat -L POSTROUTING -n -v

# Ensure CNI plugin handles IPv6 NAT
```

## Monitoring Dual-Stack Health

Create a comprehensive health check:

```bash
#!/bin/bash
# dualstack-health.sh

echo "=== Dual-Stack Health Check ==="

# Check pod with both IPs
POD_IPS=$(kubectl get pod -l app=myapp -o jsonpath='{.items[0].status.podIPs}' | jq -r '.[].ip')
IPV4_COUNT=$(echo "$POD_IPS" | grep -c "\.")
IPV6_COUNT=$(echo "$POD_IPS" | grep -c ":")

echo "Pods with IPv4: $IPV4_COUNT"
echo "Pods with IPv6: $IPV6_COUNT"

if [ "$IPV4_COUNT" -eq 0 ] || [ "$IPV6_COUNT" -eq 0 ]; then
  echo "WARNING: Not all pods have dual-stack IPs"
fi

# Check service configuration
SERVICES=$(kubectl get svc -A -o json | jq -r '.items[] | select(.spec.ipFamilyPolicy != null) | .metadata.name')
echo "Dual-stack services: $(echo "$SERVICES" | wc -l)"

# Test connectivity
echo "Testing IPv4 connectivity..."
kubectl exec dualstack-debug -- ping -c 1 -W 2 8.8.8.8 &>/dev/null && echo "IPv4: OK" || echo "IPv4: FAILED"

echo "Testing IPv6 connectivity..."
kubectl exec dualstack-debug -- ping6 -c 1 -W 2 2001:4860:4860::8888 &>/dev/null && echo "IPv6: OK" || echo "IPv6: FAILED"
```

## Debugging with tcpdump

Capture and analyze traffic for both protocols:

```bash
# On a node, capture both IPv4 and IPv6
sudo tcpdump -i any -n 'net 10.244.0.0/16 or net fd00:5678::/48' -w dualstack.pcap

# Analyze in Wireshark or with tcpdump
tcpdump -r dualstack.pcap -n | grep -i "IP6\|IP "

# Filter for specific pod traffic
kubectl get pod my-pod -o jsonpath='{.status.podIPs[*].ip}'
# Then filter for those IPs in tcpdump
```

Dual-stack networking requires careful configuration across multiple cluster components. Systematic troubleshooting helps identify whether issues stem from kernel settings, CNI configuration, service definitions, or kube-proxy behavior. Use these techniques to ensure both IPv4 and IPv6 traffic flows correctly through your cluster.
