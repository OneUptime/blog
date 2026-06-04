# Validation Summary: Building Custom Kubernetes Operators with the Operator SDK Framework

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Operator SDK
- Kubernetes operators
- Kubernetes CustomResourceDefinitions
- controller-runtime
- Kubebuilder markers
- Go
- Kustomize-based operator deployment
- envtest

## Sources Consulted
- Operator SDK installation documentation: https://sdk.operatorframework.io/docs/installation/
- Operator SDK Go operator tutorial: https://sdk.operatorframework.io/docs/building-operators/golang/tutorial/
- Operator SDK `create api` CLI documentation: https://sdk.operatorframework.io/docs/cli/operator-sdk_create_api/
- controller-runtime `controllerutil` package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller/controllerutil
- Kubebuilder documentation for watching owned secondary resources: https://kubebuilder.io/reference/watching-resources/secondary-owned-resources

## Issues Found
- The Linux installation snippet used an older Operator SDK release URL and an incomplete architecture mapping. Updated it to the current documented release, `v1.42.2`, and aligned the `ARCH` command with the official installation docs.
- The API type snippet omitted the generated `MemcachedList` type and `SchemeBuilder.Register` call. Added both so the example remains valid if readers replace the whole `memcached_types.go` file with the shown code.
- The controller snippet used `fmt.Sprintf` without importing `fmt`. Added the missing import.
- The controller snippet called `ctrl.SetControllerReference`, but the documented helper is `controllerutil.SetControllerReference` from `sigs.k8s.io/controller-runtime/pkg/controller/controllerutil`. Updated the import and call, and handled its returned error.
- The controller snippet omitted `SetupWithManager`, so the reconciler would not be registered to watch `Memcached` resources and owned `Deployment` resources if the snippet replaced the file. Added `SetupWithManager` using `For` and `Owns`.
- `ReadyReplicas` was described as ready pods but was set to the total pod count. Added `countReadyPods` and updated status reconciliation to refresh when either pod names or ready replica count changes.

## Review Notes
The tutorial is technically relevant and matches the current Operator SDK Go workflow after the fixes. The controller remains intentionally simple and does not cover production hardening such as finalizers, conflict retries, deployment template drift reconciliation, or status conditions.
