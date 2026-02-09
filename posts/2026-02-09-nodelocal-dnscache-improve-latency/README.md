# How to Configure NodeLocal DNSCache to Reduce CoreDNS Load and Improve Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DNS, Performance, NodeLocal

Description: Learn how to deploy and configure NodeLocal DNSCache to reduce CoreDNS server load, improve DNS query latency, and increase reliability by caching DNS responses at the node level in Kubernetes clusters.

---

NodeLocal DNSCache runs as a DaemonSet on every Kubernetes node, providing a local DNS cache that intercepts queries before they reach CoreDNS. This architecture dramatically reduces DNS query latency, decreases CoreDNS load, and improves reliability by eliminating single points of failure for DNS resolution.

This guide shows you how to implement NodeLocal DNSCache for optimized DNS performance in Kubernetes clusters.

## Understanding NodeLocal DNSCache Benefits

NodeLocal DNSCache provides several advantages:

- **Reduced latency**: Local cache avoids network hops to CoreDNS
- **Lower CoreDNS load**: Caching at node level reduces cluster DNS queries
- **Improved reliability**: Node-level cache survives CoreDNS outages
- **Better performance**: TCP connections to local cache avoid UDP packet loss
- **Scalability**: Distributes DNS load across all nodes

Architecture:

```
Pod -> Node-local DNS Cache (169.254.20.10) -> CoreDNS (if cache miss) -> Upstream DNS
```

## Deploying NodeLocal DNSCache

Download and customize the official manifest:

```bash
# Download manifest
wget https://raw.githubusercontent.com/kubernetes/kubernetes/master/cluster/addons/dns/nodelocaldns/nodelocaldns.yaml

# Customize for your cluster
sed -i "s/__PILLAR__DNS__SERVER__/10.96.0.10/g" nodelocaldns.yaml
sed -i "s/__PILLAR__LOCAL__DNS__/169.254.20.10/g" nodelocaldns.yaml
sed -i "s/__PILLAR__DNS__DOMAIN__/cluster.local/g" nodelocaldns.yaml
```

Or create the manifest directly:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: node-local-dns
  namespace: kube-system
---
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
        bind 169.254.20.10 10.96.0.10
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
        bind 169.254.20.10 10.96.0.10
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
        bind 169.254.20.10 10.96.0.10
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
        bind 169.254.20.10 10.96.0.10
        forward . /etc/resolv.conf {
            force_tcp
        }
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
    spec:
      priorityClassName: system-node-critical
      serviceAccountName: node-local-dns
      hostNetwork: true
      dnsPolicy: Default
      tolerations:
      - effect: NoSchedule
        operator: Exists
      - effect: NoExecute
        operator: Exists
      containers:
      - name: node-cache
        image: registry.k8s.io/dns/k8s-dns-node-cache:1.22.20
        resources:
          requests:
            cpu: 25m
            memory: 5Mi
        args:
        - -localip
        - 169.254.20.10,10.96.0.10
        - -conf
        - /etc/coredns/Corefile
        - -upstreamsvc
        - kube-dns
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
        - name: config
          mountPath: /etc/coredns
        - name: xtables-lock
          mountPath: /run/xtables.lock
      volumes:
      - name: config
        configMap:
          name: node-local-dns
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
---
apiVersion: v1
kind: Service
metadata:
  name: node-local-dns
  namespace: kube-system
  labels:
    k8s-app: node-local-dns
spec:
  clusterIP: None
  ports:
  - name: metrics
    port: 9253
    targetPort: 9253
  selector:
    k8s-app: node-local-dns
```

Deploy NodeLocal DNSCache:

```bash
kubectl apply -f nodelocaldns.yaml

# Verify DaemonSet
kubectl get daemonset node-local-dns -n kube-system

# Check pods on all nodes
kubectl get pods -n kube-system -l k8s-app=node-local-dns -o wide
```

## Configuring Pods to Use NodeLocal DNSCache

Existing pods automatically use NodeLocal DNSCache after deployment because it binds to the CoreDNS service IP. For explicit configuration:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-nodelocal
spec:
  containers:
  - name: app
    image: nginx:1.21
  dnsConfig:
    nameservers:
    - 169.254.20.10  # NodeLocal DNSCache IP
    searches:
    - default.svc.cluster.local
    - svc.cluster.local
    - cluster.local
    options:
    - name: ndots
      value: "5"
```

## Optimizing Cache Settings

Tune cache parameters for your workload:

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
            # Success cache: 9984 entries, 30 second TTL
            success 9984 30
            # Denial cache: 9984 entries, 5 second TTL
            denial 9984 5
            # Serve stale entries for up to 1 hour if upstream down
            serve_stale 3600
            # Prefetch popular entries
            prefetch 10 60m 10%
        }
        reload
        loop
        bind 169.254.20.10 10.96.0.10
        forward . 10.96.0.10 {
            force_tcp
            max_concurrent 1000
        }
        prometheus :9253
        health 169.254.20.10:8080
    }

    .:53 {
        errors
        cache 60 {
            success 8192 60
            denial 2048 10
        }
        reload
        loop
        bind 169.254.20.10 10.96.0.10
        forward . /etc/resolv.conf {
            force_tcp
        }
        prometheus :9253
    }
```

Apply updated configuration:

```bash
kubectl apply -f node-local-dns-config.yaml

# Restart DaemonSet to apply changes
kubectl rollout restart daemonset node-local-dns -n kube-system
```

## Monitoring NodeLocal DNSCache

Access metrics for each node:

```bash
# Port forward to a node-local-dns pod
kubectl port-forward -n kube-system node-local-dns-xxxxx 9253:9253

# Query metrics
curl http://localhost:9253/metrics | grep coredns_cache
```

Create ServiceMonitor for Prometheus:

```yaml
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
    path: /metrics
```

Key metrics to monitor:

```promql
# Cache hit ratio per node
sum(rate(coredns_cache_hits_total{job="node-local-dns"}[5m])) by (instance)
/
sum(rate(coredns_dns_requests_total{job="node-local-dns"}[5m])) by (instance)

# Query rate per node
rate(coredns_dns_requests_total{job="node-local-dns"}[5m])

# Cache entries per node
coredns_cache_entries{job="node-local-dns"}

# Forward requests (cache misses)
rate(coredns_forward_requests_total{job="node-local-dns"}[5m])
```

## Testing Performance Improvements

Benchmark DNS performance before and after:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-benchmark
data:
  benchmark.sh: |
    #!/bin/bash

    ITERATIONS=1000
    SERVICES=(
        "kubernetes.default.svc.cluster.local"
        "kube-dns.kube-system.svc.cluster.local"
    )

    echo "DNS Performance Benchmark"
    echo "Iterations: $ITERATIONS"
    echo "Node: $(hostname)"
    echo ""

    for service in "${SERVICES[@]}"; do
        echo "Testing: $service"

        start=$(date +%s%N)
        for i in $(seq 1 $ITERATIONS); do
            nslookup $service >/dev/null 2>&1
        done
        end=$(date +%s%N)

        duration=$((($end - $start) / 1000000))
        avg=$(($duration / $ITERATIONS))

        echo "  Total time: ${duration}ms"
        echo "  Average: ${avg}ms per query"
        echo ""
    done
---
apiVersion: batch/v1
kind: Job
metadata:
  name: dns-benchmark
spec:
  template:
    spec:
      containers:
      - name: benchmark
        image: nicolaka/netshoot
        command:
        - sh
        - /scripts/benchmark.sh
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: dns-benchmark
      restartPolicy: Never
```

Run benchmark:

```bash
kubectl apply -f dns-benchmark.yaml
kubectl logs job/dns-benchmark
```

## Troubleshooting NodeLocal DNSCache

**Issue: Pods not using NodeLocal DNSCache**

Check iptables rules:

```bash
# Exec into node
kubectl debug node/my-node -it --image=nicolaka/netshoot

# Check iptables rules
iptables -t nat -L | grep 169.254.20.10
```

**Issue: High cache miss rate**

Increase cache size:

```yaml
cache {
    success 16384 60  # Increase from 9984
    denial 4096 10
}
```

**Issue: NodeLocal DNSCache pods not starting**

Check node resources and tolerations:

```bash
kubectl describe pod -n kube-system -l k8s-app=node-local-dns
```

## Best Practices

Follow these guidelines for NodeLocal DNSCache:

1. Monitor cache hit rates per node
2. Tune cache sizes based on workload
3. Use appropriate TTL values
4. Enable prefetching for hot entries
5. Monitor for memory usage on nodes
6. Test in non-production first
7. Document NodeLocal DNSCache architecture
8. Include in disaster recovery plans
9. Monitor forward requests to CoreDNS
10. Regular review of cache effectiveness

NodeLocal DNSCache dramatically improves DNS performance in Kubernetes by caching at the node level. By reducing latency, lowering CoreDNS load, and improving reliability, it's an essential component for production clusters. Proper configuration and monitoring ensure you get maximum benefit from this powerful caching layer.

For related DNS optimizations, explore our guides on [CoreDNS cache configuration](https://oneuptime.com/blog/post/coredns-cache-plugin-ttl/view) and [CoreDNS autopath plugin](https://oneuptime.com/blog/post/coredns-autopath-plugin-latency/view).
