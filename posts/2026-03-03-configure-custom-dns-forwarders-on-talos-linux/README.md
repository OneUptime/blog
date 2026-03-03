# How to Configure Custom DNS Forwarders on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DNS, CoreDNS, Forwarding, Kubernetes, Networking

Description: Configure custom DNS forwarders on Talos Linux to route DNS queries to specific upstream servers based on domain names and network requirements.

---

DNS forwarding is the process of sending DNS queries to a specific upstream server rather than resolving them locally. In a Talos Linux cluster, you often need different DNS servers for different domains. Internal corporate domains might go to your company's DNS servers, cloud-specific domains to your cloud provider's resolver, and everything else to a public DNS service like Google or Cloudflare. Configuring this properly ensures that name resolution works correctly across all your environments.

## How DNS Forwarding Works in Talos

Talos Linux has two layers of DNS configuration. The first is at the node level, configured through the Talos machine configuration, which controls how the Talos OS itself resolves names. The second is at the cluster level through CoreDNS, which controls how pods and services resolve names. Both can be configured with custom forwarders.

## Node-Level DNS Configuration

The Talos machine configuration controls which DNS servers the node itself uses. This affects system-level resolution and also serves as the default upstream for CoreDNS (via `/etc/resolv.conf`).

```yaml
# talos-dns-patch.yaml
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 1.1.1.1
      - 8.8.4.4
```

Apply this to your nodes:

```bash
# Apply to all control plane nodes
talosctl patch machineconfig --nodes 10.0.0.10,10.0.0.11,10.0.0.12 \
    --patch-file talos-dns-patch.yaml

# Apply to all worker nodes
talosctl patch machineconfig --nodes 10.0.0.20,10.0.0.21,10.0.0.22 \
    --patch-file talos-dns-patch.yaml
```

Verify the change took effect:

```bash
# Check the node's DNS configuration
talosctl read /etc/resolv.conf --nodes 10.0.0.10
```

## CoreDNS Default Forwarding

The default CoreDNS configuration forwards all non-cluster queries to the node's DNS servers (from `/etc/resolv.conf`). You can change this to use specific upstream servers instead:

```bash
# Get the current CoreDNS ConfigMap
kubectl get configmap coredns -n kube-system -o yaml > coredns-backup.yaml
```

Edit the ConfigMap to use explicit forwarders:

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
        forward . 8.8.8.8 1.1.1.1 {
           max_concurrent 1000
           policy round_robin
           health_check 5s
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

Apply the change:

```bash
kubectl apply -f coredns-config.yaml
```

## Domain-Specific Forwarding

This is where things get interesting. You can route queries for specific domains to different DNS servers. This is essential in enterprise environments.

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
        forward . 8.8.8.8 1.1.1.1 {
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }

    # Corporate internal domains
    corp.example.com:53 {
        errors
        cache 60
        forward . 10.1.0.53 10.1.0.54 {
            policy sequential
            health_check 10s
        }
    }

    # Cloud provider internal DNS
    internal.cloud.example.com:53 {
        errors
        cache 30
        forward . 169.254.169.253 {
            max_concurrent 500
        }
    }

    # Partner network DNS
    partner.net:53 {
        errors
        cache 120
        forward . 172.16.0.53 {
            health_check 30s
        }
    }
```

Each domain gets its own server block with its own forwarding rules, cache settings, and health check intervals.

## Forwarding Policies

CoreDNS supports several forwarding policies that control how it picks among multiple upstream servers:

```
# Round robin - distributes queries evenly
forward . 10.0.0.53 10.0.0.54 {
    policy round_robin
}

# Random - picks a random server for each query
forward . 10.0.0.53 10.0.0.54 {
    policy random
}

# Sequential - tries servers in order, fails over to next
forward . 10.0.0.53 10.0.0.54 {
    policy sequential
}
```

For internal DNS servers, `sequential` is often the best choice because it keeps traffic on the primary server and only fails over when it is down. For public DNS, `round_robin` distributes the load.

## Setting Up DNS-over-TLS Forwarding

For better privacy, you can forward queries using DNS-over-TLS (DoT):

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
    forward . tls://1.1.1.1 tls://1.0.0.1 {
       tls_servername cloudflare-dns.com
       health_check 5s
    }
    cache 30
    loop
    reload
    loadbalance
}
```

This encrypts DNS queries between your cluster and the upstream resolver. Note that this adds a small amount of latency due to the TLS handshake, though connection reuse minimizes this for subsequent queries.

## Conditional Forwarding Based on Source

Sometimes you want different pods to use different DNS servers. While CoreDNS does not natively support source-based routing, you can achieve this through separate CoreDNS instances per namespace using a sidecar pattern:

```yaml
# Pod with a DNS sidecar for custom resolution
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  namespace: secure-zone
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers:
      - 127.0.0.1
    searches:
      - secure-zone.svc.cluster.local
      - svc.cluster.local
      - cluster.local
  containers:
  - name: app
    image: my-app:latest
  - name: dns-proxy
    image: coredns/coredns:1.11.1
    args: ["-conf", "/etc/coredns/Corefile"]
    ports:
    - containerPort: 53
      protocol: UDP
    - containerPort: 53
      protocol: TCP
    volumeMounts:
    - name: coredns-config
      mountPath: /etc/coredns
  volumes:
  - name: coredns-config
    configMap:
      name: custom-dns-config
```

## Testing DNS Forwarding

After configuring forwarders, test that queries are being routed correctly:

```bash
#!/bin/bash
# test-dns-forwarding.sh
# Tests DNS resolution for different domains

echo "Testing cluster DNS..."
kubectl run dns-test --rm -it --restart=Never --image=busybox:1.36 -- sh -c '
    echo "=== Cluster Service ==="
    nslookup kubernetes.default.svc.cluster.local

    echo ""
    echo "=== External Domain ==="
    nslookup google.com

    echo ""
    echo "=== Corporate Domain ==="
    nslookup intranet.corp.example.com

    echo ""
    echo "=== Cloud Internal ==="
    nslookup myservice.internal.cloud.example.com
'
```

For more detailed testing, use `dig` which gives you response times and server information:

```bash
kubectl run dns-debug --rm -it --restart=Never --image=alpine -- sh -c '
    apk add --no-cache bind-tools > /dev/null 2>&1

    echo "=== External Query ==="
    dig google.com +short +stats | tail -3

    echo ""
    echo "=== Corporate Query ==="
    dig intranet.corp.example.com +short +stats | tail -3

    echo ""
    echo "=== Query Trace ==="
    dig +trace example.com
'
```

## Monitoring DNS Forwarding

CoreDNS exposes Prometheus metrics that help you monitor forwarding health:

```bash
# Check CoreDNS metrics
kubectl port-forward -n kube-system svc/kube-dns 9153:9153 &

# Query forwarding metrics
curl -s http://localhost:9153/metrics | grep coredns_forward

# Key metrics to watch:
# coredns_forward_requests_total - total forwarded queries
# coredns_forward_responses_total - responses received from upstreams
# coredns_forward_request_duration_seconds - latency to upstreams
# coredns_forward_healthcheck_failures_total - upstream health check failures
```

Set up alerts for forwarding issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: coredns-forwarding-alerts
  namespace: monitoring
spec:
  groups:
  - name: coredns-forwarding
    rules:
    - alert: DNSForwardingLatencyHigh
      expr: |
        histogram_quantile(0.99, rate(coredns_forward_request_duration_seconds_bucket[5m])) > 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "DNS forwarding latency is above 1 second at p99"
    - alert: DNSForwardingErrors
      expr: |
        rate(coredns_forward_responses_total{rcode="SERVFAIL"}[5m]) > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "DNS forwarding is returning SERVFAIL responses"
```

## Handling Failover

Configure health checks so CoreDNS automatically fails over to backup servers when a primary goes down:

```
corp.example.com:53 {
    errors
    cache 30
    forward . 10.1.0.53 10.1.0.54 10.1.0.55 {
        policy sequential
        health_check 5s
        max_fails 3
        expire 30s
    }
}
```

With these settings, CoreDNS will check each upstream every 5 seconds. After 3 consecutive failures, it marks the server as down and skips it for 30 seconds before trying again.

## Wrapping Up

Custom DNS forwarders on Talos Linux give you fine-grained control over where DNS queries go. The combination of Talos machine configuration for node-level DNS and CoreDNS server blocks for domain-specific forwarding covers most enterprise requirements. Start with the basics, test thoroughly, and add monitoring so you catch forwarding issues before your users do.
