# How to Use Ephemeral Debug Containers for Network Diagnostics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Debugging

Description: Learn how to use ephemeral debug containers in Kubernetes for network diagnostics without modifying production workloads or pod definitions.

---

When you need to diagnose network issues in Kubernetes pods, traditional approaches often require modifying pod definitions, adding debugging tools to container images, or restarting pods. Ephemeral debug containers solve this problem by allowing you to attach temporary containers to running pods for troubleshooting without any disruption.

Ephemeral containers are a Kubernetes feature that lets you inject debugging tools into running pods on demand. They are perfect for network diagnostics because you can attach containers with full networking toolsets to production workloads without changing their configuration or restarting them.

## Understanding Ephemeral Containers

Ephemeral containers are temporary containers that exist only for debugging purposes. Unlike regular containers in a pod, ephemeral containers cannot be removed or restarted once added. They share the pod's network namespace, allowing them to access the same network interfaces as the application containers.

The key difference from regular containers is that ephemeral containers are defined in the pod's `ephemeralContainers` field, not in the pod spec. This means you can add them to running pods using the Kubernetes API without modifying the original pod definition.

## Prerequisites for Using Ephemeral Containers

Before using ephemeral containers, verify that your cluster supports them. The feature became stable in Kubernetes 1.25, but you can use it in beta starting from 1.23.

```bash
# Check your Kubernetes version
kubectl version --short

# Verify the feature is enabled
kubectl explain pod.spec.ephemeralContainers
```

If the command returns documentation about ephemeral containers, your cluster supports them.

## Basic Network Diagnostics with Ephemeral Containers

The `kubectl debug` command provides the easiest way to add ephemeral containers. Here's how to attach a debugging container with network tools to a running pod:

```bash
# Attach an ephemeral container with networking tools
kubectl debug -it pod/my-app-pod \
  --image=nicolaka/netshoot \
  --target=my-app-container

# The --target flag shares the process namespace with the specified container
# This gives you access to the same network namespace
```

Once the ephemeral container starts, you get an interactive shell with access to comprehensive network diagnostic tools including ping, curl, dig, nslookup, traceroute, tcpdump, and more.

## Diagnosing DNS Issues

DNS problems are common in Kubernetes. Use ephemeral containers to test DNS resolution without modifying your application:

```bash
# Attach ephemeral container for DNS debugging
kubectl debug -it pod/my-app-pod --image=nicolaka/netshoot

# Inside the ephemeral container, test DNS resolution
nslookup kubernetes.default.svc.cluster.local

# Check specific service DNS
dig my-service.my-namespace.svc.cluster.local

# Test external DNS resolution
nslookup google.com

# Verify DNS configuration
cat /etc/resolv.conf
```

If DNS queries fail, check the nameserver entries in `/etc/resolv.conf`. They should point to your cluster's DNS service (usually CoreDNS).

## Testing Network Connectivity

Ephemeral containers make it easy to test connectivity between pods or to external endpoints:

```bash
# Attach ephemeral container
kubectl debug -it pod/frontend-pod --image=nicolaka/netshoot

# Test connectivity to another pod's IP
ping 10.244.1.5

# Test connectivity to a service
curl http://backend-service:8080/health

# Test connectivity to external endpoint
curl -v https://api.example.com

# Check if specific port is accessible
nc -zv backend-service 8080
```

The `-v` flag with curl provides verbose output, showing connection details, SSL handshake information, and response headers.

## Capturing Network Traffic

One powerful use case for ephemeral containers is packet capture. You can run tcpdump to analyze network traffic:

```bash
# Attach ephemeral container with elevated privileges
kubectl debug -it pod/my-app-pod \
  --image=nicolaka/netshoot \
  --target=my-app-container

# Inside the container, capture traffic
tcpdump -i any port 8080 -w /tmp/capture.pcap

# Capture specific traffic patterns
tcpdump -i any 'tcp port 8080 and host 10.244.1.5'

# View captured packets in real-time
tcpdump -i any -n -v
```

You can copy the capture file to your local machine for analysis:

```bash
# From another terminal
kubectl cp my-app-pod:/tmp/capture.pcap ./capture.pcap

# Analyze with Wireshark or tcpdump locally
tcpdump -r capture.pcap
```

## Debugging TLS/SSL Connections

Ephemeral containers help diagnose certificate and TLS issues:

```bash
# Attach ephemeral container
kubectl debug -it pod/my-app-pod --image=nicolaka/netshoot

# Test TLS connection and view certificate
openssl s_client -connect api.example.com:443 -showcerts

# Check certificate expiration
echo | openssl s_client -connect api.example.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Verify certificate chain
curl -v https://api.example.com 2>&1 | grep -i certificate
```

This helps identify certificate validation errors, expired certificates, or hostname mismatches.

## Analyzing Network Performance

Use ephemeral containers to measure network latency and throughput:

```bash
# Attach ephemeral container
kubectl debug -it pod/app-pod --image=nicolaka/netshoot

# Measure latency to service
ping -c 10 backend-service

# Test HTTP response time
time curl -o /dev/null -s http://backend-service:8080/

# Use httping for continuous HTTP latency monitoring
httping -c 100 http://backend-service:8080
```

For bandwidth testing between pods, you can use iperf3:

```bash
# In the server pod
kubectl debug -it pod/server-pod --image=nicolaka/netshoot
iperf3 -s

# In the client pod (different terminal)
kubectl debug -it pod/client-pod --image=nicolaka/netshoot
iperf3 -c server-pod-ip
```

## Debugging Network Policies

Ephemeral containers help verify if NetworkPolicies are blocking traffic:

```bash
# Attach ephemeral container to source pod
kubectl debug -it pod/frontend-pod --image=nicolaka/netshoot

# Test connectivity that should be allowed
curl -v http://backend-service:8080

# Test connectivity that should be blocked
curl -v http://restricted-service:8080 --max-time 5

# If connection times out, NetworkPolicy might be blocking it
# Check network policy logs (if your CNI supports it)
```

Compare the results with your NetworkPolicy definitions to verify they work as intended.

## Using Distroless Container Debugging

For pods running distroless images without a shell, ephemeral containers are essential:

```bash
# Distroless containers don't have shells
# Ephemeral containers provide the only way to debug them

kubectl debug -it pod/distroless-pod \
  --image=busybox:1.28 \
  --target=distroless-container

# Now you have a shell with access to the pod's network
```

The `--target` flag ensures the ephemeral container shares the network namespace with the distroless container.

## Best Practices

When using ephemeral containers for network diagnostics, follow these practices:

First, choose appropriate debug images. The nicolaka/netshoot image contains comprehensive networking tools, while busybox is lighter but has fewer tools. Select based on your needs.

Second, always specify the `--target` flag when you need to share the process namespace with a specific container. This is crucial for accurate network diagnostics.

Third, remember that ephemeral containers cannot be removed once added. They remain until the pod is deleted. For long-running pods, this can accumulate multiple ephemeral containers if you debug repeatedly.

Fourth, use appropriate resource limits for ephemeral containers to avoid impacting the pod's performance:

```bash
kubectl debug pod/my-app-pod \
  --image=nicolaka/netshoot \
  --target=my-app \
  -- /bin/bash
```

Finally, document your findings from ephemeral container debugging sessions. Capture relevant command outputs before the pod restarts or gets deleted.

## Conclusion

Ephemeral debug containers transform network troubleshooting in Kubernetes. They let you inject powerful diagnostic tools into running pods without modifying images, restarting containers, or changing pod specifications. This makes them ideal for production debugging where you cannot afford downtime or cannot easily rebuild container images.

The ability to attach ephemeral containers on demand, run comprehensive network diagnostics, and remove them by simply deleting the pod makes them an essential tool for Kubernetes operators. Master ephemeral containers, and you will solve network issues faster and with less disruption to your workloads.
