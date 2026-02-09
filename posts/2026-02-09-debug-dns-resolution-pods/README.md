# How to Debug DNS Resolution Issues in Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, Troubleshooting, Networking, CoreDNS

Description: Diagnose and resolve DNS resolution problems in Kubernetes pods, including CoreDNS configuration issues, network policies blocking DNS traffic, and pod-specific DNS failures affecting service discovery.

---

DNS resolution failures rank among the most common networking issues in Kubernetes. Pods that cannot resolve service names fail to communicate with dependencies, causing application failures that appear mysterious until you identify the DNS problem. Understanding how Kubernetes DNS works and having a systematic troubleshooting approach helps you quickly diagnose and fix these issues.

## Understanding Kubernetes DNS Architecture

Kubernetes runs CoreDNS as a cluster add-on that handles DNS queries from pods. When a pod tries to resolve a hostname, the request goes to the CoreDNS service, typically at 10.96.0.10 or another cluster IP. CoreDNS checks its records for cluster-internal names like service.namespace.svc.cluster.local and forwards external queries to upstream nameservers.

Each pod gets a /etc/resolv.conf file configured by Kubernetes with nameserver entries pointing to CoreDNS and search domains for simplified service lookups. Problems can occur at multiple layers including CoreDNS pod failures, network connectivity issues, incorrect resolv.conf configuration, or DNS policy problems.

## Verifying Basic DNS Functionality

Start by checking if DNS resolution works at all from a test pod:

```bash
# Create a debug pod with DNS tools
kubectl run dns-debug --image=nicolaka/netshoot -it --rm -- /bin/bash

# Inside the debug pod, test DNS resolution
nslookup kubernetes.default

# Should return:
# Server:    10.96.0.10
# Address:  10.96.0.10#53
#
# Name:  kubernetes.default.svc.cluster.local
# Address: 10.96.0.1
```

If this fails, DNS is broken cluster-wide. If it succeeds, the issue is specific to certain pods or services.

Test external DNS resolution:

```bash
# Test external domain resolution
nslookup google.com

# Test specific upstream nameserver
nslookup google.com 8.8.8.8
```

This distinguishes between cluster DNS problems and upstream connectivity issues.

## Checking CoreDNS Pod Health

Verify CoreDNS pods are running:

```bash
# Check CoreDNS pod status
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Should show pods in Running state:
# NAME                       READY   STATUS    RESTARTS   AGE
# coredns-5d78c9869d-abc12   1/1     Running   0          5d
# coredns-5d78c9869d-xyz34   1/1     Running   0          5d
```

Check CoreDNS logs for errors:

```bash
# View CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=100

# Look for errors like:
# - Plugin errors
# - Upstream timeout errors
# - Connection refused messages
# - Memory or resource issues
```

Restart CoreDNS pods if they show problems:

```bash
# Delete CoreDNS pods (deployment recreates them)
kubectl delete pods -n kube-system -l k8s-app=kube-dns

# Wait for new pods to be ready
kubectl wait --for=condition=ready pod -n kube-system -l k8s-app=kube-dns --timeout=60s
```

## Inspecting Pod DNS Configuration

Check the resolv.conf file in a problematic pod:

```bash
# Exec into the pod
kubectl exec -it <pod-name> -- cat /etc/resolv.conf

# Expected content:
# nameserver 10.96.0.10
# search default.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5
```

Verify the nameserver IP matches your CoreDNS service:

```bash
# Get CoreDNS service IP
kubectl get svc -n kube-system kube-dns

# NAME       TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)         AGE
# kube-dns   ClusterIP   10.96.0.10   <none>        53/UDP,53/TCP   100d
```

If the nameserver in resolv.conf doesn't match the kube-dns service IP, DNS lookups will fail.

## Testing DNS from Problematic Pods

Run DNS tests directly from pods experiencing issues:

```bash
# Test DNS resolution from the problem pod
kubectl exec -it <pod-name> -- nslookup kubernetes.default

# If nslookup is not available, use wget or curl
kubectl exec -it <pod-name> -- wget -O- --timeout=5 http://kubernetes.default.svc.cluster.local:443

# Or test with raw DNS query
kubectl exec -it <pod-name> -- sh -c "echo 'test' > /dev/udp/10.96.0.10/53"
```

If DNS tools are not available in the pod, install them temporarily:

```bash
# For Debian/Ubuntu based images
kubectl exec -it <pod-name> -- apt-get update && apt-get install -y dnsutils

# For Alpine based images
kubectl exec -it <pod-name> -- apk add --no-cache bind-tools

# Then run nslookup or dig
kubectl exec -it <pod-name> -- nslookup kubernetes.default
```

## Checking Network Connectivity to CoreDNS

Verify the pod can reach CoreDNS:

```bash
# Get CoreDNS service endpoints
kubectl get endpoints -n kube-system kube-dns

# NAME       ENDPOINTS                           AGE
# kube-dns   10.244.0.5:53,10.244.1.3:53        100d

# Test connectivity from problem pod to CoreDNS pods
kubectl exec -it <pod-name> -- nc -zv 10.244.0.5 53
kubectl exec -it <pod-name> -- nc -zv 10.244.1.3 53
```

If connectivity fails, check for network policies blocking DNS traffic:

```bash
# List network policies in the pod's namespace
kubectl get networkpolicies -n <namespace>

# Describe each policy to see if it allows DNS
kubectl describe networkpolicy <policy-name> -n <namespace>
```

Network policies must allow egress to CoreDNS pods on port 53 UDP/TCP:

```yaml
# Example network policy allowing DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: default
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    - podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

## Examining CoreDNS Configuration

Check the CoreDNS ConfigMap for configuration issues:

```bash
# Get CoreDNS configuration
kubectl get configmap coredns -n kube-system -o yaml

# Look at the Corefile
kubectl get configmap coredns -n kube-system -o jsonpath='{.data.Corefile}'
```

Standard CoreDNS configuration looks like:

```
.:53 {
    errors
    health {
       lameduck 5s
    }
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }
    prometheus :9153
    forward . /etc/resolv.conf {
       max_concurrent 1000
    }
    cache 30
    loop
    reload
    loadbalance
}
```

Common configuration issues:
- Missing or incorrect kubernetes plugin configuration
- Forward plugin pointing to wrong upstream servers
- Loop detection causing queries to fail
- Cache problems with stale entries

Edit the ConfigMap if needed:

```bash
# Edit CoreDNS configuration
kubectl edit configmap coredns -n kube-system

# After saving, reload CoreDNS
kubectl rollout restart deployment coredns -n kube-system
```

## Debugging DNS Policy Settings

Kubernetes supports different DNS policies that affect resolv.conf generation:

```bash
# Check pod's DNS policy
kubectl get pod <pod-name> -o jsonpath='{.spec.dnsPolicy}'

# Possible values:
# - ClusterFirst (default, uses CoreDNS)
# - Default (uses node's DNS)
# - ClusterFirstWithHostNet (for hostNetwork pods)
# - None (custom DNS configuration)
```

If dnsPolicy is set to "None", check the dnsConfig:

```bash
# Check custom DNS configuration
kubectl get pod <pod-name> -o jsonpath='{.spec.dnsConfig}' | jq
```

For most pods, ClusterFirst is correct. If set incorrectly, update the deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      dnsPolicy: ClusterFirst
      containers:
      - name: app
        image: myapp:latest
```

## Resolving Search Domain Issues

The ndots option in resolv.conf controls when search domains are used:

```bash
# Check ndots value in pod
kubectl exec -it <pod-name> -- grep ndots /etc/resolv.conf

# Default: options ndots:5
```

With ndots:5, hostnames with fewer than 5 dots trigger search domain expansion. This can cause unexpected behavior or slow DNS resolution.

Test how search domains affect resolution:

```bash
# From inside pod, test various hostname formats
kubectl exec -it <pod-name> -- nslookup myservice
kubectl exec -it <pod-name> -- nslookup myservice.default
kubectl exec -it <pod-name> -- nslookup myservice.default.svc
kubectl exec -it <pod-name> -- nslookup myservice.default.svc.cluster.local

# Check which format resolves correctly
```

Customize ndots if needed:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  dnsConfig:
    options:
    - name: ndots
      value: "2"
  containers:
  - name: app
    image: myapp:latest
```

## Checking for DNS Query Loops

CoreDNS detects loops when queries cycle back to itself:

```bash
# Check CoreDNS logs for loop detection
kubectl logs -n kube-system -l k8s-app=kube-dns | grep -i loop

# Common message:
# plugin/loop: Loop (127.0.0.1:53 -> :53) detected for zone ".", see https://coredns.io/plugins/loop/
```

This happens when CoreDNS forwards to upstream nameservers that point back to CoreDNS. Fix by ensuring the forward plugin points to valid upstream servers:

```bash
# Check node's resolv.conf (what CoreDNS uses)
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- cat /etc/resolv.conf

# If it points to 127.0.0.1 or the CoreDNS service IP, fix by:
# - Updating forward plugin to use specific upstream servers like 8.8.8.8
# - Fixing node DNS configuration
```

## Testing Service Discovery

Verify service DNS records are created correctly:

```bash
# Create a test service
kubectl create service clusterip test-service --tcp=80:80

# Query the service from a pod
kubectl exec -it <pod-name> -- nslookup test-service

# Should resolve to the service's cluster IP

# Test cross-namespace resolution
kubectl exec -it <pod-name> -- nslookup test-service.default.svc.cluster.local

# Clean up
kubectl delete service test-service
```

If services don't resolve, check if CoreDNS is watching the correct API server:

```bash
# Check CoreDNS logs for API server connection
kubectl logs -n kube-system -l k8s-app=kube-dns | grep "kubernetes"

# Look for successful connection messages
```

## Using DNS Debugging Tools

Deploy a dedicated DNS debug pod:

```yaml
# dns-debug-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: dns-debug
spec:
  containers:
  - name: debug
    image: nicolaka/netshoot
    command: ["sleep", "3600"]
```

Deploy and use it:

```bash
kubectl apply -f dns-debug-pod.yaml

# Run comprehensive DNS tests
kubectl exec -it dns-debug -- /bin/bash

# Inside the pod:
# Test cluster DNS
nslookup kubernetes.default

# Test external DNS
nslookup google.com

# Trace DNS query path
dig +trace kubernetes.default.svc.cluster.local

# Check DNS server reachability
nc -zv 10.96.0.10 53

# Monitor DNS queries with tcpdump
tcpdump -i any -n port 53
```

## Common DNS Issues and Solutions

**Issue**: Pod cannot resolve service names
**Solution**: Check CoreDNS is running, verify resolv.conf nameserver, ensure network policy allows DNS

**Issue**: External domains don't resolve
**Solution**: Check CoreDNS forward configuration, verify node internet connectivity, test upstream nameservers

**Issue**: Intermittent DNS failures
**Solution**: Check CoreDNS resource limits, increase CoreDNS replicas, review CoreDNS performance metrics

**Issue**: DNS resolution very slow
**Solution**: Reduce ndots value, increase CoreDNS cache TTL, add more CoreDNS replicas

**Issue**: New services don't resolve
**Solution**: Verify CoreDNS can reach API server, check CoreDNS watch functionality, restart CoreDNS

## Conclusion

DNS resolution issues in Kubernetes stem from multiple potential causes including CoreDNS failures, network connectivity problems, configuration errors, and policy restrictions. A systematic troubleshooting approach starts with verifying basic DNS functionality, checking CoreDNS health, inspecting pod DNS configuration, and testing network connectivity. Use debug pods with DNS tools to isolate issues, examine CoreDNS logs for errors, and verify network policies allow DNS traffic. Most DNS problems resolve quickly once you identify whether the issue is cluster-wide or pod-specific, giving you the right starting point for investigation.
