# Validation Summary: How to Handle Port Naming Conventions in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes Services
- Istio ServiceEntry
- Envoy protocol detection
- `istioctl analyze`
- Python JSON processing for `kubectl` output

## Sources Consulted
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio IST0118 analyzer documentation: https://istio.io/latest/docs/reference/config/analysis/ist0118/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio ServiceEntry API reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Application Requirements, Server First Protocols: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio MeshConfig API source for `protocol_detection_timeout`: https://github.com/istio/api/blob/master/mesh/v1alpha1/config.proto
- Kubernetes Service documentation for `appProtocol`: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service protocol reference: https://kubernetes.io/docs/reference/networking/service-protocols/
- Istio VirtualService retry policy reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/

## Issues Found
- The post said unnamed or incorrectly named ports are always treated as opaque TCP. Updated this to explain that Istio uses automatic protocol detection when enabled, and falls back to TCP if detection is disabled or cannot identify the protocol.
- The post listed `mongo`, `mysql`, and `redis` as normal recognized protocols. Updated the list to note that these are experimental application protocol parsers in Istio and require corresponding enablement; otherwise they are treated as opaque TCP.
- The post said `appProtocol` starts with Kubernetes 1.20. Updated this to Kubernetes 1.18 with a note that the field became stable in Kubernetes 1.20.
- The bad-port example said all misnamed ports are plain TCP. Updated it to match Istio's protocol detection behavior.
- The IST0118 example used `Warning`, but official docs list the analyzer level as `Info`. Updated the example.
- The custom Python audit command parsed only the first hyphen-delimited segment of a port name, which mishandled protocols with hyphens such as `grpc-web`. Updated the check to match exact protocol names or `<protocol>-<suffix>`.
- The post said losing HTTP recognition means no automatic retries on 5xx errors. Updated this to the broader and more accurate loss of HTTP retry policies and default HTTP retries.
- The `protocolDetectionTimeout` explanation claimed a default of `100ms`. Updated the explanation to match the current Istio API source, where the documented default is `0s` with no timeout.
- The server-first protocol section suggested `name: mysql` as a generally correct fix. Updated the recommendation to declare server-first ports as TCP, such as `tcp-mysql` or `tcp-postgres`, unless deliberately using an enabled experimental parser.

## Review Notes
The YAML snippets were parsed successfully, and the revised Python audit command was sanity-tested against sample Kubernetes Service JSON. `istioctl` was not installed locally, so CLI behavior was checked against the official Istio command and analyzer documentation.
