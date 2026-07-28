# Validation Summary: How to Make Local and CI Builds Use the Same Toolchain, Commands, and Inputs

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- GitHub Actions
- Node.js and npm
- GNU Make
- POSIX shell scripting
- Git
- C and C++ toolchains
- Containers and Docker image digests
- Bazel and hermetic builds
- Reproducible-build techniques
- CI caching and artifact handling

## Sources Consulted

- [GitHub Actions: Building and testing Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub Actions: Reusing workflow configurations](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)
- [actions/checkout v7.0.1 release](https://github.com/actions/checkout/releases/tag/v7.0.1)
- [actions/setup-node v7.0.0 release](https://github.com/actions/setup-node/releases/tag/v7.0.0)
- [actions/setup-node v7 README](https://github.com/actions/setup-node/blob/v7/README.md)
- [npm 12: `npm ci`](https://docs.npmjs.com/cli/v12/commands/npm-ci/)
- [npm 12: `package-lock.json`](https://docs.npmjs.com/cli/v12/configuring-npm/package-lock-json/)
- [GNU Make manual](https://www.gnu.org/software/make/manual/make.html)
- [POSIX.1-2024 Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)
- [Git `diff` documentation](https://git-scm.com/docs/git-diff)
- [Git `status` documentation](https://git-scm.com/docs/git-status)
- [Bazel hermeticity](https://bazel.build/concepts/hermeticity)
- [Docker image digests](https://docs.docker.com/dhi/explore/security-concepts/digests/)
- [Docker build cache invalidation](https://docs.docker.com/build/cache/invalidation/)
- [Docker build best practices: Pin base image versions](https://docs.docker.com/build/building/best-practices/#pin-base-image-versions)
- [Reproducible Builds: `SOURCE_DATE_EPOCH`](https://reproducible-builds.org/docs/source-date-epoch/)

## Issues Found

- The workflow example used `actions/checkout@v6`, but checkout v7 is the current major release as of the validation date. The example was updated to `actions/checkout@v7`.
- The description of `npm ci` said it fails whenever the manifest and lockfile disagree. Current npm documentation states the relevant failure condition more specifically: dependency declarations in `package.json` do not match the lockfile. The sentence was narrowed accordingly while preserving the correct statement that `npm ci` does not update either file.
- The clean-workspace assertion used `git diff --exit-code`, which compares the working tree with the index and therefore does not detect staged or untracked changes. It was replaced with `test -z "$(git status --porcelain=v1 --untracked-files=all)"`, which checks the stable script-oriented status output and fails for staged, unstaged, or untracked changes.

## Review Notes

- `actions/checkout@v7` and `actions/setup-node@v7` are current, valid major-version references as of the validation date. Setup Node v7 supports `node-version-file`, `.nvmrc`, `cache: npm`, and `cache-dependency-path`.
- The Makefile syntax and tab-prefixed recipes were checked with GNU Make, and the shell input-validation snippet was checked with `sh -n`; both are syntactically valid.
- npm documents that lockfile-shaping options such as `legacy-peer-deps` or `install-links` must also be supplied to `npm ci`, commonly through a committed project `.npmrc`. This is consistent with the post's broader requirement to declare every behavior-changing input.
- All links in the post's Official Documentation section returned successful responses. The Bazel hermeticity URL redirects to its current canonical location.
