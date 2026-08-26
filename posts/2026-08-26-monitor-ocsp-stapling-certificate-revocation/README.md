# How to Monitor OCSP Stapling and Certificate Revocation Without Treating notAfter as Enough

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OCSP, Certificate Revocation, TLS, OpenSSL, CRL, SSL Monitoring, Security

Description: Validate stapled and direct revocation status, freshness, signatures, and failure modes alongside ordinary certificate expiry and chain checks.

---

`notAfter` answers when a certificate's scheduled validity ends. It does not answer whether the CA revoked the certificate yesterday after a private-key compromise or misissuance. An expiry-only dashboard can stay green for months after the credential should be rejected.

Revocation monitoring needs policy as well as a query. Decide whether a missing or unreachable status source is a warning, a hard failure, or a fallback to another mechanism. Report “revoked,” “unknown,” “stale,” and “unavailable” separately; they demand different responses.

## Request the Stapled OCSP Response

Ask the server for an in-band status response with the same SNI name users send:

```bash
openssl s_client \
  -connect api.example.com:443 \
  -servername api.example.com \
  -verify_hostname api.example.com \
  -verify_return_error \
  -status </dev/null
```

`-status` requests OCSP stapling and prints the response, if any. By itself, it is a diagnostic display, not a complete automated pass/fail policy. Check at least:

- a response was stapled when policy requires one;
- the OCSP response signature and responder authorization are valid;
- the response applies to the presented leaf and its issuer;
- certificate status is `good`, not `revoked` or `unknown`; and
- `thisUpdate` is not in the future and `nextUpdate` has not passed.

RFC 6960 says a response whose `nextUpdate` is earlier than local time should be considered unreliable. If `nextUpdate` is absent, impose a maximum status age rather than accepting an ancient response forever.

## Use Enforced Staple Checking in OpenSSL 3.6+

OpenSSL 3.6 added `s_client` options that require and validate certificate status:

```bash
openssl version

openssl s_client \
  -connect api.example.com:443 \
  -servername api.example.com \
  -verify_hostname api.example.com \
  -verify_return_error \
  -ocsp_check_leaf </dev/null
```

`-ocsp_check_leaf` implies `-status`. It tries a provided staple first and, if no valid conclusive response is available, can use CRL checking when that is separately enabled; otherwise status checking fails. `-ocsp_check_all` extends the requirement to intermediate certificates excluding the trust anchor, but many deployments cannot provide useful intermediate status. Adopt it only as an intentional, tested policy.

On older OpenSSL releases, use a library or exporter that parses and verifies OCSP responses. Avoid declaring health from a text search for `OCSP Response Status: successful`; that describes the response envelope, not necessarily a fresh `good` status for the leaf.

## Query the CA's OCSP Responder Directly

Stapling validates what the server provides. A direct query helps distinguish a broken server refresh from a CA responder problem. First extract the leaf, its issuer certificate, and the advertised responder URL:

```bash
openssl x509 -in leaf.pem -noout -issuer -serial -ocsp_uri

ocsp_url=$(openssl x509 -in leaf.pem -noout -ocsp_uri)
test -n "$ocsp_url"
```

Then query and verify the response:

```bash
openssl ocsp \
  -issuer issuer.pem \
  -cert leaf.pem \
  -url "$ocsp_url" \
  -CAfile trust-roots.pem \
  -validity_period 300 \
  -status_age 86400 \
  -resp_text
```

`-validity_period` allows limited clock skew. `-status_age` imposes a maximum age when the response lacks `nextUpdate`. The command verifies the responder according to the issuer and configured trust unless unsafe verification-disabling flags are added.

For automation, parse a structured OCSP library result and require the status for the requested certificate to be `good`. Do not assume process exit alone distinguishes `good` from a cryptographically valid `revoked` response. Some public responders have specific nonce and HTTP requirements; follow the CA's documented profile rather than unconditionally adding `-no_nonce` or disabling verification.

## Add CRL Coverage Where the PKI Uses It

Inspect the leaf and intermediate `CRL Distribution Points`, then test with a controlled chain:

```bash
openssl verify \
  -CAfile trust-roots.pem \
  -untrusted issuer.pem \
  -crl_download \
  -crl_check \
  -purpose sslserver \
  leaf.pem
```

`-crl_check` checks the leaf. `-crl_check_all` requires CRL validation throughout the chain and can fail when an issuer does not publish a usable CRL for every level. Monitor CRL signature, `thisUpdate`, `nextUpdate`, fetch success, and the target serial number.

Do not treat OCSP and CRL availability as interchangeable without PKI policy. Private CAs often use one authoritative mechanism, while public clients may soft-fail on network errors. A monitor should still expose responder or CRL outages before clients encounter them.

## Define Stapling Policy Explicitly

A missing staple is not universally a protocol failure. Ordinary certificates often permit clients to continue and check revocation another way. A certificate carrying the RFC 7633 TLS Feature for `status_request`, commonly called Must-Staple, changes that expectation: a compliant server is expected to supply the requested feature.

Classify endpoints:

| Policy | Missing staple | Stale or invalid staple | Revoked status |
| --- | --- | --- | --- |
| Must-Staple | Critical | Critical | Critical |
| Stapling required by internal policy | Critical | Critical | Critical |
| Stapling preferred with direct fallback | Warning plus direct check | Critical or fallback | Critical |
| No OCSP/CRL published by private PKI | Not applicable, document alternative | Not applicable | Use CA inventory/denylist |

Monitor the OCSP responder's reachability from both the checking network and the TLS server's network. The server needs to refresh staples before `nextUpdate`; a healthy responder visible only to the monitor does not prove that refresh can occur.

## Integrate with Prometheus Without Inventing Semantics

`probe_ssl_earliest_cert_expiry` from Blackbox Exporter is an expiry timestamp. It does not, by itself, establish OCSP or CRL status. Keep the existing strict chain, hostname, expiry, and `probe_success` alerts, then add revocation metrics from a checker that actually verifies responses.

A useful status model exposes bounded states or separate gauges for staple presence, cryptographic validity, freshness, and certificate status. Alert immediately on `revoked`; alert separately on `unknown`, stale data, and checker failure. Include the endpoint, SNI name, issuer, serial, `thisUpdate`, and `nextUpdate` in controlled annotations or inventory, not in unbounded free-form metric labels.

Probe every TLS termination point. OCSP staples are server state and can differ across CDN regions or load-balancer replicas even when all nodes serve the same leaf certificate.

## Official Documentation

- [RFC 6960 Online Certificate Status Protocol](https://www.rfc-editor.org/rfc/rfc6960.html)
- [RFC 6066 TLS status request and stapling](https://www.rfc-editor.org/rfc/rfc6066.html#section-8)
- [RFC 7633 TLS Feature and Must-Staple](https://www.rfc-editor.org/rfc/rfc7633.html)
- [RFC 9325 TLS revocation recommendations](https://www.rfc-editor.org/rfc/rfc9325.html#section-7.5)
- [OpenSSL `s_client` OCSP options](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL `ocsp` client](https://docs.openssl.org/master/man1/openssl-ocsp/)
- [OpenSSL CRL verification options](https://docs.openssl.org/master/man1/openssl-verify/)

## Conclusion

Expiry, chain validation, and revocation are separate controls. Require and validate a fresh staple where policy demands it, query the authoritative responder or CRL as a diagnostic fallback, and distinguish revoked status from unavailable status. Continue monitoring `notAfter`, but never interpret it as evidence that the CA still considers the certificate trustworthy.
