# How to Implement CoreDNS DNSSEC Validation for Secure DNS Resolution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CoreDNS, Kubernetes, DNSSEC, Security, DNS

Description: Learn how to configure DNSSEC validation in CoreDNS to protect your Kubernetes cluster from DNS spoofing and cache poisoning attacks. Complete implementation guide with monitoring.

---

DNS Security Extensions (DNSSEC) add cryptographic signatures to DNS records, protecting against DNS spoofing, cache poisoning, and man-in-the-middle attacks. When you enable DNSSEC validation in CoreDNS, your Kubernetes cluster verifies that DNS responses are authentic and haven't been tampered with in transit. This verification is critical for security-sensitive applications that rely on DNS for service discovery and external communications.

## Understanding DNSSEC Validation

DNSSEC creates a chain of trust from the DNS root zone down to individual domain names. Each level in the DNS hierarchy signs its records with private keys, and validators use corresponding public keys to verify signatures. When CoreDNS performs DNSSEC validation, it checks this entire chain to ensure response authenticity.

Without DNSSEC validation, attackers can intercept DNS queries and provide false responses, redirecting traffic to malicious servers. In Kubernetes environments, this could mean pods connecting to fake databases, APIs, or external services.

## Enabling DNSSEC Validation in CoreDNS

CoreDNS doesn't enable DNSSEC validation by default. You need to explicitly configure it using the dnssec plugin in conjunction with the forward plugin.

Here's a basic CoreDNS configuration with DNSSEC validation:

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
        # Forward with DNSSEC validation enabled
        forward . 8.8.8.8 8.8.4.4 {
            max_concurrent 1000
        }
        dnssec {
            # Verify DNSSEC signatures
            validate
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

The `dnssec` plugin with the `validate` option enables signature verification for all forwarded queries.

## Configuring Trust Anchors

DNSSEC validation requires trust anchors, which are public keys for DNS zones that serve as the root of trust. CoreDNS uses the root zone trust anchor by default, but you can configure additional trust anchors for specific domains.

Create a ConfigMap with custom trust anchors:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-trust-anchors
  namespace: kube-system
data:
  anchors: |
    # Root zone trust anchor (KSK)
    . IN DS 20326 8 2 E06D44B80B8F1D39A95C0B0D7C65D08458E880409BBC683457104237C7F8EC8D

    # Custom trust anchor for internal zone
    internal. IN DS 12345 8 2 ABCD1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890AB
```

Mount this ConfigMap and reference it in your CoreDNS configuration:

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
        forward . 8.8.8.8 8.8.4.4
        dnssec {
            validate
            # Use custom trust anchors
            trust-anchor /etc/coredns/anchors/anchors
        }
        cache 30
        reload
    }
```

## Handling DNSSEC Validation Failures

When DNSSEC validation fails, CoreDNS returns SERVFAIL responses. You can configure how CoreDNS handles these failures:

```yaml
dnssec {
    validate
    # Log validation failures
    log-failures
    # Continue on validation failure (not recommended for production)
    # insecure
}
```

The `log-failures` option logs all validation failures, helping you diagnose DNSSEC configuration issues. Never use `insecure` in production environments as it defeats the purpose of DNSSEC validation.

## Monitoring DNSSEC Validation

CoreDNS exposes Prometheus metrics for DNSSEC validation. Monitor these metrics to understand validation behavior and detect potential attacks:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: coredns-dnssec
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: kube-dns
  endpoints:
  - port: metrics
    interval: 30s
```

Key DNSSEC metrics include:

- `coredns_dnssec_cache_entries`: Number of cached DNSSEC records
- `coredns_dnssec_cache_misses_total`: Cache misses for DNSSEC data
- `coredns_dns_responses_total{rcode="SERVFAIL"}`: Failed validations

Query these metrics to detect validation issues:

```promql
# Rate of SERVFAIL responses (potential validation failures)
rate(coredns_dns_responses_total{rcode="SERVFAIL"}[5m]) > 0

# DNSSEC cache hit rate
rate(coredns_dnssec_cache_hits_total[5m]) /
rate(coredns_dnssec_cache_requests_total[5m])
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
        summary: "High rate of DNSSEC validation failures"
        description: "CoreDNS is experiencing {{ $value }} SERVFAIL responses per second"

    - alert: CoreDNSDNSSECCacheLowHitRate
      expr: |
        rate(coredns_dnssec_cache_hits_total[10m]) /
        rate(coredns_dnssec_cache_requests_total[10m]) < 0.5
      for: 10m
      labels:
        severity: info
      annotations:
        summary: "Low DNSSEC cache hit rate"
        description: "DNSSEC cache hit rate is {{ $value | humanizePercentage }}"
```

These alerts help you detect DNSSEC configuration problems and potential DNS attacks.

## Configuring Upstream DNSSEC-Capable Resolvers

For DNSSEC validation to work, your upstream DNS resolvers must support DNSSEC. Configure CoreDNS to use DNSSEC-capable resolvers:

```yaml
forward . 8.8.8.8 8.8.4.4 1.1.1.1 1.0.0.1 {
    # Force DNS over TCP for large DNSSEC responses
    prefer_udp
    max_concurrent 1000
}
```

Public DNS resolvers that support DNSSEC include:
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
# Should fail with SERVFAIL

# Check CoreDNS logs for validation details
kubectl logs -n kube-system -l k8s-app=kube-dns | grep -i dnssec
```

The test should show successful resolution for valid DNSSEC domains and SERVFAIL for domains with broken DNSSEC.

## Implementing DNSSEC for Internal Zones

If you run internal DNS zones, you can sign them with DNSSEC and configure CoreDNS to validate these zones:

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

Configure CoreDNS to serve and validate this zone:

```yaml
internal.example.com:53 {
    errors
    log
    file /etc/coredns/zones/internal.example.com.signed
    dnssec {
        validate
        # Serve DNSSEC records
        serve
    }
    prometheus :9153
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
        # Enable TCP fallback for large responses
        prefer_udp
        max_concurrent 1000
    }
    dnssec {
        validate
    }
    # Increase cache size for DNSSEC records
    cache 30 {
        success 9984 30
        denial 9984 5
    }
    reload
}
```

The `prefer_udp` directive attempts UDP first but falls back to TCP for responses exceeding UDP limits.

## Debugging DNSSEC Validation Issues

When DNSSEC validation fails, enable detailed logging to diagnose the problem:

```yaml
.:53 {
    errors
    log {
        class error
        class denial
        # Log all queries for debugging
        class all
    }
    forward . 8.8.8.8 8.8.4.4
    dnssec {
        validate
        log-failures
    }
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

DNSSEC validation adds latency to DNS queries. Optimize performance with aggressive caching:

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
    dnssec {
        validate
    }
    # Cache DNSSEC records longer
    cache 300 {
        success 9984 300
        denial 9984 30
        prefetch 10 60s
    }
    prometheus :9153
    reload
}
```

The `prefetch` directive proactively refreshes popular records before they expire, reducing validation latency for frequently accessed domains.

## Conclusion

Implementing DNSSEC validation in CoreDNS protects your Kubernetes cluster from DNS-based attacks by verifying the authenticity of all DNS responses. While DNSSEC adds complexity and some performance overhead, it provides essential security guarantees for production environments handling sensitive data or communications. Enable comprehensive monitoring through Prometheus metrics, configure appropriate trust anchors for your environment, and test validation thoroughly before deploying to production. With proper configuration and monitoring, DNSSEC validation ensures that your cluster's DNS infrastructure remains secure and trustworthy.
