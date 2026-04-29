# Validation Summary: How to Migrate Containers Between Portainer Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Engine
- Docker CLI
- Docker volumes
- `curl`
- `rsync`
- Python 3

## Sources Consulted
- Portainer Documentation: Accessing the Portainer API - https://docs.portainer.io/api/access
- Portainer Documentation: API documentation - https://docs.portainer.io/api/docs
- Portainer Documentation: API usage examples - https://docs.portainer.io/sts/api/examples
- Portainer CE 2.39.1 OpenAPI spec - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker Docs: `docker image save` - https://docs.docker.com/reference/cli/docker/image/save/
- Docker Docs: `docker image load` - https://docs.docker.com/reference/cli/docker/image/load/
- Docker Docs: `docker volume create` - https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- `curl --help all`
- `rsync --help`

## Issues Found
- The stack-list example used `GET /api/stacks?endpointId=1`, but current Portainer expects environment filtering through the `filters` query parameter. I changed the request to `curl -G --data-urlencode 'filters={"EndpointID":1}' https://portainer.example.com/api/stacks` to match the current API contract.
- The image export parser assumed every image had a `RepoTags` list. Docker can return `null` for dangling images, which would make the original Python snippet fail. I updated the script to use `img.get('RepoTags') or []` and deduplicated the resulting tags.
- The article saved image tarballs and stack files locally but never transferred them to the target host, so the deployment step could not work as written. I added the missing `rsync` steps and the required temporary-directory creation.
- The stack export only captured `StackFileContent`, but Portainer stores deployment-time stack environment variables separately in the stack object. I added export of each stack's `Env` from `/api/stacks/{id}` and included that data in the target stack creation request.
- The deployment example used `/api/stacks/create/standalone/string`, which is specific to Docker Standalone environments, but the post did not previously say that. I clarified the scope in the introduction and in the deployment step.
- The pre-cutover connectivity test used `curl -I https://your-app.example.com`, which would normally hit the current DNS target rather than the new environment. I replaced it with a `curl --resolve` example so the hostname can be tested against the new IP before DNS cutover.
- The image-save section described the step as "Pull and save each image" even though the code only saved locally available images, and it used a less canonical Docker CLI form. I corrected the wording and updated the command to `docker image save -o ...`.

## Review Notes
- Portainer also exposes a direct stack migration endpoint, `POST /api/stacks/{id}/migrate`, in current API docs. This post keeps the manual export/import workflow, which remains valid when image archives and Docker volumes need to be moved separately.
- The workflow assumes shell access to the source and target Docker hosts for `docker image save`, `docker load`, volume backup/restore, and `rsync`.
