# Validation Summary: How to Set Up SNI Passthrough at Istio Ingress Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio DestinationRule
- Istio PeerAuthentication
- SNI passthrough
- TLS
- Kubernetes Deployment, Service, and Secret
- kubectl
- istioctl
- curl
- OpenSSL

## Sources Consulted
- Istio Ingress Gateway without TLS Termination: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Understanding TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/

## Issues Found
- The post said the Gateway protocol must be `TLS`, not `HTTPS`. Istio documentation allows passthrough routing for both `TLS` and `HTTPS` gateway protocols, and the official ingress SNI passthrough task uses `HTTPS` with `mode: PASSTHROUGH` for HTTPS services. I changed the note to say `TLS` is appropriate for raw TLS traffic and `HTTPS` with passthrough is also valid for HTTPS.
- The sidecar section described `DestinationRule` `tls.mode: DISABLE` as disabling sidecar protocol detection. In Istio, `DestinationRule` TLS settings control upstream TLS origination, while protocol detection is controlled by port naming, `appProtocol`, or sniffing. I changed the wording to explain that `DISABLE` prevents originating another TLS connection to the upstream endpoint.
- The sidecar section implied encrypted passthrough traffic inherently causes sidecar interception problems. Istio sidecars can pass local inbound TLS through as-is, but mesh mTLS policy can affect the gateway-to-backend hop. I clarified the mTLS interaction and noted that strict PeerAuthentication may need port-level allowance if upstream Istio mTLS is disabled.

## Review Notes
The examples use the current `networking.istio.io/v1` API group and valid Gateway, VirtualService, DestinationRule, Deployment, Service, and TLS Secret fields. The `kubectl create secret tls`, `curl --resolve`, `openssl s_client -servername`, and `kubectl logs --tail` commands are syntactically correct. `kubectl` and `istioctl` were not installed in the local environment, so CLI validation was performed against official documentation rather than local help output.
