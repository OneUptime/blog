# Validation Summary: Fix Knative Readiness Failures Caused by the Wrong Container Listening Port

## Status
validated

## Post Type
Troubleshooting guide with shell commands, a Python diagnostic server, and a Knative Service manifest.

## Technologies Covered
- Knative Serving, Revisions, queue-proxy, and multi-container probing
- Kubernetes and kubectl
- Python standard library HTTP servers and environment variables
- Dockerfile port metadata
- HTTP readiness probes and TCP listeners

## Sources Consulted
- [Knative runtime contract](https://github.com/knative/specs/blob/main/specs/serving/runtime-contract.md) — request listener and injected PORT contract.
- [Knative Serving API constants](https://pkg.go.dev/knative.dev/serving/pkg/apis/serving/v1#pkg-constants) — DefaultUserPort is 8080.
- [Knative probe configuration](https://knative.dev/docs/serving/services/configure-probing/) — manifest structure, separate probe ports, and queue-proxy readiness handling.
- [Knative multiple-container features](https://knative.dev/docs/serving/configuration/feature-flags/#multiple-containers) — single request-serving container and multi-container-probing feature.
- [Knative Service CRD](https://github.com/knative/serving/blob/main/config/core/300-resources/service.yaml) — serving.knative.dev/v1, ksvc alias, and container/probe fields.
- [Knative Revision documentation](https://knative.dev/docs/serving/revisions/) — immutable configuration snapshots and template changes.
- [Knative application debugging](https://knative.dev/docs/serving/troubleshooting/debugging-application-issues/) — Revision conditions and generated pod inspection.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — namespace, label selection, and YAML output options.
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) — selecting a named container in a pod.
- [Dockerfile EXPOSE reference](https://docs.docker.com/reference/dockerfile/#expose) — declared port metadata does not start an application listener.
- [Python http.server reference](https://docs.python.org/3/library/http.server.html) — ThreadingHTTPServer, BaseHTTPRequestHandler, response methods, and production-use limitations.
- [Python os.environ reference](https://docs.python.org/3/library/os.html#os.environ) — reading runtime environment variables.
- [Google Cloud Knative serving container contract](https://docs.cloud.google.com/kubernetes-engine/enterprise/knative-serving/docs/reference/container-contract) — wildcard binding and configured request ports.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The code, CLI options, manifest, and linked technical resources are consistent with the official references checked.
- Executed the exact Python snippet locally with an injected PORT on an available test port. Confirmed HTTP 200 with the expected bodies for /ready and /. The process was terminated after the check. The code also passed Python compilation.
- Reviewed YAML structure and field values against the official Knative probe example and Service CRD. A YAML parser was not available locally; no cluster deployment or server-side admission validation was performed.
- The example namespace, pod name, container name, and image must match the reader's deployment. The app container name matches the supplied manifest; the image is explicitly a placeholder.
- Separate management-port readiness probes are supported by current Knative Serving documentation even though the older runtime specification describes a stricter probe-port contract. The post correctly cites the implementation documentation for this behavior.
- Sidecar probing depends on the installed feature configuration, as the post states. No deprecated API usage was identified.
- Connection-refused, HTTP 404, and timeout descriptions are diagnostic clues, not exhaustive diagnoses. A Service with explicitly pinned or split traffic should be checked to ensure test requests reach the new Revision.
- Python http.server remains suitable for this diagnostic example, not production serving, as the post already explains.
