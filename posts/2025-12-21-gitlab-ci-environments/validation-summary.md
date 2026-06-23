# Validation Summary: How to Use Environments in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml` pipeline configuration)
- GitLab Environments (static, dynamic, protected, tiers)
- Deployment workflows (review apps, staging, production)
- Kubernetes (`kubectl`, GitLab Kubernetes integration)
- Docker (build/push in CI)

## Sources Consulted
- GitLab CI/CD YAML syntax reference — `environment` keyword (`name`, `url`, `on_stop`, `auto_stop_in`, `action`, `deployment_tier`, `kubernetes`): https://docs.gitlab.com/ci/yaml/#environment
- GitLab `environment:action` valid values (start, prepare, stop, verify, access): https://docs.gitlab.com/ci/yaml/#environmentaction
- GitLab deprecated keywords (`environment:kubernetes:namespace`): https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- GitLab resource_group / `resource_group` keyword: https://docs.gitlab.com/ci/yaml/#resource_group
- GitLab protected environments: https://docs.gitlab.com/ci/environments/protected_environments/

## Issues Found
- **Incorrect `action` in the rollback job** (Deployment Tracking and Rollback section): the `rollback_production` job set `environment: action: stop`. `action: stop` shuts the environment down and triggers any `on_stop` cleanup job — it does *not* redeploy. A rollback redeploys a previous version, which is a deployment and must use the default `start` action. **Fix:** removed `action: stop` so the job uses the default `start` action, and added `url: https://example.com` to match the corresponding production deployment job. This makes the rollback correctly register as a deployment to the production environment.

## Review Notes
- All other `environment` keywords used are valid and current: `name`, `url`, `on_stop`, `auto_stop_in` (human-readable durations like `1 week` / `3 days` are valid), `action: stop` (correctly used in the `stop_review` cleanup jobs), `deployment_tier`, and `resource_group`.
- The listed deployment tiers (production, staging, testing, development, other) are accurate.
- `environment:kubernetes:namespace` (Kubernetes Integration section) is still a valid keyword and works, but per GitLab docs using it directly under `kubernetes` is now deprecated in favor of configuring the connection via the GitLab agent for Kubernetes. The certificate-based Kubernetes cluster integration was deprecated in GitLab 14.5. The snippet remains functional for backwards compatibility; readers on newer setups should prefer the GitLab agent. Left unchanged since the syntax is not incorrect.
- Mixing `only` and `rules` across different jobs in the post is fine (they are not combined within the same job), though `rules` is the modern recommended approach over `only`/`except`.
