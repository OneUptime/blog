# Validation Summary: How to Avoid Common Mistakes with the Calico REST API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico API server and `projectcalico.org/v3` resources
- Kubernetes REST API
- Kubernetes `resourceVersion`, PUT, POST, and watch behavior
- Kubernetes RBAC and `kubectl create clusterrole`
- API Priority and Fairness rate limiting
- Python `requests`
- Kubernetes client libraries

## Sources Consulted
- Kubernetes API Concepts: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes API Priority and Fairness: https://kubernetes.io/docs/concepts/cluster-administration/flow-control/
- Kubernetes Client Libraries: https://kubernetes.io/docs/reference/using-api/client-libraries/
- kubectl create clusterrole reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_clusterrole/
- Calico API server documentation: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Requests advanced SSL verification documentation: https://requests.readthedocs.io/en/master/user/advanced/#ssl-cert-verification
- Requests timeout documentation: https://requests.readthedocs.io/en/master/user/quickstart/#timeouts

## Issues Found
- The post stated that omitting `resourceVersion` always returns `409 Conflict`. Kubernetes documentation specifically ties `409 Conflict` to stale `resourceVersion` values; missing values can be rejected as invalid. Updated the wording to distinguish missing and stale `resourceVersion` behavior.
- The curl JSON examples used `{...}`, which is not valid JSON, and omitted the `Content-Type: application/json` header. Replaced the placeholder bodies with valid `GlobalNetworkPolicy` JSON and added the header.
- The retry section claimed to handle both 429 and 503, but the code only retried 429. Updated the code to retry both status codes and honor `Retry-After` when present.
- The Python retry example disabled TLS verification with `verify=False`. Removed that unsafe setting and added a request timeout.
- The watch example started a watch without first capturing a list `resourceVersion`. Updated it to use the Kubernetes list-then-watch pattern.
- The `kubectl create clusterrole` example used repeated `--resource` flags. The official examples show comma-separated resources, so the command was changed to a single comma-separated resource list.
- The client library recommendation called the Python client `kubernetes-client`, which is the GitHub organization naming, not the package users install. Updated it to the official Kubernetes Python client package name, `kubernetes`.
- The text said `curl` does not handle TLS verification. Since `curl` verifies TLS by default for HTTPS, revised the wording to say curl scripts make it easy to skip TLS verification and lack higher-level Kubernetes client behavior such as pooling, watch reconnects, and retries.

## Review Notes
- The Calico API server currently provides a REST API for `projectcalico.org/v3`, but Tigera documentation notes that the aggregated API server is deprecated and recommends native v3 CRDs for new installations. The post remains technically useful for automation against Kubernetes-style Calico resources.
- Production watch clients should also handle disconnects and `410 Gone` responses. The post now shows the correct list-then-watch starting point, but a full resilient watcher is better implemented with a Kubernetes client library.
