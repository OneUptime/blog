# Validation Summary: How to Build a Custom Kubernetes API Server with apiserver-builder

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes API aggregation
- apiserver-builder-alpha and apiserver-boot
- apiserver-runtime
- Go API types and Kubernetes code generation
- Kubernetes APIService resources
- etcd-backed and custom storage for aggregated API servers

## Sources Consulted
- Kubernetes SIGs apiserver-builder-alpha README: https://github.com/kubernetes-sigs/apiserver-builder-alpha
- apiserver-builder-alpha tools user guide: https://github.com/kubernetes-sigs/apiserver-builder-alpha/blob/master/docs/tools_user_guide.md
- apiserver-builder-alpha installing guide: https://github.com/kubernetes-sigs/apiserver-builder-alpha/blob/master/docs/installing.md
- apiserver-builder-alpha validation guide: https://github.com/kubernetes-sigs/apiserver-builder-alpha/blob/master/docs/adding_validation.md
- apiserver-builder-alpha defaulting guide: https://github.com/kubernetes-sigs/apiserver-builder-alpha/blob/master/docs/adding_defaulting.md
- apiserver-builder-alpha custom REST guide: https://github.com/kubernetes-sigs/apiserver-builder-alpha/blob/master/docs/adding_custom_rest.md
- apiserver-builder-alpha local running guide: https://github.com/kubernetes-sigs/apiserver-builder-alpha/blob/master/docs/running_locally.md
- apiserver-builder-alpha in-cluster running guide: https://github.com/kubernetes-sigs/apiserver-builder-alpha/blob/master/docs/running_in_cluster.md
- Kubernetes APIService v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiregistration/api-service-v1/

## Issues Found
- The installation used `@latest`, but the upstream project's latest documented release is `v1.23.0`; pinned the install command to `v1.23.0`.
- The setup ran `go mod init` after `apiserver-boot init repo`; the tool creates the Go module itself. Replaced this with `--module-name` on `init repo` and kept `go mod tidy`.
- The resource command omitted `--resource datasets`; added it so the article's later `kubectl get datasets` commands match the generated resource name.
- The resource type example omitted required apiserver-runtime resource interfaces and methods. Added `resource.Object`, `resource.ObjectList`, status-subresource interfaces, runtime constructors, GVR metadata, and list metadata methods.
- The validation/defaulting example used method names that apiserver-runtime would not call and included an unused import. Changed `ValidateDataSet` to `Validate(ctx context.Context)`, changed `SetDefaults` to `Default`, added the `resourcestrategy` interface assertions, and removed the unused import.
- The code generation section incorrectly claimed `apiserver-boot build generated` creates clientsets, listers, informers, and OpenAPI specs. Replaced it with the scaffolded `go generate ./pkg/apis/...` DeepCopy workflow and clarified that generated files are written alongside API packages.
- The custom storage example used generic apiserver registry code that did not match the apiserver-builder v1.23 scaffold. Replaced it with the documented apiserver-runtime `WithResourceAndHandler` pattern using the JSON filepath storage provider.
- The local run instructions manually started etcd and used ad hoc API server flags. Replaced them with the documented `apiserver-boot build executables` and `apiserver-boot run local` workflow and updated kubectl commands to use the generated kubeconfig.
- The in-cluster deployment snippet lacked generated aggregation resources such as Service, Secret, certificate CA bundle, and etcd manifests. Replaced it with `apiserver-boot build config` and `kubectl apply -f config/`.
- The generated in-cluster config uses the requested namespace but does not create it. Added an idempotent namespace creation command before applying the generated manifests.
- The conclusion overstated production readiness. Adjusted the wording to note that production deployments still require careful certificate, authentication, authorization, and RBAC configuration.

## Review Notes
The workspace did not have Go installed, so I could not run `apiserver-boot --help`, compile the snippets, or execute code generation locally. I verified commands and APIs against the upstream apiserver-builder-alpha v1.23.0 source checkout, upstream documentation, and the official Kubernetes APIService reference.
