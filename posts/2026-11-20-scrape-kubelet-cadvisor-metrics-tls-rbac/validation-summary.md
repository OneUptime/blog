# Validation summary

## Sources reviewed

- https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- https://v1-35.docs.kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/
- https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/kubelet/server/auth.go
- https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- https://github.com/prometheus/prometheus/blob/v3.7.3/discovery/kubernetes/node.go
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Checks performed

- ServiceAccount, ClusterRole and ClusterRoleBinding validated against official Kubernetes 1.35 OpenAPI definitions; metrics grant asserted to be get nodes/metrics.
- Prometheus 3.7.3 promtool accepted scrape configuration with token and CA file paths substituted for local fixtures.
- Actual local Prometheus scraped synthetic HTTPS endpoint using certificate verification and the configured metrics/cadvisor path with bearer authorization. Atomic replacement of the credential file was observed without restart.
- Shell snippets passed sh -n; Mermaid six-edge structure checked. Social image generated and visually inspected.

## Limitations

- No Kubernetes API server, kubelet, node discovery, RBAC enforcement, webhook authorization, token audience validation or real token rotation was exercised.
- HTTPS fixture used a locally generated one-day self-signed trust certificate and synthetic bearer strings; static loopback discovery and one-second intervals replaced Kubernetes discovery for runtime testing.
- No production CA rotation or certificate reload test; Mermaid not rendered. No secrets exposed or verification disabled.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
