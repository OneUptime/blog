# Validation Summary: Istio Proxy Connects to istiod but Receives No Routes: Compare Configuration Scope, Revisions, and Namespaces

## Status

validated

## Post Type

Technical troubleshooting guide.

## Technologies Covered

- Istio 1.31, Istiod, pilot-agent, and istioctl
- Envoy, xDS, RDS, listeners, routes, clusters, and endpoints
- Istio Sidecar, VirtualService, DestinationRule, ServiceEntry, and Gateway resources
- Kubernetes Services, namespaces, injection labels, kubectl, and Gateway API
- Bash, jq, JSON, and YAML

## Sources Consulted

- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [Istio: istioctl command reference](https://istio.io/latest/docs/reference/commands/istioctl/)
- [Istio: Configuration Scoping](https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/)
- [Istio: Sidecar](https://istio.io/latest/docs/reference/config/networking/sidecar/)
- [Istio: Virtual Service](https://istio.io/latest/docs/reference/config/networking/virtual-service/)
- [Istio: Destination Rule](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [Istio: Service Entry](https://istio.io/latest/docs/reference/config/networking/service-entry/)
- [Istio: Gateway](https://istio.io/latest/docs/reference/config/networking/gateway/)
- [Istio: Protocol Selection](https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/)
- [Istio: Installing the Sidecar](https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/)
- [Istio: Resource Annotations](https://istio.io/latest/docs/reference/config/annotations/)
- [Istio: Envoy Access Logs](https://istio.io/latest/docs/tasks/observability/logs/access-log/)
- [Istio: Diagnose your Configuration with Istioctl Analyze](https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/)
- [Istio 1.31 source: agent xDS proxy](https://github.com/istio/istio/blob/release-1.31/pkg/istio-agent/xds_proxy.go)
- [Istio 1.31 source: Envoy bootstrap template](https://github.com/istio/istio/blob/release-1.31/tools/packaging/common/envoy_bootstrap.json)
- [Envoy: response flags in Substitution Formatter](https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter)
- [Envoy: HTTP connection manager API](https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto)
- [Kubernetes: kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes: kubectl apply](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [Gateway API: HTTPRoute](https://gateway-api.sigs.k8s.io/reference/api-types/httproute/)
- [Gateway API: ReferenceGrant](https://gateway-api.sigs.k8s.io/reference/api-types/referencegrant/)
- [Gateway API: API reference](https://gateway-api.sigs.k8s.io/reference/api-spec/main/spec/)

## Issues Found

1. **Wrong command for the synchronization table.** The original `istioctl proxy-status frontend-74b77f79cc-p8x2l.apps` requests a diff between the named proxy and Istiod. Replaced it with `istioctl proxy-status --namespace apps` and instructed readers to locate the proxy's row. This produces the table containing the synchronization states discussed immediately afterward.
2. **Incomplete injector selection explanation.** The text described namespace revision selection without accounting for Pod revision labels or conflicting namespace injection labels. Clarified that `istio.io/rev` can select an injector from the namespace or Pod, including through a revision tag, and that a namespace's `istio-injection` label takes precedence over its revision label. This matters when diagnosing an unexpected revision.
3. **Automatic HTTP protocol detection omitted.** The original instruction implied that a Service must explicitly declare an HTTP protocol to receive HTTP routing. Added HTTP/HTTP2 detection as an alternative. Retained the correct descriptions of explicit TCP classification and `appProtocol` precedence.
4. **Access-log prerequisite omitted.** The `kubectl logs` example only returns request access logs when those logs are enabled and emitted to the container output. Added that prerequisite to the introductory sentence; the command itself is valid.

## Review Notes

- Reviewed all command blocks and YAML fragments against the official command and API references. The YAML examples are nested configuration fragments, not complete resources to apply on their own. Pod names, namespaces, and the candidate manifest must be supplied from the reader's environment.
- Confirmed the synchronization-state meanings, response flags, listener/RDS relationship, TCP versus HTTP behavior, TLS termination versus passthrough, import/export visibility, discovery selectors, namespace-relative destinations, gateway attachment, and ordered HTTP route matching.
- Confirmed the automatically assigned actual-revision annotation against Istio's annotation reference. The requested Pod revision field can be null when selection comes from the namespace; the preceding namespace command supplies that context.
- Read the release-1.31 agent and bootstrap sources through their raw GitHub URLs. The bootstrap's `xds-grpc` cluster uses a Unix-domain socket, and the agent source contains both log messages used by the grep expression. These implementation details are version-specific and should be rechecked on upgrades.
- The Gateway API distinguishes cross-namespace route attachment, controlled by `allowedRoutes`, from backend references requiring a `ReferenceGrant`. The article correctly keeps this separate from Istio Gateway and VirtualService attachment.
- Checked the article's technical documentation links and corresponding source files. The author profile is an attribution link, not technical evidence. Official `latest` documentation and release branches can change over time.
- Performed a documentation/source review and local Bash syntax checks. No live Kubernetes cluster requests, resource changes, traffic tests, or convergence tests were performed. Runtime success depends on the installed configuration and permissions.
- Preserved the article's structure and limited README edits to the four corrections above.
