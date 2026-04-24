# Validation Summary: How to Compact the Portainer Database

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Portainer Business Edition
- Docker
- BoltDB / bbolt
- Cron
- Go

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer release notes: https://docs.portainer.io/sts/release-notes
- Portainer 2.33 LTS release notes: https://docs.portainer.io/2.33-lts/release-notes
- Portainer update guide for Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Portainer CE install on Docker Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer database encryption docs: https://docs.portainer.io/advanced/db-encryption
- Portainer troubleshooting note for `useractivity.db`: https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/failed-logging-user-activity-error-in-portainer
- bbolt command documentation: https://pkg.go.dev/go.etcd.io/bbolt/cmd/bbolt
- bbolt project documentation: https://github.com/etcd-io/bbolt

## Issues Found
- The post used the wrong Portainer flag name (`--db-compact`). Portainer's official CLI documentation uses `--compact-db`, so I corrected the flag everywhere it appeared.
- The post claimed the built-in compaction feature existed in `2.17+`. Current Portainer release notes show the `--compact-db` flag was added much later, so I changed the prerequisite and narrative to supported versions (`2.35.0+ STS` or `2.33.7+ LTS` and later).
- The overview said Portainer's BoltDB stores activity logs and listed activity-log buildup as a cause of `portainer.db` bloat. Portainer also documents a separate `useractivity.db`, so I removed the inaccurate activity-log claim from the overview and causes list.
- The main compaction example used a transient `docker run --rm ...` pattern, but Portainer documents `--compact-db` as a startup flag. I changed the procedure to stop and remove the old container, then start Portainer normally with `--compact-db` added to the documented `docker run` form.
- The article included a fabricated sample output block and an unnecessary API probe for verification. I removed the unverified sample logs and switched the verification step to `docker ps` and `docker logs`, which are consistent with Portainer's install and update documentation.
- The scheduled compaction example reused the same incorrect one-shot pattern. I updated it to a recreate-and-start example that matches the corrected startup-flag flow and changed the image reference to `<your-current-tag>` so the compaction step does not implicitly upgrade Portainer.

## Review Notes
- The post remains technically relevant and publishable after correction.
- The examples still assume a standard Docker standalone deployment using the `portainer_data` volume and the default `portainer.db` file path for the size and backup checks.
- If Portainer database encryption is enabled, the same secret mount used in the normal deployment must also be included when starting Portainer with `--compact-db`.
- `--compact-db` runs on startup, so any deployment left configured with that flag will compact on every container start, not only on a single maintenance run.
- Commands were validated against official documentation and package docs. They were not executed in this workspace because Docker and Go are not installed here.
