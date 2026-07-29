# How to Copy Files into Chainguard Images with Nonroot Ownership

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Docker, Nonroot, File Permissions, Container

Description: Use numeric ownership, deliberate modes, and writable data paths when copying application artifacts into nonroot Chainguard runtimes.

---

Most Chainguard application runtimes use an unprivileged user by default. Docker `COPY`, however, creates files with UID and GID `0` unless instructed otherwise. The container may start successfully and then fail when it tries to write a cache, create a database, replace a generated file, or traverse a directory with restrictive permissions.

The fix is not to make every file world-writable. Decide which paths are immutable application content and which paths are runtime state, then assign the minimum required ownership and mode.

## Inspect the target image's user

Do not assume that every Chainguard repository uses the same username:

```bash
IMAGE=cgr.dev/chainguard/python:latest-dev

docker image inspect "$IMAGE" \
  --format 'configured user={{json .Config.User}}'

docker run --rm --entrypoint id "$IMAGE"
```

UID `65532` is common, with names such as `nonroot`, `node`, or `app` depending on the image. Numeric IDs are less ambiguous in a multi-stage build because user and group names must be resolvable through `/etc/passwd` and `/etc/group` in the relevant stage.

## Set ownership at copy time

Use `COPY --chown` instead of copying as root and running a recursive `chown` in a later layer:

```dockerfile
FROM cgr.dev/chainguard/python:latest

WORKDIR /app
COPY --chown=65532:65532 app.py /app/app.py
COPY --chown=65532:65532 config/ /app/config/

ENTRYPOINT ["python", "/app/app.py"]
```

For artifacts from a builder:

```dockerfile
FROM cgr.dev/chainguard/python:latest-dev AS build

USER 65532
WORKDIR /home/nonroot/build
RUN python -m venv venv
COPY requirements.txt .
RUN venv/bin/pip install --no-cache-dir -r requirements.txt

FROM cgr.dev/chainguard/python:latest

WORKDIR /app
COPY --from=build --chown=65532:65532 \
  /home/nonroot/build/venv /app/venv
COPY --chown=65532:65532 app.py /app/app.py

ENTRYPOINT ["/app/venv/bin/python", "/app/app.py"]
```

This leaves the builder's shell, `pip`, and compilers behind while giving the runtime user access to the copied environment.

## Ownership and writability are separate decisions

Root ownership is not inherently wrong for application code. A nonroot process can read and execute root-owned files when mode bits allow it. Keeping code root-owned can even prevent the application from modifying its own executable content.

A useful split is:

- `/app/bin` and application source: readable and executable, but not writable;
- `/app/config`: readable, usually not writable;
- `/var/lib/myapp`: owned by the runtime UID and writable;
- `/tmp`: use the image's existing temporary-directory policy or a mounted temporary volume;
- secrets: mounted read-only and never copied into the image.

Create a writable data path in a builder stage:

```dockerfile
FROM cgr.dev/chainguard/python:latest-dev AS layout

USER root
RUN install -d -o 65532 -g 65532 -m 0750 /var/lib/myapp

FROM cgr.dev/chainguard/python:latest

COPY --from=layout --chown=65532:65532 /var/lib/myapp /var/lib/myapp
COPY --chown=0:0 --chmod=0555 app.py /app/app.py

ENTRYPOINT ["python", "/app/app.py"]
```

`--chmod` requires a Dockerfile frontend that supports it. Pin an appropriate syntax directive if your builder needs one.

## Watch for `WORKDIR` and parent directories

`WORKDIR /app` can create a missing directory, but that does not mean it becomes owned by the configured nonroot user. A later copy with `--chown` owns the copied children, while the parent may remain root-owned.

That is fine when the application only reads `/app`. It fails if the application expects to create `/app/cache`. Prefer a dedicated state directory:

```dockerfile
ENV APP_CACHE_DIR=/var/lib/myapp/cache
```

Then create or mount that directory with deliberate ownership.

## Kubernetes volume ownership is a different layer

Image ownership does not control a PersistentVolume's existing files. Depending on the storage driver and policy, use a Pod security context:

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 65532
    runAsGroup: 65532
    fsGroup: 65532
  containers:
    - name: app
      image: registry.example.com/app@sha256:REPLACE_ME
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
```

`fsGroup` behavior is volume and driver dependent. Validate it with the actual storage class. For OpenShift's arbitrary UID model, Chainguard documents a separate pattern based on group `0` ownership and group permissions, such as `--chown=65532:0`.

## Diagnose without adding a shell

Inspect the build output with a development image or an exported filesystem:

```bash
docker create --name app-inspect app:test
docker export app-inspect | tar -tvf - | grep ' app/'
docker rm app-inspect
```

Also test the operation that needs to write, not just container startup:

```bash
docker run --rm \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  -v app-data:/var/lib/myapp \
  app:test
```

If the test needs broad `chmod 777` or a root runtime, stop and identify the exact path and operation. Narrow ownership is both safer and easier to reason about.

## Official Documentation

- [Migrating to .NET Chainguard Containers](https://edu.chainguard.dev/get-started/migration/migration-guides/migrating-dotnet/)
- [Using Chainguard Containers with OpenShift](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/use-with-openshift/)
- [Dockerfile `COPY` reference](https://docs.docker.com/reference/dockerfile/#copy)
- [Kubernetes Pod security context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
