# Validation Summary: Multi-Container Pod Metrics Vanish Under Strict mTLS: Build a Secure Fan-In Scrape Endpoint

## Status
validated

## Post Type
Technical troubleshooting and implementation guide.

## Technologies Covered
- Istio 1.31 sidecar injection, pilot-agent, Envoy, and metrics merging.
- Prometheus scraping, exposition formats, TLS configuration, and metric identity.
- Kubernetes Pods, Deployment templates, NetworkPolicy, and kubectl.
- Mutual TLS, workload certificates, SPIFFE identities, and cert-manager integration.
- Shell commands, curl, jq, YAML, and JSON.

## Sources Consulted
- Istio 1.31 release notes: https://istio.io/latest/news/releases/1.31.x/announcing-1.31/change-notes/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio secure metrics guide: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio multi-port metrics design: https://github.com/istio/istio/blob/release-1.31/architecture/networking/multi-port-metrics-merging.md
- Istio agent implementation, including parsing, defaults, response limits, and local request checks: https://github.com/istio/istio/blob/release-1.31/pilot/cmd/pilot-agent/status/server.go
- Istio injector implementation: https://github.com/istio/istio/blob/release-1.31/pkg/kube/inject/webhook.go
- Istio Envoy bootstrap template: https://github.com/istio/istio/blob/release-1.31/tools/packaging/common/envoy_bootstrap.json
- Istio annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio PeerAuthentication: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio application requirements and reserved ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio CLI references: https://istio.io/latest/docs/reference/commands/istioctl/ and https://istio.io/latest/docs/reference/commands/pilot-agent/
- Kubernetes Pods: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- kubectl exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- kubectl port-forward: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Prometheus configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus exposition formats: https://prometheus.io/docs/instrumenting/exposition_formats/
- Go TLS certificate verification: https://pkg.go.dev/crypto/tls#Config
- curl options: https://curl.se/docs/manpage.html
- jq manual: https://jqlang.org/manual/

## Issues Found
1. **Incorrect fallback after malformed scrape targets.** The post said that without a legacy port, an invalid multi-target list results in no application target. The injector logs parsing errors and can still serialize remaining legacy scrape settings. With `prometheus.io/scrape: "true"` and no port, the agent defaults to port `80`; an absent path defaults to `/metrics`. Corrected the paragraph to describe this fallback and preserve the legacy-path exception. Verified against `getPrometheusScrapeConfiguration`, `applyPrometheusMerge`, and `NewServer`.
2. **Overstated localhost restriction on port 15020.** The post said both plaintext listeners become unreachable outside the Pod. Envoy binds port `15090` to loopback, but pilot-agent checks the remote address in the metrics handler and returns HTTP `403` for non-local requests. Corrected the explanation so it does not imply that the whole agent listener closes or becomes loopback-bound. Verified against the bootstrap template and `handleStats`.

## Review Notes
- Confirmed the 1.31 introduction of multi-target scraping and native secure metrics ports in official release notes. Reviewed actual release-branch code where the design document alone was insufficient.
- Verified ordered concurrent multi-target collection, the 10 MiB per-response cap, partial-success behavior, aggregate application failure accounting, and lack of metric-family deduplication. The cap applies to the multi-target buffered path; single-target scraping retains the streaming path.
- Checked annotation rewriting, injected target JSON, numeric/reserved-port validation, secure-port discovery, bootstrap-only metadata changes, TLS client-certificate requirements, and certificate export guidance.
- Confirmed that `pilot-agent request` addresses Envoy's admin API, while merged application metrics are served by pilot-agent on port `15020`. Reviewed the documented istioctl listener and describe command forms.
- Confirmed shared Pod networking, workload-port semantics of PeerAuthentication, NetworkPolicy reachability controls, and Prometheus metric-family/series constraints. NetworkPolicies are additive; an existing broad allow policy must not undermine the intended scrape restriction.
- The warning about `insecure_skip_verify` correctly covers both server-chain and hostname verification. Narrow discovery and NetworkPolicy reduce exposure but do not restore cryptographic server identity verification.
- The aggregator image and flags are explicitly schematic, not a runnable implementation. Deployment fragments require the surrounding workload manifest and environment-specific values.
- All shell code blocks passed `bash -n`; all YAML code blocks parsed with PyYAML, including the nested proxy configuration. jq expressions were checked against representative Pod JSON. The post's official documentation links resolved to the intended resources.
- This was a documentation/source and local syntax review. No Kubernetes cluster was used, no workloads were deployed, and mTLS, CNI enforcement, certificate rotation, and exporter failure behavior were not exercised end to end. The canary checks remain deployment-time validation steps.
- Changes were limited to the two technical corrections; the post's structure and examples were retained.
