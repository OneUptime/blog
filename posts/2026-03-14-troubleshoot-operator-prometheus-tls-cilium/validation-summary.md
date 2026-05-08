# Validation Summary: Troubleshooting Operator Prometheus TLS Configuration in Cilium Observability

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium Operator Prometheus metrics
- Prometheus and Prometheus Operator ServiceMonitor
- TLS certificates and CA validation
- Kubernetes Secrets, Deployments, Services, and kubectl
- cert-manager and cmctl
- OpenSSL and curl

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Running Prometheus & Grafana documentation, including Operator Prometheus TLS: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Helm reference for `operator.prometheus.tls`: https://docs.cilium.io/en/latest/helm-reference/
- Cilium operator command reference for Prometheus TLS flags: https://docs.cilium.io/en/stable/cmdref/cilium-operator/
- Cilium v1.19.3 Helm chart templates for operator Deployment, Service, ConfigMap, and ServiceMonitor: https://github.com/cilium/cilium/tree/v1.19.3/install/kubernetes/cilium/templates
- Prometheus Operator API reference for ServiceMonitor and TLSConfig fields: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus HTTP API documentation for `/api/v1/targets` and `/api/v1/query`: https://prometheus.io/docs/prometheus/latest/querying/api/
- Kubernetes kubectl reference for `kubectl run`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Secret documentation for mounted Secret behavior: https://kubernetes.io/docs/concepts/configuration/secret/
- cert-manager cmctl reference for manual certificate renewal: https://cert-manager.io/docs/reference/cmctl/
- cert-manager Certificate resource documentation for `renewBefore`: https://cert-manager.io/docs/usage/certificate/
- Local `curl --help all` and `openssl x509 -help` output.

## Issues Found
- The operator TLS mount path and filenames were incorrect. Cilium mounts the Prometheus TLS secret at `/var/lib/cilium/tls/prometheus/` and maps `tls.crt` to `server.crt` and `tls.key` to `server.key`, so the mount inspection commands were updated.
- The ServiceMonitor example used the wrong Cilium service port name and incomplete selector. The snippet now uses port `metrics`, includes the `io.cilium/app: operator` selector label, adds `namespaceSelector`, and keeps the HTTPS TLS configuration.
- The `jsonpath` command for inspecting `tlsConfig` could produce non-JSON output piped to `jq`. It now requests JSON and lets `jq` select `.spec.endpoints[0].tlsConfig`.
- The direct TLS test did not provide a CA and would fail on expected self-signed/private CA setups. The quick diagnostic test now uses `curl -k` explicitly, while the verification section validates with `--cacert`.
- The verification command referenced `/tmp/ca.crt` inside an ephemeral curl pod without mounting or creating that file. It now extracts the CA locally and uses `kubectl port-forward` plus curl `--resolve` to preserve the service DNS name for certificate verification.
- Manual cert-manager renewal was shown as deleting and reapplying the Certificate. It now uses the supported `cmctl renew` command, and `cmctl` was added to the prerequisites when cert-manager is used.
- The post implied cert-manager `renewBefore` could trigger rolling restarts. This was corrected to explain that `renewBefore` controls renewal timing only; pod reloads require a watcher/reloader or rollout.
- The post described “connection refused” as TLS not being enabled. This was corrected to distinguish an unreachable listener from the HTTP-over-HTTPS error typically seen when the endpoint is serving plain HTTP.
- The troubleshooting note about Cilium needing to be compiled with TLS support was replaced with a check for `operator.prometheus.tls.enabled=true`, matching current Cilium configuration.

## Review Notes
The ServiceMonitor CA Secret example assumes the CA certificate is available as `ca.crt` in the same namespace as the ServiceMonitor. In clusters where Prometheus stores trust material in a separate namespace or Secret, the Secret reference should be adjusted to match that deployment.
