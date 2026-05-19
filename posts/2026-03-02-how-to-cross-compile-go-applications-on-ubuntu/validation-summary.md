# Validation Summary: How to Cross-Compile Go Applications on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- CGO
- Ubuntu package management
- Docker / Docker Buildx
- Make
- GitHub Actions

## Sources Consulted
- Go command documentation: https://pkg.go.dev/cmd/go
- Go downloads / current stable releases: https://go.dev/dl/
- Docker Build export documentation: https://docs.docker.com/build/building/export/
- Docker build CLI reference: https://docs.docker.com/reference/cli/docker/image/build/
- GitHub Actions Go documentation: https://docs.github.com/en/actions/tutorials/build-and-test-code/go
- actions/setup-go documentation: https://github.com/actions/setup-go
- Ubuntu package metadata via `apt-cache show` for `gcc-aarch64-linux-gnu`, `gcc-arm-linux-gnueabihf`, and `gcc-i686-linux-gnu`

## Issues Found
- The opening paragraph said Ubuntu could produce binaries for other platforms without additional toolchains or VMs. That is only generally true for pure Go code, because CGO cross-compilation requires a target C compiler. Updated the sentence to specify "pure Go binaries."
- The CGO detection command was labeled as checking dependencies, but `go list -f '{{.CgoFiles}}' ./...` only lists matched packages. Updated it to use `go list -deps` and print only packages with CGO files.
- The Docker section said it was for CGO-heavy projects, but the shown Dockerfile did not enable CGO or install target C cross-compilers. Updated the wording to describe containerized pure Go builds.
- The Docker `--output` example would export the final stage filesystem. Since the final stage was the `golang` builder image, it would not export only the release binaries. Added a minimal `FROM scratch` final stage that copies `/dist/` from the builder, matching Docker's documented local export pattern.
- The Dockerfile and GitHub Actions examples pinned Go 1.22, which is outdated as of May 19, 2026. Updated the examples to Go 1.26 / `1.26.x`.

## Review Notes
The remaining commands and snippets are technically sound for typical pure Go projects. CGO examples cover Linux cross-compilers only; macOS and Windows CGO cross-compilation from Ubuntu remain more involved and may need platform-specific tooling or CI runners.
