# Why Does My Build Pass Locally but Fail in CI? A Systematic Environment-Diff Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, Build Automation, Troubleshooting, GitHub Action, Reproducible Builds

Description: Find the hidden input that makes a build pass locally and fail in CI by comparing source, tools, dependencies, environment, and execution conditions.

---

A local pass and a CI failure are not contradictory results. They are evidence that the two builds did not have the same effective inputs. Source code is only one input; the toolchain, dependency graph, working tree, environment variables, filesystem, services, permissions, resources, and cache state all participate.

Treat the problem as an environment diff, not as a reason to rerun the job until it turns green.

## First Prove You Built the Same Source

Record the exact commit in both places:

```bash
git rev-parse HEAD
git status --short
git submodule status --recursive
```

A developer machine may contain untracked generated files, ignored configuration, an initialized submodule, or edits that were never committed. CI normally starts from a clean checkout. Conversely, a pull-request workflow may test a synthetic merge commit rather than the contributor's head commit. Log the event name, `GITHUB_SHA`, `GITHUB_REF`, and the checked-out `HEAD` before comparing results.

Also check:

- whether Git LFS objects and submodules were fetched;
- whether sparse checkout omitted required files;
- whether generated source is committed locally but regenerated in CI;
- whether the repository relies on filename case that works on a case-insensitive filesystem;
- whether the local test includes the target branch changes that the CI merge ref includes.

Reproduce from a fresh clone in a temporary directory. If the failure appears there, the problem is already smaller: it is local workspace state, not the CI service.

## Capture a Comparable Environment Fingerprint

Add a temporary diagnostic step that prints non-secret facts:

```bash
uname -a
printf 'shell=%s\n' "$SHELL"
git rev-parse HEAD
node --version || true
npm --version || true
python --version || true
cc --version | head -n 1 || true
locale || true
umask
df -h .
```

Do not dump the complete environment with `env` or `printenv`; it can expose secrets and tokens. Instead, print an allowlisted set of variable names with sensitive values redacted. Compare:

- operating system, architecture, image label, and installed packages;
- compiler, runtime, package manager, build tool, and test-runner versions;
- locale, timezone, encoding, shell, `PATH`, `HOME`, and working directory;
- feature flags and non-secret configuration;
- CPU count, memory limit, disk capacity, and file-descriptor limits.

GitHub-hosted runner labels such as `ubuntu-latest` select an image whose contents evolve. If exact tools matter, set them up explicitly or use a pinned build image rather than relying on whatever happens to be preinstalled.

## Reinstall Dependencies from the Declared Lock

A long-lived workstation often has a dependency tree that no clean install can reproduce. Remove it and use the package manager's frozen-install mode. For npm, that means:

```bash
rm -rf node_modules
npm ci
npm test
```

`npm ci` requires a lockfile, fails when `package.json` and the lock disagree, removes an existing `node_modules`, and does not rewrite the lock. Apply the equivalent discipline for the ecosystem in use.

Check these common differences:

- a lockfile was not committed or CI uses the wrong workspace lockfile;
- local and CI package-manager versions interpret the lock differently;
- a private registry or certificate is configured only on one machine;
- optional or platform-specific dependencies differ by OS or architecture;
- CI sets a production-only install flag that omits development dependencies;
- post-install scripts depend on undeclared system tools.

Do not conclude that a restored cache proves dependencies are correct. Bypass the cache once. If a clean install works while a cache hit fails, inspect the cache key and cached path.

## Compare the Command, Shell, and Working Directory

Copy the exact CI command and run it from the same repository directory. `npm test`, `npm run test`, and a direct test-runner invocation need not have identical defaults. A CI wrapper may add flags for coverage, sharding, strict warnings, or a production build.

Shell behavior matters too. Quoting, glob expansion, pipelines, path separators, and error propagation differ among Bash, PowerShell, and `cmd.exe`. GitHub Actions also runs each `run` step in a new process, so a `cd`, shell variable, or alias from one step does not automatically become process state in the next.

Move the real command into a versioned script such as `./scripts/ci-check` and call that script from both places. Keep CI YAML responsible for orchestration, credentials, and artifact transport rather than duplicating build logic.

## Look for Missing and Accidental Inputs

A robust build should declare every file and value that affects its output. Typical hidden inputs include:

- `.env` files, credentials, licenses, certificates, and local config;
- files generated by an IDE or by an earlier manual command;
- absolute paths and software found opportunistically on `PATH`;
- the current date, timezone, random seed, hostname, username, or network response;
- mutable container tags or package versions;
- state in a local database, daemon, browser profile, or Docker volume.

For each missing value, decide whether it is a legitimate build input. If it is, provision and validate it explicitly. If it is not, remove the dependency. Never "fix" a forked pull request by making production secrets available to untrusted code.

## Test Execution-Condition Differences

Some failures appear only under CI pressure:

- parallel tests share ports, filenames, database rows, or global state;
- a watcher or background process is still starting when tests begin;
- a slower runner exposes a hard-coded sleep;
- memory pressure kills a compiler or browser;
- network egress, DNS, or a proxy differs;
- a non-interactive session cannot prompt;
- a read-only directory or a stricter user exposes a permission assumption.

Run locally with CI-like settings:

```bash
CI=true TZ=UTC LANG=C.UTF-8 ./scripts/ci-check
```

Then vary one dimension at a time: use a clean container, reduce CPU and memory, enable the same parallelism, or run on the same operating system. Preserve logs, test reports, and crash dumps as artifacts so evidence survives the ephemeral runner.

## Use a Binary-Search Diagnostic Order

An efficient investigation normally follows this sequence:

1. Confirm commit, checkout mode, and repository cleanliness.
2. Reproduce with caches disabled and dependencies freshly installed.
3. Match runtime, compiler, package manager, shell, and OS.
4. Run the exact entrypoint from the exact working directory.
5. Compare allowlisted configuration and service dependencies.
6. Match parallelism and resource limits.
7. Minimize the failing job or test until one changed input remains.

Once found, encode the input in source control, a lockfile, a pinned tool setup, or an explicit CI parameter. Add a startup assertion that reports the expected and actual values. The durable fix is not "make CI look more like my laptop"; it is to make both executions consume a declared build contract.

## Official Documentation

- [GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [Variables reference for GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)
- [Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Building and testing Node.js in GitHub Actions](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
- [npm ci](https://docs.npmjs.com/cli/commands/npm-ci)
- [Bazel hermeticity](https://bazel.build/concepts/hermeticity)
