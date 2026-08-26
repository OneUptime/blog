# Why Internal and External SSL Monitors Disagree: Split DNS, Firewalls, CDNs, and Load Balancers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL Monitoring, TLS, Split DNS, CDN, Load Balancer, Network Troubleshooting

Description: Diagnose internal and external SSL monitoring disagreements by proving which DNS answer, route, TLS terminator, SNI name, and trust policy each monitor used.

---

Two SSL monitors can both be correct and still report different certificates. A monitor does not observe an abstract domain; it observes one TLS handshake from one network location, using one resolver, one address family, one route, one SNI value, and one trust store.

An internal probe may reach a private load balancer through split-horizon DNS while an external probe reaches a CDN. A firewall may transparently proxy outbound TLS. A global CDN or load balancer may select different edges. Even when both probes reach the same IP address, different SNI values can select different certificates.

The fastest diagnosis is to make every hidden input explicit.

## Record the Complete Observation

For every monitor result, retain at least:

- probe location and network identity;
- resolver address and A/AAAA answers;
- selected destination IP and IP family;
- destination port;
- SNI and HTTP `Host` values;
- whether an HTTP proxy was used;
- leaf SHA-256 fingerprint, issuer, serial, SANs, and expiry;
- negotiated TLS version and cipher;
- trust-store or custom CA bundle version;
- probe time and system clock status;
- redirect destination, if redirects are followed.

Comparing only expiry dates hides the evidence needed to explain the difference.

## Prove Split DNS First

Query the actual resolvers used by each probe. Replace the example addresses with the resolvers reported by the monitor hosts.

```bash
dig @10.0.0.53 api.example.com A
dig @10.0.0.53 api.example.com AAAA

dig @1.1.1.1 api.example.com A
dig @1.1.1.1 api.example.com AAAA
```

Also inspect search domains, local host files, DNS caches, and service-discovery overrides. A laptop test is not evidence of what a containerized monitor resolved; containers and Kubernetes pods may use different resolver configuration.

If internal DNS returns `10.20.30.40` and public DNS returns CDN addresses, the monitors are testing different TLS terminators by design. They should have separate endpoint records and policies, such as `api-public` and `api-origin`, rather than being forced to agree on one fingerprint.

## Pin the Address While Preserving the Hostname

Use curl's `--resolve` option to connect to a chosen address while keeping the URL hostname for SNI, certificate verification, and the HTTP `Host` header:

```bash
curl --verbose --resolve api.example.com:443:203.0.113.20 \
  https://api.example.com/healthz

curl --verbose --resolve api.example.com:443:[2001:db8::20] \
  https://api.example.com/healthz
```

For certificate-focused output, connect with OpenSSL:

```bash
openssl s_client \
  -connect 203.0.113.20:443 \
  -servername api.example.com \
  -verify_hostname api.example.com \
  -verify_return_error </dev/null
```

`-servername` controls SNI. `-verify_hostname` checks the certificate identity. `-verify_return_error` makes a verification error fail instead of merely printing diagnostics and continuing.

Repeat the same command from both monitor networks. If the destination is allowed only from a load balancer or CDN, run the origin probe from an approved internal vantage point; do not open the origin to the internet merely for monitoring.

## Separate the Common Causes

### Split-horizon DNS

Private and public resolvers intentionally return different addresses. Document both views and monitor both. Alert if either view changes unexpectedly, but do not require their fingerprints to match unless architecture says they should.

### Firewalls and TLS inspection

An enterprise egress gateway can terminate and reissue TLS using an internal CA. Indicators include an enterprise issuer, a certificate visible only on the internal path, or a connection that changes when proxy environment variables are removed. Check `HTTPS_PROXY`, `NO_PROXY`, explicit monitor proxy settings, firewall policy, and routing. Do not use `insecure_skip_verify` to silence this difference; establish whether inspection is authorized and which trust boundary the monitor is meant to test.

### CDNs

A CDN normally terminates visitor TLS at its edge, so the public certificate is not the origin certificate. Edges may use different legitimate certificates, chains, or key algorithms during staged rollout. Validate hostname, trust, expiry, and an approved certificate set at the edge. Monitor the origin independently through its intended private path.

### Load balancers and SNI

An HTTPS listener can have a default certificate plus additional certificates selected with SNI. Omitting SNI often returns the default certificate, which may be perfectly valid for another hostname. Verify that every tool sends the same SNI value.

If a pool has inconsistent nodes, repeated DNS-based tests may alternate results. Pin and test every advertised address, each address family, and—where the platform exposes them—each load-balancer node or backend. A single successful sample does not prove fleet convergence.

### Redirects

The blackbox exporter reports TLS metrics from the final HTTPS response. Following a redirect from `login.example.com` to an identity provider can therefore make the observed certificate belong to the identity provider. Use `follow_redirects: false` for endpoint-certificate checks, or deliberately model each redirect hop.

### Trust stores and clocks

An internal monitor may trust a private CA that an external monitor does not. Conversely, an old runtime may lack a new root or build a different chain. Compare the exact CA bundle and application runtime. Also verify time synchronization: validity checks depend on the monitor's clock, and a skewed host can report “not yet valid” or “expired” while another succeeds.

## Configure Vantage Points as First-Class Labels

Deploy separate blackbox exporters where the traffic originates and label the resulting series:

```yaml
scrape_configs:
  - job_name: ssl-internal
    metrics_path: /probe
    params:
      module: [https_certificate]
    static_configs:
      - targets: [https://api.example.com/healthz]
        labels:
          vantage: internal
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-internal.example.net:9115

  - job_name: ssl-external
    metrics_path: /probe
    params:
      module: [https_certificate]
    static_configs:
      - targets: [https://api.example.com/healthz]
        labels:
          vantage: external
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-external.example.net:9115
```

Do not copy an internal DNS override or private CA bundle into the external probe unless that is genuinely how external clients operate. The value of multiple vantage points is that they preserve real path differences.

## Use a Reproducible Triage Order

1. Confirm both observations refer to the same timestamp and URL.
2. Compare resolver configuration and A/AAAA answers.
3. Compare the selected destination IP, IP family, proxy, and route.
4. Pin each IP and repeat the handshake with identical SNI.
5. Compare leaf fingerprints, issuers, serials, SANs, and chains.
6. Check CDN and load-balancer certificate deployment status.
7. Check firewall TLS inspection and origin access controls.
8. Compare trust stores, runtime versions, redirects, and clocks.
9. Decide whether the difference is intended, a partial rollout, or a fault.

## Official Documentation

- [BIND 9 `dig` manual](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)
- [curl command-line manual: `--resolve`, `--ipv4`, and `--ipv6`](https://curl.se/docs/manpage.html)
- [OpenSSL `s_client` command](https://docs.openssl.org/master/man1/openssl-s_client/)
- [Prometheus blackbox exporter configuration](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)
- [Prometheus multi-target exporter pattern](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Cloudflare Full (strict) origin TLS](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
- [AWS Application Load Balancer HTTPS listeners](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html)

## Conclusion

When SSL monitors disagree, first prove that they made the same connection. Resolver, address family, route, proxy, SNI, redirect behavior, and trust store are all part of the measurement. Preserve those dimensions as labels, monitor edge and origin certificates separately, and an apparent contradiction becomes a specific, testable network-path difference.
