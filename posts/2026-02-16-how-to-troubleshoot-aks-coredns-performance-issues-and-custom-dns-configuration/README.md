# How to Troubleshoot AKS CoreDNS Performance Issues and Custom DNS Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Kubernetes, CoreDNS, DNS, Troubleshooting, Performance, Networking

Description: Diagnose and fix CoreDNS performance problems on AKS including high latency, timeouts, and NXDOMAIN errors, plus custom DNS configuration techniques.

---

DNS is the silent backbone of every Kubernetes cluster. Every time a pod talks to another service, it starts with a DNS lookup. When CoreDNS is healthy, you never think about it. When it is struggling, everything slows down or breaks in confusing ways. Intermittent connection timeouts, services that work sometimes and fail other times, slow application startup - these are all symptoms of CoreDNS problems.

On AKS, CoreDNS runs as a deployment in the `kube-system` namespace, typically with two replicas by default. For clusters beyond a few dozen pods, this default setup is often insufficient. Let us walk through diagnosing CoreDNS performance issues and configuring it to handle production traffic.

## Identifying CoreDNS Problems

The first step is confirming that DNS is actually the bottleneck. Here are the symptoms that point to CoreDNS issues.

- Pods take a long time to start (stuck in ContainerCreating while DNS resolves image registry names)
- Intermittent 5-second delays on HTTP requests (the classic DNS timeout + retry pattern)
- Applications logging DNS resolution failures or NXDOMAIN errors
- `nslookup` or `dig` commands from pods take more than 100ms

Start by checking the CoreDNS pods themselves.

```bash
# Check CoreDNS pod status and resource usage
kubectl get pods -n kube-system -l k8s-app=kube-dns -o wide

# Check CPU and memory usage of CoreDNS pods
kubectl top pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs for errors
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=100
```

Common error patterns in the logs include `SERVFAIL` responses, `i/o timeout` when forwarding to upstream DNS, and `REFUSED` responses.

## The 5-Second Timeout Problem

The most infamous DNS issue in Kubernetes is the 5-second delay. This happens because of a race condition in the Linux kernel's conntrack module when multiple DNS queries hit the same socket simultaneously. The kernel drops one of the packets, the application waits 5 seconds for the timeout, then retries successfully.

On AKS, this manifests as occasional 5-second delays on any network call. To confirm, run a DNS latency test from inside a pod.

```bash
# Deploy a debug pod
kubectl run dns-test --image=busybox:1.36 --restart=Never -- sleep 3600

# Run repeated DNS lookups and look for outliers
kubectl exec dns-test -- sh -c '
for i in $(seq 1 100); do
  start=$(date +%s%N)
  nslookup kubernetes.default.svc.cluster.local > /dev/null 2>&1
  end=$(date +%s%N)
  elapsed=$(( (end - start) / 1000000 ))
  if [ $elapsed -gt 1000 ]; then
    echo "Slow lookup: ${elapsed}ms"
  fi
done
echo "Test complete"
'
```

If you see lookups taking exactly 5000ms, you have the conntrack race condition. The fix on AKS is to enable the local DNS cache.

## Enabling NodeLocal DNSCache

NodeLocal DNSCache runs a DNS cache on every node, reducing the load on CoreDNS and eliminating the conntrack race condition by using TCP instead of UDP for upstream queries.

```bash
# Enable NodeLocal DNSCache on your AKS cluster
# This is available through the AKS node configuration profile

# Check if it is already enabled
kubectl get daemonset node-local-dns -n kube-system 2>/dev/null

# If not available as an AKS feature, deploy it manually
# Download the NodeLocal DNS manifest
kubectl apply -f https://raw.githubusercontent.com/kubernetes/kubernetes/master/cluster/addons/dns/nodelocaldns/nodelocaldns.yaml
```

Alternatively, you can configure pods to use a local DNS cache by modifying the pod's dnsConfig.

```yaml
# pod-with-dns-config.yaml
# Configure the pod to use specific DNS settings
apiVersion: v1
kind: Pod
metadata:
  name: optimized-dns-pod
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers:
      - 169.254.20.10  # NodeLocal DNSCache address
    searches:
      - default.svc.cluster.local
      - svc.cluster.local
      - cluster.local
    options:
      - name: ndots
        value: "5"
      - name: single-request-reopen
        value: ""
  containers:
    - name: app
      image: myapp:latest
```

The `single-request-reopen` option is the key fix for the 5-second timeout. It forces each DNS query to use a separate socket, avoiding the conntrack race condition.

## Scaling CoreDNS

The default 2 replicas of CoreDNS may not be enough for larger clusters. AKS has a CoreDNS autoscaler, but sometimes it needs adjustment.

```bash
# Check the current CoreDNS autoscaler configuration
kubectl get configmap coredns-autoscaler -n kube-system -o yaml
```

The autoscaler uses a linear scaling formula: replicas = max(ceil(cores * coresPerReplica), ceil(nodes * nodesPerReplica)). You can adjust these parameters.

```yaml
# coredns-autoscaler-config.yaml
# Custom autoscaler configuration for larger clusters
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-autoscaler
  namespace: kube-system
data:
  # Scale based on both node count and core count
  linear: '{"coresPerReplica":64,"nodesPerReplica":8,"min":3,"max":20,"preventSinglePointFailure":true}'
```

```bash
# Apply the updated autoscaler config
kubectl apply -f coredns-autoscaler-config.yaml

# Restart the autoscaler to pick up the change
kubectl rollout restart deployment coredns-autoscaler -n kube-system

# Verify the new replica count
kubectl get deployment coredns -n kube-system
```

For a 20-node cluster, this configuration would give you max(ceil(80/64), ceil(20/8)) = max(2, 3) = 3 replicas.

## Optimizing the ndots Setting

The `ndots` setting controls when Kubernetes appends search domains to DNS queries. By default, `ndots` is set to 5, which means any hostname with fewer than 5 dots gets the search domain appended. For external domains like `api.example.com` (2 dots), Kubernetes tries `api.example.com.default.svc.cluster.local`, `api.example.com.svc.cluster.local`, `api.example.com.cluster.local`, and finally `api.example.com`.

That is 4 DNS queries for a single external lookup. For applications that make many external API calls, this multiplies DNS load significantly.

```yaml
# deployment-with-optimized-dns.yaml
# Reduce ndots for applications that mostly call external services
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-api-client
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-client
  template:
    metadata:
      labels:
        app: api-client
    spec:
      dnsConfig:
        options:
          # Reduce ndots so external domains resolve faster
          - name: ndots
            value: "2"
      containers:
        - name: client
          image: myacr.azurecr.io/api-client:v1
```

Setting `ndots` to 2 means `api.example.com` resolves in one query instead of four. But you need to use fully qualified names for Kubernetes services (for example, `my-service.my-namespace.svc.cluster.local` instead of just `my-service`).

## Custom CoreDNS Configuration

AKS allows you to customize CoreDNS by creating a ConfigMap called `coredns-custom` in the `kube-system` namespace.

### Adding Custom DNS Zones

If you need to resolve internal corporate domains, add a forward rule.

```yaml
# coredns-custom.yaml
# Custom CoreDNS configuration for AKS
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  # Forward queries for corp.example.com to the corporate DNS server
  corporate.server: |
    corp.example.com:53 {
        forward . 10.0.0.10 10.0.0.11
        cache 30
        log
    }
  # Forward queries for a partner domain to their DNS
  partner.server: |
    partner.example.com:53 {
        forward . 192.168.1.10
        cache 60
    }
```

```bash
# Apply the custom config
kubectl apply -f coredns-custom.yaml

# Restart CoreDNS to pick up changes
kubectl rollout restart deployment coredns -n kube-system

# Verify the custom configuration is loaded
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=20
```

### Adding Custom Hosts Entries

You can also add static DNS entries that resolve within the cluster.

```yaml
# coredns-custom-hosts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  # Add custom host entries
  custom-hosts.override: |
    hosts {
        10.100.0.50 legacy-db.internal
        10.100.0.51 legacy-api.internal
        fallthrough
    }
```

The `fallthrough` directive is important - without it, CoreDNS stops processing after the hosts plugin and does not resolve anything else.

## Monitoring CoreDNS Performance

CoreDNS exposes Prometheus metrics that give you deep visibility into DNS performance.

```bash
# Check if CoreDNS metrics endpoint is accessible
kubectl exec dns-test -- wget -qO- http://10.0.0.10:9153/metrics | head -20
```

Key metrics to watch.

```promql
# DNS query latency (95th percentile)
histogram_quantile(0.95, sum(rate(coredns_dns_request_duration_seconds_bucket[5m])) by (le))

# DNS error rate
sum(rate(coredns_dns_responses_total{rcode="SERVFAIL"}[5m]))

# Total DNS queries per second
sum(rate(coredns_dns_requests_total[5m]))

# Cache hit ratio
sum(rate(coredns_cache_hits_total[5m])) / (sum(rate(coredns_cache_hits_total[5m])) + sum(rate(coredns_cache_misses_total[5m])))
```

A healthy CoreDNS should show query latency under 10ms for cached responses, error rates near zero, and cache hit ratios above 80%.

## Wrapping Up

CoreDNS performance directly impacts the performance of everything running in your cluster. Start by checking for the 5-second timeout issue - it is the most common and most impactful problem. Scale CoreDNS based on your cluster size, tune the ndots setting for applications that make frequent external calls, and add custom DNS rules for corporate or partner domains. Monitor DNS metrics through Prometheus to catch degradation before your users notice it. DNS is one of those things that should be invisible, and with the right configuration on AKS, it will be.
