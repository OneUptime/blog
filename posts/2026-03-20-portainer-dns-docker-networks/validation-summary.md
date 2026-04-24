# Validation Summary: How to Configure DNS for Docker Networks in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker CLI (`docker run`, `dockerd`, `docker network inspect`)
- Docker Compose / Compose Specification
- Portainer
- PostgreSQL Docker Official Image
- Pi-hole
- DNS / service discovery

## Sources Consulted
- Docker Networking overview: https://docs.docker.com/network
- Docker bridge network driver: https://docs.docker.com/engine/network/drivers/bridge/
- `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- `docker network inspect` reference: https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker output formatting reference: https://docs.docker.com/go/formatting/
- Docker workshop, multi-container apps: https://docs.docker.com/get-started/workshop/07_multi_container/
- Portainer Add a new container: https://docs.portainer.io/sts/user/docker/containers/add
- Portainer Advanced container settings: https://docs.portainer.io/sts/user/docker/containers/advanced
- Docker Official Image docs for Postgres: https://github.com/docker-library/docs/blob/master/postgres/README.md
- Pi-hole Docker configuration docs: https://docs.pi-hole.net/docker/configuration/
- Pi-hole Docker v5 to v6 upgrade notes: https://docs.pi-hole.net/docker/upgrading/v5-v6/

## Issues Found
1. **Invalid shell continuation syntax in the `docker run` DNS example.** The original multi-line command placed inline comments after trailing backslashes, which breaks POSIX shell line continuation. Removed the inline comments so the command runs correctly.
2. **Portainer UI instructions overstated what the current form exposes.** Portainer's documented Advanced container settings show `Primary DNS Server` and `Secondary DNS Server` under the Network section, but not DNS search domains or resolver options. Updated the UI steps to match the current Portainer documentation.
3. **The PostgreSQL examples would not start as written.** The Docker Official Postgres image requires `POSTGRES_PASSWORD` unless `POSTGRES_HOST_AUTH_METHOD=trust` is used. Added the required environment variables to the `docker run` example and a `POSTGRES_PASSWORD` setting to the Compose alias example.
4. **The Compose examples used an obsolete top-level `version` field.** Current Docker Compose documentation marks `version` as obsolete and warns when it is present. Removed `version: "3.8"` from both Compose snippets.
5. **The DNS test examples assumed DNS tools existed inside arbitrary containers.** Commands such as `docker exec api nslookup postgres` and `docker exec my-container dig ...` are unreliable because many application images do not ship with `nslookup` or `dig`. Reworked those checks to use a dedicated debugging container (`nicolaka/netshoot`), following Docker's own workshop guidance.
6. **The Pi-hole example used a legacy password environment variable.** `WEBPASSWORD` has been superseded in Pi-hole v6-era docs by `FTLCONF_webserver_api_password`. Updated the Compose example to the current variable name.
7. **The troubleshooting example depended on external `jq`.** Replaced the `jq` pipeline with Docker's built-in `--format` output so the network inspection example works without an extra host dependency.

## Review Notes
- Docker's current networking docs explicitly document `127.0.0.11` as the embedded DNS server address for containers on custom networks, so the post's DNS explanation is accurate after the example fixes.
- Portainer's current container form documents DNS server fields, but DNS search domains and resolver options are still better represented through Docker CLI, Compose, or daemon configuration rather than the Portainer UI shown here.
- The snippets still label Compose files as `docker-compose.yml`. Current Docker docs typically prefer `compose.yaml`, but `docker-compose.yml` remains accepted, so this was left unchanged.
- The `/etc/docker/daemon.json` example is technically valid. On a real host, it should be merged with any existing daemon settings rather than blindly overwriting the file.
