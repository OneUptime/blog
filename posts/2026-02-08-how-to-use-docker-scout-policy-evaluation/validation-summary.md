# Validation Summary: How to Use Docker Scout Policy Evaluation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Scout
- Docker Scout Policy Evaluation
- Docker Scout CLI
- Docker Scout GitHub Action
- GitHub Actions
- Dockerfile / Node.js container builds

## Sources Consulted
- Docker Scout Policy Evaluation documentation: https://docs.docker.com/scout/policy/
- Docker Scout policy CLI reference: https://docs.docker.com/reference/cli/docker/scout/policy/
- Docker Scout policy configuration documentation: https://docs.docker.com/scout/policy/configure/
- Docker Scout policy status documentation: https://docs.docker.com/scout/policy/view/
- Docker Scout CI policy evaluation documentation: https://docs.docker.com/scout/policy/ci/
- Docker Scout CVEs CLI reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker Scout GitHub Action documentation: https://github.com/docker/scout-action

## Issues Found
- The post claimed `docker scout policy` could list all policies with `docker scout policy` or `docker scout policy --org myorg`. Updated the examples to evaluate a specific image or repository, which matches the CLI reference usage.
- The post used unsupported `docker scout policy` flags such as `--format json`, `--repo`, and `--env`. Replaced them with documented options such as `--output`, repository arguments, and `--to-env`.
- The post described custom policies as arbitrary JSON configuration files with unsupported rule types such as `vulnerability-age`, `base-image-allowlist`, and `package-denylist`. Rewrote those examples to describe Docker Scout Dashboard configuration and supported policy types.
- The GitHub Actions example used `command: policy` for `docker/scout-action`, which is not a supported action command. Updated it to the documented `compare` workflow with `to-env`, `organization`, and `exit-on: policy`.
- The policy gate script parsed text output for `FAILED`. Updated it to use the documented `--exit-code` behavior, where Docker Scout returns exit code `2` when policies are not met.
- The environment section implied environment-specific policy files. Updated it to describe Docker Scout environments as comparison baselines.
- The report generation example assumed JSON output from `docker scout policy`. Replaced it with the documented `--output` report option.
- Updated the Node.js Dockerfile example from `npm ci --production` to `npm ci --omit=dev`.

## Review Notes
Docker Scout policy evaluation is documented as experimental, so command behavior may change between releases. The post now avoids inventing policy JSON schemas and uses placeholders for policy names where Docker's public docs do not define stable policy identifiers.
