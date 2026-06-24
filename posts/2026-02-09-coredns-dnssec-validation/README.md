# How to Implement CoreDNS DNSSEC Validation for Secure DNS Resolution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CoreDNS, Kubernetes, DNSSEC, Security, DNS

Description: Learn how to configure DNSSEC validation in CoreDNS to protect your Kubernetes cluster from DNS spoofing and cache poisoning attacks. Complete implementation guide with monitoring.

---

DNS Security Extensions (DNSSEC) add cryptographic signatures to DNS records, protecting against DNS spoofing, cache poisoning, and man-in-the-middle attacks. In Kubernetes, CoreDNS is commonly the cluster DNS server, but CoreDNS itself is not a recursive DNSSEC validator. The supported pattern is to forward external queries to DNSSEC-validating recursive resolvers and monitor the validation results they return. This verification is critical for security-sensitive applications that rely on DNS for service discovery and external communications.

## Understanding DNSSEC Validation

DNSSEC creates a chain of trust from the DNS root zone down to individual domain names. Each level in the DNS hierarchy signs its records with private keys, and validators use corresponding public keys to verify signatures. When a validating recursive resolver checks DNSSEC, it verifies this chain to ensure response authenticity.

Without DNSSEC validation, attackers can intercept DNS queries and provide false responses, redirecting traffic to malicious servers. In Kubernetes environments, this could mean pods connecting to fake databases, APIs, or external services.

## Enabling DNSSEC-Aware Resolution in CoreDNS

CoreDNS doesn't perform recursive DNSSEC validation by default, and the CoreDNS `dnssec` plugin is for signing authoritative responses, not for validating forwarded answers. To get DNSSEC-validated results for external names, configure CoreDNS to forward queries to DNSSEC-validating recursive resolvers such as Unbound, Google Public DNS, Cloudflare DNS, or Quad9.

Here's a basic CoreDNS configuration that forwards external queries to validating resolvers:

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
            lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
            ttl 30
        }
        prometheus :9153
        # Forward external queries to DNSSEC-validating recursive resolvers
        forward . 8.8.8.8 8.8.4.4 {
            max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

The `forward` plugin sends recursive queries to the upstream resolvers. If the upstream resolver validates DNSSEC, bogus signed domains are returned to CoreDNS as validation failures, typically as SERVFAIL responses.

## Configuring Trust Anchors

DNSSEC validation requires trust anchors, which are public keys for DNS zones that serve as the root of trust. Configure trust anchors in the validating recursive resolver, not in CoreDNS forwarding rules. For example, an Unbound resolver can maintain the root trust anchor with `auto-trust-anchor-file`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: unbound-config
  namespace: kube-system
data:
  unbound.conf: |
    server:
      interface: 0.0.0.0
      access-control: 10.0.0.0/8 allow
      auto-trust-anchor-file: "/var/lib/unbound/root.key"
```

Mount this configuration into an Unbound deployment and point CoreDNS at the Unbound Service ClusterIP:

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
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
            ttl 30
        }
        forward . 10.96.123.45:53
        cache 30
        reload
    }
```

Replace `10.96.123.45` with the actual ClusterIP of your validating resolver Service.

## Handling DNSSEC Validation Failures

When DNSSEC validation fails, a validating recursive resolver returns SERVFAIL responses. CoreDNS forwards those responses back to the client:

```yaml
.:53 {
    errors
    log {
        class error
    }
    forward . 10.96.123.45:53
    cache 30
}
```

Use the CoreDNS `log` plugin for query logging and enable DNSSEC validation logging in the validating resolver itself. For Unbound, `val-log-level` can be used when you need more detail while debugging validation failures.

## Monitoring DNSSEC Validation

CoreDNS exposes Prometheus metrics for forwarded responses. Monitor SERVFAIL responses to understand validation behavior and detect potential issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: coredns-dns
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: kube-dns
  endpoints:
  - port: metrics
    interval: 30s
```

Key CoreDNS metrics include:

- `coredns_dns_responses_total{rcode="SERVFAIL"}`: Failed responses, including DNSSEC validation failures returned by upstream resolvers
- `coredns_dns_do_requests_total`: Queries that have the DNSSEC OK (DO) bit set
- `coredns_cache_hits_total`: Cache hits for CoreDNS responses
- `coredns_cache_requests_total`: Cache requests handled by CoreDNS

Query these metrics to detect validation issues:

```promql
# Rate of SERVFAIL responses (potential validation failures)

rate(coredns_dns_responses_total{rcode="SERVFAIL"}[5m]) > 0

# CoreDNS cache hit rate
rate(coredns_cache_hits_total[5m]) /
rate(coredns_cache_requests_total[5m])
```

## Creating Alerts for DNSSEC Failures

Set up Prometheus alerts to notify you of DNSSEC validation problems:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: coredns-dnssec-alerts
  namespace: kube-system
spec:
  groups:
  - name: coredns-dnssec
    interval: 30s
    rules:
    - alert: CoreDNSDNSSECValidationFailureHigh
      expr: |
        rate(coredns_dns_responses_total{rcode="SERVFAIL"}[5m]) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High rate of DNS failures"
        description: "CoreDNS is experiencing {{ $value }} SERVFAIL responses per second"

    - alert: CoreDNSCacheLowHitRate
      expr: |
        rate(coredns_cache_hits_total[10m]) /
        rate(coredns_cache_requests_total[10m]) < 0.5
      for: 10m
      labels:
        severity: info
      annotations:
        summary: "Low CoreDNS cache hit rate"
        description: "CoreDNS cache hit rate is {{ $value | humanizePercentage }}"
```

These alerts help you detect DNSSEC configuration problems and potential DNS attacks. SERVFAIL is not DNSSEC-specific, so correlate alerts with validating resolver logs.

## Configuring Upstream DNSSEC-Capable Resolvers

For DNSSEC validation to work, your upstream DNS resolvers must perform DNSSEC validation. Configure CoreDNS to use validating resolvers:

```yaml
forward . 8.8.8.8 8.8.4.4 1.1.1.1 1.0.0.1 {
    # Use TCP to upstream resolvers even when clients query over UDP
    force_tcp
    max_concurrent 1000
}
```

Public DNS resolvers that support DNSSEC validation include:
- Google Public DNS (8.8.8.8, 8.8.4.4)
- Cloudflare DNS (1.1.1.1, 1.0.0.1)
- Quad9 (9.9.9.9, 149.112.112.112)

## Testing DNSSEC Validation

Verify that DNSSEC validation works correctly by testing with known DNSSEC-signed and DNSSEC-broken domains:

```bash
# Create a test pod
kubectl run dnssec-test --image=busybox --restart=Never -- sleep 3600

# Test valid DNSSEC domain
kubectl exec dnssec-test -- nslookup dnssec-deployment.org
# Should succeed

# Test invalid DNSSEC domain (deliberately broken)
kubectl exec dnssec-test -- nslookup dnssec-failed.org
# Should fail with SERVFAIL when the upstream resolver validates DNSSEC

# Check CoreDNS logs for validation-related SERVFAIL responses
kubectl logs -n kube-system -l k8s-app=kube-dns | grep -i servfail
```

The test should show successful resolution for valid DNSSEC domains and SERVFAIL for domains with broken DNSSEC when your upstream recursive resolver validates DNSSEC.

## Implementing DNSSEC for Internal Zones

If you run internal DNS zones, you can sign them with DNSSEC and configure CoreDNS to serve the signed zone:

```bash
# Generate signing keys (run this outside Kubernetes)
dnssec-keygen -a ECDSAP256SHA256 -n ZONE internal.example.com
dnssec-keygen -f KSK -a ECDSAP256SHA256 -n ZONE internal.example.com

# Sign the zone
dnssec-signzone -o internal.example.com zone.file
```

Store the signed zone in a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: internal-signed-zone
  namespace: kube-system
data:
  internal.example.com.signed: |
    # Signed zone content here
```

Configure CoreDNS to serve this signed zone:

```yaml
internal.example.com:53 {
    errors
    log
    file /etc/coredns/zones/internal.example.com.signed internal.example.com
    prometheus :9153
}
```

CoreDNS can also sign authoritative responses on the fly with the `dnssec` plugin when you provide signing keys:

```yaml
internal.example.com:53 {
    errors
    file /etc/coredns/zones/internal.example.com internal.example.com
    dnssec {
        key file /etc/coredns/keys/Kinternal.example.com.+013+12345
    }
}
```

## Handling Large DNSSEC Responses

DNSSEC adds significant overhead to DNS responses, sometimes exceeding UDP packet size limits. Configure CoreDNS to handle large responses:

```yaml
.:53 {
    errors
    health
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }
    forward . 8.8.8.8 8.8.4.4 {
        # Use TCP to upstream resolvers even when clients query over UDP
        force_tcp
        max_concurrent 1000
    }
    cache 30 {
        success 9984 30
        denial 9984 5
    }
    reload
}
```

The `force_tcp` directive makes CoreDNS use TCP to upstream resolvers even when the client query arrived over UDP.

## Debugging DNSSEC Validation Issues

When DNSSEC validation fails, enable detailed logging to diagnose the problem:

```yaml
.:53 {
    errors
    log {
        class error
        class denial
    }
    forward . 10.96.123.45:53
    cache 30
}
```

Review logs to identify specific validation failures:

```bash
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=100 | grep -A5 "SERVFAIL"
```

Common DNSSEC validation failures include:
- Expired signatures (zone not re-signed)
- Missing DNSKEY records (incomplete chain of trust)
- Invalid signatures (DNS tampering or misconfiguration)
- Clock skew (system time incorrect)

## Performance Optimization for DNSSEC

DNSSEC validation adds latency to DNS queries. Optimize performance with caching:

```yaml
.:53 {
    errors
    health
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }
    forward . 8.8.8.8 8.8.4.4
    cache 300 {
        success 9984 300
        denial 9984 30
        prefetch 10 60s
    }
    prometheus :9153
    reload
}
```

The `prefetch` directive proactively refreshes popular records before they expire, reducing latency for frequently accessed domains.

## Conclusion

Implementing DNSSEC-validated resolution for Kubernetes protects your cluster from DNS-based attacks by verifying the authenticity of DNS responses at a validating recursive resolver. CoreDNS should forward external queries to resolvers that perform DNSSEC validation, while the CoreDNS `dnssec` plugin is reserved for signing authoritative zones served by CoreDNS. Enable comprehensive monitoring through Prometheus metrics, configure trust anchors in your validating resolver, and test validation thoroughly before deploying to production. With proper configuration and monitoring, DNSSEC validation helps keep your cluster's DNS infrastructure secure and trustworthy.
