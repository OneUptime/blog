# Validation Summary: Initialize Gel with Docker Compose Without Root-owned Project Files

## Status

validated

## Post Type

Technical tutorial / local development guide

## Technologies Covered

- Gel 6 server and Gel CLI
- Gel projects, SDL schemas, and migrations
- Legacy EdgeDB project and environment-variable naming
- Docker Engine and the official `geldata/gel` and `geldata/gel-cli` images
- Docker Compose services, profiles, networks, volumes, bind mounts, and `tmpfs`
- Linux UID/GID ownership, Docker user namespaces, and Docker Desktop file sharing
- Gel authentication, TLS configuration, and readiness monitoring

## Sources Consulted

- Gel Docs: Deploying Gel with Docker - https://docs.geldata.com/reference/running/deployment/docker
- Gel Docs: `gel project init` - https://docs.geldata.com/reference/using/cli/gel_project/gel_project_init
- Gel Docs: Projects and `gel.toml` version syntax - https://docs.geldata.com/reference/using/projects
- Gel Docs: CLI connection flags - https://docs.geldata.com/reference/using/cli/gel_connopts
- Gel Docs: `gel migration create` - https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_create
- Gel Docs: `gel migration log` - https://docs.geldata.com/reference/using/cli/gel_migration/gel_migration_log
- Gel Docs: `gel migrate` - https://docs.geldata.com/reference/using/cli/gel_migrate
- Gel Docs: `gel query` - https://docs.geldata.com/reference/using/cli/gel_query
- Gel Docs: Server and Docker-image configuration variables - https://docs.geldata.com/reference/running/configuration
- Gel Docs: HTTP readiness and aliveness endpoints - https://docs.geldata.com/reference/running/http
- Gel Docs: Upgrading from EdgeDB v5 to Gel v6 - https://docs.geldata.com/resources/upgrading
- Official Gel Docker image source and entrypoint - https://github.com/geldata/gel-docker/blob/master/Dockerfile and https://github.com/geldata/gel-docker/blob/master/docker-entrypoint-funcs.sh
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose profiles - https://docs.docker.com/compose/how-tos/profiles/
- Docker Docs: `docker compose run` - https://docs.docker.com/reference/cli/docker/compose/run/
- Docker Docs: Bind mounts and port publishing - https://docs.docker.com/engine/storage/bind-mounts/ and https://docs.docker.com/reference/compose-file/services/#ports
- Docker Docs: Rootless UID/GID mapping - https://docs.docker.com/engine/security/rootless/uid-gid-mapping/
- Docker Docs: Docker Desktop shared-volume permissions - https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/topics/#permissions-errors-on-data-directories-for-shared-volumes

## Issues Found

- The introduction described projects as linking only to a CLI-managed instance, attributed migration-file creation to `gel project init`, and implied that local CLI configuration was written to the source bind mount. Updated it to cover any linked instance and to distinguish project scaffolding on the bind mount, later migration-file creation, and user-local association/credential storage.
- The version-pinning advice did not explain Gel's exact-version syntax or distinguish `gel.toml` from the independently managed Compose image. Clarified that `"6"` permits the latest compatible 6.x release, an exact manifest version needs an `=` prefix such as `"=6.1"`, and the image must be pinned separately.
- The arbitrary-UID CLI set `HOME=/tmp/gel-cli-home`, but the current minimal `geldata/gel-cli` image has no `/tmp` directory and the non-root process cannot create it beneath `/`. Added a mode-1777 `/tmp` `tmpfs` mount so the disposable home is actually writable.
- The insecure development server port was published on every host interface by using `5656:5656`. Changed it to `127.0.0.1:5656:5656` so the Trust-authenticated development instance is reachable only through host loopback and the Compose network.
- The ownership explanation assumed one-to-one UID/GID mapping on every Docker setup. Qualified it for conventional rootful Linux Engines, documented the remapping performed by rootless Docker and `userns-remap`, and clarified that the shown environment-assignment syntax requires a POSIX shell while Docker Desktop mediates native-host ownership.

## Review Notes

- The corrected Compose YAML was parsed successfully with Docker Compose v5.1.4, including the profiled CLI service, arbitrary numeric user, loopback-only port, read-only schema mount, and `/tmp` `tmpfs`.
- Runtime validation used `geldata/gel:6` (Gel 6.11) and `geldata/gel-cli:latest` (CLI 7.10.2). The version query succeeded, and an end-to-end smoke test created a migration as the host UID/GID, read it with `migration log --from-fs`, applied it with `migrate`, and queried the migrated type. A separate `instance link` test confirmed that the added `tmpfs` makes the disposable CLI configuration writable.
- Gel 7 is the current latest major, but Gel 6 remains available through the official `:6` image tag and is intentionally selected by this version-specific post.
- Short-form `depends_on` waits only for the server container to start, not for readiness. The post remains correct because it explicitly tells the reader to inspect the logs and proceeds only when the server is ready; a healthcheck with `service_healthy` would be needed to make direct one-off CLI runs wait automatically.
- The official image's default startup migration behavior was verified against both the documentation and entrypoint source: it applies existing files under `/dbschema/migrations` and does not generate a migration from edited `.gel` schema.
