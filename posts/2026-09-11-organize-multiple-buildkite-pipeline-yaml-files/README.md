# How to Organize Multiple Buildkite Pipeline YAML Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, YAML, Monorepo, DevOps

Description: Separate Buildkite entry points and reusable pipeline fragments while keeping uploads, step keys, dependencies, and configuration ownership explicit.

---

One repository can support pull request checks, releases, nightly tests, and service-specific workflows. Those workflows do not need to share one enormous Buildkite YAML file, but Buildkite still needs an explicit entry point that decides what to upload.

Organize files around ownership and purpose. Give each Buildkite pipeline a small bootstrap configuration, make the chosen repository path visible, and use explicit dependencies whenever fragments participate in the same build.

## Choose independent entry points

A practical layout is:

```text
.buildkite/
  pipelines/
    pull-request.yml
    nightly.yml
    release.yml
  fragments/
    api-tests.yml
    web-tests.yml
  scripts/
    upload-tests.sh
    test-api.sh
    test-web.sh
    release.sh
```

Configure the pull request pipeline's initial step with:

```yaml
steps:
  - label: "Load pull request workflow"
    command: "buildkite-agent pipeline upload .buildkite/pipelines/pull-request.yml"
```

The nightly and release pipelines use their corresponding paths. These are separate Buildkite pipelines connected to the same repository, not three documents that are automatically loaded because they exist.

Use explicit file paths when several workflows exist. Relying on the uploader's default filename search hides which workflow a pipeline intended to run and makes later directory changes harder to review.

## Keep each fragment a valid pipeline document

An API fragment can contain:

```yaml
steps:
  - label: "API tests"
    key: api-tests
    command: "bash .buildkite/scripts/test-api.sh"
    agents:
      queue: "linux-tests"
```

The web fragment can use the same shape with a different key:

```yaml
steps:
  - label: "Web tests"
    key: web-tests
    command: "bash .buildkite/scripts/test-web.sh"
    agents:
      queue: "linux-tests"
```

Keep shared fragments focused on complete jobs. A partial YAML fragment containing only a few nested lines is difficult to parse independently and easy to insert at the wrong indentation level.

Use a consistent key namespace as the repository grows, such as `api-tests`, `web-tests`, and `release-package`. Keys must be unique across all uploaded steps in the same build, not merely unique within each file.

## Upload several files on a supported agent

The [pipeline upload CLI](https://buildkite.com/docs/agent/cli/reference/pipeline) supports multiple filename arguments from agent v3.104.0 onward, including current v4 agents:

```bash
buildkite-agent pipeline upload \
  .buildkite/fragments/api-tests.yml \
  .buildkite/fragments/web-tests.yml
```

Use an explicit list when order and membership matter. A shell glob can unexpectedly include an experimental file, and an unmatched glob behaves differently across shells.

For older agents, separate upload commands are supported:

```bash
buildkite-agent pipeline upload .buildkite/fragments/api-tests.yml
buildkite-agent pipeline upload .buildkite/fragments/web-tests.yml
```

Multiple sequential uploads from one job are inserted immediately after that job, so the visual order can appear reversed. The displayed order also does not create an execution dependency between command steps. Define dependencies based on the work's actual requirements.

## Join fragments without relying on position

Suppose packaging requires both test fragments. Add a packaging step with explicit dependencies:

```yaml
steps:
  - label: "Package tested application"
    key: package-tested-app
    depends_on:
      - api-tests
      - web-tests
    command: "bash .buildkite/scripts/package.sh"
```

Ensure the two test keys are actually included in every workflow that uploads this packaging fragment. A dependency on a missing key can fail the build. A step skipped by a condition has different semantics from a key that was never created.

For complex assembly, generate one JSON or YAML document that includes all selected steps and validates its keys before upload. That approach makes the final dependency graph visible in one preview, even when the source configuration is split across many files.

## Keep shared configuration scope obvious

YAML anchors are local to a YAML document. An anchor defined in `api-tests.yml` is not a general import that another independently parsed file can reference. Use a generator or duplicate a small setting when cross-file reuse would otherwise depend on parser behavior.

Step-level environment and agent settings are easier to compose than competing top-level defaults from several fragments. If fragments need different queues or values, put those values on their own steps. Let one owner control any build-wide configuration.

Also distinguish pipeline files from shell scripts. A script referenced by `command` is looked up in the repository checkout of the execution job. Uploading a fragment does not package local generated scripts and transfer them to another agent.

## Verify each workflow independently

Preview every entry point with the same agent version and upload options used in CI:

```bash
BUILDKITE_AGENT_ACCESS_TOKEN=local-dry-run-placeholder \
  buildkite-agent pipeline upload --dry-run \
  .buildkite/fragments/api-tests.yml \
  .buildkite/fragments/web-tests.yml
```

The dummy token is only for agent v4.0.3's local dry-run requirement. Do not use it for an actual upload. Inspect the resulting keys and paths, then run a small build of each independent pipeline.

Check release-only permissions and branch controls separately. Sharing a repository does not mean a pull request workflow should acquire the release pipeline's agents or credentials.

## Conclusion

Use explicit entry points, independently valid fragments, and dependencies based on stable keys. A directory layout becomes useful when the upload logic makes its ownership and execution graph equally clear.

## Official Documentation

- [Uploading multiple pipelines](https://buildkite.com/docs/agent/cli/reference/pipeline)
- [Dynamic pipeline structure](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines)
- [Step dependencies](https://buildkite.com/docs/pipelines/configure/depends-on)
