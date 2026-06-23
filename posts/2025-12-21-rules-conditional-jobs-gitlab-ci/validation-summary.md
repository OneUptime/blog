# Validation Summary: How to Use Rules for Conditional Jobs in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab CI `rules`
- GitLab CI `workflow: rules`
- GitLab CI predefined variables
- YAML CI configuration
- npm command examples
- Docker and deployment command examples

## Sources Consulted
- GitLab Docs: Specify when jobs run with rules - https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab Docs: CI/CD YAML syntax reference, `rules` - https://docs.gitlab.com/ci/yaml/#rules
- GitLab Docs: CI/CD YAML syntax reference, `rules:changes` - https://docs.gitlab.com/ci/yaml/#ruleschanges
- GitLab Docs: CI/CD YAML syntax reference, `rules:changes:compare_to` - https://docs.gitlab.com/ci/yaml/#ruleschangescompare_to
- GitLab Docs: CI/CD YAML syntax reference, `rules:exists` - https://docs.gitlab.com/ci/yaml/#rulesexists
- GitLab Docs: CI/CD YAML syntax reference, `rules:when` and `rules:allow_failure` - https://docs.gitlab.com/ci/yaml/#ruleswhen
- GitLab Docs: `workflow` keyword - https://docs.gitlab.com/ci/yaml/workflow/
- GitLab Docs: Predefined CI/CD variables - https://docs.gitlab.com/ci/variables/predefined_variables/
- npm Docs: `npm test` - https://docs.npmjs.com/cli/commands/npm-test
- npm Docs: `npm audit` - https://docs.npmjs.com/cli/commands/npm-audit

## Issues Found
- Several GitLab CI job snippets used job names with `rules` but no `script`, which would be incomplete if copied as standalone jobs. Added minimal placeholder `script` entries to keep the examples syntactically valid while preserving their focus on `rules`.
- The `rules:changes` section omitted an important caveat: without `compare_to`, GitLab evaluates `rules:changes` as true for pipelines without a Git push event, such as tag, scheduled, and manual pipelines. Added a short note explaining when to use `compare_to`.
- The complete example described integration tests as skipped for "docs-only changes", but the shown `changes` rule skips when any matching documentation file changes, including mixed code-and-docs commits. Updated the comment to match the actual behavior.
- The complete example described the security scan as weekly, but the rule matched every scheduled pipeline. Added `&& $SCHEDULE_TYPE == "weekly"` to make the example match the comment.
- The "Missing Default" section said a job might run unexpectedly when no final default rule is present. GitLab's documented behavior is that if no rules match, the job is not added to the pipeline. Reworded the section to explain that an explicit default is optional and useful only when catch-all behavior is intended.

## Review Notes
The examples use current GitLab `rules`, `workflow: rules`, `if`, `changes`, `exists`, `when`, `allow_failure`, and `variables` syntax. The post correctly explains first-match rule evaluation, OR behavior across separate rules, AND behavior within a rule, merge request pipeline source checks, and the `CI_OPEN_MERGE_REQUESTS` workflow pattern for avoiding duplicate branch and merge request pipelines.
