# Validation Summary: How to Deploy Emby via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Docker Compose / Docker Engine
- Emby Server Docker image
- Emby hardware transcoding
- Emby Premiere
- HDHomeRun Live TV
- Traefik Docker labels

## Sources Consulted
- Portainer Documentation: Add a new stack — https://docs.portainer.io/user/docker/stacks/add
- Docker Docs: Compose file reference — https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Define services in Docker Compose — https://docs.docker.com/reference/compose-file/services/
- Emby Server for Docker — https://emby.media/docker-server.html
- Emby official Docker image documentation — https://hub.docker.com/r/emby/embyserver
- Emby Documentation: Transcoding — https://emby.media/support/articles/Transcoding.html
- Emby Documentation: Hardware Acceleration Overview — https://emby.media/support/articles/Hardware-Acceleration-Overview.html
- Emby Documentation: Hardware Acceleration on Linux — https://emby.media/support/articles/Hardware-Acceleration-on-Linux.html
- Emby Documentation: Emby Premiere — https://support.emby.media/support/articles/Emby-Premiere.html
- Emby Documentation: Emby Premiere Features — https://docs.emby.media/premiere.html
- Emby Documentation: Emby Premiere Feature Matrix — https://support.emby.media/support/articles/Premiere-Feature-Matrix.html
- Emby Documentation: Live TV Setup — https://emby.media/support/articles/Live-TV.html
- Emby Documentation: HDHomeRun Setup — https://emby.media/support/articles/HDHomeRun-Setup.html
- Traefik Documentation: Docker provider — https://doc.traefik.io/traefik/v3.1/providers/docker/

## Issues Found

1. **The main Compose example used an obsolete top-level `version` key and overly absolute networking guidance.** Docker now treats the top-level `version` field as obsolete, and Emby's official Docker docs describe host networking as the easiest option for DLNA/Wake-on-LAN rather than a strict requirement. I removed the `version` line and softened the host-networking comment accordingly.

2. **The UID/GID/GIDLIST values were presented as fixed numbers even though they are host-specific.** Emby's official Docker image expects `UID`, `GID`, and `GIDLIST`, but those values need to match the target host. I replaced the hard-coded group IDs with placeholders and added a note telling readers to use their actual host IDs.

3. **The NVIDIA environment example was invalid Compose syntax.** Under `environment`, the post used `KEY=value` lines without list markers or YAML key/value pairs. I converted them to valid Compose mapping syntax and added the required host prerequisite note about the NVIDIA Container Toolkit / NVIDIA runtime.

4. **The Intel hardware-transcoding instructions hard-coded Linux group IDs and used an imprecise UI path.** Group IDs such as `44` and `109` are not portable across systems, and Emby's docs describe the setting from the server dashboard's `Transcoding` page. I replaced the IDs with placeholders and corrected the instruction text.

5. **The Emby Premiere feature list used imprecise product wording.** I changed the items to match Emby's official terminology more closely: hardware accelerated transcoding, offline media/downloads & sync, the Cover Art plugin, and themes for supported clients.

6. **The HDHomeRun section omitted the Emby Premiere requirement and used a less accurate setup path.** Emby's Live TV and DVR features require Emby Premiere, and the docs refer to adding a TV source from the Live TV section. I updated that sentence accordingly.

7. **The Traefik section incorrectly stated that host networking cannot be used with Traefik and that bridge mode disables DLNA discovery.** Traefik's Docker provider supports host-networked containers, and Emby's docs say bridge mode may work but can require extra configuration. I corrected both statements without changing the overall section structure.

8. **The conclusion referenced the wrong container image vendor.** The post uses `emby/embyserver`, but the conclusion referred to the linuxserver.io image. I changed the text to describe the official Emby image actually used in the article.

## Review Notes
- The Traefik example is still intentionally partial. In real deployments, the exact network setup depends on how Traefik is installed and which Docker network it watches.
- The post pins `latest` for the Emby image, which is valid but means behavior can change as new Emby releases ship.
