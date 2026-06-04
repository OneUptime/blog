# Validation Summary: How to Run GitLab CE in Docker (Self-Hosted)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab Community Edition
- Docker Engine
- Docker Compose
- GitLab Runner
- GitLab CI/CD
- Let's Encrypt
- GitLab backup and restore
- GitLab health checks

## Sources Consulted
- GitLab Docs: Install GitLab in a Docker container - https://docs.gitlab.com/install/docker/installation/
- GitLab Docs: Registering runners - https://docs.gitlab.com/runner/register/
- GitLab Docs: Back up GitLab running in a Docker container - https://docs.gitlab.com/install/docker/backup/
- GitLab Docs: Restore GitLab - https://docs.gitlab.com/administration/backup_restore/restore_gitlab/
- GitLab Docs: Health check - https://docs.gitlab.com/administration/monitoring/health_check/
- GitLab Docs: Running GitLab in a memory-constrained environment - https://docs.gitlab.com/omnibus/settings/memory_constrained_envs/
- GitLab Docs: Upgrade Docker instances - https://docs.gitlab.com/update/docker/
- GitLab Docs: Plan your upgrade path - https://docs.gitlab.com/update/upgrade_paths/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it because Docker Compose now uses the Compose Specification and treats `version` as only informative while emitting an obsolete-field warning.
- The GitLab Runner registration command used `--registration-token`, but runner registration tokens are deprecated and disabled by default in GitLab 17.0 and later. Updated the command to use `--token YOUR_RUNNER_AUTHENTICATION_TOKEN` and changed the surrounding text to instruct readers to create a runner and use the `glrt-` authentication token.
- The runner service referenced a `runner-config` named volume without declaring it in the top-level `volumes` section. Added `runner-config:` so the Compose file remains valid when the runner snippet is included.
- The `/-/health` monitoring command piped a plaintext response into `python3 -m json.tool`, which would fail. Removed the JSON formatter for that endpoint.
- The readiness command claimed to check all sub-services but used `/-/readiness` without `all=1`. Updated it to `/-/readiness?all=1`, which is the documented form for dependent service checks.

## Review Notes
- The post pins GitLab CE and GitLab Runner to 17.4.x. That is valid for a reproducible example, but readers should choose a currently supported patch release and follow GitLab's required upgrade stops before upgrading.
- The backup section correctly notes that GitLab data backups do not include secrets/configuration, but production operators should also verify restore compatibility against the exact GitLab version and edition used to create the backup.
