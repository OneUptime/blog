# Validation Summary: How to Configure Different Base Images and Build Flags for Multiple Go Commands in `.ko.yaml`

## Status
validated

## Post Type
Technical configuration guide with YAML examples and shell commands.

## Technologies Covered
- Go modules, command packages, build tags, and linker flags
- ko 0.19.1 and `.ko.yaml`
- CGO and C compiler toolchains
- OCI container images, manifests, indexes, and digest references
- Bash and CI environment variables
- Chainguard static base images

## Sources Consulted
- [ko configuration](https://ko.build/configuration/)
- [ko build CLI reference](https://ko.build/reference/ko_build/)
- [ko 0.19.1 release](https://github.com/ko-build/ko/releases/tag/v0.19.1)
- [ko 0.19.1 build implementation](https://github.com/ko-build/ko/blob/v0.19.1/pkg/build/gobuild.go): inspected `configForImportPath`, `buildOne`, `applyTemplating`, and argument construction in the local tagged source checkout.
- [ko 0.19.1 configuration mapping](https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/options/build.go): inspected `createBuildConfigMap`.
- [Go list](https://pkg.go.dev/cmd/go#hdr-List_packages_or_modules)
- [Go build](https://pkg.go.dev/cmd/go#hdr-Compile_packages_and_dependencies)
- [Go linker](https://pkg.go.dev/cmd/link)
- [Go CGO documentation](https://pkg.go.dev/cmd/cgo)
- [OCI image manifest](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
- [OCI image index](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
- [OCI content descriptors and digest requirements](https://github.com/opencontainers/image-spec/blob/main/descriptor.md)
- [Chainguard static image overview](https://images.chainguard.dev/directory/image/static/overview)

## Issues Found
1. **The CI version check did not guarantee termination.** A standalone `test -n "$VERSION"` can fail while the next command still runs. Replaced it with `: "${VERSION:?VERSION must be set and nonempty}"` and exported `VERSION` so ko receives it even when it began as an unexported shell variable. Verified unset, empty, and populated cases in Bash.
2. **Empty per-build lists were not distinguished from overrides.** In ko 0.19.1, zero-length `flags`, `ldflags`, and `env` lists use their defaults. Updated the precedence explanation to specify nonempty overrides and explain that `[]` does not clear defaults. Confirmed the length checks directly in the tagged implementation.
3. **Image references contained unusable placeholder digests without an explicit replacement instruction.** Added a short instruction to replace the example registries and digest placeholders, including the required 64 hexadecimal characters for SHA-256.
4. **Linker symbol prerequisites were omitted.** The illustrated layout does not show the `internal/version` package. Clarified that the linker examples require the imported package and suitable string variables, consistent with the Go linker's `-X` requirements.
5. **CGO requirements were incomplete for cross-compilation and overstated dynamic dependencies.** Clarified that the compiler and development libraries must target the container platform and cross-compilation requires an appropriate C cross-compiler. Qualified runtime loader/library requirements to apply to dynamically linked binaries.

## Review Notes
- Confirmed build selection uses the resolved package import path, with `dir` relative to the process working directory and `main` relative to `dir`; IDs do not select CLI targets.
- Confirmed the documented default base, flag tokenization, independent `-trimpath` addition, environment precedence, nonempty CLI linker-flag precedence, and the version-specific missing-template-key behavior.
- Confirmed multi-package build syntax, `KO_DOCKER_REPO`, inherited `--verbose`, and `--image-refs` against the official CLI documentation.
- The multiple-module configuration still requires packages to be resolvable in the invoking Go environment; a suitable Go workspace may be needed when building across modules from the root.
- Runtime health checks, native library loading, and migration-tool behavior remain application-specific acceptance checks. No application source, real custom base images, or registry credentials were supplied, so no container build, publication, or runtime verification was performed.
- Official documentation links resolve to the intended resources. The author profile is attribution rather than a technical source. Attempts to retrieve the GNU Bash manual failed; shell behavior was checked locally instead.
- Changes preserve the original sections and focus on technical corrections. JSON parsing, shell syntax, and whitespace checks were performed.
