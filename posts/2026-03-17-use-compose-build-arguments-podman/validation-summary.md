# Validation Summary: How to Use Compose Build Arguments with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- podman-compose
- Compose Specification
- Containerfile/Dockerfile ARG instructions
- YAML
- npm

## Sources Consulted
- Podman documentation: podman compose provider behavior, https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- containers/podman-compose README and implementation: Compose Spec implementation, default image naming, build args, and --no-cache support, https://github.com/containers/podman-compose
- Docker Compose Build Specification: build.args mapping and list syntax, https://docs.docker.com/reference/compose-file/build/
- Docker Compose file reference: obsolete top-level version field and name field, https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose variable interpolation documentation: shell variables, .env files, and ${VAR:-default} syntax, https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Dockerfile reference: ARG usage, ARG before FROM, ARG scope, ENV and LABEL usage, https://docs.docker.com/reference/dockerfile/
- npm ci documentation: current --omit option, https://docs.npmjs.com/cli/v11/commands/npm-ci/

## Issues Found
- The Compose examples used `version: "3.8"`. The current Compose Specification keeps the top-level `version` field only for backward compatibility and marks it obsolete, so I removed it from the examples.
- The first inspect command assumed the generated image name `project_app`, but the example did not define the project name. I added `name: project` to the Compose snippet so the podman-compose default image tag matches the inspect command.
- The multi-stage Node example used `npm ci --only=${APP_ENV}`. Current npm documentation describes `--omit=dev` for omitting development dependencies, so I changed the build argument to `NPM_OMIT` and the command to `npm ci --omit=${NPM_OMIT}`.
- The list syntax example mixed YAML mapping and sequence items under the same `args` key, which is invalid YAML and not valid Compose syntax. I split it into separate map syntax and list syntax examples.

## Review Notes
- `podman` and `podman-compose` were not installed locally, so CLI behavior was checked against official Podman documentation, the podman-compose 1.5.0 package source, and official Compose documentation. YAML snippets were parsed locally after the edits.
