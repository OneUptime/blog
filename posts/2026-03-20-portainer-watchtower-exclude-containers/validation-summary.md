# Validation Summary: How to Exclude Containers from Watchtower Updates via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Watchtower
- Portainer
- Docker
- Docker Compose / stack YAML
- Bash
- `jq`

## Sources Consulted
- Watchtower arguments documentation: https://containrrr.dev/watchtower/arguments/
- Watchtower container selection documentation: https://containrrr.dev/watchtower/container-selection/
- Watchtower self-updating documentation: https://containrrr.dev/watchtower/updating/
- Watchtower GitHub repository README: https://github.com/containrrr/watchtower
- Watchtower GitHub releases page: https://github.com/containrrr/watchtower/releases
- Portainer stack editing documentation: https://docs.portainer.io/sts/user/docker/stacks/edit

## Issues Found
- The post used a non-existent Watchtower `--ignore` flag for name-based exclusion. I replaced this with the supported `WATCHTOWER_DISABLE_CONTAINERS` configuration documented by Watchtower.
- Multiple Watchtower stack snippets omitted the required `/var/run/docker.sock` bind mount. I added the socket mount to the Watchtower service examples so the configurations would actually work.
- The include-list example was described as an “environment approach with a startup script” even though it used positional container-name arguments. I corrected the explanation to match Watchtower’s documented behavior.
- The name-based examples implied service names rather than actual container names. I clarified that Watchtower matches real container names.
- The Step 2 recreation example was too broad for Portainer-managed stacks. I clarified that manual stop/remove/recreate is for standalone containers, while Portainer-managed stacks should be edited and redeployed through Portainer.
- The verification section included `docker exec watchtower sh -c 'kill -USR1 1'`, but current upstream documentation and source do not document or implement a SIGUSR1 debug toggle. I removed that command and kept the supported `--run-once --debug` approach.
- The audit script only inspected running containers and used a broader-than-needed `jq` selector. I updated it to inspect all containers with `docker ps -a` and use `.[0]` for the single-container inspect result.

## Review Notes
- The upstream Watchtower repository currently states that the project is no longer maintained and that it is not recommended for commercial or production environments. The post remains technically useful for existing Watchtower deployments, but that upstream status is worth keeping in mind.
- `containrrr/watchtower:1.7.1` is still the latest upstream release as of 2026-04-24.
