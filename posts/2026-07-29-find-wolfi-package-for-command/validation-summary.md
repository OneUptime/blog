# Validation Summary: How to Find the Wolfi APK Package That Provides a Missing Command

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Wolfi
- Chainguard Containers
- Alpine Package Keeper (`apk`)
- APK package capabilities (`cmd:`, `so:`, and `pc:`)
- Docker and multi-stage Dockerfiles
- Chainguard public, Extra Packages, and private APK repositories
- Chainguard Custom Assembly and distroless image assembly

## Sources Consulted
- [Migrating Dockerfiles to Chainguard Containers](https://edu.chainguard.dev/get-started/migration/migrating-to-chainguard-images/)
- [Overview of Chainguard's Package Repositories](https://edu.chainguard.dev/chainguard/chainguard-images/features/packages/package-model/)
- [Chainguard's Private APK Repositories](https://edu.chainguard.dev/chainguard/chainguard-images/features/packages/private-apk-repos/)
- [Package and Image Name Mappings](https://edu.chainguard.dev/chainguard/chainguard-images/about/package-name-mappings/)
- [Wolfi FAQs](https://edu.chainguard.dev/open-source/wolfi/faq/)
- [Choosing a Container for your Compiled Programs](https://edu.chainguard.dev/chainguard/chainguard-images/about/images-compiled-programs/compiled-programs/)
- [Installing APK packages in distroless variants](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/install-apks-in-distroless-variants/)
- [Overview of Chainguard Custom Assembly](https://edu.chainguard.dev/chainguard/chainguard-images/features/ca-docs/custom-assembly/)
- [Working with the Alpine Package Keeper](https://docs.alpinelinux.org/user-handbook/0.1a/Working/apk.html)
- Alpine `apk-tools` 2.14.10 manual sources for [`apk search`](https://gitlab.alpinelinux.org/alpine/apk-tools/-/raw/v2.14.10/doc/apk-search.8.scd), [`apk info`](https://gitlab.alpinelinux.org/alpine/apk-tools/-/raw/v2.14.10/doc/apk-info.8.scd), [`apk policy`](https://gitlab.alpinelinux.org/alpine/apk-tools/-/raw/v2.14.10/doc/apk-policy.8.scd), and [`apk add`](https://gitlab.alpinelinux.org/alpine/apk-tools/-/raw/v2.14.10/doc/apk-add.8.scd)
- [Current public Wolfi x86_64 APK index](https://packages.wolfi.dev/os/x86_64/APKINDEX.tar.gz)

## Issues Found
- Plain `apk search` was described as potentially returning unrelated package descriptions. By default, APK 2.14.10 searches package names; descriptions are searched only with `-d` or `--description`. The introduction and capability table were corrected to state that plain search matches package names rather than executable filenames.
- Access to the Extra Packages repository was grouped with customer-specific repository access. Chainguard documents Extra Packages as public to all users but not enabled in Free images by default. The repository-context paragraph was corrected to distinguish public Extra Packages access from organization-specific URLs and entitlement-scoped private repositories.
- The shared-library example ran `apk policy libpq`, but the current Wolfi index exposes `libpq` as a virtual capability provided by concrete version-stream packages. APK 2.14.10's policy implementation reports concrete package names rather than virtual providers, so that command would produce no useful policy output. The example now inspects the current concrete provider, `libpq-18`, and uses `postgresql-18-dev` as the corresponding concrete development-package example.

## Review Notes
The live public Wolfi x86_64 index was checked on 2026-07-29 and confirmed the capability mappings used by the post, including `cmd:useradd` to `shadow`, `cmd:ldd` to `posix-libc-utils`, `pc:libcurl` to `curl-dev`, and the current `libpq-18` runtime provider. These mappings and versions are repository-, architecture-, and date-sensitive; the post correctly tells readers to search in the build's actual repository context and record image digests and package versions.
