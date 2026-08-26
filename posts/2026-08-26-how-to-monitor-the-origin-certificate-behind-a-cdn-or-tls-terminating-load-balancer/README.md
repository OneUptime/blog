# How to Monitor the Origin Certificate Behind a CDN or TLS-Terminating Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL Monitoring, TLS, CDN, Origin Server, Load Balancer, Prometheus

Description: Monitor the certificate on the CDN-to-origin or load-balancer-to-backend TLS hop without confusing it with the public edge certificate.

---

When a CDN or load balancer terminates visitor TLS, a public check sees the edge certificate. If the platform opens a second HTTPS connection to the origin, that connection has a different certificate, trust policy, hostname, and sometimes a private network path.

Both hops can fail independently:

```text
client -- TLS certificate A --> CDN or load balancer -- TLS certificate B --> origin
```

Monitoring only certificate A can stay green while certificate B expires and the edge begins returning gateway errors. The solution is not to bypass the edge accidentally; it is to create a deliberate origin probe that reproduces the second hop's security policy.

## Define the Two Endpoints Separately

Create explicit inventory records such as:

| Monitor | Connect address | SNI and hostname check | Trust store |
| --- | --- | --- | --- |
| Public edge | Public DNS for `app.example.com` | `app.example.com` | Public roots |
| Origin | Private origin IP or origin-only DNS | Hostname used by the edge | Public roots, private PKI, or a scoped Origin CA root |

Do not compare their fingerprints unless they are intentionally configured with the same certificate. CDN Origin CA certificates, private-PKI certificates, and shorter-lived public edge certificates commonly differ by design.

## Preserve SNI While Connecting Directly

Connecting to an origin IP without SNI often returns its default virtual host. Use the production hostname in SNI and verification while pinning the address:

```bash
curl --verbose \
  --resolve app.example.com:443:10.20.30.40 \
  https://app.example.com/healthz
```

For certificate details:

```bash
openssl s_client \
  -connect 10.20.30.40:443 \
  -servername app.example.com \
  -verify_hostname app.example.com \
  -verify_return_error \
  -showcerts </dev/null
```

If the origin uses a private CA, add only its intended CA bundle:

```bash
openssl s_client \
  -connect 10.20.30.40:443 \
  -servername app.example.com \
  -verify_hostname app.example.com \
  -verify_return_error \
  -CAfile /etc/ssl/origin-monitor-roots.pem </dev/null
```

Never replace verification with `-verify 0` or `insecure_skip_verify: true`. That would prove encryption but not that the monitor reached the authentic origin.

## Put the Probe on an Authorized Path

Origins should normally reject arbitrary internet traffic. Choose one of these patterns:

- run the probe inside the VPC, cluster, or origin network;
- allowlist a stable monitoring egress address without broadening origin exposure;
- use the same private connectivity as the CDN or load balancer when the platform supports it;
- present a monitoring client certificate when origin mTLS is required.

Do not weaken a firewall or authenticated-origin-pull policy for convenience. A probe that cannot reproduce the edge's exact source identity may still validate the certificate from an internal path, but document that coverage gap.

## Configure a Dedicated Blackbox Exporter Module

When the target is an IP address, set both the HTTP `Host` header and TLS `server_name`. Keep redirects disabled so a canonical redirect cannot send the probe back through the public CDN.

```yaml
modules:
  app_origin_https:
    prober: http
    timeout: 10s
    http:
      method: GET
      valid_status_codes: [200]
      follow_redirects: false
      fail_if_not_ssl: true
      headers:
        Host: app.example.com
      tls_config:
        server_name: app.example.com
        insecure_skip_verify: false
        ca_file: /etc/blackbox-exporter/origin-monitor-roots.pem
```

Probe the origin address directly:

```yaml
scrape_configs:
  - job_name: ssl-origin
    metrics_path: /probe
    params:
      module: [app_origin_https]
    static_configs:
      - targets:
          - https://10.20.30.40/healthz
        labels:
          tls_hop: origin
          service: app
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-origin.example.net:9115
```

Omit `ca_file` when the origin certificate chains to the normal system roots. For mTLS, use the module's `cert_file` and `key_file` fields with a narrowly authorized monitoring identity and strict file permissions.

The current exporter exposes the live leaf identity in `probe_ssl_last_chain_info`, the earliest presented-chain expiry as `probe_ssl_earliest_cert_expiry`, and probe validity as `probe_success`.

## Alert on Failure and Expiry Separately

```yaml
groups:
  - name: origin-tls
    rules:
      - alert: OriginTLSProbeFailed
        expr: probe_success{job="ssl-origin"} == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Origin TLS failed for {{ $labels.service }}"

      - alert: OriginTLSCertificateExpiresSoon
        expr: |
          probe_ssl_earliest_cert_expiry{job="ssl-origin"}
            - time() < 21 * 24 * 60 * 60
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Origin TLS chain expires within 21 days for {{ $labels.service }}"
```

An expiry alert cannot replace the probe-failure alert. When validation or connectivity fails, the expiry metric can be absent. Also monitor absence of the probe series or the Prometheus target itself so a missing exporter does not look healthy.

## Account for Origin-Specific Trust

Cloudflare Full (strict), for example, requires an unexpired origin certificate whose CN or SAN matches the requested or target hostname and which is issued by a publicly trusted CA or Cloudflare Origin CA. A Cloudflare Origin CA certificate is intended for the Cloudflare-to-origin hop; a normal browser connecting directly to the origin need not trust it.

That is why the origin module can require a dedicated CA file while the public-edge module uses public roots. Keep that CA file scoped to this module. Adding a private or Origin CA root to the system-wide trust store changes the trust decisions of unrelated software.

For managed load balancers, also inspect control-plane state. A backend may terminate TLS on an ingress controller, service mesh gateway, appliance, or application process that is not represented in the public listener's certificate inventory.

## Prevent False Origin Results

- Use a health path that does not redirect to the public hostname through the CDN.
- Confirm the pinned IP is an origin, not a current CDN edge address.
- Send the exact SNI used on the real origin connection.
- Test every origin address or ingress node, not a single lucky backend.
- Include IPv4 and IPv6 if both are used on the origin hop.
- Use the same private root bundle and, where feasible, the same client authentication policy as the edge.
- Compare the served fingerprint with deployment state after renewal.
- Retain probe logs that identify the selected address and verification error.

## Official Documentation

- [OpenSSL `s_client` command](https://docs.openssl.org/master/man1/openssl-s_client/)
- [curl command-line manual: `--resolve`](https://curl.se/docs/manpage.html#--resolve)
- [Prometheus blackbox exporter configuration](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)
- [Prometheus multi-target exporter pattern](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Cloudflare Full (strict) SSL/TLS mode](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
- [Cloudflare Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
- [AWS Application Load Balancer listeners](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html)

## Conclusion

An edge certificate and an origin certificate protect different TLS sessions. Give each hop its own target, network vantage point, SNI value, trust roots, and alerts. A direct, verified origin probe then catches the expired or stale backend certificate that a healthy CDN edge would otherwise hide.
