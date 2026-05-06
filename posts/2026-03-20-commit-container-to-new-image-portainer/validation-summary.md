# Validation Summary: How to Commit a Container to a New Image in Portainer - New

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker
- Docker CLI (`docker commit`, `docker diff`, `docker tag`, `docker push`, `docker login`)
- Dockerfile
- NGINX

## Sources Consulted
- Docker Docs: `docker container commit` - https://docs.docker.com/reference/cli/docker/container/commit/
- Docker Docs: `docker container diff` - https://docs.docker.com/reference/cli/docker/container/diff/
- Docker Docs: `docker login` - https://docs.docker.com/reference/cli/docker/login/
- Docker Docs: `docker image push` - https://docs.docker.com/engine/reference/commandline/image_push/
- Docker Docs: `docker image tag` - https://docs.docker.com/engine/reference/commandline/tag/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/builder
- Portainer Documentation: View a container's details - https://docs.portainer.io/user/docker/containers/view
- Portainer Documentation: Why can't I use the console with my container? - https://docs.portainer.io/faqs/troubleshooting/ui-and-features/why-cant-i-use-the-console-with-my-container

## Issues Found
- The post incorrectly said `docker commit` could be run via Portainer's container console or exec feature. I changed this to Portainer's supported workflow for creating an image from a deployed container and clarified that the equivalent Docker CLI commands must be run from a shell with access to the Docker host or daemon.
- The introduction said `docker commit` captures files modified since the container started. Docker documents these changes relative to the container's created state, so I corrected that wording.
- The post omitted that `docker commit` does not include data stored in mounted volumes. I added that limitation where the workflow discusses capture, diffing, and summary guidance.
- The push example implied using Portainer's console for `docker push`. I corrected it to run from the Docker host shell and added a `docker login` step for registries that require authentication.

## Review Notes
- The Dockerfile example is syntactically valid and its `COPY`, `RUN`, and `EXPOSE` instructions match current Dockerfile syntax.
- Docker pauses a container during `docker commit` by default unless `--no-pause` is used. The post is still accurate without this detail, but it is a useful operational caveat for future revisions.
