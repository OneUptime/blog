# Validation Summary: How to Remove Persistent Volumes in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker volumes
- Docker Engine API
- Bash
- curl
- jq

## Sources Consulted
- Portainer volume management docs: https://docs.portainer.io/user/docker/volumes
- Portainer remove-volume docs: https://docs.portainer.io/user/docker/volumes/remove
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Docker `docker volume rm` reference: https://docs.docker.com/reference/cli/docker/volume/rm/
- Docker `docker volume prune` reference: https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker Engine API version history: https://docs.docker.com/reference/api/engine/version-history/
- Docker Engine 23.0 release notes: https://docs.docker.com/engine/release-notes/23.0/

## Issues Found
- The post said volumes with no containers listed in Portainer were safe candidates for removal. Portainer’s docs note that external volumes can appear unused because Portainer has limited visibility, so this was changed to an initial-check warning rather than a safety guarantee.
- The prune section said the Portainer API call removes all unused volumes. Current Docker Engine API behavior only prunes anonymous volumes by default on API v1.42+; the post was corrected to explain that named volumes require `all=true`.
- The scripted cleanup example used a static JWT token. Portainer’s current API docs recommend access tokens for API use, so the script was updated to use `X-API-Key` with an access token for automation.
- The volume-listing `jq` expression could fail when `.Volumes` is null or empty. It was updated to `.Volumes[]?` so the example behaves cleanly when no volumes exist.
- The cleanup script depended on `bc` without documenting it. The size conversion was switched to `awk` to avoid that extra dependency.

## Review Notes
Docker’s current documentation is internally inconsistent on volume prune behavior: the CLI reference and Engine/API release notes say only anonymous volumes are pruned by default on API v1.42+, while the general pruning guide still states that all unused volumes are removed by default. The post now follows the more specific current CLI/API references.
