# Validation Summary: How to Reproduce a Woodpecker Failure Locally with `woodpecker-cli exec`

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Woodpecker CI 3.17.0
- `woodpecker-cli exec`
- Docker, Local, and Kubernetes execution backends
- Docker Engine and container networking/volumes
- Git worktrees and revision inspection
- YAML workflow, metadata, environment-variable, and secrets configuration
- CI/CD failure reproduction and debugging

## Sources Consulted
- [Woodpecker local pipeline execution](https://woodpecker-ci.org/docs/usage/local-execution)
- [Woodpecker 3.17 CLI reference](https://woodpecker-ci.org/docs/cli#exec)
- [Woodpecker workflow syntax](https://woodpecker-ci.org/docs/usage/workflow-syntax)
- [Woodpecker environment metadata](https://woodpecker-ci.org/docs/usage/environment)
- [Woodpecker secrets](https://woodpecker-ci.org/docs/usage/secrets)
- [Woodpecker Docker backend](https://woodpecker-ci.org/docs/administration/configuration/backends/docker)
- [Woodpecker Local backend](https://woodpecker-ci.org/docs/administration/configuration/backends/local)
- [Woodpecker supported platforms](https://woodpecker-ci.org/docs/administration/installation/supported-platforms)
- [Woodpecker distribution packages](https://woodpecker-ci.org/docs/administration/installation/packages)
- [Woodpecker 3.17.0 release](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.17.0)
- [Woodpecker 3.17.0 `exec` flag definitions](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cli/exec/flags.go) and [`exec` metadata implementation](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cli/exec/metadata.go)
- [Woodpecker 3.17.0 local execution implementation](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cli/exec/exec.go), [Local clone implementation](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/backend/local/clone.go), and [Local backend documentation source](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/docs/versioned_docs/version-3.17/30-administration/10-configuration/11-backends/30-local.md)
- [Docker `info` reference](https://docs.docker.com/reference/cli/docker/system/info/) and [`version` reference](https://docs.docker.com/reference/cli/docker/version/)
- [Git worktree documentation](https://git-scm.com/docs/git-worktree)

## Issues Found
- Woodpecker 3.17.0 advertises `--repo`, but the implementation registers `repo` while reading `repo-name`, so the flag does not populate or override repository metadata. Removed the ineffective flag from both handcrafted commands and added a version-specific warning to use downloaded metadata when repository identity or `repo` conditions matter.
- Directory discovery is recursive, but v3.17.0 executes the resulting workflows sequentially. Replaced the incorrect reference to directory execution introducing parallel activity with “additional activity.”
- The Local backend uses `image` as the shell only for command steps; plugin steps use it as an executable. Qualified the explanation accordingly.
- The Local backend's fallback downloads the latest `plugin-git` release asset matching the host OS and architecture, not a binary matched to the Woodpecker version. Corrected the description and clarified that clone prerequisites apply when a clone step is enabled.
- A secrets file named `.woodpecker/local-secrets.yaml` would itself be discovered as a workflow by `woodpecker-cli exec .woodpecker/`. Moved the example to `.woodpecker-local-secrets.yaml`, updated all commands, and explained why it must remain outside the recursively scanned workflow directory.
- Metadata replay does not preserve the hosted platform: `exec` uses `--system-platform` or defaults to the CLI host's OS/architecture. Added the required caveat for platform conditions and clarified that changing metadata does not emulate another platform.
- Trust values inside downloaded metadata do not authorize trust-gated YAML features. Added the explicit `--repo-trusted-security`, `--repo-trusted-network`, and `--repo-trusted-volumes` requirements and mapped them to the relevant feature categories.
- Privileged-plugin permission is configured by the Woodpecker instance/server, not by an individual production agent. Corrected the ownership wording and instructed readers to mirror the production allowlist entry exactly.
- `env | sort` would print secret values despite the accompanying warning. Replaced it with `env | cut -d= -f1 | sort`, which lists variable names without their values.
- Woodpecker's secret image restriction applies specifically to plugin images. Changed “image restrictions” to “plugin-image restrictions.”

## Review Notes
The remaining commands and flags were verified against the official Woodpecker 3.17.0 release binary help and tagged source. All external links in the post returned HTTP 200 during review. Woodpecker 3.17.0 was the current release on the validation date. The `--repo` caveat documents a defect in the shipped 3.17.0 implementation even though the generated CLI reference advertises the flag.
