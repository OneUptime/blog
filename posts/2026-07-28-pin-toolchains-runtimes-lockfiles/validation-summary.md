# Validation Summary: How to Pin Compilers, Runtimes, and Lockfiles for Deterministic Builds

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GitHub Actions and reusable workflows
- Node.js and `actions/setup-node`
- npm, `package-lock.json`, and `npm ci`
- Native compiler toolchains, linkers, SDKs, and build caches
- Bazel hermetic builds
- Dockerfiles, Docker/OCI image tags, and image digests
- GCC and `SOURCE_DATE_EPOCH`
- Reproducible-build environment controls
- Build provenance, artifact digests, and attestations

## Sources Consulted
- [GitHub Docs: Managing custom actions and version references](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/manage-custom-actions)
- [GitHub Docs: Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub Docs: Reuse workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)
- [GitHub Docs: Building and testing Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
- [actions/setup-node releases](https://github.com/actions/setup-node/releases)
- [actions/setup-node usage and supported version syntax](https://github.com/actions/setup-node/blob/main/README.md)
- [Node.js v22.14.0 release files](https://nodejs.org/download/release/v22.14.0/)
- [npm Docs: package-lock.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/)
- [npm Docs: npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [Docker Docs: Pull an image by digest](https://docs.docker.com/reference/cli/docker/image/pull/#pull-an-image-by-digest-immutable-identifier)
- [Docker Docs: Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker Docs: Policy templates and digest-pinning examples](https://docs.docker.com/build/policies/examples/)
- [Docker Hub: node:22.14.0 image details](https://hub.docker.com/layers/library/node/22.14.0/images/sha256-801f68d685a14db1ab03ec63add9ffba2d4d2f2ee27682ad0a685ed9d7534267)
- [Bazel Docs: Hermeticity](https://bazel.build/concepts/hermeticity)
- [GCC Docs: Environment variables and SOURCE_DATE_EPOCH](https://gcc.gnu.org/onlinedocs/gcc/Environment-Variables.html)
- [Reproducible Builds: Deterministic build systems](https://reproducible-builds.org/docs/deterministic-build-systems/)
- [Reproducible Builds: SOURCE_DATE_EPOCH](https://reproducible-builds.org/docs/source-date-epoch/)
- [Reproducible Builds: Stable order for inputs](https://reproducible-builds.org/docs/stable-inputs/)
- [Reproducible Builds: Locales](https://reproducible-builds.org/docs/locales/)
- [Reproducible Builds: Archive metadata](https://reproducible-builds.org/docs/archives/)
- [Reproducible Builds: Embedded signatures](https://reproducible-builds.org/docs/embedded-signatures/)
- [GitHub Docs: Artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations)

## Issues Found
- The full-SHA GitHub Action example used the placeholder repository `owner/action`, so it was not runnable. Replaced it with `actions/checkout` pinned to the verified full commit SHA for v6.1.0 and retained the release version in a comment.
- The Node.js example referenced the moving `actions/setup-node@v7` major tag, which did not follow the post's own controlled-lane requirement to pin workflow code. Replaced the tag with the verified full commit SHA for `actions/setup-node` v7.0.0 and retained the release version in a comment.
- The Dockerfile example used the abbreviated placeholder digest `sha256:...`, which is not a valid runnable image reference. Replaced it with the verified multi-platform index digest currently associated with `node:22.14.0`.

## Review Notes
- Node.js 22.14.0 exists in the official release archive, and `actions/setup-node` v7 accepts exact semantic versions through `node-version`.
- GitHub documents full-length commit SHAs as the immutable way to pin actions and applies the same guidance to third-party reusable workflows. Same-repository reusable workflows referenced by relative path are loaded from the caller's commit.
- The documented `npm ci` behavior is accurate: it requires a project lockfile, rejects dependency mismatches with `package.json`, removes an existing `node_modules`, leaves package manifests unchanged, and requires matching tree-shaping configuration.
- Docker digest pinning, the tag-plus-digest image reference, external `COPY --from` image handling, Bazel's hermeticity model, and GCC's use of `SOURCE_DATE_EPOCH` for `__DATE__` and `__TIME__` were verified.
- The reproducibility caveats concerning timestamps, paths, locale, timezone, input ordering, randomness, archive metadata, signatures, clean rebuilds, and provenance are consistent with authoritative guidance.
