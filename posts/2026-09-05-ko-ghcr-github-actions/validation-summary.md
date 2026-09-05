# Validation Summary: How to Build and Push a Go Image to GHCR with ko in GitHub Actions

## Status

validated

## Post Type

Tutorial

## Technologies Covered

- Go and the Go test command
- ko v0.19.1 and ko-build/setup-ko v0.10
- GitHub Actions and GITHUB_TOKEN permissions
- GitHub Container Registry (GHCR)
- Container image tags, digests, and multi-platform indexes
- Kubernetes manifest resolution and private image access

## Sources Consulted

- setup-ko versioned action implementation: https://github.com/ko-build/setup-ko/blob/v0.10/action.yml
- ko introduction and daemonless builds: https://ko.build/
- ko build CLI reference: https://ko.build/reference/ko_build/
- ko resolve CLI reference: https://ko.build/reference/ko_resolve/
- ko login CLI reference: https://ko.build/reference/ko_login/
- ko v0.19.1 build command and standard output: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/build.go
- ko v0.19.1 publishing flags and default naming: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/options/publish.go
- ko v0.19.1 digest publication: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/default.go
- ko v0.19.1 image reference recorder: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/recorder.go
- Container registry client tag validation: https://github.com/google/go-containerregistry/blob/main/pkg/name/tag.go
- GitHub workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub rulesets: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- GitHub publishing tutorial: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- GitHub token authentication: https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
- GitHub secure use reference: https://docs.github.com/en/actions/reference/security/secure-use
- GitHub reusable workflows: https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- GHCR authentication, visibility, and package access: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Official action READMEs and v7 action definitions: https://github.com/actions/checkout, https://github.com/actions/checkout/blob/v7/action.yml, https://github.com/actions/setup-go, https://github.com/actions/setup-go/blob/v7/action.yml, https://github.com/actions/upload-artifact, https://github.com/actions/upload-artifact/blob/v7/action.yml
- Go test documentation: https://pkg.go.dev/cmd/go#hdr-Test_packages

## Issues Found

1. **Trigger filters did not establish the stated trust boundary.** The branch and tag filters select events but do not protect refs or ensure a tagged commit belongs to `main`. Clarified that branch protection and a tag ruleset restricting tag creation to trusted release actors must be configured separately.
2. **Release tag validation omitted the container tag length limit.** The regular expression accepted arbitrarily long version strings, while container tags are limited to 128 characters. Added a length check to the existing condition; longer names now follow the existing `edge` fallback.
3. **GitHub action examples used older major versions.** Updated checkout v4, setup-go v5, and upload-artifact v4 to their verified v7 releases. Checked the versioned action definitions for the inputs used and Node 24 runtime. The workflow uses GitHub-hosted `ubuntu-latest`; custom runners would need to meet the actions' runtime requirements. This update does not imply that every older action major is unusable.

## Review Notes

- Confirmed that setup-ko v0.10 installs the requested version, lowercases the default GHCR repository namespace, exports KO_DOCKER_REPO, and logs in using github.token. A preconfigured KO_DOCKER_REPO skips automatic login and is forwarded to later steps.
- Confirmed ko's package-based naming, default push behavior, repeated tags, login flags, verbose option, and image reference output. Retained ko v0.19.1 because the post explicitly explains behavior for that version.
- Inspected the v0.19.1 recorder implementation: multi-platform index recording walks child entities, while the build command prints the returned top-level reference. Capturing standard output is appropriate for this single-package example.
- Confirmed the permission model, reusable-workflow permission ceiling, fork restrictions under normal settings, package visibility considerations, and digest-based deployment guidance. Repository and organization settings remain prerequisites that cannot be verified from this blog repository.
- `ko resolve` builds and publishes referenced Go packages and writes resolved manifests; it is an additional build, not a lookup of the previously saved image reference. Deploy the digests in its generated release.yaml when using that variant.
- The render step interpolates a previously constrained output, rather than raw event text. The allowed output alphabet makes the shown shell argument safe.
- The release-name pattern accepts a subset of version-like names, not all Semantic Versioning strings. Nonmatching tags intentionally use `edge`; no full SemVer support is claimed.
- Parsed all four YAML blocks and checked all six embedded shell scripts with bash -n. Exercised six tag-selection cases: branch, stable release, prerelease, nonmatching tag, 128-character tag, and 129-character tag. All passed.
- Checked the article's documentation destinations; legacy GitHub security URLs redirect to the relevant current pages.
- No authenticated GHCR push or Kubernetes deployment was performed. End-to-end execution requires an application at ./cmd/api, go.mod, manifests under config/ for the resolve variant, and appropriate GitHub package access.
