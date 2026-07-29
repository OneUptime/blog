# Avoid APK Version Conflicts in Rebuilt Chainguard Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Wolfi APK, Custom Assembly, Docker, Dependency Management

Description: Prevent base-image and APK repository skew while still adopting Chainguard's frequent security rebuilds through tested digest updates.

---

Chainguard Containers and their package repositories move quickly to deliver current patches. A build can briefly combine an older base-image digest with a newer repository index. If a core library has changed, `apk add` may be unable to find one compatible package graph.

The error is usually a dependency-resolution safeguard:

```text
ERROR: unable to select packages:
  package-a (breaks: package-b[required-version])
```

Do not bypass it with force flags. Establish which base, repositories, and package versions were resolved.

## Why the conflict appears

Assume yesterday's base contains an older `libcrypto`, while today's repository has a newly rebuilt `openssl` that requires the new library. These operations do not necessarily observe the same release state:

```dockerfile
FROM cgr.dev/chainguard/python:latest-dev@sha256:OLDER_DIGEST
RUN apk add --no-cache openssl
```

Chainguard documents that such windows can close when the next compatible base build is published. Re-running blindly, however, produces a non-reproducible pipeline. First save:

```bash
docker image inspect "$BASE_IMAGE" \
  --format '{{json .RepoDigests}}'

docker run --rm \
  --user root \
  --entrypoint /bin/sh \
  "$BASE_IMAGE" -c '
    cat /etc/apk/repositories
    apk policy openssl libcrypto3
    apk info -v
  '
```

The exact package names vary. Use the error output and `apk policy` rather than assuming the example names.

## Prefer Custom Assembly

For Chainguard customers, Custom Assembly is the officially supported method for extending Chainguard Containers. Package additions are declarative, and Chainguard builds the combined package set together and rebuilds it when constituent packages update.

This avoids the timing gap created when a downstream Dockerfile independently joins a base digest to the latest repository. It also keeps supported additions within the organization's entitled package set.

Use manual `apk add` when the team accepts responsibility for:

- compatibility testing;
- final-image SBOM and scanning;
- repository and package retention;
- image rebuilds;
- tracking which additions remain covered by support commitments.

## Refresh a floating base before retrying

For development builds whose Dockerfile uses a floating Chainguard `-dev` tag:

```bash
docker build --pull --no-cache -t app:test .
```

`--pull` refreshes base tags. `--no-cache` ensures an earlier successful `apk add` layer is not hiding the current repository state. This improves freshness but does not provide long-term reproducibility because the tags and index can move again.

Use matching image version streams in builder and runtime:

```dockerfile
FROM cgr.dev/ORGANIZATION/python:3.13-dev AS build
# Build artifacts.

FROM cgr.dev/ORGANIZATION/python:3.13
# Copy artifacts.
```

The exact tags and access depend on the organization's Production Container catalog. Verify them in the Chainguard Directory or Console rather than inventing a suffix.

## Pin for reproducibility, then automate updates

A digest fixes the base image:

```dockerfile
FROM cgr.dev/ORGANIZATION/python:3.13@sha256:REVIEWED_DIGEST
```

It does not freeze a remote APK repository. For a fully repeatable manual extension, the build needs a reviewed base digest plus retained package artifacts or an immutable internal repository snapshot.

Exact package pins can help isolate a release:

```dockerfile
RUN apk add --no-cache package-name=1.2.3-r4
```

They also add maintenance risk:

- old versions eventually leave rolling repositories;
- dependency pins can conflict with security updates;
- the build receives no fix until a bot or person advances the pin;
- multiple exact pins can make the solver impossible to satisfy.

If exact reproducibility is required, mirror the signed package set and update the base digest and repository snapshot together through a tested promotion process. Do not expect a public rolling repository to be a permanent archive.

## Do not use dangerous shortcuts

Avoid:

```bash
apk add --force-overwrite package-name
apk add --allow-untrusted package-name
apk upgrade --available
```

`--force-overwrite` overwrites files owned by other packages, masking a packaging conflict. `--allow-untrusted` permits packages with an untrusted signature or no signature. A broad upgrade can replace packages selected and tested by the base-image build, effectively creating an unreviewed distribution upgrade in a Docker layer.

Also never add Alpine repositories to obtain another version. Wolfi and Alpine packages are not supported as a mixed package graph.

## Build a controlled update loop

A practical release flow is:

1. pin every Chainguard base by digest while retaining a human-readable tag hint;
2. let Renovate, Dependabot, or an internal job discover new digests;
3. rebuild with the intended repository snapshot;
4. test application startup, native imports, TLS, and graceful shutdown;
5. generate an SBOM and scan the final artifact;
6. promote the digest through environments;
7. retain the previous working digest for rollback.

Chainguard recommends regular automated digest updates so that immutability does not turn into staleness.

## Triage a failing build

Use a disposable development container:

```bash
docker run --rm -it \
  --user root \
  --entrypoint /bin/sh \
  cgr.dev/chainguard/python:latest-dev

apk update
apk policy failing-package
apk add --simulate failing-package
```

Compare this result with the pinned base. If a freshly published matching base resolves the graph, update it through the normal review process. If the conflict persists, inspect mutually exclusive providers and file ownership, then reduce the package set.

Waiting for repository convergence can be a valid short-term response to a documented transient window. It is not a substitute for preserving evidence and making downstream builds reproducible.

## Official Documentation

- [Custom Assembly FAQ](https://edu.chainguard.dev/chainguard/chainguard-images/features/ca-docs/faq/)
- [Overview of Chainguard Custom Assembly](https://edu.chainguard.dev/chainguard/chainguard-images/features/ca-docs/custom-assembly/)
- [Considerations for keeping containers up to date](https://edu.chainguard.dev/chainguard/chainguard-images/staying-secure/updating-images/considerations-for-image-updates/)
- [Chainguard package repository model](https://edu.chainguard.dev/chainguard/chainguard-images/features/packages/package-model/)
