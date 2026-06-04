# Validation Summary: How to Set Up Kubernetes Audit Sink for Real-Time Audit Event Streaming

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes audit logging
- kube-apiserver audit webhook backend
- Kubernetes audit policy configuration
- Go HTTP services
- Elasticsearch Go client
- Falco k8saudit plugin
- PrometheusRule alerting
- OpenSSL TLS certificates

## Sources Consulted
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes removed feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes audit configuration API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Falco Kubernetes Audit Events documentation: https://falco.org/docs/concepts/event-sources/plugins/kubernetes-audit/
- Falco Helm chart k8saudit values: https://raw.githubusercontent.com/falcosecurity/charts/master/charts/falco/values-k8saudit.yaml
- Elastic Go client package reference: https://pkg.go.dev/github.com/elastic/go-elasticsearch/v8
- Elastic Go client esapi package reference: https://pkg.go.dev/github.com/elastic/go-elasticsearch/v8/esapi

## Issues Found
- The post used the removed Kubernetes `DynamicAuditing` feature gate and `auditregistration.k8s.io/v1alpha1` `AuditSink` resources. Replaced the tutorial with the supported kube-apiserver audit webhook backend using `--audit-webhook-config-file`, webhook batching flags, and a kubeconfig.
- The TLS example generated a certificate with only a Common Name. Modern TLS verification requires SANs, so I changed the example to create a CA, sign a server certificate with DNS SANs, and reference the CA from the webhook kubeconfig.
- The receiver code dereferenced `event.ObjectRef` without checking for nil. Added a nil guard before logging resource and name.
- The Elasticsearch Go example used `elasticsearch.IndexRequest`, which is not the correct package path. Updated it to import `github.com/elastic/go-elasticsearch/v8/esapi` and use `esapi.IndexRequest`.
- The filtering examples created multiple `AuditSink` resources. Replaced them with audit policy rules and noted that fan-out to multiple destinations should happen in a receiver or downstream collector.
- The Falco integration used legacy-style audit webhook settings. Updated it to use the current Falco `k8saudit` plugin values.
- The Prometheus alert examples used an invalid label selector on `apiserver_audit_error_total` and used `histogram_quantile` on `apiserver_audit_event_total`, which is a counter rather than a histogram. Replaced them with valid audit metric expressions.
- The buffering Go snippet used `log.Printf` without importing `log`. Added the missing import.
- The manual curl test assumed cluster DNS from outside the cluster. Changed it to run the POST test from a temporary in-cluster curl pod.

## Review Notes
- `go` and `kubectl` were not installed in the review environment, so Go compilation and live Kubernetes command validation could not be run locally. The examples were checked against official documentation and package references, and the OpenSSL certificate commands were executed successfully with OpenSSL 3.0.13.
- The audit webhook kubeconfig examples use an empty user because they only configure server TLS verification. Production deployments should consider mutual TLS or another authentication mechanism for the webhook endpoint.
