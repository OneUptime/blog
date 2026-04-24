# Validation Summary: How to Troubleshoot Podman Socket Connection Issues in Portainer - Socket

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Podman
- systemd socket activation
- Unix domain sockets
- `curl`
- `jq`

## Sources Consulted
- Portainer documentation: Does Portainer support Podman? https://docs.portainer.io/faqs/installing/does-portainer-support-podman
- Portainer documentation: Add a Podman environment https://docs.portainer.io/admin/environments/add/podman
- Portainer documentation: Connect to the Podman Socket https://docs.portainer.io/admin/environments/add/podman/socket
- Portainer documentation: Install Portainer CE with Podman on Linux https://docs.portainer.io/start/install-ce/server/podman/linux
- Podman documentation: `podman-system-service(1)` https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman upstream systemd socket unit: `podman.socket` https://raw.githubusercontent.com/containers/podman/main/contrib/systemd/system/podman.socket

## Issues Found
- The post tested the Podman compatibility API with `/v1.41/info`, but Podman documents Docker compatibility as v1.40. I changed the example to `/v1.40/info`.
- The expected output for `/info` was described as version information. I corrected this to Podman system info.
- The socket-permission section assumed a `podman` group and recommended a `docker run --group-add ...` fix. Podman’s documented socket unit only guarantees the socket mode, and Portainer’s supported Podman deployment path is to run Portainer on Podman. I replaced the unsupported Docker-based example with the supported `podman run ... -v /run/podman/podman.sock:/var/run/docker.sock` pattern from Portainer’s docs.
- The version-check section used `docker logs` even though the supported Portainer-on-Podman deployment uses `podman`. I changed this to `podman logs`.
- The post claimed Portainer could be fixed by setting `DOCKER_API_VERSION=1.41`. I removed this because it is not documented by Portainer as a supported fix, while Podman explicitly documents Docker API compatibility as v1.40 and states that unsupported version numbers are not rejected.
- The final section presented rootless Podman with Portainer running on Docker as a working socket setup. Portainer’s docs state that rootless Podman is not officially supported and that Podman environments cannot be added via socket when Portainer Server is running on Docker. I replaced that section with the documented support caveat.

## Review Notes
- Portainer currently documents Podman support with important limits: CentOS Stream 9, Podman 5, and rootful mode are the officially supported combination. Other combinations may work, but they are outside the documented support matrix.
- Portainer documents direct Podman socket connections as a legacy option and recommends the Edge Agent for most use cases.
- The rootless `systemctl --user` and linger commands in the post remain technically valid for Podman itself, but they should not be read as implying official Portainer support for rootless Podman.
