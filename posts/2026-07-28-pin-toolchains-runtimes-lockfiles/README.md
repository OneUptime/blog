# How to Pin Compilers, Runtimes, and Lockfiles for Deterministic Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Reproducible Builds, Toolchain, Dependency Management, CI/CD, Supply Chain Security

Description: Pin every resolution layer from runner actions and toolchains to package locks and base images while updating those pins through a deliberate tested process.

---

A dependency lockfile does not make a build deterministic by itself. The program that interprets the lockfile, the compiler, standard library, system packages, base images, build flags, environment, and external downloads can all change output.

Pin in layers, and distinguish a controlled build lane from a compatibility lane that intentionally tracks supported ranges.

## Inventory the Resolution Chain

For a typical build:

```text
CI workflow action
  -> runner or build image
  -> runtime/compiler toolchain
  -> package manager
  -> lockfile-resolved dependencies
  -> generators and build tools
  -> source and configuration
  -> artifact
```

Every arrow can resolve a mutable name. Record which file or policy pins it and who updates it.

| Layer | Pinning mechanism |
| --- | --- |
| GitHub Action | full commit SHA |
| Build image | image digest |
| Runtime | exact version file/setup input |
| Compiler | versioned toolchain, image, wrapper, or SDK |
| Package manager | project declaration or wrapper |
| Libraries | committed lockfile with integrity metadata |
| OS packages | snapshot/repository policy plus locked package set |
| Generator | locked package or checksum-verified binary |

Exact versioning is strongest only when the referenced artifact is immutable and its integrity is checked.

## Pin CI Workflow Code

A workflow action is executable build input. A moving branch or tag can change without a repository commit.

GitHub supports referencing an action by tag, branch, or full commit SHA. The full SHA is immutable and must not be abbreviated:

```yaml
- uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6.1.0
```

Keep a comment with the human-readable release version, and use an update tool or reviewed pull request to refresh the SHA. For first-party examples, GitHub documentation may show major tags for readability; choose SHA pins for a controlled supply-chain policy.

Pin reusable workflows from other repositories for the same reason. A same-repository relative reusable workflow uses the caller's commit, which naturally versions them together.

## Pin the Runtime and Package Manager

Use one version declaration locally and in CI when possible:

```yaml
- uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
  with:
    node-version: '22.14.0'
```

An exact version produces a controlled lane. A matrix entry such as `22.x` intentionally tests evolving Node 22 compatibility and can change without a source commit. Use both if needed:

- exact version for artifact production;
- supported ranges or upcoming versions for compatibility reporting.

Do not forget the package manager. Two npm, pip, Gradle, Cargo, or Go tool releases may differ in resolution, lock format, lifecycle behavior, or packaging. Prefer a project-local wrapper or version declaration rather than whatever the runner image provides.

## Treat a Compiler as a Toolchain

For native code, `cc --version` is not a complete identity. Output can depend on:

- compiler executable and built-in specs;
- linker and binary utilities;
- standard library and headers;
- target/sysroot and SDK;
- architecture and CPU flags;
- code generator and assembler;
- environment and command-line flags.

Use a versioned toolchain definition, compiler wrapper, SDK image, or hermetic build-system toolchain. Store outputs by platform and toolchain identity. Do not restore native objects across incompatible toolchains.

Bazel's hermeticity model treats tools as declared inputs and isolates actions from host-installed software. Even without Bazel, the design principle is useful: never discover a random compiler from `PATH` when release identity matters.

## Commit and Enforce Lockfiles

For npm, `package-lock.json` describes the resolved dependency tree and is intended to be committed. Use:

```bash
npm ci
```

`npm ci` requires a lockfile, fails when it disagrees with `package.json`, removes an existing `node_modules`, and does not rewrite the manifests. If lock creation used flags that change tree shape, commit the corresponding project-level npm configuration so CI supplies the same behavior.

Apply the ecosystem's frozen/locked install mode. Review:

- version and integrity changes;
- registry or source changes;
- new install scripts or plugins;
- platform-specific resolutions;
- duplicate or replaced transitive dependencies.

A cache must not bypass lock enforcement. Restore package bytes, then let the locked installer validate and reconstruct the tree.

## Pin Container Inputs by Digest

A Docker tag is mutable. A digest selects exact image content:

```dockerfile
FROM node:22.14.0@sha256:e5ddf893cc6aeab0e5126e4edae35aa43893e2836d1d246140167ccc2616f5d7
```

The tag remains useful context; the digest enforces identity. Pin every external image in `FROM` and `COPY --from`, not only the final runtime base.

Digest pins intentionally stop automatic base-image updates. Pair them with an update process that proposes a new digest, displays vulnerability and provenance changes, rebuilds, tests, and records approval.

Similarly, remote archives should have a verified checksum. Prefer package managers or build systems that represent source identity explicitly over an unverified `curl | sh`.

## Make Inputs Deterministic

Even fully pinned tools can produce different output if builds read:

- current time or timezone;
- hostname, username, home directory, or absolute paths;
- random values;
- file traversal order;
- network services;
- locale;
- mutable environment variables;
- undeclared source-tree files.

Set and document relevant locale/timezone. Use stable ordering. Remove timestamps where the artifact format permits it or use a known source timestamp such as `SOURCE_DATE_EPOCH`. GCC documents using it in place of `__DATE__` and `__TIME__` for reproducible output.

Do not hide a value from a build cache if it changes output. Either include it in identity or redesign the output so it does not depend on that value.

## Control Network Access

A deterministic release should not resolve arbitrary new input during compilation. Split:

1. fetch declared dependencies with integrity verification;
2. build from the fetched, locked set;
3. publish the produced artifact.

Where practical, block network access during the build phase. Mirror critical dependencies under an explicit retention and integrity policy. A lock that points to content no longer available is reproducible in theory but not rebuildable in an incident.

## Record Provenance and Verify Outputs

Capture:

- source commit;
- toolchain and build image digests;
- lockfile digests;
- command and target platform;
- artifact checksum or image digest;
- producing workflow/run;
- provenance attestation.

Two builds with these inputs can be compared. Bit-for-bit reproducibility may still require work on archive timestamps, signatures, filesystem metadata, and nondeterministic compiler behavior. Functional equivalence and bitwise identity are different claims.

Sign after deterministic packaging when signatures contain time or randomness, and verify the unsigned payload separately where appropriate.

## Update Pins Without Freezing Forever

Pinning transfers surprise into an explicit update queue. Automate pull requests for:

- runtimes and compilers;
- workflow actions;
- base image digests;
- package locks;
- build tools and wrappers.

Require the same tests used for ordinary changes, plus compatibility and artifact-diff review for high-risk updates. Keep updates small enough to bisect. Define emergency procedures for a compromised pin.

Periodically rebuild from a clean environment with caches disabled. That proves the repository and artifact stores still contain everything needed.

## A Practical Controlled Lane

A release lane should:

1. check out an exact commit;
2. use SHA-pinned workflow code;
3. select an exact build image/toolchain;
4. run a frozen dependency install;
5. disable undeclared network resolution;
6. build with declared environment inputs;
7. produce one immutable artifact;
8. record digest and provenance;
9. promote that artifact without rebuilding.

Add moving compatibility lanes around it rather than making the release toolchain float. Determinism is not avoiding upgrades; it is making every upgrade a visible source-controlled event.

## Official Documentation

- [Managing custom GitHub Actions and version references](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/manage-custom-actions)
- [Building and testing Node.js in GitHub Actions](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
- [npm package-lock.json](https://docs.npmjs.com/cli/configuring-npm/package-lock-json)
- [npm ci](https://docs.npmjs.com/cli/commands/npm-ci)
- [Docker image pull by digest](https://docs.docker.com/reference/cli/docker/image/pull/)
- [Docker build policy examples for digest pinning](https://docs.docker.com/build/policies/examples/)
- [Bazel hermeticity](https://bazel.build/concepts/hermeticity)
- [GCC environment variables and `SOURCE_DATE_EPOCH`](https://gcc.gnu.org/onlinedocs/gcc/Environment-Variables.html)
