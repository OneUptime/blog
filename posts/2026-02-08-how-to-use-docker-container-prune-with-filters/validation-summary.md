# Validation Summary: How to Use Docker Container Prune with Filters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker container pruning
- Docker filters
- Docker Compose labels
- Cron scheduling
- Shell scripting

## Sources Consulted
- Docker CLI reference: docker container prune - https://docs.docker.com/reference/cli/docker/container/prune/
- Docker CLI reference: docker system prune - https://docs.docker.com/reference/cli/docker/system/prune/
- Docker CLI reference: docker container ls / docker ps - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI reference: docker system df - https://docs.docker.com/reference/cli/docker/system/df/
- Docker Compose file reference: services labels - https://docs.docker.com/reference/compose-file/services/#labels
- Local Docker CLI help output for `docker container prune`, `docker system prune`, and `docker ps`

## Issues Found
- The post described the `until` filter as matching containers by stop time. Docker documents `until` for `docker container prune` as matching stopped containers created before the timestamp, so the affected explanations, examples, script comments, and summary text were updated to refer to creation time.
- The preview and script count examples only checked `exited` and `created` containers. Docker's container status filter also includes `dead`, which is a stopped/removable state, so the preview/count commands were updated to include `--filter status=dead`.
- The label preservation example used a running detached container, which would be skipped by prune regardless of its label. The example was changed to create a stopped labeled container so the label filter is the reason it is preserved.
- The post stated that multiple filters always use AND logic. Docker uses AND for different filter keys and OR for repeated filter keys, so that explanation was corrected.
- The `docker system prune` comparison said it does not support the same fine-grained filters as `docker container prune`. Docker documents filter support for `docker system prune`, so the text now clarifies that system prune filters apply across multiple resource types and container prune is preferred when targeting containers only.
- The disk usage explanation implied the Docker `system df` Containers line only shows stopped container space. It was corrected to say it shows total container usage and reclaimable space.
- The dry-run section said to check stop times, but the shown output uses status and creation time. The wording was corrected to match the command.

## Review Notes
The post is technically relevant and current after the corrections. Docker prune commands still do not provide a built-in dry-run flag, so the preview approach remains an approximation rather than an exact prune simulation.
