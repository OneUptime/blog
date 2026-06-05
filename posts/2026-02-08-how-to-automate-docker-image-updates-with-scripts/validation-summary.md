# Validation Summary: How to Automate Docker Image Updates with Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine CLI
- Docker Compose
- Watchtower
- Bash scripting
- jq
- Docker Hub API
- GitHub Actions

## Sources Consulted
- Docker CLI reference: `docker inspect`, `docker image inspect`, and Go template formatting: https://docs.docker.com/reference/cli/docker/inspect/ and https://docs.docker.com/engine/cli/formatting/
- Docker image pull reference: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker Compose CLI reference for `pull`, `up`, `ps`, and `images`: https://docs.docker.com/reference/cli/docker/compose/pull/, https://docs.docker.com/reference/cli/docker/compose/up/, https://docs.docker.com/reference/cli/docker/compose/ps/, and https://docs.docker.com/reference/cli/docker/compose/images/
- Docker Compose file reference and obsolete `version` field guidance: https://docs.docker.com/reference/compose-file/ and https://docs.docker.com/reference/compose-file/version-and-name/
- Watchtower arguments, container selection, and notifications documentation: https://containrrr.dev/watchtower/arguments/, https://containrrr.dev/watchtower/container-selection/, and https://containrrr.dev/watchtower/notifications/
- Docker Hub API reference for repository tags: https://docs.docker.com/reference/api/hub/latest/
- GitHub Actions documentation for `GITHUB_TOKEN` permissions: https://docs.github.com/actions/concepts/security/github_token
- Local Docker CLI help output from Docker 29.4.2 and Docker Compose v5.1.3.

## Issues Found
- The single-container update script used `docker inspect` to inspect an image reference. Changed it to `docker image inspect`, which is the specific Docker CLI command for image inspection.
- The same script said it stopped and removed the old container, but it actually stopped and renamed it. Updated the comment to match the behavior.
- The Compose YAML examples included the obsolete top-level `version` property. Removed it to match current Compose Specification guidance.
- The database service used a named volume without declaring it in the Compose example. Added a top-level `volumes` entry for `pg_data`.
- The Compose update script claimed zero-downtime rolling updates, but `docker compose up -d --force-recreate` for a normal single service container can introduce downtime. Updated the comment to describe the actual behavior.
- The Compose health-check loop parsed `docker compose ps --format json` as an object, but Docker Compose outputs a JSON array. Changed the `jq` expression to read the first array element and handle empty health fields.
- The scheduled GitHub Actions workflow pulled images and then attempted to commit `docker-compose.yml`, but pulling images does not modify the compose file. Changed the check step to run the version-bump script and use `git diff` to detect compose-file changes.
- The GitHub Actions workflow created a pull request with `GITHUB_TOKEN` but did not request write permissions or configure a Git commit author. Added `contents: write`, `pull-requests: write`, and Git user configuration.
- The rollback script parsed `docker compose images --format json` as an object instead of an array. Updated the `jq` expression.
- The rollback script attempted to override an image with `IMAGE_OVERRIDE=... docker compose up`, but that environment variable has no effect unless the Compose file references it. Replaced it with a temporary Compose override file that sets the selected service image.

## Review Notes
- The Docker Hub version-bump script is intentionally simple. It can miss releases if the newest stable numeric tag is not in the first page returned by the tags API, and production use should add pagination and image-specific version rules.
- Watchtower configuration and labels are current, but automated updates for stateful services remain risky and should be gated carefully.
