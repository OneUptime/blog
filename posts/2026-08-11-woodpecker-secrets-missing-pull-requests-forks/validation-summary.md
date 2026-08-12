# Validation Summary: Why Are Woodpecker Secrets Missing on Pull Requests and Forks?

## Status
validated

## Post Type
Technical troubleshooting and security guide

## Technologies Covered
- Woodpecker CI 3.x, specifically Woodpecker 3.17
- Woodpecker workflow YAML and `from_secret`
- `woodpecker-cli` repository secret management
- Pull-request, push, and other Woodpecker pipeline events
- Repository, organization, and global Woodpecker secrets
- Woodpecker pipeline approval controls
- Woodpecker plugin image filters and privileged-plugin configuration
- Woodpecker Docker Buildx plugin
- Private container registry and trusted clone credentials
- POSIX shell environment-variable checks

## Sources Consulted
- [Woodpecker secrets documentation](https://woodpecker-ci.org/docs/usage/secrets)
- [Woodpecker workflow syntax and event documentation](https://woodpecker-ci.org/docs/usage/workflow-syntax#event)
- [Woodpecker environment-variable documentation](https://woodpecker-ci.org/docs/usage/environment)
- [Woodpecker project settings and approval documentation](https://woodpecker-ci.org/docs/usage/project-settings)
- [Woodpecker private registry documentation](https://woodpecker-ci.org/docs/usage/registries)
- [Woodpecker CLI reference](https://woodpecker-ci.org/docs/cli)
- [Woodpecker 3.0 migration documentation](https://woodpecker-ci.org/migrations#300)
- [Woodpecker server configuration: approval defaults and privileged plugins](https://woodpecker-ci.org/docs/administration/configuration/server)
- [Woodpecker configuration-extension documentation](https://woodpecker-ci.org/docs/usage/extensions/configuration-extension)
- [Woodpecker Docker Buildx plugin documentation](https://woodpecker-ci.org/plugins/docker-buildx)
- [Woodpecker 3.17 compiler source for event and plugin-image secret checks](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/frontend/yaml/compiler/compiler.go)
- [Woodpecker 3.17 compiler source for case-insensitive `from_secret` lookup](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/frontend/yaml/compiler/convert.go)
- [Woodpecker 3.17 repository-secret CLI implementation and defaults](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cli/repo/secret/secret_add.go)
- [Woodpecker 3.17 secret precedence implementation](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/services/secret/db.go)
- [Woodpecker 3.17 pipeline approval route and push-permission middleware](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/router/api.go#L121-L125) and [`MustPush` implementation](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/router/middleware/session/repo.go#L194-L203)
- [Woodpecker 3.17 approval-default database migration](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/store/datastore/migration/022_set_new_defaults_for_require_approval.go)

## Issues Found
- **Approval was presented as sufficient protection for untrusted push-capable users.** The post offered **All events from forge** as an alternative when untrusted users can push branches. Woodpecker allows any user with effective push permission, normally inherited from the forge, to approve a held pipeline and does not require an independent reviewer, so such a user can approve their own malicious pipeline. The approval section, two-phase guidance, exception checklist, and conclusion now state that push access must be removed or the credential must remain unavailable to `push`; approval remains useful only when the untrusted author lacks push permission and every user able to approve is trusted.
- **The Woodpecker 3.0 migration behavior was overgeneralized.** The post said the migration made fork-PR approval the restrictive default without distinguishing new repositories from upgraded data. It now explains that fork-PR approval became the default for newly activated repositories, while the upgrade migration assigned that mode to previously non-gated public repositories and assigned no approval to previously non-gated non-public repositories.
- **Exact tags were described as mandatory in `WOODPECKER_PLUGINS_PRIVILEGED`.** The Buildx plugin must be explicitly allowlisted, but an untagged image entry is accepted and matches all tags. The text now says to list the plugin explicitly and to specify the exact tag so the grant is limited to the reviewed version.
- **The failure mode for an unavailable `from_secret` value was unclear.** Woodpecker 3.17 rejects workflow compilation when a requested secret is missing or fails its event or plugin-image policy; it does not run the step with an empty injected variable. The diagnostic guidance now distinguishes pipeline configuration errors from step failures and limits the shell emptiness check to scripts that may run without the mapping.

## Review Notes
- The YAML examples use current Woodpecker 3.x map syntax, and the repository-secret CLI command and its repeatable `--event` flags are valid for Woodpecker 3.17.
- In Woodpecker 3.17, enabling the canonical `pull_request` secret event also covers `pull_request_closed` and `pull_request_metadata`, as the compiler normalizes all pull-request event variants for secret matching.
- The current secrets documentation has two inconsistencies with the tagged 3.17 implementation: its “last wins” wording conflicts with the tested repository-over-organization-over-global precedence, and its prose omits `release` from the CLI's default secret event list. The post follows the 3.17 implementation and tests.
- The Docker Buildx `6.1.1` image/tag and the documented `repo`, `registry`, `username`, and `password` settings were verified.
- All external documentation links in the post resolve to the intended official Woodpecker resources.
