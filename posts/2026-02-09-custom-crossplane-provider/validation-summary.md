# Validation Summary: How to Build a Custom Crossplane Provider for Internal Kubernetes Platform APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane providers and provider packages
- Crossplane managed resources
- crossplane-runtime managed reconciler
- Kubernetes custom resources and controller-runtime
- Go HTTP clients
- Docker container images
- Crossplane xpkg CLI

## Sources Consulted
- Crossplane Providers documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane Managed Resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane CLI command reference for `xpkg build` and `xpkg push`: https://docs.crossplane.io/master/cli/command-reference/
- Crossplane runtime v1.20 managed reconciler source: https://github.com/crossplane/crossplane-runtime/blob/v1.20.0/pkg/reconciler/managed/reconciler.go
- Crossplane runtime v1.20 module metadata: https://github.com/crossplane/crossplane-runtime/blob/v1.20.0/go.mod
- Crossplane package metadata API source: https://github.com/crossplane/crossplane/blob/v2.3.0/apis/pkg/meta/v1/meta.go
- Upjet README: https://github.com/crossplane/upjet
- Crossplane CLI install script: https://raw.githubusercontent.com/crossplane/crossplane/master/install.sh

## Issues Found
- The post incorrectly said Upjet generates providers from an OpenAPI specification or Go API client. Upjet is for generating Crossplane providers from Terraform provider schemas, so the post now describes the tutorial as a hand-written `crossplane-runtime` provider and removes the Upjet install step.
- The setup used Go 1.21, but `crossplane-runtime` v1.20 declares Go 1.23. The post now says Go 1.23+ and uses `golang:1.23` in the Dockerfile.
- The scaffold omitted directories used later in the tutorial. The `mkdir` command now creates the API, controller, client, command, package, and config paths used by later snippets.
- The provider scheme example registered only Kubernetes built-in types. It now delegates to the database API package's `AddToScheme`.
- The managed resource API example imported `reflect` without using it and omitted group/version/kind registration values required by the controller snippet. The example now defines `DatabaseGroupVersion`, `DatabaseGroupKind`, `DatabaseGroupVersionKind`, `SchemeBuilder`, and registers `Database` and `DatabaseList`.
- The controller example referenced `controller.Options` and `event.NewAPIRecorder` without importing the required Crossplane runtime packages. The imports now include `pkg/controller` and `pkg/event`.
- The controller's `Delete` method returned only `error`, but the Crossplane runtime external client interface returns `(managed.ExternalDelete, error)`. The method signature and return values now match the runtime interface.
- The external client did not implement `Disconnect`, which is required by the Crossplane runtime external client interface. A no-op `Disconnect` method was added.
- The platform HTTP client used `bytes.NewReader` without importing `bytes`. The import was added.
- The controller called `UpdateDatabase`, but the platform client did not define `UpdateDatabaseRequest` or `UpdateDatabase`. Both were added.
- `IsNotFound` used a direct type assertion, which fails for wrapped errors. It now uses `errors.As`.
- The packaging section treated the provider runtime image as the Crossplane provider package. The post now distinguishes the runtime image from the xpkg provider package, adds `package/crossplane.yaml`, and uses `crossplane xpkg build` and `crossplane xpkg push`.
- The xpkg build command now uses current flags: `--package-root`, `--package-file`, and `--embed-runtime-image`.
- The install manifest used deprecated `ControllerConfig` and `controllerConfigRef`. It now uses `DeploymentRuntimeConfig` and `runtimeConfigRef`.
- The provider package reference now uses a fully qualified `docker.io/...` OCI reference.

## Review Notes
The examples remain illustrative and omit full production provider pieces such as generated deepcopy files, CRD generation commands, RBAC manifests, a complete `cmd/provider/main.go`, ProviderConfig-based credential loading, and full drift detection in `Observe`. Local Go compilation was not run because `go` is not installed in the review environment.
