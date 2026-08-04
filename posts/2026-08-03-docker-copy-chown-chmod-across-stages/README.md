# Set Ownership and Execute Bits Across Stages with `COPY --chown` and `--chmod`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Dockerfile, Multi-Stage Build, COPY, File Permissions, Container Security, BuildKit

Description: Apply deterministic Linux ownership and permissions while copying artifacts into a runtime stage, including numeric-user, syntax-version, and scratch-image considerations.

---

Build artifacts often leave a compiler stage owned by root or without the execute bit expected by the runtime. Fixing that with a later `RUN chown` or `RUN chmod` is unnecessary and may be impossible in a scratch or distroless image. Dockerfile `COPY` can assign the destination metadata as it creates the layer.

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.25-bookworm AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /out/server ./cmd/server

FROM scratch AS runtime
COPY --from=build --chown=10001:10001 --chmod=0555 \
  /out/server /usr/local/bin/server
USER 10001:10001
ENTRYPOINT ["/usr/local/bin/server"]
```

The final file is owned by UID and GID `10001`, readable and executable by everyone, and not writable. No shell, `chown`, or `chmod` program is required in the runtime image.

## Defaults and Flag Semantics

Without `--chown`, files copied from a build context are created with UID and GID `0`. The `--chown` flag accepts either names or numeric IDs:

```dockerfile
COPY --chown=app:app source/ /opt/app/
COPY --chown=10001:10001 source/ /opt/app/
COPY --chown=10001 source/ /opt/app/
```

When only a user is supplied, Docker uses the same numeric value for the group. Name lookup uses `/etc/passwd` and `/etc/group` in the destination stage's root filesystem. If those files are absent and a name is used, the build fails. Numeric IDs therefore work well in scratch images and avoid accidental changes when base-image account databases differ.

`--chmod` accepts octal notation, which is a clear choice for fixed modes and works with older Dockerfile syntax versions. Keep the leading zero to signal intent to readers:

```dockerfile
COPY --chmod=0444 config.yaml /etc/example/config.yaml
COPY --chmod=0555 entrypoint /usr/local/bin/entrypoint
COPY --chmod=0750 scripts/ /opt/example/scripts/
```

The permission is applied to copied entries. For a directory tree, choose a mode that makes directories traversable. Applying `0644` recursively to a directory tree can remove directory execute permission and make its contents inaccessible.

Dockerfile syntax 1.14 also supports symbolic mode notation. Use it when a relative change communicates the policy better:

```dockerfile
# syntax=docker/dockerfile:1.14
COPY --chmod=u=rwX,go=rX app/ /opt/app/
```

Pin a syntax version that supports the notation used by the file. Octal remains useful when a Dockerfile must work with builders using an earlier frontend.

Docker documents `--chown` and `--chmod` for Linux builds only. Windows container files do not use the same user, group, and mode model, so these flags are not a portable way to set Windows ACLs.

## Copy Directly into the Final Metadata

This pattern works but creates the desired state later:

```dockerfile
COPY --from=build /out/server /usr/local/bin/server
RUN chown 10001:10001 /usr/local/bin/server \
    && chmod 0555 /usr/local/bin/server
```

It also requires those utilities and a shell in the current stage. Prefer:

```dockerfile
COPY --from=build --chown=10001:10001 --chmod=0555 \
  /out/server /usr/local/bin/server
```

This expresses the artifact's destination state at the boundary where it enters the runtime stage. It works whether the producer's user database contains UID `10001` or not because ownership is assigned in the destination layer.

## Create Writable Directories Deliberately

A non-root process may need a state or temporary directory, but it should not own the binary or all of `/app`. Create only the writable path with the correct metadata:

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine:3.23 AS layout
RUN mkdir -p /layout/var/lib/example /layout/var/run/example

FROM scratch
COPY --from=build --chown=10001:10001 --chmod=0555 \
  /out/server /usr/local/bin/server
COPY --from=layout --chown=10001:10001 --chmod=0750 \
  /layout/var/lib/example/ /var/lib/example/
COPY --from=layout --chown=10001:10001 --chmod=0750 \
  /layout/var/run/example/ /var/run/example/
USER 10001:10001
ENTRYPOINT ["/usr/local/bin/server"]
```

The trailing slashes communicate that directory contents are being copied. Test the actual application behavior because some frameworks also require `/tmp`; a scratch image does not create it automatically.

## Use Names Only After Creating the Account

Names make a Dockerfile readable when the runtime base provides account tools:

```dockerfile
FROM debian:bookworm-slim AS runtime
RUN groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --no-create-home --shell /usr/sbin/nologin app
COPY --from=build --chown=app:app --chmod=0555 \
  /out/server /usr/local/bin/server
USER app:app
ENTRYPOINT ["/usr/local/bin/server"]
```

The account must exist before the named `COPY`. Otherwise Docker cannot translate `app:app` to numeric IDs. Pin the numeric UID/GID in the account-creation command so ownership remains stable across builds.

## Interpolate a Mode Only with a Suitable Syntax Version

Dockerfile syntax 1.10 and later supports build-argument interpolation for `--chmod`:

```dockerfile
# syntax=docker/dockerfile:1.10
FROM alpine:3.23
ARG APP_MODE=0555
COPY --chmod=$APP_MODE app /usr/local/bin/app
```

Use a fixed mode unless configurability has a real use case. File permissions are security-sensitive build output, and varying them through CI can create images that share a tag but behave differently.

## Verify the Produced Image

For an image with a shell and GNU `stat`:

```bash
docker run --rm --entrypoint=/usr/bin/stat example-api:dev \
  -c '%u:%g %a %n' /usr/local/bin/server
```

For a scratch image, inspect the exported container filesystem without trying to start it:

```bash
container_id=$(docker create example-api:dev)
docker export "$container_id" | tar -tvf - usr/local/bin/server
docker rm "$container_id"
```

Also run the image as its configured user. Correct metadata is only useful if the process can execute its binary, read required configuration, and write solely to intended paths.

## Official Documentation

- [Dockerfile COPY reference for chown and chmod](https://docs.docker.com/reference/dockerfile/#copy---chown---chmod)
- [Dockerfile USER reference](https://docs.docker.com/reference/dockerfile/#user)
- [Docker multi-stage build documentation](https://docs.docker.com/build/building/multi-stage/)
- [Dockerfile syntax versioning](https://docs.docker.com/build/concepts/dockerfile/#dockerfile-syntax)
