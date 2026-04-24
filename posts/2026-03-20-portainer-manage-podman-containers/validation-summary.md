# Validation Summary: How to Manage Podman Containers from Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Podman
- Docker-compatible API
- Linux container management
- cgroups v2

## Sources Consulted
- Portainer documentation, "Add a Podman environment": https://docs.portainer.io/admin/environments/add/podman
- Portainer documentation, "View a container's details": https://docs.portainer.io/user/docker/containers/view
- Portainer documentation, "View container statistics": https://docs.portainer.io/sts/user/docker/containers/stats
- Portainer documentation, "Access a container's console": https://docs.portainer.io/sts/user/docker/containers/console
- Portainer documentation, "Add a new container": https://docs.portainer.io/2.27/user/docker/containers/add
- Portainer documentation, "Edit or duplicate a container": https://docs.portainer.io/2.27/user/docker/containers/edit
- Portainer release notes, Podman known issues: https://docs.portainer.io/sts/release-notes
- Podman documentation, `podman system service`: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman documentation, `podman stats`: https://docs.podman.io/en/v4.7.2/markdown/podman-stats.1.html
- Podman documentation, `podman logs`: https://docs.podman.io/en/stable/markdown/podman-logs.1.html
- Podman documentation, `podman exec`: https://docs.podman.io/en/stable/markdown/podman-exec.1.html

## Issues Found
- The introduction said container operations worked "identically" to Docker. I changed this to say they work similarly through Podman's Docker-compatible API, because Portainer documents Podman-specific support limits and known issues.
- The logs section said Portainer provided real-time log streaming. I changed this to say Portainer retrieves logs through the compatible API and that auto refresh keeps the view updated, which matches Portainer's documented logs UI behavior more closely.
- The console section implied the action was identical to `podman exec -it <container> /bin/sh`. I changed this to note that Portainer asks for the command and user first, and that Alpine images typically require `/bin/ash`, matching Portainer's console documentation.
- The rootless section mentioned differing user IDs in stats, which I could not verify in official documentation. I replaced it with the documented limitation that rootless Podman is not officially supported by Portainer.
- The cgroups section was too broad. I corrected it to the documented Podman behavior: rootless stats do not work on cgroups v1, and rootless cgroups v2 still do not report network usage.

## Review Notes
- Portainer's current official Podman support is limited: current docs and release notes call out CentOS 9, Podman 5, and rootful Podman as the supported combination. Other distros, versions, and rootless setups may work, but Portainer does not currently document them as officially supported.
