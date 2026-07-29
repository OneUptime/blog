# Chainguard vs Alpine vs Google Distroless Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Alpine Linux, Distroless, Container, Compatibility

Description: Compare Chainguard, Alpine, and Google Distroless across libc, package composition, debugging, user defaults, and native binary compatibility.

---

All three can produce small container images, but they are not drop-in substitutes. The most consequential differences are the C library, how packages are composed, and whether the runtime intentionally includes administrative tools.

## The short comparison

| Property | Chainguard standard variant | Alpine base | Google Distroless |
| --- | --- | --- | --- |
| Distribution base | Wolfi | Alpine Linux | Debian |
| Typical libc | glibc | musl | glibc |
| Image construction | apko and Chainguard build systems | Alpine packages and Docker image build | Bazel-based Distroless project |
| Package format | APK | APK | Debian packages used during image construction |
| Package manager in minimal runtime | Usually absent | Present in normal Alpine base | Absent |
| Shell in minimal runtime | Usually absent | BusyBox shell present | Absent |
| Debug alternative | `-dev`, selected `-full`, or ephemeral container | Install tools with `apk` | `debug` and `debug-nonroot` tags |
| Nonroot behavior | Common default for application containers | Must be configured for a typical base-derived app | Explicit `nonroot` tag variants |
| Public update model | Free latest-oriented builds; Production version streams | Versioned Alpine releases and repositories | Tracks supported Debian releases |

These are defaults and project-level patterns, not guarantees for every image. Inspect the exact image configuration and SBOM.

## libc changes native compatibility

Alpine is built around musl libc. Wolfi-based Chainguard Containers and Debian-based Google Distroless images generally use glibc.

This matters for:

- Python wheels with `manylinux` or `musllinux` tags;
- Node.js native addons;
- dynamically linked Go and Rust programs;
- vendor binaries distributed only for glibc;
- DNS, locale, thread, and memory-allocation behavior at libc boundaries.

A binary linked against glibc is not made compatible with musl merely by copying it into Alpine. Conversely, a musl-targeted artifact should not be assumed to work in a glibc image.

Inspect a native artifact in a build environment:

```bash
file /path/to/binary
readelf -l /path/to/binary | grep interpreter
readelf -d /path/to/binary
```

For Python, examine the complete wheel tag. `manylinux_2_28_x86_64` communicates a glibc family floor and architecture; it says nothing about whether every other shared library is present.

## APK does not make Wolfi and Alpine interchangeable

Wolfi and Alpine both use the APK package format, but their repositories contain packages built for different distributions and libc environments.

This is unsupported:

```text
Wolfi base + Alpine repository packages
Alpine base + Wolfi repository packages
```

Use the repository and signing keys associated with the selected distribution. If a Wolfi package is missing, request or build it for Wolfi rather than adding an Alpine URL to `/etc/apk/repositories`.

## Debugging differs by philosophy

A normal Alpine base contains BusyBox and `apk`, so this often works:

```bash
docker run --rm -it alpine:3.23 /bin/sh
```

A standard Chainguard or Google Distroless runtime normally has no shell. Their supported debugging patterns differ:

```bash
# Chainguard development variant
docker run --rm -it \
  --entrypoint /bin/sh \
  cgr.dev/chainguard/python:latest-dev

# Google Distroless debug variant
docker run --rm -it \
  --entrypoint=sh \
  gcr.io/distroless/python3-debian13:debug
```

For production Kubernetes workloads, an ephemeral debug container avoids permanently adding tools to the application image.

Do not compare only whether a shell exists. Compare whether the debug variant uses the same application version, libc, architecture, default user, and runtime libraries as the production artifact.

## Package composition and updates

Alpine is a general-purpose, independent Linux distribution with stable release branches and a broad repository. It intentionally uses musl and BusyBox for simplicity and size.

Google Distroless assembles language-focused runtimes from Debian components but leaves out shells and package managers. The project publishes Debian-versioned image families and `debug` variants.

Chainguard Containers are based on Wolfi, an undistro designed for container composition and supply-chain metadata. Standard variants are commonly distroless, while development variants add build and diagnostic tools. Chainguard publishes SBOMs and signatures and rebuilds Containers frequently. Free public Containers focus on current builds; Production access adds supported version streams and service commitments.

The vendor's label does not describe layers your team adds. Once application dependencies or operating-system packages are layered on, generate and scan an SBOM for the final artifact.

## Entrypoints and users can break migrations

Google Distroless documentation requires vector-form entrypoints because there is no shell:

```dockerfile
ENTRYPOINT ["/app/server"]
```

The same practice fits standard Chainguard variants. Alpine can execute shell form, but exec form still provides clearer signal handling.

Chainguard application images commonly configure a nonroot user. Google Distroless has explicit `nonroot` tag variants. A typical Alpine-derived Dockerfile runs as root until it adds `USER`.

For every candidate:

```bash
docker image inspect "$IMAGE" \
  --format 'user={{json .Config.User}} entrypoint={{json .Config.Entrypoint}} cmd={{json .Config.Cmd}}'
```

Then test file writes, low ports, mounted volumes, and shutdown behavior under the intended UID.

## Which should you choose?

Choose based on demonstrated constraints:

- choose Alpine when musl compatibility is proven and an interactive, package-managed small base fits the operating model;
- choose Google Distroless when a Debian-derived minimal runtime and its supported language set fit the application;
- choose Chainguard when Wolfi's glibc compatibility, minimal variants, frequent rebuilds, signed metadata, and available support model fit the organization.

The safest migration keeps language and application versions fixed, builds native dependencies inside the target family, and exercises all production architectures. Image size and a point-in-time CVE count are useful measurements, but they do not replace compatibility and update testing.

## Official Documentation

- [Chainguard Containers FAQ](https://edu.chainguard.dev/chainguard/chainguard-images/faq/)
- [Chainguard glibc versus musl](https://edu.chainguard.dev/chainguard/chainguard-images/about/images-compiled-programs/glibc-vs-musl/)
- [Alpine Linux about page](https://www.alpinelinux.org/about/)
- [Google Distroless project documentation](https://github.com/GoogleContainerTools/distroless)
