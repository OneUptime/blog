# Validation Summary: How to Build a Multi-Group API with Kubebuilder

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes API groups and CustomResourceDefinitions
- Kubebuilder go/v4 scaffolding
- controller-runtime manager setup
- Go custom resource types and reconcilers
- kubectl and Makefile-based CRD installation

## Sources Consulted
- Kubebuilder Book: Project config, including `multigroup`: https://book.kubebuilder.io/reference/project-config.html
- Kubebuilder Book: Single Group to Multi-Group migration and current multi-group layout: https://book.kubebuilder.io/migration/multi-group
- Kubebuilder Book: Quick Start, generated paths, `make manifests`, and `make install`: https://book.kubebuilder.io/quick-start.html
- controller-runtime manager Options API: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/manager
- controller-runtime metrics server Options API: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/metrics/server
- Kubernetes API overview and API groups: https://kubernetes.io/docs/reference/using-api/
- Kubernetes API group reference: https://kubernetes.io/docs/reference/kubernetes-api/group-versions/
- Kubernetes CustomResourceDefinition API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Local Kubebuilder v4.14.0 CLI help and temporary scaffold output for `kubebuilder init --multigroup`.

## Issues Found
- The initialization command used the deprecated `--multi-group` spelling. Changed it to the current `--multigroup` flag used by Kubebuilder go/v4.
- The project structure showed controllers under `controllers/` and `main.go` at the repository root. Current Kubebuilder go/v4 scaffolds controllers under `internal/controller/<group>/` and the manager entrypoint under `cmd/main.go`, so the tree and import paths were updated.
- The manager example used `ctrl.Options{MetricsBindAddress: ...}`, which is no longer the current controller-runtime manager API. Updated it to `Metrics: metricsserver.Options{BindAddress: metricsAddr}` and added the metrics server import.
- The first `ApplicationSpec` example modeled `databaseRef` as a string, while later YAML used it as an object. Updated the type to use `*DatabaseReference`.
- The cross-group controller example had incomplete imports, did not default an omitted reference namespace, and assigned `db.Status.Endpoint` to an unused variable. Added the necessary imports, defaulted the namespace to the reconciled object's namespace, and removed the unused assignment.
- The Gateway sample used a `listeners` field even though the post never defined a Gateway schema with that field. Changed the sample to `spec: {}` to avoid showing an unsupported field.
- The API group description said each group has its own conversion webhooks. Conversion webhooks are optional, so the wording was corrected.

## Review Notes
The post is now aligned with current Kubebuilder go/v4 scaffolding and current controller-runtime manager options. Kubebuilder v4.14.0 could not fully complete a local scaffold because Go is not installed in this workspace, but the CLI help and partially written scaffold confirmed the relevant flags and generated paths.
