# Validation Summary: Scratch Runtime Essentials: CA Certs, Time Zones, Users, and Writable Paths

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered

- Docker and `FROM scratch` images
- Multi-stage Docker builds and Dockerfile `COPY`, `USER`, and `ENTRYPOINT` instructions
- Go 1.25 static Linux builds and Go modules
- Debian Bookworm `ca-certificates` and `tzdata` packages
- TLS system trust stores and private certificate authorities
- IANA time-zone data and Go's `time/tzdata` package
- Linux user and group identity files
- Non-root containers and Kubernetes security contexts
- Read-only container root filesystems, tmpfs mounts, and explicit writable paths

## Sources Consulted

- [Docker: Base images and the reserved `scratch` image](https://docs.docker.com/build/building/base-images/)
- [Dockerfile reference: exec and shell forms, `COPY`, `USER`, and `ENTRYPOINT`](https://docs.docker.com/reference/dockerfile/)
- [Docker CLI reference: `docker container run`, including `--user`, `--read-only`, and `--tmpfs`](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker: tmpfs mounts and supported mount options](https://docs.docker.com/engine/storage/tmpfs/)
- [Docker Official Images source-of-truth manifest for current `golang` tags](https://github.com/docker-library/official-images/blob/master/library/golang)
- [Debian Bookworm `ca-certificates` package](https://packages.debian.org/bookworm/ca-certificates)
- [Debian `update-ca-certificates(8)` manual](https://manpages.debian.org/bookworm/ca-certificates/update-ca-certificates.8.en.html)
- [Debian Bookworm `tzdata` file list](https://packages.debian.org/bookworm/all/tzdata/filelist)
- [Go command documentation](https://go.dev/cmd/go/)
- [Go modules reference](https://go.dev/ref/mod)
- [Go `time` package and `LoadLocation` search order](https://pkg.go.dev/time)
- [Go `time/tzdata` package](https://pkg.go.dev/time/tzdata)
- [Go Linux system-root certificate paths](https://go.dev/src/crypto/x509/root_linux.go)
- [Go `os/user` package and Unix account lookup behavior](https://pkg.go.dev/os/user)
- [Kubernetes: Configure a Security Context for a Pod or Container](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)

## Issues Found
No technical issues found.

## Review Notes

- The `golang:1.25-bookworm` tag is present in the current Docker Official Images manifest. It is a floating minor-version tag rather than a digest pin, so its patch release and base-image contents can change across rebuilds; this is a reproducibility consideration, not a correctness problem.
- The Dockerfile syntax and CLI flags were checked against current Docker documentation and local Docker CLI help. Go 1.25.3 was also used to confirm that `go build -o /out/service` creates the missing parent output directory.
- `FROM scratch` contributes no image filesystem contents of its own, although a container runtime can still supply runtime-managed mounts such as DNS configuration. This does not conflict with the post's runtime-dependency guidance.
