# How to Use netshoot Pod for Comprehensive Network Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Debugging

Description: Master the netshoot container image for comprehensive network troubleshooting in Kubernetes with its extensive collection of debugging tools.

---

Network debugging in Kubernetes often requires tools that application containers do not include. Instead of building debug tools into production images or installing them manually, the netshoot container image provides a comprehensive toolbox specifically designed for network troubleshooting. It contains dozens of networking utilities in a single container image that you can deploy anywhere in your cluster.

Created by Nicolaka, netshoot includes everything from basic connectivity tools like ping and curl to advanced diagnostic utilities like tcpdump, nmap, and iperf. This makes it the go-to image for Kubernetes network debugging.

## What netshoot Contains

The netshoot image packages an extensive collection of tools organized by function. For basic connectivity testing, it includes ping, curl, wget, netcat, telnet, and httpie. For DNS troubleshooting, it has dig, nslookup, host, and dog. For network analysis, it provides tcpdump, wireshark-cli, ngrep, and termshark. For performance testing, it includes iperf, iperf3, and ab. For security testing, it has nmap, masscan, and nikto. For protocol debugging, it contains openssl, gnutls-cli, and various protocol-specific tools.

This comprehensive toolkit eliminates the need to remember which image has which tool or to build custom debug images.

## Deploying netshoot as a Standalone Pod

The simplest way to use netshoot is deploying it as a standalone debugging pod:

```bash
# Create a netshoot pod
kubectl run netshoot --rm -it --image=nicolaka/netshoot -- bash

# You get an interactive shell with all tools available
# Test connectivity
ping google.com

# Test HTTP endpoint
curl -v https://api.example.com

# Check DNS
dig kubernetes.default.svc.cluster.local

# Exit when done (pod is automatically deleted)
exit
```

This approach works well for general debugging where you need network tools but do not need to share the network namespace of a specific pod.

## Using netshoot with kubectl debug

Attach netshoot to existing pods as an ephemeral container:

```bash
# Attach netshoot to a running pod
kubectl debug -it pod/my-app-pod --image=nicolaka/netshoot

# Share the process namespace with the target container
kubectl debug -it pod/my-app-pod --image=nicolaka/netshoot --target=my-app-container

# This gives you the exact network view of the application
```

The ephemeral container approach is ideal when debugging specific pod network issues without modifying the pod definition.

## Testing Service Connectivity

Use netshoot to verify service discovery and connectivity:

```bash
# Deploy netshoot
kubectl run netshoot --rm -it --image=nicolaka/netshoot -- bash

# Test service DNS resolution
nslookup my-service.my-namespace.svc.cluster.local

# Test service connectivity with curl
curl -v http://my-service.my-namespace.svc.cluster.local:8080

# Test with httpie for better formatted output
http http://my-service.my-namespace.svc.cluster.local:8080/api/health

# Test specific service endpoints
for ip in $(dig +short my-service.my-namespace.svc.cluster.local); do
  echo "Testing $ip"
  curl -s -o /dev/null -w "HTTP %{http_code} - %{time_total}s\n" http://$ip:8080
done
```

This quickly identifies service discovery or connectivity problems.

## Capturing and Analyzing Network Traffic

netshoot includes tcpdump and termshark for packet capture:

```bash
# Attach netshoot to target pod
kubectl debug -it pod/my-app-pod --image=nicolaka/netshoot --target=my-app-container

# Capture all traffic
tcpdump -i any -w /tmp/capture.pcap

# Capture HTTP traffic only
tcpdump -i any -A -s 0 'tcp port 80'

# Capture to/from specific IP
tcpdump -i any host 10.244.1.5

# Use termshark for interactive TUI analysis
termshark -i any port 8080

# Copy capture file for local analysis
# From another terminal:
kubectl cp my-app-pod:/tmp/capture.pcap ./capture.pcap
```

The ability to capture and analyze traffic directly in the cluster simplifies debugging complex protocol issues.

## Performing DNS Deep Dive

netshoot provides multiple DNS tools for comprehensive troubleshooting:

```bash
# Standard nslookup
nslookup my-service.my-namespace.svc.cluster.local

# Detailed dig query
dig my-service.my-namespace.svc.cluster.local +short
dig my-service.my-namespace.svc.cluster.local +trace

# Query specific DNS server
dig @10.96.0.10 my-service.my-namespace.svc.cluster.local

# Test DNS over TCP
dig +tcp my-service.my-namespace.svc.cluster.local

# Use dog for modern DNS queries with better output
dog my-service.my-namespace.svc.cluster.local

# Check DNS response time
dig my-service.my-namespace.svc.cluster.local +stats
```

Multiple tools let you approach DNS problems from different angles.

## Testing TLS/SSL Connections

Verify certificate and TLS connectivity with openssl:

```bash
# Test TLS connection
openssl s_client -connect api.example.com:443 -servername api.example.com

# Check certificate details
echo | openssl s_client -connect api.example.com:443 2>/dev/null | \
  openssl x509 -noout -text

# Test specific TLS version
openssl s_client -connect api.example.com:443 -tls1_3

# Verify certificate chain
curl -vI https://api.example.com 2>&1 | grep -i certificate

# Test with client certificate
openssl s_client -connect api.example.com:443 \
  -cert client.crt -key client.key
```

This identifies certificate validation errors, expired certificates, or TLS version mismatches.

## Scanning Ports and Services

netshoot includes nmap for port scanning:

```bash
# Scan pod ports
nmap -p- pod-ip

# Quick scan of common ports
nmap pod-ip

# Service version detection
nmap -sV pod-ip

# Scan service endpoints
nmap -p 80,443,8080 service-cluster-ip

# TCP SYN scan
nmap -sS pod-ip

# Discover services in subnet
nmap 10.244.1.0/24 -sn
```

Port scanning reveals what services actually listen and respond, beyond what Kubernetes API claims.

## Measuring Network Performance

Test throughput and latency with iperf3:

```bash
# On server pod (or netshoot instance)
kubectl run netshoot-server --image=nicolaka/netshoot -- iperf3 -s

# Get server pod IP
kubectl get pod netshoot-server -o wide

# From client netshoot
kubectl run netshoot-client --rm -it --image=nicolaka/netshoot -- bash

# Test TCP throughput
iperf3 -c server-pod-ip

# Test UDP throughput
iperf3 -c server-pod-ip -u -b 1G

# Test bidirectional
iperf3 -c server-pod-ip -d

# Measure latency with multiple streams
iperf3 -c server-pod-ip -P 10
```

Performance tests quantify network capacity and identify bottlenecks.

## HTTP Load Testing

Use ab (Apache Bench) or other tools for HTTP performance testing:

```bash
# Simple load test
ab -n 1000 -c 10 http://my-service:8080/

# With keep-alive
ab -n 1000 -c 10 -k http://my-service:8080/

# POST request load test
ab -n 100 -c 10 -p data.json -T application/json http://my-service:8080/api

# Use httping for latency measurement
httping -c 100 http://my-service:8080/

# Use httpie for API testing
http POST http://my-service:8080/api/users name=test
```

Load testing reveals how services perform under stress.

## Tracing Network Path

Use traceroute and mtr to analyze network paths:

```bash
# Traceroute to external endpoint
traceroute google.com

# TCP traceroute to specific port
tcptraceroute api.example.com 443

# MTR for continuous path monitoring
mtr -c 100 api.example.com

# Trace to pod IP
traceroute pod-ip

# UDP traceroute
traceroute -U pod-ip
```

Path tracing identifies routing issues and network topology problems.

## Testing Network Policies

Verify NetworkPolicy enforcement:

```bash
# Deploy netshoot in source namespace
kubectl run netshoot-source -n source-ns --rm -it --image=nicolaka/netshoot -- bash

# Test allowed connection
curl -v --max-time 5 http://allowed-service.dest-ns:8080

# Test blocked connection (should timeout)
curl -v --max-time 5 http://blocked-service.dest-ns:8080

# Use netcat to test raw TCP
nc -zv allowed-service.dest-ns 8080
nc -zv blocked-service.dest-ns 8080

# Use nmap to discover what's actually accessible
nmap -p 1-65535 destination-pod-ip
```

This confirms NetworkPolicies work as intended.

## Analyzing Network Namespaces

netshoot helps understand network namespace isolation:

```bash
# Deploy netshoot on a node
kubectl debug node/my-node -it --image=nicolaka/netshoot

# List network namespaces
ip netns list

# Execute command in specific namespace
ip netns exec netns-name ip addr show

# Compare routing tables across namespaces
ip netns exec netns-name ip route show
```

This is useful for debugging CNI plugin issues or understanding pod networking.

## Checking SSL/TLS Configuration

Test various TLS configurations and ciphers:

```bash
# List supported ciphers
openssl ciphers -v

# Test server cipher support
nmap --script ssl-enum-ciphers -p 443 api.example.com

# Check certificate expiry
echo | openssl s_client -connect api.example.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Verify OCSP stapling
echo | openssl s_client -connect api.example.com:443 -status 2>/dev/null | \
  grep -i "OCSP"
```

Comprehensive TLS testing ensures secure communications.

## Creating Persistent Debug Deployments

Deploy netshoot as a DaemonSet for persistent debugging:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: netshoot
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: netshoot
  template:
    metadata:
      labels:
        app: netshoot
    spec:
      hostNetwork: true  # Use host networking if needed
      containers:
      - name: netshoot
        image: nicolaka/netshoot
        command: ["/bin/bash"]
        args: ["-c", "while true; do sleep 3600; done"]
```

Deploy with:

```bash
kubectl apply -f netshoot-daemonset.yaml

# Access on any node
kubectl exec -it -n kube-system netshoot-xxxxx -- bash
```

This provides permanent debugging capability on every node.

## Combining Tools for Complex Debugging

Chain multiple tools for comprehensive analysis:

```bash
# Continuous monitoring while testing
# Terminal 1: Monitor traffic
tcpdump -i any -n port 8080

# Terminal 2: Monitor DNS
watch -n 1 'dig my-service.my-namespace.svc.cluster.local +short'

# Terminal 3: Run load test
ab -n 10000 -c 50 http://my-service:8080/

# Terminal 4: Monitor performance
watch -n 1 'ss -s'
```

Simultaneous monitoring from multiple angles reveals complex issues.

## Automating Common Tasks

Create shell scripts for frequent debugging tasks:

```bash
#!/bin/bash
# quick-service-test.sh
SERVICE=$1
NAMESPACE=${2:-default}

echo "Testing service: $SERVICE in namespace: $NAMESPACE"

echo "=== DNS Resolution ==="
dig +short $SERVICE.$NAMESPACE.svc.cluster.local

echo "=== HTTP Test ==="
curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" \
  http://$SERVICE.$NAMESPACE:8080

echo "=== Port Scan ==="
nmap -p 1-10000 $(dig +short $SERVICE.$NAMESPACE.svc.cluster.local | head -1)
```

Save time by automating repetitive debugging workflows.

## Best Practices

When using netshoot for debugging, follow these practices for effective troubleshooting.

First, use the `--rm` flag with `kubectl run` to automatically clean up temporary pods after debugging sessions finish.

Second, leverage `kubectl debug` to attach netshoot to existing pods rather than creating separate debug pods when you need the exact network context of a specific pod.

Third, capture packet dumps to files rather than just viewing them in real time. This allows detailed offline analysis and sharing with teammates.

Fourth, start with simple tools like ping and curl before moving to complex tools like tcpdump or nmap. Simple tests often reveal the issue quickly.

Fifth, document your debugging process and findings. Network issues often recur, and documented solutions save time in the future.

## Conclusion

netshoot provides a complete network debugging toolkit in a single container image, eliminating the need to build custom debug images or remember which tools are available in which images. Whether you need basic connectivity testing, comprehensive packet capture, DNS troubleshooting, TLS verification, or performance measurement, netshoot has the tools you need.

The ability to deploy netshoot as standalone pods, ephemeral containers, or persistent DaemonSets gives you flexibility to debug in any context. Combined with kubectl debug, netshoot transforms Kubernetes network troubleshooting from a frustrating exercise in tool hunting to a straightforward diagnostic process. Master netshoot, and you will solve network issues faster and with greater confidence.
