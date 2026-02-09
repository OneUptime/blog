# How to Use kubectl debug with Network Tools for Connectivity Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Debugging

Description: Master kubectl debug to troubleshoot network connectivity issues in Kubernetes using ephemeral containers with comprehensive network diagnostic tools.

---

Network connectivity testing in Kubernetes traditionally required building debug tools into container images or modifying pod definitions. The kubectl debug command eliminates this friction by letting you attach temporary containers with full network toolsets to any running pod without changing its specification or restarting it.

This capability transforms network troubleshooting. You can diagnose production issues in real time without rebuilding images, deploying debug pods, or risking service disruption. kubectl debug makes network connectivity testing fast, safe, and accessible.

## Understanding kubectl debug for Networking

The kubectl debug command creates ephemeral containers that share the network namespace of target pods. This gives you the same network view as the application container while providing access to powerful diagnostic tools that the application image lacks.

Three common patterns exist for network debugging with kubectl debug: attaching to an existing pod with network tools, creating a copy of a pod with debugging capabilities, and creating a standalone debug pod on a specific node.

## Basic Network Connectivity Testing

Start with simple connectivity tests using kubectl debug:

```bash
# Attach ephemeral container with network tools
kubectl debug -it pod/my-app-pod --image=nicolaka/netshoot

# Inside the debug container, test connectivity
ping google.com

# Test specific service
curl http://backend-service:8080/health

# Check DNS resolution
nslookup backend-service.my-namespace.svc.cluster.local
```

The nicolaka/netshoot image contains comprehensive network tools including curl, wget, ping, netstat, tcpdump, traceroute, nslookup, dig, nmap, and more.

## Testing Pod-to-Pod Connectivity

Debug communication between pods:

```bash
# From source pod, test connectivity to destination pod
kubectl debug -it pod/source-pod --image=nicolaka/netshoot

# Get destination pod IP first
kubectl get pod destination-pod -o wide

# Test connectivity
ping 10.244.1.5

# Test specific port
nc -zv 10.244.1.5 8080

# Send HTTP request
curl -v http://10.244.1.5:8080
```

This reveals if basic IP connectivity exists, bypassing service abstraction.

## Testing Service Connectivity

Verify services resolve and route correctly:

```bash
# Debug from a pod that should access the service
kubectl debug -it pod/client-pod --image=nicolaka/netshoot

# Test service DNS resolution
nslookup my-service.my-namespace.svc.cluster.local

# Test service connectivity
curl -v http://my-service.my-namespace.svc.cluster.local:8080

# Test with service short name (if in same namespace)
curl -v http://my-service:8080

# Check service endpoints
nslookup my-service.my-namespace.svc.cluster.local | grep Address
```

Compare the resolved IPs with the service's actual endpoints.

## Debugging DNS Issues

DNS problems are common in Kubernetes. Debug them systematically:

```bash
# Attach debug container
kubectl debug -it pod/my-pod --image=nicolaka/netshoot

# Test basic DNS resolution
nslookup kubernetes.default.svc.cluster.local

# Use dig for detailed DNS information
dig kubernetes.default.svc.cluster.local

# Check DNS configuration
cat /etc/resolv.conf

# Test external DNS
nslookup google.com

# Test specific DNS server
nslookup google.com 8.8.8.8
```

The /etc/resolv.conf file shows which DNS servers the pod uses. Verify they point to your cluster DNS (typically kube-dns or CoreDNS).

## Testing with Target Process Namespace

Share the process namespace with the target container to see its exact network environment:

```bash
# Debug with shared process namespace
kubectl debug -it pod/my-app --image=nicolaka/netshoot --target=my-app-container

# This shares the network namespace exactly as the app sees it

# Check what ports the app is listening on
netstat -tlnp

# See all network connections
ss -tanp

# View routing table
ip route show
```

The `--target` flag is crucial when debugging distroless or minimal images without networking tools.

## Capturing Network Traffic

Use tcpdump to capture and analyze traffic:

```bash
# Attach debug container
kubectl debug -it pod/my-app --image=nicolaka/netshoot --target=my-app-container

# Capture all traffic
tcpdump -i any -w /tmp/capture.pcap

# Capture specific traffic
tcpdump -i any port 8080

# Capture HTTP traffic
tcpdump -i any -A -s 0 'tcp port 80'

# Save and exit (Ctrl+C), then copy file
# From another terminal:
kubectl cp my-app:/tmp/capture.pcap ./capture.pcap
```

Analyze captured packets locally with Wireshark or tcpdump for detailed protocol inspection.

## Testing External Connectivity

Verify pods can reach external endpoints:

```bash
# Debug pod
kubectl debug -it pod/my-pod --image=nicolaka/netshoot

# Test external HTTP endpoint
curl -v https://api.example.com

# Test external TCP connectivity
nc -zv api.example.com 443

# Trace route to external endpoint
traceroute api.example.com

# Test with specific DNS
curl -v --resolve api.example.com:443:1.2.3.4 https://api.example.com
```

This identifies if egress NetworkPolicies or firewalls block external access.

## Debugging TLS/SSL Connections

Test TLS connectivity and certificate validation:

```bash
# Debug container with OpenSSL
kubectl debug -it pod/my-pod --image=nicolaka/netshoot

# Test TLS connection
openssl s_client -connect api.example.com:443

# Check certificate
echo | openssl s_client -connect api.example.com:443 2>/dev/null | \
  openssl x509 -noout -text

# Test TLS version support
openssl s_client -connect api.example.com:443 -tls1_2

# Verify certificate chain
curl -v https://api.example.com 2>&1 | grep -i certificate
```

This reveals certificate validation issues, expired certificates, or TLS version mismatches.

## Testing with Different Network Tools

kubectl debug works with various debug images:

```bash
# Use busybox for lightweight debugging
kubectl debug -it pod/my-pod --image=busybox:1.28

# Use ubuntu for familiar tools
kubectl debug -it pod/my-pod --image=ubuntu:22.04

# Inside ubuntu, install needed tools
apt-get update && apt-get install -y curl dnsutils iputils-ping

# Use alpine for minimal size
kubectl debug -it pod/my-pod --image=alpine:3.18
apk add curl bind-tools
```

Choose images based on size constraints and tool requirements.

## Creating Node Debug Pods

Debug node-level networking:

```bash
# Create debug pod on specific node
kubectl debug node/my-node -it --image=nicolaka/netshoot

# This creates a pod with access to node network namespace

# Check node network interfaces
ip link show

# View node routing
ip route show

# Check iptables rules (if privileged)
iptables -L -n -v

# Test connectivity from node perspective
ping 8.8.8.8
```

Node debugging helps diagnose CNI plugin issues and node-level network configuration.

## Testing Network Performance

Measure network performance between pods:

```bash
# On server pod
kubectl debug -it pod/server-pod --image=nicolaka/netshoot
iperf3 -s

# On client pod (different terminal)
kubectl debug -it pod/client-pod --image=nicolaka/netshoot
iperf3 -c server-pod-ip

# Test UDP performance
# Server: iperf3 -s
# Client: iperf3 -c server-pod-ip -u -b 1G

# Measure latency
ping -c 100 server-pod-ip | tail -1
```

This quantifies network throughput and latency for performance troubleshooting.

## Debugging with Custom Images

Use custom debug images with specific tools:

```bash
# Create custom debug image
# Dockerfile:
# FROM alpine:3.18
# RUN apk add --no-cache curl wget netcat-openbsd bind-tools tcpdump nmap

# Build and push
docker build -t my-registry/netdebug:latest .
docker push my-registry/netdebug:latest

# Use in kubectl debug
kubectl debug -it pod/my-pod --image=my-registry/netdebug:latest
```

Custom images provide organization-specific tools and configurations.

## Checking NetworkPolicy Effects

Test if NetworkPolicies block traffic:

```bash
# Debug from source pod
kubectl debug -it pod/source-pod --image=nicolaka/netshoot

# Test allowed connection (should work)
curl -v http://allowed-service:8080

# Test blocked connection (should timeout)
curl -v --max-time 5 http://blocked-service:8080

# If blocked, you'll see timeout with no response
# If allowed, you get HTTP response
```

Compare results with NetworkPolicy definitions to verify rules work correctly.

## Combining Multiple Debug Techniques

Use multiple debug sessions for comprehensive testing:

```bash
# Terminal 1: Monitor traffic on destination
kubectl debug -it pod/dest-pod --image=nicolaka/netshoot
tcpdump -i any port 8080

# Terminal 2: Send test requests from source
kubectl debug -it pod/source-pod --image=nicolaka/netshoot
curl -v http://dest-pod-ip:8080

# Terminal 3: Check service endpoints
kubectl get endpoints my-service -o yaml --watch
```

Simultaneous debugging from multiple angles quickly identifies issues.

## Debugging Intermittent Issues

Capture intermittent connectivity problems:

```bash
# Debug with continuous testing
kubectl debug -it pod/my-pod --image=nicolaka/netshoot

# Run connectivity loop
while true; do
  curl -w "Status: %{http_code}, Time: %{time_total}s\n" \
    -o /dev/null -s http://backend-service:8080
  sleep 1
done

# Watch for failures or slow responses
# Combine with packet capture for analysis
```

This reveals patterns in intermittent failures.

## Cleaning Up Debug Sessions

Ephemeral containers remain until the pod is deleted:

```bash
# View ephemeral containers in a pod
kubectl get pod my-pod -o yaml | grep -A10 ephemeralContainers

# Ephemeral containers cannot be removed individually
# They persist until pod deletion

# If you need to remove them, delete and recreate the pod
kubectl delete pod my-pod
```

For long-running pods, ephemeral containers accumulate. This is usually not a problem but be aware they use some resources.

## Best Practices

When using kubectl debug for network troubleshooting, follow these practices.

First, use `--target` to share the process namespace when debugging minimal or distroless images. This ensures you see the exact network environment the application uses.

Second, choose appropriate debug images. nicolaka/netshoot is comprehensive but large. Use smaller images like busybox or alpine when size matters.

Third, clean up packet capture files and test data. They can accumulate and use pod storage.

Fourth, document your debug commands and findings. Network issues often recur, and documented debugging saves time later.

Fifth, use kubectl debug in development first to familiarize yourself with the tools before production troubleshooting.

## Conclusion

kubectl debug revolutionizes network troubleshooting in Kubernetes by providing instant access to comprehensive network tools without modifying pod definitions or rebuilding images. Whether testing basic connectivity, analyzing DNS resolution, capturing packet traces, or measuring network performance, kubectl debug gives you the capabilities you need.

Master the different debugging patterns including ephemeral containers, process namespace sharing, and node debugging. Combine kubectl debug with appropriate network tools, and you gain powerful visibility into Kubernetes networking. This visibility transforms mysterious connectivity failures into diagnosable problems with clear solutions.
