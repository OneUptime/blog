# Why Blackbox Exporter Reports x509: Certificate Signed by Unknown Authority: Monitoring Private CAs Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Blackbox Exporter, Prometheus, Private CA, X.509, TLS, Certificate Monitoring

Description: Diagnose unknown-authority failures and configure an explicit, minimal private trust bundle without disabling chain or hostname verification.

---

`x509: certificate signed by unknown authority` means the verifier could not build a valid path from the presented leaf certificate to a configured trust anchor. A private root is one possible cause, but not the only one. The same message can result from a missing intermediate, the wrong SNI certificate, the wrong CA generation, or a Blackbox Exporter container whose public trust store is absent or outdated.

The safe solution is to identify the intended trust domain and give that probe the correct authenticated root. `insecure_skip_verify` is not a private-CA configuration.

## Reproduce the Failure Outside Blackbox Exporter

First test the exact name, port, and trust bundle from the same network as the exporter:

```bash
openssl s_client \
  -connect api.internal.example:443 \
  -servername api.internal.example \
  -verify_hostname api.internal.example \
  -verify_return_error \
  -showcerts </dev/null
```

Then repeat with the private root obtained through an authenticated configuration channel:

```bash
openssl s_client \
  -connect api.internal.example:443 \
  -servername api.internal.example \
  -verify_hostname api.internal.example \
  -verify_return_error \
  -CAfile production-root-ca.pem \
  -showcerts </dev/null
```

The second command should finish with `Verify return code: 0 (ok)`. Do not rely on the text alone without `-verify_return_error`: `s_client` normally continues after verification errors because it is a diagnostic client.

Compare the served chain carefully. `-showcerts` displays certificates exactly as the server sent them; it does not prove that the displayed list is a verified chain.

## Classify the Actual Cause

Use this order because it preserves useful failures:

1. **Wrong SNI:** confirm `-servername` names the intended virtual service. A default listener certificate may chain to a different private CA.
2. **Missing intermediate:** configure the server to present its leaf followed by the required intermediate certificates. Do not make every monitor trust that intermediate merely to hide an incomplete deployment.
3. **Wrong root generation:** compare the root's SHA-256 fingerprint with the value distributed by the CA owner.
4. **Private root not configured:** add that root to a dedicated Blackbox module.
5. **Public root store problem:** test a known public site from the exporter image and inspect how its operating-system CA bundle is built and updated.
6. **Other validation failure:** expired certificates, invalid key usage, name constraints, and hostname mismatches require their own fixes; do not collapse them into “private CA.”

Inspect the proposed trust anchor before deployment:

```bash
openssl x509 -in production-root-ca.pem -noout \
  -subject -issuer -serial -dates -fingerprint -sha256

openssl x509 -in production-root-ca.pem -noout -text |
sed -n '/Basic Constraints/,+2p'
```

Verify the fingerprint out of band. Never download a root from the same unauthenticated endpoint and immediately use it to authenticate that endpoint.

## Configure a Dedicated Private-CA Module

Mount the PEM-encoded public CA certificate into the exporter and reference it with `ca_file`:

```yaml
modules:
  private_ca_https:
    prober: http
    timeout: 10s
    http:
      method: GET
      fail_if_not_ssl: true
      tls_config:
        ca_file: /etc/blackbox-exporter/trust/production-root-ca.pem
        insecure_skip_verify: false
```

Probe a hostname URL so the name is used for SNI and verification:

```yaml
scrape_configs:
  - job_name: private-ca-https
    metrics_path: /probe
    params:
      module: [private_ca_https]
    static_configs:
      - targets:
          - https://api.internal.example/health
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter.monitoring.svc:9115
```

If the TCP destination must be an IP or a different DNS name, add `server_name: api.internal.example` to a module dedicated to that identity and set the HTTP `Host` header when the application also uses virtual hosting.

The Prometheus common TLS implementation creates a new root pool when `ca_file` is configured. It does not append that file to the system pool. A module that needs both public and private roots therefore needs a deliberately constructed bundle containing every accepted root, or, preferably, separate modules for separate trust domains. Separate modules reduce accidental trust expansion.

## Keep Intermediates Out of the Trust Decision

A normal server chain is:

```text
served by endpoint: leaf -> intermediate(s)
configured in monitor: root trust anchor
```

Putting a missing server intermediate into `ca_file` may make the monitor green while ordinary clients still fail. Configure the endpoint's full chain and keep the monitor's bundle focused on intended trust anchors. There are legitimate private PKIs that intentionally trust an intermediate, but that is a policy decision, not a generic repair.

Go's X.509 verifier, which Blackbox Exporter uses through Prometheus's TLS configuration, builds paths from the leaf through provided intermediates to configured roots. Validate with the same minimal root set that real clients are expected to use.

## Rotate Private Roots with an Overlap Window

For a planned root or intermediate migration:

1. Distribute a trust bundle containing the old and new roots.
2. Confirm every exporter instance has loaded that bundle.
3. Deploy new leaf and intermediate chains.
4. Probe every endpoint and network location.
5. Remove the old root only after all old chains and rollback windows are gone.

Alert on trust-bundle deployment failures as well as endpoint failures. A successful probe from one exporter does not prove that every region has received the new root.

Treat the root certificate as public but integrity-sensitive configuration. Never mount the CA private key into a monitor. Restrict writes to the trust bundle, pin image and configuration versions, and audit changes to accepted fingerprints.

## Why Skipping Verification Is Unsafe

This configuration is not an acceptable fix:

```yaml
tls_config:
  insecure_skip_verify: true
```

In Go, it accepts any certificate chain and any hostname presented by the server. A default certificate, self-signed interception certificate, or attacker-controlled certificate can then produce a successful TLS probe and an apparently healthy expiry value.

If you need a temporary reachability diagnostic, create a clearly named, isolated module, keep it out of production alerts, and remove it after diagnosis. The production certificate monitor must validate both the trust chain and identity.

## Use Probe Debug Output Without Leaking Secrets

Blackbox Exporter can return per-probe debug logs:

```bash
curl --silent --show-error --get \
  --data-urlencode 'debug=true' \
  --data-urlencode 'module=private_ca_https' \
  --data-urlencode 'target=https://api.internal.example/health' \
  http://localhost:9115/probe
```

Look for the resolved address, TLS handshake error, redirects, and final target. Do not publish this endpoint broadly: probe parameters can reach internal services, and debug output can reveal topology. Restrict access to the exporter and never place private keys or bearer credentials in target URLs.

## Official Documentation

- [Blackbox Exporter TLS configuration fields](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md#tls_config)
- [Prometheus common TLS configuration implementation](https://github.com/prometheus/common/blob/main/config/http_config.go)
- [Go `crypto/x509` verification](https://pkg.go.dev/crypto/x509#Certificate.Verify)
- [Go `crypto/tls` verification behavior](https://pkg.go.dev/crypto/tls#Config)
- [OpenSSL `s_client` verification options](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL certificate-chain verification](https://docs.openssl.org/master/man1/openssl-verification-options/)

## Conclusion

Unknown-authority errors are evidence that the intended certification path could not be built. Confirm SNI and the served intermediates first, authenticate the correct root out of band, and assign it to a narrowly scoped module. Keep hostname and chain verification enabled so the monitor continues to detect the failures that a private PKI is meant to prevent.
