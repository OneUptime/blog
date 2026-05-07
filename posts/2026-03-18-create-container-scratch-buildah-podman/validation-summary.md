# Validation Summary: How to Create a Container from Scratch with Buildah and Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Buildah
- Podman
- Scratch container images
- Go
- C
- GCC
- Static linking
- Linux container image metadata

## Sources Consulted
- Buildah official getting started guide: https://buildah.io/blogs/2017/11/02/getting-started-with-buildah.html
- Buildah config man page: https://manpages.debian.org/testing/buildah/buildah-config.1.en.html
- Buildah add man page: https://manpages.debian.org/testing/buildah/buildah-add.1.en.html
- Buildah commit man page: https://man.archlinux.org/man/buildah-commit.1.en
- Podman images documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Go cgo command documentation: https://pkg.go.dev/cmd/cgo
- Go net package documentation: https://pkg.go.dev/net
- GCC link options documentation: https://gcc.gnu.org/onlinedocs/gcc/Link-Options.html

## Issues Found
- The introductory security claim said scratch images have "zero unnecessary packages or vulnerabilities." This was too broad because application binaries and copied dependencies can still contain vulnerabilities. Changed it to say scratch images avoid unnecessary OS packages inherited from a base image.
- The opening and summary described scratch images as the "smallest possible" and "most secure images possible." These were overclaims. Changed them to "very small" images with reduced inherited attack surface.
- The first image comparison command used two `podman images --filter reference=...` filters together for Ubuntu and Alpine. Multiple filters are not a reliable way to express an OR comparison. Replaced it with explicit `podman images ubuntu:22.04` and `podman images alpine:3.19` commands.
- The scratch container section said you cannot use `buildah run` because there is no shell. More precisely, an empty scratch container cannot run shell commands until a shell or executable is added. Updated the note accordingly.
- The final image comparison repeated the same multi-filter pattern for `go-scratch-app`, Ubuntu, and Alpine. Replaced it with explicit image-name arguments for each image.
- The summary described Go, Rust, and C as "statically compiled languages." C is not inherently statically compiled. Changed the wording to "applications that can be statically compiled."

## Review Notes
- The Go example is valid for a simple pure-Go HTTP server: `CGO_ENABLED=0` disables cgo and is appropriate for producing a Linux binary suitable for a scratch image.
- The Buildah `config`, `copy`, `add`, and `commit` usage matches the documented command forms.
- The `buildah rm --all` cleanup command is technically valid, but it removes all Buildah working containers in the user's local storage, not just containers created by this tutorial.
