# Validation Summary: How to Handle Istio Configuration Dependencies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio networking APIs: VirtualService, DestinationRule, Gateway
- Istio security APIs: PeerAuthentication, AuthorizationPolicy, RequestAuthentication
- Kubernetes manifests and kubectl
- Argo CD sync waves
- Flux Kustomization dependencies
- yq-based YAML validation scripts

## Sources Consulted
- Istio Traffic Management Best Practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- yq eval command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate

## Issues Found
- The deployment script described a `PeerAuthentication` in the `production` namespace as mesh-wide. A namespace-scoped PeerAuthentication applies to that namespace, so the label was changed to namespace-wide.
- The deployment order claimed to account for Service and Deployment dependencies, but the sample only applied `namespace.yaml` before Istio routing resources. Added an example core Kubernetes resources apply step before Istio resources.
- The Argo CD VirtualService example was bound to `main-gateway` but used `order-service` as its host, which does not match the Gateway's `*.example.com` server host. Changed the VirtualService host to `orders.example.com`.
- The circular dependency section said combining resources in one file ensures atomic application. Kubernetes apply is not atomic across multiple resources, so the wording now says the resources are applied by the same command.
- The validation script checked VirtualService subset names against DestinationRule metadata names. Updated it to validate the `(host, subset)` pair against DestinationRule `spec.host` and `spec.subsets[].name`, and to fail on missing subset dependencies.

## Review Notes
The main Istio dependency guidance is consistent with Istio's current documented recommendation to create DestinationRule subsets before VirtualServices route to them. Argo CD sync waves and Flux `dependsOn` examples use current documented fields. `kubectl` and `yq` were not installed locally, so CLI verification was performed against official command documentation.
