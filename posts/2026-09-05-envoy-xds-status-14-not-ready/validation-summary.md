# Validation Summary: Envoy Data Plane Is Stuck Not Ready: Diagnose xDS gRPC Status 14, DNS, and `initial_fetch_timeout`

## Status

validated

## Post Type

Technical troubleshooting guide with diagnostic commands.

## Technologies Covered

- Istio 1.31, Istiod, pilot-agent, and sidecar injection revisions
- Envoy bootstrap, xDS/ADS, CDS/LDS, initialization, and admin readiness
- gRPC, TLS, service-account authentication, and DNS
- Kubernetes Pods, ephemeral containers, Services, EndpointSlices, and Deployments
- kubectl, istioctl, jq, OpenSSL, netcat, and curl

## Sources Consulted

- Istio diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio CLI reference: https://istio.io/latest/docs/reference/commands/istioctl/
- pilot-agent CLI reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio mesh configuration: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio DNS capture: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio 1.31 xDS proxy implementation: https://github.com/istio/istio/blob/release-1.31/pkg/istio-agent/xds_proxy.go
- Istio 1.31 agent and client certificate selection: https://github.com/istio/istio/blob/release-1.31/pkg/istio-agent/agent.go
- Istio 1.31 bootstrap template: https://github.com/istio/istio/blob/release-1.31/tools/packaging/common/envoy_bootstrap.json
- Istio 1.31 bootstrap metadata construction: https://github.com/istio/istio/blob/release-1.31/pkg/bootstrap/config.go
- Istio 1.31 metadata serialization: https://github.com/istio/istio/blob/release-1.31/pkg/bootstrap/option/convert.go
- Istio 1.31 metadata types: https://github.com/istio/istio/blob/release-1.31/pkg/model/proxy.go
- Istio 1.31 readiness implementation: https://github.com/istio/istio/blob/release-1.31/pilot/cmd/pilot-agent/status/ready/probe.go
- Envoy configuration sources: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/config_source.proto.html
- Envoy initialization: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/init
- Envoy admin endpoints: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- gRPC status codes: https://grpc.io/docs/guides/status-codes/
- Kubernetes Pod debugging: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes logs command: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes port forwarding: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes JSONPath: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes rollout restart: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes Deployment strategies: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- OpenSSL s_client: https://docs.openssl.org/3.5/man1/openssl-s_client/
- OpenBSD netcat options: https://man.openbsd.org/nc
- jq manual: https://jqlang.org/manual/
- curl manual: https://curl.se/docs/manpage.html

## Issues Found

1. **Remote discovery address in bootstrap metadata.** The post incorrectly stated that the bootstrap normally lacks the remote Istiod address. Istio includes the effective ProxyConfig in node metadata. Corrected the explanation to identify `.bootstrap.node.metadata.PROXY_CONFIG.discoveryAddress`, while preserving the distinction between the local ADS socket and pilot-agent's upstream connection. Verified the metadata assignment, JSON serialization, and template insertion in the 1.31 source.
2. **Missing proxy interpreted without query scope.** Qualified the claim that a missing proxy is disconnected: absence applies to the queried Istiod instances. Added context, namespace, and revision checks so querying the wrong control plane does not become a false diagnosis.
3. **Endpoint readiness not visible in the displayed output.** Changed the EndpointSlice command from wide output to YAML so readers can inspect per-endpoint readiness conditions and complete endpoint details as instructed.
4. **Ephemeral container UID assumption.** Replaced the categorical UID statement with a conditional one. An ephemeral container can use a different UID; it does not inherently receive a unique UID. The traffic-capture caveat remains valid.
5. **TLS probe interpretation.** Clarified that setting SNI does not verify the hostname, that the example does not explicitly supply the mesh root CA, and that s_client ordinarily continues after verification errors. A completed diagnostic handshake cannot establish that pilot-agent's trust and SAN validation will succeed.
6. **Restart and rollout semantics.** The original text implied that restarting a Deployment allowed manual verification of every Pod before proceeding. Explained that restart follows the Deployment strategy automatically and can affect the whole Deployment. Made replacement conditional on injection/bootstrap changes and advised checking automatic reconnection first. Specified RollingUpdate and appropriate availability settings for a rolling replacement.
7. **Reconnect counters as an absolute recovery criterion.** Replaced the demand that reconnect counters stop increasing with checking that errors and unexpected reconnects stop recurring. The xDS proxy implementation distinguishes expected stream termination from unexpected errors; normal reconnections alone do not prove an outage.

## Review Notes

- Confirmed the stock 1.31 ADS socket and explicit zero LDS/CDS initial-fetch timeouts against release-specific source. Envoy's generic 15-second default is correctly distinguished from Istio's generated configuration.
- Confirmed normal Kubernetes xDS token credentials and the alternative provisioned/file-mounted client certificate paths. Status 14 is a broad transport/service availability signal; authentication failures can also appear as their own gRPC status, as the post's diagnostic branches recognize.
- Confirmed that the startup readiness probe requires successful CDS and LDS updates, then checks Envoy LIVE state and worker startup. These initial checks are cached after success; readiness alone is not continuous proof of an upstream session.
- Checked command forms, flags, JSON field paths, and cited documentation destinations. The source links were inspected through raw GitHub copies of the same release-1.31 files where browser retrieval failed.
- Shell examples were checked with bash syntax validation. This was a documentation/source review, not a live cluster test: no workload was restarted, debug container created, network probe run against a cluster, or token accessed.
- Sample namespace, Pod name, Service name, port, and cluster DNS suffix must match the environment. Previous logs require a previous container instance. Debug-image availability and admission permissions remain deployment-specific prerequisites.
- The netcat flags match OpenBSD netcat; other implementations and debug images may provide different tooling. The DNS example's image is not an assurance that netcat or OpenSSL is installed.
- Latest documentation and release branches can change. The version-specific conclusions are scoped to the Istio 1.31 source reviewed, rather than all distributions or custom bootstraps.
