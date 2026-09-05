# Validation Summary: How to Stamp Git Commit and Version Metadata into a ko Image with `ldflags` and OCI Labels

## Status
validated

## Post Type
Technical guide with Go code, ko configuration, and release/verification shell commands.

## Technologies Covered
- Go linker flags and embedded VCS build information
- ko 0.19.1 image builds and configuration templates
- Git tags, commit identifiers, signing, and working-tree state
- OCI image labels, annotations, manifests, configurations, and digests
- Docker image execution and inspection
- Bash and GitHub Actions release inputs
- Reproducible builds and SOURCE_DATE_EPOCH

## Sources Consulted
- ko configuration and image naming: https://ko.build/configuration/
- ko linker flag precedence and reproducibility FAQ: https://ko.build/advanced/faq/
- ko build CLI reference: https://ko.build/reference/ko_build/
- ko 0.19.1 release: https://github.com/ko-build/ko/releases/tag/v0.19.1
- ko 0.19.1 Git template implementation: https://github.com/ko-build/ko/blob/v0.19.1/pkg/internal/git/info.go
- ko 0.19.1 build implementation and tests: https://github.com/ko-build/ko/blob/v0.19.1/pkg/build/gobuild.go and https://github.com/ko-build/ko/blob/v0.19.1/pkg/build/gobuild_test.go
- ko timestamp parsing: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/config.go
- ko stdout handling and recursive reference recording: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/build.go and https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/recorder.go
- Go linker options: https://pkg.go.dev/cmd/link
- Go build and version commands: https://pkg.go.dev/cmd/go
- Go build information and VCS settings: https://pkg.go.dev/runtime/debug#ReadBuildInfo
- OCI annotation definitions: https://github.com/opencontainers/image-spec/blob/main/annotations.md
- OCI image configuration: https://github.com/opencontainers/image-spec/blob/main/config.md
- Git revision resolution: https://git-scm.com/docs/git-rev-parse
- Git commit date formats: https://git-scm.com/docs/git-show
- Git status porcelain output: https://git-scm.com/docs/git-status
- Git tag selection: https://git-scm.com/docs/git-describe
- Git signature verification: https://git-scm.com/docs/git-verify-tag
- GitHub Actions pull-request checkout identity: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request
- Docker run: https://docs.docker.com/reference/cli/docker/container/run/
- Docker image inspect: https://docs.docker.com/reference/cli/docker/image/inspect/
- Local Bash syntax validation with bash -n; GNU Bash web manual retrieval was unavailable.

## Issues Found
1. **Missing Git metadata was described too broadly.** Only the tag, branch, and commit strings are empty; date and state fields have zero/default values. Narrowed the statement and clarified that Git.Tag can select an ancestor tag, as confirmed by ko's git describe invocation.
2. **Release checks did not reliably reject failures or establish tag identity.** Standalone test commands can fail while later commands continue. Added explicit failure exits, separately checked Git command results, validated the tag's peeled commit against HEAD, verified the signed tag, and documented the trusted-key prerequisite. Exported VERSION so the environment template can read it.
3. **Later examples discarded validated inputs or required metadata.** Replaced the hard-coded lowercase version with the validated VERSION input. Preserved the release tag and source label in the combined linker/label build. The verification build now includes all three linker values and the version, revision, and source labels instead of rebuilding an image without those CLI settings. Noted that dist/ must be ignored to avoid dirty subsequent builds.
4. **Descriptor inspection was insufficient for configuration labels.** Changed the instruction to inspect the manifest and its referenced image configuration; labels reside in the latter.
5. **Example image names disagreed with KO_DOCKER_REPO.** With registry.example.com/acme/api as the repository prefix, ko appends /api-<hash>. Corrected both discovery and digest-qualified examples to include that path segment.

## Review Notes
- Confirmed the named ko 0.19.1 behaviors directly in the tagged official source: no-tag fallback to v0.0.0 with a warning, CLI linker flag precedence, SOURCE_DATE_EPOCH parsing, stdout output for the requested package, and recursive index/child reference recording.
- Compiled the post's Go snippets in a temporary example.com/acme/api module using the exact internal package symbol paths. The executable reported the expected version, full commit string, and RFC 3339 source date after linker stamping.
- Every Bash code block passed bash -n. Reviewed YAML fields and template names against ko documentation and implementation. Checked the final diff for whitespace errors and parsed validation.json.
- No container was published or run, and no remote multi-platform image was inspected: the example application and registry are placeholders. Container behavior was checked against official documentation and source, not claimed as an end-to-end runtime test.
- The fmt.Printf fragment requires application wiring for --version, as the surrounding text specifies. Docker image inspect examines the locally pulled image after docker run; inspecting all remote platform children requires a registry-aware tool.
- SOURCE_DATE_EPOCH stabilizes the configured creation time and also affects ko's Date/Timestamp templates. Git.CommitDate remains source metadata. Timestamp control alone does not pin other reproducibility inputs such as the base-image digest, Go toolchain, dependencies, or target platform.
- Existing documentation links point to the intended official resources. The article explicitly scopes implementation details to ko 0.19.1; it does not claim that release is the latest.
