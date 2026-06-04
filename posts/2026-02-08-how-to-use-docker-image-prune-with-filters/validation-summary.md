# Validation Summary: How to Use Docker Image Prune with Filters

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker CLI
- Docker images
- Docker image pruning
- Docker labels
- Dockerfile
- Shell scripts and cron

## Sources Consulted
- Docker CLI reference: docker image prune - https://docs.docker.com/reference/cli/docker/image/prune/
- Docker resource pruning guide - https://docs.docker.com/engine/manage-resources/pruning/
- Docker CLI reference: docker image ls - https://docs.docker.com/reference/cli/docker/image/ls/
- Docker CLI reference: docker system df - https://docs.docker.com/reference/cli/docker/system/df/
- Docker CLI reference: docker builder prune - https://docs.docker.com/reference/cli/docker/builder/prune/
- Docker object labels documentation - https://docs.docker.com/engine/manage-resources/labels/
- Dockerfile reference - https://docs.docker.com/reference/builder
- Local Docker CLI help output for docker image prune, docker images, docker rmi, docker system df, and docker builder prune.

## Issues Found
- The introduction said every pull brings down a full image. Docker images are layer-based, and pulls download layers that are not already present locally. Changed this to say pulls bring down any layers not already present locally.
- The `until` explanation said the time was based on when the image was created, "built or pulled." Docker documents `until` as matching images created before a timestamp; pulled images retain the image creation timestamp from their metadata rather than using the local pull time. Updated the explanation and example accordingly.
- The registry cleanup example used `docker images registry.example.com/* -q`, but Docker documents the positional `REPOSITORY[:TAG]` argument as an exact match. Changed it to use the documented `reference` filter pattern: `docker images --filter "reference=registry.example.com/*" -q`.

## Review Notes
The remaining Docker prune filters, label examples, `docker system df` usage, build cache pruning commands, Dockerfile label syntax, and cron examples are technically valid. The shell examples are suitable for Linux/GNU environments; portability to non-GNU systems could be improved in a future editorial pass, but no technical correction was required for this post.
