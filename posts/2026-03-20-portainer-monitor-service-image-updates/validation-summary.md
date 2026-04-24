# Validation Summary: How to Monitor Service Image Updates in Portainer on Swarm - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker CLI
- Container image tags and digests
- Portainer service webhooks

## Sources Consulted
- Portainer Services documentation: https://docs.portainer.io/user/docker/services
- Portainer Swarm Setup documentation: https://docs.portainer.io/user/docker/swarm/setup
- Portainer FAQ on the image update indicator: https://docs.portainer.io/faqs/troubleshooting/how-does-the-image-update-notification-icon-work
- Portainer service webhooks documentation: https://docs.portainer.io/user/docker/services/webhooks
- Docker Swarm services documentation: https://docs.docker.com/engine/swarm/services/
- Docker `docker service update` CLI reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker image digests documentation: https://docs.docker.com/dhi/core-concepts/digests/
- Watchtower documentation: https://containrrr.dev/watchtower/
- Watchtower GitHub README: https://github.com/containrrr/watchtower

## Issues Found
- The post claimed Portainer BE exposes service image update notifications through `Settings -> Notifications`. Portainer's documented feature for this use case is the BE image up-to-date indicator under `Swarm -> Setup`, so the section was corrected to describe the supported feature and the correct UI path.
- The post claimed `docker service update --force` re-pulls the latest image for the same tag. Docker's Swarm docs state that image updates require `docker service update --image ...`; `--force` only recreates tasks. The CLI and UI guidance were corrected accordingly.
- The Watchtower section presented Watchtower as a way to automatically update Swarm services. Watchtower's own documentation is container-oriented rather than Swarm-service oriented, so that section was replaced with Portainer service webhooks, which Portainer officially documents for redeploying services and optionally changing tags.
- The tag-versus-digest section described release tags as "fully pinned". That was corrected to note that tags remain mutable unless the registry enforces immutability, while digests are the immutable option.
- The production update script used `docker service update --force`, which would not refresh image digests. The script was corrected to map each service to the tag it should track and to update with `--image`.

## Review Notes
- For private registries, CLI-driven `docker service update --image ...` workflows may also require `--with-registry-auth` depending on how registry credentials are distributed to Swarm workers.
- Portainer's image status indicator compares local and remote digests for the same `image:tag` and caches results; the manual CLI comparison remains useful when you want to verify the exact digest yourself.
