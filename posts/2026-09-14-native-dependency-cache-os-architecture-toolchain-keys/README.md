# Cross-Platform Dependency Cache Restores but Native Modules Crash: Keying by OS, Architecture, and Toolchain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, Caching, CI/CD, Architecture, Troubleshooting

Description: Prevent native dependency crashes after cache restores by separating download stores from installed artifacts and keying compiled outputs by their actual compatibility requirements.

---

A cache archive can restore successfully and still contain native code that cannot run on the consumer. Archive compatibility only means files were transferred and unpacked. It says nothing about CPU instructions, operating-system APIs, libc, runtime ABI, or linked libraries.

This often happens when a workflow caches `node_modules` under a lockfile-only key and shares it between Linux and macOS, amd64 and arm64, or different Node versions. The package graph matches, but the installed native artifacts do not.

## Identify Which Files Are Platform-Specific

Separate the cache into categories before changing keys:

| Cached material | Typical compatibility concern |
| --- | --- |
| Package source tarballs | Integrity and package-manager cache format |
| Installed dependency tree | Install scripts, platform selection, runtime and native binaries |
| Compiled addon | OS, architecture, runtime ABI, libc and linked libraries |
| Compiler output cache | Compiler, flags, target platform and source inputs |

For Node.js, `process.platform`, `process.arch`, and `process.versions` report useful runtime identity. The `modules` version identifies the C++ module ABI used by addons tied to that ABI. [Node process reference](https://nodejs.org/api/process.html).

```bash
node -e 'console.log(JSON.stringify({
  platform: process.platform,
  arch: process.arch,
  node: process.version,
  modules: process.versions.modules,
  napi: process.versions.napi
}, null, 2))'
```

Run this inside the environment that loads the addon. A host runner's architecture can differ from the container or emulated process that installs and executes dependencies.

## Prefer Download Caching with Fresh Installation

The simplest reliable Node workflow usually caches the package-manager store and runs `npm ci` each time:

```yaml
name: Test supported runners
on: [push, pull_request]
permissions:
  contents: read
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-24.04, windows-2022, macos-15]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: package-lock.json
      - run: npm ci
      - run: npm test
```

Setup-node documents that its package cache does not cache `node_modules`. npm's clean installation constructs the dependency tree for the current environment rather than treating a restored installed tree as authoritative. [Setup-node caching](https://github.com/actions/setup-node), [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/).

Choose runner labels for the operating systems you support and check their availability in the [GitHub-hosted runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).

Installation can still fail if the package itself publishes an incompatible prebuilt binary or the runner lacks required libraries. The cache policy removes one source of confusion; it does not guarantee that every native package supports every matrix entry.

## Key Compiled Outputs by Actual Compatibility

If restoring installed or compiled outputs is necessary after measuring its benefit, use an exact compatibility key. A conceptual key might include:

```text
native-v3-linux-arm64-glibc2.39-node24.8.0-abi137-clang18-lockHASH-flagsHASH
```

The numbers are illustrative components, not a recommended version combination. Derive actual values from the build environment or a reviewed immutable toolchain manifest. Include the container image digest when it defines the runtime libraries and toolchain.

OS and architecture alone are insufficient for Linux native binaries: glibc and musl are different environments, and minimum supported library versions matter. Compiler flags such as CPU-specific optimization can make two binaries incompatible even when the nominal architecture is the same.

Include installation options and package-manager behavior that alter the tree, such as omitted dependency classes or platform selection. A lockfile hash cannot represent flags supplied outside the lockfile.

## Keep Fallbacks Within a Safe Boundary

Do not use a broad restore prefix for opaque native outputs and then skip installation on any restored archive. A prefix that drops architecture, ABI, or libc identity can retrieve precisely the incompatible tree you were trying to avoid.

An exact match should be required before trusting a complete installed artifact. On a miss, rebuild it in the consumer environment. If you use a fallback only to seed a package download store, still let the package manager reconcile the current lockfile and platform.

GitHub's `enableCrossOsArchive` option controls cross-OS archive handling. It does not translate binaries or make compiled dependency directories portable. [GitHub cache inputs](https://github.com/actions/cache#inputs).

## Account for Node-API Without Overgeneralizing

Node-API provides ABI stability across supported Node versions for addons that use that interface appropriately. That can reduce the need to partition by Node's internal module ABI for those specific addons.

It does not make a Linux binary run on Windows or an amd64 binary run on arm64. External libraries used by an addon may also have their own ABI constraints, and direct V8 or Node C++ APIs do not inherit Node-API's guarantee. [Node-API ABI implications](https://nodejs.org/api/n-api.html#implications-of-abi-stability).

Start with conservative partitioning and narrow it only when the actual addon and its linked dependencies have a documented compatibility contract.

## Verify the Native Module Itself

A useful check loads the real native dependency and exercises a small representative operation on every supported consumer platform. Merely listing `node_modules` or running a JavaScript-only test cannot reveal an incompatible native binary.

For a suspicious restore, compare a fresh installation on the same runner and inspect the selected binary's architecture and linked libraries using the platform's tooling. Record runtime identity, cache key, package version, and install flags.

Finally test a deliberately incompatible producer/consumer pair and confirm that the key policy causes a miss. A safe cache should make incompatibility produce a rebuild, not a runtime crash after a successful archive restore.

## References

- [Node runtime identity](https://nodejs.org/api/process.html)
- [Setup-node dependency caching](https://github.com/actions/setup-node)
- [npm clean installation](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [GitHub cross-OS cache option](https://github.com/actions/cache)
- [Node-API ABI guarantees](https://nodejs.org/api/n-api.html#implications-of-abi-stability)
