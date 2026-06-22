# Validation Summary: How to Build Custom Kubernetes Operators

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Operators
- Custom Resource Definitions
- Go
- Operator SDK
- controller-runtime
- Kubebuilder markers
- Kubernetes Deployments, Services, ConfigMaps, finalizers, and owner references

## Sources Consulted
- Operator SDK installation documentation: https://sdk.operatorframework.io/docs/installation/
- Operator SDK create api command documentation: https://sdk.operatorframework.io/docs/cli/operator-sdk_create_api/
- Operator SDK Go operator tutorial: https://sdk.operatorframework.io/docs/building-operators/golang/tutorial/
- Kubebuilder CRD validation marker documentation: https://book.kubebuilder.io/reference/markers/crd-validation.html
- Kubebuilder finalizers documentation: https://book.kubebuilder.io/reference/using-finalizers.html
- Kubebuilder owned secondary resources documentation: https://book.kubebuilder.io/reference/watching-resources/secondary-owned-resources.html
- controller-runtime controllerutil package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller/controllerutil
- Kubernetes finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/

## Issues Found
- The Operator SDK direct-download command pinned v1.32.0, which is outdated. Updated the release URL to v1.42.2, the current version shown in the official Operator SDK installation documentation, and added checksum verification for the downloaded binary.
- The operator pattern diagram included a Secret as a managed resource, but the tutorial's controller only reconciles Deployments, Services, and ConfigMaps. Removed the Secret node and reconcile edge from the diagram.
- The controller code imported `fmt` but did not use it. Removed the unused import so the Go snippet compiles.
- The `kubectl get deploy,svc,cm -l app=myapp-sample` command would not show the created Deployment, Service, or ConfigMap because the controller did not set metadata labels on those resources. Added matching `app` and `app.kubernetes.io/*` labels to the reconciled ConfigMap, Deployment, and Service.
- The test snippet imported `corev1` but did not use it. Removed the unused import so the test snippet compiles.

## Review Notes
- The tutorial uses Operator SDK and controller-runtime patterns that are still valid: `operator-sdk init`, `operator-sdk create api`, Kubebuilder validation/default/printcolumn markers, `controllerutil.CreateOrUpdate`, `SetControllerReference`, finalizers, `Owns()`, and status subresource updates.
- The local environment did not have `operator-sdk`, `kubectl`, or `go` installed, so CLI execution and compilation were not possible locally. Commands and APIs were verified against official documentation instead.
