# How to Test CI Pipeline Changes Locally Without Commit-Push-Wait Loops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, GitHub Action, GitLab CI, Testing, Developer Experience

Description: Test CI changes in layers by validating configuration, running repository entrypoints locally, emulating jobs where useful, and reserving provider behavior for a safe remote canary.

---

No local tool perfectly reproduces a hosted CI control plane. Event delivery, expression evaluation, permissions, secret policy, runner images, caches, artifacts, concurrency, approvals, and service outages belong partly to the provider.

You can still remove most commit-push-wait loops by testing the pipeline in layers. Use local tests for deterministic build logic and provider validation for provider semantics.

## Move Build Logic Out of YAML

The highest-leverage change is a repository-owned command:

```bash
./scripts/ci lint
./scripts/ci unit
./scripts/ci build
./scripts/ci integration
```

CI YAML should select runners, connect dependencies, grant permissions, inject approved credentials, and move artifacts. The scripts should compile and test.

Now a developer can run the exact command from a clean checkout:

```bash
CI=true ./scripts/ci unit
```

Avoid making the script require provider-only variables. Pass required values as explicit arguments, and supply safe defaults for local diagnostics.

## Layer 1: Validate Files and References

Before executing anything, check:

- YAML syntax;
- duplicate or misspelled job identifiers;
- `needs` references to existing jobs;
- action/workflow file paths;
- required inputs and output names;
- shell syntax in extracted scripts;
- paths and files used by artifact steps;
- unknown local task names.

GitLab's CI Lint checks syntax and logic, resolves included configuration, and can simulate pipeline creation to find problems in `rules` and `needs`. It is a provider service, but it returns feedback without running the jobs.

For GitHub Actions, compare the file with the current workflow syntax and context references. Third-party linters can catch additional mistakes, but they are not the GitHub parser; pin and review them like any other development dependency.

Add repository contract tests for filenames and generated matrices. For example, a script can expand the list of packages and assert that every expected build target exists without starting a runner.

## Layer 2: Run Every Repository Entry Point

Execute the commands in the same:

- working directory;
- shell;
- runtime and compiler versions;
- dependency-manager mode;
- environment-variable allowlist;
- service topology.

Use a clean container or development environment if the job depends on system packages:

```bash
docker build -t project-ci -f ci/Dockerfile .
docker run --rm -e CI=true project-ci ./scripts/ci build
```

Pin the image used for controlled builds. A locally cached mutable tag can hide differences from CI.

Do not copy real CI secrets into a general local emulator. Use disposable test credentials scoped to a sandbox, or replace the external integration with a local service. Most pull-request checks should be designed to run without privileged secrets.

## Layer 3: Exercise the Job Shape

A local runner or emulator can be useful for:

- step ordering;
- shell commands;
- environment propagation;
- container/service startup;
- local actions;
- artifact paths;
- common event payloads.

For GitHub Actions, the third-party `act` project runs many workflows locally in containers. Its documentation describes event inputs, secrets, variables, and runner images. Treat the result as an approximation: its images and implementation are not the GitHub-hosted service, and unsupported features need a remote test.

Prefer a narrowly selected job:

```bash
act pull_request -j unit
```

Use a synthetic event JSON with non-sensitive values when conditions depend on pull-request fields. Test several shapes: push, pull request, tag, default branch, and fork-like low-trust input.

For GitLab, use CI Lint for pipeline creation semantics and run the actual scripts or job container locally. Do not rely on old guidance around `gitlab-runner exec`; current workflows should follow supported GitLab validation and runner documentation.

## Layer 4: Unit-Test Custom Actions and Generators

If a pipeline has complicated JavaScript, Python, or shell embedded in YAML, extract it into a normal module. Then test:

- input parsing;
- matrix generation;
- changed-file selection;
- output formatting;
- API error handling;
- permission-denied behavior;
- cancellation and retry decisions.

For a reusable GitHub workflow, define typed `workflow_call` inputs. Keep a small caller workflow that passes representative values. A same-repository reusable workflow reference uses the workflow from the same commit, which is useful for branch testing.

Do not log an entire GitHub context during testing; it can contain sensitive values such as a token and untrusted user-controlled strings. Log selected fields.

## Layer 5: Use a Safe Remote Canary

Some behavior must be tested on the provider:

- event and path filters;
- token permissions and fork restrictions;
- hosted runner contents;
- cache and artifact services;
- reusable workflow permissions;
- environment approvals;
- concurrency and cancellation;
- required-check naming;
- OIDC and deployment credentials.

For a workflow file that already supports `workflow_dispatch` on the default branch, use a manually dispatched canary path that cannot deploy:

```yaml
on:
  workflow_dispatch:
    inputs:
      dry_run:
        type: boolean
        default: true
```

A dry-run must be enforced structurally, not only by a shell `if`. Give the canary read-only permissions, no production environment, no production secrets, and no write-capable cloud role. Use a separate sandbox resource if an integration must be exercised.

For risky workflow changes, open a pull request and run against an internal branch before merging. Fork events have intentionally different permissions and secret access, so test that path separately without approving privileged execution of unreviewed code.

## Test Expressions with Event Fixtures

Conditions often fail because a context property exists for one event but not another. GitHub's `github.base_ref`, for example, is available for pull-request-related events, not ordinary pushes.

Maintain small fixture files for:

- internal pull request;
- fork pull request;
- push to feature branch;
- push to default branch;
- tag;
- manual dispatch.

Keep only fields the logic consumes. Feed them to local modules or the emulator, and assert the selected jobs; verify effective permissions remotely. Treat all values from issue titles, branch names, PR bodies, and event payloads as untrusted input; do not interpolate them directly into shell code.

## Verify Failure Paths

Do not test only a green run. Make controlled failures:

1. fail a prerequisite and confirm dependents do not start;
2. omit an artifact and require upload/download to fail clearly;
3. remove a required input;
4. simulate an empty affected-project set;
5. cancel a long job and check exact cleanup;
6. run with caches disabled;
7. deny a credential and verify no fallback deploy occurs.

Add job timeouts so a broken condition cannot consume the full platform limit.

## Shorten the Remaining Remote Loop

Use a small workflow dedicated to pipeline development, select one job, and supply explicit manual inputs. Cache dependencies safely, but keep a cache-bypass switch. Upload concise logs and reports. Once the behavior is stable, fold the tested reusable pieces into the production workflow.

The goal is not to eliminate remote CI testing. It is to make the remote run verify only the provider-specific boundary, after local tests have already proven the build commands and decision logic.

## Official Documentation

- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub Actions contexts](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts)
- [Reuse GitHub Actions workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)
- [GitLab CI/CD configuration validation](https://docs.gitlab.com/ci/yaml/lint/)
- [GitLab pipeline editor](https://docs.gitlab.com/ci/pipeline_editor/)
- [act usage guide](https://nektosact.com/usage/index.html)
- [Docker build cache invalidation](https://docs.docker.com/build/cache/invalidation/)
