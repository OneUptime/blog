# Validation Summary: How to Avoid ko Image-Name Collisions with `--preserve-import-paths`, `--base-import-paths`, and `--bare`

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ko v0.19.1 and its image repository naming modes
- Go import paths, main packages, and `go list`
- Container registries, tags, and digest-pinned references
- OCI image manifests and distribution
- Shell commands and CI publishing workflows

## Sources Consulted
- ko naming strategies: https://ko.build/configuration/#naming-images
- ko build CLI reference: https://ko.build/reference/ko_build/
- ko v0.19.1 naming functions, flags, and precedence: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/options/publish.go
- ko v0.19.1 publishing implementation, lowercase normalization, and returned references: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/default.go
- ko release metadata: https://github.com/ko-build/ko/releases/tag/v0.19.1
- Go list package fields and template formatting: https://pkg.go.dev/cmd/go#hdr-List_packages_or_modules
- OCI Distribution Specification: https://github.com/opencontainers/distribution-spec/blob/main/spec.md
- OCI Image Manifest Specification: https://github.com/opencontainers/image-spec/blob/main/manifest.md

## Issues Found
1. Naming explanations omitted lowercase normalization. The publisher lowercases import paths before invoking the naming function, including before computing the default MD5 suffix. Corrected the default and preserve-mode descriptions, base-name uniqueness guidance, collision review instructions, and conclusion. Distinct paths differing only by case do not receive distinct repository names.
2. Migration advice implied every import-path rename changes the destination. Qualified this for case-only changes, which normalization removes, and clarified that a command move must change its import path to affect naming.
3. Retaining manifests alone was described as sufficient for existing digest-pinned deployments. Clarified that all referenced blobs must also remain available for subsequent pulls.

## Review Notes
- Verified relative package arguments, multiple build arguments, `KO_DOCKER_REPO`, `--image-refs`, all three naming flags, and the `-P`/`-B` aliases against official CLI documentation and versioned source. No deprecated syntax was identified.
- Confirmed the default publisher pushes `latest` but omits it from the returned digest reference in v0.19.1. A single explicit non-latest tag is included alongside the digest; multiple tags produce a digest-only reference.
- Confirmed naming precedence in v0.19.1 is preserve, base, bare, then default for CLI flags. The recommendation to select one strategy remains appropriate.
- The CLI help contains the stated tag-combination caveats. The release endpoint resolved to v0.19.1 during review.
- Verified the Go template uses the documented Name and ImportPath fields. The inventory applies to packages selected by `./...` in the current module/workspace and build context; separately rooted modules and other build configurations may require additional inventory runs.
- Repository and digest examples are illustrative placeholders. Build commands assume the shown main packages exist, the shell is at the relevant module root, and a real registry prefix and credentials are supplied.
- Reviewed shell syntax and publisher source; no live registry pushes were performed, and ko was not installed locally. Registry-specific immutability, permissions, depth limits, and retention behavior require testing against the chosen registry.
- Confirmed the five official documentation links lead to their intended resources. Changes were limited to technical corrections without adding or reorganizing post sections.
