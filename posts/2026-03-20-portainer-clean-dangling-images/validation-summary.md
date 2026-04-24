# Validation Summary: How to Clean Up Dangling Images in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker BuildKit and build cache
- Bash
- cron
- GitHub Actions

## Sources Consulted
- Docker CLI reference: `docker image ls` - https://docs.docker.com/reference/cli/docker/image/ls/
- Docker CLI reference: `docker image prune` - https://docs.docker.com/reference/cli/docker/image/prune/
- Docker docs: Prune unused Docker objects - https://docs.docker.com/engine/manage-resources/pruning/
- Docker CLI reference: `docker system df` - https://docs.docker.com/reference/cli/docker/system/df/
- Docker CLI reference: `docker builder prune` - https://docs.docker.com/reference/cli/docker/builder/prune/
- Docker docs: Building best practices - https://docs.docker.com/build/building/best-practices/
- Docker docs: Explore the Images view in Docker Desktop - https://docs.docker.com/desktop/use-desktop/images/
- Docker CLI reference: `docker image push` - https://docs.docker.com/reference/cli/docker/image/push/
- Docker Hub docs: Push images to a repository - https://docs.docker.com/docker-hub/repos/manage/hub-images/push/
- Portainer docs: Images - https://docs.portainer.io/user/docker/images

## Issues Found
- The description and introduction incorrectly described dangling images as intermediate build layers. I corrected this to describe dangling images as untagged image revisions and clarified that Docker build cache is managed separately.
- The "When Dangling Images Are Created" section incorrectly said multi-stage builds and failed builds create dangling images. I replaced that with accurate causes tied to mutable tags and added a note that modern builds more often leave build cache instead.
- The command that tried to total dangling-image size by summing `docker images --format "{{.Size}}"` output was unreliable because Docker emits human-readable sizes with units. I replaced it with `docker system df -v`, which is the documented way to inspect actual image disk usage.
- The Portainer cleanup steps used UI labels that are version-specific and not confirmed by the current Portainer docs. I generalized the wording so it stays technically accurate across Portainer versions.
- The `--no-cache` subsection incorrectly implied that clean rebuilds prevent image accumulation. I replaced it with `docker builder prune -f`, which is the documented command for removing build cache.
- The GitHub Actions example used `docker push myapp:${{ github.sha }}`, which is not a realistic push target without a namespace or registry path. I changed it to `your-namespace/myapp:${{ github.sha }}`.
- The section distinguishing dangling and unused images incorrectly used `docker images --filter "dangling=false"` as a way to list unused images. I corrected this to explain that Docker does not provide a direct unused-only image listing filter, and that `docker image prune -a` removes images not used by any container.

## Review Notes
- Portainer’s exact Images UI controls can vary by release, so the revised Portainer steps intentionally avoid hard-coding button labels beyond the documented Images view and generic remove/prune workflow.
- The Dockerfile image tags in the example are illustrative and may age over time; they are not essential to the post’s dangling-image guidance.
- `docker image prune` is the safest default for this topic. Manual `docker rmi $(docker images --filter "dangling=true" -q)` can still warn or fail if an untagged image is referenced by a container.
