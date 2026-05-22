# Validation Summary: How to Configure All Gateway Fields in Istio

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService binding
- Kubernetes secrets
- TLS and mutual TLS
- Envoy listener protocols

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio secure ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio installing gateways documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio GatewayPortNotDefinedOnService analysis message: https://istio.io/latest/docs/reference/config/analysis/ist0162/

## Issues Found
- The examples used `networking.istio.io/v1beta1`. Updated them to the current documented `networking.istio.io/v1` API version.
- The `port` example and field list included `targetPort`, which is not a field on Istio Gateway `Port`. Removed it and clarified that Gateway port numbers describe the proxy listener; the Kubernetes Service controls target ports.
- The supported protocol list omitted `GRPC-WEB`. Added it to match the current Istio Gateway `Port.protocol` reference.
- The TLS example mixed `credentialName` with file-based certificate fields, even though Istio documents these certificate source options as mutually exclusive. Removed the invalid combination and added the remaining current TLS fields in prose.
- The secret key description for `credentialName` was incomplete. Updated it to cover `kubernetes.io/tls`, Opaque/generic keys, and mutual TLS CA material as described by Istio.
- The bind-address example included `defaultEndpoint`, which is not a current Istio Gateway `Server` field. Removed it and clarified the supported `bind` and server `name` behavior.
- The TCP database example used a DNS hostname in `hosts`, which is meaningful for HTTP or TLS/SNI matching but not raw TCP. Changed it to `*`.

## Review Notes
The post is now aligned with the current Istio 1.30 Gateway reference. Future updates could mention that Kubernetes Gateway API is increasingly preferred by Istio, but this post intentionally covers the Istio `networking.istio.io` Gateway resource.
