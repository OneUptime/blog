# Validation Summary: How to Use gRPC with Service Mesh

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- gRPC
- HTTP/2
- Kubernetes
- Istio
- Linkerd
- Envoy
- Prometheus
- OpenTelemetry Collector
- OneUptime OTLP export

## Sources Consulted
- Istio protocol selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio rate limiting with Envoy: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Kubernetes gRPC probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Linkerd installation CLI reference: https://linkerd.io/2-edge/reference/cli/install/
- Linkerd injection reference: https://linkerd.io/2-edge/reference/cli/inject/
- Linkerd ServiceProfile reference: https://linkerd.io/2-edge/reference/service-profiles/
- Linkerd automatic mTLS documentation: https://linkerd.io/2-edge/features/automatic-mtls/
- Linkerd telemetry documentation: https://linkerd.io/2-edge/features/telemetry/
- Linkerd load balancing documentation: https://linkerd.io/2-edge/features/load-balancing/
- Linkerd CLI identity reference: https://linkerd.io/2-edge/reference/cli/identity/

## Issues Found
- Removed an Istio sidecar annotation from the gRPC Deployment example because it configured an unused sidecar volume and did not tell Istio that the service speaks gRPC. The Service port name is the relevant protocol signal.
- Updated Istio `VirtualService`, `DestinationRule`, `PeerAuthentication`, `AuthorizationPolicy`, and `Telemetry` examples to current stable API versions where official docs now use `networking.istio.io/v1`, `security.istio.io/v1`, and `telemetry.istio.io/v1`.
- Replaced the deprecated `LEAST_CONN` load-balancing reference with `LEAST_REQUEST`, which Istio documents as the replacement.
- Fixed Linkerd `ServiceProfile` route conditions. A request match object must contain exactly one matcher, so combined `method` and `pathRegex` with `all`.
- Updated the Istio Telemetry access-log filter to account for missing `response.code` on connection failures and clarified that the filter is for HTTP-level errors.
- Corrected the Istio gRPC error-rate Prometheus query to use `grpc_response_status` and restrict both numerator and denominator to `request_protocol="grpc"`, rather than filtering HTTP `response_code`.
- Updated the circuit-breaking example so `consecutiveLocalOriginFailures` is paired with `splitExternalLocalOriginErrors: true`, which Istio requires for that field to take effect, and made `consecutiveGatewayErrors` lower than `consecutive5xxErrors` so it has an effect.
- Renamed the troubleshooting EnvoyFilter section from debug logging to access logging and added the HTTP connection manager `name` field to the merge patch.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. Several examples, especially EnvoyFilter snippets and mesh install commands, remain version-sensitive and should be rechecked during future Istio or Linkerd major-version updates.
