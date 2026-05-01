# Validation Summary: How to Deploy PocketBase via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PocketBase
- Portainer
- Docker Compose
- Docker
- JavaScript
- REST APIs

## Sources Consulted
- Portainer stack creation docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker `docker cp` docs: https://docs.docker.com/reference/cli/docker/container/cp/
- Docker `docker stop` docs: https://docs.docker.com/reference/cli/docker/container/stop/
- PocketBase introduction docs: https://pocketbase.io/docs/
- PocketBase collections docs: https://pocketbase.io/docs/collections/
- PocketBase authentication docs: https://pocketbase.io/docs/authentication/
- PocketBase records API docs: https://pocketbase.io/docs/api-records/
- PocketBase backups API docs: https://pocketbase.io/docs/api-backups/
- PocketBase health API docs: https://pocketbase.io/docs/api-health/
- PocketBase JS migrations docs: https://pocketbase.io/docs/js-migrations/
- PocketBase production and backup docs: https://pocketbase.io/docs/going-to-production/
- `muchobien/pocketbase-docker` repository: https://github.com/muchobien/pocketbase-docker
- GHCR package page for `ghcr.io/muchobien/pocketbase`: https://github.com/orgs/muchobien/packages/container/package/pocketbase

## Issues Found
- The Compose snippet pinned `ghcr.io/muchobien/pocketbase:0.22.14`, which is outdated relative to the current PocketBase docs. I updated it to `0.37.4`, which is the current image version exposed by the image metadata I verified from GHCR on May 1, 2026.
- The Compose volumes and `--dir` flag used `/pb/pb_data`, `/pb/pb_public`, and `/pb/pb_migrations`, but the verified image layout uses `/pb_data` and `/pb_public`, and PocketBase uses a separate `pb_migrations` directory rather than `/pb/pb_migrations`. I corrected the volume mount paths and the `--dir` value to match that layout.
- The Compose file used a top-level `version: "3.8"` field. Docker’s current Compose docs mark the top-level `version` element as obsolete, so I removed it.
- The post told readers to create only a `posts` base collection, but the REST and JavaScript auth examples authenticate against a `users` auth collection. I updated Step 3 to instruct readers to create a `users` auth collection with password authentication enabled if they want to use those examples.
- The backup example used `Authorization: Admin <admin-token>`, but PocketBase’s auth docs and backups API require a normal `Authorization:TOKEN` header, and backups are restricted to superusers. I changed the example to use a superuser auth token and a valid JSON body.
- The manual backup example copied only `data.db`, which would miss uploaded files and other `pb_data` contents. PocketBase’s production docs state that manual backup/restore should copy the entire `pb_data` directory, ideally while the app is not running for transactional safety. I changed the example accordingly.
- The healthcheck used a `wget` invocation that did not match the current image documentation. I aligned it with the documented `wget --spider` healthcheck pattern against `/api/health`.
- The conclusion implied that `pb_data` contains only `data.db` and uploads. I corrected that wording to reflect that the volume stores the application’s database files and uploaded files more generally.

## Review Notes
- PocketBase’s official docs explicitly state that PocketBase does not publish an official Docker image. This post uses the community-maintained `ghcr.io/muchobien/pocketbase` image, which is a reasonable deployment choice, but it is not an official PocketBase image.
- PocketBase docs on May 1, 2026 show the current documentation version as `0.37.4`, and the GHCR metadata for `ghcr.io/muchobien/pocketbase:latest` also resolves to `0.37.4`.
- I could not run the container locally in this environment because `docker` is not installed, so validation was done by checking the official PocketBase and Docker documentation plus the image metadata and upstream image repository.
