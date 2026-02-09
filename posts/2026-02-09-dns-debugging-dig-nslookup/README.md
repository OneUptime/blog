# How to Implement DNS Debugging with dig and nslookup in Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, Debugging, Networking, dig

Description: Master DNS troubleshooting in Kubernetes using dig and nslookup to diagnose service discovery issues and resolve name resolution problems.

---

DNS issues are common in Kubernetes environments, affecting service discovery and pod communication. Tools like dig and nslookup provide essential capabilities for diagnosing DNS problems and understanding name resolution behavior.

## Understanding Kubernetes DNS

Kubernetes uses CoreDNS (or kube-dns in older versions) to provide DNS services. Every service gets a DNS name following the pattern: `service-name.namespace.svc.cluster.local`

Pods also get DNS names: `pod-ip-address.namespace.pod.cluster.local` (with dashes instead of dots in the IP).

## Setting Up DNS Debugging Tools

Most minimal containers lack DNS tools. Create a debug pod:

```bash
# Quick debug pod with DNS tools
kubectl run dnstools --image=tutum/dnsutils -it --rm -- /bin/bash

# Or use a more comprehensive image
kubectl run netdebug --image=nicolaka/netshoot -it --rm -- /bin/bash
```

For persistent debugging:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dnstools
  namespace: default
spec:
  containers:
  - name: dnstools
    image: tutum/dnsutils
    command: ["/bin/bash"]
    args: ["-c", "sleep 3600"]
```

## Using nslookup for Basic DNS Queries

nslookup is the simpler tool for quick DNS checks:

```bash
# Lookup a service
nslookup kubernetes.default.svc.cluster.local

# Output example:
Server:         10.96.0.10
Address:        10.96.0.10#53

Name:   kubernetes.default.svc.cluster.local
Address: 10.96.0.1
```

Test service discovery:

```bash
# Short name (same namespace)
nslookup myservice

# Fully qualified domain name
nslookup myservice.production.svc.cluster.local

# External domain
nslookup google.com

# Reverse lookup
nslookup 10.96.0.1
```

## Using dig for Detailed DNS Analysis

dig provides more detailed output and control:

```bash
# Basic query
dig kubernetes.default.svc.cluster.local

# Short output
dig +short kubernetes.default.svc.cluster.local

# Query specific record types
dig myservice.default.svc.cluster.local A
dig myservice.default.svc.cluster.local AAAA
dig myservice.default.svc.cluster.local SRV
```

Understanding dig output:

```bash
dig myservice.default.svc.cluster.local

# Output sections:
# QUESTION SECTION - what was queried
# ANSWER SECTION - the response
# AUTHORITY SECTION - authoritative nameservers
# ADDITIONAL SECTION - additional useful info
# Query time and server used
```

## Testing Service Discovery

Verify Kubernetes service DNS:

```bash
# Test service in same namespace
dig +short myservice

# Test service in different namespace
dig +short myservice.production.svc.cluster.local

# Test headless service (returns pod IPs)
dig +short myservice-headless.default.svc.cluster.local

# Query SRV records for port information
dig SRV _http._tcp.myservice.default.svc.cluster.local
```

Example SRV query output:

```bash
dig SRV _http._tcp.myservice.default.svc.cluster.local +short

# Output:
0 50 8080 myservice.default.svc.cluster.local.
```

## Checking DNS Configuration

Inspect pod DNS settings:

```bash
# Inside the pod
cat /etc/resolv.conf

# Typical output:
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5

# From outside
kubectl exec dnstools -- cat /etc/resolv.conf
```

Understand search domains:

```bash
# With search domains, these are equivalent:
dig myservice
dig myservice.default.svc.cluster.local

# Test each search domain explicitly
dig myservice.default.svc.cluster.local +search
```

## Querying Specific DNS Servers

Test against different DNS servers:

```bash
# Query CoreDNS directly
dig @10.96.0.10 myservice.default.svc.cluster.local

# Query external DNS
dig @8.8.8.8 google.com

# Compare responses
dig @10.96.0.10 +short myservice
dig @8.8.4.4 +short myservice  # Should fail for internal services
```

Find CoreDNS service IP:

```bash
kubectl get svc -n kube-system kube-dns

# Or
kubectl get svc -n kube-system -l k8s-app=kube-dns -o jsonpath='{.items[0].spec.clusterIP}'
```

## Troubleshooting DNS Failures

### Service Name Not Found

```bash
# Verify service exists
kubectl get svc myservice

# Check namespace
kubectl get svc myservice -n production

# Try fully qualified name
dig myservice.production.svc.cluster.local

# Check if DNS is working at all
dig kubernetes.default.svc.cluster.local
```

### Slow DNS Resolution

```bash
# Measure query time
dig myservice | grep "Query time"

# Test multiple times
for i in {1..10}; do
  dig myservice | grep "Query time"
done

# Check CoreDNS performance
kubectl top pods -n kube-system -l k8s-app=kube-dns
```

### External DNS Not Working

```bash
# Test external domain
dig +short google.com

# If it fails, check DNS policy
kubectl get pod dnstools -o jsonpath='{.spec.dnsPolicy}'

# Check if upstream DNS is configured
kubectl exec -n kube-system -it <coredns-pod> -- cat /etc/resolv.conf
```

## Advanced DNS Debugging

### Trace DNS Resolution

Use dig trace to see full resolution path:

```bash
# Trace resolution
dig +trace myservice.default.svc.cluster.local

# This shows each step in the DNS hierarchy
```

### Check DNS Cache

```bash
# Query with no cache
dig +noall +answer myservice

# Disable cache and query again
dig +nocache myservice
```

### Inspect DNSSEC

```bash
# Check DNSSEC validation
dig +dnssec google.com

# Short format
dig +short +dnssec google.com
```

## Debugging CoreDNS Issues

Check CoreDNS pods:

```bash
# List CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50

# Look for errors
kubectl logs -n kube-system -l k8s-app=kube-dns | grep -i error

# Check CoreDNS ConfigMap
kubectl get configmap coredns -n kube-system -o yaml
```

Test CoreDNS directly:

```bash
# Get CoreDNS pod name
COREDNS_POD=$(kubectl get pods -n kube-system -l k8s-app=kube-dns -o name | head -1)

# Exec into CoreDNS pod
kubectl exec -it -n kube-system $COREDNS_POD -- /bin/sh

# Test resolution from CoreDNS pod
nslookup kubernetes.default.svc.cluster.local localhost
```

## Testing Pod DNS

Verify pod DNS names:

```bash
# Get pod IP
POD_IP=$(kubectl get pod myapp-pod -o jsonpath='{.status.podIP}')

# Convert to DNS format (replace . with -)
POD_DNS=$(echo $POD_IP | tr '.' '-')

# Query pod DNS
dig $POD_DNS.default.pod.cluster.local

# From another pod
kubectl exec dnstools -- dig $POD_DNS.default.pod.cluster.local
```

## DNS Policy Testing

Test different DNS policies:

```yaml
# Default - uses cluster DNS
apiVersion: v1
kind: Pod
metadata:
  name: dns-default
spec:
  dnsPolicy: Default
  containers:
  - name: test
    image: tutum/dnsutils
    command: ["/bin/sleep", "3600"]

---
# ClusterFirst - standard Kubernetes DNS
apiVersion: v1
kind: Pod
metadata:
  name: dns-cluster-first
spec:
  dnsPolicy: ClusterFirst
  containers:
  - name: test
    image: tutum/dnsutils
    command: ["/bin/sleep", "3600"]

---
# None - custom DNS configuration
apiVersion: v1
kind: Pod
metadata:
  name: dns-none
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers:
      - 8.8.8.8
    searches:
      - example.com
    options:
      - name: ndots
        value: "2"
  containers:
  - name: test
    image: tutum/dnsutils
    command: ["/bin/sleep", "3600"]
```

Test each policy:

```bash
# Apply pods
kubectl apply -f dns-policies.yaml

# Test each
kubectl exec dns-default -- nslookup kubernetes.default
kubectl exec dns-cluster-first -- nslookup kubernetes.default
kubectl exec dns-none -- nslookup google.com
```

## Custom DNS Configuration

Override DNS settings for specific pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-dns
spec:
  dnsPolicy: ClusterFirst
  dnsConfig:
    nameservers:
      - 1.1.1.1  # Additional nameserver
    searches:
      - example.com
      - internal.example.com
    options:
      - name: ndots
        value: "2"
      - name: timeout
        value: "5"
  containers:
  - name: test
    image: tutum/dnsutils
```

## Creating DNS Test Scripts

Automated DNS testing:

```bash
#!/bin/bash
# dns-test.sh

echo "=== Kubernetes DNS Test ==="

# Test cluster DNS
echo -n "Cluster DNS (kubernetes.default): "
if dig +short kubernetes.default.svc.cluster.local @10.96.0.10 > /dev/null; then
  echo "OK"
else
  echo "FAILED"
fi

# Test service discovery
SERVICES=$(kubectl get svc --all-namespaces -o jsonpath='{range .items[*]}{.metadata.name}.{.metadata.namespace}{"\n"}{end}')

echo ""
echo "Testing services:"
echo "$SERVICES" | head -5 | while read svc; do
  NAME=$(echo $svc | cut -d'.' -f1)
  NS=$(echo $svc | cut -d'.' -f2)
  echo -n "  $NAME.$NS: "

  if dig +short $NAME.$NS.svc.cluster.local @10.96.0.10 > /dev/null; then
    echo "OK"
  else
    echo "FAILED"
  fi
done

# Test external DNS
echo ""
echo -n "External DNS (google.com): "
if dig +short google.com @10.96.0.10 > /dev/null; then
  echo "OK"
else
  echo "FAILED"
fi

echo ""
echo "=== DNS Test Complete ==="
```

## Debugging DNS Timeouts

```bash
# Test with timeout
dig +time=2 +tries=1 myservice.default.svc.cluster.local

# Check ndots behavior
dig +search myservice  # Uses search domains
dig +nosearch myservice  # Doesn't use search domains

# Monitor DNS traffic
kubectl exec dnstools -- tcpdump -i any -n port 53 -w /tmp/dns.pcap

# Analyze queries
kubectl exec dnstools -- tcpdump -i any -n port 53 -A
```

## Common DNS Issues and Solutions

### Issue: NXDOMAIN for existing service

```bash
# Check service exists
kubectl get svc myservice

# Verify namespace
kubectl get svc myservice --all-namespaces

# Use FQDN
dig myservice.default.svc.cluster.local
```

### Issue: Slow resolution

```bash
# Check CoreDNS performance
kubectl top pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS replicas
kubectl get deployment -n kube-system coredns

# Scale if needed
kubectl scale deployment coredns -n kube-system --replicas=3
```

### Issue: Split DNS not working

```bash
# Check CoreDNS forward configuration
kubectl get configmap coredns -n kube-system -o yaml | grep -A 5 forward
```

## Conclusion

dig and nslookup are essential tools for DNS debugging in Kubernetes. dig provides detailed DNS query information perfect for troubleshooting, while nslookup offers quick lookups for simple checks.

Understanding Kubernetes DNS patterns, search domains, and DNS policies helps you diagnose service discovery issues quickly. Combine these tools with kubectl commands to check service existence, CoreDNS status, and DNS configuration for comprehensive DNS troubleshooting.
