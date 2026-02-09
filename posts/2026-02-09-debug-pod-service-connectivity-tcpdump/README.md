# How to Debug Pod-to-Service Connectivity Failures with tcpdump and nslookup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Debugging, tcpdump, DNS, Networking, Troubleshooting

Description: Master debugging techniques for Kubernetes pod-to-service connectivity issues using tcpdump, nslookup, and other network diagnostic tools to identify and resolve DNS and network problems.

---

When pods can't reach services in Kubernetes, the problem could be DNS, network policies, missing endpoints, or misconfigured kube-proxy. Systematic debugging with the right tools quickly narrows down the issue. This guide shows you how to use tcpdump and nslookup to diagnose and fix connectivity problems.

## The Systematic Debugging Approach

Follow this sequence when debugging connectivity:

1. Verify DNS resolution
2. Check service endpoints exist
3. Test network connectivity
4. Inspect packet flow
5. Check network policies
6. Verify kube-proxy configuration

Each step eliminates possible causes and points you toward the root issue.

## Installing Debugging Tools

Most minimal container images lack debugging tools. Use a debug container or create a debugging pod:

```yaml
# debug-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-tools
  namespace: default
spec:
  containers:
  - name: tools
    image: nicolaka/netshoot
    command: ["/bin/bash"]
    args: ["-c", "while true; do sleep 3600; done"]
```

Apply and exec into it:

```bash
kubectl apply -f debug-pod.yaml
kubectl exec -it debug-tools -- bash
```

Alternatively, use ephemeral debug containers:

```bash
kubectl debug pod-name -it --image=nicolaka/netshoot
```

## Step 1: Verify DNS Resolution

DNS issues are the most common cause of connectivity failures. Test DNS first:

```bash
# Inside the debug pod
nslookup kubernetes.default.svc.cluster.local
```

Expected output:

```
Server:         10.96.0.10
Address:        10.96.0.10#53

Name:   kubernetes.default.svc.cluster.local
Address: 10.96.0.1
```

If DNS fails:

```bash
# Check /etc/resolv.conf
cat /etc/resolv.conf

# Should show:
# nameserver 10.96.0.10
# search default.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5
```

### Test DNS Server Directly

```bash
# Query CoreDNS directly
dig @10.96.0.10 kubernetes.default.svc.cluster.local

# Test with specific query types
dig @10.96.0.10 kubernetes.default.svc.cluster.local A
dig @10.96.0.10 kubernetes.default.svc.cluster.local SRV
```

### Debug DNS Resolution Failures

If DNS doesn't resolve:

```bash
# Check if CoreDNS is running
kubectl get pods -n kube-system -l k8s-app=kube-dns

# View CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns -f

# Test connectivity to CoreDNS
nc -zv 10.96.0.10 53

# Check if the service exists
kubectl get svc -A | grep my-service
```

## Step 2: Check Service Endpoints

Services without endpoints can't route traffic:

```bash
# Check if endpoints exist
kubectl get endpoints my-service -n production

# Expected output should show IP addresses:
# NAME         ENDPOINTS                                   AGE
# my-service   10.244.1.5:8080,10.244.2.3:8080,10.244.3.1:8080   5d
```

If endpoints are missing:

```bash
# Check if pods exist with correct labels
kubectl get pods -n production -l app=my-service -o wide

# Verify service selector matches pod labels
kubectl get svc my-service -n production -o yaml | grep -A 5 selector
kubectl get pods -n production my-service-pod-xxxxx -o yaml | grep -A 10 labels

# Check pod readiness
kubectl get pods -n production -l app=my-service

# If not ready, check readiness probe
kubectl describe pod my-service-pod-xxxxx -n production | grep -A 10 Readiness
```

## Step 3: Test Network Connectivity

Once DNS resolves and endpoints exist, test actual network connectivity:

```bash
# Inside debug pod
# Get the service cluster IP
SERVICE_IP=$(kubectl get svc my-service -n production -o jsonpath='{.spec.clusterIP}')

# Test TCP connectivity
nc -zv $SERVICE_IP 8080

# Test HTTP if applicable
curl -v http://$SERVICE_IP:8080

# Test directly to pod IP (bypass service)
POD_IP=$(kubectl get pod my-service-pod-xxxxx -n production -o jsonpath='{.status.podIP}')
curl -v http://$POD_IP:8080
```

If service IP doesn't work but pod IP does, the issue is in kube-proxy or service configuration.

## Step 4: Capture Packets with tcpdump

When basic tests fail, capture packets to see what's happening on the wire.

### Capture DNS Queries

```bash
# Inside debug pod, capture DNS traffic
tcpdump -i any -n port 53 -v

# In another terminal, trigger DNS query
kubectl exec debug-tools -- nslookup my-service.production.svc.cluster.local
```

Look for:

- Query going to CoreDNS (10.96.0.10)
- Response coming back
- Any NXDOMAIN or SERVFAIL responses

Example output:

```
10.244.1.10.45678 > 10.96.0.10.53: 12345+ A? my-service.production.svc.cluster.local. (58)
10.96.0.10.53 > 10.244.1.10.45678: 12345 1/0/0 A 10.96.100.50 (78)
```

### Capture Service Traffic

```bash
# On the node where the debug pod runs, capture traffic to service IP
sudo tcpdump -i any -n host $SERVICE_IP -v

# Trigger traffic
kubectl exec debug-tools -- curl http://$SERVICE_IP:8080
```

Watch for these patterns:

```
# Request to service IP
10.244.1.10.45678 > 10.96.100.50.8080: Flags [S], seq 123

# After DNAT, request to pod IP
10.244.1.10.45678 > 10.244.2.5.8080: Flags [S], seq 123

# Response from pod
10.244.2.5.8080 > 10.244.1.10.45678: Flags [S.], seq 456, ack 124
```

If you see the first packet but not the DNAT transformation, kube-proxy rules are broken.

### Capture on Multiple Interfaces

```bash
# Capture on all interfaces
sudo tcpdump -i any -n port 8080 -w /tmp/capture.pcap

# Capture on specific interface
sudo tcpdump -i eth0 -n port 8080 -w /tmp/capture.pcap

# Capture on pod's veth interface
# Find the veth pair for the pod
POD_NAME="my-service-pod-xxxxx"
POD_NS="production"
POD_ID=$(kubectl get pod $POD_NAME -n $POD_NS -o jsonpath='{.status.containerStatuses[0].containerID}' | cut -d'/' -f3)

# Find veth interface (Docker example)
VETH=$(docker inspect $POD_ID | jq -r '.[0].NetworkSettings.SandboxKey' | xargs -I {} ip netns identify {} | xargs -I {} ip netns exec {} ip link show | grep veth | awk '{print $2}' | cut -d'@' -f1)

sudo tcpdump -i $VETH -n -w /tmp/pod-capture.pcap
```

Analyze the capture file:

```bash
# Install wireshark or use tcpdump
tcpdump -r /tmp/capture.pcap -n

# Filter for specific connection
tcpdump -r /tmp/capture.pcap -n 'host 10.244.1.10 and port 8080'
```

## Step 5: Check Network Policies

Network policies can silently drop traffic:

```bash
# List all policies in the namespace
kubectl get networkpolicies -n production

# Check policies affecting the destination pod
kubectl describe networkpolicy -n production

# Check policies affecting the source pod
kubectl get networkpolicies -A -o yaml | grep -B 10 -A 10 "app: debug-tools"
```

Test without network policies:

```bash
# Temporarily delete the policy
kubectl delete networkpolicy my-policy -n production

# Test connectivity again
kubectl exec debug-tools -- curl http://my-service.production.svc.cluster.local:8080

# Restore the policy
kubectl apply -f my-policy.yaml
```

### Verify Network Policy Support

```bash
# Check if CNI supports network policies
kubectl get pods -n kube-system | grep -E 'calico|cilium|weave'

# For Calico, check logs
kubectl logs -n kube-system -l k8s-app=calico-node | grep -i policy
```

## Step 6: Verify kube-proxy Configuration

If packets reach the service IP but don't DNAT to pod IPs, kube-proxy is the issue.

### Check kube-proxy Mode

```bash
kubectl logs -n kube-system -l k8s-app=kube-proxy | grep "Using.*mode"
```

### Inspect iptables Rules (iptables mode)

```bash
# On a node, check service rules
sudo iptables -t nat -L -n -v | grep $SERVICE_IP

# Check service chain
sudo iptables -t nat -L KUBE-SERVICES -n -v | grep $SERVICE_IP

# Trace a specific service
CHAIN=$(sudo iptables -t nat -L KUBE-SERVICES -n | grep $SERVICE_IP | awk '{print $1}')
sudo iptables -t nat -L $CHAIN -n -v
```

### Inspect IPVS Rules (IPVS mode)

```bash
# On a node, list IPVS services
sudo ipvsadm -L -n | grep $SERVICE_IP

# Check specific service details
sudo ipvsadm -L -n --stats | grep -A 5 $SERVICE_IP
```

## Advanced Debugging Techniques

### Using conntrack

Check connection tracking table:

```bash
# On a node
sudo conntrack -L | grep $SERVICE_IP

# Watch connections in real-time
sudo conntrack -E | grep $SERVICE_IP
```

### Testing from Specific Namespaces

```bash
# Create debug pod in specific namespace
kubectl run debug-tools -n production --image=nicolaka/netshoot -it --rm -- bash

# Test connectivity to service in same namespace
curl http://my-service:8080

# Test cross-namespace
curl http://other-service.other-namespace.svc.cluster.local:8080
```

### Checking MTU Issues

```bash
# Inside debug pod
ping -M do -s 1472 $SERVICE_IP

# If this fails but smaller packets work, MTU is the issue
ping -M do -s 1400 $SERVICE_IP

# Check interface MTU
ip link show | grep mtu
```

### Testing with Different Protocols

```bash
# TCP
nc -zv $SERVICE_IP 8080

# UDP
nc -zuv $SERVICE_IP 53

# ICMP (if service supports it)
ping $SERVICE_IP
```

## Common Issues and Solutions

### Issue: Service IP resolves but connection times out

**Diagnosis:**

```bash
# Verify endpoints exist
kubectl get endpoints my-service -n production

# Test pod directly
curl http://$POD_IP:8080
```

**Solution:** If pod works but service doesn't, check kube-proxy rules.

### Issue: DNS NXDOMAIN for service

**Diagnosis:**

```bash
# Check service exists
kubectl get svc my-service -n production

# Verify DNS config
cat /etc/resolv.conf
```

**Solution:** Service might be in different namespace. Use FQDN: my-service.production.svc.cluster.local

### Issue: Connection refused

**Diagnosis:**

```bash
# Check if pod is listening
kubectl exec my-service-pod-xxxxx -- netstat -tlnp
```

**Solution:** Pod might not be running or listening on wrong port.

### Issue: Intermittent failures

**Diagnosis:**

```bash
# Check endpoint count
kubectl get endpoints my-service -n production

# Test multiple times
for i in {1..20}; do curl http://my-service:8080 || echo "FAILED"; done
```

**Solution:** Some pods might be failing health checks.

## Creating a Debugging Checklist

Save this as a troubleshooting runbook:

```bash
#!/bin/bash
# debug-service-connectivity.sh

SERVICE_NAME=$1
NAMESPACE=$2

echo "=== Debugging $SERVICE_NAME in $NAMESPACE ==="

echo "1. Checking service exists..."
kubectl get svc $SERVICE_NAME -n $NAMESPACE

echo "2. Checking endpoints..."
kubectl get endpoints $SERVICE_NAME -n $NAMESPACE

echo "3. Testing DNS resolution..."
kubectl run test-dns --image=busybox -it --rm -- nslookup $SERVICE_NAME.$NAMESPACE.svc.cluster.local

echo "4. Testing connectivity..."
SERVICE_IP=$(kubectl get svc $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
SERVICE_PORT=$(kubectl get svc $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.ports[0].port}')
kubectl run test-connect --image=nicolaka/netshoot -it --rm -- nc -zv $SERVICE_IP $SERVICE_PORT

echo "5. Checking network policies..."
kubectl get networkpolicies -n $NAMESPACE

echo "=== Debug complete ==="
```

Use it:

```bash
chmod +x debug-service-connectivity.sh
./debug-service-connectivity.sh my-service production
```

## Best Practices

When debugging connectivity:

- Start with simple tests (DNS, ping) before complex ones (tcpdump)
- Test both service IP and pod IP to isolate the issue
- Check one thing at a time to avoid confusion
- Document your findings for future reference
- Use debug pods with full tooling rather than production pods
- Clean up debug resources after troubleshooting
- Save packet captures for difficult issues
- Involve network team for complex multi-cluster issues
- Keep a runbook of common issues and solutions

Mastering tcpdump and nslookup for Kubernetes debugging makes you incredibly effective at solving network issues. These skills are invaluable when production is down and you need answers fast.
