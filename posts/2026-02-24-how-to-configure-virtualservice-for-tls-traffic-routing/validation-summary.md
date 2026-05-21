# Validation Summary: How to Configure VirtualService for TLS Traffic Routing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio VirtualService
- Istio Gateway
- Istio DestinationRule
- Istio ServiceEntry
- TLS passthrough and SNI routing
- Kubernetes custom resources
- istioctl
- OpenSSL

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- OpenSSL s_client documentation: https://docs.openssl.org/master/man1/openssl-s_client/

## Issues Found
- The examples used `networking.istio.io/v1beta1`. Istio networking APIs were promoted to `networking.istio.io/v1` in Istio 1.22, so the manifests were updated to the stable API version.
- The mesh-internal passthrough section said a `DestinationRule` with `tls.mode: SIMPLE` was required for a backend that expects TLS. That would make Istio originate a new upstream TLS connection and can cause double encryption for passthrough traffic, so the DestinationRule snippet was replaced with a clarification.
- The TLS origination example used a TLS `VirtualService` route for traffic that the text described as plaintext HTTP from the app and HTTPS from the sidecar. The example was corrected to use an HTTP ServiceEntry port with `targetPort: 443` and a DestinationRule `portLevelSettings` entry that originates TLS on the HTTP port.
- The Gateway comparison said `protocol: TLS` with `mode: SIMPLE` or `MUTUAL` can use HTTP routing. That is only true for HTTPS termination; raw TLS termination uses TCP routing for the decrypted stream. The wording was corrected.
- The weighted TLS routing example used subsets without noting that they must be defined in a corresponding DestinationRule. A short caveat was added.

## Review Notes
The post is now technically accurate as a general Istio TLS routing guide. The examples are intentionally minimal and assume the referenced Kubernetes Services, Gateway deployment selector, and any required DestinationRule subsets already exist.
