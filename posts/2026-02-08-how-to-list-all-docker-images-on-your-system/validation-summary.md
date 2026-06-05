# Validation Summary: How to List All Docker Images on Your System

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker images
- Docker containers
- Docker Hub API
- Skopeo
- Unix shell utilities

## Sources Consulted
- Docker CLI reference: docker image ls - https://docs.docker.com/reference/cli/docker/image/ls/
- Docker CLI reference: docker image inspect - https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker CLI reference: docker system df - https://docs.docker.com/reference/cli/docker/system/df/
- Docker CLI reference: docker search - https://docs.docker.com/reference/cli/docker/search/
- Docker CLI reference: docker container ls / docker ps - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker object labels documentation - https://docs.docker.com/engine/manage-resources/labels/
- Local Docker CLI help output from Docker client 29.4.2
- Docker Hub API endpoint check for https://hub.docker.com/v2/repositories/library/nginx/tags?page_size=10

## Issues Found
- The basic command comment said `docker images` listed all images. Docker's reference says the default output shows top-level images and hides intermediate and dangling images, so the comment was changed to "List top-level images."
- The post described the Docker image `SIZE` column as compressed size. Docker documents `SIZE` as cumulative image space / virtual size, so the wording was changed to "image size."
- The post stated that `<none>:<none>` entries are build layers forming the history of tagged images. Docker documents `-a` as showing both intermediate layers and dangling images, so the wording was broadened accordingly.
- The definition of dangling images was tightened to match Docker's documentation: dangling images are untagged images not referenced by another image.
- The shell snippet for totaling image sizes piped values such as `245MB` into `bc`, which does not parse Docker's human-readable units. It was replaced with `docker system df`, which is Docker's supported disk usage command and accounts for shared layers.

## Review Notes
Most commands and flags were current and matched Docker CLI documentation, including `docker image ls` aliases, `--filter`, `--format json`, `docker system df -v`, `docker search`, `docker ps --format`, and `docker image inspect --format`. The shell examples for sorting and finding large images are useful approximations, but Docker's own `docker system df` remains the better source for accurate disk usage because image layers can be shared.
