# How to Build Custom CoreDNS Configurations for Private DNS Zones in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CoreDNS, Kubernetes, DNS, Private Zones, Configuration

Description: Learn how to design and implement custom CoreDNS configurations for private DNS zones in Kubernetes. Complete guide covering zone management, service integration, and best practices.

---

Private DNS zones allow you to create isolated DNS namespaces within your Kubernetes cluster, providing internal service discovery and custom domain resolution without exposing these names to external DNS systems. Custom CoreDNS configurations enable you to build sophisticated DNS architectures that support multi-tenant environments, development/staging/production separation, and integration with external private networks. This guide shows you how to design and implement private zone configurations that meet complex organizational requirements.

## Understanding Private DNS Zone Architecture

Private DNS zones exist separately from public DNS infrastructure. In Kubernetes, you typically use private zones for internal service names, development environments, or integration with corporate networks. CoreDNS serves these zones directly without forwarding queries to external resolvers, ensuring that private names remain confidential and queries resolve quickly.

A well-designed private zone architecture separates concerns by using distinct zones for different purposes, such as `internal.company.com` for infrastructure services, `dev.company.com` for development resources, and `prod.company.com` for production applications.

## Creating a Basic Private Zone

Start by defining a simple private zone for internal services:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-private-zones
  namespace: kube-system
data:
  internal.zone: |
    $ORIGIN internal.company.com.
    $TTL 3600

    @   IN  SOA ns1.internal.company.com. admin.company.com. (
                2024020901  ; Serial
                3600        ; Refresh
                1800        ; Retry
                604800      ; Expire
                86400 )     ; Minimum TTL

    @   IN  NS  ns1.internal.company.com.
    ns1 IN  A   10.96.0.10

    ; Infrastructure services
    vault           IN  A   10.0.1.10
    consul          IN  A   10.0.1.11
    prometheus      IN  A   10.0.1.12
    grafana         IN  A   10.0.1.13

    ; Database endpoints
    postgres-master IN  A   10.0.2.10
    postgres-replica IN A   10.0.2.11
    redis-master    IN  A   10.0.2.20
    redis-replica   IN  A   10.0.2.21

    ; Service discovery records
    _vault._tcp     IN  SRV 10 60 8200 vault.internal.company.com.
    _consul._tcp    IN  SRV 10 60 8500 consul.internal.company.com.
```

This zone file defines the `internal.company.com` private zone with infrastructure service records.

## Configuring CoreDNS to Serve Private Zones

Update your CoreDNS Deployment to mount the private zone ConfigMap:

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
        - name: private-zones
          mountPath: /etc/coredns/zones/private
          readOnly: true
      volumes:
      - name: config-volume
        configMap:
          name: coredns
      - name: private-zones
        configMap:
          name: coredns-private-zones
```

Configure the Corefile to serve the private zone:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    # Private internal zone
    internal.company.com:53 {
        errors
        log {
            class denial
            class error
        }
        file /etc/coredns/zones/private/internal.zone
        prometheus :9153
    }

    # Default cluster DNS
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
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
```

This configuration creates a separate server block for the private zone, isolating it from cluster DNS.

## Implementing Multi-Environment Private Zones

Create separate zones for development, staging, and production environments:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-environment-zones
  namespace: kube-system
data:
  dev.zone: |
    $ORIGIN dev.company.com.
    $TTL 300

    @   IN  SOA ns.dev.company.com. admin.company.com. (
                2024020901
                3600
                1800
                604800
                300 )

    @   IN  NS  ns.dev.company.com.

    api         IN  A   10.100.1.10
    database    IN  A   10.100.1.20
    cache       IN  A   10.100.1.30

  staging.zone: |
    $ORIGIN staging.company.com.
    $TTL 600

    @   IN  SOA ns.staging.company.com. admin.company.com. (
                2024020901
                3600
                1800
                604800
                600 )

    @   IN  NS  ns.staging.company.com.

    api         IN  A   10.101.1.10
    database    IN  A   10.101.1.20
    cache       IN  A   10.101.1.30

  prod.zone: |
    $ORIGIN prod.company.com.
    $TTL 3600

    @   IN  SOA ns.prod.company.com. admin.company.com. (
                2024020901
                3600
                1800
                604800
                3600 )

    @   IN  NS  ns.prod.company.com.

    api         IN  A   10.102.1.10
    database    IN  A   10.102.1.20
    cache       IN  A   10.102.1.30
```

Configure CoreDNS to serve all environment zones:

```yaml
dev.company.com:53 {
    errors
    log
    file /etc/coredns/zones/environments/dev.zone
    prometheus :9153
}

staging.company.com:53 {
    errors
    log
    file /etc/coredns/zones/environments/staging.zone
    prometheus :9153
}

prod.company.com:53 {
    errors
    log
    file /etc/coredns/zones/environments/prod.zone
    prometheus :9153
}
```

Applications reference services using environment-specific domains, allowing seamless promotion between environments.

## Integrating Kubernetes Services with Private Zones

Combine private zone records with Kubernetes service discovery:

```yaml
internal.company.com:53 {
    errors
    log
    # Serve static records from zone file
    file /etc/coredns/zones/private/internal.zone
    # Fall through to Kubernetes for dynamic services
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }
    prometheus :9153
}
```

This configuration serves static records from the zone file while allowing Kubernetes services to be queried using the same domain.

## Creating Wildcard Records for Dynamic Services

Use wildcard records for applications that create dynamic subdomains:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-wildcard-zone
  namespace: kube-system
data:
  apps.zone: |
    $ORIGIN apps.company.com.
    $TTL 300

    @   IN  SOA ns.apps.company.com. admin.company.com. (
                2024020901
                3600
                1800
                604800
                300 )

    @       IN  NS  ns.apps.company.com.

    ; Wildcard for all application subdomains
    *.apps  IN  A   10.200.1.100

    ; Specific overrides
    admin.apps  IN  A   10.200.1.101
```

With this configuration, any query for `<anything>.apps.company.com` resolves to 10.200.1.100, except for `admin.apps.company.com` which has a specific override.

## Implementing Conditional Forwarding for Private Zones

Forward specific private zones to external DNS servers:

```yaml
vpn.company.com:53 {
    errors
    log
    # Forward to VPN DNS servers
    forward . 10.50.0.1 10.50.0.2 {
        prefer_udp
    }
    cache 300
    prometheus :9153
}

internal.company.com:53 {
    errors
    log
    file /etc/coredns/zones/private/internal.zone
    prometheus :9153
}
```

This setup forwards queries for `vpn.company.com` to external servers while serving `internal.company.com` locally.

## Building Tenant-Isolated Private Zones

Create isolated DNS namespaces for multi-tenant environments:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-tenant-zones
  namespace: kube-system
data:
  tenant-a.zone: |
    $ORIGIN tenant-a.internal.
    $TTL 300

    @   IN  SOA ns.tenant-a.internal. admin.tenant-a.internal. (
                2024020901
                3600
                1800
                604800
                300 )

    @       IN  NS  ns.tenant-a.internal.

    api     IN  A   10.10.1.10
    db      IN  A   10.10.1.20

  tenant-b.zone: |
    $ORIGIN tenant-b.internal.
    $TTL 300

    @   IN  SOA ns.tenant-b.internal. admin.tenant-b.internal. (
                2024020901
                3600
                1800
                604800
                300 )

    @       IN  NS  ns.tenant-b.internal.

    api     IN  A   10.20.1.10
    db      IN  A   10.20.1.20
```

Each tenant gets an isolated zone with its own namespace, preventing cross-tenant DNS queries.

## Implementing Split-Horizon DNS

Serve different records for the same domain based on the query source:

```yaml
# Internal view
company.com:53 {
    errors
    log
    # Serve internal records
    file /etc/coredns/zones/company-internal.zone
    prometheus :9153
}

# External view (forward to public DNS)
.:53 {
    errors
    health
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }
    # Forward external queries
    forward . 8.8.8.8 8.8.4.4
    cache 300
    prometheus :9153
}
```

Internal clients resolve `company.com` records to private IPs, while external queries forward to public DNS.

## Automating Zone Updates with External DNS

Integrate with external-dns to automatically populate private zones:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: default
  annotations:
    external-dns.alpha.kubernetes.io/hostname: myapp.internal.company.com
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
```

Configure external-dns to update your private zone ConfigMap when services change.

## Testing Private Zone Configuration

Verify private zone resolution from within the cluster:

```bash
# Create test pod
kubectl run dns-test --image=busybox --restart=Never -- sleep 3600

# Test private zone record
kubectl exec dns-test -- nslookup vault.internal.company.com

# Test wildcard record
kubectl exec dns-test -- nslookup myapp.apps.company.com

# Test SRV record
kubectl exec dns-test -- nslookup -type=srv _vault._tcp.internal.company.com

# Verify isolation (should fail)
kubectl exec dns-test -- nslookup vault.tenant-a.internal
```

Successful tests confirm your private zone configuration works correctly.

## Monitoring Private Zone Performance

Track private zone query patterns and performance:

```promql
# Queries per second by zone
sum(rate(coredns_dns_requests_total[5m])) by (zone)

# Response time by zone
histogram_quantile(0.99,
  rate(coredns_dns_request_duration_seconds_bucket[5m])
) by (zone)

# Cache hit rate for private zones
sum(rate(coredns_cache_hits_total{type="success"}[5m])) by (zone) /
sum(rate(coredns_dns_requests_total[5m])) by (zone)
```

These metrics help you optimize cache settings and identify heavily-queried zones.

## Security Considerations for Private Zones

Protect private zone data with appropriate RBAC:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: coredns-private-zones
  namespace: kube-system
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["coredns-private-zones"]
  verbs: ["get", "update", "patch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: coredns-private-zones
  namespace: kube-system
subjects:
- kind: ServiceAccount
  name: dns-admin
  namespace: kube-system
roleRef:
  kind: Role
  name: coredns-private-zones
  apiGroup: rbac.authorization.k8s.io
```

This RBAC configuration restricts private zone modifications to authorized service accounts.

## Conclusion

Custom CoreDNS configurations for private DNS zones provide flexible, secure internal service discovery in Kubernetes environments. By creating separate zones for different environments, tenants, or service categories, you build a maintainable DNS architecture that scales with your organization. Combine static zone files with dynamic Kubernetes service discovery, implement split-horizon DNS for security, and monitor zone performance to ensure reliable name resolution. Proper private zone design simplifies application configuration while maintaining the isolation and security required for production environments.
