# Validation Summary: How to Deploy Radarr via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Radarr
- Prowlarr
- Docker Compose
- LinuxServer.io Radarr container
- OneUptime

## Sources Consulted
- Portainer Documentation, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add
- LinuxServer.io, `radarr` container documentation: https://docs.linuxserver.io/images/docker-radarr/
- Radarr official site, Docker installation guidance: https://radarr.video/
- Docker Docs, Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs, `version` top-level element guidance: https://docs.docker.com/reference/compose-file/version-and-name/
- Radarr API docs: https://radarr.video/docs/api/
- Radarr API OpenAPI spec: https://raw.githubusercontent.com/Radarr/Radarr/develop/src/Radarr.Api.V3/openapi.json
- Prowlarr official GitHub repository README: https://github.com/Prowlarr/Prowlarr
- OneUptime API Monitor docs: https://oneuptime.com/docs/monitor/api-monitor

## Issues Found
- The compose example used `linuxserver/radarr:latest`, but LinuxServer's current documented image reference is `lscr.io/linuxserver/radarr:latest`. I updated the image name to match current documentation.
- The compose example claimed to use the shared-parent-path setup needed for hardlinks, but it mounted `/downloads` and `/movies` as separate container mount points. Radarr's own Docker guidance says that layout prevents hardlinks and recommends a single common volume such as `/data`. I changed the example to mount `/mnt/data:/data` and updated the explanation accordingly.
- The compose snippet included `version: "3.8"`. Current Docker Compose documentation marks the top-level `version` field as obsolete and only retained for backward compatibility. I removed it.
- The Prowlarr section said all indexers would immediately appear in Radarr. I softened that wording to the documented sync behavior without overstating timing or scope.

## Review Notes
- Radarr does not publish an official Docker image; this post uses the LinuxServer.io image, which Radarr's own Docker guidance explicitly references.
- The `/api/v3/health` endpoint is present in Radarr's v3 API and uses `X-Api-Key` header authentication. The response schema is an array of health resources, so treating an empty array as "no current health warnings" is a reasonable interpretation of the official API schema.
- Using `http://radarr:7878` from Prowlarr only works when both containers can resolve each other on the same Docker network. If they are on separate networks, a host/IP-based URL or shared external network is required.
