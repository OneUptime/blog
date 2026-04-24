# Validation Summary: How to Deploy Transmission via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Docker stacks
- LinuxServer.io Transmission container
- Transmission
- haugene/transmission-openvpn
- Sonarr / Radarr

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Docker Compose `version` reference: https://docs.docker.com/reference/compose-file/version-and-name/
- LinuxServer.io Transmission image docs: https://docs.linuxserver.io/images/docker-transmission/
- Transmission configuration docs: https://github.com/transmission/transmission/blob/main/docs/Editing-Configuration-Files.md
- Transmission official site: https://transmissionbt.com/
- haugene/transmission-openvpn repository README: https://github.com/haugene/docker-transmission-openvpn
- haugene/transmission-openvpn configuration docs: https://haugene.github.io/docker-transmission-openvpn/config-options/
- haugene/transmission-openvpn RSS plugin docs: https://haugene.github.io/docker-transmission-openvpn/rss-plugin/
- qBittorrent official site: https://www.qbittorrent.org/

## Issues Found
- The post described Transmission as having "RSS-based auto-downloading capabilities". Current upstream Transmission documentation and site copy do not list built-in RSS support, while the haugene VPN image documents RSS as a separate companion plugin/container. I removed that claim from the description and corrected the comparison table to show RSS/search differences accurately.
- Both Compose examples used the top-level `version` field. Docker now documents that field as obsolete, so I removed it from both YAML snippets.
- The LinuxServer Compose example set `TRANSMISSION_WEB_HOME=/config/transmissionic` as if Transmissionic were bundled with that image. LinuxServer documents `TRANSMISSION_WEB_HOME` only as a path to an alternative UI folder and does not bundle Transmissionic in the image docs, so I removed that line.
- The access section told readers to log in with `admin/your_password`, which did not match the actual example values (`USER=admin`, `PASS=change_this_password`). I corrected the credentials guidance to match the stack example.
- The `settings.json` example used deprecated kebab-case keys and included RPC credential fields even though LinuxServer explicitly documents using `USER` and `PASS` environment variables instead of manually editing credentials into `settings.json`. I updated the section to note that the container should be stopped before editing, kept auth in env vars, and switched the example settings keys to the current snake_case format documented by Transmission.
- The `transmission-openvpn` example mounted the named volume at `/data` and then bound `/mnt/media/downloads` to `/data/completed`, but current haugene docs use `/data` for downloads and `/config` for persistent Transmission state. I corrected the mounts to `transmission_config:/config` and `/mnt/media/downloads:/data`.
- The OpenVPN example used `OPENVPN_CONFIG=netherlands`, which was not validated from the current quick-start docs. I changed it to the documented quick-start value `france`.
- The Sonarr/Radarr section implied `Host: transmission` would always work. That is only true when the apps share a Docker network, so I clarified that the service name works in that case and otherwise the Docker host/IP should be used.
- The comparison table claimed qBittorrent had no plugin ecosystem. qBittorrent's official site documents built-in RSS support and an extensible search engine, so I corrected the table accordingly and removed unsupported RAM figures.

## Review Notes
- Transmission current stable is `4.1.1` as of April 24, 2026, and upstream documentation notes that the snake_case transition for config keys began in Transmission `4.1.0`. The updated `settings.json` example now reflects the forward-compatible key format.
- The post still uses `:latest` image tags. That is valid, but pinning to a tested image tag would make the guide more reproducible in a future revision.
- Docker is not installed in this workspace, so validation was performed against current official documentation plus local YAML/JSON parsing rather than by running `docker compose config` or launching the containers.
