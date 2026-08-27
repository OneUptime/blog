# Validation Summary: How to Scrape an mTLS Metrics Endpoint with ServiceMonitor `tlsConfig`

## Status

validated

## Post Type

Tutorial / configuration guide

## Technologies Covered

- Prometheus
- Prometheus Operator
- Kubernetes ServiceMonitor resources
- Mutual TLS (mTLS)
- Kubernetes Secrets and ConfigMaps
- OpenSSL
- X.509 certificates and TLS hostname verification

## Sources Consulted

- [Prometheus Operator Endpoint API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Endpoint)
- [Prometheus Operator TLSConfig API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.TLSConfig)
- [Prometheus Operator ServiceMonitor CRD schema](https://github.com/prometheus-operator/prometheus-operator/blob/main/example/prometheus-operator-crd/monitoring.coreos.com_servicemonitors.yaml)
- [Prometheus Operator ServiceMonitor resource selection and TLS asset lookup](https://github.com/prometheus-operator/prometheus-operator/blob/main/pkg/prometheus/resource_selector.go)
- [Prometheus Operator generated TLS configuration and version gates](https://github.com/prometheus-operator/prometheus-operator/blob/main/pkg/prometheus/promcfg.go)
- [Prometheus Operator troubleshooting guidance for rejected resources](https://prometheus-operator.dev/docs/platform/troubleshooting/#debugging-why-monitoring-resource-spec-changes-are-not-reconciled)
- [Prometheus TLS configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#tls_config)
- [Prometheus 2.41 changelog, including private certificate reload support](https://github.com/prometheus/prometheus/blob/v2.41.0/CHANGELOG.md#2410--2022-12-20)
- [Current Prometheus UI routes and labels](https://github.com/prometheus/prometheus/blob/main/web/ui/mantine-ui/src/App.tsx)
- [Go `crypto/tls` package documentation](https://pkg.go.dev/crypto/tls#Config)
- [Kubernetes `kubectl create configmap` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/)
- [Kubernetes `kubectl create secret tls` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/)
- [Kubernetes TLS Secrets documentation](https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets)
- [Kubernetes ConfigMaps documentation](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Kubernetes Secrets security guidance](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)
- [OpenSSL `x509` documentation](https://docs.openssl.org/3.5/man1/openssl-x509/)
- [OpenSSL `s_client` documentation](https://docs.openssl.org/3.5/man1/openssl-s_client/)
- [RFC 6066: TLS Server Name Indication](https://www.rfc-editor.org/rfc/rfc6066.html#section-3)
- [RFC 8446: TLS 1.3 alert messages](https://www.rfc-editor.org/rfc/rfc8446.html#section-6.2)

## Issues Found

- The diagnostic guidance used the older Prometheus UI label **Status > Targets**. The current UI calls the same `/targets` route **Status > Target health**. The post now gives the current label and retains the older label for readers using earlier Prometheus releases.
- The rotation guidance did not distinguish Prometheus 2.35–2.40 from 2.41 and newer. Prometheus 2.41 added detection of changed private certificate files and recreation of the HTTP transport. Earlier supported versions read the client identity on a fresh TLS handshake but do not automatically close existing keep-alive connections when it changes. The post now states the version boundary and recommends a controlled restart on 2.35–2.40 when a timely cutover is required. It also refers precisely to the Operator's generated TLS assets rather than only the generated configuration.

## Review Notes

- The ServiceMonitor manifest is valid against the current Prometheus Operator CRD. The `ca.configMap`, `cert.secret`, direct `keySecret`, `serverName`, and `minVersion` field shapes are correct, and lowercase `scheme: https` is accepted.
- The Prometheus version gates are accurate: `minVersion` requires Prometheus 2.35 or newer, `maxVersion` requires 2.41 or newer, and the accepted values are `TLS10`, `TLS11`, `TLS12`, and `TLS13`. The Operator omits a version-gated field for an older configured Prometheus version, so checking the running version remains important.
- TLS object references are resolved in the ServiceMonitor namespace, while `namespaceSelector` controls only where target Services are discovered. If a Prometheus resource selects this ServiceMonitor across namespaces, automatic reconciliation after credential rotation may additionally require the Operator's `--watch-referenced-objects-in-all-namespaces` option and corresponding RBAC.
- The OpenSSL command verifies a successful handshake from the test location, but success by itself does not prove that the server requires a client certificate. A future enhancement could add a negative-control test without `-cert` and `-key`. Client identities that rely on intermediate certificates may also need OpenSSL's `-cert_chain` or `-build_chain` options.
