# Validation Summary: How to Build Kubernetes Operator with Operator SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes Operators
- Operator SDK
- Kubebuilder markers
- controller-runtime
- Go
- Envtest
- Operator Lifecycle Manager (OLM)
- ClusterServiceVersion (CSV) manifests

## Sources Consulted
- Operator SDK installation documentation: https://sdk.operatorframework.io/docs/installation/
- Operator SDK Go operator tutorial: https://sdk.operatorframework.io/docs/building-operators/golang/tutorial/
- Operator SDK bundle validation CLI documentation: https://sdk.operatorframework.io/docs/cli/operator-sdk_bundle_validate/
- Operator SDK run bundle CLI documentation: https://sdk.operatorframework.io/docs/cli/operator-sdk_run_bundle/
- Operator SDK OLM manifest and metadata generation documentation: https://sdk.operatorframework.io/docs/olm-integration/generation/
- Kubebuilder CRD validation marker documentation: https://book.kubebuilder.io/reference/markers/crd-validation.html
- controller-runtime controllerutil documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller/controllerutil
- Kubernetes owner reference documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/

## Issues Found
- The Linux install snippet used Operator SDK v1.34.1, which is outdated relative to the current official installation docs. Updated it to v1.42.2 and raised the Go prerequisite to 1.23+ to match the current Operator SDK documentation.
- The controller example used `intstr.FromInt` but showed the `intstr` import after function declarations, which is invalid Go. Moved the import into the main import block.
- The reconciler added a finalizer before checking `DeletionTimestamp`. Reordered the deletion check so deleting resources are handled before adding finalizers or reconciling child resources.
- The deployment replica update log set `deployment.Spec.Replicas` before logging the old value, so it reported the new replica count as both the old and new value. Stored `currentReplicas` first and handled a nil `Spec.Replicas` pointer.
- The controller test imported `corev1` but did not use it, causing a Go compile error. Removed the unused import.
- The CSV YAML example had a malformed inner Markdown fence ending in ```bash and the outer block ended with ```text. Corrected both fences.
- The CSV permissions example only granted ConfigMap access even though the operator manages Memcached custom resources, status/finalizers, Deployments, and Pods. Replaced the permissions with rules matching the RBAC markers in the controller snippet.
- The CSV `owned.resources` listed a Service even though the tutorial's controller only creates and watches a Deployment. Removed the Service entry from that example.

## Review Notes
The local environment did not have `operator-sdk`, `go`, or `kubectl` installed, so CLI and code checks were verified against official documentation and static review rather than by running the examples end to end.
