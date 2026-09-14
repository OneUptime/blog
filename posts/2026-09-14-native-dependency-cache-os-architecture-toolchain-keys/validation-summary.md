# Validation Summary: Cross-Platform Dependency Cache Restores but Native Modules Crash: Keying by OS, Architecture, and Toolchain

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Node.js native addons and Node-API
- npm and `npm ci`
- GitHub Actions
- GitHub Actions dependency caching
- Native binary compatibility across operating systems, CPU architectures, C libraries, and toolchains

## Sources Consulted
- [Node.js process documentation](https://nodejs.org/api/process.html)
- [Node-API documentation and ABI stability implications](https://nodejs.org/api/n-api.html#implications-of-abi-stability)
- [actions/setup-node documentation](https://github.com/actions/setup-node)
- [actions/setup-node releases](https://github.com/actions/setup-node/releases)
- [actions/checkout documentation](https://github.com/actions/checkout)
- [actions/checkout releases](https://github.com/actions/checkout/releases)
- [npm v11 `npm ci` documentation](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [actions/cache inputs and cross-OS caching documentation](https://github.com/actions/cache#inputs)
- [GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [GitHub Actions dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)

## Issues Found
- The workflow used `actions/checkout@v6` and `actions/setup-node@v6`, although v7 is the current documented major version of both actions as of the validation date. Updated both references to `@v7`; their documented inputs and the rest of the workflow remain compatible.

## Review Notes
- The runner labels `ubuntu-24.04`, `windows-2022`, and `macos-15` are currently available. `macos-15` selects an arm64 standard runner; users requiring Intel macOS should use the separately documented `macos-15-intel` label.
- The example native-cache key is explicitly identified as conceptual. Its version values should continue to be derived from the actual build environment rather than copied literally.
- `enableCrossOsArchive` specifically enables Windows-created caches to interoperate with caches on other platforms; it does not provide native binary compatibility, as the post correctly explains.
