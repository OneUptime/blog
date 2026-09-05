# Validation Summary: How to Embed ko's `pkg/build` and `pkg/publish` APIs in a Go Tool

## Status
validated

## Post Type
Tutorial / library integration guide

## Technologies Covered
- Go modules, toolchains, contexts, deferred cleanup, and error handling
- ko v0.19.1 build and publish packages
- go-containerregistry registry access and authentication
- OCI images, indexes, layouts, labels, and digests
- Multi-platform builds, caching, concurrency, and publication orchestration

## Sources Consulted
- Official composition example: https://ko.build/advanced/go-packages/
- Pinned module declaration: https://github.com/ko-build/ko/blob/v0.19.1/go.mod
- Build API documentation: https://pkg.go.dev/github.com/google/ko/pkg/build
- Pinned build implementation and options: https://github.com/ko-build/ko/tree/v0.19.1/pkg/build
- Publish API documentation: https://pkg.go.dev/github.com/google/ko/pkg/publish
- Pinned publishers, caching, and naming implementation: https://github.com/ko-build/ko/tree/v0.19.1/pkg/publish
- CLI authentication composition: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/config.go
- Registry authentication: https://pkg.go.dev/github.com/google/go-containerregistry/pkg/authn
- Remote operations and descriptors: https://pkg.go.dev/github.com/google/go-containerregistry/pkg/v1/remote
- Go module commands: https://go.dev/ref/mod#go-mod-tidy
- Go fatal logging behavior: https://pkg.go.dev/log#Fatalf
- Context timeout API: https://pkg.go.dev/context#WithTimeout
- OCI image specification: https://github.com/opencontainers/image-spec

## Issues Found
1. **Deferred cleanup bypassed on publication failure.** `log.Fatalf` exits the process without running deferred functions. Moved the work into an error-returning `run` function and retained fatal logging only in `main`, after cleanup. Close errors are joined with the operation error and returned, rather than merely logged.
2. **Deprecated concurrency recommendation.** `build.NewLimiter` is explicitly deprecated in v0.19.1. Replaced the recommendation with `build.WithJobs`, while noting the deprecation.
3. **Cache behavior insufficiently specified.** Build caching keys on the import-path string and requires explicit invalidation after source/base changes. Publication caching uses the source string and result-object equality rather than content digests. Clarified these behaviors and that errors are cached, which affects retries.
4. **Platform completeness was ambiguous.** The builder selects matching base descriptors and can succeed with only one requested platform. Clarified that callers must verify the output contains every required platform.
5. **Base retrieval context was unspecified.** The builder uses the context supplied to `NewGo` for base retrieval, rather than the per-call `Build` context. Clarified timeout propagation and the `time` import needed by the timeout snippet.
6. **Qualification overstated validation.** `QualifyImport` does not guarantee the path is a supported main package. Corrected the interface description; the separate `IsSupportedReference` check remains appropriate.
7. **Setup prerequisites were implicit.** Added the initialized-module and placeholder replacement requirements, and specified that `go mod tidy` must run after adding imports so it does not remove the unused ko requirement.

## Review Notes
- Verified the v0.19.1 source checkout at commit `e388f65a1f036f19703b8aff13e1aa5521bc6988`. Its module path is `github.com/google/ko`, and its declared minimum Go version is 1.26.3; both original claims were correct.
- Successfully ran `go mod tidy` and compiled the corrected main example using Go 1.26.3 and ko v0.19.1 in an isolated temporary module. Also compiled all smaller Go snippets with the necessary enclosing functions and imports.
- Confirmed the referenced constructors, options, interface signatures, default digest-bearing publication result, index/image distinction, and sequential last-publisher-wins behavior against pinned source. The unversioned package documentation links resolve; pinned source was used for version-specific decisions.
- Registry and source constants are illustrative placeholders. No registry upload, authenticated end-to-end test, or real multi-platform image build was performed. The suggested integration assertions are recommendations, not tests executed in this review.
- `NewLayout` writes OCI content locally, but remote bases can still require downloads. Its implementation ignores the publication context for local writes; cancellation behavior should be tested for the chosen publisher.
- Default publication naming appends the source import path beneath the supplied repository prefix. Alternate publisher options can change reference behavior, including tag-only output; the sample uses digest-bearing defaults.
- The floating base tag remains intentionally illustrative. Release tooling must resolve and verify a suitable pinned base index. Authentication redaction and policy enforcement are application responsibilities, not automatic guarantees of these interfaces.
- Documentation links point to the intended official resources. Example organization, command, and registry URLs are placeholders rather than operational endpoints.
