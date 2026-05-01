# Validation Summary: How to Deploy Wiki.JS via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Wiki.js
- Portainer
- Docker Compose
- PostgreSQL
- Git storage in Wiki.js
- OneUptime HTTP monitoring

## Sources Consulted
- Wiki.js requirements: https://docs.requarks.io/s/en/install/requirements
- Wiki.js Docker installation: https://docs.requarks.io/s/en/install/docker
- Wiki.js Portainer installation: https://docs.requarks.io/s/en/install/portainer
- Wiki.js Git storage: https://docs.requarks.io/s/en/storage/git
- Wiki.js users, groups, and permissions: https://docs.requarks.io/s/en/groups
- Wiki.js editors overview: https://docs.requarks.io/s/editors
- Portainer stacks documentation: https://docs.portainer.io/user/docker/stacks/add
- Docker Compose file reference for the top-level `version` element: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The prerequisites listed `512MB RAM`, but the official Wiki.js requirements specify at least `1GB of RAM` on Linux. Updated the prerequisite to match the documented minimum.
- The Compose snippet used the top-level `version: "3.8"` key. Docker documents this field as obsolete, so it was removed from the example.
- The Git storage section said all page edits would be committed automatically to the Git repository. Wiki.js documents that new commits are synced on the configured schedule, every 5 minutes by default, and that previously created content may require manual import actions. Updated the wording to reflect scheduled synchronization.
- The access control examples used glob-like path patterns such as `/public/*`. Wiki.js permissions are configured with page rules such as `Path starts with...` or `Path matches exactly...`, so the examples were rewritten to match the actual permissions model.
- The monitoring section said Wiki.js serves a login page at the root. That is too specific for all deployments. Updated the wording to the technically safe statement that the web UI is served at the root path.

## Review Notes
- The post’s use of `ghcr.io/requarks/wiki:2` is consistent with the official Wiki.js Docker guidance, which recommends pinning to the major version instead of using `latest`.
- The official Wiki.js examples currently use `postgres:15-alpine`, but Wiki.js documents PostgreSQL `9.5 or later`, so the post’s `postgres:16-alpine` image remains technically acceptable.
