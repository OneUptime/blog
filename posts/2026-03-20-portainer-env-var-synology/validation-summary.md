# Validation Summary: How to Fix Environment Variable Issues on Synology with Portainer - Env Var

## Status
validated

## Post Type
Guide

## Technologies Covered
- Synology DSM / Container Manager
- Docker Engine
- Docker Compose
- Portainer
- Environment files (`.env`, `env_file`, `stack.env`)

## Sources Consulted
- Docker Compose interpolation and `.env` syntax: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Compose `env_file` reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose top-level `version` element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker Compose `config` command reference: https://docs.docker.com/reference/cli/docker/compose/config/
- Docker Compose secrets guidance: https://docs.docker.com/compose/how-tos/use-secrets/
- Portainer add stack documentation: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer FAQ on `.env` vs `stack.env`: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Archived Portainer requirements matrix showing older Docker compatibility: https://docs.portainer.io/2.21/start/requirements-and-prerequisites
- Synology Container Manager overview: https://www.synology.com/en-global/dsm/feature/container-manager
- Synology DSM 7.2 User Guide: https://global.download.synology.com/download/Document/Software/UserGuide/Os/DSM/7.2/enu/Syno_UsersGuide_NAServer_7_2_enu.pdf

## Issues Found
- The introduction and Synology environment section incorrectly described DSM as running Docker in a "compatibility layer". I corrected this to refer to Synology's Docker package / Container Manager and clarified the filesystem-path behavior that is actually relevant to the examples.
- The SSH example used `admin@synology-ip`, which is unreliable because the built-in `admin` account is commonly disabled. I changed it to `your-admin-user@synology-ip`.
- The `.env` example was technically wrong for values containing `$`. Docker Compose applies interpolation to unquoted and double-quoted env-file values, so `DB_PASSWORD=my$ecret...` could be altered. I fixed the sample by single-quoting the values that must stay literal.
- The Compose example used top-level `version: "3.8"`, which Docker now documents as obsolete. I removed it.
- The post implied that values loaded via service `env_file` could then be referenced with `${DB_PASSWORD}` in the Compose file. That is not how Compose works. I corrected the section to explain that `env_file` passes variables to the container, while Compose-time substitution must come from Portainer stack variables or a Compose `.env` / `--env-file`.
- The Step 5 code block was labeled as Bash even though it contained Compose YAML, and it omitted Portainer's documented `stack.env` behavior for Docker Standalone. I converted it to YAML and updated it to match Portainer's current documentation.
- The CRLF detection note was inaccurate. `cat -A` shows `^M$` for CRLF line endings, not just `^` at line endings. I corrected the explanation, tightened the `sed` command to remove `\r` only at the end of each line, and restored `0600` permissions after the fallback `tr`/`mv` workflow.
- The container verification commands used `echo`, which is less reliable for values containing spaces or special characters and counted an extra newline when piping to `wc -c`. I changed these to `printf` so the examples reflect the actual variable values.
- The DSM compatibility section incorrectly suggested `portainer/portainer-ce:2.19.5` as a fix for older Docker 20.x environments. Portainer's own requirements matrix shows 2.19.5 was validated on Docker 23.x/24.x, while older 2.18.x releases were the ones validated on Docker 20.10.x. I replaced the incorrect pin with version-matrix guidance.
- The `docker compose config` examples used the `-f` and `--env-file` flags in the wrong position. I corrected them to the documented CLI syntax.
- The conclusion recommended storing sensitive values in environment variables. Docker's guidance is to prefer secrets for sensitive data, so I corrected the conclusion accordingly.

## Review Notes
- The `env_file: /volume1/docker/myapp/.env` example is valid for Docker Compose, but Docker warns that absolute `env_file` paths are not portable.
- Portainer documents `stack.env` support for Docker Standalone (and Podman), not Docker Swarm. The updated post now scopes the main stack example to Docker Standalone, which matches the Synology use case.
- Docker was not installed in the local review environment, so command validation was done against the official Docker CLI references rather than local `--help` output.
