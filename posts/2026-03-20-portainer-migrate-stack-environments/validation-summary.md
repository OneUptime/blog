# Validation Summary: How to Migrate a Stack Between Environments in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Docker volumes
- SSH, `scp`, and `rsync`
- PostgreSQL

## Sources Consulted
- Portainer Docs: Migrate, duplicate or rename a stack - https://docs.portainer.io/user/docker/stacks/migrate
- Portainer Docs: Inspect or edit a stack - https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Docker Docs: `docker compose config` - https://docs.docker.com/reference/cli/docker/compose/config/
- Docker Docs: `docker compose ps` - https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker Docs: `docker compose exec` - https://docs.docker.com/reference/cli/docker/compose/exec/
- Docker Docs: `docker compose stop` - https://docs.docker.com/reference/cli/docker/compose/stop/
- Docker Docs: Volumes / Back up, restore, or migrate data volumes - https://docs.docker.com/engine/storage/volumes/
- PostgreSQL Docs: `pg_dump` - https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL Docs: File System Level Backup - https://www.postgresql.org/docs/current/backup-file.html

## Issues Found
- The introduction incorrectly stated that Portainer does not have a built-in "move stack" feature. I corrected this to reflect Portainer's documented stack migration action and clarified that persistent volume contents are not moved automatically.
- Step 1 implied that the Compose YAML can always be copied from Portainer's editor. I corrected this to distinguish between stacks deployed from the web editor/upload and stacks deployed from Git, and noted that detaching from Git only stores the main Compose file in Portainer.
- Step 2 showed raw volume backups for a PostgreSQL volume without warning about backup consistency. I added guidance to stop services for file-level backups or use an application-native backup such as `pg_dump`, changed the volume-discovery command to `docker compose ps -aq` so it still works when services are stopped, and added an optional `docker compose start` to bring the source stack back online.
- Step 6 used a hardcoded container name with `docker exec` (`myapp_postgres_1`), which is brittle and not a good fit for current Compose workflows. I replaced it with `docker compose exec -T postgres ...` from the Compose project directory so the verification step targets the service through Compose rather than assuming a specific container name.

## Review Notes
- The post is technically sound after the above corrections.
- Manual export and redeploy is still a valid workflow even though Portainer now has a built-in stack migration action, because Portainer's migration does not copy persistent volume data.
- For PostgreSQL specifically, raw file-level volume backups are more version-sensitive than logical backups. `pg_dump` is the safer choice when moving between differing PostgreSQL versions or machine architectures.
- Docker CLI was not installed in this review workspace, so command validation was performed against official documentation rather than local `--help` output.
