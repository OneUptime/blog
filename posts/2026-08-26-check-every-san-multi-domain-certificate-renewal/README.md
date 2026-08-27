# Check Every SAN After a Multi-Domain Certificate Renewal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Subject Alternative Name, SAN, TLS, Certificate Renewal, OpenSSL, Blackbox Exporter

Description: Validate every expected service identity against a renewed certificate and compare the exact DNS SAN contract so one working hostname cannot hide omissions.

---

A TLS client verifies the reference identity or set of acceptable reference identities for its connection; it does not automatically check every identity in the presented SAN extension. If `api.example.com` still appears in a renewed certificate, that probe can succeed even when `login.example.com` was accidentally removed from the same multi-domain certificate.

The monitor therefore needs an external list of expected identities. The certificate is evidence of what was issued, not the source of truth for what the service is supposed to cover.

## Fetch the Leaf with the Correct SNI Name

Use any known hostname on the endpoint to select the intended certificate:

```bash
set -o pipefail

openssl s_client \
  -connect api.example.com:443 \
  -servername api.example.com \
  -verify_hostname api.example.com \
  -verify_return_error \
  -showcerts </dev/null 2>/dev/null |
openssl x509 -outform PEM >leaf.pem || exit 1
```

Inspect the DNS identities:

```bash
openssl x509 -in leaf.pem -noout \
  -subject -issuer -serial -dates -fingerprint -sha256 \
  -ext subjectAltName
```

Current TLS service-identity guidance uses `subjectAltName`. Do not accept a missing SAN because the subject Common Name happens to contain one hostname.

The `-verify_hostname` option uses OpenSSL's compatibility matcher, as does `x509 -checkhost` below. It does not replace the structured SAN-policy validation later in this guide.

## Check Every Expected Host for Functional Coverage

Keep one DNS hostname per line in ASCII form in `expected-hosts.txt`, with any internationalized labels encoded as A-labels:

```text
api.example.com
login.example.com
uploads.example.com
```

Run OpenSSL's hostname matcher for each identity:

```bash
failed=0

while IFS= read -r hostname || [ -n "$hostname" ]; do
  case "$hostname" in
    ''|'#'*) continue ;;
  esac

  if ! openssl x509 -in leaf.pem -noout -checkhost "$hostname"; then
    echo "renewed certificate does not cover $hostname" >&2
    failed=1
  fi
done <expected-hosts.txt

exit "$failed"
```

This checks coverage according to OpenSSL's compatibility matcher, not strict RFC 9525 conformance. A conforming `*.example.com` SAN covers `api.example.com`, but not `example.com` or `v2.api.example.com`. RFC 9525 constrains the wildcard to the complete left-most label and to one label of matching. In OpenSSL 4.0 and earlier supported releases, this matcher also accepts partial left-most-label wildcards such as `w*.example.com` and can fall back to the subject Common Name when no DNS SAN exists, so the exact SAN-policy check below must also succeed.

Use `openssl x509 -checkip` for expected IP identities. An IP address encoded as a DNS SAN is not equivalent to an `iPAddress` SAN. URI, email, and protocol-specific identities need matchers appropriate to those SAN types.

## Compare the Exact Issuance Contract Too

Functional coverage and exact SAN-set policy are different. A wildcard can keep a hostname working while an explicitly required SAN disappears, and an unexpected SAN can expand the certificate's authority.

Keep a second file, `required-dns-san-entries.txt`, containing the literal DNS identifiers the issuance request is supposed to include. For a structured comparison, Python's `cryptography` package can read the extension without parsing human-oriented OpenSSL output:

```python
from pathlib import Path
from cryptography import x509

certificate = x509.load_pem_x509_certificate(Path("leaf.pem").read_bytes())

try:
    extension = certificate.extensions.get_extension_for_class(
        x509.SubjectAlternativeName
    )
    actual = {
        name.lower()
        for name in extension.value.get_values_for_type(x509.DNSName)
    }
except x509.ExtensionNotFound:
    actual = set()

required = {
    line.strip().lower()
    for line in Path("required-dns-san-entries.txt").read_text().splitlines()
    if line.strip() and not line.lstrip().startswith("#")
}

missing = sorted(required - actual)
unexpected = sorted(actual - required)
partial_or_misplaced_wildcards = sorted(
    name
    for name in actual
    if "*" in name and (name.count("*") != 1 or not name.startswith("*."))
)

if missing or unexpected or partial_or_misplaced_wildcards:
    print(f"missing DNS SAN entries: {missing}")
    print(f"unexpected DNS SAN entries: {unexpected}")
    print(
        "partial or misplaced wildcard DNS SAN entries: "
        f"{partial_or_misplaced_wildcards}"
    )
    raise SystemExit(1)
```

Decide whether unexpected entries are fatal. In tightly controlled production PKI they often should be, because a certificate that names an unintended service has a larger impersonation scope. During a planned migration, version the accepted old and new sets and give the overlap an expiration date.

Internationalized names should be stored and compared in ASCII form, with every U-label converted to its corresponding A-label. DNS case is not significant, and both inventory entries and certificate DNS SAN entries should omit the trailing root dot. The checker does not strip that dot because doing so would hide a nonconforming issued entry.

## Probe Each Hostname, Not Just the Certificate Once

The same certificate file can be correct while DNS, SNI routing, or deployment is wrong for one SAN. Configure the strict TLS module in the Blackbox Exporter's `blackbox.yml`:

```yaml
modules:
  tls_certificate:
    prober: tcp
    timeout: 10s
    tcp:
      tls: true
      tls_config:
        insecure_skip_verify: false
```

Then add every expected hostname as its own target in Prometheus's `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: multidomain-tls
    metrics_path: /probe
    params:
      module: [tls_certificate]
    static_configs:
      - targets:
          - api.example.com:443
          - login.example.com:443
          - uploads.example.com:443
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter.monitoring.svc:9115
```

With verification enabled, the absence of any DNS SAN that covers the probed hostname causes `probe_success` to become `0` for that hostname. One successful probe against `api.example.com` does not test `login.example.com`'s own DNS and SNI path. `probe_ssl_last_chain_info` exposes the leaf's DNS SANs in its comma-separated `subjectalternative` label, but that label is not a per-host deployment check.

Probe application URLs separately when HTTP routing matters. A certificate can cover the name while the corresponding virtual host returns the wrong tenant or redirects elsewhere.

## Validate Before and After Renewal

Use this rollout sequence:

1. Generate the renewal request from the owner-reviewed required SAN set.
2. Inspect the issued certificate before deployment.
3. Run both functional hostname checks and exact-set comparison.
4. Verify key pairing and the full intermediate chain.
5. Deploy to a canary termination point.
6. Probe every hostname with SNI, then every backend, region, address family, and disaster-recovery location.
7. Confirm expiry, issuer, serial, and expected fingerprint transition.

If multiple hostnames resolve to different TLS infrastructure, fetching the certificate from one hostname is not enough. Each concrete endpoint can lag or use a separate certificate despite an intended shared renewal.

Monitor the expected-host inventory itself. A hostname removed from Prometheus discovery disappears silently unless reconciliation compares the monitored set with DNS, Ingress/Gateway configuration, load-balancer configuration, and the issuance request.

## Official Documentation

- [RFC 9525 TLS service identity and wildcard rules](https://www.rfc-editor.org/rfc/rfc9525.html)
- [RFC 5280 Subject Alternative Name](https://www.rfc-editor.org/rfc/rfc5280.html#section-4.2.1.6)
- [OpenSSL `x509` SAN and hostname checks](https://docs.openssl.org/master/man1/openssl-x509/)
- [OpenSSL 4.0 `X509_check_host` matching behavior](https://docs.openssl.org/4.0/man3/X509_check_host/)
- [OpenSSL `s_client` SNI and verification](https://docs.openssl.org/master/man1/openssl-s_client/)
- [Blackbox Exporter TLS configuration](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)
- [Prometheus multi-target exporter pattern](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Python `cryptography` X.509 reference](https://cryptography.io/en/latest/x509/reference/)

## Conclusion

One successful hostname proves only that one acceptable reference identity matched. Maintain an authoritative expected-host list, run an OpenSSL hostname check for every entry, and enforce the exact SAN issuance policy when additions, omissions, or partial or misplaced wildcard forms matter. Repeat strict SNI probes after deployment so a correct certificate file cannot hide an incomplete rollout or broken virtual host.
