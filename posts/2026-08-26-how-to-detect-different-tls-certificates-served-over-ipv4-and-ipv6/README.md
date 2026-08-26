# How to Detect Different TLS Certificates Served over IPv4 and IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL Monitoring, TLS, IPv4, IPv6, Dual Stack, Prometheus

Description: Test IPv4 and IPv6 independently, compare the certificates each path serves, and alert when a dual-stack endpoint has a stale or misconfigured TLS deployment.

---

A dual-stack hostname is two production paths. Its A records lead clients to IPv4 infrastructure, while its AAAA records lead clients to IPv6 infrastructure. Those paths can terminate on different load balancers, CDN edges, reverse proxies, or backend pools. Updating only one path can leave IPv6 clients with an expired certificate even though an ordinary check reports success over IPv4.

The monitor must force each address family. “Prefer IPv6 with fallback” is an availability test, not proof that both families work.

## Enumerate Both DNS Views

Start with the resolver used by the monitoring location:

```bash
dig api.example.com A
dig api.example.com AAAA
```

Repeat against authoritative or explicitly selected recursive resolvers when diagnosing split DNS:

```bash
dig @10.0.0.53 api.example.com A
dig @10.0.0.53 api.example.com AAAA
dig @1.1.1.1 api.example.com A
dig @1.1.1.1 api.example.com AAAA
```

Record the complete answer set and TTLs. Multiple addresses matter: a resolver or client can select a different address on the next connection, while the blackbox exporter selects one address from the chosen family for a probe.

## Force the Address Family with curl

These commands retain the hostname for SNI and certificate verification but restrict DNS resolution to one family:

```bash
curl --ipv4 --verbose https://api.example.com/healthz
curl --ipv6 --verbose https://api.example.com/healthz
```

They prove that one usable address in each family works. To test every advertised address, pin it with `--resolve`:

```bash
curl --verbose \
  --resolve api.example.com:443:192.0.2.10 \
  https://api.example.com/healthz

curl --verbose \
  --resolve api.example.com:443:[2001:db8::10] \
  https://api.example.com/healthz
```

Square brackets are required around the IPv6 address in the `--resolve` value. Because the URL still contains `api.example.com`, curl sends the correct SNI and verifies the certificate for that hostname.

## Compare Leaf Certificates Directly

OpenSSL makes the identity difference easy to see:

```bash
openssl s_client \
  -connect 192.0.2.10:443 \
  -servername api.example.com \
  -verify_hostname api.example.com \
  -verify_return_error </dev/null 2>/dev/null \
  | openssl x509 -noout -fingerprint -sha256 -issuer -serial -dates

openssl s_client \
  -connect '[2001:db8::10]:443' \
  -servername api.example.com \
  -verify_hostname api.example.com \
  -verify_return_error </dev/null 2>/dev/null \
  | openssl x509 -noout -fingerprint -sha256 -issuer -serial -dates
```

`-servername` selects the virtual host. `-verify_hostname` checks its identity. `-verify_return_error` makes chain or hostname verification errors terminate the check rather than merely appearing in diagnostic output.

Compare more than `notAfter`. Capture the SHA-256 fingerprint, issuer plus serial number, SANs, and—if key identity is part of policy—the SPKI hash. Different fingerprints are not automatically wrong: CDNs can deliberately serve several valid certificates. The failure is a certificate that is outside the approved set or violates hostname, trust, expiry, issuer, or key policy.

## Configure Independent Blackbox Exporter Modules

Disable protocol fallback so a broken family cannot be hidden by the other one:

```yaml
modules:
  https_ipv4:
    prober: http
    timeout: 10s
    http:
      preferred_ip_protocol: ip4
      ip_protocol_fallback: false
      fail_if_not_ssl: true
      follow_redirects: false
      tls_config:
        insecure_skip_verify: false

  https_ipv6:
    prober: http
    timeout: 10s
    http:
      preferred_ip_protocol: ip6
      ip_protocol_fallback: false
      fail_if_not_ssl: true
      follow_redirects: false
      tls_config:
        insecure_skip_verify: false
```

Create two scrape jobs so their labels and modules remain unambiguous:

```yaml
scrape_configs:
  - job_name: ssl-ipv4
    metrics_path: /probe
    params:
      module: [https_ipv4]
    static_configs:
      - targets: [https://api.example.com/healthz]
        labels:
          ip_family: ipv4
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

  - job_name: ssl-ipv6
    metrics_path: /probe
    params:
      module: [https_ipv6]
    static_configs:
      - targets: [https://api.example.com/healthz]
        labels:
          ip_family: ipv6
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

`probe_ip_protocol` should be `4` in the first job and `6` in the second. `probe_ip_addr_hash` can reveal that the selected address changed, but it is a numeric hash, not a replacement for logging the resolved IP during diagnostics.

The leaf certificate appears in `probe_ssl_last_chain_info`, whose current labels include `fingerprint_sha256`, `issuer`, `serialnumber`, `subject`, and `subjectalternative`.

## Alert on Each Family Independently

Use the family label in alerts and notifications:

```yaml
groups:
  - name: dual-stack-tls
    rules:
      - alert: TLSProbeFailedByAddressFamily
        expr: probe_success{job=~"ssl-ipv4|ssl-ipv6"} == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "TLS probe failed over {{ $labels.ip_family }} for {{ $labels.instance }}"

      - alert: TLSCertificateExpiresSoonByAddressFamily
        expr: |
          probe_ssl_earliest_cert_expiry{job=~"ssl-ipv4|ssl-ipv6"}
            - time() < 14 * 24 * 60 * 60
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "TLS chain expires soon over {{ $labels.ip_family }} for {{ $labels.instance }}"
```

Keep a separate probe-failure rule. When a TLS handshake fails, the expiry series may be absent; an expiry expression alone cannot report that failure.

To detect certificate identity transitions within either family:

```promql
count by (instance, ip_family) (
  count_over_time(probe_ssl_last_chain_info[30m]) > 0
) > 1
```

Use that as an informational rollout signal. To enforce cross-family equality, join against an approved fingerprint set rather than assuming every valid CDN deployment uses one certificate globally.

## Test Every Address When Convergence Matters

Two family-specific DNS probes still choose only one address per probe. If the A or AAAA set contains several load-balancer nodes, build explicit targets from DNS or platform inventory and pin each address while preserving SNI. Reconcile that target list regularly with DNS so removed nodes disappear and new nodes are tested.

Probe from an IPv6-capable network. A monitor with no IPv6 route will correctly fail the IPv6 job, but that result describes the monitor path rather than the service. Run at least one external dual-stack vantage point, and add an internal one when split DNS or private origins are involved.

## Common False Conclusions

- A successful default probe does not prove both families; fallback may have selected the working one.
- An AAAA record does not prove the monitor has an IPv6 route.
- Connecting to an IP without SNI can return a default certificate unrelated to the hostname.
- Equal expiry dates do not prove equal certificates.
- Different fingerprints do not prove a fault when a CDN or algorithm-specific deployment intentionally serves an approved set.
- Testing one address does not prove every address in a DNS pool is updated.

## Official Documentation

- [curl command-line manual](https://curl.se/docs/manpage.html)
- [curl IPv6 tutorial](https://curl.se/docs/tutorial.html#ipv6)
- [OpenSSL `s_client` command](https://docs.openssl.org/master/man1/openssl-s_client/)
- [BIND 9 `dig` manual](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)
- [Prometheus blackbox exporter configuration](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)
- [Prometheus blackbox exporter IP selection implementation](https://github.com/prometheus/blackbox_exporter/blob/master/prober/utils.go)

## Conclusion

Model IPv4 and IPv6 as separate service paths. Disable fallback, preserve SNI, label the family, and test every advertised address when full convergence matters. Then a stale IPv6 certificate becomes a precise alert instead of a problem hidden behind a successful IPv4 handshake.
