# Validation Summary: Scratch Binary Exists but Will Not Run: Check the Dynamic Linker

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Docker and multi-stage Dockerfiles
- Scratch container images
- Linux `execve`
- ELF program headers and `PT_INTERP`
- glibc and the Linux dynamic linker
- GNU binutils (`readelf` and `objdump`)
- Shared-library dependency inspection with `ldd`
- Go static builds and cgo
- Debian and Alpine Linux runtime images
- Unix permissions and script shebangs

## Sources Consulted

- Docker Docs: Base images and creating a minimal image with `scratch` - https://docs.docker.com/build/building/base-images/
- Docker Docs: Multi-stage builds - https://docs.docker.com/build/building/multi-stage/
- Docker Docs: Dockerfile reference for `FROM`, `COPY --from`, `COPY --chmod`, `ENTRYPOINT`, and numeric `USER` values - https://docs.docker.com/reference/dockerfile/
- Docker Official Image documentation and current tags for Go - https://hub.docker.com/_/golang
- Docker Official Image documentation and current tags for Debian - https://hub.docker.com/_/debian
- Docker Official Image documentation describing Alpine's musl libc basis - https://hub.docker.com/_/alpine
- Linux `execve(2)` manual page for ELF/script interpreter handling and `ENOENT`, `EACCES`, and `ENOEXEC` semantics - https://man7.org/linux/man-pages/man2/execve.2.html
- Linux dynamic linker manual page for ELF interpreter and shared-object loading behavior - https://man7.org/linux/man-pages/man8/ld.so.8.html
- Linux `ldd(1)` manual page for dependency-tree output, the untrusted-executable warning, and the `objdump -p ... | grep NEEDED` alternative - https://man7.org/linux/man-pages/man1/ldd.1.html
- GNU C Library manual: Dynamic Linker - https://sourceware.org/glibc/manual/latest/html_node/Dynamic-Linker.html
- GNU Binary Utilities manual: `readelf` - https://sourceware.org/binutils/docs/binutils/readelf.html
- GNU Binary Utilities manual: `objdump` - https://sourceware.org/binutils/docs/binutils/objdump.html
- GNU Coreutils manual: `stat` invocation and format sequences - https://www.gnu.org/software/coreutils/manual/html_node/stat-invocation.html
- Go command documentation for `go build`, `-o`, and `-trimpath` - https://go.dev/cmd/go/#hdr-Compile_packages_and_dependencies
- Go cgo documentation for `CGO_ENABLED=0` behavior - https://pkg.go.dev/cmd/cgo
- Go 1.25 release notes - https://go.dev/doc/go1.25
- Go source documentation for Linux CA-certificate paths and time-zone data lookup - https://go.dev/src/crypto/x509/root_linux.go and https://go.dev/src/time/zoneinfo.go

## Issues Found
No technical issues found.

## Review Notes
The Dockerfile instructions and shell commands agree with current documentation. The `golang:1.25-bookworm`, `debian:bookworm`, and `debian:bookworm-slim` references resolved in the registry on the validation date. A local Go 1.25 cross-build using `CGO_ENABLED=0 GOOS=linux` produced a statically linked Linux ELF artifact, consistent with the example's claim. The first Dockerfile's `make /out/server` command is necessarily project-specific and assumes the repository's Makefile defines that target. The image tags are valid but mutable, so a future reproducibility-focused revision could pin patch versions or digests.
