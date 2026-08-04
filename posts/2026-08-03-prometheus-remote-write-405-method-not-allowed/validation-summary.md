# Validation Summary: Prometheus Remote Write 405: Enable and Route the Receiver Correctly

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Prometheus
- Prometheus Remote Write 1.0 and 2.0
- HTTP status codes and redirects
- Kubernetes and `kubectl`
- Nginx reverse proxying
- PromQL
- `curl`

## Sources Consulted

- [Prometheus command-line flags](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [Prometheus storage and Remote Write receiver endpoint](https://prometheus.io/docs/prometheus/latest/storage/#remote-storage-integrations)
- [Prometheus configuration reference: `remote_write`](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus HTTP API: runtime flags](https://prometheus.io/docs/prometheus/latest/querying/api/#flags)
- [Prometheus 3.0 migration guide](https://prometheus.io/docs/prometheus/latest/migration/)
- [Prometheus Remote Write 1.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus 3.13 changelog](https://github.com/prometheus/prometheus/blob/main/CHANGELOG.md#3130--2026-07-01)
- [Prometheus 3.13.1 receiver routing implementation](https://github.com/prometheus/prometheus/blob/v3.13.1/web/api/v1/api.go)
- [Prometheus 3.13.1 Remote Write queue metrics implementation](https://github.com/prometheus/prometheus/blob/v3.13.1/storage/remote/queue_manager.go)
- [Kubernetes Pods: Pod update and replacement](https://kubernetes.io/docs/concepts/workloads/pods/#pod-update-and-replacement)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Nginx HTTP proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)

## Issues Found

- The post said that editing a controller-generated Pod would be temporary because the controller would replace it. Kubernetes does not permit changing an existing Pod's container arguments. The text now states that container arguments are immutable on an existing Pod and that force-replacing only a generated Pod would not update the operator or Helm chart's source of truth.

## Review Notes

- Validation was performed against Prometheus 3.13.1, the current release on the validation date. The receiver remains disabled by default, and the deprecated `remote-write-receiver` feature flag has been removed; `--web.enable-remote-write-receiver` is the correct flag.
- Prometheus 3.13.1 defaults to accepting the Remote Write 1.0 `prometheus.WriteRequest` message. Remote Write 2.0 remains experimental and requires compatible sender and receiver message configuration; an incompatible message can correctly produce HTTP 415.
- The empty-body `curl` commands are routing diagnostics only. With the receiver enabled, current Prometheus rejects the non-Snappy body with HTTP 400, as the post explains.
