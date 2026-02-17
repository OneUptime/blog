# How to Debug DNS Resolution Failures Inside GKE Pods Using nslookup and kube-dns Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, DNS, Kubernetes, Troubleshooting, kube-dns

Description: A practical troubleshooting guide for diagnosing and fixing DNS resolution failures inside GKE pods using nslookup, dig, and kube-dns log analysis.

---

Your application is throwing connection errors. Services cannot find each other. External API calls are timing out. The root cause? DNS resolution is failing inside your GKE pods. This is one of the most frustrating issues to debug because DNS is invisible when it works and everything breaks when it does not.

Let me walk you through a systematic approach to diagnosing DNS issues in GKE, from basic checks inside a pod to analyzing kube-dns logs.

## Step 1: Check DNS from Inside a Pod

The first thing to do is verify whether DNS is actually broken and from where. Spin up a debug pod with DNS tools:

```bash
# Create a debug pod with networking tools
kubectl run dns-debug --image=busybox:1.36 --restart=Never -- sleep 3600
```

Once it is running, test different types of DNS resolution:

```bash
# Test cluster-internal service resolution
kubectl exec dns-debug -- nslookup kubernetes.default.svc.cluster.local

# Test cross-namespace service resolution
kubectl exec dns-debug -- nslookup my-service.my-namespace.svc.cluster.local

# Test external DNS resolution
kubectl exec dns-debug -- nslookup google.com

# Test with a specific DNS server (kube-dns service IP)
kubectl exec dns-debug -- nslookup google.com 10.96.0.10
```

The results tell you a lot:

- If internal resolution fails but external works: problem with kube-dns cluster zone
- If external resolution fails but internal works: problem with upstream DNS forwarding
- If everything fails: problem with network connectivity to kube-dns
- If everything works: the problem might be specific to your application pod's configuration

## Step 2: Check the Pod's DNS Configuration

Every pod gets a `/etc/resolv.conf` that tells it where to send DNS queries. Check it:

```bash
# View the DNS configuration inside a pod
kubectl exec dns-debug -- cat /etc/resolv.conf
```

You should see something like:

```
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

If the nameserver IP is wrong or the file is empty, there is a problem with how the pod was configured. Check the pod spec for custom `dnsPolicy` or `dnsConfig` settings:

```bash
# Check if the pod has custom DNS settings
kubectl get pod dns-debug -o jsonpath='{.spec.dnsPolicy}' && echo
kubectl get pod dns-debug -o jsonpath='{.spec.dnsConfig}' && echo
```

The default `dnsPolicy` is `ClusterFirst`, which uses kube-dns. If someone set it to `Default`, the pod uses the node's DNS instead of the cluster DNS.

## Step 3: Verify kube-dns Is Running

Check that the kube-dns pods are healthy:

```bash
# Check kube-dns pod status
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check for any restarts or crashes
kubectl get pods -n kube-system -l k8s-app=kube-dns -o wide
```

If kube-dns pods are crashing or not running, that explains your DNS failures. Check the pod events:

```bash
# Get detailed info on kube-dns pods
kubectl describe pods -n kube-system -l k8s-app=kube-dns
```

## Step 4: Check kube-dns Logs

The kube-dns logs are where you find the details. GKE runs kube-dns with multiple containers - typically `kubedns`, `dnsmasq`, and `sidecar`:

```bash
# Check the kubedns container logs for resolution errors
kubectl logs -n kube-system -l k8s-app=kube-dns -c kubedns --tail=100

# Check the dnsmasq container logs for forwarding issues
kubectl logs -n kube-system -l k8s-app=kube-dns -c dnsmasq --tail=100

# Check the sidecar logs for health check failures
kubectl logs -n kube-system -l k8s-app=kube-dns -c sidecar --tail=100
```

Common log messages and what they mean:

- `NXDOMAIN`: The domain does not exist. Check for typos in the service name or namespace.
- `SERVFAIL`: The DNS server failed to process the query. Usually an upstream problem.
- `Timeout`: kube-dns could not reach the upstream DNS servers. Network issue.
- `i/o timeout`: Similar to above, often caused by network policies or firewall rules blocking DNS traffic.

## Step 5: Test with a More Detailed Tool

For more detailed DNS debugging, use a pod with `dig` available:

```bash
# Use a pod with dig for detailed DNS queries
kubectl run dns-dig --image=tutum/dnsutils --restart=Never -- sleep 3600
```

Then run detailed queries:

```bash
# Get detailed DNS response including timing
kubectl exec dns-dig -- dig kubernetes.default.svc.cluster.local

# Check if TCP fallback works (useful when UDP is blocked)
kubectl exec dns-dig -- dig +tcp kubernetes.default.svc.cluster.local

# Trace the DNS resolution path
kubectl exec dns-dig -- dig +trace google.com
```

## Common DNS Issues and Fixes

### Issue: ndots:5 Causing Slow External Resolution

By default, Kubernetes sets `ndots:5` in resolv.conf. This means any domain with fewer than 5 dots gets the search suffixes appended before trying the raw domain. So when your app resolves `api.stripe.com`, Kubernetes first tries:

1. `api.stripe.com.default.svc.cluster.local` (fails)
2. `api.stripe.com.svc.cluster.local` (fails)
3. `api.stripe.com.cluster.local` (fails)
4. `api.stripe.com` (succeeds)

That is three unnecessary DNS lookups for every external name resolution. Fix it by lowering ndots or adding a trailing dot to external domains:

```yaml
# pod-spec.yaml - Reduce ndots to speed up external DNS resolution
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  dnsConfig:
    options:
      - name: ndots
        value: "2"
  containers:
    - name: app
      image: my-app:v1
```

Or in your application code, use fully qualified domain names with a trailing dot: `api.stripe.com.`

### Issue: Network Policies Blocking DNS

If you have network policies in your cluster, make sure they allow DNS traffic to kube-dns:

```yaml
# allow-dns.yaml - Network policy allowing DNS traffic to kube-dns
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: my-namespace
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Allow DNS queries to kube-dns on port 53
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

### Issue: kube-dns Overloaded

If you have a large cluster with many pods making frequent DNS queries, kube-dns can become a bottleneck. Check the resource usage:

```bash
# Check kube-dns resource usage
kubectl top pods -n kube-system -l k8s-app=kube-dns
```

Solutions include:

- Enable Node Local DNS Cache (covered in another post)
- Scale up kube-dns by adjusting the autoscaler
- Reduce unnecessary DNS queries in your applications

Scale the kube-dns autoscaler:

```bash
# View the current kube-dns autoscaler configuration
kubectl get configmap kube-dns-autoscaler -n kube-system -o yaml
```

### Issue: Stale DNS Cache

If a service IP changed but pods still resolve the old IP, you might have a caching issue. Check the TTL of the response:

```bash
# Check DNS response TTL
kubectl exec dns-dig -- dig my-service.default.svc.cluster.local +noall +answer
```

Cluster-internal records typically have a 30-second TTL. If you are seeing stale results beyond that, restart the kube-dns pods:

```bash
# Restart kube-dns pods to clear the cache
kubectl rollout restart deployment kube-dns -n kube-system
```

## Setting Up DNS Monitoring

Prevent future DNS issues by monitoring kube-dns health:

```bash
# Check kube-dns metrics endpoint
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=kube-dns -o name | head -1) \
  -c sidecar -- wget -qO- http://localhost:10054/metrics | grep dns
```

Key metrics to watch include `skydns_skydns_dns_request_count_total`, `skydns_skydns_dns_error_count_total`, and `skydns_skydns_dns_response_size_bytes`.

DNS debugging is tedious but methodical. Start from the pod, work your way to kube-dns, and check the network in between. Nine times out of ten, the problem is a typo in the service name, a missing network policy rule, or kube-dns being overwhelmed. The tools and approach described here will help you find and fix the issue quickly.
