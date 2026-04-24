# Validation Summary: How to Deploy OpenVPN via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose / Portainer stack syntax
- OpenVPN
- EasyRSA
- Bash

## Sources Consulted
- kylemanna/docker-openvpn README: https://github.com/kylemanna/docker-openvpn/blob/master/README.md
- kylemanna/docker-openvpn docker-compose guide: https://github.com/kylemanna/docker-openvpn/blob/master/docs/docker-compose.md
- kylemanna/docker-openvpn `ovpn_revokeclient` script: https://github.com/kylemanna/docker-openvpn/blob/master/bin/ovpn_revokeclient
- kylemanna/docker-openvpn `ovpn_genconfig` script: https://github.com/kylemanna/docker-openvpn/blob/master/bin/ovpn_genconfig
- Docker Compose file reference, `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose file reference, volumes / `external` / `name`: https://docs.docker.com/reference/compose-file/volumes/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html

## Issues Found
- The stack snippet created an external Docker volume named `openvpn-data`, but the Compose/Portainer stack referenced `openvpn_data` without mapping it to the real external volume name. I added `name: openvpn-data` under the external volume so the stack uses the pre-initialized volume the earlier commands create.
- The stack snippet used the top-level `version: "3.8"` field. Current Docker Compose documentation marks the top-level `version` field as obsolete, so I removed it.
- The revoke examples used `ovpn_revokeclient CLIENTNAME remove`. The current upstream `ovpn_revokeclient` script only acts on the client name and does not implement the older cleanup behavior implied by `remove`, so I changed the revoke commands to `ovpn_revokeclient CLIENTNAME` and updated the helper script to match current behavior.

## Review Notes
- The post is technically valid after the fixes above.
- Upstream documentation for `kylemanna/openvpn` still contains an older `remove` example in the docker-compose guide, but the current script implementation does not consume that second argument.
- The post uses the floating `kylemanna/openvpn` tag. That is workable, but pinning a tag or digest would improve reproducibility in a future revision.
- The commands were reviewed against upstream documentation and source files. A live runtime check was not performed in this workspace because the Docker CLI is not installed here.
