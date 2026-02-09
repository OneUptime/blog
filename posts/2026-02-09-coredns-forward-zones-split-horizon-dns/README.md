# How to Configure CoreDNS Forward Zones for Split-Horizon DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, DNS, Split-Horizon, Networking

Description: Set up split-horizon DNS in Kubernetes using CoreDNS forward zones to route internal and external queries to different DNS servers based on domain names.

---

Split-horizon DNS lets you serve different DNS responses based on where the query originates. In Kubernetes, this pattern becomes essential when you need internal services to resolve to cluster IPs while external clients get public IPs, or when you want to route specific domains to internal DNS servers while forwarding everything else upstream.

## Understanding Split-Horizon DNS

Traditional DNS gives the same answer to everyone. Split-horizon DNS gives different answers depending on the client. Common use cases in Kubernetes include:

- Internal users get RFC1918 addresses, external users get public IPs
- Corporate domains resolve through internal DNS, everything else goes to public DNS
- Development clusters resolve staging domains differently than production clusters
- Hybrid cloud setups where some services live on-premises

CoreDNS makes this possible through its forward plugin combined with zone-specific configuration blocks.

## Basic Forward Zone Configuration

Start by examining your current CoreDNS setup:

```bash
kubectl get configmap coredns -n kube-system -o yaml
```

A default configuration handles all queries the same way. Let's change that. Here's a split-horizon setup that routes corporate domains to internal DNS while everything else goes to public DNS:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    # Kubernetes cluster domain
    cluster.local:53 {
        errors
        health
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
            ttl 30
        }
        prometheus :9153
        cache 30
        loop
        reload
        loadbalance
    }

    # Internal corporate domain
    company.internal:53 {
        errors
        cache 30
        forward . 10.0.1.53 10.0.2.53 {
            max_concurrent 1000
        }
        reload
    }

    # AWS private hosted zone
    aws.internal:53 {
        errors
        cache 60
        forward . 10.100.0.2 {
            max_concurrent 1000
            prefer_udp
        }
        reload
    }

    # Everything else goes to public DNS
    .:53 {
        errors
        health
        ready
        prometheus :9153
        forward . 8.8.8.8 8.8.4.4 1.1.1.1 {
            max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

Apply this configuration:

```bash
kubectl apply -f coredns-configmap.yaml
```

CoreDNS automatically reloads within a few seconds.

## Conditional Forwarding Based on Query Type

You can forward queries based on more than just domain names. Forward specific record types to different servers:

```yaml
# Advanced forwarding rules
company.internal:53 {
    errors
    cache 30

    # Forward A and AAAA records to internal DNS
    forward . 10.0.1.53 10.0.2.53 {
        max_concurrent 1000
        policy sequential  # Try servers in order
    }

    reload
}

# External view of company.internal goes to DMZ DNS
.:53 {
    errors

    # Use file plugin for overrides
    file /etc/coredns/company-external.db company.internal

    forward . 8.8.8.8 8.8.4.4
    cache 30
    reload
}
```

This setup serves internal company.internal queries from your corporate DNS, but you can override specific records using a zone file for external clients.

## Creating Custom Zone Files

For complete control over split-horizon responses, use zone files. First, create a ConfigMap with your zone data:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom-zones
  namespace: kube-system
data:
  company-external.db: |
    $ORIGIN company.internal.
    @   3600 IN SOA ns1.company.internal. admin.company.internal. (
                2024020901 ; serial
                7200       ; refresh
                3600       ; retry
                1209600    ; expire
                3600       ; minimum
                )

    @           IN NS  ns1.company.internal.
    ns1         IN A   203.0.113.10

    ; Public IPs for external access
    www         IN A   203.0.113.100
    api         IN A   203.0.113.101
    mail        IN A   203.0.113.102

    ; Public CNAME records
    app         IN CNAME www.company.internal.
```

Mount this ConfigMap in your CoreDNS deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coredns
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: coredns
        image: coredns/coredns:1.11.1
        volumeMounts:
        - name: config-volume
          mountPath: /etc/coredns
          readOnly: true
        - name: custom-zones
          mountPath: /etc/coredns/zones
          readOnly: true
      volumes:
      - name: config-volume
        configMap:
          name: coredns
      - name: custom-zones
        configMap:
          name: coredns-custom-zones
```

Update the Corefile to use the zone file:

```yaml
company.internal:53 {
    errors
    file /etc/coredns/zones/company-external.db
    cache 30
    reload
}
```

## Split-Horizon for Hybrid Cloud

In hybrid cloud scenarios, you often need queries to resolve differently based on whether they originate from Kubernetes or from on-premises systems. Here's a pattern that works well:

```yaml
# Corefile for hybrid cloud
.:53 {
    errors
    health
    ready

    # Kubernetes services
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }

    # On-premises datacenter domain
    datacenter.corp:53 {
        errors
        cache 60
        forward . 192.168.1.53 192.168.2.53 {
            max_concurrent 500
            expire 10s
            policy round_robin
        }
    }

    # Cloud provider private DNS
    cloud.internal:53 {
        errors
        cache 60
        forward . 169.254.169.253 {
            max_concurrent 500
            prefer_udp
        }
    }

    # Rewrite rules for service discovery
    rewrite name regex (.+)\.datacenter\.corp {1}.dc.svc.cluster.local

    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
    loadbalance
}
```

The rewrite plugin transforms datacenter queries into cluster-local service names, creating a seamless hybrid experience.

## Forward with Health Checks

Make your forwarding resilient by enabling health checks. CoreDNS can automatically detect when upstream servers fail:

```yaml
company.internal:53 {
    errors
    cache 30

    forward . 10.0.1.53 10.0.2.53 10.0.3.53 {
        max_concurrent 1000

        # Health check configuration
        health_check 5s

        # Force TCP for large responses
        force_tcp

        # Retry failed queries
        max_fails 3
        expire 10s

        # Load balancing policy
        policy round_robin
    }

    reload
}
```

The health_check directive makes CoreDNS probe upstream servers every 5 seconds. If a server fails 3 times, CoreDNS marks it unhealthy and stops sending queries until it recovers.

## Testing Split-Horizon Configuration

After configuring split-horizon DNS, test it thoroughly:

```bash
# Create a test pod
kubectl run dns-test --image=nicolaka/netshoot -it --rm -- bash

# Inside the pod, test different domains
nslookup www.company.internal
nslookup api.aws.internal
nslookup google.com

# Check which server answered
dig @10.96.0.10 www.company.internal +short
dig @10.96.0.10 api.aws.internal +short
```

Verify that each domain resolves through the correct path:

```bash
# Enable debug logging temporarily
kubectl edit configmap coredns -n kube-system
# Add 'log' plugin to each zone block

# Watch the logs
kubectl logs -n kube-system -l k8s-app=kube-dns -f | grep -E 'company.internal|aws.internal'
```

You should see log entries showing which upstream server handled each query.

## Dynamic Updates with External DNS

Combine split-horizon DNS with external-dns for automatic record management:

```yaml
# external-dns deployment for internal zones
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-internal
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: external-dns-internal
  template:
    metadata:
      labels:
        app: external-dns-internal
    spec:
      serviceAccountName: external-dns
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=service
        - --source=ingress
        - --domain-filter=company.internal
        - --provider=rfc2136
        - --rfc2136-host=10.0.1.53
        - --rfc2136-port=53
        - --rfc2136-zone=company.internal
        - --rfc2136-tsig-secret=your-secret-key
        - --rfc2136-tsig-secret-alg=hmac-sha256
        - --rfc2136-tsig-keyname=externaldns-key
        - --rfc2136-tsig-axfr
```

Now when you create services with annotations, external-dns updates your internal DNS automatically:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: production
  annotations:
    external-dns.alpha.kubernetes.io/hostname: api.company.internal
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 8443
  selector:
    app: api-server
```

## Monitoring Forward Zones

Track the performance of your forward zones with Prometheus metrics:

```bash
# Port-forward to metrics endpoint
kubectl port-forward -n kube-system svc/kube-dns 9153:9153

# Query forward-specific metrics
curl -s http://localhost:9153/metrics | grep coredns_forward
```

Key metrics to monitor:

- `coredns_forward_requests_total`: Total forwarded requests per upstream
- `coredns_forward_responses_total`: Responses by rcode
- `coredns_forward_healthcheck_failures_total`: Failed health checks
- `coredns_forward_max_concurrent_rejects_total`: Rejected due to max_concurrent limit

Set up alerts for health check failures:

```yaml
# Prometheus alert rule
groups:
- name: coredns
  rules:
  - alert: CoreDNSForwardHealthCheckFailing
    expr: rate(coredns_forward_healthcheck_failures_total[5m]) > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "CoreDNS forward health check failing"
      description: "Upstream DNS server {{ $labels.to }} is failing health checks"
```

## Best Practices

When implementing split-horizon DNS with CoreDNS:

- Order zones from most specific to least specific in your Corefile
- Use multiple upstream servers for redundancy
- Enable health checks for all forward zones
- Cache aggressively for internal zones to reduce load
- Monitor upstream DNS server performance
- Document which domains use which upstream servers
- Test failover scenarios regularly
- Use consistent TTL values that match your upstream zones

Split-horizon DNS gives you fine-grained control over name resolution in Kubernetes. Combined with CoreDNS's flexible forwarding capabilities, you can build sophisticated DNS architectures that seamlessly integrate cluster-internal services with external infrastructure.
