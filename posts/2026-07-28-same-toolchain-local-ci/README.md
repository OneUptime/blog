# How to Make Local and CI Builds Use the Same Toolchain, Commands, and Inputs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, Build Automation, Toolchain, Reproducible Builds, Developer Experience

Description: Define one versioned build contract so developer machines and CI select the same tools, invoke the same entrypoints, and declare the same inputs.

---

Local and CI parity does not require identical machines. It requires the same build contract: the same source identity, tool versions, dependency resolution, commands, configuration inputs, and output expectations.

The most maintainable design has three layers:

1. version declarations select tools and dependencies;
2. repository-owned entrypoints implement build behavior;
3. CI YAML supplies event context, credentials, runners, and artifact transport.

When YAML contains a second implementation of the build, drift is inevitable.

## Write Down the Contract

Start with a small table in the repository:

| Dimension | Declared by | Example |
| --- | --- | --- |
| Runtime | version file or tool manager config | exact Node or Python version |
| Package manager | project metadata or wrapper | npm version, Gradle Wrapper |
| Dependencies | committed lockfile | `package-lock.json` |
| System tools | build image or hermetic toolchain | compiler and linker |
| Command | repository script | `./scripts/ci` |
| Inputs | documented files and variables | source, lockfile, `BUILD_MODE` |
| Outputs | fixed paths | `dist/`, test reports |

Exactness should match risk. A release build may pin every tool and base image by immutable identifier. A compatibility job may intentionally test a moving supported range. Label those two purposes differently.

## Pin Tools Before Running the Build

Do not accept an unexamined default runtime from a workstation or runner image. For GitHub Actions, a setup action can install a requested runtime before commands run:

```yaml
steps:
  - uses: actions/checkout@v6
  - uses: actions/setup-node@v7
    with:
      node-version-file: '.nvmrc'
      cache: npm
      cache-dependency-path: package-lock.json
  - run: npm ci
  - run: ./scripts/ci
```

Developers should read the same version declaration through a version manager, development container, Nix-like environment, or repository bootstrap command. If the setup action and local manager cannot consume the same file, add a check that compares their declarations.

Pin the package manager as well. A runtime version alone does not guarantee that two package-manager releases interpret a lockfile identically. Prefer project-local wrappers where the ecosystem supplies them. For C and C++, the compiler, linker, standard library, sysroot, and flags form a toolchain; pinning only `gcc` is incomplete.

A container can package system dependencies, but a mutable image tag merely moves the drift elsewhere. Pin the image digest for controlled builds and update it deliberately.

## Make One Repository Entry Point

Expose stable commands that work without CI-provider variables:

```makefile
.PHONY: bootstrap lint test build ci

bootstrap:
	npm ci

lint:
	npm run lint

test:
	npm test

build:
	npm run build

ci: lint test build
```

The Makefile is only an example. A shell script, task runner, Gradle task, Bazel target, or package-manager script is equally valid. The important properties are:

- it is versioned with the source;
- it has a non-interactive mode;
- it fails on an error;
- it accepts explicit parameters;
- it writes outputs to documented paths;
- it does not require a developer's global aliases or secrets.

Both a developer and CI can now run:

```bash
npm ci
make ci
```

Use the CI provider to fan out jobs when useful, but have each job invoke the same target developers can invoke. For example, separate `make lint`, `make test`, and `make build` jobs can run concurrently without reimplementing those commands in YAML.

## Freeze Dependency Resolution, Not Dependency Downloads

Commit the ecosystem's lockfiles and use frozen installation. For npm, `npm ci` fails if the manifest and lockfile disagree and does not update either file. That is different from a cache: a cache accelerates fetching but must not choose dependency versions.

A sound sequence is:

1. restore a package download cache;
2. run a frozen install against the committed lock;
3. verify or build;
4. save only safe, reconstructible cache data.

Avoid transferring an installed dependency directory across incompatible operating systems, architectures, runtimes, or native ABIs. Cache the package manager's download store where possible and let the package manager reconstruct the installation.

## Declare Every Behavior-Changing Input

Inputs include more than files. A task can also depend on:

- command-line arguments;
- environment variables;
- target architecture and operating system;
- generated code and schemas;
- compiler flags and feature toggles;
- external tool versions;
- locale, timezone, or `SOURCE_DATE_EPOCH`.

Create an allowlist and validate it at startup:

```bash
: "${BUILD_MODE:=development}"
case "$BUILD_MODE" in
  development|release) ;;
  *) echo "unsupported BUILD_MODE=$BUILD_MODE" >&2; exit 2 ;;
esac
```

Do not silently let `CI=true` select a completely different build. It is reasonable for CI to change presentation—disable colors, use a machine-readable reporter, avoid watch mode—but compilation and test semantics should be controlled by explicit flags that also work locally.

Secrets are runtime inputs, not source. Keep unit builds and most tests secretless. Put integrations that truly require credentials in separate trusted jobs, with least-privilege and environment protections.

## Normalize the Execution Boundary

Choose how much of the environment to standardize:

- A setup script is light and works well for one runtime.
- A development container captures operating-system packages too.
- A build-system toolchain can be more hermetic and cacheable.
- A full VM image may be necessary for kernel or hardware-specific work.

More isolation has a maintenance cost. Adopt only as much as the failure modes justify, but make the boundary explicit. A container still inherits architecture, kernel behavior, mounted files, credentials, and build arguments; it is not automatically reproducible.

Use clean workspaces in both contexts. Builds should not read previous outputs unless those outputs are declared prerequisites. Add a `clean` target for diagnosis, and ensure generated files go to an output tree rather than modifying source.

## Check Parity Continuously

Add cheap assertions before expensive work:

```bash
node --version
npm --version
git diff --exit-code
./scripts/check-toolchain
```

Periodically exercise these paths:

- fresh clone plus the documented bootstrap command;
- CI with caches disabled;
- developer command inside the supported clean environment;
- two consecutive builds with no source change;
- builds on every supported architecture or operating system;
- release build with network access removed after dependencies are fetched.

Compare artifact checksums only after removing intentional nondeterminism such as signatures, timestamps, and platform-specific metadata. Bit-for-bit identity is a stronger target than functional parity and may require dedicated reproducible-build work.

## Keep Provider-Specific Logic Thin

CI still owns legitimate concerns:

- event filters and permissions;
- job dependencies and runner selection;
- secret injection and environment approval;
- cache and artifact upload/download;
- status reporting and cancellation.

Everything that determines how source becomes a binary belongs as close to the repository build entrypoint as possible. With that split, moving between CI systems does not require rediscovering the build, and a developer can reproduce a job by copying one command rather than translating a page of YAML.

## Official Documentation

- [Building and testing Node.js in GitHub Actions](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
- [Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Reusing workflow configurations](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)
- [npm ci](https://docs.npmjs.com/cli/commands/npm-ci)
- [npm package-lock.json](https://docs.npmjs.com/cli/configuring-npm/package-lock-json)
- [Bazel hermeticity](https://bazel.build/concepts/hermeticity)
- [Docker build cache invalidation](https://docs.docker.com/build/cache/invalidation/)
