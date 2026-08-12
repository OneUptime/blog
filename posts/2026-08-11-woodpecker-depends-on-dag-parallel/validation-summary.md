# Validation Summary: Build the Intended Woodpecker DAG with `depends_on`

## Status
validated

## Post Type
Technical guide / configuration tutorial

## Technologies Covered

- Woodpecker CI 3.x (reviewed against Woodpecker 3.17.0)
- Woodpecker YAML workflow configuration
- Step and workflow dependency graphs with `depends_on`
- Topological-stage scheduling and parallel execution
- Conditional execution with `when`, `path`, and `status`
- Woodpecker failure handling with `failure: ignore`
- `woodpecker-cli` linting and local execution
- Docker-based Node.js and Alpine workflow steps

## Sources Consulted

- [Woodpecker workflow syntax](https://woodpecker-ci.org/docs/usage/workflow-syntax) — serial execution, shared workspace, `when`, `status`, `failure`, and step-level `depends_on` behavior.
- [Woodpecker workflow flow control](https://woodpecker-ci.org/docs/usage/workflows#flow-control) — workflow-level dependencies, filename-derived names, separate agents, and workspace isolation.
- [Woodpecker optional dependencies](https://woodpecker-ci.org/docs/usage/workflows#optional-dependencies) — mixed string/object dependency syntax and filtered dependency behavior.
- [Woodpecker local pipeline execution](https://woodpecker-ci.org/docs/usage/local-execution) — `woodpecker-cli exec` syntax and `--backend-engine docker`.
- [Woodpecker linter](https://woodpecker-ci.org/docs/usage/linter) and [CLI reference](https://woodpecker-ci.org/docs/cli) — `woodpecker-cli lint`, accepted positional workflow paths, and current CLI options.
- [Woodpecker 3.0 migration notes](https://woodpecker-ci.org/migrations#300) — removal of `steps.[name].group` in favor of `steps.[name].depends_on`.
- [Woodpecker 3.15.0 release notes](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.15.0) — introduction of optional `depends_on` entries for workflows and steps.
- [Woodpecker 3.17.0 release notes](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.17.0) — current release and optional-dependency DAG fixes.
- [Woodpecker 3.17 DAG compiler](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/frontend/yaml/compiler/dag.go) and [workflow runtime](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/runtime/workflow.go) — compilation into topological stages, parallel execution within a stage, and sequential barriers between stages.
- [Official Node.js releases](https://nodejs.org/en/about/previous-releases), [Node Docker image](https://hub.docker.com/_/node), [Alpine releases](https://alpinelinux.org/releases/), and [Alpine Docker image](https://hub.docker.com/_/alpine) — validation of Node 24 and the `node:24-alpine` and `alpine:3.22` image references.

## Issues Found

1. **The post described per-node readiness instead of Woodpecker's stage barriers.** It originally said that `package` waited only for `unit-test` and did not wait for the unrelated root `lint`. Woodpecker 3.17 actually compiles the DAG into topological stages and runs those stages sequentially. In that example, `lint` and `unit-test` share the first stage, and `package` is in the second stage, so the second stage is not considered until both roots finish. Updated the introduction, one-line example, dependency guidance, status explanation, validation guidance, checklist, and conclusion to distinguish declared graph edges from incidental waits caused by stage barriers.
2. **The path-filter example omitted its applicable events.** Current Woodpecker evaluates `path` conditions only for `push` and `pull_request` events; on other event types, the path predicate is skipped, so the step can still run regardless of changed files. The 3.17 linter also warns when the condition lacks an event filter. Added `event: [push, pull_request]` to the same `when` condition so the example accurately means “only when dependency files change” and lints cleanly.
3. **The optional-dependency version was underspecified.** Optional dependency objects were introduced in Woodpecker 3.15. Changed “Current Woodpecker supports” to “Woodpecker 3.15 and later support” so readers on earlier 3.x releases do not try unsupported syntax.

## Review Notes

- The official Woodpecker 3.17.0 CLI accepted representative versions of the serial workflow, explicit root/fan-in DAG, chained dependencies, status filter, workflow-level dependencies, and mixed required/optional dependency syntax. The documented `lint` and `exec --backend-engine docker` commands are current; local Docker execution requires access to a Docker daemon.
- Generic examples without an event filter are valid but can produce Woodpecker's advisory “add an event filter” linter warning. They remain event-agnostic because adding a global trigger would change the scope of examples whose purpose is DAG structure.
- `example.com/security/scanner:2` and `example.com/ops/notifier:1` are clearly illustrative placeholder images and must be replaced with real organization-specific images in an executable workflow.
- Steps in one workflow do share a persisted workspace, so the warning about concurrent `npm ci` operations mutating the same `node_modules` directory is correct. Separate workflows run on separate agents, share no files, and need external artifact storage or an immutable published package/image to exchange outputs.
