# Validation Summary: How to Send an OAuth2 or Bearer Token from a ServiceMonitor Without Using Forbidden File Paths

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus HTTP client authentication
- Prometheus Operator and the `ServiceMonitor` CRD
- OAuth 2.0 client credentials grant
- Bearer token authorization
- Kubernetes Secrets and RBAC
- Kubernetes Events and `kubectl`
- TLS and mutual TLS

## Sources Consulted

- Prometheus Operator `Endpoint` API — https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Endpoint
- Prometheus Operator `SafeAuthorization` API — https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.SafeAuthorization
- Prometheus Operator `OAuth2` API — https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.OAuth2
- Prometheus Operator arbitrary filesystem access policy — https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ArbitraryFSAccessThroughSMsConfig
- Prometheus Operator v0.93.1 configuration generator — https://github.com/prometheus-operator/prometheus-operator/blob/v0.93.1/pkg/prometheus/promcfg.go
- Prometheus Operator troubleshooting guide for rejected monitoring resources — https://prometheus-operator.dev/docs/platform/troubleshooting/#debugging-why-monitoring-resource-spec-changes-are-not-reconciled
- Prometheus configuration reference for HTTP authorization and OAuth2 — https://prometheus.io/docs/prometheus/latest/configuration/configuration/#oauth2
- Prometheus changelog for versions 2.26.0 and 2.27.0 — https://github.com/prometheus/prometheus/blob/main/CHANGELOG.md#2260--2021-03-31 and https://github.com/prometheus/prometheus/blob/main/CHANGELOG.md#2270--2021-05-12
- Kubernetes `kubectl create secret generic` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes field selector documentation — https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Secret security guidance — https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- RFC 6749, OAuth 2.0 client credentials grant and token endpoint errors — https://www.rfc-editor.org/rfc/rfc6749#section-4.4 and https://www.rfc-editor.org/rfc/rfc6749#section-5.2
- RFC 6750, Bearer token error responses — https://www.rfc-editor.org/rfc/rfc6750#section-3.1

## Issues Found

- The static Bearer-token section omitted the minimum Prometheus version for the `authorization` configuration. Added that `authorization` requires Prometheus 2.26 or newer; Prometheus Operator does not emit the block for older configured versions.
- The OAuth2 wording described the entire feature as a client-credential flow and called its tokens renewable. Current Prometheus supports additional non-interactive OAuth grant configuration, and the OAuth 2.0 client credentials grant normally obtains another access token rather than using a refresh token. Scoped the wording to the configuration shown, used the standard term “client credentials grant,” and described it as fetching access tokens.
- The Event command sorted on the optional core Event field `.lastTimestamp`. Changed it to the always-present `.metadata.creationTimestamp` so rejected-resource Events are ordered reliably across current Event representations.

## Review Notes

- Both ServiceMonitor YAML examples match the current CRD field shapes. The two `kubectl create secret generic` commands were also verified with client-side dry runs.
- The post's Prometheus 2.27 minimum for ServiceMonitor OAuth2 and Prometheus 2.43 minimum for `oauth2.tlsConfig` are correct. The latter is the Prometheus Operator's ServiceMonitor compatibility gate.
- `authorization`, `basicAuth`, `oauth2`, and `bearerTokenSecret` are mutually exclusive during Operator reconciliation. Endpoint TLS client authentication is independent and can be combined with one HTTP authentication method.
- Rejected ServiceMonitors receive warning Events when a selecting Prometheus or PrometheusAgent reconciles them; this is Operator reconciliation behavior rather than Kubernetes API admission.
- The Secret commands contain placeholders and are syntactically correct. In production, putting real values directly in `--from-literal` arguments can expose them through shell history or process inspection, so operators should use an appropriately secured Secret-creation workflow.
