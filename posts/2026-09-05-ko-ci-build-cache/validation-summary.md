# Validation Summary: How to Speed Up Repeated ko Builds in CI with `KOCACHE` and Shared Go Caches

## Status
validated

## Post Type
Technical guide with shell commands and a GitHub Actions configuration fragment.

## Technologies Covered
- Go module, build, and test caches (`GOMODCACHE` and `GOCACHE`)
- ko 0.19.1 and `KOCACHE`
- GitHub Actions, actions/setup-go, and actions/cache
- Container registries, deterministic builds, multi-platform builds, and CGO

## Sources Consulted
- ko build cache: https://ko.build/features/build-cache/
- ko configuration: https://ko.build/configuration/
- ko build CLI: https://ko.build/reference/ko_build/
- ko 0.19.1 release: https://github.com/ko-build/ko/releases/tag/v0.19.1
- Go caching documentation: https://pkg.go.dev/cmd/go#hdr-Build_and_test_caching
- Go module cache and verification: https://go.dev/ref/mod#module-cache and https://go.dev/ref/mod#go-mod-verify
- GitHub dependency caching: https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- Cache action documentation and v4 inputs: https://github.com/actions/cache and https://raw.githubusercontent.com/actions/cache/v4/action.yml
- Setup Go documentation and v5 inputs: https://github.com/actions/setup-go and https://raw.githubusercontent.com/actions/setup-go/v5/action.yml
- Local Go CLI documentation: `go help cache` and `go help mod verify`.

## Issues Found
1. **Cache eviction:** The text generalized automatic eviction to both Go caches. Clarified that automatic pruning applies to the build cache; module-cache cleanup is explicit.
2. **Restored module verification:** The download explanation implied full verification of restored files. Distinguished recorded checksum checks from `go mod verify` and retained the requirement to trust cache writers.
3. **Immutable cache refresh:** The original key stayed identical across source changes with unchanged dependencies. Added a commit suffix and dependency-specific restore prefix so subsequent commits can save updated artifacts while reusing previous entries. Added a cache generation and trusted-domain prefix and matched nested workspace checksum files.
4. **Workflow prerequisites and trust policy:** The combined cache action saves automatically after a successful job, but the fragment neither ran tests nor stated a protected-branch execution restriction. Added tests in the same cache environment and explicitly scoped the fragment to protected-branch pushes with prior checkout. Clarified that varying target and CGO policies must also constrain restores.
5. **CGO invalidation:** Native-library changes can escape Go cache invalidation. Added explicit fresh-cache guidance covering both Go and ko and excluded incompatible restore fallbacks.

## Review Notes
- Confirmed the three cache roles, registry blob reuse, and the documented registry-dependent ko fast path. Absolute cache paths, the CLI invocations, configuration names, and action input fields are valid.
- ko 0.19.1 is an official release. The retained setup-go v5 and cache v4 references are older majors with valid documented inputs; upstream currently documents newer majors. They are not described as latest. Future upgrades should account for action-runtime and runner requirements.
- The YAML is a steps fragment, not a complete workflow. The surrounding workflow must enforce the stated trigger restriction. A trusted key label alone is not an access-control mechanism. GitHub also applies cache scope restrictions and immutable entries.
- `registry.example.com` and `./cmd/api` are application-specific placeholders. No image build or registry push was performed: ko is not installed locally and the post supplies no runnable application or registry credentials.
- Official documentation links resolve to relevant resources; the original GitHub caching URL redirects to its current reference page. The author profile link is attribution rather than technical evidence.
- Validation included shell syntax checks, YAML parsing, JSON structure checks, and a whitespace/error review of the final diff. Performance and image-digest claims were assessed against documentation, not benchmarked.
