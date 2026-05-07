# Validation Summary: How to Fix Port Already in Use Errors with Podman

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Podman
- Podman rootless networking
- Linux TCP/IP networking
- Linux socket inspection tools (`ss`, `lsof`, `netstat`)
- firewalld
- Compose port mappings

## Sources Consulted
- Podman `--publish` documentation: https://docs.podman.io/en/v5.2.1/markdown/podman-create.1.html
- Podman pod port publishing documentation: https://docs.podman.io/en/v4.8.3/markdown/podman-pod-create.1.html
- Podman container prune documentation: https://docs.podman.io/en/v5.0.2/markdown/podman-container-prune.1.html
- Podman compose documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Compose Specification `ports` syntax: https://compose-spec.github.io/compose-spec/spec.html#ports
- firewalld `firewall-cmd --add-forward-port` documentation: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Local Linux `ss`, `lsof`, and `netstat` help output

## Issues Found
- The initial error examples mixed two different failure modes. The privileged-port rootless error was presented as if it resulted from mapping host port 8080. Updated the text to distinguish binding a privileged host port such as 80 from a true host-port conflict on 8080.
- The stopped-container cleanup section claimed stopped containers can hold port reservations. Stopped containers do not normally keep listening sockets open, so the section was corrected to frame cleanup as avoiding confusion before recreating containers with corrected mappings.
- The TIME_WAIT section claimed the port cannot be reused during TIME_WAIT and used `ss -tlnp | grep TIME_WAIT`, which is not the right command because `-l` limits output to listening sockets. Updated the explanation and command to use `ss -tan state time-wait`.
- The TIME_WAIT section recommended changing `net.ipv4.tcp_fin_timeout` as a TIME_WAIT fix. That sysctl is not an appropriate general fix for Podman port bind conflicts, so the recommendation was replaced with a caution against unrelated system-wide tuning.

## Review Notes
Podman was not installed in the local environment, so Podman CLI behavior was verified against official Podman documentation rather than local `podman --help` output. The remaining commands and snippets are syntactically valid and consistent with the referenced documentation.
