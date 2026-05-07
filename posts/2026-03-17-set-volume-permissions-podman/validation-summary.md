# Validation Summary: How to Set Volume Permissions in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Linux file permissions
- Container volumes and bind mounts
- SELinux volume labels
- Containerfile/Dockerfile image build instructions
- PostgreSQL container image

## Sources Consulted
- Podman run documentation, volume options, `:U`, `:z`, and `:Z`: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman volume inspect documentation and `.Mountpoint` template field: https://docs.podman.io/en/latest/markdown/podman-volume-inspect.1.html
- Docker Official Image documentation for Postgres and required `POSTGRES_PASSWORD`: https://hub.docker.com/_/postgres/
- Dockerfile reference for `RUN`, `USER`, `WORKDIR`, and `VOLUME`: https://docs.docker.com/reference/dockerfile/

## Issues Found
- The bind mount example set ownership for UID/GID 1000 but ran `node:20` without setting the container user. I changed the example to run Alpine as `--user 1000:1000` so the mounted directory ownership matches the actual container process user.
- The bind mount and `:U` examples used long-running service images whose default startup behavior could obscure the permission example or fail for reasons unrelated to the mounted volume. I changed them to use Alpine with a simple `sleep 3600` command so the containers remain available for verification.
- The `:U` example mounted `/home/user/uploads` without first creating it. Podman requires bind mount source paths to already exist, so I added `mkdir -p /home/user/uploads`.
- The named volume example used a numeric `999:999` ownership assumption for Postgres. I changed the initialization command to run in the Postgres image and chown to `postgres:postgres`, avoiding a hard-coded UID/GID.
- The Postgres run command omitted `POSTGRES_PASSWORD`, which the official Postgres image requires for first initialization. I added `-e POSTGRES_PASSWORD=example`.
- The Containerfile run example did not assign a container name even though the verification section uses named containers. I added `--name myapp-image` to make the example explicit.

## Review Notes
Podman's `:U` option is technically correct but should be used carefully because it recursively changes ownership on the source volume and can modify host filesystem ownership. The post already presents this option in the correct context, but a future revision could call out the performance and host-ownership implications more prominently.
