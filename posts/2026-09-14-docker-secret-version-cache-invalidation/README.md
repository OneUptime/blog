# Build Secrets Changed but the Docker Layer Stayed Cached: Adding Explicit Secret-Version Invalidation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, BuildKit, Security, Caching, CI/CD

Description: Invalidate secret-dependent Docker build steps using non-secret version inputs while keeping credentials out of image arguments, layers, and cache namespaces.

---

Changing a BuildKit secret does not automatically rerun the instruction that consumes it. Secret contents are excluded from the build cache key. If the operation's other inputs match, BuildKit can reuse its previous result without reading the new secret.

This is often desirable when a token only authorizes downloading the same immutable dependency. It becomes a correctness problem when the secret selects different content or when the build must prove that newly rotated credentials work. [Docker secret invalidation rules](https://docs.docker.com/build/cache/invalidation/#build-secrets).

## Decide Whether Rotation Should Change the Output

Separate these cases before adding a cache-busting argument:

| Secret change | Should the artifact change? | Appropriate action |
| --- | --- | --- |
| Equivalent registry token rotates | Usually no | Preserve artifact reuse; validate new credentials separately |
| Secret grants access to a new dataset version | Possibly | Model the dataset version as an explicit input |
| Tenant or account changes | Possibly | Separate content identity and access policy |
| Build must exercise new authentication | Not necessarily | Force a dedicated authentication/fetch check |

A secret is a credential, not a complete description of the content being fetched. Whenever possible, pin the dependency, source revision, or dataset digest independently of the credential.

## Add a Non-Secret Version Input

For a project whose private dependency resolution legitimately changes with an authorization profile, use an opaque public version label:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./

ARG DEPENDENCY_ACCESS_VERSION
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc,required=true \
    --mount=type=cache,target=/root/.npm \
    test -n "$DEPENDENCY_ACCESS_VERSION" && npm ci

FROM dependencies AS build
COPY . .
RUN npm run build
```

Build with a secret file supplied by your CI secret manager:

```bash
docker buildx build \
  --secret id=npmrc,src=/run/ci-secrets/npmrc \
  --build-arg DEPENDENCY_ACCESS_VERSION=private-registry-profile-12 \
  --load --tag app:ci .
```

The version is deliberately referenced in the `RUN` operation. Change it when the required access-dependent behavior changes. Keep the value non-sensitive: build arguments may appear in build records, history, or provenance. Secret mounts are the supported channel for the credential itself. [Build secrets](https://docs.docker.com/build/building/secrets/).

Do not derive the version by hashing a password or token. That publishes a stable secret-derived value, can expose correlation, and may enable guessing of weak secrets. A rotation ID or reviewed content version communicates the operational change without encoding the credential.

## Understand What Required Means

`required=true` makes the secret mandatory when the operation executes. It does not transform a cached operation into a live authentication check. A fully cached build can succeed even when the supplied credential is expired, because the download command never ran. [Dockerfile secret mounts](https://docs.docker.com/reference/dockerfile/#run---mounttypesecret).

If proving credential validity is the objective, use a dedicated check against the intended service or rerun the relevant stage with caching bypassed. Even then, a package-manager download cache might satisfy all dependencies without contacting the registry.

Design the check around an authenticated request whose expected permission is known. Do not use a successful cached install as evidence that token rotation completed correctly.

## Keep Secret Files Out of Every Layer

Mounting `.npmrc` avoids copying it into an image layer. It does not prevent the command you run from printing, copying, or embedding its contents elsewhere. Avoid shell tracing around secrets and review tools that generate configuration, diagnostic logs, or bundled assets.

Add local secret filenames and CI-generated credential directories to `.dockerignore` if they can exist in the build context. A later `COPY . .` can otherwise capture a credential even though the earlier instruction used a secret mount correctly.

Likewise, package caches and exported BuildKit cache can contain private package contents. A registry token may remain protected while the files it fetched are exposed through a broadly readable cache. Align cache reader permissions with the sensitivity of those artifacts.

## Place Invalidation at the Narrowest Stage

Put the version argument in the stage and immediately before the work it controls. A global version consumed by an early common stage can invalidate unrelated tooling and compilation.

Separate independent private dependencies into stages when their update rates differ. Avoid adding the secret version to a global CI cache namespace unless that namespace really contains access-dependent data requiring isolation. Operation invalidation and service authorization solve different problems.

When an immutable package version stays unchanged, prefer stable package checksums and lockfiles. Rotating an equivalent authentication token should not force every downstream build to compile again unless your validation policy explicitly requires it.

## Test the Actual Rotation Contract

Use a disposable credential and a controlled private dependency. First build with version A, then repeat unchanged and observe reuse. Change only the credential and confirm that cached reuse remains possible. Finally change the non-secret version input and verify that the consuming operation executes.

Check the produced artifact's dependency version or digest, and inspect logs for unintended credential output. Run a separate negative authentication test with a rejected credential if validating access is part of the rotation procedure.

The result should be explainable: a cache hit means the declared artifact inputs matched; a successful live authentication check means the new credential works. Keeping those claims separate prevents cached builds from hiding broken access after a rotation.

## References

- [Secret cache invalidation](https://docs.docker.com/build/cache/invalidation/#build-secrets)
- [Docker build secrets](https://docs.docker.com/build/building/secrets/)
- [Dockerfile secret mount options](https://docs.docker.com/reference/dockerfile/#run---mounttypesecret)
- [External cache security](https://docs.docker.com/build/cache/backends/)
