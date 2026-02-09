# How to Use CoreDNS File Plugin to Serve Custom Zone Files in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CoreDNS, Kubernetes, DNS, Zone Files, Configuration

Description: Learn how to configure the CoreDNS file plugin to serve custom DNS zone files in Kubernetes clusters. This guide covers zone file creation, ConfigMap integration, and best practices.

---

The CoreDNS file plugin allows you to serve custom DNS records from zone files directly within your Kubernetes cluster. This capability is essential when you need to provide custom DNS entries for internal services, override external DNS records, or create split-horizon DNS configurations. Unlike the hosts plugin, which is limited to simple A and AAAA records, the file plugin supports the full range of DNS record types using standard zone file format.

## Understanding the File Plugin

The file plugin reads DNS zone data from RFC 1035-style zone files. These zone files can contain any valid DNS record type, including A, AAAA, CNAME, MX, TXT, SRV, and others. The plugin loads the zone file into memory and serves queries directly from this in-memory representation, providing fast response times without external dependencies.

In Kubernetes environments, you typically store zone files in ConfigMaps, which CoreDNS mounts as volumes. This approach allows you to manage DNS records using standard Kubernetes tools and workflows.

## Creating Your First Zone File

Zone files follow a specific format with SOA (Start of Authority) records, NS (Name Server) records, and resource records. Here's a basic example:

```text
$ORIGIN example.internal.
@   3600 IN SOA ns1.example.internal. admin.example.internal. (
                2024020901  ; Serial
                3600        ; Refresh
                1800        ; Retry
                604800      ; Expire
                86400 )     ; Minimum TTL

; Name server records
@   3600 IN NS ns1.example.internal.
@   3600 IN NS ns2.example.internal.

; A records for services
api             IN A     10.0.1.10
database        IN A     10.0.1.20
cache           IN A     10.0.1.30

; CNAME records
www             IN CNAME api
db              IN CNAME database

; SRV records for service discovery
_http._tcp      IN SRV 10 60 8080 api.example.internal.
_postgres._tcp  IN SRV 10 60 5432 database.example.internal.

; TXT records for configuration
_config         IN TXT "environment=production"
_version        IN TXT "v1.2.3"
```

This zone file defines the `example.internal` domain with various record types suitable for internal service discovery and configuration.

## Storing Zone Files in ConfigMaps

To make zone files available to CoreDNS, create a ConfigMap containing your zone data:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom-zones
  namespace: kube-system
data:
  example.internal.zone: |
    $ORIGIN example.internal.
    @   3600 IN SOA ns1.example.internal. admin.example.internal. (
                    2024020901
                    3600
                    1800
                    604800
                    86400 )

    @   3600 IN NS ns1.example.internal.
    @   3600 IN NS ns2.example.internal.

    api             IN A     10.0.1.10
    database        IN A     10.0.1.20
    cache           IN A     10.0.1.30
    www             IN CNAME api
    db              IN CNAME database

  internal.zone: |
    $ORIGIN internal.
    @   3600 IN SOA ns.internal. admin.internal. (
                    2024020901
                    3600
                    1800
                    604800
                    86400 )

    @   3600 IN NS ns.internal.

    monitoring      IN A     10.0.2.10
    logging         IN A     10.0.2.20
    metrics         IN A     10.0.2.30
```

This ConfigMap contains two zone files, one for `example.internal` and another for `internal`.

## Configuring CoreDNS to Use the File Plugin

Modify your CoreDNS Deployment to mount the ConfigMap and update the Corefile to use the file plugin:

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
          items:
          - key: Corefile
            path: Corefile
      - name: custom-zones
        configMap:
          name: coredns-custom-zones
```

Update the CoreDNS ConfigMap to include the file plugin:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    # Custom zones using file plugin
    example.internal:53 {
        errors
        log
        file /etc/coredns/zones/example.internal.zone
        prometheus :9153
    }

    internal:53 {
        errors
        log
        file /etc/coredns/zones/internal.zone
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

This configuration creates separate server blocks for each custom zone, with the file plugin loading the corresponding zone file.

## Implementing Automatic Zone Reloads

CoreDNS can automatically reload zone files when they change. Enable the reload plugin to detect ConfigMap updates:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    example.internal:53 {
        errors
        log
        # Reload zone file every 30 seconds
        file /etc/coredns/zones/example.internal.zone {
            reload 30s
        }
        prometheus :9153
    }
```

The `reload` directive checks the zone file for changes every 30 seconds and reloads it if the modification time or content has changed.

## Creating Reverse DNS Zones

Reverse DNS lookups (PTR records) require special zone files for in-addr.arpa domains:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-reverse-zones
  namespace: kube-system
data:
  10.0.1.zone: |
    $ORIGIN 1.0.10.in-addr.arpa.
    @   3600 IN SOA ns1.example.internal. admin.example.internal. (
                    2024020901
                    3600
                    1800
                    604800
                    86400 )

    @   3600 IN NS ns1.example.internal.

    10  IN PTR api.example.internal.
    20  IN PTR database.example.internal.
    30  IN PTR cache.example.internal.
```

Add a server block in the Corefile for this reverse zone:

```yaml
1.0.10.in-addr.arpa:53 {
    errors
    log
    file /etc/coredns/zones/10.0.1.zone
    prometheus :9153
}
```

## Using Wildcards and Dynamic Records

Zone files support wildcard records for matching multiple hostnames:

```text
$ORIGIN example.internal.
@   3600 IN SOA ns1.example.internal. admin.example.internal. (
                2024020901
                3600
                1800
                604800
                86400 )

@   3600 IN NS ns1.example.internal.

; Specific records
api             IN A     10.0.1.10

; Wildcard for all subdomains
*.apps          IN A     10.0.1.100

; Wildcard for service discovery
*.svc           IN A     10.0.1.200
```

With this configuration, queries for `myapp.apps.example.internal` or `service.svc.example.internal` return the wildcard IP addresses.

## Combining File Plugin with Other Plugins

You can combine the file plugin with other CoreDNS plugins for advanced functionality:

```yaml
example.internal:53 {
    errors
    log
    # Serve records from file first
    file /etc/coredns/zones/example.internal.zone
    # Fall back to external DNS
    forward . 8.8.8.8 8.8.4.4
    # Cache responses
    cache 300
    prometheus :9153
}
```

This configuration attempts to resolve queries from the zone file first, then forwards unmatched queries to external DNS servers, and caches all responses for 5 minutes.

## Testing Zone File Configuration

After deploying your configuration, test DNS resolution from within the cluster:

```bash
# Create a test pod
kubectl run dns-test --image=busybox --restart=Never -- sleep 3600

# Test A record lookup
kubectl exec dns-test -- nslookup api.example.internal

# Test CNAME resolution
kubectl exec dns-test -- nslookup www.example.internal

# Test SRV records
kubectl exec dns-test -- nslookup -type=srv _http._tcp.example.internal

# Test TXT records
kubectl exec dns-test -- nslookup -type=txt _config.example.internal

# Test reverse DNS
kubectl exec dns-test -- nslookup 10.0.1.10
```

You should receive responses matching your zone file definitions.

## Validating Zone File Syntax

Before deploying zone files, validate their syntax to prevent runtime errors:

```bash
# Install named-checkzone from BIND utilities
apt-get install bind9-utils

# Validate zone file syntax
named-checkzone example.internal example.internal.zone
```

This command checks for syntax errors, missing records, and other common problems in zone files.

## Managing Zone File Updates

When updating zone files, remember to increment the serial number in the SOA record:

```text
$ORIGIN example.internal.
@   3600 IN SOA ns1.example.internal. admin.example.internal. (
                2024020902  ; Serial incremented
                3600
                1800
                604800
                86400 )
```

The serial number helps DNS clients and secondary name servers detect zone changes. Use a date-based format (YYYYMMDDNN) where NN is a daily sequence number.

## Monitoring File Plugin Performance

CoreDNS exposes Prometheus metrics for the file plugin:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: coredns-metrics
  namespace: kube-system
  labels:
    k8s-app: kube-dns
spec:
  selector:
    k8s-app: kube-dns
  ports:
  - name: metrics
    port: 9153
    protocol: TCP
```

Query metrics to monitor file plugin performance:

```promql
# Total queries served by file plugin
sum(rate(coredns_dns_requests_total{plugin="file"}[5m]))

# Response time for file plugin
histogram_quantile(0.99, rate(coredns_dns_request_duration_seconds_bucket{plugin="file"}[5m]))
```

## Conclusion

The CoreDNS file plugin provides powerful DNS customization capabilities within Kubernetes clusters. By serving custom zone files through ConfigMaps, you can implement internal DNS resolution, service discovery, and split-horizon DNS configurations without external dependencies. The plugin supports all standard DNS record types and integrates seamlessly with other CoreDNS plugins for enhanced functionality. Regular zone file validation, proper serial number management, and comprehensive monitoring ensure reliable DNS service for your applications.
