# Validation Summary: How to Install Extra APK Packages in a Distroless Chainguard Runtime

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Chainguard Containers
- Chainguard Custom Assembly
- Wolfi and APK package repositories
- Alpine Package Keeper (`apk`)
- Docker and multi-stage Dockerfiles
- Distroless container images
- Linux dynamic linker configuration (`ldconfig`)
- Software bills of materials (SBOMs)

## Sources Consulted

- [Installing APK packages in distroless variants](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/install-apks-in-distroless-variants/)
- [Overview of Chainguard Custom Assembly](https://edu.chainguard.dev/chainguard/chainguard-images/features/ca-docs/custom-assembly/)
- [Using chainctl to Manage Custom Assembly Resources](https://edu.chainguard.dev/chainguard/chainguard-images/features/ca-docs/custom-assembly-chainctl/)
- [chainctl images repos build edit reference](https://edu.chainguard.dev/platform/chainctl/chainctl-docs/chainctl_images_repos_build_edit/)
- [Overview of Chainguard's Package Repositories](https://edu.chainguard.dev/chainguard/chainguard-images/features/packages/package-model/)
- [Chainguard's container variants](https://edu.chainguard.dev/chainguard/chainguard-images/about/differences-development-production/)
- [Chainguard Python container overview](https://images.chainguard.dev/directory/image/python/overview)
- [Chainguard wolfi-base container overview](https://images.chainguard.dev/directory/image/wolfi-base/overview)
- [Working with the Alpine Package Keeper](https://docs.alpinelinux.org/user-handbook/0.1a/Working/apk.html)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker SBOM attestations](https://docs.docker.com/build/metadata/attestations/sbom/)
- [Wolfi PostgreSQL 18 package definition](https://github.com/wolfi-dev/os/blob/main/postgresql-18.yaml)

## Issues Found

No technical issues found.

## Review Notes

- The documented `apk --root` and `--no-scripts` chroot workflow, `ldconfig -r`, and `COPY --link` caveat match Chainguard's current official guidance.
- The Custom Assembly YAML shape and `chainctl images repos build edit` command are current. Custom Assembly availability and package entitlement limitations are accurately described.
- Chainguard currently describes development variants as production-ready while still recommending standard distroless variants for the smallest attack surface.
- APK capability searches using `so:` and `cmd:` are valid. Wolfi's current PostgreSQL package definition provides the unversioned `libpq` virtual package from its versioned `libpq-18` subpackage.
- The examples use mutable `latest` tags for readability. The post already gives the appropriate production caveat to resolve and record digests, keep standard and development images aligned, rebuild regularly, and test updates.
- The SBOM warning is correct: the base image's supplied SBOM does not automatically inventory packages introduced by a downstream build, so the final artifact needs its own SBOM.
