# Scratch Binary Exists but Will Not Run: Check the Dynamic Linker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Scratch Image, ELF, Dynamic Linker, Multi-Stage Builds, Linux, Troubleshooting

Description: Diagnose the misleading missing-file error in scratch images by inspecting the ELF interpreter, shared-library dependencies, architecture, permissions, and script shebangs.

---

The binary is visible in the image export and the `COPY --from` step succeeded, yet starting the container reports `no such file or directory`. On Linux, that message can mean the executable's interpreter is missing, not the executable itself.

For a dynamically linked ELF program, the kernel reads the `PT_INTERP` program header and starts the named dynamic linker. A glibc-linked x86-64 binary commonly requests `/lib64/ld-linux-x86-64.so.2`. A scratch image starts empty, so that path does not exist unless you copied it. Linux `execve` consequently returns `ENOENT` when either the executable or its script/ELF interpreter is absent.

## Prove What the Binary Requests

Inspect the artifact in the builder stage, where diagnostic tools exist:

```dockerfile
# syntax=docker/dockerfile:1
FROM debian:bookworm AS build
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential file binutils \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY . .
RUN make /out/server
RUN set -eu; \
    file /out/server; \
    readelf --file-header /out/server; \
    readelf --program-headers --wide /out/server; \
    objdump --private-headers /out/server | grep NEEDED || true

FROM scratch
COPY --from=build /out/server /server
ENTRYPOINT ["/server"]
```

In the `readelf` output, look for:

```text
[Requesting program interpreter: /lib64/ld-linux-x86-64.so.2]
```

If that line exists, copying only `/server` is insufficient. `objdump` entries named `NEEDED` identify direct shared-object dependencies. On a trusted binary, `ldd /out/server` is a convenient way to display the resolved dependency tree. The Linux `ldd` manual warns not to run it on untrusted executables because some implementations may execute code; use `objdump -p ... | grep NEEDED` for untrusted input.

## Distinguish Similar Startup Errors

Check the exact failure rather than treating every start error as a loader problem:

- `no such file or directory` can mean the binary, ELF interpreter, or script shebang interpreter is absent;
- `permission denied` usually points to a missing execute bit, directory traversal permission, or a restrictive mount;
- `exec format error` commonly means the binary targets the wrong architecture or has an invalid executable format;
- an immediate shared-library error naming `libfoo.so` means the dynamic linker started but could not resolve a dependency.

Inspect architecture and permissions in the builder:

```bash
file /out/server
readelf --file-header /out/server | grep -E 'Class:|Machine:'
stat -c '%A %a %u:%g %n' /out/server
```

For a script entrypoint, inspect its first line. `#!/bin/sh` fails in scratch because scratch has no `/bin/sh`. A CRLF line ending can make the kernel look for an interpreter whose name effectively contains a carriage return. Copying a shell script into scratch does not copy its interpreter.

## Fix Option 1: Produce a Truly Static Binary

When the language and dependencies support static output, make the build request explicit and verify the result. For a pure-Go service:

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.25-bookworm AS build
RUN apt-get update \
    && apt-get install -y --no-install-recommends binutils \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/server ./cmd/server
RUN set -eu; \
    program_headers="$(readelf --program-headers --wide /out/server)"; \
    ! printf '%s\n' "$program_headers" \
      | grep -q 'Requesting program interpreter'

FROM scratch
COPY --from=build --chmod=0555 /out/server /server
USER 65532:65532
ENTRYPOINT ["/server"]
```

`CGO_ENABLED=0` is appropriate only if the program and its dependencies can use Go's non-cgo implementations. It is not a universal static-link switch for arbitrary C dependencies. For C or C++, static linking also requires static versions of every required library and may change runtime behavior.

Even a static executable can need data files such as CA roots and time-zone data. Static describes code linkage, not a guarantee that the process has no filesystem dependencies.

## Fix Option 2: Use a Compatible Runtime Base

If the program is dynamically linked, the lowest-risk solution is usually a small runtime image from the same distribution family and compatible release:

```dockerfile
FROM debian:bookworm AS build
# compile /out/server

FROM debian:bookworm-slim AS runtime
COPY --from=build --chmod=0555 /out/server /usr/local/bin/server
USER 10001:10001
ENTRYPOINT ["/usr/local/bin/server"]
```

Install runtime libraries as packages in that final stage. The package manager preserves the loader, sonames, transitive dependencies, and security-update relationship. Do not build against glibc and expect an Alpine runtime, which is based on musl, to be a drop-in replacement.

## Fix Option 3: Copy a Complete Runtime Closure

For a carefully controlled minimal image, copy the exact interpreter and complete shared-library closure while preserving their expected absolute paths. This is more fragile than using a matching runtime base. `ldd` may not reveal libraries loaded later with `dlopen`, locale data, name-service configuration, or other runtime resources.

After assembling the final image, test more than `--version`. Exercise DNS, TLS, time zones, plugin loading, and the same startup path used in production. The image is correct only when the binary and all of its runtime contracts are present.

## Official Documentation

- [Docker base images and the scratch image](https://docs.docker.com/build/building/base-images/)
- [Linux execve manual page and ENOENT semantics](https://man7.org/linux/man-pages/man2/execve.2.html)
- [GNU C Library dynamic linker documentation](https://sourceware.org/glibc/manual/latest/html_node/Dynamic-Linker.html)
- [GNU readelf documentation](https://sourceware.org/binutils/docs/binutils/readelf.html)
- [Linux ldd manual page and security warning](https://man7.org/linux/man-pages/man1/ldd.1.html)
