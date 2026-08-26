# Why Your SSL Monitor Sees the Wrong Certificate: Send the Correct SNI Hostname

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL Monitoring, TLS, SNI, Prometheus, Blackbox Exporter, OpenSSL

Description: Diagnose default-certificate results and configure the SNI name, certificate identity, and HTTP host correctly when probing a virtual TLS endpoint.

---

A TLS endpoint can serve many certificates from one IP address. The client sends Server Name Indication (SNI) in its `ClientHello`, and the load balancer or web server uses that name to select a virtual host and certificate. A monitor that connects only to the IP can receive the listener's default certificate even though browsers receive the correct one.

That result is usually accurate for the handshake the monitor made. The fix is to make the probe identify the intended service before certificate selection happens.

## Keep the Three Hostnames Straight

An HTTPS probe can carry three related values:

| Value | Used when | Purpose |
| --- | --- | --- |
| TCP destination | Before TLS | Selects the IP address and port to connect to |
| TLS SNI and verification name | During TLS | Selects the certificate and verifies its SAN |
| HTTP `Host` header | After TLS | Selects the HTTP virtual host and application route |

For a normal request to `https://api.example.com/health`, all three derive from `api.example.com`, with DNS resolving the TCP destination. Problems appear when a monitor substitutes an IP address, a load-balancer hostname, or an origin hostname for the public service name.

Setting only the HTTP `Host` header is not a general fix. The server has already selected a certificate before it can read an encrypted HTTP request. Configure SNI explicitly whenever the connect address and service identity differ.

## Reproduce the Difference with OpenSSL

Connect without SNI and inspect the first certificate returned:

```bash
openssl s_client \
  -connect 203.0.113.10:443 \
  -noservername \
  -showcerts </dev/null 2>/dev/null |
openssl x509 -noout -subject -issuer -serial -ext subjectAltName
```

Now send the intended name and require both chain and hostname verification:

```bash
openssl s_client \
  -connect 203.0.113.10:443 \
  -servername api.example.com \
  -verify_hostname api.example.com \
  -verify_return_error \
  -showcerts </dev/null 2>/dev/null |
openssl x509 -noout -subject -issuer -serial -ext subjectAltName
```

`-servername` controls SNI. `-verify_hostname` independently checks the certificate identity. Keep both; receiving the intended certificate does not prove that the certificate is valid for the name.

For HTTPS, curl's `--resolve` is a convenient end-to-end test because the URL retains the real host while the connection is pinned to one address:

```bash
curl --fail --show-error --verbose \
  --resolve api.example.com:443:203.0.113.10 \
  https://api.example.com/health
```

This is useful when testing one load-balancer node before changing DNS.

## Prefer a Hostname Target in Blackbox Exporter

The simplest Blackbox Exporter target is the real URL:

```yaml
scrape_configs:
  - job_name: blackbox-https
    metrics_path: /probe
    params:
      module: [https_2xx]
    static_configs:
      - targets:
          - https://api.example.com/health
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter.monitoring.svc:9115
```

With a hostname in the target URL, the HTTP prober resolves the name for the connection and uses the target host as its TLS server name. A strict module can remain small:

```yaml
modules:
  https_2xx:
    prober: http
    timeout: 10s
    http:
      method: GET
      fail_if_not_ssl: true
      tls_config:
        insecure_skip_verify: false
```

Do not replace the target with the exporter's IP merely to avoid DNS. Doing so changes the service identity being tested and can also hide split-DNS or stale-DNS failures that users experience.

## Pin a Backend IP Without Losing SNI

Sometimes the exact backend is the object under test. In that case, define a module whose identity is explicit:

```yaml
modules:
  https_api_at_backend_ip:
    prober: http
    timeout: 10s
    http:
      method: GET
      valid_status_codes: [200, 301, 302, 307, 308]
      follow_redirects: false
      fail_if_not_ssl: true
      headers:
        Host: api.example.com
      tls_config:
        server_name: api.example.com
        insecure_skip_verify: false
```

Probe the IP URL with that module:

```bash
curl --fail --show-error --get \
  --data-urlencode 'module=https_api_at_backend_ip' \
  --data-urlencode 'target=https://203.0.113.10/health' \
  http://localhost:9115/probe
```

Here `server_name` is used for SNI and hostname verification, while `Host` selects the matching HTTP virtual host. `follow_redirects: false` keeps the measurement on the pinned backend; otherwise a redirect can make the final TLS metrics describe another host.

A fixed `server_name` makes this module credential-like configuration for one identity. Create separate modules for different names, or arrange correct DNS resolution inside the exporter when the target set is large.

## Diagnose Common False Leads

- A certificate's Common Name is not a substitute for the required SAN identity. Current service-identity guidance uses `subjectAltName`.
- An IP address is not a valid SNI `HostName`. If clients reach an IP but expect a DNS identity, send the DNS name as SNI.
- `insecure_skip_verify: true` can make the probe complete, but it disables chain and hostname validation. It turns a certificate monitor into a TLS-connectivity check.
- A CDN, ingress, origin, IPv4 listener, and IPv6 listener can legitimately terminate TLS independently. Test each intended termination point with its intended SNI name.
- If several certificates appear intermittently for the same SNI, probe each load-balancer address and region. A single healthy node can mask an incomplete rollout.

Alert on `probe_success == 0` as well as expiry. A wrong default certificate normally fails strict hostname verification before a useful expiry series can be emitted.

## Official Documentation

- [RFC 6066 Server Name Indication](https://www.rfc-editor.org/rfc/rfc6066.html#section-3)
- [RFC 9525 service identity and wildcard matching](https://www.rfc-editor.org/rfc/rfc9525.html)
- [Blackbox Exporter configuration reference](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)
- [Blackbox Exporter HTTP SNI selection](https://github.com/prometheus/blackbox_exporter/blob/master/prober/http.go)
- [OpenSSL `s_client` options](https://docs.openssl.org/master/man1/openssl-s_client/)
- [curl `--resolve` option](https://curl.se/docs/manpage.html#--resolve)

## Conclusion

A monitor sees the certificate selected for the handshake it actually sends. Use the service hostname as the target whenever possible. When pinning an IP, set the TLS `server_name`, verify that same identity, and set the HTTP `Host` header separately. Keep verification enabled so a wrong certificate becomes an actionable probe failure instead of a misleading expiry reading.
