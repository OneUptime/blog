# Validation Summary: Deploy Gateway API with Contour

## Status
validated

## Post Type
Tutorial / deployment guide with Kubernetes manifests and terminal commands.

## Technologies Covered
- Contour 1.33.6 and its Gateway provisioner
- Kubernetes and kubectl
- Gateway API v1.3.0: GatewayClass, Gateway, HTTPRoute, ReferenceGrant, TCPRoute, TLSRoute, and GRPCRoute
- ContourDeployment, Envoy, HTTPProxy, and Ingress
- TLS Secrets, cert-manager, DNS, and curl

## Sources Consulted
- Contour 1.33 Gateway API implementation: https://projectcontour.io/docs/1.33/config/gateway-api/
- Contour 1.33 Gateway API guide: https://projectcontour.io/docs/1.33/guides/gateway-api/
- ContourDeployment API reference: https://projectcontour.io/docs/1.33/config/api-reference/#projectcontour.io/v1alpha1.ContourDeployment
- Pinned dependency manifest (retrieved directly): https://raw.githubusercontent.com/projectcontour/contour/v1.33.6/go.mod
- Pinned provisioner manifest and bundled CRD schemas (retrieved directly): https://raw.githubusercontent.com/projectcontour/contour/v1.33.6/examples/render/contour-gateway-provisioner.yaml
- GatewayClass: https://gateway-api.sigs.k8s.io/reference/api-types/gatewayclass/
- Gateway: https://gateway-api.sigs.k8s.io/reference/api-types/gateway/
- HTTPRoute: https://gateway-api.sigs.k8s.io/reference/api-types/httproute/
- Cross-namespace routing: https://gateway-api.sigs.k8s.io/guides/user-guides/multiple-ns/
- Gateway TLS configuration: https://gateway-api.sigs.k8s.io/guides/user-guides/tls/
- cert-manager Gateway integration: https://cert-manager.io/docs/usage/gateway/
- kubectl apply: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl rollout status: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- kubectl get: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl JSONPath: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- curl manual, including --resolve, --connect-to, and certificate verification: https://curl.se/docs/manpage.html

## Issues Found
1. **Gateway address handling in curl.** The original command passed a generic Gateway address to `--resolve`, which requires an IP address, whereas a load balancer can publish a hostname. Replaced it with `--connect-to` and explained placeholder substitution and IPv6 brackets. This preserves the intended HTTP hostname, TLS SNI, and certificate verification while accepting a load-balancer hostname.
2. **Missing backend prerequisite.** The HTTPRoute referenced a Service that the guide never created or explicitly required. Added a sentence requiring an existing `storefront` Service in the route namespace with Service port `8080` and ready application Pods. Clarified that backendRefs.port refers to the Service port, which can differ from the container port.
3. **Ambiguous health checks.** Merely having Accepted, Programmed, or ResolvedRefs conditions does not indicate success; they can be False or stale. Changed the checks to explicitly require True and added the observedGeneration check against metadata.generation.

## Review Notes
- Confirmed the one-Gateway-to-one-Contour/Envoy model, static gateway.gatewayRef configuration, dynamic resource namespace, controller name, 63-character Gateway name restriction, and listener/Service port synchronization against Contour 1.33 documentation.
- Retrieved the exact v1.33.6 provisioner manifest. It uses image ghcr.io/projectcontour/contour:v1.33.6 and Deployment contour-gateway-provisioner in projectcontour. Its Gateway API CRDs carry bundle-version v1.3.0 and experimental-channel annotations; go.mod also pins Gateway API v1.3.0.
- Confirmed namespace selector attachment, parent sectionName, local backend reference defaults, hostname matching, TLS termination, and the distinction between allowedRoutes and cross-namespace ReferenceGrant authorization. The listener certificate still must be supplied by the reader.
- Confirmed ContourDeployment parameters, the documented non-propagation of GatewayClass parameter changes to existing Gateways, and provisioner-driven upgrades of managed control and data planes.
- The standard-channel paragraph describes an alternative installation choice; the supplied manifest installs experimental CRDs. Disabling experimental route informers alone does not remove those CRDs.
- Parsed every YAML example. GatewayClass, Gateway, and HTTPRoute passed JSON Schema validation against the v1 schemas bundled in the exact pinned manifest. Kubernetes CEL validations and controller behavior were reviewed from configuration and documentation, not executed in an API server.
- All shell examples passed bash -n. kubectl flags and JSONPath syntax were checked against official documentation. No cluster resources were created, and no live TLS, routing, DNS, or negative attachment test was run.
- The review is scoped to the explicitly pinned Contour version; it does not claim that 1.33.6 is the latest release. The original cross-namespace documentation URL redirects to the current user-guides path. The original versioned Contour documentation and API reference resolve successfully.
