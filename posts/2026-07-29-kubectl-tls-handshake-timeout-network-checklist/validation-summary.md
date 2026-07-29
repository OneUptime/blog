# Validation Summary: Why Does `kubectl` Fail with `TLS handshake timeout`? A Network-Path Checklist

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes
- `kubectl`
- kubeconfig
- Kubernetes API server and control plane
- TLS and X.509 certificates
- OpenSSL
- DNS and TCP diagnostics
- HTTP/HTTPS proxies
- VPNs, firewalls, and load balancers
- Path MTU discovery and packet-loss diagnosis
- Go `net/http` transport

## Sources Consulted
- [Kubernetes: Troubleshooting kubectl](https://kubernetes.io/docs/tasks/debug/debug-cluster/troubleshoot-kubectl/)
- [Kubernetes: Organizing Cluster Access Using kubeconfig Files](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/)
- [Kubernetes: kubeconfig (v1) API reference](https://kubernetes.io/docs/reference/config-api/kubeconfig.v1/)
- [Kubernetes: kubectl config view](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/)
- [Kubernetes: kubectl options](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_options/)
- [Kubernetes: API health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [Kubernetes client transport defaults](https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/apimachinery/pkg/util/net/http.go)
- [Go `net/http` package and `Transport`](https://pkg.go.dev/net/http#Transport)
- [OpenSSL 3.6 `s_client` documentation](https://docs.openssl.org/3.6/man1/openssl-s_client/)
- [RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446.html)
- [RFC 9293: Transmission Control Protocol (TCP)](https://www.rfc-editor.org/rfc/rfc9293.html)
- [RFC 2923: TCP Problems with Path MTU Discovery](https://www.rfc-editor.org/rfc/rfc2923.html)

## Issues Found
1. **The SNI guidance did not account for kubeconfig's `tls-server-name` override.** The original instructions always used the API URL hostname as the OpenSSL SNI name. Kubernetes can instead configure `tls-server-name`, which client-go uses for SNI and server-certificate validation. Added a command to inspect that field and clarified which name to use.
2. **The OpenSSL probe could be mistaken for kubectl-equivalent certificate validation.** `openssl s_client -servername ...` sends SNI but does not, by itself, enable hostname verification or load the CA configured in kubeconfig. It also normally continues after certificate verification errors unless `-verify_return_error` is supplied. Clarified that this command is a handshake-response probe and revised the interpretation guidance accordingly.
3. **The proxy inspection instructions incorrectly claimed not to print credentials.** Proxy environment variables and kubeconfig `proxy-url` values can contain URL user information, including passwords. Reworded the instruction and added a warning to redact those values before sharing.
4. **The certificate-section heading implied that certificate validation occurs only after a completed TLS handshake.** Certificate authentication and verification are part of the TLS handshake. Changed the heading from “After the Handshake Works” to “After the TLS Endpoint Responds.”

## Review Notes
- The remaining `kubectl` commands and flags were checked against current Kubernetes documentation and locally smoke-tested with `kubectl` v1.34.1. The JSONPath expressions for `server`, `tls-server-name`, and `proxy-url`, `--minify`, `--flatten`, `--raw`, `--request-timeout`, verbosity, and `get --raw` are valid.
- The post correctly distinguishes a TLS handshake timeout from explicit X.509 verification failures and correctly avoids recommending `--insecure-skip-tls-verify`.
- The `/healthz` deprecation, `/livez` and `/readyz` meanings, verbose-output caveat, and HTTP-status guidance match current Kubernetes documentation.
- Go's current `http.DefaultTransport` sets a 10-second TLS handshake timeout, and Kubernetes transport defaults inherit that value when unset. The post appropriately avoids presenting that value as a universal threshold for every kubectl version or custom transport.
- The MTU discussion is consistent with RFC 2923: a small TCP handshake can succeed while larger packets encounter a PMTU black hole and eventually time out.
- `openssl s_client` does not automatically follow kubectl's kubeconfig or environment proxy selection. Its direct-path behavior is useful for isolation, but results should be interpreted alongside the dedicated proxy checks in the post.
