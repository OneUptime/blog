# How to Configure NodeLocal DNSCache to Reduce CoreDNS Load

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, NodeLocal DNSCache, Performance, CoreDNS

Description: Deploy and configure NodeLocal DNSCache in Kubernetes to dramatically reduce CoreDNS load, improve DNS query latency, and increase cluster reliability through node-level DNS caching.

---

NodeLocal DNSCache runs a lightweight DNS cache on every node in your Kubernetes cluster. Instead of pods sending all DNS queries to CoreDNS over the network, they query a local cache running on the same node. This avoids kube-proxy DNAT and connection tracking for DNS queries, reduces CoreDNS load, and can improve query latency.

## Why NodeLocal DNSCache Matters

In default Kubernetes setups, every DNS query travels from the pod through the CNI to kube-proxy, which load-balances to a CoreDNS pod that might be on a different node. This introduces latency and creates load on CoreDNS, kube-proxy, and the network.

NodeLocal DNSCache intercepts these queries at the node level. Queries for cluster services hit the node-local cache first. Only cache misses go to CoreDNS. External domain queries can be configured to go directly to upstream DNS or through CoreDNS, depending on your needs.

## Understanding the Architecture

NodeLocal DNSCache runs as a DaemonSet, deploying one cache pod per node. It listens on a local IP address such as 169.254.20.10 that's configured on each node. In IPVS mode, kubelet must be updated so new pods use this local IP in /etc/resolv.conf; in iptables mode, NodeLocal DNSCache can listen on both the kube-dns service IP and the local IP.

The cache pods forward cluster domain queries to CoreDNS and external queries to upstream DNS servers. This setup creates a two-tier caching architecture that dramatically improves performance.

## Deploying NodeLocal DNSCache

First, determine your cluster's DNS service IP:

```bash
kubectl get svc -n kube-system kube-dns -o jsonpath='{.spec.clusterIP}'
```

Note this IP (typically 10.96.0.10 or similar). You'll need it for configuration.

Download the NodeLocal DNSCache manifest:

```bash
wget https://raw.githubusercontent.com/kubernetes/kubernetes/master/cluster/addons/dns/nodelocaldns/nodelocaldns.yaml
```

Edit the manifest to replace placeholder values:

```bash
# Replace with your actual values

CLUSTER_DNS_IP="10.96.0.10"
LOCAL_DNS_IP="169.254.20.10"
DNS_DOMAIN="cluster.local"
```

For kube-proxy in iptables mode:

```bash
sed -i "s/__PILLAR__LOCAL__DNS__/$LOCAL_DNS_IP/g; s/__PILLAR__DNS__DOMAIN__/$DNS_DOMAIN/g; s/__PILLAR__DNS__SERVER__/$CLUSTER_DNS_IP/g" nodelocaldns.yaml
```

For kube-proxy in IPVS mode:

```bash
sed -i "s/__PILLAR__LOCAL__DNS__/$LOCAL_DNS_IP/g; s/__PILLAR__DNS__DOMAIN__/$DNS_DOMAIN/g; s/,__PILLAR__DNS__SERVER__//g; s/__PILLAR__CLUSTER__DNS__/$CLUSTER_DNS_IP/g" nodelocaldns.yaml
```

For IPVS mode, the base manifest includes a ConfigMap and DaemonSet configuration like this:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-local-dns
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
        forward . 10.96.0.10 {
            force_tcp
        }
        prometheus :9253
        health 169.254.20.10:8080
    }
    in-addr.arpa:53 {
        errors
        cache 30
        reload
        loop
        bind 169.254.20.10
        forward . 10.96.0.10 {
            force_tcp
        }
        prometheus :9253
    }
    ip6.arpa:53 {
        errors
        cache 30
        reload
        loop
        bind 169.254.20.10
        forward . 10.96.0.10 {
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
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-local-dns
  namespace: kube-system
  labels:
    k8s-app: node-local-dns
spec:
  selector:
    matchLabels:
      k8s-app: node-local-dns
  template:
    metadata:
      labels:
        k8s-app: node-local-dns
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9253"
    spec:
      priorityClassName: system-node-critical
      serviceAccountName: node-local-dns
      hostNetwork: true
      dnsPolicy: Default
      tolerations:
      - key: "CriticalAddonsOnly"
        operator: "Exists"
      - effect: "NoExecute"
        operator: "Exists"
      - effect: "NoSchedule"
        operator: "Exists"
      containers:
      - name: node-cache
        image: registry.k8s.io/dns/k8s-dns-node-cache:1.26.8
        resources:
          requests:
            cpu: 25m
            memory: 5Mi
        args:
        - -localip
        - 169.254.20.10
        - -conf
        - /etc/Corefile
        - -upstreamsvc
        - kube-dns-upstream
        securityContext:
          capabilities:
            add:
            - NET_ADMIN
        ports:
        - containerPort: 53
          name: dns
          protocol: UDP
        - containerPort: 53
          name: dns-tcp
          protocol: TCP
        - containerPort: 9253
          name: metrics
          protocol: TCP
        livenessProbe:
          httpGet:
            host: 169.254.20.10
            path: /health
            port: 8080
          initialDelaySeconds: 60
          timeoutSeconds: 5
        volumeMounts:
        - name: xtables-lock
          mountPath: /run/xtables.lock
          readOnly: false
        - name: config-volume
          mountPath: /etc/coredns
        - name: kube-dns-config
          mountPath: /etc/kube-dns
      volumes:
      - name: config-volume
        configMap:
          name: node-local-dns
          items:
          - key: Corefile
            path: Corefile.base
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
      - name: kube-dns-config
        configMap:
          name: kube-dns
          optional: true
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: node-local-dns
  namespace: kube-system
---
apiVersion: v1
kind: Service
metadata:
  name: kube-dns-upstream
  namespace: kube-system
  labels:
    k8s-app: kube-dns
spec:
  ports:
  - name: dns
    port: 53
    protocol: UDP
    targetPort: 53
  - name: dns-tcp
    port: 53
    protocol: TCP
    targetPort: 53
  selector:
    k8s-app: kube-dns
```

The `node-local-dns` container populates upstream DNS servers from the kube-dns ConfigMap and the `kube-dns-upstream` service.

Deploy NodeLocal DNSCache:

```bash
kubectl apply -f nodelocaldns.yaml
```

Verify deployment:

```bash
kubectl get daemonset -n kube-system node-local-dns
kubectl get pods -n kube-system -l k8s-app=node-local-dns
```

You should see one pod running on each node.

## Configuring kubelet to Use NodeLocal DNSCache

Update kubelet configuration to point pods to the node-local cache when you use kube-proxy in IPVS mode. In iptables mode, the sample manifest listens on both the kube-dns service IP and the node-local IP, so changing kubelet is not required. The approach varies by Kubernetes distribution.

For clusters using kubeadm, edit the kubelet config:

```bash
# On each node
sudo vim /var/lib/kubelet/config.yaml
```

Add or update the clusterDNS field:

```yaml
clusterDNS:
- 169.254.20.10
```

Restart kubelet:

```bash
sudo systemctl restart kubelet
```

For managed Kubernetes (EKS, GKE, AKS), update through the provider's configuration mechanism.

Verify that new pods use the correct DNS:

```bash
kubectl run test-dns --image=nicolaka/netshoot -it --rm -- cat /etc/resolv.conf
```

You should see:

```text
nameserver 169.254.20.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

## Optimizing NodeLocal DNSCache Configuration

Tune the cache settings for your workload. Edit the ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-local-dns
  namespace: kube-system
data:
  Corefile: |
    cluster.local:53 {
        errors
        cache {
            # Increased cache size and TTL for cluster domains
            success 15000 60
            denial 5000 10
        }
        reload
        loop
        bind 169.254.20.10
        forward . 10.96.0.10 {
            max_concurrent 1000
            force_tcp
        }
        prometheus :9253
        health 169.254.20.10:8080
    }
    in-addr.arpa:53 {
        errors
        cache {
            success 10000 60
            denial 2000 10
        }
        reload
        loop
        bind 169.254.20.10
        forward . 10.96.0.10 {
            force_tcp
        }
        prometheus :9253
    }
    ip6.arpa:53 {
        errors
        cache {
            success 10000 60
            denial 2000 10
        }
        reload
        loop
        bind 169.254.20.10
        forward . 10.96.0.10 {
            force_tcp
        }
        prometheus :9253
    }
    .:53 {
        errors
        cache {
            # External domain caching
            success 10000 300
            denial 2000 60
        }
        reload
        loop
        bind 169.254.20.10
        forward . /etc/resolv.conf {
            max_concurrent 1000
        }
        prometheus :9253
    }
```

This configuration:
- Caches cluster services for 60 seconds (up to 15000 entries)
- Caches external domains for 5 minutes (up to 10000 entries)
- Uses larger cache sizes for better hit rates
- Limits concurrent queries to prevent overload

Apply the changes:

```bash
kubectl apply -f nodelocaldns-configmap.yaml
```

The cache pods automatically reload the configuration.

## Bypassing NodeLocal DNSCache for Specific Workloads

Some workloads may need to bypass the node-local cache and query CoreDNS directly. Configure this by modifying dnsConfig:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: direct-coredns
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers:
    - 10.96.0.10  # CoreDNS cluster IP
    searches:
    - default.svc.cluster.local
    - svc.cluster.local
    - cluster.local
    options:
    - name: ndots
      value: "5"
  containers:
  - name: app
    image: nginx
```

In IPVS mode, this pod bypasses NodeLocal DNSCache and queries the kube-dns service IP directly. In iptables mode, the official NodeLocal DNSCache manifest also listens on the kube-dns service IP, so using the service IP does not bypass the local cache.

## Monitoring NodeLocal DNSCache

NodeLocal DNSCache exposes Prometheus metrics on port 9253. Create a ServiceMonitor:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: node-local-dns-metrics
  namespace: kube-system
  labels:
    k8s-app: node-local-dns
spec:
  clusterIP: None
  ports:
  - name: metrics
    port: 9253
    protocol: TCP
  selector:
    k8s-app: node-local-dns
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: node-local-dns
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: node-local-dns
  endpoints:
  - port: metrics
    interval: 30s
```

Query key metrics:

```bash
# Port-forward to a node-local-dns pod
kubectl port-forward -n kube-system node-local-dns-xxxxx 9253:9253

# Check cache hit rate
curl -s http://localhost:9253/metrics | grep coredns_cache_hits_total
curl -s http://localhost:9253/metrics | grep coredns_cache_requests_total

# Check query duration
curl -s http://localhost:9253/metrics | grep coredns_dns_request_duration_seconds
```

Create Grafana dashboards to visualize:
- Cache hit rate per node
- Query latency distribution
- Cache size utilization
- Queries per second per node

## Troubleshooting Common Issues

If NodeLocal DNSCache isn't working:

1. **Check pod status:**

```bash
kubectl get pods -n kube-system -l k8s-app=node-local-dns
kubectl logs -n kube-system -l k8s-app=node-local-dns
```

2. **Verify packet filtering rules:**

```bash
# On a node
sudo iptables -t raw -L PREROUTING -n | grep 169.254.20.10
```

You should see rules for DNS traffic and the local cache IP.

3. **Test connectivity:**

```bash
kubectl run test --image=nicolaka/netshoot -it --rm -- bash
# Inside the pod
nslookup kubernetes.default.svc.cluster.local
dig @169.254.20.10 kubernetes.default.svc.cluster.local
```

4. **Check for port conflicts:**

Ensure port 53 UDP/TCP and 8080 TCP are available on nodes.

5. **Verify link-local IP assignment:**

```bash
# On a node
ip addr show | grep 169.254.20.10
```

## Performance Impact

After deploying NodeLocal DNSCache, you can expect:

- Fewer queries reaching CoreDNS, depending on cache hit rate
- Lower DNS tail latency when pods avoid cross-node CoreDNS lookups and UDP conntrack delays
- Reduced network traffic within the cluster
- More consistent DNS performance under load
- Better isolation between nodes (DNS issues on one node don't affect others)

Measure the impact with benchmarks:

```bash
# Before NodeLocal DNSCache
kubectl run bench --image=nicolaka/netshoot -it --rm -- \
  time bash -c 'for i in {1..1000}; do nslookup kubernetes.default > /dev/null; done'

# After NodeLocal DNSCache (with new pods using the cache)
kubectl run bench --image=nicolaka/netshoot -it --rm -- \
  time bash -c 'for i in {1..1000}; do nslookup kubernetes.default > /dev/null; done'
```

NodeLocal DNSCache is one of the highest-impact DNS optimizations you can make in Kubernetes. It's especially valuable in large clusters or environments with high DNS query rates.
