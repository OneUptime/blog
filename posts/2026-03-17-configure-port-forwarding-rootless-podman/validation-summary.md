# Validation Summary: How to Configure Port Forwarding for Rootless Containers in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Rootless containers
- Container networking
- Port publishing
- pasta
- slirp4netns
- Linux sysctl

## Sources Consulted
- Podman `podman-create(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman-network(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman `podman-pod-create(1)` stable documentation for rootless network modes and port handlers: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `podman-info(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman HostInfo API reference for `RootlessNetworkCmd`: https://pkg.go.dev/github.com/containers/podman/v6/libpod/define

## Issues Found
- The post used `podman info --format '{{ .Host.Pasta.Executable }}'` to verify that pasta was being used. That field shows the pasta executable path, not the selected rootless network command. Changed it to `podman info --format '{{ .Host.RootlessNetworkCmd }}'`.
- The troubleshooting section used `podman info --format '{{ .Host.NetworkBackend }}'` to verify the rootless networking backend. That field reports the general Podman network backend, such as Netavark or CNI, not whether rootless containers use pasta or slirp4netns. Changed it to `podman info --format '{{ .Host.RootlessNetworkCmd }}'`.

## Review Notes
Podman documentation distinguishes the Netavark/CNI network backend from the rootless networking command. Current documentation identifies pasta as the default rootless networking tool, while slirp4netns remains supported with port handler options. The port publishing syntax, TCP/UDP examples, port range example, host IP binding syntax, and privileged-port sysctl guidance are consistent with current Podman documentation.
