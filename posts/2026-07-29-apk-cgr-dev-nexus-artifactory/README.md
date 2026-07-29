# Why Does `apk.cgr.dev` Fail Intermittently Behind Nexus or Artifactory?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Wolfi APK, JFrog Artifactory, Nexus Repository, Package Management

Description: Diagnose APK proxy failures caused by stale indexes, URL rewriting, repository signing, authentication, or incorrect Chainguard endpoints.

---

Intermittent APK failures behind a repository manager are often consistency failures, not random outages. `apk` first downloads `APKINDEX.tar.gz`, selects a package name, version, and architecture from it, then requests the corresponding `.apk` object. If a proxy caches the index and package objects differently, rewrites a signed URL, or applies negative caching, the client can see an index entry whose package request fails.

Typical errors include:

```text
package mentioned in index not found
UNTRUSTED signature
Permission denied
temporary error
no such package
```

Each points to a different part of the path.

## Identify the Chainguard repository type

Do not treat every `cgr.dev` URL as interchangeable.

Public Free images commonly use:

```text
https://apk.cgr.dev/chainguard
```

Chainguard customers can use organization-specific public tracking endpoints:

```text
https://virtualapk.cgr.dev/ORGANIZATION_UID/chainguard
https://virtualapk.cgr.dev/ORGANIZATION_UID/extra-packages
```

Private organization repositories follow a separate authenticated model:

```text
https://apk.cgr.dev/ORGANIZATION
```

The `virtualapk.cgr.dev` tracking endpoints require the organization UID. For the authenticated `apk.cgr.dev` repository, copy the exact private APK repository address from the Chainguard Console; Chainguard-generated `/etc/apk/repositories` files can contain an equivalent UID-based `apk.cgr.dev` address. Capture the exact upstream and proxy URLs before troubleshooting.

## Separate direct access from proxy behavior

From an approved diagnostic environment, compare the same architecture and repository:

```bash
apk --print-arch
cat /etc/apk/repositories
apk -v update
apk policy target-package
```

Run once against the proxy, then against the documented upstream if network policy allows it. Record timestamps, HTTP status codes, response headers, and the repository manager request log.

Interpret the result:

- direct and proxy both fail: check Chainguard status, authentication, entitlement, DNS, TLS, and the requested package;
- direct succeeds while proxy fails: focus on cache, rewriting, signing, and credentials;
- one architecture fails: inspect the architecture path and whether its index and package objects were cached together;
- a second attempt succeeds: inspect negative-cache TTLs, upstream token refresh, and index/package cache ordering.

Do not disable TLS verification to make the comparison pass.

## Configure Artifactory as an Alpine remote repository

Chainguard's Artifactory guide specifies a remote repository with package type Alpine. For customer-specific public endpoints, set the upstream to the documented `virtualapk.cgr.dev/<UID>/...` URL.

One particularly important Artifactory option is **Disable URL Normalization**. Chainguard documents that normalized or rewritten paths can strip or alter the information needed to retrieve the package named by the index. This commonly surfaces as `package mentioned in index not found`.

Also check:

- a username containing `@` may need percent encoding as `%40`;
- private upstream credentials belong on the remote repository, not in a committed Dockerfile;
- the repository URL has the correct UID and repository suffix;
- stale metadata and negative-cache entries have been cleared after fixing configuration;
- the remote repository preserves Chainguard's original package bytes and signatures.

Use BuildKit secrets if the build must authenticate to the internal Artifactory endpoint:

```dockerfile
# syntax=docker/dockerfile:1
FROM cgr.dev/chainguard/python:latest-dev

USER root
RUN --mount=type=secret,id=repo_token \
    token="$(cat /run/secrets/repo_token)" \
    && printf '%s\n' \
       "https://build-user:${token}@repo.example.com/artifactory/cg-chainguard/" \
       > /etc/apk/repositories \
    && apk --no-cache add libpq \
    && rm -f /etc/apk/repositories
```

The secret mount is not persisted as a layer. Avoid logging the expanded URL.

## Understand repository re-signing

APK verifies repository and package signatures against keys in the image. Chainguard documents that:

- Artifactory remote repositories can preserve the original Chainguard signatures;
- Artifactory virtual repositories re-sign repository metadata with their configured RSA key;
- Nexus Repository 3.93.0 and later support Alpine repositories, and signed Nexus metadata uses a repository-specific RSA key.

The Artifactory virtual and signed Nexus metadata are not automatically trusted by a Chainguard Custom Assembly image that contains only the Chainguard key. A resulting `UNTRUSTED signature` is deterministic, even if it appears intermittent because some clients or paths bypass the re-signing repository.

The correct fix is to configure the repository manager's public key as a Custom Assembly custom runtime key, distribute a trusted internal keyring through another reviewed image-building process, or use a signature-preserving remote repository. `apk --allow-untrusted` disables the assurance and should not be the routine workaround.

## Fix index and object cache skew

An APK index and the packages it references should be refreshed as a coherent set. Check repository-manager settings for:

- Artifactory **Metadata Retrieval Cache Period** and **Missed Retrieval Cache Period**;
- Nexus **Maximum Metadata Age**, **Maximum Component Age**, and **Not Found Cache TTL**;
- cleanup or retention of cached package objects;
- remote checksum validation;
- query-string stripping;
- path normalization or collapsed path segments;
- redirect handling;
- partial or range-request caching;
- different upstreams combined behind a group or virtual repository.

After correcting the configuration, clear only the affected repository cache through the repository manager's supported administration workflow. Do not delete unrelated artifact storage.

Then force a clean client-side check:

```bash
rm -f /var/cache/apk/*
apk --no-cache update
apk --no-cache fetch target-package
```

Run this only in a disposable debug container or build stage.

## Check authentication separately

Chainguard private APK repositories require an identity with the appropriate APK pull role. Repository-manager upstream credentials must be renewable and must not be a short-lived interactive token silently cached past expiry.

Confirm:

- the pull token is scoped to the correct organization and APK repository;
- the proxy sends Basic authentication to the private upstream;
- token rotation updates the repository-manager secret atomically;
- clocks are synchronized;
- 401 and 403 responses are not cached as package misses.

Public Wolfi and Extra repositories do not require Chainguard authentication, though the internal proxy can still require its own credentials.

## Monitor the path

Keep separate checks for:

1. Chainguard's published service status;
2. direct upstream index retrieval from an allowed location;
3. proxy index retrieval;
4. a known package fetch through the proxy;
5. signature verification by `apk`.

This distinguishes an upstream incident from a cache or trust configuration failure and avoids responding to every proxy error by changing the base image.

## Official Documentation

- [Pull Chainguard APK packages through Artifactory](https://edu.chainguard.dev/chainguard/chainguard-images/chainguard-registry/pull-through-guides/artifactory/artifactory-packages-pull-through/)
- [Chainguard package repository model](https://edu.chainguard.dev/chainguard/chainguard-images/features/packages/package-model/)
- [Custom Assembly runtime repository limitations](https://edu.chainguard.dev/chainguard/chainguard-images/features/ca-docs/custom-assembly/)
- [Chainguard registry overview](https://edu.chainguard.dev/chainguard/chainguard-images/chainguard-registry/overview/)
