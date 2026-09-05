# Validation Summary: How to Use ko in Google Cloud Build Without a Docker Daemon or Missing-Shell Errors

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Go and its module and build caches
- ko v0.19.1
- Google Cloud Build
- Artifact Registry and Cloud Storage
- Google Cloud IAM and Application Default Credentials
- Kubernetes manifests and multi-platform container images

## Sources Consulted
- ko introduction: https://ko.build/
- ko build CLI reference: https://ko.build/reference/ko_build/
- ko resolve CLI reference: https://ko.build/reference/ko_resolve/
- ko Kubernetes integration: https://ko.build/features/k8s/
- ko build cache: https://ko.build/features/build-cache/
- ko v0.19.1 release: https://github.com/ko-build/ko/releases/tag/v0.19.1
- Release image configuration: https://github.com/ko-build/ko/blob/v0.19.1/.goreleaser.yml
- Version-specific entrypoint and build implementation: https://github.com/ko-build/ko/blob/v0.19.1/pkg/build/gobuild.go
- Version-specific registry keychains: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/config.go
- Version-specific image-reference recording: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/recorder.go
- Image-reference tests: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/recorder_test.go
- Build stdout implementation: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/build.go
- Resolve output implementation: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/resolve.go
- Cache implementation: https://github.com/ko-build/ko/blob/v0.19.1/pkg/build/cache.go
- Google registry credential discovery: https://github.com/google/go-containerregistry/blob/main/pkg/v1/google/keychain.go
- Cloud Build configuration: https://cloud.google.com/build/docs/configuring-builds/create-basic-configuration
- Cloud Build schema: https://cloud.google.com/build/docs/build-config-file-schema
- Cloud Build working-directory implementation: https://github.com/GoogleCloudPlatform/cloud-build-local/blob/master/build/build.go
- Cloud Build service-account access: https://cloud.google.com/build/docs/securing-builds/configure-access-for-cloud-build-service-account
- Default service-account changes: https://cloud.google.com/build/docs/cloud-build-service-account-updates
- Cloud Storage artifacts: https://docs.cloud.google.com/build/docs/building/store-artifacts-in-cloud-storage
- Artifact Registry locations: https://cloud.google.com/artifact-registry/docs/repositories/repo-locations
- Repository creation CLI: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Artifact Registry roles: https://cloud.google.com/iam/docs/roles-permissions/artifactregistry
- ADC discovery: https://docs.cloud.google.com/docs/authentication/application-default-credentials
- Go command and cache documentation: https://pkg.go.dev/cmd/go

## Issues Found
1. **Repository location scope:** Repositories were described as regional only. Added multi-regional locations, which Artifact Registry also supports. The europe-west1 example remains valid.
2. **Working-directory precedence:** The text implied that the image working-directory setting controls the step default. Clarified that Cloud Build uses its workspace and step dir setting; an entrypoint can subsequently change directory.
3. **Multi-platform stdout handoff:** A follow-up step cannot directly redirect a completed build command's stdout. Changed the advice to capture ko build stdout in the shell-capable step that runs it, saving the top-level index reference into /workspace.
4. **Shell-error attribution:** The shown -c argument fails at ko flag parsing. Separated this from missing executables caused by entrypoint overrides and clarified that this release's Go-based builder includes a shell.
5. **Resolve input prerequisite:** Added that manifests must contain ko:// Go import-path references; resolve does not automatically rebuild arbitrary existing image references.
6. **Cache correctness guarantee:** Removed the blanket assertion that cached content is validated sufficiently to guarantee correctness. The ko cache reads stored metadata, so trusted cache writers matter. Added Go's documented caveat that external C-library changes with cgo require invalidation or forced rebuilding.

## Review Notes
- Confirmed the v0.19.1 source checkout by its exact Git tag. The release configuration uses a Go base image, and ko sets the generated image entrypoint to its binary.
- Verified build, resolve, --platform, --image-refs, --verbose, and -f against the CLI documentation and relevant release source. The intentionally incorrect -c example remains as an instructional counterexample.
- Verified Cloud Build steps, args, env, artifacts.objects, workspace sharing, and repository creation options. PROJECT_ID and BUILD_ID are Cloud Build substitutions; the repository creation command uses the active gcloud project unless overridden.
- The single-package, single-platform build records one image reference. Multi-platform recording includes the index and child images; build stdout returns the published top-level reference.
- Authentication relies on the actual runtime principal and registry permissions. Credential overrides can change the principal selected by the keychain. A user-managed build service account also needs appropriate build-log configuration and permissions when adopted.
- The source must contain a buildable Go main package at ./cmd/api, and the repository and optional artifact bucket must exist with suitable permissions. No real Cloud Build job, registry push, or bucket upload was executed; this was documentation/source validation with local syntax checks.
- Reviewed the post's official documentation links; they resolve to the intended resources, including Google's redirects to docs.cloud.google.com.
- Kept the pinned release and existing section structure. Version tags remain mutable; digest pinning is appropriate. The bundled Go toolchain must satisfy the application's module requirements.
