# Validation Summary: How to Deploy Stacks to Podman via Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Podman
- Docker Compose / Compose Specification
- Podman REST API (`podman system service`)
- Podman pods

## Sources Consulted
- Portainer FAQ, "Does Portainer support Podman?": https://docs.portainer.io/faqs/installing/does-portainer-support-podman
- Portainer documentation, "Add a Podman environment": https://docs.portainer.io/admin/environments/add/podman
- Portainer documentation, "Connect to the Podman Socket": https://docs.portainer.io/admin/environments/add/podman/socket
- Portainer documentation, "Stacks": https://docs.portainer.io/user/docker/stacks
- Portainer documentation, "Add a new stack" (STS): https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer documentation, "Inspect or edit a stack" (STS): https://docs.portainer.io/sts/user/docker/stacks/edit
- Podman documentation, `podman system service`: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman documentation, `podman compose`: https://docs.podman.io/en/latest/markdown/podman-compose.1.html
- Podman documentation, `--privileged`: https://docs.podman.io/en/v4.6.1/markdown/options/privileged.html
- Podman documentation, `--security-opt`: https://docs.podman.io/en/v4.4/markdown/options/security-opt.html
- Podman documentation, `--cap-add`: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman documentation, `--userns=mode`: https://docs.podman.io/en/v4.4/markdown/options/userns.container.html
- Podman documentation, volume mount options (`:U`): https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Podman documentation, `podman pod create`: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Docker Docs, Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs, `version` top-level element (obsolete): https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The introduction incorrectly described Podman support as a "`podman-compose`-compatible API" available in Podman 3.x+. Updated this to the documented `podman system service` Docker-compatible API model that Portainer connects to.
- The prerequisites overstated current Portainer support by saying Podman 4.x+ was the target and by requiring `podman-compose` or native Compose support. Updated this to match Portainer's current documented support boundaries: CentOS Stream 9, Podman 5, and rootful Podman, while noting that rootless may work but is not officially supported.
- The deployment steps implied an environment selector inside the add-stack flow. Adjusted the wording to match Portainer's documented workflow of entering the Podman environment and then creating the stack.
- The example Compose file used a top-level `version: "3.8"` field. Removed it because current Compose documentation marks the top-level `version` property as obsolete.
- The rootless compatibility section overstated host-network behavior. Reworded it to align with Portainer's documented rootless support limitation and to recommend explicit port mappings for rootless deployments.
- The privileged-container example used `security_opt: no-new-privileges:false`, which is not how Podman documents `no-new-privileges`, and it implied rootless restrictions could be bypassed that way. Removed that line and kept the narrower, documented `cap_add` example.
- The volume ownership advice relied on image-specific `PUID`/`PGID` guidance rather than a Podman-documented mechanism. Replaced it with Podman's documented `:U` volume option note.
- The Podman pods section included an unverified `podman-compose --pod-args` example and labeled a shell command block as YAML. Replaced it with a technically accurate explanation that Podman pods are a native Podman feature outside Portainer's normal Compose-based stack flow.

## Review Notes
- As of 2026-04-24, Portainer's official Podman support remains narrower than generic "Podman compatibility" claims often suggest. Other distros or Podman versions may work, but Portainer documents support for CentOS Stream 9, Podman 5, and rootful mode.
- Portainer documents direct Podman socket connections as a legacy, local-only option and recommends the Edge Agent for most cases. This did not require a post rewrite because the article is about stack deployment after the environment is already connected.
- The sample stack remains valid as a simple Compose deployment example for Portainer on Podman after removing the obsolete `version` field.
