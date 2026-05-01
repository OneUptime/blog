# Validation Summary: How to Deploy OpenVPN via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker volumes
- OpenVPN
- EasyRSA PKI
- OneUptime monitoring

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose `version` and `name` reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose `services` reference (`cap_add`, `devices`, `ports`, `restart`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose `volumes` reference: https://docs.docker.com/reference/compose-file/volumes/
- Portainer stack documentation: https://docs.portainer.io/user/docker/stacks
- Portainer add stack documentation: https://docs.portainer.io/user/docker/stacks/add
- `kylemanna/docker-openvpn` upstream README: https://github.com/kylemanna/docker-openvpn
- OneUptime Port Monitor docs: https://oneuptime.com/docs/monitor/port-monitor
- OneUptime Custom Probes docs: https://oneuptime.com/docs/probe/custom-probe

## Issues Found
- The Compose snippet used the top-level `version` field, which Docker now documents as obsolete. I removed it to match the current Compose specification.
- The stack volume was declared without a fixed name, while the initialization commands wrote to a literal `openvpn_data` volume. In Compose, unnamed stack volumes are project-scoped, so this could initialize the wrong volume. I added `name: openvpn_data` and clarified that the init commands must target the same volume as the stack.
- The PKI initialization comment said `ovpn_genconfig` generated both server configuration and PKI. Upstream `kylemanna/docker-openvpn` documents `ovpn_genconfig` for server configuration and `ovpn_initpki` for PKI initialization, so I corrected that comment.
- The monitoring section implied a normal external HTTP monitor could reach an internal VPN-only resource and that failure would definitively mean the tunnel was down. OneUptime documents private-network monitoring through custom probes, so I updated the text to use a custom probe and softened the diagnosis to a correct investigation step.

## Review Notes
- The article is technically salvageable and now consistent with the current Docker Compose documentation and the upstream `kylemanna/openvpn` usage examples.
- As of May 1, 2026, Docker Hub shows `kylemanna/openvpn:latest` was last pushed over 5 years ago. The post is still workable, but readers should be aware this image is not a recently updated base.
