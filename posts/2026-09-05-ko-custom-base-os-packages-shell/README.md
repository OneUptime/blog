# How to Replace ko's Chainguard Static Base When Your Go App Needs OS Packages or a Shell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Chainguard, Base Images, Linux, Container Security

Description: Replace ko's minimal static base with a pinned runtime image that deliberately supplies required packages, data files, or a shell.

---

Current `ko` releases use `cgr.dev/chainguard/static` by default. That is a good default for a statically compiled Go service: it minimizes files and runtime surface while providing basic necessities such as certificates and a nonroot-oriented environment. It intentionally is not a general-purpose Linux distribution.

If an application starts another executable, needs a shared library, reads OS data not present in the static image, or has an explicit operational requirement for a shell, choose a different base. `ko` will not run `apt`, `apk`, or another package manager while building the application image. Required contents must already exist in the configured base or come from `kodata`.

## Identify the Real Runtime Dependency

An error that mentions a missing file does not automatically mean the app needs a shell. Determine what the process actually opens or executes:

- `exec: "git": executable file not found` means executable lookup failed; check `PATH` and ensure the `git` binary and its runtime libraries are present.
- `/bin/sh: no such file or directory` can indicate a shell dependency in the application, probe, entrypoint, or a script's shebang; also check whether the shell's dynamic loader is missing.
- Missing timezone data may be addressed by Go's `time/tzdata` package instead of an OS package.
- A missing template belongs in `kodata` or Go's `embed` package, not necessarily a bigger base.
- `x509: certificate signed by unknown authority` calls for checking the trust store and the peer's certificate chain, including missing intermediate certificates, not adding arbitrary utilities.
- A dynamically linked CGO binary needs a compatible loader and libraries.

Audit source, health probes, entrypoint arguments, and subprocess calls. Adding an entire distribution to hide an unidentified dependency increases patching work and can leave the original assumption untested.

## Set One Default Base

For all commands in a project, configure `.ko.yaml`:

```yaml
defaultBaseImage: registry.example.com/base/go-runtime@sha256:BASE_DIGEST
```

An environment variable can override that setting for an experiment:

```bash
export KO_DOCKER_REPO=registry.example.com/acme/services
KO_DEFAULTBASEIMAGE=registry.example.com/base/go-runtime@sha256:BASE_DIGEST \
  ko build ./cmd/api
```

The environment override is useful for diagnosis but less visible than checked-in configuration. Release pipelines should record and review the selected digest.

## Use Different Bases for Different Commands

Do not make every service carry a shell because one migration job needs it. Map full import paths individually:

```yaml
defaultBaseImage: cgr.dev/chainguard/static@sha256:STATIC_INDEX_DIGEST

baseImageOverrides:
  example.com/acme/platform/cmd/api: cgr.dev/chainguard/static@sha256:STATIC_INDEX_DIGEST
  example.com/acme/platform/cmd/migrate: registry.example.com/base/migrate@sha256:MIGRATE_DIGEST
```

`ko` selects the override for the import path being built. Keep the static base for commands that do not need more.

## Prepare the Base Outside ko

A runtime base is a software artifact of its own. Build it with the package manager appropriate to the distribution, remove package indexes, choose a nonroot user where possible, scan it, and publish it by digest.

For example, a Wolfi-derived base that intentionally includes a shell and certificates could be defined in a separate base-image repository:

```dockerfile
FROM cgr.dev/chainguard/wolfi-base
RUN apk add --no-cache bash ca-certificates tzdata
USER 65532:65532
```

This is an example, not a recommendation to install all three packages. Include only requirements you can name. Verify that the chosen user can read the files and execute the binaries. If a package must write under `/var`, design writable mounts instead of running the application as root.

Once published, reference the immutable base digest from `.ko.yaml` and let `ko` add the application binary layer. Updating packages means publishing a new base digest and rebuilding the application image.

## Know What the Base Configuration Contributes

`ko` places the compiled command under `/ko-app/` and makes it the image entrypoint. Adding `/bin/sh` to a base does not cause the application to run through a shell, which is desirable: arguments remain an exec-form array and signals reach the Go process directly.

The base contributes filesystem contents and relevant image configuration. Inspect the final image rather than assuming every base setting survives exactly as authored:

```bash
image_ref=$(ko build ./cmd/api)
docker buildx imagetools inspect --format '{{json .Image}}' "$image_ref"
docker buildx imagetools inspect --format '{{json .Manifest}}' "$image_ref"
```

The Buildx commands read the registry: `.Image` reports image configuration, while `.Manifest` reports the manifest or index, including platform descriptors when an index is present. Confirm the effective user, entrypoint, environment, exposed ports, and platform descriptors. If using a different registry inspection tool, make sure it reads image configuration as well as the top-level manifest.

Use `--image-user` when you need an explicit final user:

```bash
ko build ./cmd/api --image-user=65532:65532
```

Test permissions with a read-only root filesystem. A package being present is not enough if the nonroot process cannot read its configuration or execute it.

## Avoid Runtime Package Installation

Installing packages when a production container starts is fragile and usually requires root, a writable filesystem, DNS, and repository access. It makes two starts of the same digest produce different effective environments. Bake and scan packages into the base instead.

Similarly, do not open a shell in a running replica and change it by hand. The modification disappears on rescheduling and cannot be reproduced from the image digest.

## Decide Whether a Shell Is an Application Requirement

A shell can be useful for legacy wrapper scripts, but it is not the only debugging method. Kubernetes ephemeral containers, application diagnostics, and filesystem export can help investigate a shell-less production image without permanently shipping general-purpose tools. For development, `ko build --debug` creates a separate image with Delve, debug symbols, and a debugger entrypoint listening on port `40000`; that image should not be used in production.

If an `exec` probe uses this form:

```yaml
command: ["sh", "-c", "test -f /tmp/ready"]
```

replace it with an HTTP, TCP, or direct executable probe when possible. Shell syntax in probes creates a hidden base-image dependency.

If the application truly runs trusted scripts, ship the required interpreter and scripts intentionally, avoid interpolating untrusted text, and test signal and exit-code behavior.

## Patch and Rebuild the Base Reliably

Digest pinning freezes the exact base, including known vulnerabilities. Pair it with automation that proposes a new reviewed digest when upstream packages change. A safe cycle is:

1. Rebuild the dedicated base from a pinned distribution source.
2. Scan and smoke-test it.
3. Publish and record its new digest.
4. Update `.ko.yaml`.
5. Rebuild every dependent Go image.
6. Verify the final image and deploy by its new digest.

Do not confuse a floating base tag with automatic patching of an already published application. Existing image digests never absorb base updates.

## Troubleshoot Custom Bases

If the application fails only after changing bases, inspect:

```bash
docker run --rm --entrypoint /bin/sh "$IMAGE_REF" -c \
  'id; ls -l /ko-app; env | sort'
```

This command is appropriate only when the selected base is supposed to contain `/bin/sh`. For a static base, use image export or an external debug container.

Check architecture, libc family, CA paths, timezone files, user/group IDs, and writable paths. A `no such file` error for `/ko-app/api` can mean the ELF dynamic loader is missing even though the binary itself exists.

## Conclusion

Replace the static base only after naming the missing runtime capability. Build that capability into a dedicated, scanned base; pin its digest; scope it to the commands that need it; and verify the final user, libraries, and filesystem permissions. A larger base is a deliberate operational contract, not a generic fix for every shell-less error.

## Official Documentation

- [ko: Configuration and Base Image Overrides](https://ko.build/configuration/)
- [ko: Limitations](https://ko.build/advanced/limitations/)
- [ko: Static Assets](https://ko.build/features/static-assets/)
- [ko: Debugging](https://ko.build/features/debugging/)
- [Chainguard Images: Static Image](https://images.chainguard.dev/directory/image/static/overview)
- [OCI Image Configuration Specification](https://github.com/opencontainers/image-spec/blob/main/config.md)
