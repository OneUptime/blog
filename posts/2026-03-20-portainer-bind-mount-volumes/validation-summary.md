# Validation Summary: How to Create Bind Mount Volumes in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Engine bind mounts
- Docker Compose
- PostgreSQL container configuration
- Linux filesystem permissions and ACLs
- Elastic Filebeat

## Sources Consulted
- Docker Docs: Bind mounts — https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Define services in Docker Compose — https://docs.docker.com/reference/compose-file/services/
- Docker Docs: `docker container exec` — https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Docs: `docker inspect` — https://docs.docker.com/reference/cli/docker/inspect/
- Portainer Docs: Add a new container — https://docs.portainer.io/sts/user/docker/containers/add
- Portainer Docs: Advanced container settings — https://docs.portainer.io/user/docker/containers/advanced
- Docker Hub: Postgres Official Image — https://hub.docker.com/_/postgres
- PostgreSQL 15 Documentation: File Locations — https://www.postgresql.org/docs/15/runtime-config-file-locations.html
- Elastic Docs: Run Filebeat on Docker — https://www.elastic.co/docs/reference/beats/filebeat/running-on-docker

## Issues Found

1. **Host-path handling was overstated and the Nginx example paths were inconsistent.** The post said the host path must already exist in all cases, but Docker distinguishes between `--mount` and short `-v` / Compose bind syntax, which can create missing directories. I changed the wording to "create first for predictable results", renamed Step 1 to "Create the Host Path", corrected `/data/nginx/config` to `/data/nginx/conf.d`, and added the missing example directories for logs and uploads.

2. **The Portainer UI instructions were slightly outdated.** Current Portainer docs place bind-mount configuration under **Advanced container settings** and use **Mapping type** for the bind/volume selector. I updated Step 2 accordingly.

3. **The Compose example used the obsolete top-level `version` field.** Current Compose documentation marks the `version` property as obsolete and warns when it is present. I removed `version: "3.8"` from the Compose example.

4. **The PostgreSQL config example would not have used the mounted config files as written.** In the official Postgres image, PostgreSQL reads configuration from the data directory by default unless you point it elsewhere. I added a `command` section that passes `config_file` and `hba_file` so the mounted `postgresql.conf` and `pg_hba.conf` are actually used.

5. **The permissions explanation was slightly imprecise.** I changed "same UID/GID" to "same numeric UID/GID" to reflect how bind-mounted ownership and permissions are evaluated.

## Review Notes
- The development `node:20-alpine` example is illustrative rather than turnkey. It assumes the project already has a working `npm run dev` script and any framework-specific config files the dev server needs.
- Relative bind paths such as `./src` are supported when Compose deploys to a local runtime. Portainer documents extra caveats for Git-deployed stacks that use relative bind mounts.
- File bind mounts require valid file contents for the target service. Creating the path alone is not enough if the application expects a real config file.
