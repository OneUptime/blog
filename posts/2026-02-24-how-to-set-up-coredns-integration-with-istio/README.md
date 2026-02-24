# How to Set Up CoreDNS Integration with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CoreDNS, DNS, Kubernetes, Service Mesh

Description: How to configure CoreDNS to work seamlessly with Istio including custom forwarding rules, stub domains, and multicluster DNS setups.

---

CoreDNS is the default DNS server in Kubernetes, and it works with Istio out of the box for most basic scenarios. But as your mesh grows and you start dealing with multicluster setups, custom domains, or external service integration, you'll probably need to tweak CoreDNS to play nicely with Istio's features. This guide covers the common integration patterns and configurations.

## How CoreDNS and Istio Interact

In a standard setup, the relationship between CoreDNS and Istio is simple. CoreDNS handles all DNS resolution, and Istio sidecars intercept the actual network connections after DNS has resolved. They don't directly talk to each other.

When you enable Istio's DNS proxy feature, things change. The sidecar intercepts DNS queries before they reach CoreDNS. The sidecar answers queries it knows about (from the Istio service registry) and forwards the rest to CoreDNS.

So there are really two integration modes:
1. **Without DNS proxy**: CoreDNS handles everything, Istio just routes the connections
2. **With DNS proxy**: Istio handles known names, CoreDNS handles the rest

## Default CoreDNS Configuration

Check your current CoreDNS config:

```bash
kubectl get configmap coredns -n kube-system -o yaml
```

The default Corefile typically looks like:

```
.:53 {
    errors
    health {
       lazystart
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

## Adding Custom DNS Zones for Istio

If you have services that use custom DNS zones (not `.cluster.local`), you need to tell CoreDNS how to resolve them. This comes up in multicluster setups where clusters share a common DNS zone:

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
           lazystart
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
    global:53 {
        errors
        cache 30
        forward . 10.0.0.10 10.1.0.10
    }
```

This adds a `global` zone that forwards queries to DNS servers in other clusters. Services can then be resolved as `my-service.my-namespace.global`.

## Stub Domains for External Integration

If you need CoreDNS to resolve names from an external DNS server (like a corporate DNS for on-prem services), add a stub domain:

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
           lazystart
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
    corp.internal:53 {
        errors
        cache 30
        forward . 10.0.0.53
    }
```

Now queries for `*.corp.internal` will be forwarded to the corporate DNS server at `10.0.0.53`. Combined with Istio ServiceEntry, you can get full mesh observability for these services:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: corp-database
  namespace: default
spec:
  hosts:
  - db.corp.internal
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

## Multicluster DNS with CoreDNS

For Istio multicluster setups, you have several DNS options. The simplest is to use the Istio DNS proxy with auto-allocation (which doesn't require any CoreDNS changes). But if you can't or don't want to use the DNS proxy, you need CoreDNS to resolve services across clusters.

### Option 1: CoreDNS Forwarding to Remote kube-dns

If clusters can reach each other's DNS:

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
        health
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
        }
        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        reload
        loadbalance
    }
    cluster2.local:53 {
        errors
        cache 30
        forward . 10.100.0.10
    }
```

### Option 2: CoreDNS with External Plugin

For more advanced setups, you can use the CoreDNS external plugin to serve DNS records from an external source:

```
.:53 {
    errors
    health
    kubernetes cluster.local in-addr.arpa ip6.arpa
    external ext.cluster.local
    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    reload
}
```

## Optimizing CoreDNS for Istio Workloads

Large Istio meshes can put significant load on CoreDNS. Here are some optimization tips:

### Increase CoreDNS Replicas

```bash
kubectl scale deployment coredns -n kube-system --replicas=3
```

Or better, use the cluster-proportional-autoscaler to scale CoreDNS based on cluster size.

### Tune Cache Settings

Increase the cache TTL for stable services:

```
cache 60 {
    success 9984
    denial 9984
}
```

### Reduce ndots

The default `ndots: 5` in Kubernetes causes up to 4 extra DNS queries for every external hostname. If your applications mostly call external services, reducing this helps:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      dnsConfig:
        options:
        - name: ndots
          value: "2"
      containers:
      - name: my-app
        image: my-app:latest
```

### Enable Autopath Plugin

The autopath plugin in CoreDNS can optimize the search domain expansion:

```
.:53 {
    errors
    health
    autopath @kubernetes
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods verified
       fallthrough in-addr.arpa ip6.arpa
    }
    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    reload
    loadbalance
}
```

Autopath detects the source pod's namespace and tries the most likely search domain first, reducing the number of DNS queries.

## Monitoring CoreDNS with Istio

CoreDNS exposes Prometheus metrics on port 9153. You can scrape these with the same Prometheus that monitors your Istio mesh:

```bash
kubectl port-forward -n kube-system svc/kube-dns 9153:9153
curl http://localhost:9153/metrics
```

Key metrics to watch:
- `coredns_dns_requests_total` - total DNS queries
- `coredns_dns_responses_total` - responses by rcode (NOERROR, NXDOMAIN, SERVFAIL)
- `coredns_forward_requests_total` - queries forwarded to upstream
- `coredns_cache_hits_total` - cache effectiveness

## Debugging CoreDNS Issues

Enable CoreDNS logging to see all queries:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        log
        errors
        health
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
        }
        forward . /etc/resolv.conf
        cache 30
        reload
        loadbalance
    }
```

Then check the logs:

```bash
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=100
```

After adding the `log` directive, you'll see every DNS query. This is very noisy so only enable it temporarily for debugging.

After making changes, restart CoreDNS:

```bash
kubectl rollout restart deployment coredns -n kube-system
```

CoreDNS and Istio work well together, and for most simple setups you don't need to change anything. The configurations in this guide are for when you outgrow the defaults and need more control over DNS resolution in your mesh.
