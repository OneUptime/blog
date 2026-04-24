# Validation Summary: How to Troubleshoot Podman Socket Connection Issues in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Podman
- systemd
- SELinux
- curl
- jq

## Sources Consulted
- Portainer FAQ: Does Portainer support Podman? https://docs.portainer.io/faqs/installing/does-portainer-support-podman
- Portainer docs: Connect to the Podman Socket https://docs.portainer.io/admin/environments/add/podman/socket
- Portainer docs: Install Portainer CE with Podman on Linux https://docs.portainer.io/start/install-ce/server/podman/linux
- Podman docs: `podman system service` https://docs.podman.io/en/latest/markdown/podman-system-service.1.html

## Issues Found
- The post treated direct Podman socket access as a general Portainer setup. I updated it to reflect Portainer's current documented limitations: direct socket access is a legacy local-only option, current official support is rootful Podman, and a Portainer Server running on Docker cannot add Podman via socket.
- The API examples used `/v1.44` and suggested falling back to lower versions. Podman documents a Docker-compatible `v1.40` API and notes that unsupported version numbers are not rejected, so I changed the examples and endpoint checks to `v1.40`.
- The container-management examples used `docker inspect`, `docker run`, and `docker logs`, which is not correct for Portainer's supported Podman socket setup. I replaced them with `podman` commands and aligned the recreate command with Portainer's current Podman installation guidance (`--privileged`, `:lts`, and the documented port/socket mapping).
- The SELinux example used invalid shell syntax and the wrong option format (`label:disable` plus a broken line continuation). I corrected it to `--security-opt label=disable` and fixed the multi-line command.
- The permissions section suggested changing live socket ownership/mode and adding a Docker group, which is not appropriate guidance for the documented Podman setup because the socket is recreated by `systemd` and Portainer only documents that the Portainer Server user must already have access. I replaced this with inspection-based guidance.
- The remote TCP section assumed Docker's insecure default port `2375`. I changed it to a configured example port and added the Podman documentation caveat that SSH forwarding or mutual TLS is recommended for TCP access.

## Review Notes
- Portainer documents direct Podman socket access as a legacy option and recommends the Edge Agent for most use cases.
- Portainer's current official Podman support is limited to CentOS Stream 9, Podman 5, and rootful mode. Other distros or versions may work, but they are outside the documented support matrix.
- Rootless Podman may work in some environments, but Portainer does not currently officially support it.
