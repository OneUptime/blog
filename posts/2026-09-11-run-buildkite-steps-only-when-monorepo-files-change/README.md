# How to Run Buildkite Steps Only When Monorepo Files Change

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Monorepo, YAML, Testing

Description: Use Buildkite if_changed with explicit comparison bases, shared dependency patterns, and deterministic changed-file tests for monorepos.

---

A monorepo pipeline wastes capacity when every change runs every service's tests. Buildkite's `if_changed` attribute can select work during pipeline upload, using the files changed against a Git comparison base.

The difficult part is usually the change policy, not the YAML. An API test may depend on shared libraries, lockfiles, generated code, and build scripts outside the API directory. Select those inputs explicitly, and verify how your pipeline computes the comparison base before relying on skipped jobs.

## Check the upload agent version

According to the [if_changed guide](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines/if-changed), the feature requires agent v3.99 with `--apply-if-changed`, and is enabled by default from v3.103.0. Pattern lists and `include`/`exclude` mappings require v3.109.0. Current v4 agents support these forms.

The agent performs this work while uploading a pipeline. Put `if_changed` in the repository YAML that the agent uploads, rather than in the initial steps configured directly through the Buildkite interface.

A minimal initial step is:

```yaml
steps:
  - label: "Upload repository pipeline"
    command: "buildkite-agent pipeline upload .buildkite/pipeline.yml"
```

Check `buildkite-agent --version` on the agent running that upload. A newer test agent does not add capabilities to an older bootstrap agent.

## Describe the inputs of each service

Create `.buildkite/pipeline.yml`:

```yaml
steps:
  - label: "API tests"
    key: api-tests
    command: "bash .buildkite/scripts/test-api.sh"
    if_changed:
      - "services/api/**"
      - "packages/shared/**"
      - "package.json"
      - "package-lock.json"
      - ".buildkite/**"

  - label: "Web tests"
    key: web-tests
    command: "bash .buildkite/scripts/test-web.sh"
    if_changed:
      - "services/web/**"
      - "packages/shared/**"
      - "package.json"
      - "package-lock.json"
      - ".buildkite/**"

  - label: "Documentation checks"
    key: docs-checks
    command: "bash .buildkite/scripts/test-docs.sh"
    if_changed:
      - "docs/**"
      - "README.md"
      - ".buildkite/scripts/test-docs.sh"
```

The three scripts are repository-owned test entry points; implement them with your actual package manager and test commands. The example deliberately includes shared inputs in both application steps. A change to the shared package should test both consumers.

Patterns use Buildkite's documented glob syntax, not regular expressions or a shell's expansion rules. Paths are relative to the repository root. Quote patterns that contain YAML-significant characters, and avoid spaces inside brace alternatives unless the filename really contains a space.

## Make the comparison base intentional

By default, the agent looks for a valid base in this order: an explicit setting, the pull request's base branch, the pipeline's default branch, then `origin/main`. This is useful for pull requests, but not automatically the right policy for every main-branch or scheduled build.

Set a base on the upload job when your workflow requires it:

```yaml
steps:
  - label: "Upload repository pipeline"
    command: >-
      buildkite-agent pipeline upload
      --git-diff-base origin/main
      --fetch-diff-base
      .buildkite/pipeline.yml
```

`--fetch-diff-base` requires agent v3.117.0 or later. Fetching reduces the chance that a stale local branch ref causes extra work after merging the default branch into a feature branch. It still requires network access and enough Git history to resolve the relationship.

For a push to `main`, comparing the checked-out commit with an up-to-date `origin/main` may produce no changes. Decide whether that workflow should compare against an earlier main commit, the last successfully tested commit, or run the full suite. Do not reuse a pull request baseline blindly.

## Test selection with a supplied file list

Agent v3.115.0 and newer accept a newline-separated changed-file list. This is particularly useful for deterministic selection tests:

```bash
printf '%s\n' 'services/api/handler.ts' > /tmp/changed-files.txt
BUILDKITE_AGENT_ACCESS_TOKEN=local-dry-run-placeholder \
  buildkite-agent pipeline upload --dry-run \
  --changed-files-path /tmp/changed-files.txt \
  .buildkite/pipeline.yml
```

The placeholder is only for agent v4.0.3's local dry-run argument requirement; actual uploads use the running job's credentials. Inspect which steps carry a skipped result. Repeat with `packages/shared/types.ts`, `README.md`, and `package-lock.json`. The expected outcomes should match the team's dependency model.

A custom affected-project tool may output project names, not file paths. Do not feed those names directly into `--changed-files-path` unless the pipeline patterns were designed to match that representation. The documented input format is a list of paths relative to the repository root.

## Handle skipped dependencies carefully

A skipped test step is not evidence that tests passed. Buildkite treats skipped dependencies as satisfied, so a deployment depending on `api-tests` can become eligible even when that test was skipped.

Apply the relevant change condition to the deployment or its trigger as well, and retain your branch and release controls. For a deployment that must always consume tested artifacts, verify artifact provenance rather than trusting a dependency edge alone.

When the agent cannot determine changed files, the current guide describes a fallback that runs the steps normally. Investigate the upload logs before concluding that patterns were ignored. Missing base refs and shallow history are common causes.

## Verify real repository cases

Run small pull requests covering a service-only edit, a shared dependency edit, a documentation edit, and a rename between service directories. Compare the displayed selection with the changed-file list and expected consumers. Include build-script changes in this exercise; those changes often invalidate more work than application source edits.

Periodically run an unfiltered suite on a trusted branch. It helps reveal dependencies that the current path policy omitted, especially as a monorepo grows.

## Conclusion

Use `if_changed` to encode each job's actual inputs, then test both the glob selection and the Git baseline. Correctly skipped work reduces queues; incorrectly skipped dependencies hide regressions.

## Official Documentation

- [Using if_changed](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines/if-changed)
- [Pipeline upload options](https://buildkite.com/docs/agent/cli/reference/pipeline)
- [Step dependencies and skipped steps](https://buildkite.com/docs/pipelines/configure/depends-on)
