# How to Debug DNS Resolution Issues in Kubernetes Using dnsutils and nslookup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, Troubleshooting, Debugging

Description: Learn how to debug DNS resolution issues in Kubernetes clusters using dnsutils, nslookup, dig, and other troubleshooting tools to identify and resolve DNS problems quickly.

---

DNS issues are among the most common problems in Kubernetes clusters. Services fail to communicate, applications timeout, and debugging becomes challenging when DNS resolution doesn't work. Having a systematic approach to diagnosing DNS problems saves hours of troubleshooting time.

This guide provides practical techniques for debugging DNS resolution issues using dnsutils and other diagnostic tools in Kubernetes environments.

## Understanding Kubernetes DNS Architecture

Before debugging, understand how DNS works in Kubernetes:

1. Pods get DNS configuration from kubelet
2. DNS queries go to CoreDNS service (usually at 10.96.0.10)
3. CoreDNS resolves cluster-local names via kubernetes plugin
4. External names forward to upstream resolvers
5. Responses cache based on TTL

Check basic DNS setup:

```bash
# View CoreDNS service
kubectl get svc -n kube-system kube-dns

# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# View CoreDNS configuration
kubectl get configmap coredns -n kube-system -o yaml
```

## Deploying dnsutils Pod for Testing

The dnsutils image contains essential DNS debugging tools:

```bash
# Deploy dnsutils pod
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: dnsutils
  namespace: default
spec:
  containers:
  - name: dnsutils
    image: registry.k8s.io/e2e-test-images/jessie-dnsutils:1.3
    command:
      - sleep
      - "infinity"
    imagePullPolicy: IfNotPresent
  restartPolicy: Always
EOF

# Wait for pod to be ready
kubectl wait --for=condition=ready pod/dnsutils --timeout=60s

# Exec into the pod
kubectl exec -it dnsutils -- bash
```

Alternatively, use a more feature-rich image:

```bash
# Deploy with nicolaka/netshoot (includes more tools)
kubectl run netshoot --image=nicolaka/netshoot --rm -it -- bash
```

## Basic DNS Resolution Testing with nslookup

Start with simple nslookup queries:

```bash
# Inside dnsutils pod

# Test cluster DNS server
nslookup kubernetes.default

# Test service in same namespace
nslookup my-service

# Test service in different namespace
nslookup my-service.production

# Test fully qualified service name
nslookup my-service.production.svc.cluster.local

# Test external domain
nslookup google.com

# Specify DNS server explicitly
nslookup kubernetes.default 10.96.0.10
```

Expected output for successful resolution:

```
Server:         10.96.0.10
Address:        10.96.0.10#53

Name:   kubernetes.default.svc.cluster.local
Address: 10.96.0.1
```

## Advanced Debugging with dig

The dig command provides more detailed DNS information:

```bash
# Basic dig query
dig kubernetes.default.svc.cluster.local

# Query specific record type
dig kubernetes.default.svc.cluster.local A
dig kubernetes.default.svc.cluster.local AAAA

# Trace query path
dig +trace kubernetes.default.svc.cluster.local

# Short output (just the IP)
dig +short kubernetes.default.svc.cluster.local

# Query specific DNS server
dig @10.96.0.10 kubernetes.default.svc.cluster.local

# Show query statistics
dig +stats kubernetes.default.svc.cluster.local

# Detailed output with all sections
dig +all kubernetes.default.svc.cluster.local
```

Analyze dig output:

```
; <<>> DiG 9.11.5 <<>> kubernetes.default.svc.cluster.local
;; QUESTION SECTION:
;kubernetes.default.svc.cluster.local. IN A

;; ANSWER SECTION:
kubernetes.default.svc.cluster.local. 30 IN A 10.96.0.1

;; Query time: 2 msec
;; SERVER: 10.96.0.10#53(10.96.0.10)
;; WHEN: Sun Feb 09 10:00:00 UTC 2026
;; MSG SIZE  rcvd: 82
```

Key information:
- Query time: Should be under 10ms for cached queries
- SERVER: Should point to CoreDNS service IP
- ANSWER SECTION: Contains resolved IP address
- Status: Should be NOERROR for successful queries

## Checking Pod DNS Configuration

Verify pod DNS settings:

```bash
# View pod's resolv.conf
kubectl exec dnsutils -- cat /etc/resolv.conf
```

Expected output:

```
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

Key elements:
- **nameserver**: Should point to CoreDNS service IP
- **search**: Defines search domains for short names
- **ndots**: Affects when search domains are tried

Create a diagnostic script:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-diagnostic
data:
  diagnose.sh: |
    #!/bin/bash

    echo "=== DNS Configuration ==="
    cat /etc/resolv.conf

    echo -e "\n=== Testing Cluster DNS ==="
    nslookup kubernetes.default

    echo -e "\n=== Testing External DNS ==="
    nslookup google.com

    echo -e "\n=== Testing CoreDNS Directly ==="
    nslookup kubernetes.default 10.96.0.10

    echo -e "\n=== Checking Search Path ==="
    nslookup kubernetes

    echo -e "\n=== Network Connectivity to CoreDNS ==="
    nc -zv 10.96.0.10 53

    echo -e "\n=== DNS Query Time ==="
    time nslookup kubernetes.default >/dev/null 2>&1
---
apiVersion: v1
kind: Pod
metadata:
  name: dns-diagnostic
spec:
  containers:
  - name: diagnostic
    image: nicolaka/netshoot
    command:
    - sh
    - /scripts/diagnose.sh
    volumeMounts:
    - name: scripts
      mountPath: /scripts
  volumes:
  - name: scripts
    configMap:
      name: dns-diagnostic
  restartPolicy: Never
```

Run diagnostics:

```bash
# Deploy diagnostic pod
kubectl apply -f dns-diagnostic.yaml

# View results
kubectl logs dns-diagnostic

# Clean up
kubectl delete pod dns-diagnostic
```

## Testing DNS from Specific Namespaces

DNS behavior can vary by namespace:

```bash
# Test from default namespace
kubectl run test-default --image=nicolaka/netshoot --rm -it -- nslookup my-service.production

# Test from production namespace
kubectl run test-prod -n production --image=nicolaka/netshoot --rm -it -- nslookup my-service
```

## Debugging Search Path Issues

The search path affects short name resolution:

```bash
# View effective search path
kubectl exec dnsutils -- cat /etc/resolv.conf | grep search

# Test queries with different lengths
kubectl exec dnsutils -- nslookup api
kubectl exec dnsutils -- nslookup api.production
kubectl exec dnsutils -- nslookup api.production.svc
kubectl exec dnsutils -- nslookup api.production.svc.cluster.local
```

Visualize search path behavior:

```bash
# This query will try:
# 1. api.default.svc.cluster.local
# 2. api.svc.cluster.local
# 3. api.cluster.local
# 4. api (as-is if it has enough dots based on ndots)

kubectl exec dnsutils -- dig +search api
```

## Analyzing CoreDNS Logs

CoreDNS logs provide insights into query processing:

```bash
# View CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=100

# Follow logs in real-time
kubectl logs -n kube-system -l k8s-app=kube-dns -f

# Search for specific query
kubectl logs -n kube-system -l k8s-app=kube-dns | grep "my-service"

# Look for errors
kubectl logs -n kube-system -l k8s-app=kube-dns | grep -i error
```

Enable verbose logging temporarily:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        log  # Enable query logging
        errors
        health
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
```

## Testing Service Endpoints

Verify service has endpoints:

```bash
# Check service exists
kubectl get svc my-service -n production

# Check endpoints
kubectl get endpoints my-service -n production

# Detailed endpoint information
kubectl describe svc my-service -n production
```

Test direct endpoint connectivity:

```bash
# Get pod IP from endpoint
POD_IP=$(kubectl get endpoints my-service -n production -o jsonpath='{.subsets[0].addresses[0].ip}')

# Test connectivity to pod IP directly
kubectl exec dnsutils -- curl -v http://$POD_IP:8080
```

## Network Policy Impact on DNS

Network policies can block DNS queries:

```bash
# Check for network policies
kubectl get networkpolicies -A

# Describe specific policy
kubectl describe networkpolicy my-policy -n production
```

Test DNS with network policy in place:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
  # Allow other traffic
  - to:
    - podSelector: {}
```

## Testing External DNS Resolution

Debug external name resolution:

```bash
# Test external DNS
kubectl exec dnsutils -- nslookup google.com

# Test with upstream DNS directly
kubectl exec dnsutils -- nslookup google.com 8.8.8.8

# Check forward configuration
kubectl get configmap coredns -n kube-system -o yaml | grep -A5 forward
```

## Performance Testing

Measure DNS resolution performance:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-perf-test
data:
  test.sh: |
    #!/bin/bash

    echo "Testing DNS resolution performance..."

    SERVICES=(
        "kubernetes.default"
        "kube-dns.kube-system"
    )

    for service in "${SERVICES[@]}"; do
        echo "Testing: $service"

        # Time 10 queries
        total=0
        for i in {1..10}; do
            start=$(date +%s%N)
            nslookup $service >/dev/null 2>&1
            end=$(date +%s%N)
            duration=$((($end - $start) / 1000000))
            total=$(($total + $duration))
        done

        avg=$(($total / 10))
        echo "Average latency: ${avg}ms"
        echo ""
    done
---
apiVersion: v1
kind: Pod
metadata:
  name: dns-perf-test
spec:
  containers:
  - name: test
    image: nicolaka/netshoot
    command:
    - sh
    - /scripts/test.sh
    volumeMounts:
    - name: scripts
      mountPath: /scripts
  volumes:
  - name: scripts
    configMap:
      name: dns-perf-test
  restartPolicy: Never
```

## Common Issues and Solutions

**Issue: nslookup returns SERVFAIL**

Check CoreDNS health:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns
```

**Issue: Service not resolving**

Verify service and endpoints:

```bash
kubectl get svc my-service -n production
kubectl get endpoints my-service -n production
```

**Issue: External DNS not working**

Check forward configuration:

```bash
kubectl exec dnsutils -- cat /etc/resolv.conf
kubectl exec dnsutils -- nslookup google.com 8.8.8.8
```

**Issue: Slow DNS resolution**

Check cache settings and CoreDNS resources:

```bash
kubectl top pods -n kube-system -l k8s-app=kube-dns
kubectl get configmap coredns -n kube-system -o yaml | grep cache
```

## Best Practices

Follow these practices when debugging DNS:

1. Start with basic nslookup tests before advanced tools
2. Test from the affected pod's namespace
3. Verify service and endpoints exist
4. Check CoreDNS health and logs
5. Test external DNS separately from cluster DNS
6. Consider network policies that might block DNS
7. Monitor DNS performance metrics
8. Document findings and resolution steps

DNS troubleshooting requires systematic investigation and the right tools. By using dnsutils, nslookup, dig, and CoreDNS logs effectively, you can quickly identify and resolve DNS issues in Kubernetes clusters. Building diagnostic scripts and maintaining a troubleshooting checklist ensures consistent problem resolution.

For more DNS management guidance, see our guides on [CoreDNS configuration](https://oneuptime.com/blog/post/coredns-kubernetes/view) and [DNS resolution optimization](https://oneuptime.com/blog/post/coredns-cache-plugin-ttl/view).
