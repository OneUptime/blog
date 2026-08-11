# Woodpecker `when` Filters Not Matching? Debug Branch, Ref, Event, Path, and Status Conditions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, CI/CD, YAML, Conditional Execution, Troubleshooting

Description: Debug Woodpecker when conditions by checking their boolean structure and the exact metadata available for each pipeline event.

---

A Woodpecker `when` block is easiest to debug as a boolean expression over pipeline metadata. Most surprises come from one of four sources: confusing AND with OR, testing the wrong branch field for a pull request, matching a branch where only a ref exists, or expecting path and status data in an event or evaluation phase where it is unavailable.

This guide uses Woodpecker 3.x syntax. Do not copy legacy 2.x `includes`, `excludes`, or environment-filter examples; the 3.0 migration removed or replaced those forms.

## Learn the Boolean Model First

For a step, `when` is a list of condition entries:

~~~yaml
when:
  - event: pull_request
    branch: main
  - event: push
    branch: develop
~~~

All keys inside one entry are ANDed. The entries in the list are ORed. The step runs when:

~~~text
(event is pull_request AND branch is main)
OR
(event is push AND branch is develop)
~~~

This does not mean “any of these four values.” Indentation changes the logic.

Global workflow conditions use the same filters to decide whether the whole workflow belongs to the pipeline. A simple global condition is a map:

~~~yaml
when:
  event: push
  branch: main

steps:
  - name: test
    image: alpine:3.22
    commands:
      - ./test.sh
~~~

Use workflow-level filtering to avoid scheduling, cloning, and then skipping every step. Use step-level filtering when only part of an otherwise useful workflow is conditional.

## Establish the Actual Metadata

Do not infer metadata from the forge page title. Open the Woodpecker pipeline details and inspect its event, branch, ref, commit, and changed files. If necessary, add a temporary unfiltered diagnostic step:

~~~yaml
steps:
  - name: show-context
    image: alpine:3.22
    commands:
      - echo "event=$CI_PIPELINE_EVENT"
      - echo "branch=$CI_COMMIT_BRANCH"
      - echo "source=$CI_COMMIT_SOURCE_BRANCH"
      - echo "target=$CI_COMMIT_TARGET_BRANCH"
      - echo "ref=$CI_COMMIT_REF"
      - echo "files=$CI_PIPELINE_FILES"
    when:
      - status: [success, failure]
~~~

Woodpecker substitutes configuration values before runtime, so escape shell variables with `$$` when a command requires the container's shell—not Woodpecker—to expand them. The built-in `CI_*` examples above are intentionally diagnostic; remove the step after the filter is understood.

## Branch Conditions

The most important branch rule is:

> For a pull request, `CI_COMMIT_BRANCH` and the `branch` filter refer to the target branch.

Therefore:

~~~yaml
when:
  - event: pull_request
    branch: main
~~~

means “pull requests targeting `main`.” To inspect the contributor's branch, use `CI_COMMIT_SOURCE_BRANCH` in an `evaluate` expression.

Branch conditions are not applied to tags. A tag has a ref such as `refs/tags/v2.4.0`; it does not become a normal branch merely because it points at a commit also reachable from `main`.

Woodpecker uses doublestar matching for branch and path patterns. Quote a pattern that begins with `*` so YAML does not treat it as an alias:

~~~yaml
when:
  - event: push
    branch:
      include: [main, release/*]
      exclude: [release/obsolete-*]
~~~

Test the exact branch name, including slashes and case. A pattern `feature/*` is not automatically equivalent to every recursively nested name; consult doublestar semantics when multiple slash levels matter.

## Ref Conditions

Use `ref` when the Git reference itself is the intended subject:

~~~yaml
when:
  - event: tag
    ref: refs/tags/v*
~~~

Typical refs include `refs/heads/main` and `refs/tags/v1.2.3`. Matching `v*` against `refs/tags/v1.2.3` fails because the prefix is part of the value.

Do not combine a tag event with a branch requirement:

~~~yaml
# Impossible or misleading: branch filters do not apply to tags.
when:
  - event: tag
    branch: main
~~~

If a release policy needs to prove ancestry from a protected branch, perform an explicit Git ancestry check in a step. A tag payload alone does not encode “this tag was created from main” as a branch filter.

## Event Conditions

Manual runs, cron runs, deployments, pushes, and pull requests are separate events. A UI **Run pipeline** action has event `manual`, not `push`. A scheduled job has event `cron`, even if its selected branch is `main`.

Make event intent explicit:

~~~yaml
when:
  - event: [push, manual]
    branch: main
~~~

For a cron-name filter, include the event too:

~~~yaml
when:
  - event: cron
    cron: nightly_security_scan
~~~

The `cron` key only applies to cron events and matches the configured job name, not the schedule expression.

Project settings can disable handling of some repository hooks, such as pull requests. If the server never creates a pull-request pipeline, no YAML `when` expression will be evaluated. Separate event-ingestion failures from filtering failures.

## Path Conditions

Path filters apply only to `push` and `pull_request` events. They are not a generic filesystem existence test and do not inspect files produced by earlier steps.

~~~yaml
when:
  - event: [push, pull_request]
    path:
      include:
        - src/**
        - package.json
        - package-lock.json
      exclude:
        - docs/**
      on_empty: false
~~~

Key details from the current documentation:

- Pull-request path matching considers all changed files in the pull request, not only the newest commit.
- An empty commit is considered a match by default; set `on_empty: false` when it should not run.
- `ignore_message` can define a commit-message marker that bypasses path conditions.
- Patterns are doublestar globs over repository-relative paths.
- `CI_PIPELINE_FILES` is undefined when more than 500 files are touched, so diagnostic code must tolerate an unset value.

Start with only `include`, verify a known file, and then add exclusions. An exclusion list is not a positive selection by itself, and broad shared-file changes often need explicit inclusion in every affected monorepo workflow.

## Status Conditions

By default, a step runs only while the workflow has succeeded so far. That is equivalent to `status: [success]`. Current Woodpecker accepts `success` and `failure` in the status filter.

Run a notification only after failure:

~~~yaml
steps:
  - name: notify-failure
    image: example.com/ops/notifier:1
    settings:
      endpoint:
        from_secret: notify_endpoint
    when:
      - status: [failure]
~~~

Run cleanup regardless of the preceding result:

~~~yaml
    when:
      - status: [success, failure]
~~~

Status is evaluated independently alongside other filters. This is valid:

~~~yaml
when:
  - event: tag
    status: [failure]
  - event: pull_request
    status: [success, failure]
~~~

If no entry matches the event, the step does not inherit the most permissive status from another entry. Also note that `CI_PIPELINE_STATUS` is runtime-scoped; the environment documentation says runtime-only variables are not populated while configuration is evaluated. Use the dedicated `status` filter rather than `when.evaluate` with `CI_PIPELINE_STATUS`.

## Evaluate Expressions

`evaluate` is for conditions not represented by ordinary keys. It can use built-in `CI_` variables available in configuration scope and custom variables:

~~~yaml
when:
  - evaluate: 'CI_PIPELINE_EVENT == "push" && CI_REPO == "acme/api" && CI_COMMIT_BRANCH == CI_REPO_DEFAULT_BRANCH'
~~~

Use single quotes around the complete expression so YAML does not reinterpret its punctuation. Keep ordinary event, branch, ref, path, and status checks in their named filters unless a compound expression truly requires more.

Common expression mistakes include:

- using a runtime-only variable during config evaluation;
- referencing an unset pull-request field during a push;
- forgetting string quotes;
- copying syntax from GitHub Actions, Bash, or another expression language;
- depending on secret values, which are deliberately not configuration-time variables.

The underlying language is `expr`; use its official language definition for operators and functions rather than guessing.

## Debug Filters by Reduction

Take a failing condition and reduce it to one dimension:

~~~yaml
when:
  - event: push
~~~

Trigger a controlled push. If it matches, add `branch`; then add `path`; then add any expression. After each run, record the event, branch, ref, and changed files. This isolates the first false predicate.

For step filters, a useful sequence is:

1. remove the `when` block and verify the step itself can run;
2. add only `event`;
3. add `branch` or `ref`, not both unless both are needed;
4. add `path`;
5. add `status`;
6. use `evaluate` last.

For global workflow filters, remember that a skipped workflow may also exclude workflows that require it through `depends_on`. Use an optional dependency when a downstream workflow should proceed if a path-filtered dependency is absent.

## Validate the YAML Version in the Actual Revision

Woodpecker loads the workflow from the event's commit. A local edit that has not been pushed cannot affect the result. Check:

~~~bash
git show HEAD:.woodpecker/test.yaml
woodpecker-cli lint .woodpecker/test.yaml
~~~

Use a CLI compatible with the server. The linter finds schema and YAML problems, but it cannot know every forge payload. Pair it with the metadata from a real or locally replayed event.

## Official Documentation

- [Woodpecker: Workflow syntax and all when filters](https://woodpecker-ci.org/docs/usage/workflow-syntax)
- [Woodpecker: Environment-variable scopes and values](https://woodpecker-ci.org/docs/usage/environment)
- [Woodpecker: Multiple workflows and optional dependencies](https://woodpecker-ci.org/docs/usage/workflows)
- [Woodpecker: CLI linter](https://woodpecker-ci.org/docs/usage/linter)
- [Woodpecker: Local pipeline execution](https://woodpecker-ci.org/docs/usage/local-execution)
- [expr language definition](https://github.com/expr-lang/expr/blob/master/docs/language-definition.md)

## Conclusion

Debug `when` filters by translating them into explicit boolean logic and comparing each predicate with real pipeline metadata. Treat pull-request branch as the target, use full Git refs for tag matching, restrict paths to push and pull-request events, and use the dedicated status filter for runtime outcome. Reduce the condition one key at a time; the first predicate that changes the result is the one that needs correction.
