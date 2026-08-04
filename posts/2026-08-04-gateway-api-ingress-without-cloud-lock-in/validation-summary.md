# Validation Summary: Reduce Ingress Lock-In with Kubernetes Gateway API

## Status
validated

## Post Type
Technical guide / migration guide

## Technologies Covered
- Kubernetes
- Kubernetes Ingress
- Kubernetes Gateway API (`GatewayClass`, `Gateway`, `HTTPRoute`, and `ReferenceGrant`)
- Gateway API conformance profiles and feature support levels
- Cloud load balancers on Amazon EKS and Google Kubernetes Engine (GKE)
- Kubernetes cross-namespace routing and references
- `kubectl` and ripgrep (`rg`)

## Sources Consulted
- [Kubernetes Gateway API overview](https://kubernetes.io/docs/concepts/services-networking/gateway/)
- [Kubernetes Ingress documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Gateway API v1.5.1 release](https://github.com/kubernetes-sigs/gateway-api/releases/tag/v1.5.1)
- [Gateway API specification](https://gateway-api.sigs.k8s.io/reference/api-spec/)
- [Gateway API overview and role model](https://gateway-api.sigs.k8s.io/docs/concepts/api-overview/)
- [Gateway API conformance documentation](https://gateway-api.sigs.k8s.io/docs/concepts/conformance/)
- [Gateway API implementation and conformance reports](https://gateway-api.sigs.k8s.io/implementations/)
- [Gateway API troubleshooting and status conditions](https://gateway-api.sigs.k8s.io/docs/concepts/troubleshooting/)
- [Gateway API cross-namespace routing guide](https://gateway-api.sigs.k8s.io/guides/multiple-ns/)
- [Gateway API ReferenceGrant documentation](https://gateway-api.sigs.k8s.io/reference/api-types/referencegrant/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl label reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/)
- [Amazon EKS: AWS Load Balancer Controller](https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html)
- [Google Cloud: Deploying Gateways on GKE](https://cloud.google.com/kubernetes-engine/docs/how-to/deploying-gateways)

## Issues Found
1. **HTTPRoute hostname placement was described too narrowly.** The annotation-mapping table placed hosts under `HTTPRoute` filters and rules, but route hostnames are declared in `spec.hostnames`, outside the rules array. Changed the entry to say `HTTPRoute` hostnames, filters, and rules.
2. **ReferenceGrant was incorrectly associated with Route-to-Gateway attachment.** `ReferenceGrant` authorizes cross-namespace object references such as an `HTTPRoute` backend reference or a `Gateway` certificate reference. Cross-namespace Route-to-Gateway attachment is the explicit exception and is controlled by the Route's `parentRefs` plus the listener's `allowedRoutes`. Reworded the sentence so it refers only to referencing or consuming resources.

## Review Notes
- Both configuration examples use the current GA `gateway.networking.k8s.io/v1` API and match the Standard-channel schema. The omitted `group` and `kind` fields correctly default to the Gateway API group / `Gateway` for `parentRefs`, the core API group / `Service` for `backendRefs`, and the core API group / `Secret` for `certificateRefs`.
- The wildcard listener hostname and exact route hostname overlap correctly. The certificate Secret is implicitly in the `edge` namespace with the `Gateway`, and the backend Service is implicitly in the `shop` namespace with the `HTTPRoute`.
- `allowedRoutes.namespaces.from: Selector` and its label selector are Core features. The `kubectl label namespace shop edge-access=public` command correctly makes the `shop` namespace eligible for attachment, assuming the namespace already exists.
- Gateway `Accepted` and `Programmed` conditions, Route parent `Accepted` and `ResolvedRefs` conditions, and condition `observedGeneration` checks are consistent with the Gateway API status model. `Programmed=True` means configuration has reached the data plane and should become ready soon; functional traffic tests are still appropriate.
- The post correctly treats Extended features and infrastructure settings as implementation-dependent. Gateway address types such as `IPAddress` and `Hostname` have Extended support, and provider-managed static-address lifecycles remain implementation-specific.
- GKE currently documents predefined classes including `gke-l7-rilb`. The linked Amazon EKS documentation currently describes Gateway API support in AWS Load Balancer Controller 2.14.0 or later. No provider version is hard-coded into the article, so no version correction was required.
- All referenced URLs returned successful HTTP responses during validation.
