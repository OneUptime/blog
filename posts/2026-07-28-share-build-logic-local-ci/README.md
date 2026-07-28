# How to Share Build Logic Between Developer Machines and CI Without Duplicating YAML

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, Build Automation, GitHub Action, Developer Experience, Reusable Workflows

Description: Put build behavior behind versioned repository commands and keep CI YAML focused on events, permissions, runners, dependencies, and artifact transport.

---

The best shared CI logic is usually not more YAML. It is an executable repository interface that both a developer and a runner can call.

Use YAML for control-plane concerns:

- events and path filters;
- permissions and secrets;
- runner and container selection;
- job dependencies and matrices;
- cache and artifact transport;
- environment approvals and concurrency.

Use scripts, build targets, or a build system for turning source into validated outputs.

## Define a Small Command Interface

Create stable entrypoints:

```text
./scripts/build bootstrap
./scripts/build lint
./scripts/build unit
./scripts/build package
./scripts/build integration
```

or Make targets:

```make
.PHONY: bootstrap lint unit package integration ci

bootstrap:
	npm ci

lint:
	npm run lint

unit:
	npm test

package:
	npm run build

integration:
	npm run test:integration

ci: lint unit package
```

The mechanism is less important than the contract. Each command should:

- be committed with the code it builds;
- run non-interactively;
- accept explicit inputs and flags;
- return a meaningful exit status;
- write outputs and reports to documented paths;
- avoid relying on shell aliases or global workstation state;
- work without a CI provider token for ordinary validation.

Avoid one giant `ci` command when useful work should run in parallel. Expose both small tasks and a convenience aggregate.

## Make CI Call the Interface

A GitHub workflow becomes orchestration:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: ./.github/actions/setup-build
      - run: ./scripts/build lint

  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: ./.github/actions/setup-build
      - run: ./scripts/build unit

  package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: ./.github/actions/setup-build
      - run: ./scripts/build package
      - uses: actions/upload-artifact@v6
        with:
          name: app-${{ github.sha }}
          path: dist/
```

Developers run the same commands after the documented setup. A CI failure can be reproduced without translating inline YAML into a local shell session.

Keep setup logic layered. Runtime installation may be provider-specific, while dependency installation should still use the repository's frozen command.

## Pass Inputs Explicitly

Do not make build behavior depend on an accidental forest of CI variables:

```bash
if [ -n "${GITHUB_ACTIONS:-}" ]; then
  # completely different build
fi
```

Instead:

```bash
./scripts/build package --mode release --target linux-amd64
```

It is reasonable for `CI=true` to select non-interactive output, disable watch mode, or write a machine reporter. It should not silently change which source is compiled or which tests are required.

Validate required values:

```bash
case "${BUILD_MODE:-}" in
  debug|release) ;;
  *) echo "BUILD_MODE must be debug or release" >&2; exit 2 ;;
esac
```

Document the input, default, allowed values, whether it affects output identity, and whether it is sensitive.

## Separate Secrets from Build Behavior

Local and pull-request builds should be mostly secretless. Keep privileged operations as separate commands:

```text
./scripts/build package
./scripts/release publish --artifact dist/app.tar.gz
```

CI supplies a short-lived credential only to the publish job after checks and environment protection. Developers can test argument validation with a mock or sandbox; they do not need the production secret.

Never put secret values in command-line arguments where process listings or logs may expose them. Use the tool's supported credential channel, environment, or file descriptor, and redact diagnostic output.

## Choose the Right Reuse Mechanism

GitHub provides several forms of reuse:

### Repository scripts or build targets

Best for logic that must run locally and in any CI provider.

### Composite actions

Bundle multiple workflow steps into one action step. Useful for repeated GitHub runner setup, problem matchers, and workflow commands. A composite action is still a GitHub Actions abstraction; it does not replace a local build command.

### Reusable workflows

Share complete jobs and runner orchestration through `workflow_call`. They can define typed inputs, secrets, matrices, permissions, and outputs. Use them when several repositories need the same GitHub-specific pipeline policy.

### YAML anchors and templates

Reduce text duplication inside configuration, but do not create a separately testable build interface. Use them for small declarative fragments, not a large hidden program.

The usual layering is:

```text
reusable workflow -> composite setup action -> repository build command
```

Each layer has a distinct responsibility.

## Be Deliberate About Reusable Workflow Boundaries

A reusable workflow is called at job level, not as a step. The caller can pass declared inputs and secrets. Same-repository calls use the workflow from the same commit; cross-repository calls should use an immutable reviewed SHA for stability and security.

Avoid `secrets: inherit` as a default. Pass only what the called workflow needs. Remember that permissions can only be maintained or reduced through nested workflow chains, not elevated beyond the caller's access.

Version shared workflows. A branch or moving tag can change every consumer at once. Test changes with a canary repository or branch before updating the pinned reference.

## Standardize the Environment Separately

Shared commands do not guarantee shared tools. Declare:

- runtime and compiler versions;
- package manager;
- dependency lockfiles;
- system packages or build image;
- shell and supported operating systems.

Developers can use a version manager or development container; CI can use setup actions or the same container. Both should consume the same version declarations where possible.

A setup composite action may call `actions/setup-node`, while a local bootstrap script checks `.node-version`. Add a test that these declarations agree.

## Keep Outputs Predictable

A CI system needs to know what to upload. A developer needs to know what to inspect. Set stable paths:

```text
dist/
reports/unit/
reports/coverage/
```

Clean or overwrite task-owned output before writing it. Do not scatter files based on whether the command detects CI. Return small metadata, such as an image digest, through a documented file or stdout format that a workflow wrapper can map to a job output.

The command should not upload CI artifacts itself unless artifact storage is genuinely part of the product build. Let the provider wrapper transport files.

## Test the Interface

Add tests for the build wrapper:

- unknown commands fail with usage;
- missing inputs fail before expensive work;
- exit status propagates from the underlying tool;
- paths containing spaces are handled;
- release and debug modes select expected flags;
- a clean clone can run bootstrap then build;
- a second unchanged build does no unnecessary work;
- no command writes outside declared output directories.

Run scripts through a shell linter where appropriate. Keep most implementation in a language with normal unit tests once shell logic becomes complex.

## Migrate Incrementally

For each YAML job:

1. copy the exact commands into a repository target;
2. run it locally in a clean environment;
3. replace the YAML block with one invocation;
4. preserve provider setup and artifact steps;
5. compare output and timing;
6. remove the duplicate implementation.

Then factor repeated GitHub-specific setup into a composite action and repeated cross-repository orchestration into a reusable workflow.

This division makes the build portable without pretending every CI feature is portable. Developers own commands they can execute; the CI platform owns the secure distributed workflow around them.

## Official Documentation

- [GitHub Actions reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)
- [GitHub Actions reusable workflow reference](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)
- [Creating a composite action](https://docs.github.com/en/actions/tutorials/create-actions/create-a-composite-action)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GNU Make phony targets](https://www.gnu.org/software/make/manual/html_node/Phony-Targets.html)
- [npm scripts](https://docs.npmjs.com/cli/using-npm/scripts/)
