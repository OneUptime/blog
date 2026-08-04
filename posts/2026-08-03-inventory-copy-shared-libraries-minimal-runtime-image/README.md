# Inventory and Copy Shared Libraries into a Minimal Runtime Image

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Multi-Stage Builds, Shared Libraries, ELF, Dynamic Linker, Minimal Images, Linux

Description: Build a defensible ELF runtime inventory, preserve loader and library paths, account for late-loaded dependencies, and test the result before choosing scratch.

---

Copying a dynamically linked executable into `scratch` is not enough. The kernel first needs the ELF interpreter recorded in `PT_INTERP`; that loader then resolves every `DT_NEEDED` object through its configured search rules. Applications may later load plugins or name-service modules that are not visible in the executable's direct dependency list.

The most maintainable answer is a compatible slim runtime image with runtime libraries installed as packages. If an environment requires a hand-assembled root filesystem, make the dependency closure an explicit, testable build artifact rather than copying whatever `.so` files happen to look familiar.

## Inventory the Trusted Executable

Run inspection in the builder stage:

```dockerfile
# syntax=docker/dockerfile:1
FROM debian:bookworm AS build
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential binutils file \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY . .
RUN make /out/service

RUN file /out/service \
    && readelf --file-header /out/service \
    && readelf --program-headers --wide /out/service \
    && readelf --dynamic --wide /out/service
```

These views answer different questions:

- `file` summarizes format, architecture, and static or dynamic linkage;
- `readelf --file-header` shows the ELF class and target machine;
- `readelf --program-headers` reveals the requested program interpreter;
- `readelf --dynamic` lists direct `NEEDED`, `RPATH`, and `RUNPATH` entries.

For a binary produced from trusted source, also run:

```bash
ldd /out/service
```

`ldd` resolves the dependency tree in the current builder environment and reports missing objects. The official Linux manual warns that `ldd` may execute code for some untrusted executables. For untrusted input, use a non-executing inspection such as:

```bash
objdump -p /out/service | grep NEEDED
```

That safer command shows direct dependencies only, not their recursively resolved paths.

## Prefer a Package-Managed Runtime

If `service` needs `libpq.so.5`, install the runtime package that owns it rather than copying the development package or compiler filesystem:

```dockerfile
FROM debian:bookworm AS build
# Build /out/service against the intended Debian release.

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build --chmod=0555 /out/service /usr/local/bin/service
USER 10001:10001
ENTRYPOINT ["/usr/local/bin/service"]
```

Use the same distribution family and a compatible release in both stages. Package installation brings the right sonames, symlinks, loader integration, and transitive package dependencies. It also leaves the runtime's packages visible to vulnerability and update tooling.

Do not copy a glibc-linked closure into an Alpine base and assume musl compatibility. Do not mix libraries from several distribution releases merely because their filenames match.

## Assemble a Root Filesystem Only When Necessary

For a controlled, trusted binary, a builder script can resolve libraries and copy each resolved file at its absolute path. The following is a starting point for a Debian/glibc build, not a universal packaging algorithm:

```dockerfile
FROM debian:bookworm AS build
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential binutils \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY . .
RUN make /out/service

RUN set -eu; \
    mkdir -p /rootfs/out; \
    cp /out/service /rootfs/out/service; \
    interpreter="$(readelf --program-headers --wide /out/service \
      | sed -n 's@.*Requesting program interpreter: \(.*\)]@\1@p')"; \
    test -n "$interpreter"; \
    printf '%s\n' "$interpreter" > /tmp/runtime-files; \
    ldd /out/service > /tmp/ldd-output; \
    if grep -q '=> not found' /tmp/ldd-output; then \
      cat /tmp/ldd-output >&2; \
      exit 1; \
    fi; \
    awk '/=> \// { print $3 } /^\// { print $1 }' /tmp/ldd-output \
      >> /tmp/runtime-files; \
    sort -u /tmp/runtime-files -o /tmp/runtime-files; \
    while IFS= read -r path; do \
      test -e "$path"; \
      cp --parents --dereference "$path" /rootfs; \
    done < /tmp/runtime-files

FROM scratch
COPY --from=build /rootfs/ /
USER 10001:10001
ENTRYPOINT ["/out/service"]
```

`cp --parents` preserves paths such as `/lib/x86_64-linux-gnu/libc.so.6`; `--dereference` places the referenced file contents at the soname path. The loader must exist at the exact `PT_INTERP` path because the kernel does not search for it.

This recipe deliberately fails when the interpreter is absent, a library remains unresolved, or a resolved path does not exist. Silent partial copies create images that build successfully and fail only at startup.

## Account for Dependencies `ldd` Cannot Predict

The initial ELF graph may be incomplete for actual application behavior. Audit these categories:

- libraries loaded with `dlopen`, including database, cryptography, and media plugins;
- glibc name-service behavior and DNS resolution;
- CA certificates used by TLS clients;
- locale and time-zone data;
- configuration referenced by absolute paths;
- child processes launched by the application;
- architecture-specific library directories and CPU requirements.

The GNU dynamic linker documentation describes search order involving `RPATH`, `LD_LIBRARY_PATH`, `RUNPATH`, `/etc/ld.so.cache`, and default library paths. Avoid using `LD_LIBRARY_PATH` as a blanket repair. Preserve conventional paths or link with an intentional `$ORIGIN`-relative `RUNPATH` when the application owns a private library bundle.

## Validate the Closure

Build for the actual target platform and run representative tests:

```bash
docker buildx build \
  --platform linux/amd64 \
  --load \
  --tag service:minimal .

docker run --rm service:minimal --version
docker run --rm service:minimal self-test --dns --tls --timezone
```

If the application has no self-test, add an integration test target that calls a TLS endpoint, resolves a service name, loads configured plugins, and parses a named time zone. A minimal image is successful when its runtime closure is understood, not merely when its compressed size is small.

## Official Documentation

- [GNU readelf documentation](https://sourceware.org/binutils/docs/binutils/readelf.html)
- [GNU C Library dynamic linker documentation](https://sourceware.org/glibc/manual/latest/html_node/Dynamic-Linker.html)
- [Linux dynamic linker search rules](https://man7.org/linux/man-pages/man8/ld.so.8.html)
- [Linux ldd documentation and security warning](https://man7.org/linux/man-pages/man1/ldd.1.html)
- [Docker base images and scratch guidance](https://docs.docker.com/build/building/base-images/)
