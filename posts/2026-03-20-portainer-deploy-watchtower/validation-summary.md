# Validation Summary: How to Deploy Watchtower Alongside Portainer - Part 2

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Portainer stacks
- Watchtower
- Docker and Docker Compose syntax
- Docker registries and `docker login`
- Slack webhook notifications
- SMTP email notifications
- HTTP API triggering with `curl`

## Sources Consulted
- Watchtower arguments documentation: https://containrrr.dev/watchtower/arguments/
- Watchtower notifications documentation: https://containrrr.dev/watchtower/notifications/
- Watchtower container selection documentation: https://containrrr.dev/watchtower/container-selection/
- Watchtower private registries documentation: https://containrrr.dev/watchtower/private-registries/
- Watchtower HTTP API mode documentation: https://containrrr.dev/watchtower/http-api-mode/
- Docker CLI `docker login` reference: https://docs.docker.com/reference/cli/docker/login/
- Portainer stack creation documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Docker standalone update documentation: https://docs.portainer.io/start/upgrade/docker

## Issues Found
1. **Incorrect explanation for `WATCHTOWER_ROLLING_RESTART`.** The post set `WATCHTOWER_ROLLING_RESTART: "false"` but described rolling restarts and claimed no downtime for single containers. Updated the comment to match the actual behavior: rolling restart is disabled and updated containers restart together.
2. **Private registry login example used a weaker credential pattern and a host-specific mount path.** Replaced `docker login ... -p password` with the documented `--password-stdin` approach from Docker, and changed the mounted Docker config path from `/root/.docker/config.json` to the generic `<PATH_TO_HOME_DIR>/.docker/config.json`, matching Watchtower's private-registry guidance.
3. **Watchtower Docker config mount target did not match the documented default lookup path.** Changed the container mount target from `/root/.docker/config.json` plus `DOCKER_CONFIG` to the documented `/config.json` location so the example works without extra environment configuration.
4. **Portainer exclusion example was partially incorrect and risky.** The prose implied a running container could be updated in place, the shell example had a broken line continuation after the `--label` flag, and the image reference used `:latest`, which could unintentionally upgrade Portainer while trying to exclude it. Updated the text to say the container must be recreated, fixed the shell syntax, and changed the example to reuse the reader's current Portainer image and tag.
5. **HTTP API trigger example would not work as written.** The original `curl` command base64-encoded the token even though Watchtower expects a plain bearer token, and it omitted the required prerequisites for API mode. Updated the example to use `Authorization: Bearer mytoken` and noted the need for `--http-api-update`, `WATCHTOWER_HTTP_API_TOKEN`, published port `8080`, and `--http-api-periodic-polls` if periodic checks should continue.

## Review Notes
- The post is technically relevant and salvageable; after the corrections above, the examples align with current official Watchtower, Docker, and Portainer documentation.
- The Slack and email notification variables shown are legacy Watchtower notification settings, but they are still officially supported and are converted internally to Shoutrrr URLs for backward compatibility.
- Watchtower monitor-only mode still performs image pulls when it needs to compare digests; the post is correct that it does not restart containers in this mode, but readers should still expect registry access.
