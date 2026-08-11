# Validation Summary: Why Didn’t a Woodpecker Cron Pipeline Run? Schedule, Time Zone, Branch, and Event Checks

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Woodpecker CI 3.x, with implementation checks against Woodpecker 3.17.0
- Woodpecker scheduled pipelines and repository cron jobs
- Woodpecker CLI, web interface, and REST API
- Woodpecker workflow YAML and `when` conditions
- Five-field cron expressions, interval descriptors, IANA time zones, and daylight-saving behavior
- Git remote branch and repository-content inspection
- Docker Compose and Kubernetes server-log diagnostics

## Sources Consulted
- [Woodpecker cron documentation](https://woodpecker-ci.org/docs/usage/cron)
- [Woodpecker workflow syntax](https://woodpecker-ci.org/docs/usage/workflow-syntax), including the [`cron`](https://woodpecker-ci.org/docs/usage/workflow-syntax#cron), [`path`](https://woodpecker-ci.org/docs/usage/workflow-syntax#path), and global workflow-condition references
- [Woodpecker CLI reference](https://woodpecker-ci.org/docs/cli)
- [Woodpecker REST API reference](https://woodpecker-ci.org/api)
- [Woodpecker migration guide](https://woodpecker-ci.org/migrations) and the [3.0 cron migration implementation](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/store/datastore/migration/011_cron_without_sec.go)
- [Woodpecker 3.15.0 release notes](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.15.0) and [timezone-support change](https://github.com/woodpecker-ci/woodpecker/pull/6597)
- [Woodpecker 3.17.0 release notes](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.17.0)
- Woodpecker 3.17.0 tagged source for the [cron scheduler](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/cron/cron.go), [cron API](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/api/cron.go), [cron model and validation](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/model/cron.go), [pipeline creation](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/pipeline/create.go), and [filtered-pipeline API handling](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/api/helper.go)
- Woodpecker 3.17.0 tagged source for the [pipeline-list CLI](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cli/pipeline/list.go), [cron-list CLI](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cli/repo/cron/cron_list.go), [cron settings UI](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/web/src/views/repo/settings/Crons.vue), and [pipeline-history UI](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/web/src/views/repo/RepoPipelines.vue)
- [Woodpecker environment-variable reference](https://woodpecker-ci.org/docs/usage/environment), [project settings](https://woodpecker-ci.org/docs/usage/project-settings), and [secret filters](https://woodpecker-ci.org/docs/usage/secrets)
- [`gdgvda/cron` v0.7.0 expression and interval documentation](https://pkg.go.dev/github.com/gdgvda/cron#hdr-CRON_Expression_Format) and [DST schedule tests](https://github.com/gdgvda/cron/blob/v0.7.0/schedule_test.go)
- Official Git documentation for [`git ls-remote`](https://git-scm.com/docs/git-ls-remote), [`git fetch`](https://git-scm.com/docs/git-fetch), and [`git show`](https://git-scm.com/docs/git-show)
- [Docker Compose `logs` reference](https://docs.docker.com/reference/cli/docker/compose/logs/)

## Issues Found
- Pipeline-history interpretation was too absolute. Woodpecker 3.17 deletes the newly created database record when pipeline compilation leaves no workflows, so the absence of a visible pipeline does not prove that the cron scheduler never fired. The introduction, outcome classification, `NextExec` test, and conclusion now explain this behavior and direct readers to the stored next execution and server logs.
- The post implied that the 3.17 web pipeline-history page could filter by event. That page has no event-filter control; the CLI does. The text now tells readers to look for the event in the UI and use `woodpecker-cli pipeline ls --event cron` for filtering.
- Any past `NextExec` value was presented as suspicious. The scheduler polls once per minute and processes a bounded batch, so a recently past value can be normal. The text now treats a value that remains past the normal polling delay as the diagnostic condition.
- Cron authorization was described in terms of synchronized repository ownership. The server actually checks the authenticated user's synchronized repository push permission. The wording now refers to Woodpecker's synchronized repository permission record.
- The timezone section named 3.17 while the broad 2.x-to-3.x checklist was unqualified. Per-cron timezone support was introduced in 3.15 and is absent from earlier 3.x releases, so both references now say 3.15 or later.
- The database host clock was described as participating in scheduling. Woodpecker calculates due work from the server process clock and sends Unix timestamps to the datastore. The diagnostic now identifies server clocks as authoritative while retaining database synchronization advice for log correlation.
- The Git branch check used the now-deprecated `git ls-remote --heads` spelling and then inspected a remote-tracking ref that can depend on local ref-mapping configuration. It now uses `git ls-remote --exit-code` with an exact `refs/heads/main` pattern and inspects the freshly fetched `FETCH_HEAD`.
- Branch validation on update was overstated. Woodpecker validates a nonempty branch when a cron is created or when the branch field is changed; an unrelated update does not revalidate a branch that disappeared later. The text now states that exact behavior.
- The “Run now” failure classification omitted filtered empty pipelines and missing configuration. The section now documents the Woodpecker 3.17 `204 No Content` response with `Pipeline-Filtered: true`, the common no-configuration/all-workflows-filtered causes, and the distinction from branch or forge errors.

## Review Notes
- The Woodpecker CLI commands and flags were also checked by building the v3.17.0 tagged CLI and reading its generated `--help` output. Both commands shown in the post are current and valid.
- The workflow snippets, built-in environment variables, cron-name glob, global-versus-step condition behavior, path-filter guidance, manual-versus-cron event distinction, and secret event/plugin filters are correct for Woodpecker 3.17.0.
- The five-field migration example, `@daily` and `@every` descriptors, fixed-duration behavior, IANA timezone handling, and both daylight-saving edge cases match the tagged Woodpecker source and its `gdgvda/cron` v0.7.0 dependency.
- Targeted Woodpecker tests for the cron scheduler, YAML constraints, and YAML compiler passed against tag v3.17.0.
