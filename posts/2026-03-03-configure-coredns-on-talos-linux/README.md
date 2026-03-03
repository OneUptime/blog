# How to Configure CoreDNS on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CoreDNS, DNS, Kubernetes, Networking

Description: Learn how to customize CoreDNS configuration on Talos Linux for custom domains, forwarding, and performance tuning.

---

CoreDNS is the default DNS server in Kubernetes, and Talos Linux is no exception. It handles all in-cluster DNS resolution - when a pod looks up a Service name, CoreDNS resolves it to the appropriate ClusterIP. While the default configuration works for most scenarios, production clusters often need customization. You might need to add custom DNS entries, forward queries for specific domains to corporate DNS servers, tune caching for performance, or configure logging for troubleshooting.

This guide covers how to customize CoreDNS on Talos Linux at both the Talos configuration level and through Kubernetes ConfigMap modifications.

## How CoreDNS Works in Talos Linux

Talos Linux deploys CoreDNS as a Kubernetes Deployment in the `kube-system` namespace during cluster bootstrap. It creates a Service with the cluster DNS IP (typically 10.96.0.10) that all pods use for name resolution.

Check the current CoreDNS status:

```bash
# View CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# View the CoreDNS Service
kubectl get svc -n kube-system kube-dns

# View the current CoreDNS configuration
kubectl get configmap -n kube-system coredns -o yaml
```

The default Corefile looks something like this:

```text
.:53 {
    errors
    health
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
    }
    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
    loadbalance
}
```

## Modifying CoreDNS Through Talos Configuration

Talos allows you to customize CoreDNS through machine configuration. This is the preferred approach for changes you want baked into the cluster from the start:

```yaml
# coredns-config.yaml
# Customize CoreDNS through Talos machine configuration
cluster:
  coreDNS:
    disabled: false
    image: registry.k8s.io/coredns/coredns:v1.11.1
```

Note that Talos manages the initial CoreDNS deployment. For detailed Corefile customization, you typically modify the CoreDNS ConfigMap directly in Kubernetes after the cluster is bootstrapped.

## Customizing the Corefile

The most common customization is editing the CoreDNS ConfigMap. Here is how to add custom DNS forwarding:

```bash
# Edit the CoreDNS ConfigMap
kubectl edit configmap coredns -n kube-system
```

Or apply a specific configuration:

```yaml
# coredns-configmap.yaml
# Custom CoreDNS configuration with additional features
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
        forward . 8.8.8.8 8.8.4.4 {
            max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

Apply the configuration:

```bash
kubectl apply -f coredns-configmap.yaml

# Restart CoreDNS to pick up the changes
kubectl rollout restart deployment/coredns -n kube-system
```

## Adding Custom Domain Forwarding

If your organization has internal domains that should resolve through specific DNS servers:

```yaml
# coredns-custom-forward.yaml
# Forward specific domains to corporate DNS
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
        forward . 8.8.8.8 8.8.4.4
        cache 30
        loop
        reload
        loadbalance
    }

    # Forward internal corporate domain to corporate DNS
    corp.example.com:53 {
        errors
        cache 60
        forward . 10.0.0.53 10.0.0.54
    }

    # Forward another internal domain
    internal.mycompany.com:53 {
        errors
        cache 60
        forward . 10.0.1.53
    }
```

## Adding Static DNS Entries

For services that do not have Kubernetes Service objects but need to be resolvable from within the cluster:

```yaml
# coredns-static-entries.yaml
# Add static DNS entries using the hosts plugin
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

        # Static DNS entries
        hosts {
            192.168.1.200 legacy-database.corp.local
            192.168.1.201 legacy-api.corp.local
            10.0.0.50    external-service.example.com
            fallthrough
        }

        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
            ttl 30
        }
        prometheus :9153
        forward . 8.8.8.8 8.8.4.4
        cache 30
        loop
        reload
        loadbalance
    }
```

## Enabling DNS Query Logging

For troubleshooting DNS resolution issues, enable query logging:

```yaml
# coredns-logging.yaml
# Enable DNS query logging for debugging
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        log  # Add this line to enable query logging
        errors
        health {
            lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
        }
        prometheus :9153
        forward . 8.8.8.8 8.8.4.4
        cache 30
        loop
        reload
        loadbalance
    }
```

After enabling logging, view the queries:

```bash
# View DNS query logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50

# Follow the logs in real time
kubectl logs -n kube-system -l k8s-app=kube-dns -f
```

Warning: DNS query logging generates a very high volume of log data in production clusters. Only enable it temporarily for debugging.

## Tuning Cache Settings

The cache plugin controls how long DNS responses are cached. Tuning this affects both performance and how quickly DNS changes propagate:

```text
cache {
    success 9984 30   # Cache successful responses for 30 seconds, max 9984 entries
    denial 9984 5     # Cache NXDOMAIN for 5 seconds
    prefetch 10 1m 10%  # Prefetch popular entries
}
```

For a full configuration:

```yaml
# coredns-cache-tuning.yaml
# Tuned CoreDNS caching configuration
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
        }
        prometheus :9153
        forward . 8.8.8.8 8.8.4.4
        cache {
            success 9984 60
            denial 9984 10
            prefetch 10 1m 10%
        }
        loop
        reload
        loadbalance
    }
```

## Scaling CoreDNS

For large clusters, scale CoreDNS to handle the query load:

```bash
# Scale CoreDNS replicas manually
kubectl scale deployment coredns -n kube-system --replicas=3
```

Or use the DNS autoscaler:

```yaml
# dns-autoscaler.yaml
# Automatically scale CoreDNS based on cluster size
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dns-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: dns-autoscaler
  template:
    metadata:
      labels:
        k8s-app: dns-autoscaler
    spec:
      containers:
        - name: autoscaler
          image: registry.k8s.io/cpa/cluster-proportional-autoscaler:v1.8.8
          command:
            - /cluster-proportional-autoscaler
            - --namespace=kube-system
            - --configmap=dns-autoscaler
            - --target=deployment/coredns
            - --default-params={"linear":{"coresPerReplica":256,"nodesPerReplica":16,"min":2,"max":10,"preventSinglePointFailure":true}}
            - --logtostderr=true
            - --v=2
      serviceAccountName: dns-autoscaler
```

## Monitoring CoreDNS

CoreDNS exposes Prometheus metrics on port 9153. Monitor these to track DNS health:

```yaml
# coredns-servicemonitor.yaml
# Prometheus monitoring for CoreDNS
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: coredns
  namespace: monitoring
  labels:
    release: prometheus
spec:
  endpoints:
    - port: metrics
      interval: 15s
  namespaceSelector:
    matchNames:
      - kube-system
  selector:
    matchLabels:
      k8s-app: kube-dns
```

Key metrics to track:

```text
# CoreDNS metrics to monitor
coredns_dns_requests_total        # Total query count
coredns_dns_responses_total       # Response count by rcode
coredns_dns_request_duration_seconds  # Query latency
coredns_cache_hits_total          # Cache hit rate
coredns_cache_misses_total        # Cache miss rate
coredns_panics_total              # Should always be 0
coredns_forward_responses_total   # Upstream response count
```

## Troubleshooting DNS Issues

When pods cannot resolve DNS names:

```bash
# Test DNS resolution from a debug pod
kubectl run dns-test --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default

# Check if CoreDNS pods are healthy
kubectl get pods -n kube-system -l k8s-app=kube-dns

# View CoreDNS logs for errors
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=30

# Check the DNS service endpoint
kubectl get endpoints -n kube-system kube-dns
```

CoreDNS on Talos Linux is flexible enough to handle everything from simple clusters with default settings to complex enterprise environments with custom domain forwarding, static entries, and fine-tuned caching. The key is understanding that the Corefile is managed through a Kubernetes ConfigMap that you can modify at any time, and that changes take effect after CoreDNS detects the configuration reload.
