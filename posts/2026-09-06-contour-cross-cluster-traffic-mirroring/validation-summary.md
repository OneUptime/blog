# Validation Summary: Mirror Contour Traffic Across Clusters Without Host 404s

## Status
validated

## Post Type
Technical configuration and troubleshooting guide.

## Technologies Covered
- Contour 1.33 and the projectcontour.io/v1 HTTPProxy API
- Envoy request mirroring, HTTP authority, TLS SNI, and request IDs
- Kubernetes ExternalName and ClusterIP Services, Secrets, DNS, and kubectl
- Cross-cluster traffic sampling, relay design, and observability

## Sources Consulted
- Contour 1.33 traffic mirroring: https://projectcontour.io/docs/1.33/config/request-routing/#traffic-mirroring
- Contour 1.33 external service routing: https://projectcontour.io/docs/1.33/config/external-service-routing/
- Contour 1.33 upstream TLS: https://projectcontour.io/docs/1.33/config/upstream-tls/
- Contour 1.33 HTTPProxy API reference: https://projectcontour.io/docs/1.33/config/api-reference/
- Contour 1.33 TLS termination: https://projectcontour.io/docs/1.33/config/tls-termination/
- Contour 1.33 virtual hosts: https://projectcontour.io/docs/1.33/config/virtual-hosts/
- Contour 1.33 access logging: https://projectcontour.io/docs/1.33/config/access-logging/
- Contour v1.33.0 HTTPProxy processing source (protocol selection, SNI, mirror count, weights): https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/httpproxy_processor.go
- Contour v1.33.0 CRD schemas: https://github.com/projectcontour/contour/blob/v1.33.0/examples/contour/01-crds.yaml
- Envoy request mirror policy: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html#config-route-v3-routeaction-requestmirrorpolicy
- Envoy v1.35.0 shadow writer implementation: https://github.com/envoyproxy/envoy/blob/v1.35.0/source/common/router/shadow_writer_impl.cc
- Envoy request ID handling: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers.html#x-request-id
- Kubernetes ExternalName Services: https://kubernetes.io/docs/concepts/services-networking/service/#externalname
- Kubernetes kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl describe: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
1. **The direct remote-host design omitted TLS SNI routing constraints.** The example sends the ingress DNS name as SNI but a different, suffixed HTTP authority. Contour binds normal TLS virtual hosts to SNI, so creating a remote HTTPProxy for the suffixed hostname alone is insufficient. Updated the existing design item to require a receiver that supports this SNI/Host combination and direct readers to the existing relay alternative for a normal remote Contour TLS virtual host. Updated the conclusion accordingly.
2. **A remote 404 was described as inevitable.** Changed the statement to a possible outcome; TLS negotiation or ingress-specific handling can fail differently before or during HTTP routing.
3. **Request ID preservation was too broadly stated.** Clarified that the mirrored ID is the value forwarded by the source Envoy, which can differ from the client-supplied ID, and that a receiving edge proxy can replace it. Correlation therefore requires verified propagation.

## Review Notes
- Parsed both YAML examples successfully. Checked the HTTPProxy recursively against the v1.33.0 CRD for recognized fields, required properties, and enum values. This was a static check, not API-server admission or a live cross-cluster test.
- Kept both subjectName and subjectNames: although the singular field is deprecated, the v1.33.0 CRD still requires it and requires the first plural value to match. Removing it would break this version-specific example.
- Confirmed from the tagged processor that explicit protocol: tls enables upstream validation without a Service annotation. Some prose in the upstream TLS guide still describes annotations as mandatory.
- Confirmed the single-mirror limit, percentage sampling, the omitted/zero-weight behavior, and that changing mirror to false makes the entry an ordinary upstream. Removing the entry is the appropriate rollback described here.
- Confirmed the default shadow suffix, discarded mirror responses, separately collected upstream statistics, and unsupported CONNECT/upgraded traffic. Mirroring is not a guarantee against application side effects or shared-resource pressure.
- The kubectl command syntax and flags are valid. The logs example assumes a DaemonSet named envoy in projectcontour, a container named envoy, and access logging to stdout; it normally selects one pod rather than aggregating the fleet. Source access logs alone do not establish mirror success.
- Official documentation links resolve to the intended resources. Example DNS names are placeholders, not endpoints tested for connectivity. Envoy latest documentation is a moving reference; Contour-specific conclusions were checked against the tagged 1.33.0 source and CRD.
- Actual operation still requires the named Services and Secrets, enabled ExternalName processing, trusted certificates, compatible receiver routing, and working DNS/egress. No cluster resources were applied and no traffic was generated.
