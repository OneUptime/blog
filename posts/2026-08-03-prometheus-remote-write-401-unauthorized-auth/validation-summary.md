# Validation Summary: Prometheus Remote Write 401: Basic Auth, Bearer Tokens, and OAuth

## Status
validated

## Post Type
Technical troubleshooting and configuration guide

## Technologies Covered

- Prometheus 3.13 Remote Write sender and receiver
- HTTP Basic authentication
- HTTP Authorization and bearer tokens
- OAuth 2.0 client credentials and JWT bearer grants
- TLS and private certificate authorities
- Kubernetes projected service-account tokens
- Multi-tenant Remote Write headers
- curl, promtool, YAML, and PromQL

## Sources Consulted

- [Prometheus configuration reference (`remote_write`, `http_config`, `oauth2`, and `tls_config`)](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus 3.13.2 configuration schema source](https://github.com/prometheus/prometheus/blob/v3.13.2/docs/configuration/configuration.md)
- [Prometheus 3.13.2 Remote Write queue metric definitions](https://github.com/prometheus/prometheus/blob/v3.13.2/storage/remote/queue_manager.go)
- [Prometheus command-line reference](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [promtool command-line reference](https://prometheus.io/docs/prometheus/latest/command-line/promtool/)
- [Prometheus HTTPS and Basic authentication guide](https://prometheus.io/docs/guides/basic-auth/)
- [Prometheus Exporter Toolkit web configuration schema](https://github.com/prometheus/exporter-toolkit/blob/master/docs/web-configuration.md)
- [Prometheus security model and secret-redaction behavior](https://prometheus.io/docs/operating/security/)
- [Prometheus Remote Write 1.0 retry semantics](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 response and retry semantics](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/#response)
- [Prometheus 3.13.0 changelog](https://github.com/prometheus/prometheus/blob/main/CHANGELOG.md#3130--2026-07-01)
- [prometheus/common v0.69.0 HTTP client implementation](https://github.com/prometheus/common/blob/v0.69.0/config/http_config.go)
- [Kubernetes projected service-account token documentation](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#serviceaccount-token-volume-projection)
- [RFC 9110: HTTP 401 and 403 semantics](https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.2)
- [RFC 7523: JWT profile for OAuth 2.0 grants](https://datatracker.ietf.org/doc/html/rfc7523)
- [curl command-line reference](https://curl.se/docs/manpage.html)

## Issues Found

- The permissions guidance used `chmod 0400` without saying that the file must be owned by the Prometheus runtime account. Clarified the ownership requirement because mode `0400` grants read access only to the owner.
- The post implied that file-backed secrets are needed to keep plaintext passwords out of the Prometheus configuration status page. Prometheus already redacts fields documented as secrets from its HTTP API. Corrected the explanation while retaining the recommendation to protect the on-disk configuration.
- The receiving Prometheus example was described as enabling both Basic authentication and TLS, but the shown snippet only configured `basic_auth_users`. Narrowed the description to Basic authentication.
- The empty-POST diagnostic said a 401 proved rejection occurred before Remote Write decoding. HTTP 401 establishes that acceptable authentication credentials were absent or rejected, but does not prove processing order or identify the responding component. Corrected the claim.
- The redirect statement treated every hostname change as cross-host. Prometheus 3.13 follows Go's host-domain rule and can retain credentials for the same hostname or its subdomains; credentials are stripped once the redirect chain leaves the original host's domain. Corrected the wording and made the 3.13 version boundary explicit.

## Review Notes

Validated against the Prometheus 3.13.2 release. The valid Basic, Authorization, OAuth TLS, and tenant-header snippets passed `promtool check config`; the combined-auth and custom `Authorization` header examples failed validation as described. The web Basic-auth schema passed `promtool check web-config` with a real bcrypt hash. The three PromQL metric names and the `remote_name` label match Prometheus 3.13.2 source. Redirect credential stripping was introduced in 3.13.0, so earlier Prometheus versions do not have the same protection. All links in the post returned HTTP 200 during review.
