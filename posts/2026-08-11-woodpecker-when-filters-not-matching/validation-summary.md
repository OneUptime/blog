# Validation Summary: Debug Woodpecker `when` Filters That Do Not Match

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Woodpecker CI 3.15+
- Woodpecker workflow and step-level `when` filters
- YAML workflow configuration
- Git branches, refs, tags, and commit revisions
- Woodpecker built-in `CI_*` environment variables and configuration-time substitution
- Doublestar glob matching
- Expr expressions
- Woodpecker CLI linting and local pipeline execution

## Sources Consulted
- [Woodpecker workflow syntax and `when` filters](https://woodpecker-ci.org/docs/usage/workflow-syntax)
- [Woodpecker environment-variable scopes, substitution, and built-in values](https://woodpecker-ci.org/docs/usage/environment)
- [Woodpecker multiple workflows and optional dependencies](https://woodpecker-ci.org/docs/usage/workflows)
- [Woodpecker project settings and repository hooks](https://woodpecker-ci.org/docs/usage/project-settings)
- [Woodpecker cron configuration](https://woodpecker-ci.org/docs/usage/cron)
- [Woodpecker CLI linter](https://woodpecker-ci.org/docs/usage/linter)
- [Woodpecker local pipeline execution](https://woodpecker-ci.org/docs/usage/local-execution)
- [Woodpecker generated CLI reference](https://woodpecker-ci.org/docs/cli)
- [Woodpecker migration guide, including 3.0 filter changes](https://woodpecker-ci.org/migrations)
- [Woodpecker 3.15.0 release notes](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.15.0)
- [Woodpecker 3.17.0 release notes](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.17.0)
- [Woodpecker 3.17 tag, condition-matching implementation](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/frontend/yaml/constraint/constraint.go)
- [Woodpecker 3.17 tag, path-filter implementation](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/frontend/yaml/constraint/path.go)
- [Woodpecker 3.17 tag, configuration substitution implementation](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/frontend/metadata/substitution.go)
- [Woodpecker Bitbucket Cloud integration limitations](https://woodpecker-ci.org/docs/administration/configuration/forges/bitbucket#missing-features)
- [Expr language definition](https://github.com/expr-lang/expr/blob/master/docs/language-definition.md)
- [Doublestar pattern-matching documentation](https://github.com/bmatcuk/doublestar)
- [Git `show` documentation](https://git-scm.com/docs/git-show)
- [Docker Official Image documentation for Alpine](https://hub.docker.com/_/alpine)

## Issues Found
1. **The stated version scope was too broad.** The post claimed compatibility with all Woodpecker 3.x releases, but optional `depends_on` entries and the restored runtime `CI_PIPELINE_STATUS` variable were introduced in 3.15. Changed the minimum version to 3.15 and newer. Also clarified that 3.0 removed the plural `includes`/`excludes` options specifically from event filters and removed the old `environment` filter.
2. **The Boolean-model explanation omitted event-specific ignored filters.** Woodpecker combines applicable keys in a condition, but it skips some keys outside their event scope. Changed the explanation from “all keys” to “all applicable keys” and called out this behavior before presenting the Boolean expression.
3. **The tag-plus-branch example described the wrong outcome.** Woodpecker does not evaluate `branch` for tag events, so `event: tag` combined with `branch: main` matches every tag; it is not an impossible condition. Updated the example and surrounding explanation to state that the branch key is ignored and cannot prove tag ancestry from `main`.
4. **The shell-expansion guidance was overbroad.** Woodpecker preprocesses braced `${VAR}` expressions, which can be deferred as `$${VAR}`. The unbraced `$CI_*` references in the diagnostic commands already reach the container shell unchanged. Reworded the guidance to distinguish these forms.
5. **The pull-request path claim did not account for forge support.** Qualified the all-files behavior to forge integrations that supply pull-request changed-file data and added the current documented limitation that Bitbucket Cloud pull-request path filters are unsupported.
6. **The revision-check instructions did not ensure that `HEAD` was the pipeline revision.** `git show HEAD:...` is valid, but a developer's local `HEAD` may differ from the commit recorded for the pipeline. Added the requirement to use a clean checkout of the pipeline's recorded commit SHA before running the shown commands.

## Review Notes
- Woodpecker 3.17.0 was the current stable release on the validation date. The corrected 3.15+ minimum covers the optional-dependency syntax and runtime `CI_PIPELINE_STATUS` behavior used by the post.
- All 15 YAML fences parse successfully and pass normal `woodpecker-cli` 3.17.0 linting when complete snippets and condition fragments are placed in minimal valid workflows. The `woodpecker-cli lint .woodpecker/test.yaml` command is current syntax.
- Strict linting emits advisory event-filter warnings for intentionally broad status-only diagnostic/notification examples and for the evaluate-only example. These do not make the configurations invalid; readers can add an explicit event filter when the step should not apply to every event.
- Current documentation promises path conditions for `push` and `pull_request`. The 3.17 implementation also invokes path matching for related events represented internally by `Event.IsPull()`, including `pull_request_closed` and `pull_request_metadata`; the post now describes the documented support boundary rather than relying on that implementation detail.
- Branch/ref matching, pull-request target/source metadata, cron-name filtering, path `on_empty` and `ignore_message` behavior, the 500-file `CI_PIPELINE_FILES` limit, status-filter values and defaults, Expr syntax, secret scope, optional dependencies, and the CLI compatibility caveat agree with the cited documentation and current source.
- All external links in the post were checked and resolve to the intended authoritative resources. The `alpine:3.22` image tag remains available as an official Alpine image tag.
