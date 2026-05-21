# Validation Summary: How to Use VirtualService to Route to External Services

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Istio VirtualService
- Istio ServiceEntry
- Istio DestinationRule
- Istio Gateway and egress gateways
- Kubernetes kubectl
- istioctl proxy-config
- YAML configuration

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio Egress Gateway task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio DNS Proxying: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The original examples used `networking.istio.io/v1beta1`. Updated Istio networking resources to the current stable `networking.istio.io/v1` API used by the official documentation.
- The first HTTP traffic management example registered the service as HTTPS on port 443 while applying HTTP `VirtualService` rules. Istio sidecars do not decrypt application-originated HTTPS traffic, so HTTP timeouts and retries would not apply as written. Changed the introductory examples to use HTTP on port 80 and clarified that the timeout/retry claim applies to HTTP calls.
- The payment routing and search traffic-splitting examples routed to HTTPS port 443 without TLS origination configuration. Changed those examples to HTTP port 80 so the HTTP routing examples work as shown.
- The traffic-splitting example referenced external destinations without registering them. Added ServiceEntry definitions for the old and new external search providers.
- The TLS origination example configured TLS on destination port 443 instead of the service port used by the application. Updated it to use `targetPort: 443` on the HTTP service port and configure `DestinationRule` TLS origination for port 80, matching the official Istio pattern.
- The egress gateway example did not include the required ServiceEntry for the external TLS host and omitted port matches in the TLS routes. Added the ServiceEntry and explicit `port: 443` matches.
- The internal alias example implied the ServiceEntry alone would make the alias resolvable by application DNS. Added the DNS capture or matching Kubernetes Service/DNS record requirement.
- The debugging curl command ran from the `istio-proxy` container, which usually does not contain application tools such as curl. Changed it to run from a placeholder application container.

## Review Notes
The corrected examples focus on sidecar mode and Istio API resources. For production HTTPS external APIs, teams should choose between application-originated HTTPS with TLS/SNI routing and HTTP-to-HTTPS TLS origination depending on whether they need HTTP-level routing, retries, and fault injection at the sidecar.
