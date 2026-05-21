# Validation Summary: How to Handle MongoDB Protocol in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- MongoDB
- MongoDB Atlas
- Kubernetes Services, Deployments, and StatefulSets
- Istio ServiceEntry, DestinationRule, PeerAuthentication, and AuthorizationPolicy
- kubectl and istioctl

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio sidecar injection troubleshooting for `holdApplicationUntilProxyStarts`: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio proxy-config debugging guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- MongoDB `rs.initiate()` reference: https://www.mongodb.com/docs/current/reference/method/rs.initiate/
- MongoDB connection string formats: https://www.mongodb.com/docs/manual/reference/connection-string-formats/
- MongoDB Atlas driver connection guide: https://www.mongodb.com/docs/atlas/driver-connection/
- MongoDB Node.js driver FAQ for default pool size: https://www.mongodb.com/docs/drivers/node/current/faq/
- Envoy Mongo proxy filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/mongo_proxy_filter

## Issues Found
- The post said `tcp-mongo` could be used to identify MongoDB protocol traffic. Istio port naming uses `protocol[-suffix]`, so `tcp-mongo` selects the `tcp` protocol with a suffix and does not select MongoDB protocol handling. Changed the example to `mongo-db`.
- The post implied recognized MongoDB ports always get only a TCP proxy filter and optional MongoDB metrics. Istio documents `mongo` as experimental application protocol support, and Envoy has a Mongo proxy network filter when enabled. Clarified that disabled Mongo filter support falls back to opaque TCP.
- The Atlas section suggested `SIMPLE` TLS mode before saying `DISABLE` might be needed. Atlas drivers normally handle TLS themselves, so Istio TLS origination would add an extra TLS layer. Replaced the `SIMPLE` example with passthrough guidance using omitted TLS settings or explicit `DISABLE`.
- The Atlas ServiceEntry used `name: mongo` while declaring `protocol: TCP`, which could imply MongoDB protocol inspection even though encrypted driver traffic should be treated as passthrough. Changed the port name to `tcp-mongo-atlas`.

## Review Notes
The remaining Kubernetes, Istio, and MongoDB snippets use current API versions and valid field names. The MongoDB deployment examples remain intentionally minimal and assume the referenced Secret and PVC already exist.
