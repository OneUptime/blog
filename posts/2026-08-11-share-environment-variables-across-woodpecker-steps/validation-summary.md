# Validation Summary: Share Environment Variables Across Woodpecker Steps

## Status
validated

## Post Type
Technical guide / CI configuration tutorial

## Technologies Covered

- Woodpecker CI 3.x workflows, steps, workspaces, and backends
- Woodpecker environment variables, built-in `CI_*` variables, and string substitution
- Woodpecker secrets and plugin-image filters
- YAML anchors, aliases, map merges, and Woodpecker sequence merges
- Bash shell assignments, `printf %q`, `source`, and exported variables
- POSIX shell behavior
- Git and `git describe`
- JSON and jq
- Docker Official Images for Bash, Alpine Linux, Node.js, and Go

## Sources Consulted

- [Woodpecker: Advanced usage](https://woodpecker-ci.org/docs/usage/advanced-usage)
- [Woodpecker: Workflow syntax](https://woodpecker-ci.org/docs/usage/workflow-syntax)
- [Woodpecker: Environment variables](https://woodpecker-ci.org/docs/usage/environment)
- [Woodpecker: Secrets](https://woodpecker-ci.org/docs/usage/secrets)
- [Woodpecker: Plugins and plugin isolation](https://woodpecker-ci.org/docs/usage/plugins/overview)
- [Woodpecker: Workflows and workspace boundaries](https://woodpecker-ci.org/docs/usage/workflows)
- [Woodpecker: Linter](https://woodpecker-ci.org/docs/usage/linter)
- [Woodpecker: Docker backend](https://woodpecker-ci.org/docs/administration/configuration/backends/docker)
- [Woodpecker: Kubernetes backend](https://woodpecker-ci.org/docs/administration/configuration/backends/kubernetes)
- [Woodpecker: Local backend](https://woodpecker-ci.org/docs/administration/configuration/backends/local)
- [Woodpecker: 3.0 migration notes](https://woodpecker-ci.org/migrations#300)
- [Woodpecker source: global environment parsing](https://github.com/woodpecker-ci/woodpecker/blob/main/server/services/environment/parse.go)
- [Woodpecker source: plugin classification](https://github.com/woodpecker-ci/woodpecker/blob/main/pipeline/frontend/yaml/types/container.go)
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/)
- [YAML 1.1 merge-key type](https://yaml.org/type/merge.html)
- [GNU Bash reference manual](https://www.gnu.org/software/bash/manual/bash.html)
- [Git: `git describe`](https://git-scm.com/docs/git-describe)
- [jq 1.8 manual](https://jqlang.org/manual/)
- [Docker Official Images: Bash manifest](https://github.com/docker-library/official-images/blob/master/library/bash)
- [Bash 5.3 Official Image Dockerfile](https://github.com/tianon/docker-bash/blob/2b927ed0d7d1da8a5ed0cd5fc90213065d502401/5.3/Dockerfile)
- [Docker Official Images: Bash image](https://hub.docker.com/_/bash)
- [Docker Official Images: Alpine image](https://hub.docker.com/_/alpine)
- [Docker Official Images: Node image](https://hub.docker.com/_/node)
- [Docker Official Images: Go manifest](https://github.com/docker-library/official-images/blob/master/library/golang)
- [Alpine Package Keeper documentation](https://docs.alpinelinux.org/user-handbook/0.1a/Working/apk.html)
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [npm configuration environment variables](https://docs.npmjs.com/cli/v11/using-npm/config/)

## Issues Found

- The dynamic handoff example used Bash-only `printf %q` and `source`, but selecting `image: bash:5.3` does not change Woodpecker's default `/bin/sh` command interpreter. Added an explicit `entrypoint` to each affected container step so Woodpecker's Base64-encoded `CI_SCRIPT` is executed by `/usr/local/bin/bash -e`. Also clarified that this runnable image-based example targets container backends; the local backend interprets `image` as a host shell name.
- The minimal `bash:5.3` image does not contain Git, so `git describe` would fail. Added `apk add --no-cache git` before the command.
- The generated file contained ordinary shell assignments. Sourcing them made the values available to the current shell but did not export them to child processes such as `./scripts/package.sh`. Changed the generated lines to `export BUILD_VERSION=...` and `export SOURCE_SHA=...`.
- The jq producer command was invalid YAML because its plain scalar contained `: ` inside shell quotes; shell quoting does not affect YAML parsing. Changed the equivalent jq object expression to `'{sha:$sha,branch:$branch}'`, which contains no forbidden colon-space sequence.
- The post recommended plugin-image filters next to examples that are normal command steps. Woodpecker applies those filters only to plugin steps, and a step with `commands`, `entrypoint`, or `environment` is not classified as a plugin. Clarified that the shown command steps should use event filters and that plugin-image filters belong on commandless plugin steps receiving secrets through `settings`.

## Review Notes

- All eight YAML snippets parse after the corrections. The jq construction and Bash exported-assignment handoff were also exercised with representative values.
- Woodpecker explicitly supports the documented map and sequence merge forms. The map merge key originates in YAML 1.1, and Woodpecker's sequence merge is parser-specific, so the post's portability warning remains important.
- The workflow example is serial by default. If readers add step-level `depends_on`, consumers of the workspace file must explicitly depend on the producer because Woodpecker then uses DAG scheduling.
- All referenced documentation links resolved to the intended current pages. The documented image tags `node:24-alpine`, `bash:5.3`, and `alpine:3.22` exist, Node.js 24 is an LTS line, and Go 1.26 is a current image version for the server-wide substitution example.
