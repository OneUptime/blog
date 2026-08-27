# Validation Summary: How to Inventory and Monitor Wildcard Certificates Across Every Deployment Location

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- TLS and X.509 certificates
- Wildcard DNS identities and Server Name Indication (SNI)
- Certificate Transparency
- Kubernetes Secrets, Ingress, Gateway API, and RBAC
- `kubectl`, `jq`, Bash, and OpenSSL
- Prometheus and Blackbox Exporter
- CDN, load-balancer, secret-manager, HSM, and anycast deployment inventories

## Sources Consulted

- [RFC 9525: Service Identity in TLS](https://www.rfc-editor.org/rfc/rfc9525.html), especially [Section 6.3](https://www.rfc-editor.org/rfc/rfc9525.html#section-6.3) and [Section 7.1](https://www.rfc-editor.org/rfc/rfc9525.html#section-7.1)
- [RFC 6066 Section 3: Server Name Indication](https://www.rfc-editor.org/rfc/rfc6066.html#section-3)
- [RFC 9162: Certificate Transparency Version 2.0](https://www.rfc-editor.org/rfc/rfc9162.html)
- [RFC 5280: Internet X.509 PKI Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280.html)
- [RFC 4786 Section 5.1: Anycast Service Distribution](https://www.rfc-editor.org/rfc/rfc4786.html#section-5.1)
- [Kubernetes TLS Secrets](https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets)
- [Kubernetes Ingress v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes authorization request verbs](https://kubernetes.io/docs/reference/access-authn-authz/authorization/#request-verbs-and-authorization)
- [Kubernetes RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes RBAC risks of listing Secrets](https://kubernetes.io/docs/concepts/security/rbac-good-practices/#listing-secrets)
- [Kubernetes authorization webhook mode](https://kubernetes.io/docs/reference/access-authn-authz/webhook/)
- [Gateway API TLS configuration](https://gateway-api.sigs.k8s.io/guides/user-guides/tls/)
- [OpenSSL 3.6 `s_client`](https://docs.openssl.org/3.6/man1/openssl-s_client/), [`x509`](https://docs.openssl.org/3.6/man1/openssl-x509/), and [`enc`/Base64](https://docs.openssl.org/3.6/man1/openssl-enc/) documentation
- [OpenSSL 3.6 `X509_check_host`](https://docs.openssl.org/3.6/man3/X509_check_host/)
- [GNU Bash pipeline semantics](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html)
- [Blackbox Exporter v0.28.0 configuration](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/CONFIGURATION.md) and [HTTP prober implementation](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/http.go)
- [Prometheus metric relabeling configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#metric_relabel_configs)
- [Prometheus multi-target exporter guide](https://prometheus.io/docs/guides/multi-target-exporter/)

## Issues Found

- The Kubernetes Secret pipeline was described as never reading `tls.key`, but an all-namespaces Secret list transfers each returned Secret's complete data to `kubectl` and `jq`. The post now says that the key is not selected, decoded, or printed while clearly warning that private keys are still transferred.
- The Secret example combined `--all-namespaces` with advice to scope the service account by namespace. The post now explains that the shown command requires cluster-wide `list` permission and that namespace-scoped access requires one query per approved namespace with `--namespace <name>`.
- Kubernetes verifies that typed TLS Secrets contain the expected keys but does not validate their values. The loop now checks that `tls.crt` parses as an X.509 certificate and reports `INVALID_CERTIFICATE`; it also states that `Opaque` and controller-specific Secret layouts require separate enumeration.
- The shell pipelines could mask an upstream `kubectl` or `jq` failure. Both Kubernetes examples now enable Bash `pipefail` so automation can detect those failures.
- The Ingress `jq` filter dropped valid Secret references when `spec.tls[].hosts` was absent or empty, and could emit an empty Secret for a TLS entry with no `secretName`. The filter now excludes entries without a Secret reference, preserves hostless references with a blank host column, and still emits one row per configured host.
- The Certificate Transparency wording did not distinguish a submitted precertificate (intent to issue) from a final certificate. It now distinguishes issuance activity or intent to issue and accurately describes CT logs as append-only Merkle trees of submitted certificate and precertificate entries.
- The Blackbox Exporter statement did not account for HTTP redirects. Because current HTTP probes follow redirects by default and certificate metrics describe the final TLS response, the post now requires certificate validation to remain enabled and redirects to be disabled for endpoint-specific certificate monitoring.
- The OpenSSL `s_client | x509` pipeline could print the peer certificate and return an overall zero status after `s_client` failed hostname or chain verification, because the final `x509` process succeeded; stderr was also discarded. The example now captures `s_client` output, stops on its nonzero status, and only then inspects the leaf certificate. The `-checkhost` check is included in the inspection command.
- The trust-store advice incorrectly tied custom roots to private network endpoints. It now instructs readers to add `-CAfile` when the required trust anchor is absent from the default trust store, regardless of endpoint reachability.
- Repeating an anycast IP probe from one scanner cannot enumerate every edge. The post now requires representative network vantage points for anycast services.
- The lifecycle wording could be read as revoking private-key material. It now distinguishes revoking obsolete certificates from destroying obsolete private keys.
- Current Blackbox Exporter releases expose fingerprint and SAN-derived values on `probe_ssl_last_chain_info`, which conflicted with the metric-label guidance. The post now tells readers to drop that metric during ingestion when detailed evidence should stay outside Prometheus.

## Review Notes

- OpenSSL 3.6 hostname matching permits partial-label wildcards by default, while RFC 9525 permits only a complete left-most wildcard label. The post's exact SAN reconciliation and accepted-fingerprint checks remain necessary; `-verify_hostname` or `-checkhost` alone should not be treated as enforcement of the complete RFC 9525 wildcard policy.
- Gateway API `certificateRefs` can require cross-namespace `ReferenceGrant` authorization, and an inventory implementation should reconcile desired references with controller status such as `ResolvedRefs`. The post correctly identifies Gateway API references as an additional feed without prescribing a resolver implementation.
- The Prometheus multi-target exporter guide remains valid for the pattern but uses older Blackbox Exporter examples; current v0.28.0 configuration and source were used to validate redirect, TLS, and metric behavior.
