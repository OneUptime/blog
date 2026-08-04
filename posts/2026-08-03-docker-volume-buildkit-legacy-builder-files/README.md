# Docker `VOLUME`: Why Build Files Differ Between Legacy Builder and BuildKit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Dockerfile, VOLUME, BuildKit, Legacy Builder, Multi-Stage Builds, Container Storage

Description: Explain builder-specific changes after a Dockerfile volume declaration and separate build-time image contents from the mounts that can obscure them at container runtime.

---

`VOLUME` has one of the few Dockerfile behaviors for which Docker explicitly documents a difference between the legacy builder and BuildKit. If a later build step changes files under the declared volume path, the legacy builder discards those changes. BuildKit keeps them.

That rule is about constructing the image. A separate runtime rule then applies: mounting a volume over a non-empty container directory can obscure the files at that path. Treating these as one phenomenon makes a correct BuildKit image look as if its build output vanished.

## Reproduce the Builder Difference

Use a small Dockerfile:

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine:3.23
RUN mkdir -p /data && printf '%s\n' before > /data/before.txt
VOLUME /data
RUN printf '%s\n' after > /data/after.txt
CMD ["find", "/data", "-maxdepth", "1", "-type", "f", "-print"]
```

With BuildKit, the final filesystem contains both files:

```bash
docker build --tag volume-buildkit .
docker run --rm volume-buildkit
```

The Dockerfile reference says that changes made inside the volume after its declaration are retained by BuildKit. With the legacy builder, the `after.txt` change is discarded:

```bash
DOCKER_BUILDKIT=0 docker build --tag volume-legacy .
docker run --rm volume-legacy
```

The legacy backend is deprecated and is not available in every current installation. The comparison is useful when explaining an old build, a Windows-container workflow, or a migration, but new Dockerfile design should target BuildKit without depending on this historical discrepancy.

## What `VOLUME` Does Not Do During a Build

A Dockerfile declaration such as:

```dockerfile
VOLUME /var/lib/example
```

does not bind a host directory into a `RUN` instruction. Docker cannot encode a host-specific source path in a portable image. The instruction records a mount point in image configuration and affects how a container is created from the image.

It is also unrelated to BuildKit's `RUN --mount` feature:

```dockerfile
RUN --mount=type=cache,target=/var/cache/example example-build
```

A cache mount is temporary build infrastructure. Its contents are not committed to the output layer. A Dockerfile `VOLUME` declares a runtime data location. The two features should not be used interchangeably.

## Why Runtime Mounts Can Still Hide the Files

Even if BuildKit retained `/data/after.txt`, an explicit bind mount or a non-empty volume mounted at `/data` covers the image's directory while the mount is attached:

```bash
mkdir -p ./empty-data
docker run --rm \
  --mount type=bind,source="$(pwd)/empty-data",target=/data \
  volume-buildkit
```

The container now sees the host directory at `/data`, not the underlying image directory. Recreating the container without the mount reveals the image files again; they were obscured, not deleted.

Docker-managed empty volumes have initialization behavior: when a new empty volume is mounted over a container directory that already has files, Docker copies those existing files into the volume by default. The `volume-nocopy` option disables that copy. Bind mounts do not perform the same initialization.

Inspect the image declaration separately from a running container's mounts:

```bash
docker image inspect volume-buildkit \
  --format '{{json .Config.Volumes}}'

docker inspect example-container \
  --format '{{json .Mounts}}'
```

The first shows that `/data` is declared as a volume. The second shows what is actually mounted for one container.

## Make the Dockerfile Independent of Builder History

The safest rule is to finish populating a directory before declaring it as a volume:

```dockerfile
FROM alpine:3.23
RUN mkdir -p /var/lib/example \
    && printf '%s\n' seed > /var/lib/example/seed.txt
VOLUME /var/lib/example
```

In a multi-stage build, copy seed data before `VOLUME` as well:

```dockerfile
FROM alpine:3.23 AS seed
RUN mkdir /seed && printf '%s\n' '{"enabled":true}' > /seed/config.json

FROM alpine:3.23 AS runtime
COPY --from=seed /seed/ /var/lib/example/
VOLUME /var/lib/example
```

Another reasonable choice is to omit `VOLUME` from the Dockerfile and declare persistence in Compose, Kubernetes, or the deployment command. That makes the runtime storage policy visible beside the actual volume definition and avoids anonymous volumes during ad hoc runs.

## Diagnose a Reported Disappearance

Use this order:

1. Check the currently selected BuildKit builder with `docker buildx ls`, then use the CI configuration and build logs to determine which backend produced the image.
2. Find whether any write or `COPY` occurs after the Dockerfile `VOLUME` instruction.
3. Inspect `.Config.Volumes` on the image.
4. Inspect `.Mounts` on the affected container.
5. Run the image once without an explicit bind or named volume.
6. If a named volume already exists, inspect it independently rather than assuming it was freshly initialized.

Do not solve a runtime mount problem by repeatedly rebuilding. Do not solve a legacy-builder problem by deleting a named volume. The observations can look identical from inside the container, but their causes and fixes are different.

## Official Documentation

- [Dockerfile VOLUME reference and BuildKit behavior](https://docs.docker.com/reference/dockerfile/#volume)
- [Docker volumes and copying existing data into an empty volume](https://docs.docker.com/engine/storage/volumes/)
- [Docker bind mount behavior](https://docs.docker.com/engine/storage/bind-mounts/)
- [Docker legacy builder documentation](https://docs.docker.com/reference/cli/docker/build-legacy/)
