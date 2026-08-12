# Validation Summary: Woodpecker Pipeline Never Starts After a Push: Trace the Forge Webhook, Repository Sync, and Config Path

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Woodpecker CI 3.x server, agents, pipelines, and workflows
- GitHub, GitLab, Gitea, Forgejo, and Bitbucket webhooks
- Reverse proxies, DNS, TLS, cURL, and OpenSSL
- Woodpecker workflow YAML, event and branch filters, environment variables, and secrets
- Git commit and tree inspection
- Docker Official Images for Alpine Linux and Go

## Sources Consulted
- [Woodpecker: Your first pipeline](https://woodpecker-ci.org/docs/usage/intro)
- [Woodpecker: Project settings](https://woodpecker-ci.org/docs/usage/project-settings)
- [Woodpecker: Workflows](https://woodpecker-ci.org/docs/usage/workflows)
- [Woodpecker: Workflow syntax](https://woodpecker-ci.org/docs/usage/workflow-syntax)
- [Woodpecker: Environment variables](https://woodpecker-ci.org/docs/usage/environment)
- [Woodpecker: Secrets](https://woodpecker-ci.org/docs/usage/secrets)
- [Woodpecker: Linter](https://woodpecker-ci.org/docs/usage/linter)
- [Woodpecker: Server configuration](https://woodpecker-ci.org/docs/administration/configuration/server)
- [Woodpecker: Supported forge features](https://woodpecker-ci.org/docs/administration/configuration/forges/overview)
- [Woodpecker: Gitea integration](https://woodpecker-ci.org/docs/administration/configuration/forges/gitea)
- [Woodpecker: Forgejo integration](https://woodpecker-ci.org/docs/administration/configuration/forges/forgejo)
- [Woodpecker: CLI reference](https://woodpecker-ci.org/docs/cli)
- [Woodpecker: Migration notes](https://woodpecker-ci.org/migrations)
- [Woodpecker 3.17 pipeline-creation source](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/pipeline/create.go), [repository-settings UI](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/web/src/views/repo/settings/General.vue), and [repository-repair command](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cli/repo/repo_repair.go)
- [Git `show` reference](https://git-scm.com/docs/git-show) and [Git `ls-tree` reference](https://git-scm.com/docs/git-ls-tree)
- [cURL command-line reference](https://curl.se/docs/manpage.html) and [OpenSSL `s_client` reference](https://docs.openssl.org/3.5/man1/openssl-s_client/)
- [RFC 9110, HTTP redirection semantics](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.4.2)
- [Official Alpine image tags](https://hub.docker.com/_/alpine/tags) and [Official Go image tags](https://hub.docker.com/_/golang/tags)

## Issues Found
1. **The initial symptom classification assigned global filters and a missing config path to a visible pipeline with no workflows.** Woodpecker 3.x deletes its provisional pipeline when no configuration is found or every workflow is filtered out, so those cases normally leave no new pipeline number. Moved workflow-level `when` filters into the no-pipeline case and reserved a retained zero-workflow error pipeline for configuration-fetch, YAML-parsing, and schema diagnostics. The filtered-workflow example now also explains that no pipeline remains visible when it is the only discovered workflow.
2. **The post described a project-level `push` event toggle that Woodpecker 3.x does not provide.** Project settings expose pull-request and deployment controls, while Woodpecker-created forge hooks subscribe to pushes. Changed the guidance and checklist to verify `push` on the forge webhook and noted that repository repair restores Woodpecker's standard event subscriptions.
3. **Some repository-management UI and CLI wording was imprecise.** Updated **New repository** to the shipped **Add repository** label, described repository synchronization as refreshing or reloading visibility and permissions, and replaced the vague repository-repair reference with the exact command `woodpecker-cli repo repair <repo-id|repo-full-name>`.
4. **The default configuration-resolution statement omitted server-level overrides.** Administrators can change the defaults with `WOODPECKER_DEFAULT_PIPELINE_CONFIGS` and `WOODPECKER_DEFAULT_PIPELINE_CONFIG_EXTENSIONS`. Qualified the documented search order as the stock server behavior.
5. **Nested workflow-directory behavior was stated too absolutely.** The supported invariant is that directory discovery is non-recursive; nested directories are not traversed for workflow files. Reworded the claim instead of promising that every forge adapter silently ignores nested directory entries.

## Review Notes
- The corrected post matches current Woodpecker 3.17.x behavior. Pipeline creation, filtering, repository settings, and repair behavior were also checked in earlier 3.x source where version-specific behavior mattered.
- Both YAML examples are valid Woodpecker 3.x workflows. The single-map `when` form is supported, the `event` and `branch` keys are combined with AND semantics, and the three referenced `CI_*` variables are current runtime variables.
- The default workflow search order, custom-directory trailing-slash requirement, exact-revision lookup, case-sensitive Git paths, commit skip markers, step-level filtering behavior, environment-map requirement, removal of top-level `pipeline:`, and `environment`/`from_secret` secret syntax are correct.
- `alpine:3.22` and `golang:1.26` are valid Docker Official Image tags on the validation date.
- The cURL, OpenSSL, `git show`, `git ls-tree`, and `grep -E` commands are syntactically correct for their stated diagnostic purposes. `openssl s_client` displays handshake and chain diagnostics but does not, without stricter verification flags, make every certificate or hostname problem fatal; the post correctly does not claim that it validates the webhook itself.
- All links in the post's Official Documentation section returned HTTP 200 and resolved to the intended current Woodpecker documentation.
