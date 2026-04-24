# Validation Summary: How to Use .env Files with Stacks in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- Docker Compose environment variable interpolation
- Compose `env_file` configuration
- `.env` and `.gitignore` conventions

## Sources Consulted
- Portainer stack deployment documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer FAQ on `.env` vs `stack.env`: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Docker Compose variable interpolation documentation: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Compose services reference for `env_file`: https://docs.docker.com/reference/compose-file/services/#env_file
- Docker Compose environment variable precedence: https://docs.docker.com/compose/how-tos/environment-variables/envvars-precedence/

## Issues Found
- The post treated repository `.env` files as a general Portainer stack mechanism. Updated the wording to distinguish Docker Standalone from Docker Swarm, because Docker's official docs state `.env` substitution is a Docker Compose CLI feature and is not supported by `docker stack deploy`.
- The Git-based stack section said Portainer UI variables override repository `.env` values. Replaced that claim with safer, documented guidance to keep secrets out of Git and define them in Portainer, because the official Portainer docs do not document that override behavior directly.
- The `env_file` section implied the pattern works generically in Portainer. Added the Docker Swarm limitation and clarified that `env_file` paths are resolved from the Compose file's parent folder, matching Docker's Compose file reference and Portainer's Swarm guidance.
- The Compose example included the top-level `version: "3.8"` field. Removed it because Docker's current Compose documentation treats `version` as obsolete.
- The Portainer workflow used an outdated "Advanced mode paste" process and instructed readers to strip comments and empty values. Updated it to Portainer's current documented flow using **Load variables from .env file**.
- The verification section used a brittle grep-based command and did not consistently apply the selected env file. Replaced it with the documented `docker compose --env-file .env.production config --environment` check.
- The `.gitignore` advice conflicted with the earlier option of committing a non-secret `.env`. Adjusted the example so `.env` is only ignored when it actually contains secrets.
- The conclusion incorrectly described `.env.example` as if it were a source of runtime defaults. Corrected it to position `.env.example` as a committed template rather than a file consumed at deployment time.

## Review Notes
- The article is now technically sound, but readers should still understand that Portainer's stack environment-variable behavior differs by target environment. Docker Standalone stacks can use Compose-style `.env` interpolation, while Docker Swarm stacks rely on Portainer-managed variables and do not get Docker Compose CLI `.env` substitution.
- Docker is not installed in this workspace, so the documented `docker compose` commands were validated against official documentation rather than executed locally.
