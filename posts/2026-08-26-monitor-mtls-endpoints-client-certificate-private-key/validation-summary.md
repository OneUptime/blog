# Validation Summary: How to Monitor mTLS Endpoints with a Client Certificate and Private Key

## Status
validated

## Post Type
Technical Guide / Monitoring Tutorial

## Technologies Covered
- Mutual TLS (mTLS) and X.509 certificates
- Prometheus Blackbox Exporter
- Prometheus scrape and relabel configuration
- OpenSSL `x509`, `pkey`, `dgst`, and `s_client`
- Go `crypto/tls` certificate loading
- Kubernetes Secret volumes and certificate rotation

## Sources Consulted
- [Blackbox Exporter releases](https://github.com/prometheus/blackbox_exporter/releases)
- [Blackbox Exporter v0.28.0 configuration reference](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/CONFIGURATION.md)
- [Blackbox Exporter v0.28.0 HTTP prober implementation](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/http.go)
- [Blackbox Exporter v0.28.0 TLS metric implementation](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/tls.go)
- [Blackbox Exporter v0.28.0 probe handler and retained-log implementation](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/handler.go)
- [Blackbox Exporter v0.28.0 web handlers](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/main.go)
- [Prometheus Common v0.67.4 HTTP/TLS configuration implementation](https://github.com/prometheus/common/blob/v0.67.4/config/http_config.go)
- [Prometheus v3.14.0 release](https://github.com/prometheus/prometheus/releases/tag/v3.14.0)
- [Prometheus multi-target exporter guide](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Go `crypto/tls` documentation](https://pkg.go.dev/crypto/tls)
- [OpenSSL `s_client` documentation](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL `x509` documentation](https://docs.openssl.org/master/man1/openssl-x509/)
- [OpenSSL `pkey` documentation](https://docs.openssl.org/master/man1/openssl-pkey/)
- [OpenSSL `dgst` documentation](https://docs.openssl.org/master/man1/openssl-dgst/)
- [RFC 8446, TLS 1.3, Appendix E.1.2](https://www.rfc-editor.org/rfc/rfc8446.html#appendix-E.1.2)
- [RFC 5280, Extended Key Usage](https://www.rfc-editor.org/rfc/rfc5280.html#section-4.2.1.12)
- [Kubernetes Secret volume update behavior](https://kubernetes.io/docs/concepts/configuration/secret/#using-secrets-as-files-from-a-pod)
- [Kubernetes AtomicWriter implementation](https://github.com/kubernetes/kubernetes/blob/master/pkg/volume/util/atomic_writer.go)

## Issues Found
1. **Key-match script could report a false positive when both inputs failed** - `set -o pipefail` preserved a failed pipeline status but did not stop the script. If both files were unreadable, both final `dgst` processes could hash empty input and the equality test could succeed. Changed it to `set -euo pipefail` so either failed assignment terminates the script.
2. **OpenSSL client-chain guidance was ambiguous** - Extra certificates concatenated into the file passed to `s_client -cert` are not the supported way to supply its client chain. Clarified that `-cert` selects the leaf and required intermediates belong in a separate file passed with `-cert_chain`.
3. **A positive connection did not prove that mTLS was enforced** - OpenSSL sends the configured client certificate only when the server requests one, and TLS permits a server to continue without authenticated client identity. Added a negative control without the client certificate and qualified the later handshake claim.
4. **Redirects could carry the client identity to another host** - Blackbox Exporter follows redirects by default and clears `server_name`, but retains the client TLS configuration, for a cross-host redirect. Added `follow_redirects: false` and clarified that `server_name` controls SNI and hostname verification rather than acting as a credential-use allowlist.
5. **Debug-log exposure was understated** - Current Blackbox Exporter versions retain recent per-probe debug output and expose it through `/logs`, not only through an explicitly debug-enabled probe response. Updated the text to require protection of the exporter web surface.
6. **The client-expiry error message was incomplete** - `openssl x509 -checkend` also returns nonzero for an unreadable or malformed certificate and for a certificate that is already expired. Updated the message to cover those failure modes.
7. **Rotation wording omitted a separate-file read race** - Kubernetes publishes a Secret volume generation atomically, but a process that opens certificate and key paths separately can straddle the swap and transiently load a mismatched pair. Added that caveat and documented that Blackbox Exporter v0.28.0 rereads file-backed TLS material.
8. **The Go API link did not match the exact loader used upstream** - Prometheus Common calls `tls.X509KeyPair`, not `tls.LoadX509KeyPair`. Updated the link while retaining the correct leaf-first chain guidance.

## Review Notes
- The Blackbox module parsed successfully with Blackbox Exporter v0.28.0, the latest stable release at review time.
- The Prometheus scrape configuration parsed successfully with Prometheus v3.14.0, the latest stable release at review time.
- The OpenSSL inspection, public-key comparison, and expiry commands were exercised with OpenSSL 3.6.2; the algorithm-neutral key comparison also passed with an Ed25519 key pair.
- `ca_file` correctly replaces rather than augments the system root pool in Prometheus Common.
- `probe_ssl_earliest_cert_expiry` correctly covers peer certificates presented by the server and does not include the local client certificate chain.
