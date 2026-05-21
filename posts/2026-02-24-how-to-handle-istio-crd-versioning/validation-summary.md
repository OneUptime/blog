# Validation Summary: How to Handle Istio CRD Versioning

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes CustomResourceDefinitions
- Kubernetes API versioning
- kubectl
- istioctl
- Helm
- YAML manifests

## Sources Consulted
- Istio: Introducing Istio v1 APIs: https://istio.io/latest/blog/2024/v1-apis/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Helm upgrade documentation: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration analysis messages: https://istio.io/latest/docs/reference/config/analysis/
- Kubernetes CRD versioning documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kubernetes CRD API reference: https://kubernetes.io/docs/reference/kubernetes-api/extend-resources/custom-resource-definition-v1/
- Istio generated CRD manifest: https://raw.githubusercontent.com/istio/istio/master/manifests/charts/base/files/crd-all.gen.yaml

## Issues Found
- The post claimed that `kubectl get vs -A -o jsonpath=...{.apiVersion}` checks which API versions current resources use. Kubernetes serves objects using the requested or preferred API version, so this does not reliably identify the API version used in original manifests. Changed this to search stored manifests instead and added a caveat about live `kubectl get` output.
- The bulk update script fetched live VirtualServices and replaced `networking.istio.io/v1alpha3` in the output. Because live output is typically served at the preferred version, this can be a no-op and does not update source manifests. Changed the example to update checked-in manifests and instruct readers to review and deploy through their normal process.
- The post said Istio registers CRD conversion webhooks when CRDs are installed. Current Istio CRDs do not configure CRD conversion webhooks; they rely on aligned schemas and Kubernetes CRD conversion behavior. Rewrote the section to distinguish CRD conversion from Istio admission webhooks.
- The deprecation warning section implied Kubernetes always shows warnings for deprecated Istio CRD versions. Kubernetes shows CRD version warnings only when the CRD version is marked deprecated. Updated the wording to make that condition explicit.

## Review Notes
The remaining examples and commands are technically valid for current Istio and Kubernetes behavior. Istio v1 APIs were promoted in Istio 1.22, and current Istio documentation still lists older served versions for several CRDs, but users should continue checking release notes during upgrades because supported served versions can change by Istio release.
