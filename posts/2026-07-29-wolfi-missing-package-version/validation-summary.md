# Validation Summary: What to Do When the Package or Version You Need Is Missing from Wolfi

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Wolfi
- Chainguard Containers and APK repositories
- Alpine Package Keeper (`apk`)
- melange package builds
- APK repository indexing and signing
- Container software supply-chain security
- SBOMs and provenance

## Sources Consulted
- Chainguard package repository model: https://edu.chainguard.dev/chainguard/chainguard-images/features/packages/package-model/
- Chainguard private APK repository model: https://edu.chainguard.dev/chainguard/chainguard-images/features/packages/private-apk-repos/
- Chainguard resource request workflow: https://edu.chainguard.dev/chainguard/chainguard-images/features/request-resources/
- Chainguard guide to building a Wolfi package: https://edu.chainguard.dev/open-source/wolfi/building-a-wolfi-package/
- Chainguard melange FAQ: https://edu.chainguard.dev/open-source/build-tools/melange/faq/
- Chainguard package version selection guide: https://edu.chainguard.dev/open-source/wolfi/apk-version-selection/
- Chainguard Containers product release lifecycle: https://edu.chainguard.dev/chainguard/chainguard-images/about/versions/
- Wolfi package repository and project documentation: https://github.com/wolfi-dev/os
- Wolfi package archive policy update effective June 13, 2026: https://github.com/orgs/wolfi-dev/discussions/78666
- Alpine Linux `apk` documentation: https://docs.alpinelinux.org/user-handbook/0.1a/Working/apk.html
- Alpine Linux `apk` command reference: https://wiki.alpinelinux.org/wiki/Apk

## Issues Found
No technical issues found.

## Review Notes
- The post's `apk` commands are valid: `--print-arch` reports apk's default architecture, `update` refreshes indexes, `policy` shows repository policy, and `search` accepts the `cmd:` and `so:` capability forms shown.
- The Wolfi, Extra Packages, organization-specific public, and private repository descriptions match Chainguard's repository model. The organization-specific public URLs require the organization UID. Private repositories use a separate authenticated `https://apk.cgr.dev/ORGANIZATION` endpoint, where `ORGANIZATION` is the repository name shown in the Chainguard Console.
- The melange local-repository YAML, including the `@local` tag and `mypackage@local` selector, matches Chainguard's Wolfi packaging guide.
- Wolfi's April 2026 archive announcement reduced the public repository retention window for non-latest packages from 12 months to 6 months starting June 13, 2026. The Chainguard Academy repository-model page still displayed the earlier 12-month policy when reviewed. The post correctly avoids hard-coding either duration and directs readers to current policy and announcements.
- Most minimal or distroless Chainguard runtime variants do not include a shell or package manager. The post correctly scopes its diagnostic commands to a development image with the same repository configuration.
