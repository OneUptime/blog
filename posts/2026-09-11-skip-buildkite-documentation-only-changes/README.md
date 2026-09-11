# How to Skip Buildkite Work for Documentation-Only Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Git, YAML, Automation

Description: Use commit skip markers or Buildkite path filters for documentation changes while preserving required checks and full main-branch coverage.

---

A README typo should not necessarily run a full integration suite. However, skipping a build entirely and creating a build whose expensive steps are skipped have different effects on branch protection, reporting, and audit history.

Choose which behavior your repository needs. Commit markers are useful for an intentional one-off skip. Path-based step selection is more reliable for a repeatable policy, especially when required status checks expect the Buildkite pipeline to exist.

## Use commit markers for intentional skips

Buildkite's [skipping guide](https://buildkite.com/docs/pipelines/configure/skipping) documents markers such as `[skip ci]` and `[ci skip]` in a commit message:

```text
Correct installation example in README [skip ci]
```

Pull request creation events have a related rule: the skip marker must be in the pull request title when those events are enabled. A marker in one commit message is not a universal rule for every event a source-control provider can send.

Review squash-merge messages too. A skip marker copied from an earlier commit can remain in the final merge message and suppress a build you intended to run on the default branch.

Use this mechanism when deliberately creating no build is acceptable. Check how your source-control provider handles missing required checks before making it the default documentation policy.

## Prefer step filtering for repeatable policies

For a build that should still run documentation checks, use `if_changed` on the expensive application step:

```yaml
steps:
  - label: "Application tests"
    key: application-tests
    command: "bash .buildkite/scripts/test-application.sh"
    if_changed:
      include: "**"
      exclude:
        - "README.md"
        - "docs/**"

  - label: "Documentation checks"
    key: documentation-checks
    command: "bash .buildkite/scripts/test-documentation.sh"
    if_changed:
      - "README.md"
      - "docs/**"
      - ".buildkite/scripts/test-documentation.sh"
```

A change containing only `README.md` and files under `docs/` skips application tests. A mixed change containing source code still runs them. Changes to build configuration also run application tests because they are not excluded.

This mapping form requires agent v3.109.0 or later and is supported by v4. The [if_changed guide](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines/if-changed) explains that the agent evaluates it during pipeline upload, so put it in the repository file uploaded by the initial job.

## Keep exclusions narrow

Do not assume every Markdown file is documentation-only. A repository may compile Markdown into application routes, use it as test fixtures, or package it into a release artifact. A broad `**/*.md` exclusion can miss meaningful product changes.

Likewise, a `docs/` directory may contain executable examples or generated API contracts. If those are runtime dependencies, include the relevant checks instead of excluding the entire directory.

The right policy describes dependencies, not file extensions. Begin with narrow known-safe paths and expand only when the repository's build graph supports that decision.

## Preserve full coverage on the default branch

Pull request change detection commonly compares against the base branch. On a default-branch build, comparing the checked-out commit against the same up-to-date branch can produce an empty diff. A policy intended for pull requests should not silently suppress default-branch validation.

One clear approach is to run full tests on `main` and use filtering elsewhere:

```yaml
steps:
  - label: "Full application tests on main"
    key: application-tests-main
    if: build.branch == "main"
    command: "bash .buildkite/scripts/test-application.sh"

  - label: "Application tests for changed code"
    key: application-tests-changed
    if: build.branch != "main"
    command: "bash .buildkite/scripts/test-application.sh"
    if_changed:
      include: "**"
      exclude:
        - "README.md"
        - "docs/**"
```

These conditions are mutually exclusive. Use distinct keys, and ensure any later release step depends on the correct branch-specific workflow. The `if` and `if_changed` conditions on one step combine as requirements; adding `if: build.branch == "main"` to a filtered step does not mean "main OR changed files."

If nightly builds should run the full suite, give them a separate unfiltered entry point or explicitly include their source in your workflow design.

## Test the policy without guessing the diff

A supplied changed-file list makes selection reproducible on agent v3.115.0 and newer:

```bash
printf '%s\n' README.md docs/install.md > /tmp/docs-only.txt
BUILDKITE_AGENT_ACCESS_TOKEN=local-dry-run-placeholder \
  buildkite-agent pipeline upload --dry-run \
  --changed-files-path /tmp/docs-only.txt \
  .buildkite/pipeline.yml
```

Use the placeholder only for a local dry run; a real Buildkite upload uses its job credentials. Inspect the output, then add `src/server.ts` to the list and confirm application tests are selected.

For examples that also use `build.branch`, inspect the resulting conditions and verify their evaluation in actual test builds. A local agent preview does not exercise every server-side scheduling decision.

## Check branch protection and downstream behavior

Create a documentation-only pull request and observe the exact source-control checks it receives. Make sure it can satisfy the repository's required checks without forcing a full application test suite or leaving a pending check forever.

Also examine downstream dependencies. Buildkite treats a skipped dependency as satisfied, so a release step can become eligible even if a filtered test was skipped. Apply matching release conditions and artifact provenance checks where needed.

If change detection cannot compute a reliable base, the current agent guide describes running steps normally. That extra work is preferable to assuming a change was harmless, but the upload logs should explain the fallback so it can be corrected.

## Conclusion

Use skip markers for deliberate whole-build skips and path filters for a repeatable documentation policy. Keep exclusions narrow, test mixed changes, and preserve the checks required by your default branch and release workflow.

## Official Documentation

- [Skipping builds and commits](https://buildkite.com/docs/pipelines/configure/skipping)
- [Using if_changed](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines/if-changed)
- [Combining dynamic pipeline conditions](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines)
- [Skipped dependency behavior](https://buildkite.com/docs/pipelines/configure/depends-on)
