# How to Configure CoreDNS Autopath for Faster DNS Resolution in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, DNS, Performance, Networking

Description: Optimize DNS resolution performance in Kubernetes by configuring CoreDNS autopath plugin to reduce search path queries and improve application response times.

---

DNS resolution in Kubernetes can become a performance bottleneck when applications make frequent service lookups. Every unqualified domain name triggers multiple DNS queries as the resolver walks through the search path. The CoreDNS autopath plugin solves this with server-side search path completion.

## Understanding the DNS Search Path Problem

When a pod resolves a service name like "api-server", the DNS resolver doesn't immediately know which namespace it belongs to. It tries multiple combinations based on the search path defined in /etc/resolv.conf:

```bash
# Inside a pod in the 'production' namespace

cat /etc/resolv.conf
```

You'll see something like:

```text
nameserver 10.96.0.10
search production.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

For a lookup of "api-server", the resolver attempts these queries in order:

1. api-server.production.svc.cluster.local
2. api-server.svc.cluster.local
3. api-server.cluster.local
4. api-server

That's potentially four DNS queries for a single service lookup. Multiply this by thousands of requests per second, and you've got a serious performance problem.

## How Autopath Solves This

The autopath plugin reduces redundant queries by serving responses based on the source IP of the requesting pod. It determines which namespace the pod belongs to, follows the search path on the server side, and returns the first non-NXDOMAIN result with a CNAME to the resolved name.

This can reduce DNS query volume significantly. For positive answers that match the configured search path, several client-side search queries can become one DNS exchange. The latency improvement can be dramatic, especially for applications that make frequent service calls.

## Enabling Autopath in CoreDNS

First, check your current CoreDNS configuration:

```bash
kubectl get configmap coredns -n kube-system -o yaml
```

You'll see a Corefile that defines DNS server behavior. Here's a typical configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
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

To enable autopath, modify the kubernetes plugin section:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods verified
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        autopath @kubernetes  # Add this line
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

The `@kubernetes` syntax tells autopath to use the kubernetes plugin for backend queries.

The `pods verified` setting is required for autopath to map the client IP address back to the requesting pod. CoreDNS must also receive the DNS packet with the original pod IP as the remote address.

Apply the configuration:

```bash
kubectl apply -f coredns-configmap.yaml
```

CoreDNS will automatically reload the configuration. Watch the logs to confirm:

```bash
kubectl logs -n kube-system -l k8s-app=kube-dns -f
```

## Configuring Autopath with Custom Zones

If you have custom DNS zones, configure autopath to handle them:

```yaml
.:53 {
    errors
    health
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods verified
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }
    # Only apply autopath to the cluster.local zone
    autopath cluster.local @kubernetes
    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
    loadbalance
}

# Separate zone for external domain
example.com:53 {
    errors
    cache 30
    forward . 8.8.8.8 8.8.4.4
}
```

This configuration applies autopath only to cluster-internal queries while handling external domains separately.

## Testing Autopath Performance

Create a test deployment to measure DNS performance before and after enabling autopath:

```yaml
# dns-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: dns-test
  namespace: default
spec:
  containers:
  - name: test
    image: nicolaka/netshoot
    command: ["/bin/bash"]
    args: ["-c", "while true; do sleep 3600; done"]
```

```bash
kubectl apply -f dns-test.yaml
```

Run a DNS query test:

```bash
# Without autopath - watch for multiple queries
kubectl exec -it dns-test -- bash -c 'for i in {1..100}; do nslookup kubernetes.default > /dev/null 2>&1; done; echo "Done"'

# Time the queries
kubectl exec -it dns-test -- time bash -c 'for i in {1..1000}; do nslookup kubernetes.default > /dev/null 2>&1; done'
```

Enable autopath, then run the same test. You should see significant improvement.

For more detailed analysis, use dnsperf:

```bash
kubectl exec -it dns-test -- bash

# Inside the pod
cat > queries.txt << EOF
kubernetes.default A
api-server.production A
cache.production A
database.production A
EOF

# Install dnsperf
apk add --no-cache dnsperf

# Run performance test
dnsperf -d queries.txt -s 10.96.0.10 -c 10 -l 30
```

Record the queries per second before and after enabling autopath.

## Monitoring Autopath Effectiveness

CoreDNS exposes Prometheus metrics that help you understand autopath impact:

```bash
# Port-forward to CoreDNS metrics endpoint
kubectl port-forward -n kube-system svc/kube-dns 9153:9153
```

Query the metrics:

```bash
curl http://localhost:9153/metrics | grep coredns_dns_request_duration_seconds
curl http://localhost:9153/metrics | grep coredns_autopath
```

Look for these key metrics:

- `coredns_dns_request_duration_seconds`: Should decrease after enabling autopath
- `coredns_dns_requests_total`: Should show fewer total requests
- `coredns_autopath_success_total`: Shows how many queries autopath optimized

## Combining Autopath with NodeLocal DNSCache

For maximum DNS performance, evaluate NodeLocal DNSCache alongside autopath. This deploys a DNS cache on each node, reducing network hops to CoreDNS. Be careful with this combination: autopath only works when CoreDNS sees the original pod IP as the DNS request's remote address. If a node-local cache forwards queries to the main CoreDNS pods without preserving that source IP, autopath in the main CoreDNS deployment cannot identify the client pod correctly.

Start from the official NodeLocal DNSCache manifest for your Kubernetes version and kube-proxy mode. The Corefile portion looks like this:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nodelocaldns
  namespace: kube-system
data:
  Corefile: |
    cluster.local:53 {
        errors
        cache {
            success 9984 30
            denial 9984 5
        }
        reload
        loop
        bind 169.254.20.10
        forward . __PILLAR__CLUSTER__DNS__ {
            force_tcp
        }
        prometheus :9253
    }
    .:53 {
        errors
        cache 30
        reload
        loop
        bind 169.254.20.10
        forward . __PILLAR__UPSTREAM__SERVERS__
        prometheus :9253
    }
```

Substitute the manifest placeholders before applying it. In kube-proxy iptables mode, the node-local DNS pods listen on both the kube-dns service IP and the node-local address, so existing pods can use the cache through the kube-dns service IP. In IPVS mode, update the kubelet `--cluster-dns` setting to the node-local address so newly created pods use the cache.

## Troubleshooting Autopath Issues

If autopath isn't working as expected:

1. **Verify plugin loading**: Check CoreDNS logs for autopath initialization messages:

```bash
kubectl logs -n kube-system -l k8s-app=kube-dns | grep autopath
```

2. **Check Kubernetes plugin settings**: Autopath must be in the same server block as the kubernetes plugin, and the kubernetes plugin must use `pods verified`.

3. **Validate pod IP detection**: Autopath relies on detecting the pod's namespace from its IP. Ensure your CNI properly assigns pod IPs:

```bash
kubectl get pods -o wide --all-namespaces | head -20
```

4. **Monitor query patterns**: Use tcpdump to see actual DNS queries:

```bash
# Inside a CoreDNS pod, if tcpdump is available
kubectl exec -n kube-system coredns-xxxxx -- tcpdump -i any -n port 53 -v
```

## Performance Recommendations

To get the most out of autopath:

- Enable it cluster-wide, not just for specific zones
- Combine with appropriate cache TTL settings (30-60 seconds typically)
- Use NodeLocal DNSCache for additional latency reduction, but verify it does not prevent autopath from seeing the original pod IP
- Monitor DNS query patterns and adjust ndots if needed
- Consider reducing ndots value from 5 to 2 or 3 for applications that mostly query cluster services

The autopath plugin is one of the most impactful DNS optimizations you can enable in Kubernetes. For high-traffic clusters, it can reduce DNS query volume by 60-75% and significantly improve application response times.
