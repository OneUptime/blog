# Validation Summary: How to Monitor TLS Certificates Inside Kubernetes Secrets Before They Reach an Ingress

## Status
validated

## Post Type
Technical guide / operational tutorial

## Technologies Covered
- Kubernetes `kubernetes.io/tls` Secrets
- Kubernetes Ingress (`networking.k8s.io/v1`)
- Kubernetes RBAC and validating admission
- Kubernetes Gateway API
- `kubectl`
- Bash and `jq`
- OpenSSL and X.509 certificates
- TLS service identity matching (RFC 9525)
- cert-manager `Certificate` resources and controller metrics
- Prometheus and PromQL
- kube-state-metrics

## Sources Consulted
- Kubernetes TLS Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets
- Kubernetes Ingress TLS API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/#ingresstls
- Kubernetes RBAC documentation and default user-facing roles: https://kubernetes.io/docs/reference/access-authn-authz/rbac/#user-facing-roles
- Kubernetes RBAC good practices for Secret `get`, `list`, and `watch`: https://kubernetes.io/docs/concepts/security/rbac-good-practices/#listing-secrets
- Kubernetes admission controller documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes API server CEL libraries: https://pkg.go.dev/k8s.io/apiserver/pkg/cel/library
- Kubernetes Gateway API TLS guide: https://gateway-api.sigs.k8s.io/guides/user-guides/tls/
- Kubernetes Gateway API `ReferenceGrant` documentation: https://gateway-api.sigs.k8s.io/reference/api-types/#referencegrant
- `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- jq manual for `-e`, `-r`, optional iteration, `@tsv`, and `error`: https://jqlang.org/manual/v1.7/
- GNU Bash pipeline and `pipefail` behavior: https://www.gnu.org/software/bash/manual/html_node/Pipelines.html
- GNU Bash command-substitution and assignment status behavior: https://www.gnu.org/software/bash/manual/html_node/Simple-Command-Expansion.html
- OpenSSL `x509` command documentation: https://docs.openssl.org/3.6/man1/openssl-x509/
- OpenSSL `pkey` command documentation: https://docs.openssl.org/3.6/man1/openssl-pkey/
- OpenSSL Base64/`enc` documentation: https://docs.openssl.org/master/man1/openssl-enc/
- OpenSSL `X509_check_host` behavior: https://docs.openssl.org/3.6/man3/X509_check_host/
- RFC 9525, Service Identity in TLS: https://www.rfc-editor.org/rfc/rfc9525.html
- cert-manager Prometheus documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager certificate metric collector: https://github.com/cert-manager/cert-manager/blob/master/internal/collectors/certificate_collector.go
- cert-manager 1.18 release notes for the not-after metric: https://cert-manager.io/docs/releases/release-notes/release-notes-1.18/#v1180
- Prometheus operator precedence and binary operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus `time()` function: https://prometheus.io/docs/prometheus/latest/querying/functions/#time
- kube-state-metrics Secret metric reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/secret-metrics.md
- kube-state-metrics Secret collector implementation: https://github.com/kubernetes/kube-state-metrics/blob/main/internal/store/secret.go

## Issues Found
- The post fetched the Secret three times, so a renewal between requests could combine `tls.crt` and `tls.key` from different resource versions and report a false mismatch. Changed the workflow to fetch one mode-600 JSON snapshot inside the private temporary directory and decode both fields from it.
- Several shell pipelines did not explicitly act on upstream failures. Added `pipefail` and checked error paths around Secret retrieval, structural validation, Base64 decoding, host inventory generation, and public-key derivation.
- The public-key comparison could falsely succeed when both derivation pipelines failed: `openssl dgst` could hash empty input twice, producing equal values even though `pipefail` made the ignored assignments nonzero. Wrapped both assignments in checked conditionals and added `openssl pkey -check` with non-interactive passphrase handling.
- `openssl x509 -checkend` checks `notAfter`, not `notBefore`. Narrowed the broad “certificate dates” and malformed-PEM claims to the checks actually performed and added an explicit future-`notBefore` caveat.
- `openssl x509 -checkhost` falls back to the subject Common Name when no DNS SAN is present, so the original command did not reliably detect SAN loss. Added a DNS SAN guard before hostname checks.
- OpenSSL's default hostname matcher can accept partial-label wildcards, while RFC 9525 permits a wildcard only as the complete left-most label. Reworded the wildcard claim and documented the need for a separate RFC 9525/client-equivalent policy when private issuers can create partial wildcards.
- The Ingress pipeline silently skipped a matching `spec.tls[]` entry when optional `hosts` was absent, and the loop ran in a pipeline subshell. Changed the jq filter to reject omitted/empty hosts, wrote a checked TSV inventory, and ran the validation loop from redirected input so `exit 1` exits the gate itself.
- “Namespace-scoped service account” could imply that a ServiceAccount's API permissions are inherently confined to its namespace. Replaced it with explicit guidance to use a dedicated ServiceAccount plus a namespace-limited Role and RoleBinding.
- A built-in CEL `ValidatingAdmissionPolicy` cannot parse X.509 certificates or verify key pairs. Changed the recommendation to a validating webhook or a policy engine with X.509 parsing support.
- kube-state-metrics does not expose arbitrary Secret labels by default; `kube_secret_labels` is controlled by `--metric-labels-allowlist`. Changed “labels” to “allowlisted labels.”
- Corrected the Kubernetes Ingress documentation fragment to the direct `#ingresstls` anchor and added the authoritative OpenSSL hostname-matching and RFC 9525 references.

## Review Notes
- The corrected Bash and jq snippets pass syntax checks. The OpenSSL key, expiry, DNS SAN, and hostname paths were exercised locally with OpenSSL 3.6.2; RSA, EC, and Ed25519 SubjectPublicKeyInfo comparisons were also verified.
- `certmanager_certificate_not_after_timestamp_seconds` is present in current cert-manager and was introduced in cert-manager 1.18. The post correctly tells readers to confirm metric availability in their deployed release.
- The PromQL expression is valid and filters zero timestamps while selecting certificates that expire within 30 days, including certificates that are already expired.
- The stored-state checks intentionally do not validate the certificate trust path or every trailing intermediate in `tls.crt`. They also do not prove that an Ingress replica has reloaded the Secret; the post correctly retains a live SNI probe after rollout.
- All referenced URLs were checked and were reachable at review time.
