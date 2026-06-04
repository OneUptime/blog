# Validation Summary: How to Run Wiki.js in Docker for Knowledge Base

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Wiki.js
- Docker
- Docker Compose
- PostgreSQL
- Elasticsearch
- Git and SSH deploy keys
- OAuth authentication
- Mermaid and PlantUML diagrams
- OneUptime HTTP monitoring

## Sources Consulted
- Wiki.js Docker installation docs: https://docs.requarks.io/install/docker
- Wiki.js server requirements: https://docs.requarks.io/install/requirements
- Wiki.js Git storage docs: https://docs.requarks.io/s/en/storage/git
- Wiki.js storage module overview: https://docs.requarks.io/storage
- Wiki.js authentication docs: https://docs.requarks.io/auth
- Wiki.js Google authentication docs: https://docs.requarks.io/auth/google
- Wiki.js users, groups, and permissions docs: https://docs.requarks.io/groups
- Wiki.js page structure guide: https://docs.requarks.io/guide/structure
- Wiki.js editor docs: https://docs.requarks.io/editors
- Wiki.js Markdown editor docs: https://docs.requarks.io/en/editors/markdown
- Wiki.js search engine docs: https://docs.requarks.io/search
- Wiki.js Elasticsearch search docs: https://docs.requarks.io/search/elasticsearch
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version element docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- PostgreSQL pg_dump docs: https://www.postgresql.org/docs/18/app-pgdump.html
- GitHub deploy key docs: https://docs.github.com/developers/overview/managing-deploy-keys/
- OpenBSD ssh-keygen manual: https://man.openbsd.org/OpenBSD-7.8/ssh-keygen.1

## Issues Found
- The Docker Compose example used the top-level `version: "3.8"` field. Docker's current Compose Specification marks this field as obsolete and Compose now ignores it, so I removed it.
- The Git storage settings said to paste a deploy key without specifying the key mode. Wiki.js supports private key contents mode, so I clarified this as `SSH Private Key Mode: Contents` and specified pasting the private key contents.
- The Google OAuth instructions hard-coded a callback URL. Wiki.js's current Google authentication docs instruct users to use the redirect URI shown in the module's configuration reference, so I changed the step to refer to that displayed URI.
- The diagram section claimed Markdown pages can directly embed Draw.io diagrams alongside Mermaid and PlantUML. The current Wiki.js Markdown docs document Mermaid and PlantUML code blocks; Draw.io is discussed as an editor conversion caveat, so I removed Draw.io from that Markdown embedding claim.
- The database backup command redirected output into `~/wikijs-backup` without creating that directory first. I added `mkdir -p ~/wikijs-backup` before the `pg_dump` command.

## Review Notes
- The Wiki.js Docker image, PostgreSQL environment variables, `docker compose up`, `docker compose logs -f`, `docker compose pull wikijs`, and `pg_dump -U wikijs wikijs` usage are technically valid.
- Wiki.js requires the PostgreSQL `pg_trgm` extension for the PostgreSQL search module; the official docs note that the Docker PostgreSQL image includes it.
- The Elasticsearch snippet is a plausible single-node example, but production Elasticsearch deployments should revisit memory, security, and current Elastic version choices.
