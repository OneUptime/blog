# Validation Summary: How to Use Operator Pattern for Scheduling-Related Custom Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- Kubernetes operators and controllers
- controller-runtime
- Kubernetes scheduling primitives
- Kubernetes RBAC
- kubectl
- Go
- YAML

## Sources Consulted
- Kubernetes CustomResourceDefinition API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes Custom Resources concepts: https://kubernetes.io/docs/concepts/api-extension/custom-resources/
- Kubernetes Pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Toleration API reference: https://kubernetes.io/docs/reference/kubernetes-api/definitions/toleration-v1/
- Kubernetes taints and tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubebuilder/controller-runtime watching resources reference: https://kubebuilder.io/reference/watching-resources

## Issues Found
- The WorkloadPlacement CRD defined a status schema but did not enable the CRD `status` subresource. The controller uses `r.Status().Update`, so I added `subresources: status: {}` to the CRD version.
- The Go controller sample referenced `appsv1.DeploymentList` and `appsv1.Deployment` without importing `k8s.io/api/apps/v1`. I added the missing import.
- The Go controller sample called `selectCostOptimizedPool` and `hasCapacity` without defining them. I added minimal placeholder methods so the simplified sample is syntactically complete while preserving the intended extension points.
- The GPU toleration logic appended the same toleration on every reconciliation, which violated the post's idempotent reconciliation guidance. I changed it to check for the existing toleration before appending.
- The Go sample used raw strings for typed Kubernetes constants. I replaced them with `corev1.TolerationOpEqual`, `corev1.TaintEffectNoSchedule`, and `corev1.DoNotSchedule`.
- The controller indexes `nodePoolPreferences[0]`, but the CRD allowed the field to be omitted or set to an empty array. I made the field required and added `minItems: 1` to the schema.
- The operator deployment creates namespaced resources in `scheduling-system` but did not create the namespace. I added a `Namespace` object to the deployment manifest.

## Review Notes
The examples are still intentionally simplified. A production operator should handle conflicts and retries around updates, use server-side apply or patches where appropriate, add watches for related workloads if workload changes should trigger reconciliation, and implement real capacity/cost checks rather than the placeholders shown in the tutorial. `kubectl` was not installed in the review environment, so command syntax was checked against official Kubernetes CLI documentation instead of local help output.
