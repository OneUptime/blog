# Validation Summary: Configure ServiceMonitor Basic Auth Without Secret Newline Errors

## Status

validated

## Post Type

Tutorial / Troubleshooting Guide

## Technologies Covered

- Prometheus
- Prometheus Operator and the `ServiceMonitor` CRD
- Kubernetes Secrets and `SecretKeySelector`
- kubectl
- HTTP Basic Authentication
- YAML scalar and block-chomping behavior
- Base64 and Python 3 diagnostics
- curl and netrc credential handling

## Sources Consulted

- RFC 7617, The Basic HTTP Authentication Scheme: https://www.rfc-editor.org/rfc/rfc7617.html
- RFC 9110, HTTP Semantics (`401`, `403`, and `404`): https://www.rfc-editor.org/rfc/rfc9110.html
- Prometheus Operator API reference for `Endpoint` and `BasicAuth`: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator CLI reference, including `--watch-referenced-objects-in-all-namespaces`: https://prometheus-operator.dev/docs/platform/operator/
- Prometheus Operator ServiceMonitor troubleshooting and rejection Events: https://prometheus-operator.dev/docs/platform/troubleshooting/
- Prometheus Operator source snapshot from 2026-08-24: [Secret loading](https://github.com/prometheus-operator/prometheus-operator/blob/1e00daf4e101cbbac959c36f343cc690f6a1aab0/pkg/assets/store.go), [configuration generation](https://github.com/prometheus-operator/prometheus-operator/blob/1e00daf4e101cbbac959c36f343cc690f6a1aab0/pkg/prometheus/promcfg.go), [ServiceMonitor validation](https://github.com/prometheus-operator/prometheus-operator/blob/1e00daf4e101cbbac959c36f343cc690f6a1aab0/pkg/prometheus/resource_selector.go), [HTTP authentication validation](https://github.com/prometheus-operator/prometheus-operator/blob/1e00daf4e101cbbac959c36f343cc690f6a1aab0/pkg/apis/monitoring/v1/http_config.go), and [Secret watch behavior](https://github.com/prometheus-operator/prometheus-operator/blob/1e00daf4e101cbbac959c36f343cc690f6a1aab0/pkg/prometheus/server/operator.go)
- Prometheus scrape and HTTP client configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Common Basic Auth transport implementation: https://github.com/prometheus/common/blob/main/config/http_config.go
- Kubernetes, Managing Secrets using kubectl: https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-kubectl/
- Kubernetes Secret types and Basic Authentication Secret: https://kubernetes.io/docs/concepts/configuration/secret/#basic-authentication-secret
- Kubernetes Secret API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/secret-v1/
- Kubernetes validation for `kubernetes.io/basic-auth`: https://github.com/kubernetes/kubernetes/blob/0edccb5d3e0c3a2efa310d7a2f1725b2a201e5ee/pkg/apis/core/validation/validation.go#L7464-L7471
- kubectl references for `create secret generic`, `get`, and Event field selectors: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/, https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- YAML 1.2.2 scalar styles and block chomping: https://yaml.org/spec/1.2.2/
- Python `base64.b64decode` strict validation: https://docs.python.org/3/library/base64.html#base64.b64decode
- curl command-line credential and netrc guidance: https://curl.se/docs/manpage.html, https://curl.se/libcurl/security.html

## Issues Found

- The opening described Basic Auth as encoding the exact bytes of `username:password`. RFC 7617 defines a character-to-octet conversion and prohibits control characters, including carriage return and line feed. The text now describes the octet sequence accurately and makes the no-trimming behavior specific to Prometheus Operator.
- The Secret creation examples could be read as safe ways to substitute a real password directly, even though single quotes only prevent shell expansion. A real `--from-literal` value can appear in shell history and process arguments, and a literal passed to `printf` can remain in history. Added a warning to use an approved secret manager or protected input workflow when that exposure is unacceptable.
- The declarative Secret used plain YAML scalars and recommended plain or quoted one-line values. Arbitrary credentials can trigger plain-scalar type resolution or syntax. The values are now single-quoted, embedded single-quote handling is documented, and the `|-` explanation now correctly notes that it removes the final line break and trailing empty lines.
- The Secret type explanation implied that `kubernetes.io/basic-auth` validates the complete username/password structure. Kubernetes currently requires at least one conventional key and does not validate the credential values or require both keys. The text now states that limitation and explains that this ServiceMonitor explicitly resolves both keys.
- The ServiceMonitor omitted `scheme`, which makes Prometheus use `http` by default. Because Basic Auth does not protect credentials in transit, the post now calls for `https` and an appropriate `tlsConfig` unless the transport is otherwise protected.
- The original JSONPath/Base64 diagnostic could print a successful-looking zero-byte result when the Secret lookup or key lookup failed. It now parses the complete Secret JSON in Python, requires the `password` key, and performs strict Base64 validation so missing or malformed input fails instead of being mistaken for an empty credential.
- The troubleshooting table overstated HTTP status meanings: `403` does not prove credentials were accepted, a timeout does not exclude a slow authentication backend, and `404` or an absent target can have additional causes. The rows and the active-target `401` explanation now follow RFC 9110 and account for redirects and intermediaries.
- The rotation section stated unconditionally that every referenced Secret update causes reconciliation. Current Prometheus Operator watches referenced Secrets only within its configured watch scope; cross-namespace ServiceMonitors can require `--watch-referenced-objects-in-all-namespaces` and corresponding RBAC. The rotation guidance now includes that condition.

## Review Notes

The current `monitoring.coreos.com/v1` ServiceMonitor fields, Secret selector namespace behavior, authentication-method mutual exclusion, and rejection Event workflow were verified against Prometheus Operator v0.93.1-era documentation and source. `bearerTokenSecret` is deprecated in favor of `authorization`, but mentioning it only as a mutually exclusive field remains correct. The `prometheus: platform` label and `port: metrics` value are deployment-specific and must match the Prometheus selector and the selected Service's named port.

All YAML blocks parsed successfully, all Bash blocks passed `bash -n`, the literal Secret command passed a kubectl client-side dry run, and the revised diagnostic was checked with valid, missing-key, and invalid-Base64 inputs. All external documentation links in the post returned HTTP 200 during review.
