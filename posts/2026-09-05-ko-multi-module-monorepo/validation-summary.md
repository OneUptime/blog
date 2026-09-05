# Validation Summary: How to Build Multiple Go Services from a Monorepo with ko and Multiple `go.mod` Files

## Status
validated

## Post Type
Technical guide with configuration and command examples.

## Technologies Covered
- Go, Go modules, and multi-module workspaces
- ko build configuration, container publishing, and image naming
- Go linker flags and Git metadata templates
- Go and ko caches
- CI dependency tracking and container runtime verification

## Sources Consulted
- ko configuration: https://ko.build/configuration/#overriding-go-build-settings
- ko CLI reference: https://ko.build/reference/ko_build/
- ko build cache: https://ko.build/features/build-cache/
- ko multi-platform images: https://ko.build/features/multi-platform/
- ko authoritative multi-builder implementation: https://github.com/ko-build/ko/blob/main/pkg/build/gobuilds.go
- ko configuration types: https://github.com/ko-build/ko/blob/main/pkg/build/config.go
- ko Go builder implementation: https://github.com/ko-build/ko/blob/main/pkg/build/gobuild.go
- Go workspace tutorial: https://go.dev/doc/tutorial/workspaces
- Go modules reference: https://go.dev/ref/mod
- Go command reference, including -C, list, test, and caching: https://pkg.go.dev/cmd/go
- Go linker flags: https://pkg.go.dev/cmd/link
- Go toolchain selection and version requirements: https://go.dev/doc/toolchain
- Go 1.26 release notes: https://go.dev/doc/go1.26
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. **Ambiguous path explanation.** The post said both paths were relative to the process working directory immediately after saying `main` was relative to `dir`. Clarified that `dir` is process-relative and the command path joins `dir` and `main`. The ko multi-builder source confirms module-directory dispatch and conversion of local targets to module-relative paths.
2. **Unstated configuration prerequisites.** The base digests and registry paths are placeholders, and the linker targets refer to packages omitted from the abbreviated layout. Added instructions to substitute real digests and accessible repositories, and stated the required imported version packages, string variables, and Git metadata. Go linker `-X` cannot supply meaningful version metadata without a suitable variable in the program.
3. **Assumed workspace checksum file.** Made committing `go.work.sum` conditional on Go generating it. It records additional workspace checksums and need not exist for every workspace.
4. **Incomplete cache inputs and overbroad invalidation claim.** Added both `go.mod` files and `go.work` to the cache-input example. Explained that dependency-file hashes change restore keys for those inputs, not every source edit, and that only existing sum files should be included.
5. **Overstated cache-sharing restrictions.** Replaced the implication that version/platform separation is universally required with Go's actual cache behavior: build entries account for compiler and build inputs, while the module cache holds downloaded modules. Retained the trusted-environment constraint.
6. **Missing workspace input in change filtering.** Added `go.work` alongside `go.work.sum`, since workspace membership and replacements can alter dependency resolution.
7. **Digest validity confused with release suitability.** Clarified that an existing digest continues identifying the old image after input changes; whether to reuse that image is a separate release decision.
8. **Assumed application version command.** Made the runtime version check conditional on the service implementing it. ko does not add application CLI commands.

## Review Notes
- Confirmed the YAML fields, Git commit template, local and fully qualified targets, `KO_DOCKER_REPO`, `--image-refs`, and naming flags against ko documentation and source. The friendly build ID is internal metadata.
- Confirmed `go -C` placement, package-list formatting, independent `GOWORK=off` tests, and explicit workspace package patterns. The root integration test assumes workspace mode is enabled.
- `go 1.26` is valid. The selected toolchain must satisfy the workspace requirement, and the workspace version must be at least each member module's declared Go version. Automatic toolchain selection may download a newer toolchain.
- Coordinated workspace releases are a documented exception to Go's general advice against committing workspaces. Independent module testing remains appropriate.
- The sample disables cgo. Services requiring cgo need additional build/runtime configuration. Go's general cache behavior also has a documented exception for changes to external C libraries.
- Reviewed all supplied documentation links; they point to the intended official resources. Example module and registry domains are illustrative rather than deployable services.
- Validation was by official documentation and source inspection. The local Go installation is 1.25.3 and ko is not installed. No container build, registry publication, or platform smoke test was executed; actual service sources, usable base digests, and registry access were not supplied.
