# Validation Summary: Why Does `apk.cgr.dev` Fail Intermittently Behind Nexus or Artifactory?

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Chainguard public and private APK repositories
- Wolfi packages and Alpine Package Keeper (`apk`)
- JFrog Artifactory Alpine remote and virtual repositories
- Sonatype Nexus Repository Alpine proxy and group repositories
- APK repository metadata, package signatures, and trusted keyrings
- Repository-manager metadata, component, and negative caching
- Docker BuildKit secret mounts

## Sources Consulted

- [Chainguard: Pull packages through Artifactory](https://edu.chainguard.dev/chainguard/chainguard-images/chainguard-registry/pull-through-guides/artifactory/artifactory-packages-pull-through/)
- [Chainguard: Package repository model](https://edu.chainguard.dev/chainguard/chainguard-images/features/packages/package-model/)
- [Chainguard: Private APK repositories](https://edu.chainguard.dev/chainguard/chainguard-images/features/packages/private-apk-repos/)
- [Chainguard: Custom Assembly and custom runtime keys](https://edu.chainguard.dev/chainguard/chainguard-images/features/ca-docs/custom-assembly/)
- [Chainguard: Registry overview](https://edu.chainguard.dev/chainguard/chainguard-images/chainguard-registry/overview/)
- [Chainguard service status](https://status.chainguard.dev/)
- [Alpine Linux: Working with the Alpine Package Keeper](https://docs.alpinelinux.org/user-handbook/0.1a/Working/apk.html)
- [Alpine apk-tools: `apk(8)` manual](https://gitlab.alpinelinux.org/alpine/apk-tools/-/raw/master/doc/apk.8.scd)
- [JFrog: Alpine Linux repositories](https://docs.jfrog.com/artifactory/docs/alpine-linux-repositories)
- [JFrog: Remote repository cache settings](https://docs.jfrog.com/artifactory/docs/remote-repositories)
- [Sonatype: Alpine repositories](https://help.sonatype.com/en/alpine-repositories.html)
- [Sonatype: Create an Alpine repository](https://help.sonatype.com/en/create-an-alpine-repository.html)
- [Sonatype: Configure Alpine with Nexus](https://help.sonatype.com/en/configure-alpine-with-nexus.html)
- [Sonatype: Configurable repository fields](https://help.sonatype.com/en/configurable-repository-fields.html)
- [Sonatype: Repository cache actions](https://help.sonatype.com/en/repository-actions.html)
- [Docker: Build secrets](https://docs.docker.com/build/building/secrets/)
- [Docker: Dockerfile `RUN --mount=type=secret` reference](https://docs.docker.com/reference/dockerfile/#run---mounttypesecret)

## Issues Found

- The opening said that `APKINDEX.tar.gz` names exact package paths. A v2 APK index records package metadata such as name, version, and architecture; `apk` derives the corresponding package request. The explanation was corrected accordingly.
- The private repository identifier was described ambiguously as an organization or repository name. It now directs readers to copy the exact private APK repository address from the Chainguard Console, notes that Chainguard-generated repository files can use an equivalent UID-based `apk.cgr.dev` address, and retains the UID requirement for `virtualapk.cgr.dev`.
- The Artifactory virtual-repository statement did not distinguish repository metadata signing from package signing. It now states that Artifactory virtual repositories re-sign repository metadata with their configured RSA key, matching JFrog's documented behavior.
- The Nexus signing statement was categorical and lacked a version boundary. It now notes that native Alpine repositories are available in Nexus Repository 3.93.0 and later and that signed Nexus metadata uses a repository-specific RSA key.
- The keyring remediation did not mention Chainguard's current Custom Assembly custom runtime key feature. The post now identifies that feature as the direct way to trust an internal repository-manager key in a Custom Assembly image.
- Generic cache terminology was replaced with the documented Artifactory and Nexus field names: **Metadata Retrieval Cache Period**, **Missed Retrieval Cache Period**, **Maximum Metadata Age**, **Maximum Component Age**, and **Not Found Cache TTL**.
- The global `--no-cache` option appeared after the `add` and `fetch` commands. It was moved before each command to follow the current `apk` command synopsis and avoid reliance on compatibility parsing.

## Review Notes

- All four links in the post's Official Documentation section returned successful HTTP responses during validation.
- The public Chainguard repository indexes were reachable, and the `libpq` dependency used by the Dockerfile is currently provided by versioned `libpq-*` packages in the Wolfi index.
- The Dockerfile follows Docker's documented BuildKit secret-mount pattern. Its placeholder Artifactory host and credentials prevent an end-to-end build without an actual repository-manager environment.
- Nexus Alpine support is explicitly version-specific because it was introduced in Nexus Repository 3.93.0; readers on older releases must upgrade before configuring a native Alpine proxy.
