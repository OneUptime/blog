# Validation Summary: Why Does “Run Pipeline” Spin Forever in Woodpecker? Add the `manual` Event and Check Forge Connectivity

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Woodpecker CI 3.x workflow syntax and manual pipeline events
- YAML workflow and step conditions
- Woodpecker secrets, approvals, agents, labels, and concurrency
- Forge integrations, OAuth, repository permissions, and webhooks
- Docker and container networking, DNS, TLS, and reverse proxies
- Git, curl, OpenSSL, and browser developer tools

## Sources Consulted

- [Woodpecker: Workflow syntax](https://woodpecker-ci.org/docs/usage/workflow-syntax)
- [Woodpecker: Workflows and configuration discovery](https://woodpecker-ci.org/docs/usage/workflows)
- [Woodpecker: Built-in environment variables](https://woodpecker-ci.org/docs/usage/environment)
- [Woodpecker: Project settings](https://woodpecker-ci.org/docs/usage/project-settings)
- [Woodpecker: Secrets](https://woodpecker-ci.org/docs/usage/secrets)
- [Woodpecker: Linter](https://woodpecker-ci.org/docs/usage/linter)
- [Woodpecker: CLI](https://woodpecker-ci.org/docs/cli)
- [Woodpecker: Server configuration](https://woodpecker-ci.org/docs/administration/configuration/server)
- [Woodpecker: Agent configuration](https://woodpecker-ci.org/docs/administration/configuration/agent)
- [Woodpecker: Forge configuration overview](https://woodpecker-ci.org/docs/administration/configuration/forges/overview)
- [Woodpecker: Gitea forge configuration](https://woodpecker-ci.org/docs/administration/configuration/forges/gitea)
- [Woodpecker: Forgejo forge configuration](https://woodpecker-ci.org/docs/administration/configuration/forges/forgejo)
- [Woodpecker: Migration guides](https://woodpecker-ci.org/migrations)
- [Woodpecker v3.17.0 release](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.17.0)
- [Woodpecker v3.16.0 release](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.16.0)
- [Woodpecker pull request #5883: warn when no workflow matches a manual run](https://github.com/woodpecker-ci/woodpecker/pull/5883)
- [Woodpecker pull request #6313: improve the manual-run warning](https://github.com/woodpecker-ci/woodpecker/pull/6313)
- [Woodpecker v3.17.0 manual-pipeline API source](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/api/pipeline.go)
- [Woodpecker v3.17.0 pipeline creation source](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/pipeline/create.go)
- [Woodpecker v3.17.0 approval-gating source](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/pipeline/gated.go)
- [Woodpecker v3.17.0 forge configuration-fetcher source](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/services/config/forge.go)
- [Woodpecker v3.17.0 manual-pipeline UI source](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/web/src/views/repo/RepoManualPipeline.vue)
- [Woodpecker v3.17.0 server-image source](https://github.com/woodpecker-ci/woodpecker/tree/v3.17.0/docker)
- [Woodpecker v3.17.0 YAML compiler source](https://github.com/woodpecker-ci/woodpecker/tree/v3.17.0/pipeline/frontend/yaml/compiler)
- [Docker Official Image: Node](https://hub.docker.com/_/node)
- [Docker Official Image: Alpine](https://hub.docker.com/_/alpine)
- [Git: `git fetch`](https://git-scm.com/docs/git-fetch)
- [Git: `git ls-tree`](https://git-scm.com/docs/git-ls-tree)
- [curl command-line documentation](https://curl.se/docs/manpage.html)
- [OpenSSL: `s_client`](https://docs.openssl.org/3.0/man1/openssl-s_client/)
- [GNU grep manual](https://www.gnu.org/software/grep/manual/)

## Issues Found

- The secret-hardening advice implied that an image restriction could be applied to the ordinary command step in the example. Woodpecker image filters on secrets are only valid for plugin steps, and manual events are not in a secret's default event set. The post now tells readers to authorize `manual` explicitly for the secret and not to add an image filter unless the step is converted to a plugin.
- The approval advice could be read as recommending Woodpecker's built-in repository approval gate for a manual pipeline. Current Woodpecker explicitly bypasses that gate for `manual` and `cron` events. The post now recommends push-access control and a separate two-person approval mechanism when one is required.
- Adding `.woodpecker/maintenance.yaml` beside an existing root workflow can cause the directory candidate to take precedence under the stock discovery order. The post now tells readers to move existing root workflows into the directory or configure the intended pipeline path explicitly.
- Clone credentials and clone-network access were described as unconditional requirements. The wording now accounts for public repositories, explicitly supplied credentials, and workflows with cloning disabled.
- The discussion of recent UI behavior called the replacement symptom only an error, while current versions specifically warn when no workflow accepts a manual run. The post now allows for either a warning or an error, depending on the failure.
- The HTTP troubleshooting table did not match the current manual-pipeline endpoint. It now documents the endpoint's `204 No Content` plus `Pipeline-Filtered: true` response for missing or fully filtered configuration, distinguishes request/authentication failures from forge failures, removes the unsupported `409` claim, and notes that forge-resolution failures commonly surface as `5xx` responses.
- The network commands were presented as if they could be executed inside the standard Woodpecker server image, but current server images do not include all three utilities. The post now calls for a disposable diagnostic container sharing the server's network namespace and the relevant DNS, proxy, and CA settings. The OpenSSL command also now enables hostname verification and returns failure on certificate verification errors.
- The OAuth and repository-state explanation conflated a user's forge token with Woodpecker's stored repository identity. The recovery guidance now separates token refresh from repository synchronization and identifies the relevant account: the initiating user for branch resolution and the stored repository owner for configuration fetching and default clone credentials.
- The workflow-discovery command used an unescaped dot and matched arbitrary nested files. It now uses `git ls-tree --full-tree` with a regular expression limited to the documented root workflow files and direct YAML files in `.woodpecker/`. The text also notes that administrators can override the stock default paths and extensions.
- The version-migration statement now makes clear that legacy 2.x `secrets:` and list-form `environment` syntax is invalid when the workflow is used on a 3.x server.
- The pending-workflow explanation omitted workflow dependencies and listed approval requirements even though current repository approval gating does not apply to manual events. It now includes `depends_on` dependencies and removes the misleading approval item.
- The minimal diagnostic workflow was said to isolate the remaining problem exclusively to filters or dependencies. A successful diagnostic also leaves execution-specific requirements as possible causes, so the conclusion now includes those requirements.

## Review Notes

- The review used Woodpecker v3.17.0, the current stable release on the validation date. Workflow-level and step-level `when` syntax, the `manual` event, documented CI variables, labels, maximum-workflow settings, concurrency behavior, and the v3 secret environment syntax were verified against that release. All five complete YAML examples passed the v3.17.0 CLI linter in strict mode.
- The historical spinner remains a useful diagnostic scenario, but recent Woodpecker versions added a warning when a manual request finds no workflow and subsequently improved that warning. The post correctly qualifies the UI behavior as version-dependent.
- The referenced documentation URLs resolve to the intended official Woodpecker, Git, OpenSSL, or GNU documentation.
