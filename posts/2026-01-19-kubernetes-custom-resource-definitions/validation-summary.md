# Validation Summary: How to Implement Custom Resource Definitions (CRDs) in Kubernetes

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- Kubernetes custom resources
- CRD OpenAPI v3 schema validation
- Kubernetes CEL validation rules
- CRD versioning and conversion webhooks
- Kubernetes status and scale subresources
- kubectl
- Go
- controller-runtime
- Kubebuilder markers

## Sources Consulted
- Kubernetes documentation: Extend the Kubernetes API with CustomResourceDefinitions - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes documentation: Versions in CustomResourceDefinitions - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kubernetes documentation: Common Expression Language in Kubernetes - https://kubernetes.io/docs/reference/using-api/cel/
- controller-runtime controllerutil package documentation - https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller/controllerutil
- Kubebuilder Book: Generating CRDs - https://book.kubebuilder.io/reference/generating-crd.html
- Kubebuilder/controller-tools CRD marker documentation - https://book.kubebuilder.io/reference/markers/crd.html
- controller-tools print column marker documentation - https://pkg.go.dev/sigs.k8s.io/controller-tools/pkg/crd/markers

## Issues Found
- The CEL validation rule for `highAvailability` accessed optional nested fields without guarding for field presence. Updated it to use `has(self.highAvailability)` and to require `replicas` when high availability is enabled. This avoids invalid or failing validation behavior when the optional object is omitted.
- The Go controller snippet imported `fmt` without using it, used `intstr.FromInt` without importing `k8s.io/apimachinery/pkg/util/intstr`, and called an undefined `r.createOrUpdate` helper. Replaced the calls with concrete `controllerutil.CreateOrUpdate` helper methods and imported `controllerutil`.
- The controller snippet did not set owner references before using `.Owns(...)`. Added `controllerutil.SetControllerReference` in the create/update mutations so Deployment and Service changes can be associated with the owning `WebApp`.
- The Service update logic now mutates only `Spec.Selector` and `Spec.Ports` rather than replacing the whole Service spec, avoiding accidental clearing of cluster-assigned fields such as `clusterIP` on updates.

## Review Notes
The CRD API version, schema placement, additional printer columns, subresources, CRD versioning fields, deprecation warning fields, kubectl commands, and Kubebuilder marker examples are consistent with current Kubernetes and Kubebuilder documentation. The conversion webhook example is a configuration skeleton and still requires a real webhook service, TLS configuration, and CA bundle handling before it can be applied in a production cluster.
