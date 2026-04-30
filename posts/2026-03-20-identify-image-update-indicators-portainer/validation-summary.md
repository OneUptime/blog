# Validation Summary: How to Identify Image Update Indicators in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker images
- Container registries

## Sources Consulted
- Portainer Images: https://docs.portainer.io/user/docker/images
- Portainer Pull an image: https://docs.portainer.io/user/docker/images/pull
- Portainer Build a new image: https://docs.portainer.io/user/docker/images/build
- Portainer Export an image: https://docs.portainer.io/user/docker/images/export
- Portainer FAQ, "How does the image update notification icon work?": https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-does-the-image-update-notification-icon-work
- Docker CLI reference, `docker image pull`: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker CLI reference, `docker image save`: https://docs.docker.com/reference/cli/docker/image/save/
- Docker CLI reference, `docker image load`: https://docs.docker.com/reference/cli/docker/image/load/
- Docker CLI reference, `docker image prune`: https://docs.docker.com/reference/cli/docker/image/prune/
- Docker CLI reference, `docker image rm`: https://docs.docker.com/reference/cli/docker/image/rm/
- Docker CLI reference, `docker image tag`: https://docs.docker.com/engine/reference/commandline/tag/
- Docker CLI reference, `docker image push`: https://docs.docker.com/engine/reference/commandline/image_push/
- Docker CLI reference, `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI reference, `docker system df`: https://docs.docker.com/reference/cli/docker/system/df/
- Docker Build overview: https://docs.docker.com/build/concepts/overview/

## Issues Found
- The introduction overstated what Portainer's `Images` area covers and did not explain where image update indicators actually appear. I corrected this to match Portainer's documentation: the `Images` section is for listing and image operations, while update indicators appear next to containers, stacks, and services.
- The Portainer UI paths were slightly inaccurate. I updated the pull flow to the documented `Images` screen workflow and changed `Images > Build image` to `Images > Build a new image`.
- The original `docker pull nginx:latest 2>&1 | grep -E "Pull complete|up to date"` example was not a reliable way to determine whether Portainer would flag an image update, and it did not reflect Portainer's documented digest comparison logic. I replaced it with commands to inspect the local image digest and creation date, plus a plain `docker pull` re-check.

## Review Notes
- The remaining Docker CLI examples are syntactically correct and current.
- `docker build` remains valid shorthand, although Docker now uses BuildKit/Buildx by default for modern builds.
- Portainer's web-based build flow has additional constraints that differ from raw CLI builds, such as limits around host-path `ADD` and `COPY`, but none of the retained examples depend on unsupported behavior.
