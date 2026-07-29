# How to Install Extra APK Packages in a Distroless Chainguard Runtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Distroless, Wolfi APK, Docker, Custom Assembly

Description: Add required system packages to a minimal Chainguard runtime with Custom Assembly or a controlled multi-stage chroot workflow.

---

A standard distroless Chainguard Container intentionally has neither `apk` nor a shell. Consequently, this Dockerfile cannot work:

```dockerfile
FROM cgr.dev/chainguard/python:latest
RUN apk add --no-cache libpq
```

The package must be assembled into the filesystem before the final runtime starts. There are three valid choices, each with a different maintenance model.

## First decide whether an APK is really required

Do not add a system package merely because it was present in the old base image. Identify the concrete runtime requirement:

- a missing shared library such as `libpq.so`;
- CA certificates or timezone data;
- an external executable invoked by the application;
- a configuration file owned by a package.

Search by the capability rather than guessing a package:

```bash
docker run --rm -it \
  --entrypoint /bin/sh \
  cgr.dev/chainguard/wolfi-base:latest

apk update
apk search 'so:libpq.so*'
apk search cmd:openssl
```

Build-only headers and compilers belong in the builder, not the runtime.

## Option 1: Use Custom Assembly

For Chainguard customers, Custom Assembly is the officially supported way to add packages to a Chainguard Container. You declare the packages, and Chainguard builds and rebuilds the customized image while keeping its package set compatible.

The package choices are limited by the resources available to the organization. Custom Assembly is preferable when the image must remain covered by Chainguard's supported build and update workflow.

Conceptually, the configuration adds packages to an existing repository:

```yaml
contents:
  packages:
    - libpq
    - tzdata
```

Create or edit the assembly through the Chainguard Console or the documented `chainctl images repos build edit` workflow. Do not assume every public Wolfi package is entitled for every Production Container.

## Option 2: Keep a development variant as the runtime

When minimalism is not a hard requirement, a development variant can install packages conventionally:

```dockerfile
FROM cgr.dev/chainguard/python:latest-dev

USER root
RUN apk add --no-cache libpq

WORKDIR /app
COPY --chown=65532:65532 . /app

USER 65532
ENTRYPOINT ["python", "/app/main.py"]
```

This is simple and Chainguard documents development variants as production-capable. The cost is a larger package set, including general-purpose tools that the application probably does not need after the build.

## Option 3: Assemble a distroless filesystem in a builder

Chainguard documents an advanced multi-stage method:

1. Keep the target distroless image as a reference filesystem.
2. Use the matching development image for `apk`.
3. Copy the target filesystem into a chroot directory.
4. Install runtime APKs into that directory with `--root` and `--no-scripts`.
5. refresh the dynamic linker cache.
6. Copy the assembled filesystem into the final stage.

```dockerfile
# syntax=docker/dockerfile:1

FROM cgr.dev/chainguard/python:latest AS base

FROM cgr.dev/chainguard/python:latest-dev AS build

USER root
COPY --from=base / /base-chroot
RUN apk add \
      --no-cache \
      --no-scripts \
      --root /base-chroot \
      libpq \
    && ldconfig -r /base-chroot

FROM cgr.dev/chainguard/python:latest

COPY --link --from=build /base-chroot /
WORKDIR /app
COPY --chown=65532:65532 main.py /app/main.py

ENTRYPOINT ["python", "/app/main.py"]
```

`--no-scripts` matters because package install scripts may expect tools that the distroless root does not contain. `ldconfig -r` regenerates the linker cache relative to the assembled root. Test whether `COPY --link` is appropriate for your builder and image-size constraints, as Chainguard notes that it can increase size.

This workflow makes you responsible for the resulting image, its compatibility, its rebuild cadence, and validation. An SBOM attached to the original base does not automatically describe layers you add yourself. Generate and store an SBOM for the final image.

## Avoid version skew

Chainguard package repositories and container tags are updated frequently. A base image with older libraries can temporarily conflict with the newest repository packages.

For repeatable builds:

- resolve and record the base and development image digests;
- build both stages for the same version stream and architecture;
- rebuild regularly rather than freezing packages indefinitely;
- test after every digest update;
- mirror package versions internally if your retention requirements exceed the repository policy.

Custom Assembly handles this compatibility problem for supported additions. If maintaining the manual chroot method becomes a recurring burden, that is a strong reason to move to Custom Assembly.

## Validate the final artifact

The runtime has no shell, so validate through its real entrypoint and external inspection:

```bash
docker build --pull -t app:distroless .
docker run --rm app:distroless
docker image inspect app:distroless
```

Also scan the final image, generate an SBOM, run integration tests, and verify that the process still runs as the intended nonroot UID. Installing a package successfully is not proof that its service initialization scripts, configuration, or runtime behavior are suitable for a container.

## Official Documentation

- [Installing APK packages in distroless variants](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/install-apks-in-distroless-variants/)
- [Overview of Chainguard Custom Assembly](https://edu.chainguard.dev/chainguard/chainguard-images/features/ca-docs/custom-assembly/)
- [Chainguard package repository model](https://edu.chainguard.dev/chainguard/chainguard-images/features/packages/package-model/)
- [Chainguard container variants](https://edu.chainguard.dev/chainguard/chainguard-images/about/differences-development-production/)
