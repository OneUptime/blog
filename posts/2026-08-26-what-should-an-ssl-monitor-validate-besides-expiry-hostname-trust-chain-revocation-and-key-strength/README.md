# What Should an SSL Monitor Validate Besides Expiry? Hostname, Trust Chain, Revocation, and Key Strength

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL Monitoring, TLS, X.509, Certificate Validation, Revocation, PKI

Description: Build an SSL monitoring policy that validates hostname, chain trust, revocation evidence, key strength, certificate purpose, and deployment identity—not only expiry.

---

An unexpired certificate can still be unusable or unsafe. It can name the wrong host, chain to an untrusted root, omit an intermediate, be revoked, use a key below policy, lack server-authentication purpose, or belong to the wrong backend.

Expiry is one input to X.509 validation, not a complete TLS health check. A useful monitor evaluates the connection in layers and reports which contract failed.

## Validate the Exact Endpoint Identity

The probe must preserve all identity inputs:

- hostname clients use;
- destination port;
- SNI value sent in the ClientHello;
- DNS or IP address selected;
- IPv4 or IPv6 path;
- HTTP `Host` header where applicable;
- redirect behavior;
- client trust store.

Do not connect to an IP and parse the certificate's common name. Modern service identity is normally expressed through `subjectAltName`, and name matching includes rules for wildcards and reference identifiers. Let a maintained TLS verifier perform the check.

With OpenSSL:

```bash
openssl s_client \
  -connect api.example.com:443 \
  -servername api.example.com \
  -verify_hostname api.example.com \
  -verify_return_error </dev/null
```

`-servername` sends SNI; it does not itself verify identity. `-verify_hostname` configures the hostname check. `-verify_return_error` makes verification errors abort rather than letting `s_client` continue after printing them.

For an IP-address identity, use `-verify_ip` and require an IP SAN. A DNS name that happens to resolve to that address is a different reference identity.

## Validate Trust and the Entire Chain

A chain validator must build a path from the leaf through valid CA certificates to a trust anchor in the monitor's intended trust store. It should check signatures, validity periods, basic constraints, key usage, extended key usage or purpose, critical extensions, name constraints, and algorithm security policy.

For an offline diagnostic with separated files:

```bash
openssl verify \
  -CAfile trusted-roots.pem \
  -untrusted intermediates.pem \
  -verify_hostname api.example.com \
  leaf.pem
```

Use a clean monitor trust store. A developer workstation may have cached intermediates or enterprise roots that normal customers do not. Servers usually should send the necessary intermediates, not the root. Test with the same root program or private-PKI bundle as the client population being represented.

Never make `insecure_skip_verify: true` the production fix for a chain error. It removes hostname and trust guarantees and can turn an interception certificate into a green check.

## Check Both Leaf and Chain Expiry

Record at least:

- leaf `notBefore` and `notAfter`;
- earliest expiry among the presented/verified chain;
- which certificate owns that earliest date;
- remaining lifetime and collection time.

A not-yet-valid certificate can fail immediately after a bad deployment or on a monitor with a skewed clock. An intermediate can expire before the leaf. Synchronize monitor clocks and alert separately on probe failure because expiry metrics may be absent when the handshake cannot be validated.

## Define a Revocation Policy Explicitly

Revocation is not one universal boolean across browsers and TLS libraries. The available mechanisms include Certificate Revocation Lists (CRLs), OCSP queries, stapled OCSP responses, and browser-distributed mechanisms such as CRLSets or CRLite. Network errors can also force a product-specific soft-fail or hard-fail decision.

OpenSSL can request stapled OCSP status:

```bash
openssl s_client \
  -connect api.example.com:443 \
  -servername api.example.com \
  -status </dev/null
```

No stapled response does not by itself mean the certificate is revoked; stapling is optional unless certificate or application policy requires it. A monitor that requires stapling should verify the response signature, certificate status, `thisUpdate`, and `nextUpdate`, and alert separately on missing, stale, unknown, and revoked states.

CRL checks need a valid issuer-signed CRL and freshness checks. OpenSSL verification supports `-crl_check` and `-crl_check_all`; `s_client` can use supplied CRLs and supports CRL distribution-point downloading in current versions. Fetching URLs embedded in an untrusted certificate has egress and server-side request-forgery implications, so restrict targets, protocols, response sizes, destinations, and timeouts.

## Use Current Blackbox Exporter Validation Carefully

A strict HTTPS module can enforce normal hostname and chain validation, a minimum TLS version, and current CRL collection:

```yaml
modules:
  https_full_validation:
    prober: http
    timeout: 15s
    http:
      fail_if_not_ssl: true
      follow_redirects: false
      check_revoked: true
      tls_config:
        insecure_skip_verify: false
        min_version: TLS12
```

When the target URL uses a DNS hostname, the exporter uses that hostname for verification. When targeting an origin IP, set `tls_config.server_name` and the HTTP `Host` header explicitly.

Current blackbox exporter documentation states that `check_revoked` checks certificates against CRLs and emits `probe_ssl_crl_*` metrics. A revoked certificate or unreachable CRL does **not** change `probe_success`; alert on the CRL metrics themselves:

```promql
probe_ssl_crl_revoked{chain_pos="0"} == 1
```

```promql
probe_ssl_crl_stale{chain_pos="0"} == 1
```

```promql
probe_ssl_crl_available{chain_pos="0"} == 0
```

The last expression can mean the leaf has no CRL distribution point or that fetching/verification failed. Route it according to a documented policy and inspect `crl_url` and probe logs. The exporter also exposes `probe_ssl_crl_next_update_timestamp_seconds` and cumulative CRL fetch time for the probe. Confirm these options and metrics exist in the installed exporter version before deploying rules.

CRL monitoring does not reproduce every browser's revocation behavior and is not an OCSP-stapling monitor. Use a browser-compatible probe when the requirement is specifically “what would this browser accept?”

## Enforce Public-Key and Signature Policy

Extract the leaf public key without touching the private key:

```bash
openssl s_client \
  -connect api.example.com:443 \
  -servername api.example.com </dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -text -noout
```

Record:

- public-key algorithm;
- RSA modulus size, or EC algorithm and named curve;
- certificate signature algorithm;
- SPKI SHA-256 hash;
- algorithm and key strength for intermediates as well as the leaf.

For publicly trusted TLS subscriber certificates, the current CA/Browser Forum Baseline Requirements specify at least 2048-bit RSA and permit particular NIST ECDSA curves. Internal PKI and organizational standards can be stricter or use different approved algorithms. Encode the policy by certificate class rather than declaring one global bit threshold.

OpenSSL's verification `-auth_level` can enforce a security level for certificate-chain public keys and signature algorithms, but its levels are OpenSSL policy abstractions. Map them to written organizational requirements and test compatibility before changing production alerts.

Key strength also differs from handshake strength. A strong ECDSA certificate can be served by a listener that accepts an obsolete protocol. Monitor negotiated TLS version and cipher, and periodically enumerate accepted legacy configurations.

## Validate Certificate Purpose and Structure

An SSL monitor should also inspect:

- `basicConstraints`: a leaf should not unexpectedly be a CA;
- `keyUsage` and `extendedKeyUsage`: the certificate must be usable for the intended TLS server role;
- SAN coverage for every required reference hostname;
- critical extensions: unknown critical extensions must fail validation;
- name constraints in issuing CAs;
- signature algorithm and algorithm transitions;
- chain length and unexpected cross-signs;
- Certificate Transparency evidence where public-browser policy requires it;
- exact leaf fingerprint, issuer plus serial, and SPKI identity against deployment policy.

Do not build these checks with regular expressions over `openssl x509 -text` when a maintained X.509 library can parse the certificate. Text output is excellent for diagnosis but fragile as a long-term machine interface.

## Separate Universal Checks from Policy Checks

Use three result classes:

1. **connection validity** — DNS, route, handshake, hostname, time, and chain trust;
2. **security policy** — key strength, signature algorithms, TLS versions, ciphers, revocation behavior, and CT requirements;
3. **deployment identity** — approved fingerprint, issuer, SAN set, SPKI, origin/edge role, and rollout convergence.

This separation makes alerts actionable. “Hostname mismatch” goes to deployment owners; “CRL unavailable” may go to PKI or network teams; “unexpected fingerprint” may be a change-control or incident-response event.

## Official Documentation

- [OpenSSL `s_client` command](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL `verify` command](https://docs.openssl.org/master/man1/openssl-verify/)
- [OpenSSL certificate verification options](https://docs.openssl.org/master/man1/openssl-verification-options/)
- [Prometheus blackbox exporter configuration](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)
- [Prometheus blackbox exporter CRL implementation](https://github.com/prometheus/blackbox_exporter/blob/master/prober/crl.go)
- [RFC 5280: Internet X.509 PKI Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280)
- [RFC 6960: Online Certificate Status Protocol](https://www.rfc-editor.org/rfc/rfc6960)
- [RFC 9525: Service Identity in TLS](https://www.rfc-editor.org/rfc/rfc9525)
- [CA/Browser Forum TLS Baseline Requirements](https://cabforum.org/working-groups/server/baseline-requirements/requirements/)
- [Chromium CRLSets documentation](https://www.chromium.org/Home/chromium-security/crlsets/)

## Conclusion

An SSL monitor should answer whether the endpoint is the right identity, chains to the right trust anchor, is currently valid, meets key and algorithm policy, has acceptable revocation evidence, and serves the approved deployment. Expiry remains essential, but it belongs inside that full validation contract—not in place of it.
