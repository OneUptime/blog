# How to Fix GKE DNS Resolution Failures with kube-dns and CoreDNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Kubernetes, DNS, CoreDNS, Kube-dns, Networking, Troubleshooting, GCP

Description: A practical guide to diagnosing and fixing DNS resolution failures in GKE clusters, covering both kube-dns and CoreDNS configurations and common failure modes.

---

DNS issues in Kubernetes are sneaky. Everything looks fine until a pod cannot resolve a service name, an external domain, or both. The symptoms vary - timeouts, connection refused, NXDOMAIN responses - but the root cause usually lives in the cluster DNS system. In GKE Standard clusters, that usually means kube-dns, including GKE's CoreDNS-based kube-dns in newer versions, or Cloud DNS if you have changed the cluster DNS provider.

Let's walk through the most common DNS failures and how to fix each one.

## How DNS Works in GKE

Before debugging, you need to understand the flow. When a pod makes a DNS query:

```mermaid
sequenceDiagram
    participant Pod
    participant kubelet
    participant kube-dns/CoreDNS
    participant Upstream DNS

    kubelet->>Pod: Writes /etc/resolv.conf
    Pod->>kube-dns/CoreDNS: DNS query to cluster DNS (10.x.x.10:53)
    kube-dns/CoreDNS->>kube-dns/CoreDNS: Check cluster domain (cluster.local)
    alt Cluster service
        kube-dns/CoreDNS-->>Pod: Return ClusterIP
    else External domain
        kube-dns/CoreDNS->>Upstream DNS: Forward to configured upstream resolver
        Upstream DNS-->>kube-dns/CoreDNS: Return external IP
        kube-dns/CoreDNS-->>Pod: Return external IP
    end
```

The kubelet configures each pod's `/etc/resolv.conf` to point at the cluster DNS service IP (usually 10.x.0.10) when the cluster uses kube-dns without NodeLocal DNSCache or Cloud DNS. With NodeLocal DNSCache or Cloud DNS for GKE, the nameserver IP can be different.

## Step 1 - Test DNS from Inside a Pod

Start by verifying DNS is actually broken and identifying what type of resolution fails:

```bash
# Launch a debug pod with DNS tools

kubectl run dns-debug --image=busybox:1.36 --rm -it --restart=Never -- sh
```

Inside the debug pod:

```bash
# Test cluster DNS resolution for a service
nslookup kubernetes.default.svc.cluster.local

# Test external DNS resolution
nslookup google.com

# Check the DNS configuration
cat /etc/resolv.conf
```

The resolv.conf should look something like:

```text
nameserver 10.48.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

If nslookup hangs or returns errors, you have confirmed a DNS problem.

## Step 2 - Check the DNS Pods

Make sure kube-dns pods are actually running:

```bash
# Check DNS pod status in the kube-system namespace
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

You should see pods in Running state. If they are in CrashLoopBackOff or not present, that is your problem right there.

Check the logs for errors:

```bash
# View kube-dns logs for errors
kubectl logs -n kube-system -l k8s-app=kube-dns --all-containers=true --tail=50
```

Common log errors include:
- Connection refused to upstream DNS
- Timeout reaching metadata server
- Resource exhaustion (OOM or CPU throttling)

## Step 3 - Fix DNS Pod Resource Issues

One of the most common causes of DNS failures in busy clusters is kube-dns running out of resources. The default resource allocation is often too small for clusters with many pods or high query rates.

Check if the DNS pods are being CPU-throttled:

```bash
# Check resource usage of DNS pods
kubectl top pods -n kube-system -l k8s-app=kube-dns
```

If the DNS pods are consistently at their CPU limit, increase the resources:

```bash
# Scale up kube-dns resources by editing the deployment
kubectl edit deployment kube-dns -n kube-system
```

Or use `kubectl set resources`:

```bash
# Increase CPU and memory limits for kube-dns
kubectl set resources deployment/kube-dns -n kube-system \
  --containers='*' \
  --limits=cpu=200m,memory=300Mi
```

## Step 4 - Scale DNS Pods

In larger clusters, two DNS pods might not be enough. You can scale kube-dns manually for a quick test, but the GKE DNS autoscaler can adjust the replica count again:

```bash
# Scale kube-dns to more replicas
kubectl scale deployment kube-dns -n kube-system --replicas=4
```

For sustained scaling, check the kube-dns autoscaler ConfigMap:

```bash
# Check DNS autoscaler configuration
kubectl get configmap kube-dns-autoscaler -n kube-system -o yaml
```

If it exists, you can adjust the scaling parameters:

```yaml
# DNS autoscaler config - adjusts replicas based on cluster size
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-dns-autoscaler
  namespace: kube-system
data:
  linear: |-
    {
      "coresPerReplica": 128,
      "nodesPerReplica": 4,
      "min": 2,
      "max": 10,
      "preventSinglePointFailure": true
    }
```

This configuration creates at least one DNS replica per 4 nodes, subject to the `coresPerReplica`, `min`, and `max` settings.

## Step 5 - Fix ndots Issues

The `ndots:5` setting in resolv.conf means that any domain with fewer than 5 dots gets the search domains appended first. So a query for `google.com` actually triggers queries for `google.com.default.svc.cluster.local`, `google.com.svc.cluster.local`, `google.com.cluster.local`, and then finally `google.com`.

This multiplies DNS traffic by 4-5x for external domains. For applications that make many external DNS queries, this is a performance killer and can overwhelm your DNS pods.

Fix it per-pod by setting a custom DNS config:

```yaml
# Reduce ndots to 2 for pods that mainly call external services
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-api-caller
spec:
  selector:
    matchLabels:
      app: external-api-caller
  template:
    metadata:
      labels:
        app: external-api-caller
    spec:
      dnsConfig:
        options:
        - name: ndots
          value: "2"
        - name: single-request-reopen
          value: ""
      containers:
      - name: app
        image: your-app:latest
```

For glibc-based images, the `single-request-reopen` option also helps avoid a race condition where A and AAAA queries sent on the same socket interfere with each other.

## Step 6 - Fix External DNS Resolution Failures

If cluster DNS works (services resolve) but external domains do not, the issue is usually with the upstream DNS path.

In GKE, kube-dns resolves external names recursively by forwarding to its configured upstream resolvers. If you use Cloud DNS for GKE, the metadata server at 169.254.169.254 is part of the DNS data path. If you use NodeLocal DNSCache, the node-local cache handles the first hop and forwards misses based on the cluster DNS configuration.

Test the DNS service directly from a debug pod:

```bash
# Check whether the kube-dns Service can resolve external names
KUBE_DNS_IP=$(kubectl get svc kube-dns -n kube-system -o jsonpath='{.spec.clusterIP}')
kubectl run dns-debug --image=busybox:1.36 --rm -it --restart=Never -- \
  nslookup google.com "$KUBE_DNS_IP"
```

If that fails, check network policies. A common mistake is deploying a NetworkPolicy that blocks egress from kube-system:

```yaml
# Network policy that accidentally blocks DNS egress
# Check if you have something like this
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: kube-system  # this will break DNS!
spec:
  podSelector: {}
  policyTypes:
  - Egress
```

If you need network policies in kube-system, make sure DNS pods can reach their configured upstream resolvers. This example allows all egress from the DNS pods:

```yaml
# Allow kube-dns to reach upstream resolvers
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: kube-system
spec:
  podSelector:
    matchLabels:
      k8s-app: kube-dns
  policyTypes:
  - Egress
  egress:
  - {}  # allow all egress for DNS pods
```

## Step 7 - Debug Intermittent DNS Failures

Intermittent failures are the worst. They work most of the time but randomly fail. In GKE, the most common causes are:

**Conntrack table full**: On busy nodes, the conntrack table (which tracks UDP connections) can fill up, causing DNS packets to be dropped.

```bash
# Check conntrack table usage on a node (SSH first)
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max
```

**UDP packet loss**: DNS uses UDP by default. Under high load, UDP packets can be silently dropped.

**Race condition with search domains**: The Linux DNS resolver has a known issue where concurrent A and AAAA queries on the same socket can interfere. The fix is the `single-request-reopen` option mentioned earlier.

For persistent intermittent failures, consider enabling NodeLocal DNSCache:

```bash
# Enable NodeLocal DNSCache addon in GKE
gcloud container clusters update your-cluster \
  --update-addons=NodeLocalDNS=ENABLED \
  --zone us-central1-a
```

NodeLocal DNSCache runs a DNS cache on every node, which dramatically reduces the load on kube-dns and eliminates many intermittent failures by avoiding cross-node UDP traffic for cached queries.

## Step 8 - Verify After Fixes

After making changes, run a comprehensive test:

```bash
# Run a thorough DNS test from a debug pod
kubectl run dns-test --image=busybox:1.36 --rm -it --restart=Never -- sh -c '
  echo "=== Cluster DNS ==="
  nslookup kubernetes.default.svc.cluster.local
  echo "=== External DNS ==="
  nslookup google.com
  echo "=== DNS service ==="
  nslookup kube-dns.kube-system.svc.cluster.local
  echo "=== Response time ==="
  time nslookup google.com
'
```

Good DNS response times should be under 10ms for cluster queries and under 50ms for external queries. If you are seeing hundreds of milliseconds, there is still a bottleneck somewhere.

## Summary

DNS failures in GKE usually fall into a few categories: DNS pods overwhelmed, network policies blocking traffic, ndots causing query multiplication, or upstream resolution broken. Start by testing from a debug pod to narrow down the failure type, then work through the specific fix. NodeLocal DNSCache is the single most impactful improvement you can make for DNS reliability in busy clusters.
