# How to Detect an Incomplete or Expiring Intermediate Certificate Chain Before Clients Fail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TLS, Intermediate CA, Certificate Chain, OpenSSL, Blackbox Exporter, SSL Monitoring

Description: Capture the exact chain a server sends, verify it against controlled trust stores, and alert on missing or expiring intermediates instead of checking only the leaf.

---

A server certificate can have months left while the intermediate that signed it expires next week. A server can also deploy a valid new leaf but omit the intermediate required by clients. Leaf-only checks miss both cases.

The endpoint should normally send the leaf followed by the intermediate certificates needed to reach a root already trusted by the client. The root trust anchor is normally not sent. Chain monitoring therefore needs two views: the exact peer-supplied list and the path a representative client can actually build.

## Capture Exactly What the Server Sends

Use the real SNI name and ask OpenSSL to display the peer list:

```bash
openssl s_client \
  -connect api.example.com:443 \
  -servername api.example.com \
  -showcerts </dev/null
```

OpenSSL documents an important limitation: `-showcerts` prints the certificates as sent by the server, in server order. It is not a verified chain.

To split that output for inspection:

```bash
work_dir=$(mktemp -d)
chmod 700 "$work_dir"
trap 'rm -rf -- "$work_dir"' EXIT

openssl s_client \
  -connect api.example.com:443 \
  -servername api.example.com \
  -showcerts </dev/null >"$work_dir/handshake.txt" 2>"$work_dir/handshake.err"

awk -v directory="$work_dir" '
  /-----BEGIN CERTIFICATE-----/ {
    number++
    file = sprintf("%s/cert-%02d.pem", directory, number)
  }
  file != "" { print > file }
  /-----END CERTIFICATE-----/ { close(file); file = "" }
' "$work_dir/handshake.txt"

for certificate in "$work_dir"/cert-*.pem; do
  echo "== $certificate =="
  openssl x509 -in "$certificate" -noout \
    -subject -issuer -serial -dates -fingerprint -sha256
done
```

`cert-01.pem` should be the leaf. Later files should be intermediates in a useful issuer order. A self-signed public root in the list is usually unnecessary bandwidth, while a leaf-only list often fails on a clean client.

## Verify with a Controlled Trust Store

Do not let a developer workstation's cached intermediates hide a server omission. Start with the same root set a clean client is expected to trust:

```bash
openssl s_client \
  -connect api.example.com:443 \
  -servername api.example.com \
  -verify_hostname api.example.com \
  -verify_return_error \
  -CAfile expected-roots.pem \
  -no-CApath \
  -no-CAstore </dev/null
```

`-verify_return_error` makes a validation failure terminate the command. The `-no-CApath` and `-no-CAstore` options prevent other default trust sources from supplementing the explicit file on current OpenSSL releases.

You can also verify the extracted objects directly. Build an intermediate bundle from every certificate after the leaf, then run:

```bash
: >"$work_dir/intermediates.pem"
for certificate in "$work_dir"/cert-*.pem; do
  if [ "$certificate" != "$work_dir/cert-01.pem" ]; then
    cat "$certificate" >>"$work_dir/intermediates.pem"
  fi
done

verify_options=(
  -CAfile expected-roots.pem
  -no-CApath
  -no-CAstore
  -purpose sslserver
  -verify_hostname api.example.com
  -show_chain
)

if [ -s "$work_dir/intermediates.pem" ]; then
  verify_options+=( -untrusted "$work_dir/intermediates.pem" )
fi

openssl verify "${verify_options[@]}" "$work_dir/cert-01.pem"
```

`-untrusted` supplies chain-building intermediates; it does not make them trust anchors. The conditional omits `-untrusted` when the server supplied only a leaf, allowing verification to report the actual chain-building failure rather than an empty-file parse error.

Repeat with representative public, private, Java, appliance, and operating-system trust stores where your client population differs. Cross-signed intermediates can produce several valid paths, and one path that works on a fully updated workstation does not prove that older managed clients can build one.

## Check Every Presented Certificate's Deadline

Apply the same response window to the entire served list:

```bash
threshold_seconds=$((30 * 24 * 60 * 60))
failed=0

for certificate in "$work_dir"/cert-*.pem; do
  if ! openssl x509 -in "$certificate" -noout -checkend "$threshold_seconds"; then
    openssl x509 -in "$certificate" -noout -subject -issuer -enddate >&2
    failed=1
  fi
done

exit "$failed"
```

This catches an expiring intermediate even when the leaf is newer. Monitor trust anchors from the CA inventory too because roots are normally absent from the handshake.

An extra, obsolete intermediate can also trigger this conservative check. Do not simply suppress it: remove unneeded certificates from the served chain or prove which path each supported client uses.

## Use Blackbox Exporter for Continuous Detection

With verification enabled, a Blackbox TLS probe fails when its Go verifier cannot build a trusted chain. It also exports:

```promql
probe_ssl_earliest_cert_expiry
```

The implementation calculates the earliest `notAfter` among `PeerCertificates`, the list sent by the server. Alerting on:

```promql
probe_ssl_earliest_cert_expiry - time() < 30 * 24 * 60 * 60
```

therefore covers the leaf and every sent intermediate. Pair it with:

```promql
probe_success == 0
```

because a missing, expired, or untrusted intermediate can abort validation and remove the expiry series.

Current Blackbox Exporter also exposes `probe_ssl_last_chain_expiry_timestamp_seconds`, calculated from verified paths. The two gauges answer different questions: the peer-list metric is conservative about everything sent, while the verified-chain metric reflects paths the verifier built. Investigate rather than averaging them when they disagree.

## Test Every TLS Termination Point

A correct CDN edge does not prove that an origin, regional load balancer, IPv6 listener, ingress replica, mail service, or disaster-recovery endpoint serves the same chain. Probe each location with its intended SNI hostname.

During a rotation, allow old and new valid chains only for a bounded rollout window. Record the expected issuer and fingerprints for both, scan every backend, and remove the old chain from the accepted set after convergence.

Do not rely on Authority Information Access fetching to repair the deployment. Client support and network access vary, and a TLS server should provide the intermediates its clients require. A monitor that preloads every intermediate can conceal the exact clean-client failure it is supposed to catch.

## Official Documentation

- [OpenSSL `s_client` and `-showcerts`](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL `verify`, `-untrusted`, and `-show_chain`](https://docs.openssl.org/master/man1/openssl-verify/)
- [OpenSSL certification-path validation](https://docs.openssl.org/master/man1/openssl-verification-options/)
- [RFC 5280 certification paths and CA constraints](https://www.rfc-editor.org/rfc/rfc5280.html)
- [Blackbox Exporter TLS metric calculation](https://github.com/prometheus/blackbox_exporter/blob/master/prober/tls.go)
- [Go TLS peer and verified chain fields](https://pkg.go.dev/crypto/tls#ConnectionState)

## Conclusion

Capture the peer list, verify it with clean and representative trust stores, and check every served certificate's deadline. Alert on both Blackbox's earliest peer-certificate expiry and probe failure. That combination catches a short-lived intermediate, an omitted intermediate, and a chain that works only because one monitor has more cached trust material than real clients.
