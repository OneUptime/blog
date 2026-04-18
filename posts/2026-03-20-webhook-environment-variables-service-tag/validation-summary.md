# Validation Summary: How to Use Webhook Environment Variables (SERVICE_TAG) in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (container webhooks)
- Docker
- curl (HTTP POST)
- GitHub Actions (CI/CD workflow syntax)
- GitLab CI (pipeline YAML syntax)

## Sources Consulted
- [Portainer Webhooks documentation](https://docs.portainer.io/user/docker/services/webhooks)
- [Portainer 2.33 LTS Stack Webhooks documentation](https://docs.portainer.io/2.33-lts/user/docker/stacks/webhooks)
- [GitHub Actions — actions/checkout](https://github.com/actions/checkout) (v4 is current)
- [GitLab CI/CD predefined variables (CI_COMMIT_SHA)](https://docs.gitlab.com/ee/ci/variables/predefined_variables.html)
- [GitLab CI `only`/`except` keyword](https://docs.gitlab.com/ee/ci/yaml/#only--except)

## Issues Found
No technical issues found. All code examples, commands, and configurations are syntactically correct and functionally accurate:
- Webhook URL format `https://<portainer>/api/webhooks/<uuid>` matches Portainer's actual endpoint.
- The `?tag=<value>` query parameter correctly overrides the container's image tag on redeployment (verified against Portainer docs).
- `curl -X POST` with `--fail` and `-s` flags is valid.
- `actions/checkout@v4` is the current major version.
- `${{ github.sha }}` and `$CI_COMMIT_SHA` are the correct commit SHA variables for GitHub Actions and GitLab CI respectively.

## Review Notes
- Terminology caveat (not a technical error, so left unchanged): The post's title and one section header reference "SERVICE_TAG", but all code examples correctly use the `?tag=` query parameter — which is the parameter name for Portainer **container** webhooks. `SERVICE_TAG` is a convention used with Portainer **service/stack** webhooks (where arbitrary env vars can be passed and referenced in compose files via `${SERVICE_TAG:-stable}`), and that env-var passthrough is a Portainer Business Edition feature. A future revision could clarify this distinction to avoid conflating the two webhook types, but the executable content (curl calls, CI snippets) is correct for container webhooks as described.
- GitLab's `only: main` is legacy but still fully supported; `rules:` is the newer idiom. No change needed.
