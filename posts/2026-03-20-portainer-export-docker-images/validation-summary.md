# Validation Summary: How to Export Docker Images from Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker Engine API
- Bash
- curl
- gzip

## Sources Consulted
- Portainer image export documentation: https://docs.portainer.io/user/docker/images/export
- Portainer API documentation overview: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer requirements and default API/UI port guidance: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer official API description in the source repository: https://raw.githubusercontent.com/portainer/portainer/develop/api/api-description.md
- Docker CLI reference for `docker image save`: https://docs.docker.com/reference/cli/docker/image/save/
- Docker CLI reference for `docker image load`: https://docs.docker.com/reference/cli/docker/image/load/
- Docker CLI reference for `docker image ls`: https://docs.docker.com/reference/cli/docker/image/ls/
- Docker Engine API reference overview: https://docs.docker.com/reference/api/engine/
- Docker Engine API reference for image export endpoints: https://docs.docker.com/reference/api/engine/version/v1.24/

## Issues Found
- The Portainer API example used a path-based image export URL and Python `urllib.parse.quote()` in a way that would not safely handle image names containing `/`. I changed it to use Portainer's documented Docker API proxy path with `GET /images/get` and `curl --data-urlencode`, which correctly handles repository names and tags.
- The Portainer API example used `http://portainer:9000` as the sample base URL. I updated it to `https://portainer.example.com:9443`, which matches Portainer's current default UI/API port guidance while still being clearly a placeholder.
- The bulk CLI export example used `docker images --filter "reference=myorg/*"` and plain `xargs`, which was too loose and could invoke `docker save` with no arguments. I changed it to `reference=myorg/*:*` and added a guard so the export only runs when matching images are found.
- The verification section incorrectly described `docker load` as a dry run and immediately removed the image afterward. `docker load` actually imports the image, so I replaced that with an optional functional test that loads and then inspects the image instead of deleting it.
- The tar inspection comments listed a fixed `config.json` filename, which is not reliable for Docker image archives. I changed the notes to describe the contents more generically and accurately.
- The export size expectations section used hard-coded size examples that are image-version- and platform-dependent and would become stale. I replaced them with accurate guidance that matches Docker's documented behavior.
- I fixed one shell quoting issue in the bulk export script so the final `du` command handles paths more safely.

## Review Notes
- The Portainer UI export flow is technically valid and is documented in current Portainer docs.
- Portainer's Docker resource automation works through the `/api/endpoints/{id}/docker` reverse-proxy path rather than separate documented image-export endpoints in Swagger.
- `docker save` and `docker load` remain current and non-deprecated. `docker load` supports compressed archives such as `.tar.gz`.
