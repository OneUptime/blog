# Validation Summary: How to Use Docker Scout Recommendations to Fix Vulnerabilities

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Scout CLI
- Docker Scout GitHub Action
- Dockerfiles
- Alpine apk
- Debian apt
- npm audit and npm ci
- GitHub Actions
- jq / shell scripting

## Sources Consulted
- Docker Scout recommendations CLI reference: https://docs.docker.com/reference/cli/docker/scout/recommendations/
- Docker Scout CVEs CLI reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker Scout compare CLI reference: https://docs.docker.com/reference/cli/docker/scout/compare/
- Docker Scout remediation documentation: https://docs.docker.com/scout/policy/remediation/
- Docker Scout GitHub Actions integration: https://docs.docker.com/scout/integrations/ci/gha/
- Docker Scout GitHub Action documentation: https://github.com/docker/scout-action
- npm ci documentation: https://docs.npmjs.com/cli/commands/npm-ci/

## Issues Found
- The post claimed Docker Scout Recommendations provide package upgrades and configuration changes. Current Docker documentation describes the CLI recommendations command as focused on base image refresh/update recommendations, so the introduction and recommendation type descriptions were narrowed to base image recommendations plus separate CVE scanning.
- Several examples used `docker scout recommendations --format json`, but the official CLI reference does not document a `--format` option for `docker scout recommendations`. These examples now use supported text output and `--output`.
- Several examples used `docker scout cves --format json` and jq queries against undocumented fields. The official `docker scout cves` formats are `packages`, `sarif`, `spdx`, `gitlab`, `markdown`, `sbom`, and `only-packages`, so the examples were changed to supported text, markdown, and `only-packages` output.
- The GitHub Actions workflow parsed undocumented recommendation JSON fields and rewrote the first Dockerfile `FROM` line automatically. It was replaced with the official `docker/scout-action@v1` recommendations command.
- `npm ci --production` was replaced with `npm ci --omit=dev`, matching current npm guidance for omitting development dependencies.
- The tracking script saved Markdown files but initially had JSON-oriented parsing assumptions after correction. It now uses `.md` filenames consistently.

## Review Notes
Docker Scout's guided remediation and dashboard/GitHub integration can automate base image remediation more directly than the CLI examples shown here, but the post now avoids unsupported CLI flags and undocumented JSON schemas.
