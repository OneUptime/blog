# Validation Summary: How to Use Istio with Kubernetes Custom Resource Definitions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes Custom Resource Definitions
- kubectl
- istioctl
- Kustomize
- YAML configuration

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio v1 APIs announcement and supported API version table: https://istio.io/latest/blog/2024/v1-apis/
- Istio configuration status field documentation: https://istio.io/latest/docs/reference/config/config-status/
- Kubernetes kubectl api-resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/

## Issues Found
- The ServiceEntry section said external traffic without a ServiceEntry would not have Istio telemetry applied. This was too absolute. Updated it to state that Istio cannot apply host-specific routing policies or produce service-specific telemetry for that external host.
- The validation section implied Kubernetes always rejects invalid CRD fields. Updated it to mention CRD OpenAPI schema validation plus Istio admission webhook/analyzer validation, since Kubernetes may prune unknown fields depending on the CRD schema while Istio performs additional semantic validation.
- The "Watching CRD Status" section implied status is generally available on Istio resources. Updated it to "Inspecting CRD Resources" and added the caveat that Istio configuration status is alpha and disabled by default.
- The cleanup section said deleting CRDs before custom resources orphans the resources. Kubernetes deletes custom objects stored under a CRD when the CRD is deleted, so the text now accurately explains that deleting custom resources first makes cleanup explicit and auditable.

## Review Notes
The examples use Istio `networking.istio.io/v1` and `security.istio.io/v1`, which are the stable API versions for the resources discussed. Older `v1beta1` and `v1alpha3` networking APIs are still supported for several resources, but new manifests should prefer `v1`.
