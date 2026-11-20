# Validation summary

Executed the release guard in a disposable Git repository with Node.js 24.1.0, npm 11.10.0 and Git 2.54.0. A matching annotated tag passed. Wrong version, untracked source, modified tracked source and an incorrect commit failed. Packed the private fixture locally, inspected the archive manifest/file inventory and independently verified its SHA-512 integrity. Published JavaScript matches the tested helper; JavaScript, three shell snippets and JSON pass syntax checks. Mermaid structure was checked, not rendered. The generated social image was visually inspected and is readable without clipping.

No registry publication, live npm view request, GitHub Release, signature verification or clean-consumer install was performed. The article distinguishes local checks from post-publication validation and documents ignored-file and single-package limits.

## Checked sources

- https://docs.npmjs.com/cli/v11/configuring-npm/package-json/
- https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
- https://git-scm.com/docs/git-rev-parse
- https://nodejs.org/download/release/v24.1.0/docs/api/child_process.html
- https://git-scm.com/docs/git-status
- https://raw.githubusercontent.com/npm/cli/v11.10.0/docs/lib/content/commands/npm-pack.md
- https://raw.githubusercontent.com/npm/cli/v11.10.0/lib/commands/pack.js
- https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/
- https://docs.npmjs.com/cli/v11/commands/npm-view/
- https://raw.githubusercontent.com/npm/cli/v11.10.0/docs/lib/content/commands/npm-publish.md
- https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases
- https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
